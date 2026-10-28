<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppModal from '../../../components/AppModal.vue';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { useToast } from '../../../composables/useToast';
import { clubOrderApi } from '../../../api/modules/clubOrder';
import { playerApi } from '../../../api/modules/player';
import { PLAYER_OPTIONS } from './mockData';

/**
 * 订单管理 > 我的订单（真实接口联调）
 * 数据源：GET /api/club/orders/mine（服务端分页：tab/keyword/sort/order/page/pageSize）
 * - 筛选：订单号（keyword，匹配订单号或订单 ID）/ 状态（tab：ALL/ONGOING 含待接单+进行中/DONE/CLOSED）/
 *         俱乐部接单时间（takenFrom/takenTo，后端已提供，2026-10-26 确认）
 * - 表格：订单号(复制+悬浮下单用户) / 金额 / 项目 / 游戏名称 / 客户端 / 游戏规格 /
 *         角色名 / 订单状态(含售后中·冻结·部分退款标签) / 审核状态(主·子订单查看关系) /
 *         派单客服 / 俱乐部接单时间 / 操作
 * - 操作按钮规则：
 *   ① 冻结 / 售后中标签 → 无加减价、无转单、无提交验收，仅「查看」
 *   ② 已指派打手（转单等价） → 隐藏加减价按钮
 *   ③ 部分退款 → 隐藏加减价按钮（涉部分退款，加减价失效）
 *   ④ 审核已驳回 → 隐藏转单按钮；审核未提交/已驳回可提交验收
 * - 接口说明「进行中且已驳回」不会排最前，页面如需该顺序由前端自己排（当前页内置顶）
 * - 接口未返回的展示字段（游戏名/规格/客户端/角色名/接单时间/日志/凭证/分润明细等）：
 *   映射层保留字段占位，后端补充后自动展示，缺失时模板优雅降级
 * - 弹窗：订单详情 / 加减价 / 转单（按名额指派打手）/ 提交验收 / 查看关系
 * - 通知跳转：系统通知点击「查看」会带 orderNo 跳到本页，自动填入搜索框并筛选；
 *   特殊场景：查询不到该订单时提示「订单不存在」
 */
const { show } = useToast();
const route = useRoute();
const router = useRouter();

/* ================= 筛选 ================= */
const filter = reactive({ orderNo: '', status: '', acceptTimeRange: [] });

/** 页面状态 → 接口 tab：接口无单独「待接单」，ONGOING 已含 WAIT_TAKE+IN_PROGRESS */
const STATUS_TAB_OPTIONS = [
  { label: '进行中（含待接单）', value: 'ONGOING' },
  { label: '已完成', value: 'DONE' },
  { label: '交易关闭', value: 'CLOSED' },
];

const searchFields = [
  { prop: 'orderNo', label: '订单号', type: 'input', placeholder: '请输入订单号' },
  {
    prop: 'status', label: '状态', type: 'select', placeholder: '请选择状态',
    options: [{ label: '全部', value: '' }, ...STATUS_TAB_OPTIONS],
  },
  {
    prop: 'acceptTimeRange', label: '俱乐部接单时间', type: 'daterange',
    startPlaceholder: '开始时间', endPlaceholder: '结束时间', allowFutureDate: true,
  },
];

function handleSearch(values) {
  Object.assign(filter, values);
  page.value = 1;
  loadOrders();
}

