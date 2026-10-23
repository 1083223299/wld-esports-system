<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import DataTable from '../../../components/DataTable.vue';
import { useToast } from '../../../composables/useToast';
import { walletApi } from '../../../api/modules/wallet';
import { WITHDRAW_RULES, FLOW_TYPE_TEXT } from './mockData';

/**
 * 财务管理 > 我的钱包（真实接口联调）
 * - GET  /api/club/wallets/me           顶部可提现余额（income）
 * - GET  /api/club/wallets/txns         钱包明细流水（服务端分页 / walletType 筛选）
 * - POST /api/club/wallets/withdraw     提现（幂等 requestId，PROCESSING 异步回查）
 * - GET  /api/club/wallets/withdrawals  提现单状态
 * 说明：收款信息接口未下发，前端本地持久化；当天提交次数后端未下发，前端按天计数。
 */
const { show } = useToast();

/* ================= 钱包余额（GET /api/club/wallets/me） ================= */
const wallet = reactive({ income: 0, deposit: 0, walletFrozen: false });
const loadingWallet = ref(false);

const withdrawableBalance = computed(() => Number(wallet.income) || 0);

async function loadWallet() {
  loadingWallet.value = true;
  try {
    const data = await walletApi.me();
    wallet.income = Number(data?.income) || 0;
    wallet.deposit = Number(data?.deposit) || 0;
    wallet.walletFrozen = !!data?.walletFrozen;
  } catch {
    // 错误提示已由 request.js 统一 toast
  } finally {
    loadingWallet.value = false;
  }
}

/* ================= 收款信息（接口未下发，本地持久化） ================= */
const PAY_INFO_KEY = 'club_wallet_pay_info';

function loadPayInfo() {
  try {
    const saved = JSON.parse(localStorage.getItem(PAY_INFO_KEY)) || {};
    return { alipayAccount: saved.alipayAccount || '', alipayName: saved.alipayName || '' };
  } catch {
    return { alipayAccount: '', alipayName: '' };
  }
}

const payInfo = reactive(loadPayInfo());

function savePayInfo() {
  localStorage.setItem(PAY_INFO_KEY, JSON.stringify({ ...payInfo }));
}

/* ================= 当天提交次数（后端未下发，本地按天计数） ================= */
function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const submittedToday = ref(
  Number(localStorage.getItem(`club_wallet_withdraw_count_${todayKey()}`)) || 0,
);

const remainTimes = computed(() =>
  Math.max(0, WITHDRAW_RULES.dailyMaxTimes - submittedToday.value),
);

function markSubmitted() {
  submittedToday.value += 1;
  localStorage.setItem(`club_wallet_withdraw_count_${todayKey()}`, String(submittedToday.value));
}

/* ================= 钱包明细（服务端分页，walletType 服务端筛选） ================= */
const filter = reactive({ walletType: '' });
const WALLET_TYPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '收益', value: 'INCOME' },
  { label: '押金', value: 'DEPOSIT' },
];

const txns = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loadingTxns = ref(false);

const columns = [
  { key: 'typeText', title: '类型' },
  { key: 'amount', title: '金额(元)' },
  { key: 'relationNo', title: '关联订单号' },
  { key: 'reason', title: '原因' },
  { key: 'time', title: '时间' },
];

/** 后端流水字段 → 表格字段映射（bizType 优先走原型文案映射，未知值原样展示） */
function mapTxn(t = {}) {
  return {
    id: t.id,
    typeText: FLOW_TYPE_TEXT[t.bizType] || t.bizType || '',
    amount: Number(t.amount) || 0,
    relationNo: t.orderNo || '',
    reason: t.reason || '',
    time: t.createdAt || '',
  };
}

