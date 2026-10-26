<script setup>
import { computed, onMounted, ref } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';
import { useToast } from '../../../composables/useToast';
import { dispatchApi } from '../../../api/modules/dispatch';
import '../../../assets/styles/pages/order-hall.css';

/**
 * 订单管理 > 派单消息（卡片网格）
 * 依据需求：
 * - 所有派单订单在此展示，卡片字段：订单号 / 订单状态 / 游戏名称 / 游戏规格 /
 *   游戏客户端 / 订单标签（冻结、售后中）/ 购买项目 / 派单客服 / 接单人数 /
 *   派单备注（无时不展示）/ 预估到手金额
 * - 订单状态：待处理（展示接单/拒绝按钮）、已接单、已拒绝
 * - 排序：待处理 > 已接单 > 已拒绝，同级按派单时间倒序
 * - 接单校验：未配置分润 → 弹窗提示联系客服；冻结/售后中 → 弹窗提示订单异常
 *
 * 接口联调（06-订单-俱乐部 / 派单消息）：
 * - GET  /api/club/dispatch-messages           待处理派单消息列表（无 Query 参数）
 * - POST /api/club/dispatch-messages/{id}/accept  接受派单（成功返回订单对象）
 * - POST /api/club/dispatch-messages/{id}/reject  拒绝派单（body: { reason }）
 * - 列表接口返回的消息项仅含 id/orderId/clubId/status/createdAt，
 *   卡片其余展示字段由 normalizeMessage 兼容后端实际返回的平铺订单字段或嵌套 order 对象；
 *   接单/拒绝成功后用接口返回的订单对象刷新该卡片。
 */
const { show } = useToast();

const page = ref(1);
const pageSize = ref(12);
const loading = ref(false);
const rows = ref([]);

/* ===== 报错/确认弹窗 ===== */
const profitErrorVisible = ref(false);
const orderErrorVisible = ref(false);
const rejectVisible = ref(false);
const rejectReason = ref('');
const rejectTarget = ref(null);

/* ===== 状态展示映射 ===== */
const STATUS_TEXT = { pending: '待处理', accepted: '已接单', rejected: '已拒绝' };
const STATUS_CLASS = { pending: 'hall-st-pending', accepted: 'hall-st-accepted', rejected: 'hall-st-rejected' };
const STATUS_ORDER = { pending: 0, accepted: 1, rejected: 2 };

function statusRank(status) {
  return STATUS_ORDER[status] !== undefined ? STATUS_ORDER[status] : 3;
}

function statusText(status) {
  return STATUS_TEXT[status] || status || '未知';
}

/**
 * 派单消息 / 订单 → 卡片行数据（字段归一化）
 * 兼容后端两种返回形态：
 * 1. 列表项平铺订单字段（orderNo / itemName / gameName / frozen ...）
 * 2. 列表项嵌套 order 对象（accept / reject 返回即订单对象）
 * 状态 PENDING/ACCEPTED/REJECTED 统一转为小写供页面映射。
 */