// 字段被清除/选择时同步查询条件（SearchComponent @change；仅同步、不触发查询，见组件注释）
function handleFilterChange(values) {
  Object.assign(filter, values);
}
async function handleReset() {
  filter.orderNo = '';
  filter.status = '';
  filter.acceptTimeRange = [];
  page.value = 1;
  const query = { ...route.query };
  delete query.orderNo;
  delete query.orderId;
  delete query.openDetail;
  await router.replace({ query });
  await loadOrders();
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

/* ================= 通知跳转 ================= */
// 系统通知点击「查看」分两种：
//   A. 带 openDetail=1（jumpTarget=ORDER）：锁定订单号 → 服务端按 keyword 搜索定位 → 自动打开查看弹窗；
//      找不到提示「订单不存在」（需求图约定）；弹窗关闭后列表即该订单的搜索结果，可继续做加减价/转单等操作
//   B. 仅带 orderNo（平台派单/转单/关闭等旧规则）：填入搜索框初始值（用户手动点搜索）
// 失效订单兜底：列表按状态 Tab 展示，ALL 可能不含「交易关闭」等失效订单——搜索定位时依次尝试
// ALL → CLOSED → DONE → ONGOING，任一命中即停（覆盖失效订单跳转）；
// 全部未命中时再用详情接口直接打开（orderId 兜底，列表搜不到但订单存在也能看详情）；两者都不行才提示不存在
let autoOpenNo = '';
let autoOpenId = '';
const NOTIFY_SEARCH_TABS = ['ALL', 'CLOSED', 'DONE', 'ONGOING'];
function applyNotifyQuery() {
  const open = String(route.query.openDetail || '') === '1';
  autoOpenNo = open ? String(route.query.orderNo || '').trim() : '';
  autoOpenId = open ? String(route.query.orderId || '').trim() : '';
}
async function runNotifyOpen() {
  if (!autoOpenNo && !autoOpenId) return;
  const no = autoOpenNo;
  const id = autoOpenId;
  autoOpenNo = '';
  autoOpenId = ''; // 一次性：避免同参数重复触发
  filter.orderNo = no;
  page.value = 1;
  for (const tab of NOTIFY_SEARCH_TABS) {
    try {
      const res = await clubOrderApi.myOrders({
        tab,
        keyword: no,
        takenFrom: '',
        takenTo: '',
        page: 1,
        pageSize: Math.max(pageSize.value, 10),
      });
      const list = res && Array.isArray(res.list) ? res.list : [];
      const hits = buildRelation(list.map(mapOrder));
      const hit = hits.find((r) => String(r.orderNo) === no);
      if (hit) {
        // 命中：列表切换为该订单搜索结果（保持当前 Tab 展示），并自动打开查看弹窗
        orders.value = hits;
        total.value = Number(res?.total) || 0;
        openDetail(hit);
        return;
      }
    } catch {
      // 单个 Tab 请求失败不中断，继续尝试下一状态；错误提示已由 request.js toast
    }
  }
  // 列表全部状态均未命中：用详情接口兜底打开（列表外订单也能看详情）
  if (id) {
    try {
      const data = await clubOrderApi.detail(id);
      if (data && (data.id || data.orderNo)) {
        const mapped = mapOrder(data);
        currentRow.value = mapped;
        detailVisible.value = true;
        show('该订单不在列表中，已为你打开详情', 'info');
        filter.orderNo = '';
        await loadOrders(); // 列表恢复全量
        return;
      }
    } catch {
      // 详情接口也失败 → 落「订单不存在」提示
    }
  }
  show(`订单不存在：${no || id}`, 'warning');
  filter.orderNo = '';
  await loadOrders();
}

function applyOrderNoFromUrl() {
  const q = String(route.query.orderNo || '').trim();
  if (!q) return;
  filter.orderNo = q;
  page.value = 1;
  if (loadedOnce.value && !orders.value.length) {
    show(`订单不存在：${q}`, 'warning');
  }
}
onMounted(async () => {
  applyNotifyQuery();
  await loadOrders();
  await runNotifyOpen();
});
// 同页多次从通知跳转（带不同订单号/openDetail）时响应更新
watch(
  () => [route.query.orderNo, route.query.openDetail],
  async () => {
    applyNotifyQuery();
    await runNotifyOpen();
  }
);

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
    transferred: Number(o.transferred) === 1 || !!o.transfer, // 已转单（批注①：已转单不展示转单按钮；字段名待后端确认，兼容 transfer）
    assignService: o.ownerName || '', // 归属名 = 派单客服
    clubAcceptTime: o.takenAt || o.clubAcceptTime || '', // 俱乐部接单时间 = 接口 takenAt（sort 枚举含 takenAt；兼容旧字段 clubAcceptTime）
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

/* ===== 服务端分页：rows 直接用接口返回的当前页 list；「进行中且已驳回」当前页内置顶 ===== */
const rows = computed(() => {
  const list = [...orders.value];
  list.sort((a, b) => {
    const aRej = a.orderStatus === 'processing' && a.auditStatus === 'rejected' ? 0 : 1;
    const bRej = b.orderStatus === 'processing' && b.auditStatus === 'rejected' ? 0 : 1;
    return aRej - bRej;
  });
  return list;
});

const total = ref(0);

/* ===== 拉取我的订单列表（服务端分页：tab/keyword/takenFrom/takenTo/page/pageSize） ===== */
async function loadOrders() {
  loading.value = true;
  try {
    const res = await clubOrderApi.myOrders({
      tab: filter.status || 'ALL',
      keyword: filter.orderNo?.trim(),
      // 原型「俱乐部接单时间」筛选 → 后端 takenFrom/takenTo（YYYY-MM-DD，SearchComponent daterange 输出）
      takenFrom: Array.isArray(filter.acceptTimeRange) && filter.acceptTimeRange[0] ? filter.acceptTimeRange[0] : '',
      takenTo: Array.isArray(filter.acceptTimeRange) && filter.acceptTimeRange[1] ? filter.acceptTimeRange[1] : '',
      page: page.value,
      pageSize: pageSize.value,
    });
    const list = res && Array.isArray(res.list) ? res.list : [];
    orders.value = buildRelation(list.map(mapOrder));
    total.value = Number(res?.total) || 0;
    loadedOnce.value = true;
    applyOrderNoFromUrl();
  } catch {
    // 错误提示已由 request.js 统一 toast
    orders.value = [];
    total.value = 0;
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
// 转单（按名额指派打手）：进行中 + 无冻结/售后标签 + 未审核驳回 + 未已转单（批注①：已转单不在此处展示）
const canTransfer = (row) =>
  row.orderStatus === 'processing' && !hasAbnormalTag(row) && row.auditStatus !== 'rejected' && !row.transferred;

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
/** 详情缓存：列表行数据即可先行渲染，详情接口返回后再静默刷新 */
const detailCache = new Map();
let detailRequestSeq = 0;

function openDetail(row) {
  // 先用列表行数据立即打开弹窗，避免等待接口造成「点击无响应」
  currentRow.value = detailCache.get(row.id) || row;
  detailVisible.value = true;
  loadDetail(row.id);
}

/** 静默拉取详情：弹窗已展示，返回后仅更新内容；快速切换订单时丢弃过期响应 */
async function loadDetail(id) {
  const seq = ++detailRequestSeq;
  detailLoading.value = true;
  try {
    const data = await clubOrderApi.detail(id);
    if (seq !== detailRequestSeq) return;
    const mapped = mapOrder(data);
    detailCache.set(id, mapped);
    if (detailVisible.value && currentRow.value?.id === id) {
      currentRow.value = mapped;
    }
  } catch {
    // 后端错误（如订单不存在）已由 request.js toast；保留列表行数据兜底展示
  } finally {
    if (seq === detailRequestSeq) detailLoading.value = false;
  }
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
  // 原型批注③：加价最多为俱乐部真实收益值
  if (adjustForm.type === 'add') {
    const maxAdd = Number(currentRow.value.profit.clubShare) || 0;
    if (maxAdd > 0 && amt > maxAdd) {
      show(`加价最多为俱乐部真实收益值 ¥${maxAdd.toFixed(2)}`, 'warning');
      return;
    }
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
/** 候选打手选项：优先后端 GET /api/club/players 本俱乐部打手列表；接口失败回退本地 mock（PLAYER_OPTIONS） */
const transferPlayerOptions = ref(PLAYER_OPTIONS);

function openTransfer(row) {
  currentRow.value = row;
  transferForm.player1 = '';
  transferForm.player2 = '';
  transferVisible.value = true;
  loadTransferPlayers();
}

/** 拉取本俱乐部打手作为转单候选（后端真实数据；失败保留本地兜底选项） */
async function loadTransferPlayers() {
  try {
    const res = await playerApi.list({ page: 1, pageSize: 200 });
    const list = Array.isArray(res?.list) ? res.list : [];
    if (list.length) {
      transferPlayerOptions.value = list.map((p) => ({
        label: `${p.name}(${p.id})`,
        value: String(p.id),
      }));
    }
  } catch {
    /* 接口失败：保留本地 mock 兜底选项 */
  }
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
      @change="handleFilterChange"
    />

    <!-- 订单表格 -->
    <DataTable v-loading="loading" :columns="columns" :data="rows" :total="total" :page="page" :page-size="pageSize" @page-change="(p) => { page = p; loadOrders(); }">
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

      <!-- 操作：原型批注①「冻结、售后中标签下无操作按钮」 -->
      <template #cell-actions="{ row }">
        <div v-if="hasAbnormalTag(row)" class="action-cell action-empty">—</div>
        <div v-else class="action-cell">
          <a class="op-link" @click="openDetail(row)">查看</a>
          <a v-if="canAdjust(row)" class="op-link" @click="openAdjust(row)">加减价</a>
          <a v-if="canTransfer(row)" class="op-link" @click="openTransfer(row)">转单</a>
        </div>
      </template>
    </DataTable>

    <!-- ================= 订单详情弹窗（俱乐部后台原型结构：订单信息/打手信息/分润信息/存单信息/订单日志/完成凭证；点击即开，详情接口返回后静默刷新） ================= -->
    <AppModal v-model="detailVisible" title="查看" width="720px">
      <div v-if="currentRow" class="detail-box">
        <!-- 订单信息 -->
        <section class="detail-section">
          <h4 class="section-title">订单信息</h4>
          <div class="order-no-line">
            订单号：{{ currentRow.orderNo }}
            <span v-if="detailLoading" class="detail-refreshing">同步中…</span>
            <i class="copy-icon" title="复制订单号" @click="copyText(currentRow.orderNo)" />
          </div>
          <div class="info-grid">
            <div class="info-item"><label>订单金额(元)</label><span>{{ Number(currentRow.amount).toFixed(2) }}</span></div>
            <div class="info-item"><label>购买项目</label><span>{{ currentRow.product || '—' }}</span></div>
            <div v-if="currentRow.assignService" class="info-item"><label>派单客服</label><span>{{ currentRow.assignService }}</span></div>
            <div class="info-item"><label>订单状态</label><span>{{ STATUS_TEXT[currentRow.orderStatus] || currentRow.orderStatus }}<template v-if="currentRow.orderStatus === 'pending'">({{ currentRow.claimedCount }}/{{ currentRow.requiredCount }})</template></span></div>
            <div class="info-item"><label>角色名</label><span>{{ currentRow.roleName || '—' }}</span></div>
            <div class="info-item"><label>游戏规格</label><span>{{ currentRow.spec || '—' }}</span></div>
            <div class="info-item"><label>打手人数</label><span>{{ currentRow.claimedCount }}/{{ currentRow.requiredCount }}</span></div>
            <div class="info-item"><label>客户端</label><span>{{ currentRow.clientType.join('、') || '—' }}</span></div>
            <div v-if="currentRow.teamCode" class="info-item"><label>组队码</label><span>{{ currentRow.teamCode }}</span></div>
            <div v-if="currentRow.createTime" class="info-item"><label>创单时间</label><span>{{ currentRow.createTime }}</span></div>
            <div v-if="currentRow.clubAcceptTime" class="info-item"><label>俱乐部接单时间</label><span>{{ currentRow.clubAcceptTime }}</span></div>
            <div v-if="currentRow.dispatchRemark" class="info-item"><label>派单备注</label><span>{{ currentRow.dispatchRemark }}</span></div>
            <div v-if="currentRow.orderStatus === 'completed' && currentRow.completedAt" class="info-item"><label>完成时间</label><span>{{ currentRow.completedAt }}</span></div>
            <div v-if="currentRow.orderStatus === 'closed' && currentRow.closedAt" class="info-item"><label>取消时间</label><span>{{ currentRow.closedAt }}</span></div>
          </div>
          <!-- 进行中已驳回 -->
          <p v-if="currentRow.orderStatus === 'processing' && currentRow.rejectReason" class="reject-tip">驳回原因：{{ currentRow.rejectReason }}</p>
          <!-- 已完成：收益入账提示（settleDays 由后台配置返回；都没有时按原型展示 7 日） -->
          <p v-if="currentRow.orderStatus === 'completed'" class="settle-tip">
            恭喜你完成订单，收益将在{{ currentRow.settleDays ?? 7 }}日后入账
          </p>
        </section>

        <!-- 打手信息 -->
        <section class="detail-section">
          <h4 class="section-title">打手信息</h4>
          <div v-if="currentRow.players.length" class="player-grid">
            <div v-for="(p, i) in currentRow.players" :key="i" class="player-card">
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
            <div v-if="currentRow.profit.adjustText" class="profit-item">
              <label>俱乐部加价/减价</label>
              <span :class="{ 'text-muted': currentRow.profit.adjustInvalid }">{{ currentRow.profit.adjustText }}</span>
            </div>
            <div class="profit-item">
              <label>俱乐部分润(元)</label>
              <span class="profit-value">{{ currentRow.profit.clubShare }}</span>
            </div>
            <div class="profit-item">
              <label>打手分润(元)</label>
              <span>{{ currentRow.profit.playerShareText }}</span>
            </div>
          </div>
        </section>

        <!-- 存单信息：原型批注④「非三角洲游戏仅展示存单备注字段」 -->
        <section v-if="showDepositFull || showDepositNote" class="detail-section">
          <h4 class="section-title">存单信息</h4>
          <template v-if="showDepositFull">
            <div class="info-grid">
              <div class="info-item"><label>保底目标(W)</label><span>{{ currentRow.deposit.targetW }}</span></div>
              <div class="info-item"><label>存单原因</label><span>{{ currentRow.deposit.reason || '—' }}</span></div>
              <div class="info-item"><label>第一把(W)</label><span>{{ currentRow.deposit.firstW }}</span></div>
              <div class="info-item"><label>第二把(W)</label><span>{{ currentRow.deposit.secondW }}</span></div>
            </div>
            <div class="upload-empty">
              <div class="upload-box"><i class="upload-icon" /></div>
              <p class="upload-text">剩余保底截图</p>
            </div>
          </template>
          <div v-else class="info-item"><label>存单备注</label><span>{{ currentRow.deposit.note || '—' }}</span></div>
        </section>

        <!-- 订单日志：原型批注②「仅展示订单状态变动记录即可」 -->
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
          <p v-else class="empty-text">暂无数据</p>
        </section>

        <!-- 完成凭证 -->
        <section class="detail-section">
          <h4 class="section-title">完成凭证</h4>
          <template v-if="hasVouchers">
            <div class="voucher-row">
              <div v-for="(v, i) in currentRow.vouchers.first" :key="i" class="voucher-item">
                <div class="voucher-thumb-box"><i class="upload-icon" /></div>
                <p class="voucher-label">首图</p>
              </div>
              <div v-for="(v, i) in currentRow.vouchers.last" :key="i" class="voucher-item">
                <div class="voucher-thumb-box"><i class="upload-icon" /></div>
                <p class="voucher-label">尾图</p>
              </div>
            </div>
            <div v-if="currentRow.vouchers.process.length" class="voucher-row">
              <div v-for="(p, i) in currentRow.vouchers.process" :key="i" class="voucher-item">
                <div class="voucher-thumb-box"><i class="upload-icon" /></div>
                <p class="voucher-label">进程图{{ i + 1 }}</p>
              </div>
            </div>
          </template>
          <p v-else class="empty-text">暂无数据</p>
          <div v-if="currentRow.playerRemark" class="profit-line">打手备注：{{ currentRow.playerRemark }}</div>
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
        <p class="form-tip">加：最多为俱乐部真实收益值；减：最多为打手真实收益值；仅支持输入正数，最多保留两位小数</p>
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
            <el-option v-for="p in transferPlayerOptions" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="currentRow && currentRow.requiredCount > 1" label="打手2" required>
          <el-select v-model="transferForm.player2" placeholder="请选择打手" style="width: 100%">
            <el-option v-for="p in transferPlayerOptions" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <p class="form-tip">即可选择旗下打手，转完后打手默认接受</p>
      </el-form>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="transferSubmitting" @click="confirmTransfer">{{ transferSubmitting ? '提交中…' : '确定' }}</button>
        <button class="btn btn-plain" type="button" @click="transferVisible = false">取消</button>
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
.action-cell {
  display: flex;
  gap: 10px;
}

.action-empty {
  color: var(--text-faint, rgba(255, 255, 255, 0.35));
  user-select: none;
}

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
.detail-section {
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--border-soft);
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

/* ===== 详情弹窗（原型结构 2026-10-26） ===== */
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.detail-head .order-status {
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--bg-hover);
  font-size: 13px;
}

.detail-order-no {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-sub);
}

.detail-refreshing {
  font-size: 12px;
  color: var(--primary);
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

.settle-tip {
  margin-top: 12px;
  font-size: 13px;
  color: var(--status-success);
  background: rgba(47, 194, 121, 0.08);
  border-radius: 6px;
  padding: 8px 12px;
}

.reject-tip {
  font-size: 13px;
  color: var(--status-danger);
  background: rgba(240, 73, 73, 0.08);
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 12px;
}

.plain-tip {
  margin: 0;
  font-size: 13px;
  color: var(--text-sub);
}

/* 进度截图展示块 */
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
  color: var(--text-sub);
  text-align: center;
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

.profit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.profit-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-hover);
  font-size: 13px;
}

.profit-item label {
  font-size: 12px;
  color: var(--text-sub);
}

.profit-value {
  font-weight: 700;
  color: var(--primary);
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

/* ===== 提交验收：进度截图上传（首图/尾图/进程图） ===== */
.voucher-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.voucher-slot {
  display: flex;
  align-items: center;
  gap: 12px;
}

.voucher-slot-label {
  flex-shrink: 0;
  width: 56px;
  font-size: 13px;
  color: var(--text-main);
}

.voucher-upload-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.voucher-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.voucher-remove {
  font-size: 12px;
  color: var(--status-danger);
  cursor: pointer;
}

.voucher-remove:hover {
  text-decoration: underline;
}

.voucher-btn {
  height: 30px;
  padding: 0 14px;
  border: 1px dashed var(--border-strong);
  border-radius: 6px;
  background: transparent;
  color: var(--primary);
  font-size: 12.5px;
  cursor: pointer;
}

.voucher-btn:hover {
  background: var(--bg-hover);
}

.voucher-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.voucher-file-input {
  display: none;
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
