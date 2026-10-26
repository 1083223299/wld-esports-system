<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import DataTable from '../../../components/DataTable.vue';
import { useToast } from '../../../composables/useToast';
import { walletApi } from '../../../api/modules/wallet';
import { clubAccountApi } from '../../../api/modules/clubAccount';
import {
  DEPOSIT_FLOW_TYPE_OPTIONS,
  FLOW_TYPE_TEXT,
  WITHDRAW_RULES,
} from './mockData';

/**
 * 财务管理 > 我的押金（接口联调版）
 * - 余额卡片：GET /api/club/wallets/me（deposit / income / walletFrozen）
 * - 押金明细：GET /api/club/wallets/txns（walletType=DEPOSIT 分页）
 * - 提现：POST /api/club/wallets/withdraw（walletType=DEPOSIT + requestId 幂等）
 * 联调说明：
 *  1. 流水接口暂未提供类型/时间筛选参数，页面按 total 循环拉取全量后
 *     在前端筛选 + 分页；若数据量增大或后端支持筛选，可改回服务端分页。
 *  2. 支付宝账号/姓名、退店状态、实名状态、当日已提交次数等字段接口暂未返回，
 *     暂用本地默认值 + localStorage 兜底，待后端提供后替换。
 */
const { show } = useToast();

/* ================= 押金余额（接口） ================= */
const balance = ref({ deposit: 0, income: 0, walletFrozen: false });
const loading = ref(false);

/* ---- 提现所需本地兜底字段（接口未返回，待后端提供后替换） ---- */
const ALIPAY_ACCOUNT_KEY = 'wld_deposit_alipay_account';
const ALIPAY_NAME_KEY = 'wld_deposit_alipay_name';
const account = reactive({
  alipayAccount: localStorage.getItem(ALIPAY_ACCOUNT_KEY) || '16541656416',
  alipayName: localStorage.getItem(ALIPAY_NAME_KEY) || '张三',
  hasQuitStore: true, // 是否已退店（接口未返回，后端提现接口应最终校验）
  quitAt: '2026-09-20 10:00:00', // 退店时间（接口未返回）
  isRealNameVerified: false, // 实名状态：由 GET /api/club/me 拉取（realNameVerified）
});
// 当日已提交次数（接口未返回，前端体验层计数，后端应最终校验）
const submittedToday = ref(0);

/* ================= 实名状态（GET /api/club/me） ================= */
async function loadAccount() {
  try {
    const me = await clubAccountApi.me();
    account.isRealNameVerified = !!me?.realNameVerified;
  } catch {
    // 错误已由 request.js 统一 toast，保持默认未实名
  }
}

// 退店距今天数
const daysSinceQuit = computed(() => {
  if (!account.hasQuitStore) return -1;
  const quitTime = new Date(account.quitAt.replace(/-/g, '/')).getTime();
  return Math.floor((Date.now() - quitTime) / (24 * 3600 * 1000));
});

/* ================= 押金提现规则（GET /api/club/wallets/withdraw-rules?walletType=DEPOSIT） =================
 * 后端口径（2026-10-23）：字段 dailyLimit/usedToday/remainToday/windowStart/windowEnd/inWindow/…/showWithdraw；
 * 押金提现按钮看 showWithdraw：已退店满 14 天且钱包未冻结才为 true；押金无 90 元最低限制（收益才有）。
 * 接口失败时回退本地计算。
 */
const depositRules = reactive({
  dailyLimit: WITHDRAW_RULES.dailyMaxTimes,
  remainToday: null,
  inWindow: null,
  windowStart: '08:00',
  windowEnd: '18:00',
  showWithdraw: false,
});

async function fetchDepositRules() {
  try {
    const r = await walletApi.withdrawRules('DEPOSIT');
    if (r && typeof r === 'object') {
      if (Number.isFinite(Number(r.dailyLimit))) depositRules.dailyLimit = Number(r.dailyLimit);
      if (r.remainToday !== undefined && r.remainToday !== null) {
        depositRules.remainToday = Number(r.remainToday);
      }
      if (typeof r.inWindow === 'boolean') depositRules.inWindow = r.inWindow;
      if (r.windowStart !== undefined && r.windowStart !== null) depositRules.windowStart = String(r.windowStart);
      if (r.windowEnd !== undefined && r.windowEnd !== null) depositRules.windowEnd = String(r.windowEnd);
      if (typeof r.showWithdraw === 'boolean') depositRules.showWithdraw = r.showWithdraw;
    }
  } catch {
    // 拉取失败：回退本地计算（已退店满14天 + 钱包未冻结）
  }
}

