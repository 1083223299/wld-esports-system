<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';
import AppModal from '../../../components/AppModal.vue';
import { useToast } from '../../../composables/useToast';
import { clubOrderApi } from '../../../api/modules/clubOrder';
import '../../../assets/styles/pages/order-hall.css';

/**
 * 订单管理 > 抢单大厅（独立菜单，卡片网格）
 * 数据源：GET /api/club/orders/grab-hall（真实接口，服务端分页 + 订单号关键字筛选）
 * - 所有规格匹配的订单在此展示，分为待抢 / 已抢
 * - 隐藏规则：售后中（afterSaleFlag=1）、冻结（frozen=1）不展示
 * - 排序：页内待抢 > 已抢；多人且已有人接单但未满 优先，同级按派单时间（dispatchedAt）倒序
 * - 抢单：POST /api/club/orders/{id}/club-take
 * - 卡片字段：订单号 / 游戏名 / 规格 / 客户端 / 转单标签 / 购买项目 /
 *             派单客服 / 接单人数 / 派单备注 / 到手金额（playerAmount）/ 抢单倒计时 / 立即抢单按钮
 * - 已抢卡片：整体置灰，右上角「已接完」印章
 * - 抢单冲突：后端返回"该订单已被其他人领取"时弹「我知道了」，并将该卡片置为已抢
 */
const { show } = useToast();

const page = ref(1);
const pageSize = ref(12);
const keyword = ref('');
/** 服务端分页总数 */
const total = ref(0);

const orders = ref([]);
const loading = ref(false);
/** 正在执行整单接下的订单 id（防重复提交） */
const grabbingId = ref(null);

/* ===== 待抢/已抢判定 =====
 * 后端口径（2026-10-23）：大厅看 grabState：OPEN 待抢，TAKEN 已抢；
 * status 为 WAIT_TAKE 或 IN_PROGRESS（不会是 WAIT_PAY）。
 * grabState 缺失时回退 status 集合判断（WAIT_TAKE 待抢）。
 */
const PENDING_STATUS = new Set(['WAIT_TAKE', 'WAIT_GRAB', 'PENDING']);

function isClaimed(o = {}) {
  const gs = String(o.grabState ?? '').toUpperCase();
  if (gs === 'OPEN') return false;
  if (gs === 'TAKEN') return true;
  // grabState 缺失：回退 status 判断
  return !PENDING_STATUS.has(String(o.status));
}

/* ===== 后端订单字段 → 卡片字段映射（对齐 Apifox grab-hall 返回字段） ===== */
function mapOrder(o = {}) {
  // 客户端：clients 可能为数组或"端游,手游"字符串，统一成数组
  const clientVal = o.clients ?? o.clientType;
  const clientType = Array.isArray(clientVal)
    ? clientVal
    : typeof clientVal === 'string' && clientVal.trim()
      ? clientVal.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
      : [];

  return {
    id: o.id,
    orderNo: o.orderNo || '',
    itemName: o.itemName || '',
    gameName: o.gameName || '',
    spec: o.specName || o.spec || '', // Apifox 返回 specName
    clientType,
    transfer: !!o.transferred || !!o.transfer, // Apifox 返回 transferred
    note: o.remark || o.note || o.dispatchNote || '', // Apifox 返回 remark（派单备注）
    assignService: o.ownerName || '', // 归属名 = 派单客服（后端口径：用 ownerName，不是 ownerWecomName）
    playerCount: Number(o.playerCount) || 0, // 名额数
    takenCount: Number(o.takenCount) || 0, // 已接名额
    // 到手金额（本俱乐部收益）：后端口径 hallAmount=本俱乐部收益（打手视角 hallAmount=playerAmount），
    // 前端直接展示，不再乘打手分润；hallAmount 缺失时回退 playerAmount
    actualAmount: Number(o.hallAmount ?? o.playerAmount) || 0,
    hallAmountReady: o.hallAmount !== undefined && o.hallAmount !== null,
    playerPriceReady: o.playerPriceReady !== undefined ? !!o.playerPriceReady : true,
    assignTime: o.dispatchedAt || o.assignTime || '', // Apifox 返回 dispatchedAt（派单时间）
    takeDeadlineAt: o.takeDeadlineAt || '', // 抢单截止时间（倒计时）
    claimed: isClaimed(o),
    // 隐藏规则
    frozen: Number(o.frozen) === 1,
    afterSale: Number(o.afterSaleFlag) === 1,
  };
}

