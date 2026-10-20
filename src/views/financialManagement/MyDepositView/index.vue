<script setup>
import { computed, reactive, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import AppModal from '../../../components/AppModal.vue';
import DataTable from '../../../components/DataTable.vue';
import { useToast } from '../../../composables/useToast';
import {
  DEPOSIT_FLOW_TYPE_OPTIONS,
  FLOW_TYPE_TEXT,
  WITHDRAW_RULES,
  depositAccount,
  buildDepositFlowRows,
} from './mockData';

/**
 * 财务管理 > 我的押金
 * 顶部押金总额卡片 + 押金明细流水表格 + 提现弹窗
 * 提现弹窗与「我的钱包」保持一致：4 个弹窗（提现 / 二次确认 / 错误提示 / 编辑支付宝）
 */
const { show } = useToast();

/* ================= 押金账户（mock，可在弹窗内修改） ================= */
const account = reactive({ ...depositAccount });
const submittedToday = ref(account.submittedToday);

// 退店距今天数
const daysSinceQuit = computed(() => {
  if (!account.hasQuitStore) return -1;
  const quitTime = new Date(account.quitAt.replace(/-/g, '/')).getTime();
  return Math.floor((Date.now() - quitTime) / (24 * 3600 * 1000));
});

// 入口提现按钮展示条件：已退店满14天 && 钱包未冻结
const canShowWithdrawBtn = computed(
  () =>
    account.hasQuitStore &&
    daysSinceQuit.value >= WITHDRAW_RULES.quitStoreRequiredDays &&
    !account.walletFrozen,
);

/* ================= 押金明细筛选 ================= */
const filter = reactive({
  type: '',
  startTime: '',
  endTime: '',
});

const typeOptions = computed(() => [
  { label: '全部', value: '' },
  ...DEPOSIT_FLOW_TYPE_OPTIONS,
]);

/* ================= 押金明细表格 ================= */
const allRows = ref(buildDepositFlowRows(658));
const columns = [
  { key: 'typeText', title: '类型' },
  { key: 'amount', title: '金额（元）' },
  { key: 'reason', title: '原因' },
  { key: 'time', title: '时间' },
];

const page = ref(1);
const pageSize = ref(10);

const filteredRows = computed(() =>
  allRows.value.filter((row) => {
    if (filter.type && row.type !== filter.type) return false;
    const day = row.time.slice(0, 10);
    if (filter.startTime && day < filter.startTime) return false;
    if (filter.endTime && day > filter.endTime) return false;
    return true;
  }),
);

const total = computed(() => filteredRows.value.length);
const rows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

function handleSearch() {
  page.value = 1;
}

function handleReset() {
  filter.type = '';
  filter.startTime = '';
  filter.endTime = '';
  page.value = 1;
}

function formatAmount(val) {
  const num = Number(val) || 0;
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}`;
}

/* ================= 提现弹窗 ================= */
const withdrawVisible = ref(false);
const withdrawForm = reactive({ amount: '' });

// 当天剩余可提交次数
const remainTimes = computed(() =>
  Math.max(0, WITHDRAW_RULES.dailyMaxTimes - submittedToday.value),
);

/**
 * 点击入口「提现」：先判断实名，未实名引导去实名认证，再打开弹窗
 */
function openWithdrawModal() {
  if (!account.isRealNameVerified) {
    ElMessageBox.confirm('您还未完成实名认证，提现前需先完成实名认证。是否前往认证？', '实名认证提醒', {
      confirmButtonText: '去认证',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        show('请前往个人中心完成实名认证', 'info');
      })
      .catch(() => {});
    return;
  }
  withdrawForm.amount = '';
  withdrawVisible.value = true;
}

function fillAllAmount() {
  withdrawForm.amount = Number(account.withdrawableBalance).toFixed(2);
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
  // 1. 钱包冻结
  if (account.walletFrozen) {
    showError('您的钱包已冻结，请联系客服咨询');
    return;
  }
  // 2. 退店条件（押金特有：需已退店且超过14天）
  if (!account.hasQuitStore || daysSinceQuit.value < WITHDRAW_RULES.quitStoreRequiredDays) {
    showError('需退店超过14天后方可提现押金');
    return;
  }
  // 3. 当天次数用尽
  if (remainTimes.value <= 0) {
    showError('当天可提交次数已用尽，请明日再来');
    return;
  }
  // 4. 非可提现时间段
  if (!isInWithdrawTime()) {
    showError('当前非可提现时间段');
    return;
  }
  // 5. 金额校验
  const amt = Number(withdrawForm.amount);
  if (!withdrawForm.amount || Number.isNaN(amt) || amt <= 0) {
    show('请输入正确的提现金额', 'warning');
    return;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(String(withdrawForm.amount).trim())) {
    show('金额最多保留两位小数', 'warning');
    return;
  }
  if (amt > Number(account.withdrawableBalance)) {
    show('提现金额不能超过可提现余额', 'warning');
    return;
  }
  // 通过校验 → 二次确认
  confirmVisible.value = true;
}

function confirmWithdraw() {
  const amt = Number(withdrawForm.amount);
  account.withdrawableBalance = Number((account.withdrawableBalance - amt).toFixed(2));
  account.depositBalance = Number((account.depositBalance - amt).toFixed(2));
  submittedToday.value += 1;

  // 往明细头部插入一条「提现成功」
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  allRows.value.unshift({
    id: `flow-${Date.now()}`,
    type: 'withdraw_success',
    typeText: FLOW_TYPE_TEXT.withdraw_success,
    amount: -amt,
    reason: '',
    time: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  });

  confirmVisible.value = false;
  withdrawVisible.value = false;
  show('提现申请已提交', 'success');
}

/* ---- 编辑支付宝账号弹窗 ---- */
const alipayEditVisible = ref(false);
const alipayEditForm = reactive({ account: '' });

function openAlipayEdit() {
  alipayEditForm.account = account.alipayAccount;
  alipayEditVisible.value = true;
}

function saveAlipay() {
  if (!alipayEditForm.account.trim()) {
    show('请输入支付宝账号', 'warning');
    return;
  }
  account.alipayAccount = alipayEditForm.account.trim();
  alipayEditVisible.value = false;
  show('支付宝账号已更新', 'success');
}
</script>

<template>
  <div class="my-deposit-page">
    <!-- ===== 顶部：我的押金卡片 ===== -->
    <div class="balance-card">
      <p class="balance-label">我的押金</p>
      <p class="balance-value">¥{{ Number(account.depositBalance).toFixed(2) }}</p>
      <button
        v-if="canShowWithdrawBtn"
        type="button"
        class="withdraw-entry-btn"
        @click="openWithdrawModal"
      >
        提现
      </button>
    </div>

    <!-- ===== 押金明细卡片 ===== -->
    <div class="flow-panel">
      <h3 class="panel-title">押金明细</h3>

      <!-- 筛选行 -->
      <div class="filter-row">
        <div class="filter-item">
          <label class="filter-label">类型</label>
          <el-select v-model="filter.type" placeholder="请选择" style="width: 180px" @change="handleSearch">
            <el-option v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
        <div class="filter-item">
          <label class="filter-label">时间</label>
          <el-date-picker
            v-model="filter.startTime"
            type="date"
            placeholder="开始时间"
            value-format="YYYY-MM-DD"
            style="width: 160px"
            @change="handleSearch"
          />
          <span class="time-sep">—</span>
          <el-date-picker
            v-model="filter.endTime"
            type="date"
            placeholder="结束时间"
            value-format="YYYY-MM-DD"
            style="width: 160px"
            @change="handleSearch"
          />
          <el-button class="filter-reset-btn" @click="handleReset">重置</el-button>
        </div>
      </div>

      <!-- 明细表格 -->
      <DataTable
        :columns="columns"
        :data="rows"
        :total="total"
        :page="page"
        :page-size="pageSize"
        @page-change="(p) => (page = p)"
      >
        <template #cell-amount="{ row }">
          <span :class="['amount-text', row.amount >= 0 ? 'amount-in' : 'amount-out']">
            {{ formatAmount(row.amount) }}
          </span>
        </template>
        <template #cell-reason="{ row }">
          <span v-if="row.reason">{{ row.reason }}</span>
          <span v-else class="muted-text">—</span>
        </template>
      </DataTable>
    </div>

    <!-- ===== 提现弹窗 ===== -->
    <AppModal v-model="withdrawVisible" title="提现" width="420px">
      <div class="withdraw-form">
        <!-- 支付宝账号 -->
        <div class="form-row">
          <span class="form-label">支付宝账号：</span>
          <span class="form-value">{{ account.alipayAccount }}</span>
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
          <span class="sub-text">可提现余额：¥{{ Number(account.withdrawableBalance).toFixed(2) }}</span>
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
          </ol>
        </div>

        <button type="button" class="submit-btn" @click="handleSubmitWithdraw">提现</button>
      </div>
    </AppModal>

    <!-- ===== 二次确认弹窗 ===== -->
    <AppModal v-model="confirmVisible" title="提现确认" width="380px">
      <div class="confirm-box">
        <div class="confirm-row"><span class="confirm-label">支付宝账号</span><span>{{ account.alipayAccount }}</span></div>
        <div class="confirm-row"><span class="confirm-label">姓名</span><span>{{ account.alipayName }}</span></div>
        <div class="confirm-row"><span class="confirm-label">提现金额</span><span class="confirm-amount">¥{{ Number(withdrawForm.amount || 0).toFixed(2) }}</span></div>
      </div>
      <template #footer>
        <button class="btn btn-plain" type="button" @click="confirmVisible = false">取消</button>
        <button class="btn btn-primary" type="button" @click="confirmWithdraw">确定提现</button>
      </template>
    </AppModal>

    <!-- ===== 错误提示弹窗（我知道了） ===== -->
    <AppModal v-model="errorVisible" width="360px">
      <p class="error-text">{{ errorMessage }}</p>
      <template #footer>
        <button class="btn btn-primary" type="button" @click="errorVisible = false">我知道了</button>
      </template>
    </AppModal>

    <!-- ===== 编辑支付宝账号弹窗 ===== -->
    <AppModal v-model="alipayEditVisible" title="编辑支付宝账号" width="360px">
      <el-input v-model="alipayEditForm.account" placeholder="请输入支付宝账号" />
      <template #footer>
        <button class="btn btn-plain" type="button" @click="alipayEditVisible = false">取消</button>
        <button class="btn btn-primary" type="button" @click="saveAlipay">保存</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.my-deposit-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== 顶部押金卡片 ===== */
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

/* ===== 押金明细卡片 ===== */
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

.time-sep {
  color: var(--text-sub);
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

.btn-plain {
  background: var(--bg-hover);
  color: var(--text-main);
}

.btn-plain:hover {
  background: var(--border-faint);
}
</style>