// 本地兜底计算（接口失败时）
const localCanWithdraw = computed(
  () =>
    account.hasQuitStore &&
    daysSinceQuit.value >= WITHDRAW_RULES.quitStoreRequiredDays &&
    !balance.value.walletFrozen,
);

// 入口提现按钮展示条件：优先接口 showWithdraw，失败回退本地计算
const canShowWithdrawBtn = computed(() => {
  if (depositRules.showWithdraw) return true;
  return localCanWithdraw.value;
});

/* ================= 余额 / 流水拉取 ================= */
async function fetchBalance() {
  try {
    const data = await walletApi.me();
    balance.value = {
      deposit: Number(data?.deposit) || 0,
      income: Number(data?.income) || 0,
      walletFrozen: Boolean(data?.walletFrozen),
    };
  } catch (e) {
    // request.js 已统一 toast，保持原值
  }
}

/** 服务端流水 → 表格行 */
function normalizeTxn(item) {
  return {
    id: item.id ?? `${item.createdAt}-${item.bizType}-${item.amount}`,
    type: item.bizType,
    typeText: FLOW_TYPE_TEXT[item.bizType] || item.bizType || '—',
    amount: Number(item.amount) || 0,
    reason: item.reason || '',
    orderNo: item.orderNo || '',
    time: item.createdAt || '',
  };
}

/** 拉取押金明细（服务端筛选：类型 bizType + 时间 createdFrom/createdTo + 分页；条件变更即调用） */
async function loadTxns() {
  loading.value = true;
  try {
    const data = await walletApi.txns({
      walletType: 'DEPOSIT',
      bizType: filter.type,
      createdFrom: Array.isArray(filter.timeRange) ? filter.timeRange[0] : '',
      createdTo: Array.isArray(filter.timeRange) ? filter.timeRange[1] : '',
      page: page.value,
      pageSize: pageSize.value,
    });
    total.value = Number(data?.total) || 0;
    txns.value = Array.isArray(data?.list) ? data.list.map(normalizeTxn) : [];
    // 当前页被删空时回退到第 1 页
    if (txns.value.length === 0 && page.value > 1) {
      page.value = 1;
      await loadTxns();
      return;
    }
  } catch (e) {
    // request.js 已统一 toast，保留原数据
    txns.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAccount();
  fetchDepositRules();
  fetchBalance();
  loadTxns();
});

/* ================= 押金明细（服务端筛选：类型/时间 选择即调接口） =================
 * 2026-10-26：按用户要求由「本地筛全量」改为服务端筛选，与钱包页一致：
 * 改任一筛选条件立即调 GET /api/club/wallets/txns（walletType=DEPOSIT + bizType + createdFrom/createdTo + 分页）
 * 类型筛选参数名暂按 bizType 透传（txns 响应字段即 bizType），待后端确认
 */
const filter = reactive({ type: '', timeRange: [] });

