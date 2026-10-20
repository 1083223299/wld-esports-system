<script setup>
import { computed, ref } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';
import { useToast } from '../../../composables/useToast';
import { orderStore } from './mockData';
import '../../../assets/styles/pages/order-hall.css';

/**
 * 订单管理 > 抢单大厅（独立菜单，卡片网格）
 * 依据需求：
 * - 所有规格匹配的订单在此展示，分为待抢 / 已抢；售后中、冻结隐藏
 * - 排序：待抢 > 已抢；待抢中「多人且已有人接单但未满」优先，同级按派单时间倒序
 * - 卡片字段：订单号 / 游戏名 / 规格 / 客户端 / 转单标签 / 购买项目 /
 *             派单客服 / 接单人数 / 派单备注 / 预估到手金额 / 立即抢单按钮
 * - 已抢卡片：整体置灰，右上角「已接完」印章
 */
const { show } = useToast();

const page = ref(1);
const pageSize = ref(12);

/* ===== 未配置分润提示弹窗 ===== */
const profitErrorVisible = ref(false);

/* ===== 隐藏规则：售后中 / 冻结 不展示 ===== */
function isVisible(row) {
  const tags = row.tags || [];
  return !tags.includes('售后中') && !tags.includes('冻结');
}

/* ===== 排序：同级内「多人且已有人接单但未满」优先，再按派单时间倒序 ===== */
function sortClaim(list) {
  return list.slice().sort((a, b) => {
    const aPriority = a.requiredCount > 1 && a.claimedCount > 0 && a.claimedCount < a.requiredCount;
    const bPriority = b.requiredCount > 1 && b.claimedCount > 0 && b.claimedCount < b.requiredCount;
    if (aPriority !== bPriority) return aPriority ? -1 : 1;
    return String(b.assignTime || '').localeCompare(String(a.assignTime || ''));
  });
}

const visibleOrders = computed(() => orderStore.claimOrders.filter(isVisible));
const pendingOrders = computed(() => sortClaim(visibleOrders.value.filter((o) => !o.claimed)));
const claimedOrders = computed(() => sortClaim(visibleOrders.value.filter((o) => o.claimed)));

const total = computed(() => visibleOrders.value.length);

/** 合并列表（待抢在前、已抢在后）并按页截取 */
const rows = computed(() => {
  const combined = [...pendingOrders.value, ...claimedOrders.value];
  const start = (page.value - 1) * pageSize.value;
  return combined.slice(start, start + pageSize.value);
});

/* ===== 立即抢单 ===== */
function grabOrder(row) {
  // 未配置俱乐部分润：报错弹窗
  if (!row.profitConfigured) {
    profitErrorVisible.value = true;
    return;
  }
  row.claimed = true;
  if (row.claimedCount < row.requiredCount) row.claimedCount += 1;
  show('抢单成功，已进入已抢订单', 'success');
}
</script>

<template>
  <div class="hall-page claim-hall">
    <!-- 订单卡片网格 -->
    <div class="hall-grid">
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
          <span class="hall-game-name">{{ row.gameName }}</span>
          <span v-if="row.spec" class="hall-chip hall-chip-warm">{{ row.spec }}</span>
          <span v-for="c in row.clientType" :key="c" class="hall-chip hall-chip-warm">{{ c }}</span>
          <span v-if="row.transfer" class="hall-chip hall-chip-transfer">转单</span>
        </div>

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

        <p v-if="row.note" class="hall-note">{{ row.note }}</p>

        <div class="hall-card-foot">
          <div class="hall-amount-box">
            <span class="hall-amount-label">预估到手</span>
            <span class="hall-amount">¥{{ Number(row.actualAmount).toFixed(2) }}</span>
          </div>
          <button v-if="!row.claimed" class="hall-btn hall-btn-primary" type="button" @click="grabOrder(row)">
            立即抢单
          </button>
        </div>
      </article>
    </div>

    <el-empty v-if="!rows.length" description="暂无订单" />

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
  </div>
</template>
