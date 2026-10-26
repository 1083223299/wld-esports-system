<template>
  <div class="order-detail-page">
    <div class="page-header">
      <button class="btn-back" type="button" @click="goBack">← 返回</button>
      <h2 class="page-title">订单详情</h2>
    </div>

    <div v-if="loading && !row" class="detail-loading">加载中…</div>
    <div v-else-if="!row" class="detail-loading empty">
      <p>订单不存在或已失效</p>
      <button class="btn btn-plain" type="button" @click="goBack">返回我的订单</button>
    </div>

    <div v-else class="detail-box">
      <!-- 订单信息 -->
      <section class="detail-section">
        <h4 class="section-title">订单信息</h4>
        <div class="order-no-line">
          订单号：{{ row.orderNo }}
          <span v-if="loading" class="detail-refreshing">同步中…</span>
          <i class="copy-icon" title="复制订单号" @click="copyText(row.orderNo)" />
        </div>
        <div class="info-grid">
          <div class="info-item"><label>订单金额(元)</label><span>{{ Number(row.amount).toFixed(2) }}</span></div>
          <div class="info-item"><label>购买项目</label><span>{{ row.product || '—' }}</span></div>
          <div v-if="row.assignService" class="info-item"><label>派单客服</label><span>{{ row.assignService }}</span></div>
          <div class="info-item">
            <label>订单状态</label>
            <span>{{ STATUS_TEXT[row.orderStatus] || row.orderStatus }}<template v-if="row.orderStatus === 'pending'">({{ row.claimedCount }}/{{ row.requiredCount }})</template></span>
          </div>
          <div class="info-item"><label>角色名</label><span>{{ row.roleName || '—' }}</span></div>
          <div class="info-item"><label>游戏规格</label><span>{{ row.spec || '—' }}</span></div>
          <div class="info-item"><label>打手人数</label><span>{{ row.claimedCount }}/{{ row.requiredCount }}</span></div>
          <div class="info-item"><label>客户端</label><span>{{ row.clientType.join('、') || '—' }}</span></div>
          <div v-if="row.teamCode" class="info-item"><label>组队码</label><span>{{ row.teamCode }}</span></div>
          <div v-if="row.createTime" class="info-item"><label>创单时间</label><span>{{ row.createTime }}</span></div>
          <div v-if="row.clubAcceptTime" class="info-item"><label>俱乐部接单时间</label><span>{{ row.clubAcceptTime }}</span></div>
          <div v-if="row.dispatchRemark" class="info-item"><label>派单备注</label><span>{{ row.dispatchRemark }}</span></div>
          <div v-if="row.orderStatus === 'completed' && row.completedAt" class="info-item"><label>完成时间</label><span>{{ row.completedAt }}</span></div>
          <div v-if="row.orderStatus === 'closed' && row.closedAt" class="info-item"><label>取消时间</label><span>{{ row.closedAt }}</span></div>
        </div>
        <!-- 进行中已驳回 -->
        <p v-if="row.orderStatus === 'processing' && row.rejectReason" class="reject-tip">驳回原因：{{ row.rejectReason }}</p>
        <!-- 已完成：收益入账提示（settleDays 由后台配置返回；都没有时按原型展示 7 日） -->
        <p v-if="row.orderStatus === 'completed'" class="settle-tip">
          恭喜你完成订单，收益将在{{ row.settleDays ?? 7 }}日后入账
        </p>
      </section>

      <!-- 打手信息 -->
      <section class="detail-section">
        <h4 class="section-title">打手信息</h4>
        <div v-if="row.players.length" class="player-grid">
          <div v-for="(p, i) in row.players" :key="i" class="player-card">
            <p class="player-name">{{ p.name || '打手' }}（{{ p.id }}）</p>
            <p class="player-club">{{ p.club }}</p>
            <p class="player-time">{{ p.acceptTime ? `接单时间：${p.acceptTime}` : `转单时间：${p.transferTime}` }}</p>
          </div>
        </div>
        <p v-else class="empty-text">接单后有值</p>
      </section>

      <!-- 分润信息：原型批注③「加：最多为俱乐部真实收益值」 -->
      <section class="detail-section">
        <h4 class="section-title">分润信息</h4>
        <div class="profit-grid">
          <div v-if="row.profit.adjustText" class="profit-item">
            <label>俱乐部加价/减价</label>
            <span :class="{ 'text-muted': row.profit.adjustInvalid }">{{ row.profit.adjustText }}</span>
          </div>
          <div class="profit-item">
            <label>俱乐部分润(元)</label>
            <span class="profit-value">{{ row.profit.clubShare }}</span>
          </div>
          <div class="profit-item">
            <label>打手分润(元)</label>
            <span>{{ row.profit.playerShareText }}</span>
          </div>
        </div>
      </section>

      <!-- 存单信息：原型批注④「非三角洲游戏仅展示存单备注字段」 -->
      <section v-if="showDepositFull || showDepositNote" class="detail-section">
        <h4 class="section-title">存单信息</h4>
        <template v-if="showDepositFull">
          <div class="info-grid">
            <div class="info-item"><label>保底目标(W)</label><span>{{ row.deposit.targetW }}</span></div>
            <div class="info-item"><label>存单原因</label><span>{{ row.deposit.reason || '—' }}</span></div>
            <div class="info-item"><label>第一把(W)</label><span>{{ row.deposit.firstW }}</span></div>
            <div class="info-item"><label>第二把(W)</label><span>{{ row.deposit.secondW }}</span></div>
          </div>
          <div class="upload-empty">
            <div class="upload-box"><i class="upload-icon" /></div>
            <p class="upload-text">剩余保底截图</p>
          </div>
        </template>
        <div v-else class="info-item"><label>存单备注</label><span>{{ row.deposit.note || '—' }}</span></div>
      </section>

      <!-- 订单日志：原型批注②「仅展示订单状态变动记录即可」 -->
      <section class="detail-section">
        <h4 class="section-title">订单日志</h4>
        <ul v-if="row.logs.length" class="log-timeline">
          <li v-for="(log, i) in row.logs" :key="i" class="log-item">
            <span class="log-dot" :class="i === row.logs.length - 1 ? 'dot-done' : ''" />
            <div class="log-content">
              <p class="log-time">{{ log.time }}</p>
              <p class="log-text">{{ log.text }}<template v-if="log.operator">（{{ log.operator }}）</template></p>
            </div>
          </li>
        </ul>
        <p v-else class="empty-text">暂无数据</p>
      </section>

      <!-- 完成凭证 -->
      <section class="detail-section">
        <h4 class="section-title">完成凭证</h4>
        <template v-if="hasVouchers">
          <div class="voucher-row">
            <div v-for="(v, i) in row.vouchers.first" :key="i" class="voucher-item">
              <div class="voucher-thumb-box"><i class="upload-icon" /></div>
              <p class="voucher-label">首图</p>
            </div>
            <div v-for="(v, i) in row.vouchers.last" :key="i" class="voucher-item">
              <div class="voucher-thumb-box"><i class="upload-icon" /></div>
              <p class="voucher-label">尾图</p>
            </div>
          </div>
          <div v-if="row.vouchers.process.length" class="voucher-row">
            <div v-for="(p, i) in row.vouchers.process" :key="i" class="voucher-item">
              <div class="voucher-thumb-box"><i class="upload-icon" /></div>
              <p class="voucher-label">进程图{{ i + 1 }}</p>
            </div>
          </div>
        </template>
        <p v-else class="empty-text">暂无数据</p>
        <div v-if="row.playerRemark" class="profit-line">打手备注：{{ row.playerRemark }}</div>
      </section>

      <!-- 订单备注 -->
      <section class="detail-section">
        <h4 class="section-title">订单备注</h4>
        <p class="empty-text">{{ row.orderRemark || '暂无数据' }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clubOrderApi } from '../../../api/modules/clubOrder';

