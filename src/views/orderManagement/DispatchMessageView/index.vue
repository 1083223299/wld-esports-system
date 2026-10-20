<script setup>
import { computed, ref } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';
import { useToast } from '../../../composables/useToast';
import { dispatchStore } from './mockData';
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
 */
const { show } = useToast();

const page = ref(1);
const pageSize = ref(12);

/* ===== 报错弹窗 ===== */
const profitErrorVisible = ref(false);
const orderErrorVisible = ref(false);

/* ===== 状态展示映射 ===== */
const STATUS_TEXT = { pending: '待处理', accepted: '已接单', rejected: '已拒绝' };
const STATUS_CLASS = { pending: 'hall-st-pending', accepted: 'hall-st-accepted', rejected: 'hall-st-rejected' };
const STATUS_ORDER = { pending: 0, accepted: 1, rejected: 2 };

/** 排序：待处理 > 已接单 > 已拒绝，同级按派单时间倒序 */
function sortDispatch(list) {
  return list.slice().sort((a, b) => {
    const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (diff) return diff;
    return String(b.assignTime || '').localeCompare(String(a.assignTime || ''));
  });
}

const allRows = computed(() => sortDispatch(dispatchStore.orders));
const total = computed(() => allRows.value.length);

/** 按页截取 */
const rows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return allRows.value.slice(start, start + pageSize.value);
});

/** 订单异常：冻结 / 售后中 标签 */
function isAbnormal(row) {
  const tags = row.tags || [];
  return tags.includes('冻结') || tags.includes('售后中');
}

/* ===== 接单 ===== */
function acceptOrder(row) {
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
  row.status = 'accepted';
  if (row.claimedCount < row.requiredCount) row.claimedCount += 1;
  show('接单成功', 'success');
}

/* ===== 拒绝 ===== */
function rejectOrder(row) {
  row.status = 'rejected';
  show('已拒绝该订单', 'success');
}
</script>

<template>
  <div class="hall-page dispatch-message">
    <!-- 订单卡片网格 -->
    <div class="hall-grid">
      <article v-for="row in rows" :key="row.id" class="hall-card">
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
            {{ row.orderNo }}
          </span>
          <span class="hall-status" :class="STATUS_CLASS[row.status]">{{ STATUS_TEXT[row.status] }}</span>
        </div>

        <!-- 游戏名称 + 规格 + 客户端 + 订单标签 -->
        <div class="hall-game-row">
          <span class="hall-game-name">{{ row.gameName }}</span>
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
        <p class="hall-product">{{ row.product }}</p>

        <div class="hall-info">
          <div class="hall-info-item">
            <span class="hall-info-label">派单客服</span>
            <span class="hall-info-value">{{ row.assignService }}</span>
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
            <span class="hall-amount">¥{{ Number(row.actualAmount).toFixed(2) }}</span>
          </div>
          <div v-if="row.status === 'pending'" class="hall-actions">
            <button class="hall-btn hall-btn-primary" type="button" @click="acceptOrder(row)">接单</button>
            <button class="hall-btn hall-btn-ghost" type="button" @click="rejectOrder(row)">拒绝</button>
          </div>
        </div>
      </article>
    </div>

    <el-empty v-if="!rows.length" description="暂无派单" />

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
  </div>
</template>