/** 时间快捷项（与打手列表一致） */
const TIME_SHORTCUTS = [
  { text: '今天', value: () => { const d = new Date(); return [d, d]; } },
  { text: '最近7天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); return [start, end]; } },
  { text: '最近30天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 29); return [start, end]; } },
];
/** 流水时间不能选未来 */
const disableFutureDate = (time) => time.getTime() > Date.now();

// 本地展示枚举 → 后端筛选枚举（txns 类型校验允许值：订单收入/提现成功/提现失败/平台扣除/转单扣除/余额抵扣/平台充值/充值；
// 押金可用：充值/提现成功/提现失败/平台扣除/余额抵扣；接口校验提示即这些中文，按中文透传）
const DEPOSIT_BIZ_TYPE = {
  recharge: '充值',
  withdraw_success: '提现成功',
  platform_deduct: '平台扣除',
  withdraw_fail: '提现失败',
  balance_deduct: '余额抵扣',
};

// 类型下拉选项（含"全部"；value 用后端筛选枚举）
const typeOptions = computed(() => [
  { label: '全部', value: '' },
  ...DEPOSIT_FLOW_TYPE_OPTIONS.map((opt) => ({ ...opt, value: DEPOSIT_BIZ_TYPE[opt.value] || opt.value })),
]);

/* ================= 押金明细表格（服务端分页） ================= */
const columns = [
  { key: 'typeText', title: '类型' },
  { key: 'amount', title: '金额（元）' },
  { key: 'orderNo', title: '关联订单号' },
  { key: 'reason', title: '原因' },
  { key: 'time', title: '时间' },
];

const txns = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

function handleSearch() {
  page.value = 1;
  loadTxns();
}

function handleReset() {
  filter.type = '';
  filter.timeRange = [];
  page.value = 1;
  loadTxns();
}

function handlePageChange(p) {
  page.value = p;
  loadTxns();
}

function formatAmount(val) {
  const num = Number(val) || 0;
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}`;
}

/* ================= 提现弹窗 ================= */
const withdrawVisible = ref(false);
const withdrawForm = reactive({ amount: '' });
const withdrawing = ref(false);

// 当天剩余可提交次数
const remainTimes = computed(() => {
  if (depositRules.remainToday !== null && depositRules.remainToday !== undefined) {
    return Math.max(0, depositRules.remainToday);
  }
  return Math.max(0, depositRules.dailyLimit - submittedToday.value);
});

/* ================= 实名认证弹窗（POST /api/club/me/real-name） ================= */
const realNameVisible = ref(false);
const realNameSubmitting = ref(false);
const realNameForm = reactive({ realName: '', idNo: '' });

function openRealName() {
  realNameForm.realName = '';
  realNameForm.idNo = '';
  realNameVisible.value = true;
}

async function confirmRealName() {
  const name = realNameForm.realName.trim();
  const idNo = realNameForm.idNo.trim();
  if (name.length < 2 || name.length > 32) {
    show('真实姓名需为2-32个字', 'warning');
    return;
  }
  if (!/^\d{17}[\dXx]$/.test(idNo)) {
    show('请输入正确的18位身份证号', 'warning');
    return;
  }
  if (realNameSubmitting.value) return;
  realNameSubmitting.value = true;
  try {
    await clubAccountApi.realName({ realName: name, idNo });
    account.isRealNameVerified = true;
    realNameVisible.value = false;
    show('实名认证成功', 'success');
  } catch {
    // 后端错误（如 CONFLICT 已完成实名 / 身份证校验失败）已由 request.js toast
  } finally {
    realNameSubmitting.value = false;
  }
}

/**
 * 点击入口「提现」：先判断实名，未实名弹实名认证，再打开弹窗
 */
function openWithdrawModal() {
  if (!account.isRealNameVerified) {
    show('提现前请先完成实名认证', 'info');
    openRealName();
    return;
  }
  withdrawForm.amount = '';
  withdrawVisible.value = true;
}

function fillAllAmount() {
  withdrawForm.amount = Number(balance.value.deposit).toFixed(2);
}

// 当前是否在可提现时间段内：优先用后端 inWindow，缺失时按 windowStart/windowEnd 本地解析
function isInWithdrawTime() {
  if (depositRules.inWindow !== null && depositRules.inWindow !== undefined) {
    return depositRules.inWindow;
  }
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = String(depositRules.windowStart).split(':').map(Number);
  const [eh, em] = String(depositRules.windowEnd).split(':').map(Number);
  if (Number.isFinite(sh) && Number.isFinite(eh)) {
    const s = sh * 60 + (Number.isFinite(sm) ? sm : 0);
    const e = eh * 60 + (Number.isFinite(em) ? em : 0);
    return cur >= s && cur < e;
  }
  return true;
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
  // 0. 实名认证（提现前置，后端亦应校验）
  if (!account.isRealNameVerified) {
    showError('提现前请先完成实名认证');
    return;
  }
  // 1. 钱包冻结
  if (balance.value.walletFrozen) {
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
  if (amt > Number(balance.value.deposit)) {
    show('提现金额不能超过可提现余额', 'warning');
    return;
  }
  // 通过校验 → 二次确认
  confirmVisible.value = true;
}

// 生成幂等请求号（requestId）
function genRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function confirmWithdraw() {
  const amt = Number(withdrawForm.amount);
  withdrawing.value = true;
  try {
    await walletApi.withdraw({
      amount: amt,
      alipayAccount: account.alipayAccount,
      alipayName: account.alipayName,
      requestId: genRequestId(),
    });
    submittedToday.value += 1;
    confirmVisible.value = false;
    withdrawVisible.value = false;
    show('提现申请已提交', 'success');
    // 提现后刷新余额与流水
    fetchBalance();
    fetchFlowList();
  } catch (e) {
    // request.js 已统一 toast，弹窗保持打开，可修改后重试
  } finally {
    withdrawing.value = false;
  }
}

/* ---- 编辑支付宝账号弹窗（本地持久化兜底） ---- */
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
  localStorage.setItem(ALIPAY_ACCOUNT_KEY, account.alipayAccount);
  alipayEditVisible.value = false;
  show('支付宝账号已更新', 'success');
}
</script>

<template>
  <div class="my-deposit-page">
    <!-- ===== 顶部：我的押金卡片 ===== -->
    <div v-loading="loading" class="balance-card">
      <p class="balance-label">我的押金</p>
      <p class="balance-value">¥{{ Number(balance.deposit).toFixed(2) }}</p>
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
            v-model="filter.timeRange"
            type="daterange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD"
            :shortcuts="TIME_SHORTCUTS"
            :disabled-date="disableFutureDate"
            style="width: 260px"
            @change="handleSearch"
          />
          <el-button class="filter-reset-btn" @click="handleReset">重置</el-button>
        </div>
      </div>

      <!-- 明细表格（服务端分页；条件变更/翻页都会重新调接口） -->
      <DataTable
        v-loading="loading"
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
        <template #cell-orderNo="{ row }">
          <span v-if="row.orderNo">{{ row.orderNo }}</span>
          <span v-else class="muted-text">—</span>
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
          <span class="sub-text">可提现余额：¥{{ Number(balance.deposit).toFixed(2) }}</span>
        </div>
        <div class="form-row sub-row">
          <span class="sub-text">当天剩余提交次数：{{ remainTimes }}次</span>
        </div>

        <!-- 提现条件说明 -->
        <div class="rules-box">
          <p class="rules-title">提现条件：</p>
          <ol class="rules-list">
            <li>一天内，提交次数上限{{ depositRules.dailyLimit }}次</li>
            <li>可提现时间段：每日 {{ depositRules.windowStart }}-{{ depositRules.windowEnd }}</li>
            <li>需已退店满 14 天且钱包未冻结</li>
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
        <button class="btn btn-plain" type="button" :disabled="withdrawing" @click="confirmVisible = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="withdrawing" @click="confirmWithdraw">
          {{ withdrawing ? '提交中…' : '确定提现' }}
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

    <!-- ===== 实名认证弹窗（提现前置，POST /api/club/me/real-name） ===== -->
    <AppModal v-model="realNameVisible" title="实名认证" width="420px">
      <div class="real-name-form">
        <div class="form-row form-row-block">
          <span class="form-label">真实姓名</span>
          <el-input v-model="realNameForm.realName" placeholder="请输入真实姓名（2-32个字）" maxlength="32" />
        </div>
        <div class="form-row form-row-block">
          <span class="form-label">身份证号</span>
          <el-input v-model="realNameForm.idNo" placeholder="请输入18位身份证号" maxlength="18" />
        </div>
        <!-- <p class="real-name-tip">实名认证仅校验身份证格式，通过后即可提现；已认证后不可修改。</p> -->
      </div>
      <template #footer>
        <button class="btn btn-plain" type="button" @click="realNameVisible = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="realNameSubmitting" @click="confirmRealName">
          {{ realNameSubmitting ? '提交中...' : '提交认证' }}
        </button>
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

/* ===== 实名认证弹窗 ===== */
.real-name-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.real-name-tip {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.6;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