const route = useRoute();
const router = useRouter();

const row = ref(null);
const loading = ref(false);

const STATUS_MAP = {
  WAIT_TAKE: 'pending', // 待接单
  IN_PROGRESS: 'processing', // 进行中
  COMPLETED: 'completed', // 已完成
  CLOSED: 'closed', // 交易关闭
};
const AUDIT_MAP = {
  UNSUBMITTED: 'none', // 未提交
  PENDING: 'pending', // 待审核
  REJECTED: 'rejected', // 已驳回
};
const STATUS_TEXT = { pending: '待接单', processing: '进行中', completed: '已完成', closed: '交易关闭' };

/* ===== 后端订单字段 → 页面行映射（与「我的订单」详情弹窗同一口径） ===== */
function mapOrder(o = {}) {
  const frozen = Number(o.frozen) === 1;
  const afterSale = Number(o.afterSaleFlag) === 1;
  const partialRefunded = Number(o.partialRefunded) === 1;
  const tags = [];
  if (afterSale) tags.push('售后中');
  if (frozen) tags.push('冻结');
  if (partialRefunded) tags.push('部分退款');

  // 订单金额口径：订单金额 + 平台加减价净值 + 俱乐部加减价净值（减价为负）
  const actualAmount =
    (Number(o.amount) || 0) + (Number(o.platformAdjust) || 0) + (Number(o.clubAdjust) || 0);
  const clubAdjust = Number(o.clubAdjust) || 0;

  return {
    id: o.id,
    orderNo: o.orderNo || '',
    customerTip: o.customerTip || '', // 接口未返回下单用户，预留
    amount: Number(o.amount) || 0,
    product: o.itemName || '',
    gameName: o.gameName || '', // 接口仅返回 gameId，预留
    clientType: Array.isArray(o.clientType) ? o.clientType : [], // 接口暂未返回，预留
    spec: o.spec || '', // 接口仅返回 specId，预留
    roleName: o.roleName || '', // 接口暂未返回，预留
    orderStatus: STATUS_MAP[o.status] || o.status,
    tags,
    auditStatus: AUDIT_MAP[o.auditStatus] || 'none',
    claimedCount: Number(o.takenCount) || 0,
    requiredCount: Number(o.playerCount) || 0,
    assignedPlayerCount: Number(o.assignedPlayerCount) || 0,
    frozen,
    afterSale,
    partialRefunded,
    assignService: o.ownerName || '', // 归属名 = 派单客服
    clubAcceptTime: o.takenAt || o.clubAcceptTime || '', // 俱乐部接单时间 = 接口 takenAt
    createTime: o.createTime || '', // 接口暂未返回，预留
    teamCode: o.teamCode || '', // 接口暂未返回，预留
    isDelta: false, // 接口未返回游戏类型，暂按非三角洲处理
    deposit: {
      targetW: 0,
      reason: '',
      firstW: 0,
      secondW: 0,
      note: o.depositNote || '', // 接口暂未返回，预留
    },
    players: Array.isArray(o.slots)
      ? o.slots.map((s) => ({
          name: '', // 接口未返回打手姓名，预留
          id: s.playerId ?? '',
          club: '', // 预留
          acceptTime: '', // 预留
          transferTime: '', // 预留
        }))
      : [],
    profit: {
      adjustText: clubAdjust ? `${clubAdjust > 0 ? '+' : ''}${clubAdjust.toFixed(2)}元` : '',
      clubShare: actualAmount.toFixed(2),
      playerShareText: '—', // 接口未返回分润明细，预留
      adjustInvalid: partialRefunded,
    },
    logs: [], // 接口未返回订单日志，预留
    vouchers: { first: [], last: [], process: [] }, // 接口未返回完成凭证，预留
    voucherTime: '',
    playerRemark: o.playerRemark || '', // 预留
    rejectReason: o.rejectReason || '', // 预留
    orderRemark: o.orderRemark || '', // 预留
    // 后端 2026-10-26 确认字段名（Apifox 526320879 已同步）：
    dispatchRemark: o.dispatchRemark ?? o.remark ?? '', // 派单备注，与历史 remark 同值
    completedAt: o.completedAt || '', // 完成时间 = 验收通过时间，未完成为空
    closedAt: o.closedAt || '', // 取消时间 = 交易关闭时间，未关闭为空
    settleDays: o.settleDays ?? null, // 收益入账天数：已验收用快照，未完成用当前分润配置；都没有为空；勿绑 settleDaysSnapshot
  };
}

