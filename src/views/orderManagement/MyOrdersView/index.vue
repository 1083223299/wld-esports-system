<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppModal from '../../../components/AppModal.vue';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { useToast } from '../../../composables/useToast';
import { clubOrderApi } from '../../../api/modules/clubOrder';
import { ORDER_STATUS_OPTIONS, PLAYER_OPTIONS } from './mockData';

/**
 * 订单管理 > 我的订单（真实接口联调）
 * 数据源：GET /api/club/orders/mine（无 Query 参数，前端筛选分页）
 * - 筛选：订单号 / 状态 / 俱乐部接单时间
 * - 表格：订单号(复制+悬浮下单用户) / 金额 / 项目 / 游戏名称 / 客户端 / 游戏规格 /
 *         角色名 / 订单状态(含售后中·冻结·部分退款标签) / 审核状态(主·子订单查看关系) /
 *         派单客服 / 俱乐部接单时间 / 操作
 * - 操作按钮规则：
 *   ① 冻结 / 售后中标签 → 无加减价、无转单、无提交验收，仅「查看」
 *   ② 已指派打手（转单等价） → 隐藏加减价按钮
 *   ③ 部分退款 → 隐藏加减价按钮（涉部分退款，加减价失效）
 *   ④ 审核已驳回 → 隐藏转单按钮；审核未提交/已驳回可提交验收
 * - 接口未返回的展示字段（游戏名/规格/客户端/角色名/接单时间/日志/凭证/分润明细等）：
 *   映射层保留字段占位，后端补充后自动展示，缺失时模板优雅降级
 * - 弹窗：订单详情 / 加减价 / 转单（按名额指派打手）/ 提交验收 / 查看关系
 * - 通知跳转：系统通知点击「查看」会带 orderNo 跳到本页，自动填入搜索框并筛选；
 *   特殊场景：查询不到该订单时提示「订单不存在」
 */
const { show } = useToast();
const route = useRoute();

/* ================= 筛选 ================= */
const filter = reactive({ orderNo: '', status: '', acceptTimeRange: [] });

const searchFields = [
  { prop: 'orderNo', label: '订单号', type: 'input', placeholder: '请输入订单号' },
  {
    prop: 'status', label: '状态', type: 'select', placeholder: '请选择状态',
    options: [{ label: '全部', value: '' }, ...ORDER_STATUS_OPTIONS],
  },
  {
    prop: 'acceptTimeRange', label: '俱乐部接单时间', type: 'daterange',
    startPlaceholder: '开始时间', endPlaceholder: '结束时间', allowFutureDate: true,
  },
];

function handleSearch(values) {
  Object.assign(filter, values);
  page.value = 1;
}
function handleReset() {
  filter.orderNo = '';
  filter.status = '';
  filter.acceptTimeRange = [];
  page.value = 1;
}

/* ================= 状态映射（后端枚举 → 页面枚举） ================= */
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

/* ================= 通知跳转：自动按订单号搜索 ================= */
// 系统通知点击「查看」时带 orderNo 跳到本页：自动填入搜索框并筛选；
// 特殊场景：查询不到该订单时提示「订单不存在」（需求图约定）
// 接口为异步加载，数据就绪（loadedOnce）后再判定订单是否存在
function applyOrderNoFromUrl() {
  const q = String(route.query.orderNo || '').trim();
  if (!q) return;
  filter.orderNo = q;
  page.value = 1;
  if (loadedOnce.value && !filteredRows.value.length) {
    show(`订单不存在：${q}`, 'warning');
  }
}
onMounted(loadOrders);
// 同页多次从通知跳转（带不同订单号）时响应更新
watch(() => route.query.orderNo, applyOrderNoFromUrl);

/* ================= 表格数据 ================= */
const columns = [
  { key: 'orderNo', title: '订单号' },
  { key: 'amount', title: '金额（元）' },
  { key: 'product', title: '项目' },
  { key: 'gameName', title: '游戏名称' },
  { key: 'clientType', title: '客户端' },
  { key: 'spec', title: '游戏规格' },
  { key: 'roleName', title: '角色名' },
  { key: 'orderStatus', title: '订单状态' },
  { key: 'auditStatus', title: '审核状态' },
  { key: 'assignService', title: '派单客服' },
  { key: 'clubAcceptTime', title: '俱乐部接单时间' },
  { key: 'actions', title: '操作' },
];

const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const loadedOnce = ref(false);
const orders = ref([]);