function normalizeMessage(raw = {}) {
  const hasNestedOrder = raw.order && typeof raw.order === 'object';
  const order = hasNestedOrder ? raw.order : raw;

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const status = String(raw.status || order.status || '').toLowerCase();

  const clientVal = order.clientType || order.client || order.platform;
  const clientType = Array.isArray(clientVal) ? clientVal : clientVal ? [clientVal] : [];

  const claimedCount =
    order.takenCount !== undefined && order.takenCount !== null
      ? toNum(order.takenCount)
      : order.assignedPlayerCount !== undefined && order.assignedPlayerCount !== null
        ? toNum(order.assignedPlayerCount)
        : toNum(order.claimedCount);
  const requiredCount =
    order.playerCount !== undefined && order.playerCount !== null
      ? toNum(order.playerCount)
      : toNum(order.requiredCount);

  const amount = toNum(order.amount);
  const clubAdjust = toNum(order.clubAdjust);

  // 预估到手（俱乐部到手）：后端口径（2026-10-23）用 order.hallAmount，前端直接展示不再乘打手分润；
  // 没配俱乐部部分润时 hallAmount 为空 → 展示 "—"
  const hallAmount =
    order.hallAmount !== undefined && order.hallAmount !== null
      ? toNum(order.hallAmount)
      : null;

  // 订单标签：冻结 / 售后中
  const tags = [];
  if (toNum(order.frozen) === 1) tags.push('冻结');
  if (toNum(order.afterSaleFlag) === 1) tags.push('售后中');

  const createdAt = raw.createdAt || order.createdAt || '';

  return {
    id: raw.id, // 消息 ID（accept / reject 传参用）
    orderId: hasNestedOrder ? (order.id ?? raw.orderId) : raw.orderId,
    clubId: raw.clubId,
    status,
    createdAt,
    assignTime: createdAt || order.assignTime || raw.assignTime || '',
    orderNo: order.orderNo || '',
    channel: order.channel || order.channelCode || '',
    amount,
    // 预估到手 = 俱乐部到手（hallAmount，后端已按规则算好：百分比=订单金额×俱乐部部分润比例、
    // 固定值按规格、含平台加减价、最小为0；未配分润时空）
    hallAmountReady: hallAmount !== null,
    actualAmount: hallAmount !== null ? hallAmount : amount + clubAdjust,
    gameName: order.gameName || (order.game && order.game.name) || '',
    spec: order.spec || order.specName || (order.game && order.game.spec) || '',
    clientType,
    product: order.itemName || order.product || order.skuName || '',
    assignService: order.assignService || order.ownerName || '', // 后端口径：客服姓名用 ownerName
    claimedCount,
    requiredCount,
    note: order.note || order.dispatchNote || order.remark || '',
    // 接口未返回分润配置字段时默认视为已配置，避免误拦截
    profitConfigured: order.profitConfigured !== undefined ? !!order.profitConfigured : true,
    tags,
    raw,
  };
}

/* ===== 列表加载 ===== */
async function loadList() {
  loading.value = true;
  try {
    const data = await dispatchApi.list();
    const source = Array.isArray(data) ? data : data && Array.isArray(data.list) ? data.list : [];
    rows.value = source.map(normalizeMessage);
  } catch (e) {
    // 错误已由 request 统一提示
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

/** 排序：待处理 > 已接单 > 已拒绝，同级按派单时间倒序 */
function sortDispatch(list) {
  return list.slice().sort((a, b) => {
    const diff = statusRank(a.status) - statusRank(b.status);
    if (diff) return diff;
    return String(b.assignTime || '').localeCompare(String(a.assignTime || ''));
  });
}

const allRows = computed(() => sortDispatch(rows.value));
const total = computed(() => allRows.value.length);

/** 按页截取 */
const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return allRows.value.slice(start, start + pageSize.value);
});

/** 订单异常：冻结 / 售后中 标签 */
function isAbnormal(row) {
  const tags = row.tags || [];
  return tags.includes('冻结') || tags.includes('售后中');
}

/** 用接口返回的订单对象刷新卡片（保留消息 ID 与原始消息） */
function applyOrderResult(row, order) {
  const next = normalizeMessage({ ...row.raw, order });
  Object.assign(row, next, { id: row.id });
  return row;
}

/* ===== 接单 ===== */
async function acceptOrder(row) {
  // 未配置俱乐部分润：报错弹窗
  if (!row.profitConfigured) {
    profitErrorVisible.value = true;
    return;
  }
  // 冻结 / 售后中：订单异常，无法接单
  if (isAbnormal(row)) {
    orderErrorVisible.value = true;
    return;
  }
  try {
    const order = await dispatchApi.accept(row.id);
    applyOrderResult(row, order);
    row.status = 'accepted';
    show('接单成功', 'success');
  } catch (e) {
    // 错误已由 request 统一提示，保持原状态
  }
}

/* ===== 拒绝 ===== */
function openReject(row) {
  rejectTarget.value = row;
  rejectReason.value = '';
  rejectVisible.value = true;
}

async function confirmReject() {
  const row = rejectTarget.value;
  if (!row) return;
  try {
    const order = await dispatchApi.reject(row.id, rejectReason.value.trim());
    applyOrderResult(row, order);
    row.status = 'rejected';
    rejectVisible.value = false;
    show('已拒绝该订单', 'success');
  } catch (e) {
    // 错误已由 request 统一提示；保留弹窗供修改原因重试
  }
}

onMounted(loadList);
</script>