async function loadTxns() {
  loadingTxns.value = true;
  try {
    const data = await walletApi.txns({
      walletType: filter.walletType,
      page: page.value,
      pageSize: pageSize.value,
    });
    total.value = Number(data?.total) || 0;
    txns.value = Array.isArray(data?.list) ? data.list.map(mapTxn) : [];
    // 当前页被删空时回退到第 1 页
    if (txns.value.length === 0 && page.value > 1) {
      page.value = 1;
      await loadTxns();
      return;
    }
  } catch {
    txns.value = [];
    total.value = 0;
  } finally {
    loadingTxns.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  loadTxns();
}

function handleReset() {
  filter.walletType = '';
  handleSearch();
}

function handlePageChange(p) {
  page.value = p;
  loadTxns();
}

function formatAmount(val) {
  const num = Number(val) || 0;
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}`;
}

/* ================= 提现弹窗（POST /api/club/wallets/withdraw） ================= */
const withdrawVisible = ref(false);
const withdrawForm = reactive({ amount: '' });
const submitting = ref(false);
const lastRequestId = ref('');

function openWithdrawModal() {
  withdrawForm.amount = '';
  withdrawVisible.value = true;
}

function fillAllAmount() {
  withdrawForm.amount = withdrawableBalance.value.toFixed(2);
}

// 当前是否在可提现时间段内
function isInWithdrawTime() {
  const h = new Date().getHours();
  return h >= WITHDRAW_RULES.availableHourStart && h < WITHDRAW_RULES.availableHourEnd;
}

/* ---- 错误提示弹窗（"我知道了"） ---- */
const errorVisible = ref(false);
const errorMessage = ref('');
function showError(msg) {
  errorMessage.value = msg;
  errorVisible.value = true;
}

/* ---- 二次确认弹窗 ---- */
const confirmVisible = ref(false);

function handleSubmitWithdraw() {
  // 0. 收款信息完整性
  if (!payInfo.alipayAccount.trim() || !payInfo.alipayName.trim()) {
    showError('请先完善支付宝账号与实名信息');
    return;
  }
  // 1. 钱包冻结
  if (wallet.walletFrozen) {
    showError('您的钱包已冻结，请联系客服咨询');
    return;
  }
  // 2. 当天次数用尽
  if (remainTimes.value <= 0) {
    showError('当天可提交次数已用尽，请明日再来');
    return;
  }
  // 3. 非可提现时间段
  if (!isInWithdrawTime()) {
    showError('当前非可提现时间段');
    return;
  }
  // 4. 金额校验
  const amt = Number(withdrawForm.amount);
  if (!withdrawForm.amount || Number.isNaN(amt) || amt <= 0) {
    showError('提现金额需≥90元');
    return;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(String(withdrawForm.amount).trim())) {
    show('金额最多保留两位小数', 'warning');
    return;
  }
  if (amt < WITHDRAW_RULES.minAmount) {
    showError('提现金额需≥90元');
    return;
  }
  if (amt > withdrawableBalance.value) {
    show('提现金额不能超过可提现余额', 'warning');
    return;
  }
  // 通过校验 → 二次确认
  confirmVisible.value = true;
}

/** 幂等单号：时间戳 + 随机数 */
function generateRequestId() {
  return `W${Date.now()}${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
}

async function confirmWithdraw() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    lastRequestId.value = generateRequestId();
    const res = await walletApi.withdraw({
      walletType: 'INCOME',
      amount: Number(withdrawForm.amount),
      alipayAccount: payInfo.alipayAccount.trim(),
      alipayName: payInfo.alipayName.trim(),
      requestId: lastRequestId.value,
    });
    const status = res?.status;
    confirmVisible.value = false;
    withdrawVisible.value = false;

    if (status === 'FAIL') {
      showError('提现失败，请联系客服或稍后重试');
    } else {
      show(status === 'SUCCESS' ? '提现成功' : '提现申请已提交，请等待到账', 'success');
      markSubmitted();
    }
    await loadWallet();
    await loadTxns();
    // 异步处理中：稍后回查一次提现单状态
    if (status === 'PROCESSING') {
      setTimeout(queryWithdrawalResult, 3000);
    }
  } catch {
    // 后端校验错误（金额/次数/冻结等）已由 request.js 统一 toast
  } finally {
    submitting.value = false;
  }
}

/* ---- 提现单状态回查（GET /api/club/wallets/withdrawals） ---- */
async function queryWithdrawalResult() {
  if (!lastRequestId.value) return;
  try {
    const order = await walletApi.withdrawalStatus(lastRequestId.value);
    const status = order?.status;
    if (status === 'FAIL') {
      showError(`提现失败：${order.failReason || '未知原因'}`);
    } else if (status === 'SUCCESS') {
      show('提现成功，款项已转出', 'success');
    }
  } catch {
    // 查询失败不打扰用户，可手动刷新
  }
}

/* ---- 编辑收款信息弹窗（账号 + 实名） ---- */
const alipayEditVisible = ref(false);
const alipayEditForm = reactive({ account: '', name: '' });

function openAlipayEdit() {
  alipayEditForm.account = payInfo.alipayAccount;
  alipayEditForm.name = payInfo.alipayName;
  alipayEditVisible.value = true;
}