/* ===== 隐藏规则：售后中 / 冻结 不展示 ===== */
function isVisible(row) {
  return !row.frozen && !row.afterSale;
}

/* ===== 排序：页内「多人且已有人接单但未满」优先，再按派单时间倒序 ===== */
function sortClaim(list) {
  return list.slice().sort((a, b) => {
    const aPriority = a.playerCount > 1 && a.takenCount > 0 && a.takenCount < a.playerCount;
    const bPriority = b.playerCount > 1 && b.takenCount > 0 && b.takenCount < b.playerCount;
    if (aPriority !== bPriority) return aPriority ? -1 : 1;
    if (a.assignTime || b.assignTime) {
      return String(b.assignTime).localeCompare(String(a.assignTime));
    }
    return b.id - a.id;
  });
}

const visibleOrders = computed(() => orders.value.filter(isVisible));
const pendingOrders = computed(() => sortClaim(visibleOrders.value.filter((o) => !o.claimed)));
const claimedOrders = computed(() => sortClaim(visibleOrders.value.filter((o) => o.claimed)));

/** 合并列表（待抢在前、已抢在后）——服务端分页后仅对当前页排序 */
const rows = computed(() => [...pendingOrders.value, ...claimedOrders.value]);

/* ===== 抢单截止倒计时（takeDeadlineAt） ===== */
const now = ref(Date.now());
let timerId = null;
function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    now.value = Date.now();
  }, 1000);
}
function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}
/** 返回剩余毫秒；无截止时间返回 null */
function remainMs(deadline) {
  if (!deadline) return null;
  const t = new Date(String(deadline).replace(/-/g, '/')).getTime();
  if (!Number.isFinite(t)) return null;
  return t - now.value;
}
function remainText(row) {
  const ms = remainMs(row.takeDeadlineAt);
  if (ms === null) return '';
  if (ms <= 0) return '已截止';
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/* ===== 拉取抢单大厅列表（服务端分页 + 关键字） ===== */
async function loadHall() {
  loading.value = true;
  try {
    const data = await clubOrderApi.grabHall({
      keyword: keyword.value.trim(),
      page: page.value,
      pageSize: pageSize.value,
    });
    const list = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : [];
    total.value =
      data && typeof data.total === 'number'
        ? data.total
        : Array.isArray(data)
          ? data.length
          : 0;
    orders.value = list.map(mapOrder);
  } catch {
    // 错误提示已由 request.js 统一 toast
    orders.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  loadHall();
}

function handlePageChange(p) {
  page.value = p;
  loadHall();
}

/* ===== 抢单冲突弹窗（"我知道了"） ===== */
const conflictVisible = ref(false);
const conflictMessage = ref('');

function showConflict(msg) {
  conflictMessage.value = msg || '很抱歉，该订单已被其他人领取';
  conflictVisible.value = true;
}

function confirmConflict() {
  conflictVisible.value = false;
  // 将当前发生冲突的订单本地置为已抢（若仍在列表）
  if (conflictRow.value) {
    const hit = orders.value.find((o) => o.id === conflictRow.value);
    if (hit) hit.claimed = true;
  }
}

/* ===== 立即抢单（俱乐部整单接下） =====
 * 后端错误口径（2026-10-23）：
 * - 抢单冲突：HTTP 200 code=4093 bizCode=ORDER_TAKEN 文案「很抱歉，该订单已被其他人领取」→ 弹「我知道了」并置为已抢
 * - 禁止接单：HTTP 403 code=4031 bizCode=ACCOUNT_BLOCKED 文案「您的账号状态异常，请联系客服咨询」→ request.js 已 toast
 * - 未维护打手到手价：playerPriceReady=false 时抢单返回「俱乐部未维护打手到手价，无法接单」→ request.js 已 toast
 */
const conflictRow = ref(null);

async function grabOrder(row) {
  if (grabbingId.value) return;
  grabbingId.value = row.id;
  try {
    await clubOrderApi.clubTake(row.id);
    show('恭喜你，抢单成功', 'success');
    await loadHall();
  } catch (e) {
    // 抢单冲突：置为已抢 + "我知道了"弹窗；其余错误已由 request.js toast
    const isTaken =
      e?.bizCode === 'ORDER_TAKEN' ||
      (e?.code === 4093) ||
      /已被|已领取|已被其他人领取|别人|其他人/.test(String(e?.message || ''));
    if (isTaken) {
      conflictRow.value = row.id;
      showConflict(e?.message || '很抱歉，该订单已被其他人领取');
    }
  } finally {
    grabbingId.value = null;
  }
}

onMounted(() => {
  loadHall();
  startTimer();
});
onBeforeUnmount(stopTimer);
</script>

<template>
  <div class="hall-page claim-hall">
    <!-- 搜索：订单号 / 订单ID（服务端 keyword） -->
    <div class="hall-search">
      <el-input
        v-model="keyword"
        placeholder="请输入订单号 / 订单ID"
        clearable
        class="hall-search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #append>
          <el-button @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </div>

    <!-- 订单卡片网格 -->
    <div v-loading="loading" class="hall-grid">
      <article
        v-for="row in rows"
        :key="row.id"
        class="hall-card"
        :class="{ 'is-claimed': row.claimed }"
      >
        <!-- 已接完印章（仅已抢订单） -->
        <div v-if="row.claimed" class="hall-stamp" aria-hidden="true">已接完</div>

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
            {{ row.orderNo }}
          </span>
        </div>

        <div class="hall-game-row">
          <span class="hall-game-name">{{ row.gameName || row.itemName }}</span>
          <span v-if="row.spec" class="hall-chip hall-chip-warm">{{ row.spec }}</span>
          <span v-for="c in row.clientType" :key="c" class="hall-chip hall-chip-warm">{{ c }}</span>
          <span v-if="row.transfer" class="hall-chip hall-chip-transfer">转单</span>
        </div>

        <p v-if="row.itemName && row.gameName" class="hall-product">{{ row.itemName }}</p>

        <div class="hall-info">
          <div class="hall-info-item">
            <span class="hall-info-label">派单客服</span>
            <span class="hall-info-value">{{ row.assignService || '—' }}</span>
          </div>
          <div class="hall-info-item">
            <span class="hall-info-label">接单人数</span>
            <span class="hall-info-value"><b>{{ row.takenCount }}</b>/{{ row.playerCount }}</span>
          </div>
        </div>

        <p v-if="row.note" class="hall-note">{{ row.note }}</p>

        <div class="hall-card-foot">
          <div class="hall-amount-box">
            <span class="hall-amount-label">预估到手</span>
            <span class="hall-amount">
              {{ row.hallAmountReady ? `¥${Number(row.actualAmount).toFixed(2)}` : '—' }}
            </span>
            <span v-if="row.takeDeadlineAt && !row.claimed" class="hall-countdown">
              <i class="hall-countdown-dot" />{{ remainText(row) }}
            </span>
          </div>
          <button
            v-if="!row.claimed"
            class="hall-btn hall-btn-primary"
            type="button"
            :disabled="grabbingId === row.id"
            @click="grabOrder(row)"
          >
            {{ grabbingId === row.id ? '抢单中…' : '立即抢单' }}
          </button>
        </div>
      </article>
    </div>

    <el-empty v-if="!loading && !rows.length" description="暂无订单" />

    <!-- 分页（服务端分页） -->
    <div class="hall-footer">
      <PaginationSimple
        :current-page="page"
        :total="total"
        :page-size="pageSize"
        :show-batch-actions="false"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 抢单冲突弹窗（"我知道了"） -->
    <AppModal v-model="conflictVisible" width="380px">
      <p class="hall-conflict-text">{{ conflictMessage }}</p>
      <template #footer>
        <button class="hall-btn hall-btn-primary" type="button" @click="confirmConflict">
          我知道了
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
/* 订单号 / 订单ID 搜索 */
.hall-search {
  margin-bottom: 16px;
}

.hall-search-input {
  max-width: 320px;
}

/* 抢单倒计时（takeDeadlineAt） */
.hall-countdown {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--status-danger);
}

.hall-countdown-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--status-danger);
  animation: hall-countdown-blink 1s step-start infinite;
}

@keyframes hall-countdown-blink {
  50% {
    opacity: 0.3;
  }
}

/* 抢单冲突弹窗 */
.hall-conflict-text {
  margin: 8px 0;
  text-align: center;
  font-size: 14px;
  color: var(--text-main);
  line-height: 1.7;
}
</style>
