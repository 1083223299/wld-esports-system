<script setup>
import { computed, onMounted, ref } from 'vue';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';
import { useToast } from '../../../composables/useToast';
import { clubOrderApi } from '../../../api/modules/clubOrder';
import '../../../assets/styles/pages/order-hall.css';

/**
 * 订单管理 > 抢单大厅（独立菜单，卡片网格）
 * 数据源：GET /api/club/orders/grab-hall（真实接口）
 * - 所有规格匹配的订单在此展示，分为待抢 / 已抢
 * - 隐藏规则：售后中（afterSaleFlag=1）、冻结（frozen=1）不展示
 * - 排序：待抢 > 已抢；待抢中「多人且已有人接单但未满」优先，
 *         同级按派单时间倒序（接口暂未返回派单时间，回退按订单 id 倒序）
 * - 抢单：POST /api/club/orders/{id}/club-take
 * - 卡片字段：订单号 / 游戏名 / 规格 / 客户端 / 转单标签 / 购买项目 /
 *             派单客服 / 接单人数 / 派单备注 / 预估到手金额 / 立即抢单按钮
 * - 已抢卡片：整体置灰，右上角「已接完」印章
 */
const { show } = useToast();

const page = ref(1);
const pageSize = ref(12);

const orders = ref([]);
const loading = ref(false);
/** 正在执行整单接下的订单 id（防重复提交） */
const grabbingId = ref(null);

/* ===== 后端订单字段 → 卡片字段映射 =====
 * 接口未返回游戏名/规格文案/客户端/派单备注等展示字段，
 * 映射层保留对应字段（后端补充后可自动展示），缺失时模板侧优雅降级。
 */
function mapOrder(o = {}) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    itemName: o.itemName || '',
    gameName: o.gameName || '', // 接口暂未返回，预留
    spec: o.spec || '', // 接口仅返回 specId，暂无规格文案，预留
    clientType: Array.isArray(o.clientType) ? o.clientType : [], // 预留
    transfer: !!o.transfer, // 预留
    note: o.note || '', // 预留（派单备注）
    assignService: o.ownerName || '', // 归属名 = 派单客服
    playerCount: Number(o.playerCount) || 0, // 名额数
    takenCount: Number(o.takenCount) || 0, // 已接名额
    // 预估到手 = 订单金额 + 平台加减价净值 + 俱乐部加减价净值（减价为负）
    actualAmount:
      (Number(o.amount) || 0) + (Number(o.platformAdjust) || 0) + (Number(o.clubAdjust) || 0),
    assignTime: o.assignTime || '', // 接口暂未返回派单时间，预留
    // 状态：WAIT_TAKE 待抢，其余（IN_PROGRESS / CLOSED 等）视为已抢
    claimed: String(o.status) !== 'WAIT_TAKE',
    // 隐藏规则
    frozen: Number(o.frozen) === 1,
    afterSale: Number(o.afterSaleFlag) === 1,
  };
}

/* ===== 隐藏规则：售后中 / 冻结 不展示 ===== */
function isVisible(row) {
  return !row.frozen && !row.afterSale;
}

/* ===== 排序：同级内「多人且已有人接单但未满」优先，再按派单时间倒序 ===== */
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

const total = computed(() => visibleOrders.value.length);

/** 合并列表（待抢在前、已抢在后）并按页截取 */
const rows = computed(() => {
  const combined = [...pendingOrders.value, ...claimedOrders.value];
  const start = (page.value - 1) * pageSize.value;
  return combined.slice(start, start + pageSize.value);
});

/* ===== 拉取抢单大厅列表 ===== */
async function loadHall() {
  loading.value = true;
  try {
    const list = await clubOrderApi.grabHall();
    orders.value = Array.isArray(list) ? list.map(mapOrder) : [];
  } catch {
    // 错误提示已由 request.js 统一 toast
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

/* ===== 立即抢单（俱乐部整单接下） =====
 * 未配置分润等业务拦截由后端校验，失败时 request.js 统一 toast 后端 message。
 */
async function grabOrder(row) {
  if (grabbingId.value) return;
  grabbingId.value = row.id;
  try {
    await clubOrderApi.clubTake(row.id);
    show('抢单成功，已进入已抢订单', 'success');
    await loadHall();
  } catch {
    // 后端错误（如未配置分润 / 订单已被抢）已由 request.js toast，这里不重复提示
  } finally {
    grabbingId.value = null;
  }
}

onMounted(loadHall);
</script>

<template>
  <div class="hall-page claim-hall">
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
            <span class="hall-amount">¥{{ Number(row.actualAmount).toFixed(2) }}</span>
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
  </div>
</template>