/* ===== 存单信息 / 完成凭证 显隐 ===== */
const showDepositFull = computed(() => {
  const r = row.value;
  return !!r && r.isDelta && Number(r.deposit.targetW) > 0;
});
const showDepositNote = computed(() => {
  const r = row.value;
  return !!r && !r.isDelta && !!r.deposit.note;
});
const hasVouchers = computed(() => {
  const r = row.value;
  return !!r && (r.vouchers.first.length || r.vouchers.last.length || r.vouchers.process.length);
});

/* ===== 拉取详情：GET /api/club/orders/{id} ===== */
async function loadDetail() {
  const id = route.params.orderId;
  if (id === undefined || id === null || id === '') return;
  loading.value = true;
  try {
    const data = await clubOrderApi.detail(id);
    row.value = mapOrder(data || {});
  } catch {
    row.value = null; // 错误已由 request.js toast；展示「订单不存在或已失效」
  } finally {
    loading.value = false;
  }
}

function copyText(text) {
  if (!text) return;
  const raw = String(text);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(raw).catch(() => fallbackCopy(raw));
  } else {
    fallbackCopy(raw);
  }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch {
    /* 忽略复制失败 */
  }
  document.body.removeChild(ta);
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/orders/my-orders');
}

onMounted(loadDetail);
</script>