const STATUS_TEXT = { pending: '待接单', processing: '进行中', completed: '已完成', closed: '交易关闭' };

/* ===== 后端订单字段 → 页面行映射 =====
 * 接口未返回游戏名/规格/客户端/角色名/接单时间/日志/凭证/分润明细等展示字段，
 * 映射层保留对应字段（后端补充后可自动展示），缺失时模板侧优雅降级。
 */
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
    clubAcceptTime: o.clubAcceptTime || '', // 接口暂未返回，预留
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
    relation: { main: o.orderNo || '', subs: [o.orderNo || ''] }, // 由 buildRelation 聚类覆盖
    isMain: false, // 由 buildRelation 聚类覆盖
  };
}

/* ===== 主/子订单与查看关系 =====
 * 接口未返回关系字段，按订单号聚类推断：同订单号多于一个时，
 * 第一个为主订单（审核列展示「主订单 查看关系」），其余为子订单；
 * 订单号唯一时视为无主/子概念，审核列正常展示状态文字。
 */
function buildRelation(list) {
  const groups = new Map();
  list.forEach((row) => {
    const key = String(row.orderNo || '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return list.map((row) => {
    const group = groups.get(String(row.orderNo || '')) || [row];
    const isMain = group.length > 1 && group[0].id === row.id;
    return {
      ...row,
      isMain,
      relation: { main: group[0].orderNo, subs: group.map((g) => g.orderNo) },
    };
  });
}

const filteredRows = computed(() =>
  orders.value.filter((row) => {
    const noMatch = !filter.orderNo || row.orderNo.includes(String(filter.orderNo).trim());
    const statusMatch = !filter.status || row.orderStatus === filter.status;
    let timeMatch = true;
    if (Array.isArray(filter.acceptTimeRange) && filter.acceptTimeRange.length === 2 && filter.acceptTimeRange[0]) {
      const start = new Date(String(filter.acceptTimeRange[0]).replace(/-/g, '/')).getTime();
      const end = new Date(String(filter.acceptTimeRange[1]).replace(/-/g, '/')).getTime() + 24 * 3600 * 1000 - 1000;
      // 接口暂未返回接单时间时，时间筛选对该行不生效（字段补齐后自动恢复）
      const t = row.clubAcceptTime ? new Date(String(row.clubAcceptTime).replace(/-/g, '/')).getTime() : NaN;
      timeMatch = t >= start && t <= end;
    }
    return noMatch && statusMatch && timeMatch;
  }),
);

const total = computed(() => filteredRows.value.length);
const rows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

/* ===== 拉取我的订单列表（无 Query 参数，返回订单数组） ===== */
async function loadOrders() {
  loading.value = true;
  try {
    const list = await clubOrderApi.myOrders();
    orders.value = Array.isArray(list) ? buildRelation(list.map(mapOrder)) : [];
    loadedOnce.value = true;
    applyOrderNoFromUrl();
  } catch {
    // 错误提示已由 request.js 统一 toast
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

/* ================= 操作按钮显隐规则 ================= */
const hasAbnormalTag = (row) => row.tags.includes('冻结') || row.tags.includes('售后中');
// 加减价：待接单 + 未指派打手（转单等价） + 无冻结/售后/部分退款
const canAdjust = (row) =>
  row.orderStatus === 'pending' &&
  row.assignedPlayerCount === 0 &&
  !hasAbnormalTag(row) &&
  !row.partialRefunded;
// 转单（按名额指派打手）：进行中 + 无冻结/售后标签 + 未审核驳回
const canTransfer = (row) =>
  row.orderStatus === 'processing' && !hasAbnormalTag(row) && row.auditStatus !== 'rejected';
// 提交验收：进行中 + 无冻结/售后 + 审核未提交或已驳回（可重新提交）
const canSubmit = (row) =>
  row.orderStatus === 'processing' &&
  !hasAbnormalTag(row) &&
  (row.auditStatus === 'none' || row.auditStatus === 'rejected');

/* ================= 复制订单号 ================= */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    show('订单号已复制', 'success');
  } catch {
    const input = document.createElement('input');
    input.value = String(text);
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    show('订单号已复制', 'success');
  }
}

/* ================= 详情弹窗 ================= */
const detailVisible = ref(false);
const currentRow = ref(null);
const detailLoading = ref(false);

function openDetail(row) {
  if (detailLoading.value) return;
  detailLoading.value = true;
  clubOrderApi
    .detail(row.id)
    .then((data) => {
      currentRow.value = mapOrder(data);
      detailVisible.value = true;
    })
    .catch(() => {
      // 后端错误（如订单不存在）已由 request.js toast
    })
    .finally(() => {
      detailLoading.value = false;
    });
}

/* ===== 详情弹窗各区块显隐判断（对照字段说明表） ===== */
// 存单信息：三角洲且有保底数据 → 完整展示；否则非三角洲有存单备注才展示备注行；都没有则整个区块隐藏
const showDepositFull = computed(() => {
  const r = currentRow.value;
  return !!r && r.isDelta && Number(r.deposit.targetW) > 0;
});
const showDepositNote = computed(() => {
  const r = currentRow.value;
  return !!r && !r.isDelta && !!r.deposit.note;
});
// 完成凭证：打手上传后回显；无上传数据则展示"暂无数据"
const hasVouchers = computed(() => {
  const r = currentRow.value;
  return !!r && (r.vouchers.first.length || r.vouchers.last.length || r.vouchers.process.length);
});

/* ================= 加减价弹窗 ================= */
const adjustVisible = ref(false);
const adjustSubmitting = ref(false);
const adjustForm = reactive({ type: 'add', amount: '' });

function openAdjust(row) {
  currentRow.value = row;
  adjustForm.type = 'add';
  adjustForm.amount = '';
  adjustVisible.value = true;
}
async function confirmAdjust() {
  const amt = Number(adjustForm.amount);
  if (!adjustForm.amount || Number.isNaN(amt) || amt <= 0) {
    show('请输入正确的金额', 'warning');
    return;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(adjustForm.amount.trim())) {
    show('金额最多保留两位小数', 'warning');
    return;
  }
  if (adjustSubmitting.value) return;
  adjustSubmitting.value = true;
  try {
    await clubOrderApi.clubAdjust(currentRow.value.id, {
      direction: adjustForm.type === 'add' ? 'INCREASE' : 'DECREASE',
      amount: amt,
    });
    adjustVisible.value = false;
    show(`${adjustForm.type === 'add' ? '加价' : '减价'} ¥${amt.toFixed(2)} 已提交`, 'success');
    await loadOrders();
  } catch {
    // 后端错误已由 request.js toast
  } finally {
    adjustSubmitting.value = false;
  }
}

/* ================= 转单弹窗（按名额指派打手） ================= */
const transferVisible = ref(false);
const transferSubmitting = ref(false);
const transferForm = reactive({ player1: '', player2: '' });

function openTransfer(row) {
  currentRow.value = row;
  transferForm.player1 = '';
  transferForm.player2 = '';
  transferVisible.value = true;
}
async function confirmTransfer() {
  if (!transferForm.player1) {
    show('请选择打手1', 'warning');
    return;
  }
  if (currentRow.value.requiredCount > 1 && !transferForm.player2) {
    show('请选择打手2', 'warning');
    return;
  }
  if (transferSubmitting.value) return;
  transferSubmitting.value = true;
  try {
    const slots = [{ slotNo: 1, playerId: Number(transferForm.player1) }];
    if (transferForm.player2) {
      slots.push({ slotNo: 2, playerId: Number(transferForm.player2) });
    }
    await clubOrderApi.assign(currentRow.value.id, slots);
    transferVisible.value = false;
    show('转单成功，打手默认接受', 'success');
    await loadOrders();
  } catch {
    // 后端错误已由 request.js toast
  } finally {
    transferSubmitting.value = false;
  }
}

/* ================= 提交验收弹窗 ================= */
const submitVisible = ref(false);
const submitSubmitting = ref(false);
const submitRemark = ref('');

function openSubmit(row) {
  currentRow.value = row;
  submitRemark.value = '';
  submitVisible.value = true;
}
async function confirmSubmit() {
  if (submitSubmitting.value) return;
  submitSubmitting.value = true;
  try {
    await clubOrderApi.submit(currentRow.value.id, submitRemark.value.trim());
    submitVisible.value = false;
    show('验收已提交', 'success');
    await loadOrders();
  } catch {
    // 后端错误已由 request.js toast
  } finally {
    submitSubmitting.value = false;
  }
}

/* ================= 查看关系弹窗 ================= */
const relationVisible = ref(false);
function openRelation(row) {
  currentRow.value = row;
  relationVisible.value = true;
}
</script>

<template>
  <div class="my-orders-page list-page">
    <!-- 搜索区 -->
    <SearchComponent
      :fields="searchFields"
      :initial-values="filter"
      :row-columns="3"
      :labelWidth="120"
      :confirm-reset="false"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 订单表格 -->
    <DataTable v-loading="loading" :columns="columns" :data="rows" :total="total" :page="page" :page-size="pageSize" @page-change="(p) => (page = p)">
      <!-- 订单号：复制图标 + 悬浮下单用户 -->
      <template #cell-orderNo="{ row }">
        <el-tooltip v-if="row.customerTip" :content="row.customerTip" placement="top">
          <span class="order-no-cell">
            {{ row.orderNo }}
            <i class="copy-icon" title="复制订单号" @click="copyText(row.orderNo)" />
          </span>
        </el-tooltip>
        <span v-else class="order-no-cell">
          {{ row.orderNo }}
          <i class="copy-icon" title="复制订单号" @click="copyText(row.orderNo)" />
        </span>
      </template>

      <!-- 金额 -->
      <template #cell-amount="{ row }">
        <span class="amount-text">{{ Number(row.amount).toFixed(2) }}</span>
      </template>

      <!-- 项目 -->
      <template #cell-product="{ row }">
        <span class="product-text" :title="row.product">{{ row.product }}</span>
      </template>

      <!-- 客户端 -->
      <template #cell-clientType="{ row }">
        <span>{{ row.clientType.join('、') }}</span>
      </template>

      <!-- 订单状态：状态文字 + 异常标签 -->
      <template #cell-orderStatus="{ row }">
        <div class="status-cell">
          <span class="order-status" :class="`os-${row.orderStatus}`">
            {{ STATUS_TEXT[row.orderStatus] || row.orderStatus }}<template v-if="row.orderStatus === 'pending'">({{ row.claimedCount }}/{{ row.requiredCount }})</template>
          </span>
          <span v-for="t in row.tags" :key="t" class="status-tag" :class="`tag-${t}`">{{ t }}</span>
        </div>
      </template>

      <!-- 审核状态：状态文字 + 主/子订单 查看关系 -->
      <template #cell-auditStatus="{ row }">
        <div class="audit-cell">
          <span v-if="row.isMain" class="audit-text">—</span>
          <span v-else-if="row.auditStatus === 'none'" class="audit-text">未提交</span>
          <span v-else-if="row.auditStatus === 'pending'" class="audit-text">待审核</span>
          <span v-else-if="row.auditStatus === 'rejected'" class="audit-text audit-rejected">已驳回</span>
          <a class="relation-link" @click="openRelation(row)">{{ row.isMain ? '主订单' : '子订单' }} 查看关系</a>
        </div>
      </template>

      <!-- 操作 -->
      <template #cell-actions="{ row }">
        <div class="action-cell">
          <a class="op-link" @click="openDetail(row)">查看</a>
          <a v-if="canAdjust(row)" class="op-link" @click="openAdjust(row)">加减价</a>
          <a v-if="canTransfer(row)" class="op-link" @click="openTransfer(row)">转单</a>
          <a v-if="canSubmit(row)" class="op-link" @click="openSubmit(row)">提交验收</a>
        </div>
      </template>
    </DataTable>

    <!-- ================= 订单详情弹窗 ================= -->
    <AppModal v-model="detailVisible" title="查看" width="760px">
      <div v-if="currentRow" class="detail-box">
        <p class="detail-lead">派单客服：{{ currentRow.assignService }}</p>

        <!-- 订单信息 -->
        <section class="detail-section">
          <h4 class="section-title">订单信息</h4>
          <div class="order-no-line">
            订单号：{{ currentRow.orderNo }}
            <i class="copy-icon" title="复制订单号" @click="copyText(currentRow.orderNo)" />
          </div>
          <div class="info-grid">
            <div class="info-item"><label>游戏规格</label><span>{{ currentRow.spec || '—' }}</span></div>
            <div class="info-item"><label>购买项目</label><span>{{ currentRow.product }}</span></div>
            <div class="info-item"><label>客户端</label><span>{{ currentRow.clientType.join('、') }}</span></div>
            <div class="info-item"><label>订单状态</label><span>{{ STATUS_TEXT[currentRow.orderStatus] || currentRow.orderStatus }}</span></div>
            <div class="info-item"><label>打手人数</label><span>{{ currentRow.claimedCount }}/{{ currentRow.requiredCount }}</span></div>
            <div class="info-item"><label>角色名</label><span>{{ currentRow.roleName }}</span></div>
            <!-- 组队码：无则不展示 -->
            <div v-if="currentRow.teamCode" class="info-item"><label>组队码</label><span>{{ currentRow.teamCode }}</span></div>
            <!-- 订单金额口径：非订单总金额，而是俱乐部分润金额+加减价后的真实金额 -->
            <div class="info-item"><label>订单金额(元)</label><span>{{ currentRow.profit.clubShare }}</span></div>
            <div class="info-item"><label>创建时间</label><span>{{ currentRow.createTime }}</span></div>
            <div class="info-item"><label>俱乐部接单时间</label><span>{{ currentRow.clubAcceptTime }}</span></div>
          </div>
        </section>

        <!-- 存单信息：无信息则整个区块不展示；三角洲展示完整字段；非三角洲仅展示存单备注 -->
        <section v-if="showDepositFull || showDepositNote" class="detail-section">
          <h4 class="section-title">存单信息</h4>
          <template v-if="showDepositFull">
            <div class="info-grid">
              <div class="info-item"><label>保底目标(W)</label><span>{{ currentRow.deposit.targetW }}</span></div>
              <div class="info-item"><label>存单原因</label><span>{{ currentRow.deposit.reason || '—' }}</span></div>
              <div class="info-item"><label>第一把(W)</label><span>{{ currentRow.deposit.firstW }}</span></div>
              <div class="info-item"><label>第一把(W)</label><span>{{ currentRow.deposit.secondW }}</span></div>
            </div>
            <div class="upload-empty">
              <div class="upload-box"><i class="upload-icon" /></div>
              <p class="upload-text">剩余保底截图</p>
            </div>
          </template>
          <div v-else class="info-item"><label>存单备注</label><span>{{ currentRow.deposit.note }}</span></div>
        </section>

        <!-- 打手信息 -->
        <section class="detail-section">
          <h4 class="section-title">打手信息</h4>
          <div v-if="currentRow.players.length" class="player-grid">
            <div v-for="(p, i) in currentRow.players" :key="i" class="player-card">
              <p class="player-name">{{ p.name }}（{{ p.id }}）</p>
              <p class="player-club">{{ p.club }}</p>
              <p class="player-time">{{ p.acceptTime ? `接单时间：${p.acceptTime}` : `转单时间：${p.transferTime}` }}</p>
            </div>
          </div>
          <p v-else class="empty-text">接单后有值</p>
        </section>

        <!-- 分润信息：俱乐部分润/打手分润必填始终展示；俱乐部加价/减价有记录才展示 -->
        <section class="detail-section">
          <h4 class="section-title">分润信息</h4>
          <div v-if="currentRow.profit.adjustText" class="profit-line">
            俱乐部加价/减价：<span :class="{ 'text-muted': currentRow.profit.adjustInvalid }">{{ currentRow.profit.adjustText }}</span>
          </div>
          <div class="profit-line">俱乐部分润(元)：{{ currentRow.profit.clubShare }}</div>
          <div class="profit-line">打手分润(元)：{{ currentRow.profit.playerShareText }}</div>
        </section>

        <!-- 订单日志 -->
        <section class="detail-section">
          <h4 class="section-title">订单日志</h4>
          <ul v-if="currentRow.logs.length" class="log-timeline">
            <li v-for="(log, i) in currentRow.logs" :key="i" class="log-item">
              <span class="log-dot" :class="i === currentRow.logs.length - 1 ? 'dot-done' : ''" />
              <div class="log-content">
                <p class="log-time">{{ log.time }}</p>
                <p class="log-text">{{ log.text }}<template v-if="log.operator">（{{ log.operator }}）</template></p>
              </div>
            </li>
          </ul>
        </section>

        <!-- 完成凭证：打手上传后回显首图/尾图/进程图；无上传数据则"暂无数据" -->
        <section class="detail-section">
          <h4 class="section-title">完成凭证</h4>
          <template v-if="hasVouchers">
            <div class="voucher-row">
              <div class="upload-empty">
                <div class="upload-box"><i class="upload-icon" /></div>
                <p class="upload-text">首图 · {{ currentRow.voucherTime || '2026-10-09 11:22:33' }} 上传</p>
              </div>
              <div class="upload-empty">
                <div class="upload-box"><i class="upload-icon" /></div>
                <p class="upload-text">尾图 · {{ currentRow.voucherTime || '2026-10-09 11:22:33' }} 上传</p>
              </div>
            </div>
            <div class="voucher-row voucher-row-3">
              <div v-for="(p, i) in currentRow.vouchers.process" :key="i" class="upload-empty">
                <div class="upload-box"><i class="upload-icon" /></div>
                <p class="upload-text">进程图{{ i + 1 }} · {{ currentRow.voucherTime || '2026-10-09 11:22:33' }} 上传</p>
              </div>
            </div>
          </template>
          <p v-else class="empty-text">暂无数据</p>
          <!-- 打手备注：打手上传后回显；驳回原因：进行中已驳回时展示 -->
          <div v-if="currentRow.playerRemark" class="profit-line">打手备注：{{ currentRow.playerRemark }}</div>
          <div v-if="currentRow.rejectReason" class="profit-line reject">驳回原因：{{ currentRow.rejectReason }}</div>
        </section>

        <!-- 订单备注 -->
        <section class="detail-section">
          <h4 class="section-title">订单备注</h4>
          <p class="empty-text">{{ currentRow.orderRemark || '暂无数据' }}</p>
        </section>
      </div>
      <template #footer>
        <button class="btn btn-primary" type="button" @click="detailVisible = false">确定</button>
        <button class="btn btn-plain" type="button" @click="detailVisible = false">取消</button>
      </template>
    </AppModal>

    <!-- ================= 加减价弹窗 ================= -->
    <AppModal v-model="adjustVisible" title="加减价" width="420px">
      <el-form label-position="top">
        <el-form-item label="选择加减价">
          <el-radio-group v-model="adjustForm.type">
            <el-radio value="add">加价</el-radio>
            <el-radio value="sub">减价</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额(元)" required>
          <el-input v-model="adjustForm.amount" placeholder="请输入金额" type="number" />
        </el-form-item>
        <!-- <p class="form-tip">加：最多为俱乐部真实收益值；减：最多为打手真实收益值；仅支持输入正数，最多保留两位小数</p> -->
      </el-form>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="adjustSubmitting" @click="confirmAdjust">{{ adjustSubmitting ? '提交中…' : '确定' }}</button>
        <button class="btn btn-plain" type="button" @click="adjustVisible = false">取消</button>
      </template>
    </AppModal>

    <!-- ================= 转单弹窗 ================= -->
    <AppModal v-model="transferVisible" title="转单" width="420px">
      <el-form label-position="top">
        <el-form-item label="接单人数">
          <span class="plain-text">{{ currentRow?.requiredCount }}人</span>
        </el-form-item>
        <el-form-item label="打手1" required>
          <el-select v-model="transferForm.player1" placeholder="请选择打手" style="width: 100%">
            <el-option v-for="p in PLAYER_OPTIONS" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="currentRow && currentRow.requiredCount > 1" label="打手2" required>
          <el-select v-model="transferForm.player2" placeholder="请选择打手" style="width: 100%">
            <el-option v-for="p in PLAYER_OPTIONS" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <p class="form-tip">即可选择旗下打手，转完后打手默认接受</p>
      </el-form>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="transferSubmitting" @click="confirmTransfer">{{ transferSubmitting ? '提交中…' : '确定' }}</button>
        <button class="btn btn-plain" type="button" @click="transferVisible = false">取消</button>
      </template>
    </AppModal>

    <!-- ================= 提交验收弹窗 ================= -->
    <AppModal v-model="submitVisible" title="提交验收" width="420px">
      <el-form label-position="top">
        <el-form-item label="订单号">
          <span class="plain-text">{{ currentRow?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="submitRemark"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请输入验收备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="submitSubmitting" @click="confirmSubmit">{{ submitSubmitting ? '提交中…' : '确定' }}</button>
        <button class="btn btn-plain" type="button" @click="submitVisible = false">取消</button>
      </template>
    </AppModal>

    <!-- ================= 查看关系弹窗 ================= -->
    <AppModal v-model="relationVisible" title="查看关系" width="380px">
      <div v-if="currentRow" class="relation-box">
        <div class="relation-row">
          <span class="relation-label">主订单</span>
          <span class="relation-no">
            {{ currentRow.relation.main }}
            <i class="copy-icon" @click="copyText(currentRow.relation.main)" />
          </span>
        </div>
        <div v-for="(sub, i) in currentRow.relation.subs" :key="i" class="relation-row">
          <span class="relation-label">{{ i === 0 ? '子订单' : '' }}</span>
          <span class="relation-no">
            {{ sub }}
            <i class="copy-icon" @click="copyText(sub)" />
          </span>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-primary" type="button" @click="relationVisible = false">确定</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
/* 配合全局 .list-page：撑满内容区高度，表格区自适应剩余高度、内部滚动 */
.my-orders-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 搜索区与表格之间的间距 */
.my-orders-page :deep(.search-form-container) {
  margin-bottom: 16px;
}

/* ===== 表格单元格 ===== */
.order-no-cell {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.copy-icon {
  display: inline-block;
  width: 13px;
  height: 14px;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23333' d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'/%3E%3C/svg%3E") no-repeat center / contain;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23333' d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'/%3E%3C/svg%3E") no-repeat center / contain;
  opacity: 0.55;
  flex-shrink: 0;
}

.copy-icon:hover {
  opacity: 1;
}

.amount-text {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.product-text {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 订单状态 */
.status-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.order-status {
  font-size: 13px;
  font-weight: 600;
}

.os-pending { color: var(--status-warning); }
.os-processing { color: var(--status-warning); }
.os-completed { color: var(--status-success); }
.os-closed { color: var(--status-muted); }

.status-tag {
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.7;
}

.tag-售后中 { color: var(--status-danger); background: var(--status-danger-bg); }
.tag-冻结 { color: var(--status-info); background: var(--status-info-bg); }
.tag-部分退款 { color: var(--status-danger); background: var(--status-danger-bg); }

/* 审核状态 */
.audit-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.audit-rejected { color: var(--status-danger); }

.relation-link {
  color: var(--primary);
  cursor: pointer;
  font-size: 12.5px;
}

.relation-link:hover {
  text-decoration: underline;
}

/* 操作 */
.action-cell {
  display: flex;
  gap: 10px;
  white-space: nowrap;
}

.op-link {
  color: var(--primary);
  cursor: pointer;
  font-size: 13px;
}

.op-link:hover {
  text-decoration: underline;
}

/* ===== 详情弹窗 ===== */
.detail-lead {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--text-main);
}

.detail-section {
  margin-bottom: 20px;
}

.section-title {
  position: relative;
  margin: 0 0 12px;
  padding-left: 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 4px;
  border-radius: 2px;
  background: var(--primary);
}

.order-no-line {
  margin-bottom: 12px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
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
  color: var(--text-sub);
  min-width: 76px;
}

.upload-empty {
  margin-top: 12px;
}

.voucher-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.voucher-row-3 {
  grid-template-columns: repeat(3, 1fr);
}

.upload-box {
  height: 90px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    45deg,
    var(--status-muted),
    var(--status-muted) 3px,
    var(--border) 3px,
    var(--border) 6px
  );
  opacity: 0.6;
}

.upload-text {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-sub);
}

.player-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.player-card {
  background: var(--bg-hover);
  border-radius: 10px;
  padding: 12px 14px;
}

.player-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.player-club,
.player-time {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-sub);
}

.profit-line {
  font-size: 13px;
  line-height: 2;
}

.text-muted {
  color: var(--text-sub);
}

.reject {
  color: var(--status-danger);
}

.empty-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-sub);
}

/* 订单日志时间线 */
.log-timeline {
  list-style: none;
  margin: 0;
  padding: 0 0 0 6px;
}

.log-item {
  position: relative;
  padding: 0 0 16px 18px;
  border-left: 2px solid var(--border);
}

.log-item:last-child {
  padding-bottom: 0;
}

.log-dot {
  position: absolute;
  left: -6px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--status-muted);
  border: 2px solid var(--bg-card);
}

.log-dot.dot-done {
  background: var(--status-success);
}

.log-time {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
}

.log-text {
  margin: 2px 0 0;
  font-size: 13px;
}

/* ===== 加减价/转单/关系弹窗 ===== */
.form-tip {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.6;
}

.plain-text {
  font-size: 14px;
}

.relation-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.relation-row {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}

.relation-label {
  width: 56px;
  color: var(--text-sub);
}

.relation-no {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

/* ===== 按钮 ===== */
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

.btn-primary:hover {
  filter: brightness(1.06);
}

.btn-plain {
  background: var(--bg-hover);
  color: var(--text-main);
}

.btn-plain:hover {
  background: var(--border-faint);
}
</style>