<template>
  <div class="hall-page dispatch-message">
    <!-- 订单卡片网格 -->
    <div v-loading="loading" class="hall-grid">
      <article v-for="row in pagedRows" :key="row.id" class="hall-card">
        <!-- 卡片头部：订单号 + 状态 -->
        <div class="hall-card-head">
          <span class="hall-order-no">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 3 7 21M17 3l-2 18M4 8h16M3 16h16"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            {{ row.orderNo || '--' }}
          </span>
          <span class="hall-status" :class="STATUS_CLASS[row.status] || 'hall-st-rejected'">
            {{ statusText(row.status) }}
          </span>
        </div>

        <!-- 游戏名称 + 规格 + 客户端 + 订单标签 -->
        <div class="hall-game-row">
          <span class="hall-game-name">{{ row.gameName || '--' }}</span>
          <span v-if="row.spec" class="hall-chip hall-chip-warm">{{ row.spec }}</span>
          <span v-for="c in row.clientType" :key="c" class="hall-chip hall-chip-warm">{{ c }}</span>
          <span
            v-for="t in row.tags"
            :key="t"
            class="hall-chip"
            :class="t === '冻结' ? 'hall-chip-freeze' : 'hall-chip-after'"
          >{{ t }}</span>
        </div>

        <!-- 购买项目 -->
        <p class="hall-product">{{ row.product || '--' }}</p>

        <div class="hall-info">
          <div class="hall-info-item">
            <span class="hall-info-label">派单客服</span>
            <span class="hall-info-value">{{ row.assignService || '--' }}</span>
          </div>
          <div class="hall-info-item">
            <span class="hall-info-label">接单人数</span>
            <span class="hall-info-value"><b>{{ row.claimedCount }}</b>/{{ row.requiredCount }}</span>
          </div>
        </div>

        <!-- 派单备注：无时不展示 -->
        <p v-if="row.note" class="hall-note">{{ row.note }}</p>

        <!-- 卡片底部：预估到手 + 操作按钮 -->
        <div class="hall-card-foot">
          <div class="hall-amount-box">
            <span class="hall-amount-label">预估到手</span>
            <span class="hall-amount">
              {{ row.hallAmountReady ? `¥${Number(row.actualAmount).toFixed(2)}` : '—' }}
            </span>
          </div>
          <div v-if="row.status === 'pending'" class="hall-actions">
            <button class="hall-btn hall-btn-primary" type="button" @click="acceptOrder(row)">接单</button>
            <button class="hall-btn hall-btn-ghost" type="button" @click="openReject(row)">拒绝</button>
          </div>
        </div>
      </article>
    </div>

    <el-empty v-if="!loading && !pagedRows.length" description="暂无派单" />

    <!-- 分页 -->
    <div class="hall-footer">
      <PaginationSimple
        :current-page="page"
        :total="total"
        :page-size="pageSize"
        :show-batch-actions="false"
        @current-change="(p) => (page = p)"
      />
    </div>

    <!-- 未配置分润报错弹窗 -->
    <AppModal v-model="profitErrorVisible" title="未配置分润" width="420px">
      <div class="hall-error">
        <div class="hall-error-icon">!</div>
        <div class="hall-error-body">
          <p class="hall-error-title">未配置俱乐部分润，无法接单</p>
          <p class="hall-error-desc">请联系客服处理</p>
        </div>
      </div>
      <template #footer>
        <button class="hall-btn hall-btn-primary" type="button" @click="profitErrorVisible = false">确定</button>
      </template>
    </AppModal>

    <!-- 订单异常报错弹窗 -->
    <AppModal v-model="orderErrorVisible" title="订单异常" width="420px">
      <div class="hall-error">
        <div class="hall-error-icon">!</div>
        <div class="hall-error-body">
          <p class="hall-error-title">订单异常无法接单</p>
          <p class="hall-error-desc">该订单处于冻结或售后中状态，请联系客服处理</p>
        </div>
      </div>
      <template #footer>
        <button class="hall-btn hall-btn-primary" type="button" @click="orderErrorVisible = false">确定</button>
      </template>
    </AppModal>

    <!-- 拒绝派单确认弹窗 -->
    <AppModal v-model="rejectVisible" title="拒绝派单" width="460px">
      <div class="reject-body">
        <p class="reject-tip">拒绝后该派单将退回，请填写拒绝原因（选填）</p>
        <el-input
          v-model="rejectReason"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
          placeholder="请输入拒绝原因"
        />
      </div>
      <template #footer>
        <button class="hall-btn hall-btn-ghost" type="button" @click="rejectVisible = false">取消</button>
        <button class="hall-btn hall-btn-primary" type="button" @click="confirmReject">确认拒绝</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.reject-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reject-tip {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-sub);
}
</style>