<style scoped>
.order-detail-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px 4px 32px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.btn-back {
  padding: 6px 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: var(--bg-card, rgba(255, 255, 255, 0.04));
  color: var(--text-main, #e8eaf0);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  border-color: var(--primary, #5b7cfa);
  color: var(--primary, #5b7cfa);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main, #e8eaf0);
}

.detail-box {
  background: var(--bg-panel, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  padding: 20px 24px;
}

.detail-loading {
  padding: 60px 0;
  text-align: center;
  color: var(--text-sub, #9aa3b5);
  font-size: 14px;
}

.detail-loading.empty p {
  margin: 0 0 16px;
}

.btn {
  padding: 7px 18px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-plain {
  background: transparent;
  border-color: var(--border-color, rgba(255, 255, 255, 0.16));
  color: var(--text-main, #e8eaf0);
}

.btn-plain:hover {
  border-color: var(--primary, #5b7cfa);
  color: var(--primary, #5b7cfa);
}

/* ===== 详情区块（与「我的订单」详情弹窗同款） ===== */
.detail-section {
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--border-soft, rgba(255, 255, 255, 0.1));
}

.detail-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.section-title {
  position: relative;
  margin: 0 0 12px;
  padding-left: 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main, #e8eaf0);
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 4px;
  border-radius: 2px;
  background: var(--primary, #5b7cfa);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 28px;
}

.info-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
}

.info-item label {
  flex-shrink: 0;
  color: var(--text-sub, #9aa3b5);
  min-width: 76px;
}

.order-no-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-sub, #9aa3b5);
}

.detail-refreshing {
  font-size: 12px;
  color: var(--primary, #5b7cfa);
  animation: refreshing-pulse 1.2s ease-in-out infinite;
}

@keyframes refreshing-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

.copy-icon {
  display: inline-block;
  width: 14px;
  height: 14px;
  cursor: pointer;
  opacity: 0.55;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z'/%3E%3C/svg%3E") center/contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z'/%3E%3C/svg%3E") center/contain no-repeat;
}

.copy-icon:hover {
  opacity: 1;
}

.settle-tip {
  margin-top: 12px;
  font-size: 13px;
  color: var(--status-success, #2fc279);
  background: rgba(47, 194, 121, 0.08);
  border-radius: 6px;
  padding: 8px 12px;
}

.reject-tip {
  font-size: 13px;
  color: var(--status-danger, #f04949);
  background: rgba(240, 73, 73, 0.08);
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 12px;
}

/* 打手信息 */
.player-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.player-card {
  background: var(--bg-hover, rgba(255, 255, 255, 0.04));
  border-radius: 10px;
  padding: 12px 14px;
}

.player-name {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main, #e8eaf0);
}

.player-club {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--text-sub, #9aa3b5);
}

.player-time {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub, #9aa3b5);
}

/* 分润信息 */
.profit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.profit-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.profit-item label {
  color: var(--text-sub, #9aa3b5);
}

.profit-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary, #5b7cfa);
}

.text-muted {
  color: var(--text-sub, #9aa3b5);
}

.profit-line {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-sub, #9aa3b5);
}

/* 存单信息 */
.upload-empty {
  margin-top: 12px;
}

.upload-box {
  width: 120px;
  height: 84px;
  border: 1px dashed var(--border-color, rgba(255, 255, 255, 0.16));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card, rgba(255, 255, 255, 0.03));
}

.upload-text {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-sub, #9aa3b5);
}

/* 完成凭证 */
.voucher-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.voucher-thumb-box {
  height: 96px;
  border: 1px dashed var(--border-color, rgba(255, 255, 255, 0.16));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card, rgba(255, 255, 255, 0.03));
}

.voucher-label {
  font-size: 12px;
  color: var(--text-sub, #9aa3b5);
  text-align: center;
}

.voucher-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

/* 订单日志 */
.log-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}

.log-item {
  position: relative;
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
}

.log-item::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 14px;
  bottom: -2px;
  width: 1px;
  background: var(--border-color, rgba(255, 255, 255, 0.1));
}

.log-item:last-child::before {
  display: none;
}

.log-dot {
  flex-shrink: 0;
  width: 11px;
  height: 11px;
  margin-top: 3px;
  border-radius: 50%;
  background: var(--border-color, rgba(255, 255, 255, 0.2));
}

.log-dot.dot-done {
  background: var(--primary, #5b7cfa);
  box-shadow: 0 0 0 3px rgba(91, 124, 250, 0.18);
}

.log-content {
  min-width: 0;
}

.log-time {
  margin: 0 0 3px;
  font-size: 12px;
  color: var(--text-sub, #9aa3b5);
}

.log-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-main, #e8eaf0);
}

/* 空态 */
.empty-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-sub, #9aa3b5);
}
</style>