function saveAlipay() {
  if (!alipayEditForm.account.trim()) {
    show('请输入支付宝账号', 'warning');
    return;
  }
  if (!alipayEditForm.name.trim()) {
    show('请输入支付宝实名', 'warning');
    return;
  }
  payInfo.alipayAccount = alipayEditForm.account.trim();
  payInfo.alipayName = alipayEditForm.name.trim();
  savePayInfo();
  alipayEditVisible.value = false;
  show('收款信息已更新', 'success');
}

onMounted(() => {
  loadWallet();
  loadTxns();
});
</script>

<template>
  <div class="my-wallet-page">
    <!-- ===== 顶部：可提现余额卡片 ===== -->
    <div class="balance-card" v-loading="loadingWallet">
      <p class="balance-label">可提现余额</p>
      <p class="balance-value">¥{{ withdrawableBalance.toFixed(2) }}</p>
      <button type="button" class="withdraw-entry-btn" @click="openWithdrawModal">提现</button>
    </div>

    <!-- ===== 钱包明细卡片 ===== -->
    <div class="flow-panel">
      <h3 class="panel-title">钱包明细</h3>

      <!-- 筛选行 -->
      <div class="filter-row">
        <div class="filter-item">
          <label class="filter-label">类型</label>
          <el-select v-model="filter.walletType" placeholder="请选择" style="width: 180px" @change="handleSearch">
            <el-option v-for="opt in WALLET_TYPE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
        <el-button class="filter-reset-btn" @click="handleReset">重置</el-button>
      </div>

      <!-- 明细表格 -->
      <div v-loading="loadingTxns">
        <DataTable
          :columns="columns"
          :data="txns"
          :total="total"
          :page="page"
          :page-size="pageSize"
          @page-change="handlePageChange"
        >
          <template #cell-amount="{ row }">
            <span :class="['amount-text', row.amount >= 0 ? 'amount-in' : 'amount-out']">
              {{ formatAmount(row.amount) }}
            </span>
          </template>
          <template #cell-relationNo="{ row }">
            <a v-if="row.relationNo" class="relation-link">{{ row.relationNo }}</a>
            <span v-else class="muted-text">—</span>
          </template>
          <template #cell-reason="{ row }">
            <span v-if="row.reason">{{ row.reason }}</span>
            <span v-else class="muted-text">—</span>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- ===== 提现弹窗 ===== -->
    <AppModal v-model="withdrawVisible" title="提现" width="420px">
      <div class="withdraw-form">
        <!-- 支付宝账号 -->
        <div class="form-row">
          <span class="form-label">支付宝账号：</span>
          <span class="form-value">{{ payInfo.alipayAccount }}</span>
          <a class="edit-link" @click="openAlipayEdit">编辑&gt;</a>
        </div>

        <!-- 提现金额 -->
        <div class="form-row form-row-block">
          <span class="form-label">提现金额</span>
          <div class="amount-input-wrap">
            <span class="currency-symbol">¥</span>
            <el-input v-model="withdrawForm.amount" placeholder="" type="number" class="amount-input" />
            <a class="edit-link all-withdraw" @click="fillAllAmount">全部提现</a>
          </div>
        </div>

        <!-- 可提现余额 / 当日剩余次数 -->
        <div class="form-row sub-row">
          <span class="sub-text">可提现余额：¥{{ withdrawableBalance.toFixed(2) }}</span>
        </div>
        <div class="form-row sub-row">
          <span class="sub-text">当天剩余提交次数：{{ remainTimes }}次</span>
        </div>

        <!-- 提现条件说明 -->
        <div class="rules-box">
          <p class="rules-title">提现条件：</p>
          <ol class="rules-list">
            <li>一天内，提交此时上限{{ WITHDRAW_RULES.dailyMaxTimes }}次</li>
            <li>可提现时间段：每日{{ String(WITHDRAW_RULES.availableHourStart).padStart(2, '0') }}:00-{{ String(WITHDRAW_RULES.availableHourEnd).padStart(2, '0') }}:00</li>
            <li>提现金额需≥{{ WITHDRAW_RULES.minAmount }}元</li>
          </ol>
        </div>

        <button type="button" class="submit-btn" :disabled="submitting" @click="handleSubmitWithdraw">
          {{ submitting ? '提交中...' : '提现' }}
        </button>
      </div>
    </AppModal>

    <!-- ===== 二次确认弹窗 ===== -->
    <AppModal v-model="confirmVisible" title="提现确认" width="380px">
      <div class="confirm-box">
        <div class="confirm-row"><span class="confirm-label">支付宝账号</span><span>{{ payInfo.alipayAccount }}</span></div>
        <div class="confirm-row"><span class="confirm-label">姓名</span><span>{{ payInfo.alipayName }}</span></div>
        <div class="confirm-row"><span class="confirm-label">提现金额</span><span class="confirm-amount">¥{{ Number(withdrawForm.amount || 0).toFixed(2) }}</span></div>
      </div>
      <template #footer>
        <button class="btn btn-plain" type="button" @click="confirmVisible = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="submitting" @click="confirmWithdraw">
          {{ submitting ? '提交中...' : '确定提现' }}
        </button>
      </template>
    </AppModal>

    <!-- ===== 错误提示弹窗（我知道了） ===== -->
    <AppModal v-model="errorVisible" width="360px">
      <p class="error-text">{{ errorMessage }}</p>
      <template #footer>
        <button class="btn btn-primary" type="button" @click="errorVisible = false">我知道了</button>
      </template>
    </AppModal>

    <!-- ===== 编辑收款信息弹窗 ===== -->
    <AppModal v-model="alipayEditVisible" title="编辑收款信息" width="360px">
      <div class="pay-form">
        <div class="form-row form-row-block">
          <span class="form-label">支付宝账号</span>
          <el-input v-model="alipayEditForm.account" placeholder="请输入支付宝账号" />
        </div>
        <div class="form-row form-row-block">
          <span class="form-label">支付宝实名</span>
          <el-input v-model="alipayEditForm.name" placeholder="请输入支付宝实名（与账号一致）" />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" type="button" @click="alipayEditVisible = false">取消</button>
        <button class="btn btn-primary" type="button" @click="saveAlipay">保存</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.my-wallet-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== 顶部余额卡片 ===== */
.balance-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px 24px;
  text-align: center;
}

.balance-label {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-sub);
}

.balance-value {
  margin: 0 0 16px;
  font-size: 32px;
  font-weight: 700;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}

.withdraw-entry-btn {
  min-width: 96px;
  height: 36px;
  padding: 0 24px;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: var(--text-invert);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.withdraw-entry-btn:hover {
  filter: brightness(1.06);
}

/* ===== 钱包明细卡片 ===== */
.flow-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 20px 0;
}

.panel-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
  margin-bottom: 16px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: var(--text-main);
}

.filter-reset-btn {
  margin-left: 8px;
}

/* 金额：收入绿色 +，支出红色 - */
.amount-text {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.amount-in { color: var(--status-success); }
.amount-out { color: var(--status-danger); }

.relation-link {
  color: var(--primary);
  cursor: pointer;
}

.relation-link:hover { text-decoration: underline; }

.muted-text { color: var(--text-faint); }

/* ===== 提现弹窗 ===== */
.withdraw-form {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  font-size: 13px;
}

.form-row-block {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}

.form-label {
  color: var(--text-main);
  flex-shrink: 0;
}

.form-value {
  color: var(--text-main);
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
}

.edit-link {
  margin-left: auto;
  color: var(--primary);
  cursor: pointer;
  font-size: 13px;
}

.edit-link:hover { text-decoration: underline; }

.amount-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.currency-symbol {
  color: var(--text-sub);
  font-size: 14px;
}

.amount-input {
  flex: 1;
}

.all-withdraw {
  margin-left: 0;
}

.sub-row {
  margin-bottom: 6px;
}

.sub-text {
  color: var(--text-sub);
  font-size: 13px;
}

.rules-box {
  background: var(--bg-hover);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 8px 0 18px;
}

.rules-title {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--text-main);
}

.rules-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12.5px;
  color: var(--text-sub);
  line-height: 1.9;
}

.submit-btn {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: var(--text-invert);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn:hover { filter: brightness(1.06); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ===== 二次确认弹窗 ===== */
.confirm-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.confirm-row {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.confirm-label {
  width: 80px;
  color: var(--text-sub);
}

.confirm-amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* ===== 错误提示弹窗 ===== */
.error-text {
  margin: 8px 0;
  text-align: center;
  font-size: 14px;
  color: var(--text-main);
  line-height: 1.7;
}

/* ===== 编辑收款信息弹窗 ===== */
.pay-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ===== 通用按钮（弹窗 footer） ===== */
.btn {
  border: none;
  border-radius: 8px;
  padding: 9px 22px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.btn-primary {
  background: var(--primary);
  color: var(--text-invert);
}

.btn-primary:hover { filter: brightness(1.06); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-plain {
  background: var(--bg-hover);
  color: var(--text-main);
}

.btn-plain:hover {
  background: var(--border-faint);
}
</style>
