<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import AppModal from '../../../components/AppModal.vue';
import { fileApi } from '../../../api/modules/file';
import { useConfirm } from '../../../composables/useConfirm';
import { useToast } from '../../../composables/useToast';
import { useListMemory } from '../../../composables/useListMemory';
import { subscribeOrderFeed } from '../../../api/orderFeed';
import { useUserStore } from '../../../stores/user';
import {
  orderApi,
  STATUS_OPTIONS,
  AUDIT_OPTIONS,
  TYPE_OPTIONS,
  ORDER_MODE_OPTIONS,
  statusText,
  auditText,
  attributeText,
  typeText,
  modeText,
} from '../../../api/modules/order';
import { gameApi } from '../../../api/modules/game';
import { channelApi } from '../../../api/modules/channel';
import { clubApi } from '../../../api/modules/club';
import { handoverApi } from '../../../api/modules/handover';
import OrderDetailDialog from './OrderDetailDialog.vue';
import OrderEditDialog from './OrderEditDialog.vue';
import AuditDialog from './AuditDialog.vue';
import {
  ATTR_OPTIONS,
  TAG_OPTIONS,
  STATUS_CLASS,
  AUDIT_CLASS,
  CALL_TYPE_OPTIONS,
  CLIENT_OPTIONS,
} from './mockData';

/**
 * 订单列表（管理端）接口联调（依据最新 OpenAPI 2026-10-20）
 * - 我的订单 / 全部订单：两个接口切换（orderApi.mine / orderApi.all，内部 scope=MINE/ALL），
 *   后续统一为 orderApi.list({ scope, ...params })（见 order.js 顶部 TODO）
 * - 权限（原型标注：仅客服角色有「我的订单/全部订单」切换；管理员、审核员看到的全是全部订单；
 *   领取人/所属客服仅管理员可在列表「领取人」列行内修改：铅笔 → 独立弹窗走 PUT /{id}/owner，不在编辑弹窗编辑）
 * - 鉴权：Bearer token 由 request.js 自动附加；ownerId/ownerName 仅 scope=ALL 时有效
 * - 新 OpenAPI 已支持（已接入）：筛选参数 attribute(MAIN/SUB)/tag/clients(PC/MOBILE)/ownerName、
 *   status 枚举含 WAIT_CLAIM、列表/详情返回 teamCode（组队码）与 statusCounts（状态计数）、
 *   maintain 支持 teamCode、call body 支持 type 英文枚举、create body 支持 orderType（人数由后端管理）、
 *   游戏/规格 GET /games + /games/{id}/specs
 * - 已补齐接入（后端已返回）：指派打手 POST /api/admin/orders/{id}/assignments（管理端路径，slots 结构不变）、
 *   订单分润明细 POST /api/admin/orders/{id}/profit-details（详情/审核弹窗已接）、
 *   订单详情扩展字段 refunded/children/parentOrderNo/hold（存单）/coverUrl/endUrl/progressUrls（凭证）/
 *   playerRemark（陪玩备注）/roleName/gameName/specName/canChangeOwner 等已映射并展示，
 *   可绑主单候选 GET /orders/bindable-parents、批量解绑 POST /orders/unbind、回退 POST /orders/{id}/rollback
 * - 仍缺（保留原型 UI/兜底）：编辑存单 hold 独立入口、交易关闭 close 按钮（原型未要求，未擅自加）；
 * - 订单类型 orderType（后端确认 2026-10-22）：新增/筛选/编辑统一规范码 NORMAL/DISCOUNT（特惠单=DISCOUNT）；
 *   SPECIAL 仅为历史兼容码（编辑接口仍收，历史订单回显用，前端 ORDER_TYPE 已含 DISCOUNT/SPECIAL）
 */
const { confirm } = useConfirm();
const { show } = useToast();
const userStore = useUserStore();

const money = (value) => (Number(value) || 0).toFixed(2);
const adjustAmountText = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  if (amount === 0) return money(0);
  return `${amount > 0 ? '+' : '-'}${money(Math.abs(amount))}`;
};

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(String(text));
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = String(text);
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  show('已复制', 'success');
}

/** 当前登录角色（客服 service / 审核员 audit / 财务统计 finance / 管理员 admin） */
const userRole = computed(() => userStore.role || 'admin');
const isService = computed(() => userRole.value === 'service');
const isAudit = computed(() => userRole.value === 'audit');
const isAdmin = computed(() => userRole.value === 'admin');
const isFinance = computed(() => userRole.value === 'finance');
const waitClaimCount = ref(0);

/* ===== 我的订单 / 全部订单（原型标注：仅客服角色有切换；管理员、审核员看到的全是全部订单） ===== */
const scope = ref(isService.value ? 'mine' : 'all');
const scopeOptions = computed(() =>
  isService.value ? [
    { label: '我的订单', value: 'mine' },
    { label: '全部订单', value: 'all' },
  ] : [{ label: '全部订单', value: 'all' }]
);

function switchScope(value) {
  if (value === 'mine' && filter.status === 'WAIT_CLAIM') return;
  scope.value = value;
  page.value = 1;
  fetchList();
}

/* ===== 筛选（接口已支持的参数参与服务端查询；未提供的原型筛选字段保留 UI，暂不参与查询） ===== */
const filter = reactive({
  orderNo: '',
  thirdOrderNo: '',
  channel: '', // channelCode
  status: '',
  auditStatus: '',
  attribute: '', // 主订单/子订单（新 OpenAPI 已支持 attribute=MAIN/SUB）
  orderType: '',
  orderMode: '', // placeMode：NORMAL / CUSTOM
  claimer: '', // 领取人姓名/企微（新 OpenAPI 已支持 ownerName 模糊，仅 scope=ALL 有效）
  ownerId: '', // 领取人账号ID（接口参数，仅 scope=ALL 有效）
  clubPlayer: null, // 俱乐部/打手选中项 { type:'CLUB'|'PLAYER', id, label, name, clubId, clubName }
  specKeyword: '', // 游戏规格文案筛选
  tag: '', // 订单标签（新 OpenAPI 已支持 tag=CALL/STUCK 等，原型中文做映射）
  createTime: [],
});
const searchComponentRef = ref(null);
const specFilterOptions = ref([]);
const specOptionsLoading = ref(false);
// 俱乐部/打手下拉选项（远程联想 GET /api/admin/parties/search，分页触底加载）
const clubPlayerOptions = ref([]);
const clubPlayerLoading = ref(false);
const clubPlayerPage = ref(1); // 当前页码
const clubPlayerHasMore = ref(true); // 是否还有下一页
const clubPlayerKeyword = ref(''); // 当前检索关键字
const clubPlayerLoaded = ref(false); // 是否已拉取过首屏（控制展开兜底加载）
const CLUB_PLAYER_PAGE_SIZE = 20;
let clubPlayerTimer = null;
let clubPlayerSequence = 0;

const searchFields = computed(() => [
  { prop: 'orderNo', label: '本平台订单号', type: 'input', placeholder: '请输入订单号（完全匹配）', span: 4 },
  { prop: 'thirdOrderNo', label: '第三方订单号', type: 'input', placeholder: '请输入订单号（完全匹配）', span: 4 },
  {
    prop: 'channel', label: '渠道', type: 'select', placeholder: '全部', span: 4,
    options: filterChannelOptions.value, // 真实渠道接口动态加载（含抖音；无任何本地硬编码渠道）
  },
  {
    prop: 'status', label: '订单状态', type: 'select', placeholder: '全部', span: 4,
    options: [
      { label: '全部', value: '' },
      ...STATUS_OPTIONS.map((option) => option.value === 'WAIT_CLAIM' && waitClaimCount.value > 0
        ? { ...option, label: `${option.label} (${waitClaimCount.value})` }
        : option),
      { label: '存单', value: 'STORED' },
    ],
  },
  {
    prop: 'auditStatus', label: '审核状态', type: 'select', placeholder: '全部', span: 4,
    options: [{ label: '全部', value: '' }, ...AUDIT_OPTIONS],
  },
  {
    prop: 'attribute', label: '订单属性', type: 'select', placeholder: '全部', span: 4,
    options: [{ label: '全部', value: '' }, ...ATTR_OPTIONS.map((item) => ({ label: item, value: item }))],
  },
  {
    prop: 'orderType', label: '订单类型', type: 'select', placeholder: '全部', span: 4,
    options: [{ label: '全部', value: '' }, ...TYPE_OPTIONS],
  },
  {
    prop: 'orderMode', label: '下单方式', type: 'select', placeholder: '全部', span: 4,
    options: [{ label: '全部', value: '' }, ...ORDER_MODE_OPTIONS],
  },
  { prop: 'claimer', label: '领取人', type: 'input', placeholder: '请输入领取人（企微名/客服名）', span: 4 },
  {
    prop: 'specKeyword', label: '游戏规格', type: 'select', placeholder: '输入游戏名、规格名或货架编号', filterable: true,
    remote: true, remoteMethod: searchSpecOptions, allowCreate: true, loading: specOptionsLoading.value, span: 4,
    options: specFilterOptions.value,
  },
  {
    prop: 'tag', label: '订单标签', type: 'select', placeholder: '全部', span: 4,
    options: [{ label: '全部', value: '' }, ...TAG_OPTIONS.map((item) => ({ label: item, value: item }))],
  },
  {
    prop: 'createTime',
    label: '创建时间',
    type: 'daterange',
    startPlaceholder: '开始时间',
    endPlaceholder: '结束时间',
    span: 4,
    shortcuts: [
      { text: '今天', value: () => { const d = new Date(); return [d, d]; } },
      { text: '最近7天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); return [start, end]; } },
      { text: '最近30天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 29); return [start, end]; } },
    ],
  },
  {
    prop: 'clubPlayer', label: '俱乐部/打手', type: 'select', placeholder: '输入俱乐部或打手名称',
    filterable: true, remote: true, remoteMethod: searchClubPlayerOptions, valueKey: 'key',
    onVisibleChange: onClubPlayerVisibleChange, onEndReached: onClubPlayerEndReached,
    loading: clubPlayerLoading.value, options: clubPlayerOptions.value, span: 4,
  },
]);

const { page, pageSize, onPageSizeChange, onPageChange, restoreFilter, rememberFilter } = useListMemory({
  filterKeys: ['orderNo', 'thirdOrderNo', 'channel', 'status', 'auditStatus', 'attribute', 'orderType', 'orderMode', 'claimer', 'ownerId', 'clubPlayer', 'specKeyword', 'tag', 'createTime'],
});
restoreFilter(filter);
if (filter.specKeyword) {
  specFilterOptions.value = [{ label: filter.specKeyword, value: filter.specKeyword }];
}
// 记忆恢复后常驻已选俱乐部/打手，保证下拉回显标签
if (filter.clubPlayer && filter.clubPlayer.id) {
  clubPlayerOptions.value = selectedPartyOption();
}
const newFeedCount = ref(0);
let orderFeedSubscription = null;
let claimFeedSubscription = null;
let listViewMounted = false;
let specSearchTimer = null;
let specSearchSequence = 0;
const orderListFeedCount = ref(0);
const claimFeedCount = ref(0);

function maxOrderId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item?.id) || 0), 0);
}

// 支持外部跳转定位：优先按第三方订单号筛选，兼容其他页面传入的平台订单号
const route = useRoute();
const routeThirdOrderNo = route.query.thirdOrderNo;
if (routeThirdOrderNo) filter.thirdOrderNo = String(routeThirdOrderNo);
const routeOrderNo = route.query.orderNo;
if (routeOrderNo && !routeThirdOrderNo) filter.orderNo = String(routeOrderNo);
const routeStatus = route.query.status;
if (typeof routeStatus === 'string' && (routeStatus === 'STORED' || STATUS_OPTIONS.some((option) => option.value === routeStatus))) {
  filter.status = routeStatus;
}
if (filter.status === 'WAIT_CLAIM') scope.value = 'all';

/* ===== 游戏/规格目录（供下拉选择与列表展示；规格 id 取真实接口 GET /games/{id}/specs，新增/编辑提交真实 specId） ===== */
const catalog = ref([]); // [{ id, name, specs: [{ id, name }] }]
const gameList = ref([]);
const gameListLoaded = ref(false);
const catalogLoaded = ref(false);
let gameListLoading = null;

async function loadGameList() {
  if (gameListLoaded.value) return gameList.value;
  if (!gameListLoading) {
    gameListLoading = (async () => {
      try {
        gameList.value = await gameApi.listAll();
        catalog.value = gameList.value.map((game) => ({ id: game.id, name: game.name, specs: [] }));
        gameListLoaded.value = true;
        return gameList.value;
      } finally {
        gameListLoading = null;
      }
    })();
  }
  return gameListLoading;
}

async function loadCatalog() {
  if (catalogLoaded.value) return;
  try {
    const games = await loadGameList(); // 真实游戏列表 [{ id, name }]
    const list = await Promise.all(
      (games || []).map(async (game) => {
        let specs = [];
        try {
          specs = await gameApi.specs(game.id); // 真实规格列表 [{ id, name, specNo? }]
        } catch {
          specs = [];
        }
          return {
            id: game.id,
            name: game.name,
            specs: specs.map((s) => ({
              id: s.id,
              name: s.name,
              specNo: s.specNo || s.shelfNo || '',
              requireClubNetPrice: s.requireClubNetPrice === true,
            })),
          };
      })
    );
    catalog.value = list;
    specFilterOptions.value = getAllSpecFilterOptions();
  } catch {
    catalog.value = [];
    specFilterOptions.value = getAllSpecFilterOptions();
  } finally {
    catalogLoaded.value = true;
  }
}

function getAllSpecFilterOptions() {
  const options = catalog.value.flatMap((game) =>
    (game.specs || [])
      .filter((spec) => spec.name)
      .map((spec) => {
        const shelfNo = spec.specNo || spec.shelfNo;
        const label = `${game.name} - ${spec.name}${shelfNo ? `（${shelfNo}）` : ''}`;
        return { label, value: `${game.name} - ${spec.name}` };
      })
  );
  if (filter.specKeyword && !options.some((option) => option.value === filter.specKeyword)) {
    options.unshift({ label: filter.specKeyword, value: filter.specKeyword });
  }
  return options;
}

function toSpecFilterOption(spec) {
  const item = spec && typeof spec === 'object' ? spec : { name: spec };
  const specName = String(item.specName || item.name || item.label || '').trim();
  const gameName = String(item.gameName || item.game?.name || '').trim();
  const shelfNo = String(item.specNo || item.shelfNo || '').trim();
  const label = String(item.label || [
    gameName && specName ? `${gameName} - ${specName}` : gameName || specName,
    shelfNo && !String(item.label || '').includes(shelfNo) ? `（${shelfNo}）` : '',
  ].filter(Boolean).join(''));
  const searchValue = gameName && specName ? `${gameName} - ${specName}` : specName || label;
  return { label, value: searchValue };
}

function searchSpecOptions(query = '') {
  const keyword = String(query || '').trim();
  if (specSearchTimer) clearTimeout(specSearchTimer);
  const requestSequence = ++specSearchSequence;
  if (!keyword) {
    specFilterOptions.value = getAllSpecFilterOptions();
    specOptionsLoading.value = false;
    return;
  }

  specSearchTimer = setTimeout(async () => {
    specOptionsLoading.value = true;
    try {
      const specs = await gameApi.searchSpecs({ keyword, page: 1, pageSize: 20 });
      if (requestSequence !== specSearchSequence) return;
      const options = specs.map(toSpecFilterOption).filter((option) => option.value);
      if (filter.specKeyword && !options.some((option) => option.value === filter.specKeyword)) {
        options.unshift({ label: filter.specKeyword, value: filter.specKeyword });
      }
      specFilterOptions.value = options;
    } catch (error) {
      if (requestSequence === specSearchSequence && !error?.requestNotified) {
        show(error?.message || '规格搜索失败', 'error');
      }
    } finally {
      if (requestSequence === specSearchSequence) specOptionsLoading.value = false;
    }
  }, 250);
}

/** 当前已选中项对应的下拉 option（远程刷新/记忆恢复时常驻回显，避免标签丢失） */
function selectedPartyOption() {
  const p = filter.clubPlayer;
  return p && p.id ? [{ key: `${p.type}:${p.id}`, label: p.label || p.name, value: { key: `${p.type}:${p.id}`, ...p } }] : [];
}

/** 接口条目 → 下拉 option（对象值，唯一键 key=type:id） */
function toPartyOption(item) {
  const key = `${item.type}:${item.id}`;
  return {
    key,
    label: item.label || item.name,
    value: {
      key,
      type: item.type,
      id: item.id,
      name: item.name,
      label: item.label || item.name,
      clubId: item.clubId,
      clubName: item.clubName,
    },
  };
}

/**
 * 拉取俱乐部/打手下拉数据（分页）
 * @param {string} keyword 检索关键字（空串=默认全量第一页）
 * @param {number} page 页码
 * @param {boolean} append 是否追加（触底加载下一页）；false 重置列表
 */
async function fetchClubPlayerOptions(keyword, page, append) {
  // 触底追加期间防重入，避免重复拉同一页；非追加（重新检索）可打断旧请求
  if (append && clubPlayerLoading.value) return;
  clubPlayerLoading.value = true;
  const sequence = ++clubPlayerSequence;
  try {
    const res = await orderApi.searchParties({ keyword, page, pageSize: CLUB_PLAYER_PAGE_SIZE });
    if (sequence !== clubPlayerSequence) return;
    const list = (res && res.list) || [];
    const options = list.map(toPartyOption);
    // 已选项常驻；追加时按 key 去重合并
    const base = append ? clubPlayerOptions.value : selectedPartyOption();
    const existKeys = new Set(base.map((o) => o.key));
    const merged = [...base];
    options.forEach((o) => {
      if (!existKeys.has(o.key)) {
        existKeys.add(o.key);
        merged.push(o);
      }
    });
    clubPlayerOptions.value = merged;
    // 是否还有下一页：优先 total；后端未返回 total 时按本页条数是否达页大小判断
    const total = res && typeof res.total === 'number' ? res.total : null;
    clubPlayerHasMore.value = total !== null
      ? merged.length < total
      : list.length >= CLUB_PLAYER_PAGE_SIZE;
    clubPlayerPage.value = page;
    clubPlayerLoaded.value = true;
  } catch (error) {
    if (sequence === clubPlayerSequence && !error?.requestNotified) {
      show(error?.message || '俱乐部/打手检索失败', 'error');
    }
  } finally {
    if (sequence === clubPlayerSequence) clubPlayerLoading.value = false;
  }
}

/** 输入防抖检索：重置到第一页（空关键字=默认展示全量） */
function searchClubPlayerOptions(query = '') {
  const keyword = String(query || '').trim();
  if (clubPlayerTimer) clearTimeout(clubPlayerTimer);
  clubPlayerTimer = setTimeout(() => {
    clubPlayerKeyword.value = keyword;
    fetchClubPlayerOptions(keyword, 1, false);
  }, 300);
}

/** 下拉展开：尚未拉取过首屏时兜底加载全量第一页 */
function onClubPlayerVisibleChange(visible) {
  if (visible && !clubPlayerLoaded.value) {
    fetchClubPlayerOptions(clubPlayerKeyword.value, 1, false);
  }
}

/** 下拉滚动触底：加载下一页并追加 */
function onClubPlayerEndReached() {
  if (!clubPlayerHasMore.value || clubPlayerLoading.value) return;
  fetchClubPlayerOptions(clubPlayerKeyword.value, clubPlayerPage.value + 1, true);
}

/** 打手姓名：优先列表行 playerNames 数组顿号拼接；slots 仅作兜底 */
function playerNames(row) {
  const arr = Array.isArray(row.playerNames)
    ? row.playerNames
    : (row.slots || []).map((s) => s.playerName || s.name || '');
  return arr.filter(Boolean).join('、');
}

/** 俱乐部名称：优先列表行 clubName；slots 去重仅作兜底 */
function clubNames(row) {
  if (row.clubName) return row.clubName;
  return [...new Set((row.slots || []).map((s) => s.clubName || '').filter(Boolean))].join('、');
}

const gameOptions = computed(() => catalog.value.map((g) => ({ label: g.name, value: g.id })));

function specOptionsOf(gameId) {
  const game = catalog.value.find((g) => g.id === Number(gameId));
  return game ? game.specs.map((s) => ({ label: s.name, value: s.id })) : [];
}

function gameNameOf(gameId) {
  const game = catalog.value.find((g) => g.id === Number(gameId));
  return game ? game.name : '—';
}

function specNameOf(gameId, specId) {
  const game = catalog.value.find((g) => g.id === Number(gameId));
  const spec = game && game.specs.find((s) => s.id === Number(specId));
  return spec ? spec.name : '—';
}

/* ===== 列表数据（服务端分页/筛选） ===== */
const rows = ref([]);
const rawOrderItems = ref([]);
const total = ref(0);
const loading = ref(false);

/**
 * 后端订单标签枚举 → 中文（列表/详情已返回；新 OpenAPI 枚举：
 * CALL/STUCK/WAIT_SHIP/SHIPPED/AFTER_SALE/FROZEN/TRANSFER/PARTIAL_REFUND/REFUNDED）
 */
const TAG_TEXT = {
  CALL: '呼叫',
  STUCK: '卡单',
  EVIDENCE_LATE: '凭证提交超时',
  WAIT_SHIP: '待发货',
  SHIPPED: '已发货',
  AFTER_SALE: '售后中',
  FROZEN: '冻结',
  TRANSFER: '转单',
  PARTIAL_REFUND: '部分退款',
  REFUNDED: '已退款',
  HOLD: '存单',
};

/** 中文标签 → 后端枚举（筛选参数 tag 用） */
const TAG_ENUM = Object.fromEntries(Object.entries(TAG_TEXT).map(([k, v]) => [v, k]));

/** 订单属性：原型中文 → 后端枚举（attribute=MAIN/SUB） */
const ATTR_ENUM = { 主订单: 'MAIN', 子订单: 'SUB' };

/** 合并接口 tags 与派生标签（冻结/售后中/存单——存单由 hold.stored 派生，原型列表"存单"标签） */
function isOrderStored(item = {}) {
  return Boolean(
    item.hold?.stored ||
    item.depositStored ||
    (Array.isArray(item.tags) && item.tags.some((tag) => tag === '存单' || tag === 'HOLD'))
  );
}

function mapTags(item = {}) {
  const tags = new Set((item.tags || []).map((t) => TAG_TEXT[t] || t));
  if (Number(item.frozen) === 1) tags.add('冻结');
  if (item.afterSaleFlag !== undefined && item.afterSaleFlag !== null) {
    if (Number(item.afterSaleFlag) === 1) tags.add('售后中');
    else tags.delete('售后中');
  }
  if (isOrderStored(item)) tags.add('存单');
  return Array.from(tags);
}

function mapTagLabels(item = {}, tags = mapTags(item)) {
  const labelsByTag = new Map();
  const tagLabels = Array.isArray(item.tagLabels) ? item.tagLabels : [];
  (Array.isArray(item.tags) ? item.tags : []).forEach((tag, index) => {
    const normalizedTag = TAG_TEXT[tag] || tag;
    const label = tagLabels[index];
    labelsByTag.set(
      normalizedTag,
      TAG_TEXT[tag] || (typeof label === 'string' && label.trim() ? label : normalizedTag)
    );
  });
  return tags.map((tag) => labelsByTag.get(tag) || tag);
}

/**
 * 后端列表字段 → 页面展示字段。
 * 接口已返回：parentOrderId（主子单列）、tags、createdAt 等；
 * 仍未返回的原型字段（组队码/存单/凭证等）兜底注入，待后端补充接口后自动有数据。
 */
function mapOrderRow(item = {}) {
  const placeMode = item.placeMode || item.orderMode || item.placeType || (item.customOrder ? 'CUSTOM' : '');
  const tags = mapTags(item);
  return {
    id: item.id,
    canUnfreeze: item.canUnfreeze === true,
    canRollback: item.canRollback === true,
    orderNo: item.orderNo || '',
    thirdOrderNo: item.thirdOrderNo || '',
    channel: channelDisplayName(item.channelCode),
    channelCode: item.channelCode,
    amount: Number(item.amount) || 0,
    originalAmount: item.originalAmount,
    insuranceSlots: item.insuranceSlots ?? '',
    clubNetPrice: item.clubNetPrice ?? '',
    requireClubNetPrice: item.requireClubNetPrice === true,
    playerAmount: item.playerAmount,
    dispatchAmount: item.dispatchAmount,
    dispatchTypeCode: item.dispatchType || '',
    dltOrderNo: item.dltOrderNo || '',
    dltDispatchPrice: item.dltDispatchPrice,
    midReplace: item.midReplace ?? null,
    midReplaceWaiting: item.midReplaceWaiting === true,
    midReplaceRemainRatio: item.midReplaceRemainRatio,
    midReplaceRemainAmount: item.midReplaceRemainAmount,
    midReplacePoolAmount: item.midReplacePoolAmount,
    profitLocked: item.profitLocked,
    canMidReplace: item.canMidReplace,
    midReplaceBlockReason: item.midReplaceBlockReason || '',
    dltConfirmedAt: item.dltConfirmedAt || '',
    payVoucherUrl: item.payVoucherUrl || '',
    playerPriceReady: item.playerPriceReady,
    remark: item.remark ?? item.dispatchRemark ?? '',
    systemRemark: item.systemRemark ?? '',
    platformAdjust: item.platformAdjust,
    clubAdjust: item.clubAdjust,
    product: item.itemName || '',
    gameName: item.gameName || gameNameOf(item.gameId), // 详情接口直接返回游戏名；列表无则目录反查
    gameId: item.gameId,
    spec: item.specName || specNameOf(item.gameId, item.specId), // 详情接口直接返回规格名
    specId: item.specId,
    clients: item.clients || '',
    status: statusText(item.status),
    statusCode: item.status,
    canClaim: item.canClaim === true,
    manualCreated: item.manualCreated === true,
    canApplyEdit: item.canApplyEdit === true,
    editApprovalStatus: item.editApprovalStatus || '',
    editApprovalId: item.editApprovalId ?? null,
    canApplyVoid: item.canApplyVoid === true,
    voidApprovalStatus: item.voidApprovalStatus || '',
    voidApprovalId: item.voidApprovalId ?? null,
    preStatus: item.preStatus,
    auditStatus: auditText(item.auditStatus),
    auditCode: item.auditStatus,
    dispatchKefuName: item.dispatchKefuName || '',
    claimerName: item.ownerName || '',
    claimerCorp: item.ownerWecomName || '',
    ownerAccountId: item.ownerAccountId,
    tags,
    tagLabels: mapTagLabels(item, tags),
    frozen: Number(item.frozen) === 1,
    afterSale: Number(item.afterSaleFlag) === 1,
    createTime: item.createdAt || '',
    orderType: typeText(item.orderType),
    orderTypeCode: item.orderType,
    orderModeCode: placeMode,
    orderMode: item.placeModeLabel || (placeMode ? modeText(placeMode) : ''),
    hideGameSpec: Boolean(item.hideGameSpec),
    /* ---- 接口已返回（后端已补齐） ---- */
    roleName: item.roleName || '',
    /* teamCode（组队码）：列表/详情已返回 */
    groupCode: item.teamCode || item.groupCode || '',
    /* 主子单：接口返回 MAIN/SUB（英文），attributeText 转中文；parentOrderId 兜底判断 */
    attribute: item.attribute ? attributeText(item.attribute) : (item.parentOrderId ? '子订单' : '—'),
    bound: !!item.parentOrderId,
    mainOrderId: item.parentOrderId,
    mainOrderNo: item.parentOrderNo || (item.parentOrderId ? String(item.parentOrderId) : ''),
    children: item.children || [], // [{ id, orderNo }]
    refunded: !!item.refunded, // 退款标记（接口已返回）
    partialRefunded: Number(item.partialRefunded) === 1,
    groupQrUrl: item.groupQrUrl || '', // 企业群二维码
    /* 存单（hold 对象：form/stored/warrantyTarget/reason/rounds/shots/doneAmount/remainAmount/remark） */
    hold: item.hold || null,
    depositTarget: item.hold && item.hold.warrantyTarget != null ? String(item.hold.warrantyTarget) : (item.depositTarget || ''),
    depositReason: (item.hold && item.hold.reason) || item.depositReason || '',
    depositFirst: item.hold && item.hold.rounds && item.hold.rounds[0] != null ? String(item.hold.rounds[0]) : (item.depositFirst || ''),
    depositSecond: item.hold && item.hold.rounds && item.hold.rounds[1] != null ? String(item.hold.rounds[1]) : (item.depositSecond || ''),
    depositImages: (item.hold && item.hold.shots) || item.depositImages || [],
    depositRemark: (item.hold && item.hold.remark) || item.depositRemark || '',
    depositStored: isOrderStored(item),
    /* 完成凭证：coverUrl 首图 / endUrl 尾图 / progressUrls 进程图（接口已返回） */
    proofFirst: item.coverUrl || '',
    proofLast: item.endUrl || '',
    proofProcess: item.progressUrls || [],
    proofUploadTime: item.proofUploadTime || '',
    playerRemark: item.playerRemark || '',
    lastRejectReason: item.rejectReason || item.lastRejectReason || '',
    /* 待接单名额数（原型：待接单(1/2) = 当前接单/总数）：列表返回 takenCount/playerCount 时自动拼，未返回则留空 */
    playerCount: item.playerCount,
    takenCount: item.takenCount,
    assignedPlayerCount: item.assignedPlayerCount,
    statusCount: item.takenCount != null && item.playerCount != null ? `${item.takenCount}/${item.playerCount}` : '',
    /* 打手槽位（playerName/clubName/clubId/playerId），详情/指派仍用 slots */
    slots: item.slots || [],
    /* 列表行直接返回的打手姓名数组 / 俱乐部名称，列表「打手」「俱乐部」列优先绑这两个字段 */
    playerNames: Array.isArray(item.playerNames) ? item.playerNames : [],
    clubName: item.clubName || '',
  };
}

const fmtDay = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** 时间筛选传参：yyyy-MM-ddTHH:mm:ss（后端只接受 yyyy-MM-dd 或 yyyy-MM-ddTHH:mm:ss，空格分隔会报 400） */
const fmtDateTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

function buildParams() {
  const [fromDay, toDay] = Array.isArray(filter.createTime) ? filter.createTime : [];
  const params = {
    page: page.value,
    pageSize: pageSize.value,
    orderNo: String(filter.orderNo || '').trim(),
    thirdOrderNo: String(filter.thirdOrderNo || '').trim(),
    channelCode: filter.channel,
    status: filter.status === 'STORED' ? '' : filter.status,
    ...(filter.status === 'STORED' ? { stored: 1 } : {}),
    auditStatus: filter.auditStatus,
    orderType: filter.orderType,
    placeMode: filter.orderMode,
    from: fmtDateTime(fromDay),
    to: fmtDateTime(toDay),
  };
  const specKeyword = String(filter.specKeyword || '').trim();
  if (specKeyword) params.specKeyword = specKeyword;
  // ownerId/ownerName 仅 scope=ALL 时有效（新 OpenAPI）
  if (scope.value === 'all' && filter.ownerId !== '' && filter.ownerId !== null && filter.ownerId !== undefined) {
    const n = Number(filter.ownerId);
    if (Number.isFinite(n) && n > 0) params.ownerId = n;
  }
  if (scope.value === 'all' && String(filter.claimer || '').trim()) {
    params.ownerName = String(filter.claimer).trim(); // 客服姓名/企微模糊
  }
  // 俱乐部/打手：选中俱乐部传 clubId，选中打手传 playerId（后端按 AND 匹配）
  const party = filter.clubPlayer;
  if (party && party.id) {
    if (party.type === 'CLUB') params.clubId = party.id;
    else if (party.type === 'PLAYER') params.playerId = party.id;
  }
  // 订单属性/标签：新 OpenAPI 已支持，原型中文做枚举映射后参与查询
  const attrEnum = ATTR_ENUM[filter.attribute];
  if (attrEnum) params.attribute = attrEnum;
  const tagEnum = TAG_ENUM[filter.tag];
  if (tagEnum) params.tag = tagEnum;
  return params;
}

async function fetchList() {
  loading.value = true;
  const requestedScope = scope.value;
  try {
    // 我的订单/全部订单：两个接口切换（mine/all），后续统一为 orderApi.list({ scope }) 查询方式
    const res = requestedScope === 'mine'
      ? await orderApi.mine(buildParams())
      : await orderApi.all(buildParams());
    const list = (res && res.list) || [];
    rawOrderItems.value = list;
    rows.value = list.map(mapOrderRow);
    total.value = (res && res.total) || 0;
    waitClaimCount.value = Number(res?.statusCounts?.WAIT_CLAIM) || 0;
    orderListFeedCount.value = 0;
    claimFeedCount.value = 0;
    newFeedCount.value = 0;
    orderFeedSubscription?.update({
      sinceId: maxOrderId(list),
      scope: requestedScope === 'mine' ? 'MINE' : 'ALL',
    });
    claimFeedSubscription?.update({ sinceId: maxOrderId(list) });
  } catch {
    rawOrderItems.value = [];
    rows.value = [];
    total.value = 0;
    waitClaimCount.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch(values) {
  Object.assign(filter, values);
  if (filter.status === 'WAIT_CLAIM') scope.value = 'all';
  rememberFilter(filter, true);
  fetchList();
}

function handleReset() {
  Object.keys(filter).forEach((key) => {
    if (Array.isArray(filter[key])) filter[key] = [];
    else filter[key] = '';
  });
  clubPlayerOptions.value = [];
  clubPlayerPage.value = 1;
  clubPlayerHasMore.value = true;
  clubPlayerKeyword.value = '';
  clubPlayerLoaded.value = false;
  searchComponentRef.value?.setFormData(filter);
  searchComponentRef.value?.clearValidate();
  rememberFilter(filter, true);
  fetchList();
}

function refreshOrderList() {
  handleReset();
}

function openClaim(row) {
  if (!canClaim(row)) {
    show('该订单当前不可认领，请刷新订单列表', 'warning');
    fetchList();
    return;
  }
  openEdit(row, { skipGuard: true, claimMode: true });
}

onMounted(() => {
  listViewMounted = true;
  orderFeedSubscription = subscribeOrderFeed('orderList', (count) => {
    orderListFeedCount.value = count;
    newFeedCount.value = orderListFeedCount.value + claimFeedCount.value;
  });
  claimFeedSubscription = subscribeOrderFeed('claimHall', (count) => {
    claimFeedCount.value = count;
    newFeedCount.value = orderListFeedCount.value + claimFeedCount.value;
  });
  fetchList();
  loadCatalog();
  loadChannels();
});

onBeforeUnmount(() => {
  listViewMounted = false;
  if (specSearchTimer) clearTimeout(specSearchTimer);
  specSearchSequence += 1;
  if (clubPlayerTimer) clearTimeout(clubPlayerTimer);
  clubPlayerSequence += 1;
  orderFeedSubscription?.close();
  claimFeedSubscription?.close();
  if (playersSearchTimer) clearTimeout(playersSearchTimer);
  playersRequestSequence += 1;
  if (midReplaceSearchTimer) clearTimeout(midReplaceSearchTimer);
  midReplaceSearchSequence += 1;
  midReplaceDetailSequence += 1;
  clearPayVoucher();
  clearPriceProof();
});

/* ===== 表格列（依据原型列顺序：本平台订单号/第三方订单号/订单金额（元）/购买项目/游戏名称/客户端/游戏规格/角色名/订单状态/审核状态/订单属性/领取人/创建时间/操作；标签并入订单状态列） ===== */
const columns = [
  { key: 'orderNo', title: '本平台订单号' },
  { key: 'thirdOrderNo', title: '第三方订单号' },
  { key: 'amount', title: '订单金额（元）' },
  { key: 'platformAdjust', title: '平台加减价（元）' },
  { key: 'clubAdjust', title: '俱乐部加减价（元）' },
  { key: 'dispatchAmount', title: '派单价（元）' },
  { key: 'product', title: '购买项目', width: 280, wrap: true },
  { key: 'gameName', title: '游戏名称', width: 140 },
  { key: 'clientType', title: '客户端' },
  { key: 'spec', title: '游戏规格' },
  { key: 'player', title: '打手' },
  { key: 'club', title: '俱乐部' },
  { key: 'roleName', title: '角色名' },
  { key: 'status', title: '订单状态' },
  { key: 'auditStatus', title: '审核状态' },
  { key: 'attribute', title: '订单属性' },
  { key: 'claimer', title: '领取人' },
  { key: 'createTime', title: '创建时间' },
  { key: 'op', title: '操作' },
];

const COLUMN_VISIBILITY_STORAGE_KEY = 'futurecave-order-list-visible-columns-v2';
const LEGACY_COLUMN_VISIBILITY_STORAGE_KEY = 'futurecave-order-list-visible-columns';
const fixedColumnKeys = ['op'];
const configurableColumns = columns.filter((column) => !fixedColumnKeys.includes(column.key));
const defaultVisibleColumnKeys = configurableColumns.map((column) => column.key);

function readVisibleColumnKeys() {
  try {
    const currentSaved = JSON.parse(localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY) || 'null');
    if (Array.isArray(currentSaved)) {
      return configurableColumns
        .filter((column) =>
          currentSaved.includes(column.key) ||
          ['platformAdjust', 'clubAdjust'].includes(column.key)
        )
        .map((column) => column.key);
    }

    const saved = JSON.parse(localStorage.getItem(LEGACY_COLUMN_VISIBILITY_STORAGE_KEY) || 'null');
    if (Array.isArray(saved)) {
      return configurableColumns
        .filter((column) => column.key === 'orderNo' || saved.includes(column.key))
        .map((column) => column.key);
    }
  } catch {
    // Ignore invalid or unavailable local storage and use the default columns.
  }
  return [...defaultVisibleColumnKeys];
}

const visibleColumnKeys = ref(readVisibleColumnKeys());
const visibleColumns = computed(() =>
  columns.filter(
    (column) => fixedColumnKeys.includes(column.key) || visibleColumnKeys.value.includes(column.key)
  )
);
const columnChooserVisible = ref(false);

watch(
  visibleColumnKeys,
  (keys) => {
    try {
      localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(keys));
    } catch {
      // Column selection still works for the current page if storage is unavailable.
    }
  },
  { deep: true }
);

function showAllColumns() {
  visibleColumnKeys.value = [...defaultVisibleColumnKeys];
}

/* ===== 操作按钮可见规则（依据原型字段说明 + 角色权限：客服=除审核都可操作、审核员=仅有审核查看、管理员=所有按钮） ===== */
function canEdit(row) {
  return ['admin', 'service'].includes(userStore.role) &&
    !['已完成', '已关闭', '交易关闭'].includes(row.status);
}

function canManageHold(row) {
  const status = row.statusCode || row.status;
  return ['admin', 'service'].includes(userRole.value) &&
    !row.afterSale &&
    !(row.tags || []).includes('售后中') &&
    !['已完成', '已关闭', '交易关闭', 'COMPLETED', 'CLOSED'].includes(status);
}

function canShow(row, action) {
  const isStored = Boolean(row.depositStored || row.hold?.stored);
  if (isStored) return action === '编辑' && ['admin', 'service'].includes(userRole.value);
  if (row.statusCode === 'WAIT_CLAIM') {
    return action === '认领' && canClaim(row);
  }
  if (action === '认领') return false;
  /* 角色维度 */
  if (action === '审核') return ['admin', 'audit', 'finance'].includes(userRole.value) && row.auditStatus === '待审核';
  /* 查看：对当前用户不可编辑的可查看状态展示，避免编辑/查看入口重复 */
  if (action === '查看')
    return !canEdit(row) && (
      ['待接单', '已完成', '交易关闭'].includes(row.status) ||
      (row.status === '进行中' && row.auditStatus !== '未提交')
    );
  if (isAudit.value || isFinance.value) return false; // 审核员和财务除"审核/查看"外无其他操作按钮

  /* 状态维度（bound/refunded 接口暂未返回，待后端补充后自动收紧） */
  switch (action) {
    case '编辑': return canEdit(row);
    case '绑主单': return ['admin', 'service'].includes(userStore.role) && ['待派单', '待接单', '进行中'].includes(row.status) && !row.frozen && !row.bound && !(row.children || []).length;
    case '绑定子单': return ['admin', 'service'].includes(userStore.role) && !row.bound && !['已完成', '交易关闭', '待支付', '待领取'].includes(row.status);
    case '派单': return ['待派单', '待接单'].includes(row.status);
    case '加减价': return ['待派单', '进行中'].includes(row.status) &&
      !row.refunded &&
      !row.midReplace &&
      !row.midReplaceWaiting &&
      !(row.tags || []).includes('部分退款');
    case '作废': return ['admin', 'service'].includes(userRole.value) &&
      row.manualCreated === true &&
      row.canApplyVoid === true &&
      !['已完成', '交易关闭'].includes(row.status);
    case '呼叫': return !['已完成', '交易关闭'].includes(row.status);
    case '解绑': return ['待派单', '进行中'].includes(row.status) && row.bound;
    case '冻结': return !['已完成', '交易关闭'].includes(row.status) && !row.frozen;
    case '解冻': return row.frozen;
    /* 退款：原型「仅冻结后展示，点击后输入退款金额」；抖音订单不支持人工部分退款（提交时校验） */
    case '退款': return row.frozen && !row.refunded;
    case '转单': return ['admin', 'service'].includes(userStore.role) && row.status === '进行中';
    case '回退': return ['admin', 'service'].includes(userStore.role) && row.canRollback === true;
    default: return false;
  }
}

function canClaim(row) {
  return !isFinance.value && row.statusCode === 'WAIT_CLAIM' && row.canClaim === true;
}

const TAG_CLASS_MAP = {
  呼叫: 'warn',
  卡单: 'warn',
  凭证提交超时: 'warn',
  待发货: 'info',
  已发货: 'success',
  售后中: 'danger',
  部分退款: 'danger',
  冻结: 'muted',
  存单: 'purple',
  转单: 'purple',
};

function tagClass(tag) {
  return TAG_CLASS_MAP[tag] || 'info';
}

/** 待接单订单带名额数展示：待接单(0/N)（statusCount 聚合字段接口待补充，兜底为空） */
function displayStatus(row) {
  if (row.status === '待接单' && row.statusCount) return `${row.status}(${row.statusCount})`;
  return row.status;
}

function approvalStatusLabel(status) {
  return ({ PENDING: '作废审批中', APPROVED: '作废已同意', REJECTED: '作废已驳回' })[status] || '';
}

async function requestVoid(row) {
  if (!row || !canShow(row, '作废')) return;
  const shouldSubmit = await confirm({
    title: '确认申请作废',
    message: `确定为订单 ${row.orderNo || row.id} 提交作废申请吗？提交后需管理员审批。`,
    okText: '提交作废申请',
  });
  if (!shouldSubmit) return;
  try {
    const result = await orderApi.applyVoidApproval(row.id);
    const approval = result?.data ?? result;
    row.canApplyVoid = false;
    row.voidApprovalStatus = approval?.status || 'PENDING';
    row.voidApprovalId = approval?.approvalId ?? approval?.id ?? row.voidApprovalId;
    show('作废申请已提交，等待管理员审批', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出。 */
  }
}

const syncingAfterSaleIds = ref(new Set());

function canSyncAfterSale(row) {
  return (
    ['admin', 'service'].includes(userRole.value) &&
    String(row.channelCode || '').toUpperCase() === 'DOUYIN' &&
    (row.afterSale || (row.tags || []).includes('售后中'))
  );
}

function isSyncingAfterSale(row) {
  return syncingAfterSaleIds.value.has(row.id);
}

async function syncAfterSale(row) {
  if (!canSyncAfterSale(row) || row.id == null || isSyncingAfterSale(row)) return;
  syncingAfterSaleIds.value.add(row.id);
  try {
    const result = await orderApi.syncAfterSale(row.id);
    const updatedOrder = result?.data ?? result;
    if (!updatedOrder || typeof updatedOrder !== 'object' || Array.isArray(updatedOrder) || updatedOrder.id == null) {
      show('售后状态回查未返回有效订单数据，请刷新列表', 'warning');
      return;
    }

    const index = rows.value.findIndex((item) => String(item.id) === String(row.id));
    if (index >= 0) rows.value.splice(index, 1, mapOrderRow(updatedOrder));
    else await fetchList();
    show('售后状态已回查', 'success');
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    syncingAfterSaleIds.value.delete(row.id);
  }
}

/* ===== 详情（接口：GET /{id} + GET /{id}/logs） ===== */
const detailVisible = ref(false);
const detailRow = ref(null);
const detailLogs = ref([]);

const editRequestVisible = ref(false);
const editRequestSubmitting = ref(false);
const editRequestRow = ref(null);
const editRequestForm = reactive({ gameId: '', specId: '', product: '', amount: '' });

function openEditRequest(row) {
  if (!row?.manualCreated || row.canApplyEdit !== true) return;
  editRequestRow.value = row;
  Object.assign(editRequestForm, {
    gameId: row.gameId ?? '',
    specId: row.specId ?? '',
    product: row.product || '',
    amount: row.amount ?? '',
  });
  editRequestVisible.value = true;
}

const editRequestSpecOptions = computed(() => specOptionsOf(editRequestForm.gameId));

async function submitEditRequest() {
  const row = editRequestRow.value;
  if (!row || editRequestSubmitting.value) return;
  if (row.manualCreated !== true || row.canApplyEdit !== true) {
    return show('该订单当前不可申请编辑，请刷新订单后重试', 'warning');
  }
  if (!editRequestForm.gameId) return show('请选择游戏名称', 'warning');
  if (!editRequestForm.specId) return show('请选择游戏规格', 'warning');
  const product = String(editRequestForm.product || '').trim();
  if (!product) return show('请输入购买项目', 'warning');
  if (product.length > 50) return show('购买项目不能超过50字', 'warning');
  const amountText = String(editRequestForm.amount ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(amountText) || Number(amountText) <= 0) {
    return show('订单金额需大于0，最多两位小数', 'warning');
  }
  editRequestSubmitting.value = true;
  try {
    const shouldSubmit = await confirm({
      title: '确认提交编辑申请',
      message: `将为订单 ${row.orderNo || row.id} 提交一次编辑申请，待管理员审批。`,
      okText: '提交申请',
    });
    if (!shouldSubmit) return;
    const result = await orderApi.applyEditApproval(row.id, {
      gameId: Number(editRequestForm.gameId),
      specId: Number(editRequestForm.specId),
      itemName: product,
      amount: Number(amountText),
    });
    const approval = result?.data ?? result;
    const updates = {
      canApplyEdit: false,
      editApprovalStatus: approval?.status || 'PENDING',
      editApprovalId: approval?.approvalId ?? approval?.id ?? row.editApprovalId ?? null,
    };
    Object.assign(row, updates);
    if (editRow.value && String(editRow.value.id) === String(row.id)) Object.assign(editRow.value, updates);
    editRequestVisible.value = false;
    show('编辑申请已提交，等待管理员审批', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出。 */
  } finally {
    editRequestSubmitting.value = false;
  }
}

function mapDetail(item = {}) {
  return {
    // 复用列表行映射：hold（存单）/coverUrl/endUrl/progressUrls（凭证）/refunded/children/
    // parentOrderNo/playerRemark/rejectReason/游戏名/规格名 等后端已补齐字段直接可用
    ...mapOrderRow(item),
    // 详情专属字段
    shopId: item.shopId || '',
    refundedAmount: Number(item.refundedAmount) || 0,
    playerCount: item.playerCount,
    takenCount: item.takenCount,
    assignedPlayerCount: item.assignedPlayerCount,
    platformAdjust: item.platformAdjust, // 减价为负
    clubAdjust: item.clubAdjust, // 减价为负
    settleDueAt: item.settleDueAt || '',
    settleDaysSnapshot: item.settleDaysSnapshot,
    slots: (item.slots || []).map((s) => ({ ...s })),
    freezeReason: item.freezeReason || '',
    rejectCount: item.rejectCount || 0,
  };
}

async function openDetail(row) {
  try {
    const [detail, logs] = await Promise.all([orderApi.detail(row.id), orderApi.logs(row.id)]);
    detailRow.value = { ...mapDetail(detail), ...row };
    detailLogs.value = (logs || []).map((l) => ({
      time: l.createdAt || '',
      text: l.content || '',
      op: l.operatorName || '',
      action: l.action || '',
    }));
    detailVisible.value = true;
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  }
}

/* ===== 编辑（接口：POST /{id}/maintain 维护订单信息） ===== */
const editVisible = ref(false);
const editLoading = ref(false);
const editSaving = ref(false);
const editRow = ref(null);
const editLogs = ref([]);
const editDialogRef = ref(null);
const editClaimMode = ref(false);
const editClaimed = ref(false);

watch(editVisible, (visible) => {
  if (!visible) {
    editClaimMode.value = false;
    editClaimed.value = false;
  }
});

async function openEdit(row, options = {}) {
  editClaimMode.value = Boolean(options.claimMode);
  editClaimed.value = false;
  if (!options.skipGuard && !canShow(row, '编辑')) return;
  editRow.value = null;
  editLoading.value = true;
  editLogs.value = [];
  editVisible.value = true;
  try {
    // 详情+日志：为编辑弹窗的打手信息/存单/凭证/日志区块补齐接口数据
    const [, detail, logs] = await Promise.all([
      loadCatalog(),
      orderApi.detail(row.id),
      orderApi.logs(row.id),
    ]);
    const detailRow = mapDetail(detail);
    const current = {
      ...row,
      ...detailRow,
      status: detail?.status != null && detail.status !== '' ? detailRow.status : row.status,
      statusCode: detail?.status != null && detail.status !== '' ? detail.status : row.statusCode,
      canClaim: detail?.canClaim == null ? row.canClaim : detail.canClaim === true,
    };
    if (options.claimMode ? !canClaim(current) : !canShow(current, '编辑')) {
      editVisible.value = false;
      show(
        options.claimMode
          ? '该订单状态已变化，无法认领，请刷新列表'
          : '当前订单状态已变化，无法编辑，请刷新列表',
        'warning'
      );
      return;
    }
    if (current.gameId != null && current.specId != null) {
      let specs = [];
      try {
        specs = await gameApi.specs(current.gameId, { includeId: current.specId });
      } catch {
        // 请求失败仍可用详情名称回显当前规格。
      }
      let game = catalog.value.find((game) => Number(game.id) === Number(current.gameId));
      if (!game) {
        game = { id: current.gameId, name: current.gameName, specs: [] };
        catalog.value.push(game);
      }
      const byId = new Map(game.specs.map((spec) => [Number(spec.id), spec]));
      specs.forEach((spec) => byId.set(Number(spec.id), {
        ...byId.get(Number(spec.id)),
        ...spec,
        requireClubNetPrice: spec.requireClubNetPrice === true,
      }));
      if (!byId.has(Number(current.specId))) {
        byId.set(Number(current.specId), { id: current.specId, name: current.spec });
      }
      game.specs = [...byId.values()];
    }
    editRow.value = current;
    editLogs.value = (logs || []).map((l) => ({
      time: l.createdAt || '',
      text: l.content || '',
      op: l.operatorName || '',
      action: l.action || '',
    }));
  } catch {
    editVisible.value = false;
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    editLoading.value = false;
  }
}

async function saveEdit(form) {
  const row = editRow.value;
  const isClaiming = editClaimMode.value && !editClaimed.value;
  if (!row || editSaving.value) return;
  if (isClaiming && !canClaim(row)) {
    show('该订单状态已变化，无法认领，请刷新列表', 'warning');
    editVisible.value = false;
    fetchList();
    return;
  }
  if (!isClaiming && !editClaimMode.value && !canShow(row, '编辑')) return;
  const isStored = Boolean(row.depositStored || row.hold?.stored);
  const holdOnly = isStored || (row.statusCode === 'WAIT_CLAIM' && !editClaimMode.value);
  if (holdOnly && !form.holdUpdate) {
    return show(isStored ? '请取消存单后保存以释放' : '请勾选存单后再保存', 'warning');
  }
  editSaving.value = true;
  if (isClaiming) {
    const claimData = form.groupQrUrl ? { groupQrUrl: form.groupQrUrl } : {};
    try {
      const getMacAddress = window.appActions?.getMacAddress;
      if (typeof getMacAddress !== 'function') {
        show('客户端暂不支持读取 MAC 地址，本次认领将不携带设备信息', 'warning');
      } else {
        const macAddress = await getMacAddress();
        if (/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(macAddress || '')) {
          claimData.deviceMac = macAddress;
        } else {
          show('未能读取有效的本机 MAC 地址，本次认领将不携带设备信息', 'warning');
        }
      }
    } catch (error) {
      show(error?.message || '读取本机 MAC 地址失败，本次认领将不携带设备信息', 'warning');
    }

    try {
      await orderApi.claim(row.id, claimData);
      editClaimed.value = true;
    } catch {
      /* 错误提示由 request.js 统一弹出。 */
      editSaving.value = false;
      return;
    }
  }
  if (holdOnly) {
    try {
      await orderApi.hold(row.id, form.holdUpdate);
      editVisible.value = false;
      show(isStored ? '存单已释放，订单恢复可编辑' : '存单已保存，订单已锁定', 'success');
      fetchList();
    } catch {
      /* 错误提示由 request.js 统一弹出。 */
    } finally {
      editSaving.value = false;
    }
    return;
  }
  let maintained = false;
  try {
    // amount：不传保持原金额，已退款订单后端拒绝修改；groupQrUrl：传空串清除，不传保持原值
    await orderApi.maintain(row.id, {
      ...(editClaimMode.value ? {
        gameId: form.gameId,
        specId: form.specId,
        ...(form.amount !== undefined ? { amount: form.amount } : {}),
        clients: form.clients,
      } : {}),
      ...(row.status === '待派单' || row.statusCode === 'WAIT_DISPATCH'
        ? { clients: form.clients }
        : {}),
      orderType: form.orderType,
      roleName: form.roleName,
      teamCode: form.teamCode,
      remark: form.remark,
      systemRemark: form.systemRemark,
      groupQrUrl: form.groupQrUrl,
      ...(form.insuranceSlots !== '' && form.insuranceSlots != null
        ? { insuranceSlots: Number(form.insuranceSlots) }
        : {}),
      ...(form.clubNetPrice !== undefined
        ? { clubNetPrice: Number(form.clubNetPrice) }
        : {}),
    });
    maintained = true;
    if (form.holdUpdate && canManageHold(row)) {
      await orderApi.hold(row.id, form.holdUpdate);
      row.hold = { ...row.hold, ...form.holdUpdate };
    }
    // 领取人（所属客服）不在本弹窗修改：列表领取人列铅笔 → 独立弹窗调 PUT /{id}/owner
    editVisible.value = false;
    show(isClaiming ? '认领成功，订单信息已保存' : '保存成功', 'success');
    fetchList();
  } catch {
    if (maintained) show('订单信息已保存，但存单保存失败，请重试', 'warning');
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    editSaving.value = false;
  }
}

function canSaveEdit(row) {
  const holdOnly = Boolean(row?.depositStored || row?.hold?.stored || row?.statusCode === 'WAIT_CLAIM');
  return !holdOnly || row?.hold?.editable === true;
}

/* ===== 新增订单（接口：POST /api/admin/orders 人工新增；字段与后端最新契约对齐 2026-10-22）
 * 字段规则（后端确认，测试服已验证）：
 * - 所属渠道：必填，传渠道编码或渠道名称；抖音仍走渠道同步，不能人工新增（下拉已过滤）
 * - 第三方订单号：必填，最多64字；单价：必填，大于0，最多两位小数
 * - 购买项目：必填，最多50字；客户端：必填，端游/手游可多选（提交中文逗号分隔）
 * - 游戏名称/规格：必填，规格必须属于所选游戏（提交真实 gameId/specId）
 * - 角色名：选填；保险格数：选填，非负整数；quantity：选填，1～99 的整数
 * - 不传 quantity 按 1，后端按单价 × 数量落订单金额
 * - 订单类型：可不填，只能是常规单或特惠单，不填按常规单（提交规范英文码 NORMAL/DISCOUNT，后端确认中英文都能收）
 * - 初始打手人数固定 1 人，由后端管理；接单后由打手邀请队友
 * - 店铺ID/备注不在新增表单上（后端不接收，传了也丢弃），不展示不提交
 */
const addVisible = ref(false);
const addSubmitting = ref(false);
const addPasteText = ref('');
const payVoucherFile = ref(null);
const payVoucherPreview = ref('');
let uploadedPayVoucherUrl = '';

function clearPayVoucher() {
  if (payVoucherPreview.value) URL.revokeObjectURL(payVoucherPreview.value);
  payVoucherFile.value = null;
  payVoucherPreview.value = '';
  uploadedPayVoucherUrl = '';
}

function selectPayVoucher(file) {
  if (!file || addSubmitting.value) return;
  if (!file.type.startsWith('image/')) return show('请选择图片文件', 'warning');
  clearPayVoucher();
  payVoucherFile.value = file;
  payVoucherPreview.value = URL.createObjectURL(file);
}

function changePayVoucher(event) {
  selectPayVoucher(event.target.files?.[0]);
  event.target.value = '';
}

function pastePayVoucher(event) {
  const item = Array.from(event.clipboardData?.items || []).find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  const file = item?.getAsFile();
  if (!file) return;
  event.preventDefault();
  selectPayVoucher(file);
}

function dropPayVoucher(event) {
  const files = Array.from(event.dataTransfer?.files || []);
  selectPayVoucher(files.find((file) => file.type.startsWith('image/')) || files[0]);
}

watch(addVisible, (visible) => { if (!visible) clearPayVoucher(); });
const addForm = reactive({
  channel: '',
  thirdOrderNo: '',
  amount: '',
  product: '',
  clientType: [],
  gameId: '',
  specId: '',
  roleName: '',
  insuranceSlots: '',
  quantity: 1,
  orderType: '',
});

function parseAddOrderText(text) {
  const firstRecord = String(text || '').trim().split(/\r?\n\s*\r?\n/)[0];
  if (!firstRecord) return;

  const values = new Map();
  firstRecord.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([^:：]+)\s*[:：]\s*(.*?)\s*$/);
    if (!match) return;
    const key = match[1].trim().toLowerCase().replace(/[\s_\-]/g, '');
    values.set(key, match[2].trim());
  });

  const amountKey = ['门店金额', '单价', '金额'].find((key) => values.has(key));
  const orderNoKey = ['订单编号', '订单号', '第三方订单号'].find((key) => values.has(key));
  const productKey = ['购买项目', '商品名称'].find((key) => values.has(key));
  const clientKey = ['pc/手游', '客户端', '平台'].find((key) => values.has(key));
  const roleNameKey = ['角色名', '角色名称'].find((key) => values.has(key));
  const insuranceSlotsKey = ['保险格数', '保险箱格数'].find((key) => values.has(key));
  const recognized = [];

  if (amountKey) {
    addForm.amount = values.get(amountKey);
    recognized.push('单价');
  }
  if (orderNoKey) {
    addForm.thirdOrderNo = values.get(orderNoKey);
    recognized.push('第三方订单号');
  }
  if (productKey) {
    addForm.product = values.get(productKey);
    recognized.push('购买项目');
  }
  if (clientKey) {
    const clientText = values.get(clientKey);
    const normalizedClientText = clientText.toLowerCase();
    const clientTypes = [];
    if (normalizedClientText.includes('pc') || clientText.includes('端游')) clientTypes.push('端游');
    if (clientText.includes('手游') || /mobile|android|ios/i.test(clientText)) clientTypes.push('手游');
    addForm.clientType = clientTypes;
    recognized.push('客户端');
  }
  if (roleNameKey) {
    addForm.roleName = values.get(roleNameKey);
    recognized.push('角色名');
  }
  if (insuranceSlotsKey) {
    addForm.insuranceSlots = values.get(insuranceSlotsKey);
    recognized.push('保险格数');
  }

  if (recognized.length) {
    show(`已识别并填入：${recognized.join('、')}`, 'success');
  } else {
    show('没有识别到可填写的字段，请检查订单文本格式', 'warning');
  }
}

function pasteAddOrderText(event) {
  const text = event.clipboardData?.getData('text/plain');
  if (!text) return;
  event.preventDefault();
  addPasteText.value = text;
  parseAddOrderText(text);
}

/* 渠道数据：全部来自后端接口 GET /api/admin/channels（无本地硬编码渠道、无 mock）。
 * 一份全量数据供两处使用：新增弹窗下拉（过滤抖音）与列表筛选下拉（含抖音）。 */
const rawChannels = ref([]); // 渠道层原样数据 [{ id, name, code, editable, shops }]（不展开 shops）
const channelsLoaded = ref(false);
const channelLoading = ref(false);

/* 渠道字段兼容：后端列表接口返回 name（渠道名）+ code（渠道编码，服务端生成），
 * 早期/历史结构可能为 shopName / channelCode，统一兼容读取（后端确认：名称字段是 name、编码字段是 code） */
const channelNameOf = (ch = {}) => String(ch.name || ch.shopName || ch.channelName || '').trim();
const channelCodeOf = (ch = {}) => String(ch.channelCode || ch.code || '').trim();

const isDouyinChannel = (ch = {}) => {
  const code = channelCodeOf(ch).toUpperCase();
  const name = channelNameOf(ch);
  return code === 'DOUYIN' || code.startsWith('DOUYIN') || name === '抖音' || name.includes('抖音');
};

async function loadChannels() {
  if (channelsLoaded.value) return;
  channelLoading.value = true;
  try {
    rawChannels.value = (await channelApi.list()) || [];
    channelsLoaded.value = true;
    if (rawOrderItems.value.length) {
      rows.value = rawOrderItems.value.map(mapOrderRow);
    }
  } catch {
    rawChannels.value = []; // 拉取失败不置 loaded，下次自动重试
  } finally {
    channelLoading.value = false;
  }
}

/** 渠道项 → 下拉选项：label 优先渠道名（后端 name），value 优先渠道编码（后端接受编码或名称）；
 * 名称和编码都读不到的行剔除（无可用标识、空 value 会导致下拉选不中） */
const toChannelOption = (ch) => {
  const code = channelCodeOf(ch);
  const name = channelNameOf(ch);
  return { label: name || code, value: code || name };
};

/** 新增弹窗渠道下拉：真实渠道，剔除抖音（抖音走渠道同步，人工建单会拒绝） */
const addChannelOptions = computed(() =>
  rawChannels.value.filter((ch) => !isDouyinChannel(ch)).map(toChannelOption).filter((opt) => opt.value)
);

/** 列表筛选渠道下拉：全部真实渠道（含抖音，展示 name、值为 code，供服务端按 channelCode 查询） */
const filterChannelOptions = computed(() => [
  { label: '全部', value: '' },
  ...rawChannels.value.map(toChannelOption).filter((opt) => opt.value),
]);

/* 渠道编码 → 名称映射（后端契约：列表/详情只回 channelCode，渠道列显示名称用渠道接口 code→name 映射，
 * 不使用写死的 DOUYIN / XHS / PRIVATE；映射来源 GET /api/admin/channels） */
const channelNameMap = computed(() => {
  const map = new Map();
  rawChannels.value.forEach((ch) => {
    const code = channelCodeOf(ch);
    const name = channelNameOf(ch);
    if (code) map.set(code, name || code);
  });
  return map;
});

/** 渠道编码 → 渠道名称；未匹配到时原样显示编码 */
function channelDisplayName(code) {
  if (!code) return '—';
  const key = String(code).trim();
  return channelNameMap.value.get(key) || key;
}

function openAdd() {
  if (isFinance.value || addSubmitting.value) return;
  clearPayVoucher();
  addPasteText.value = '';
  Object.assign(addForm, {
    channel: '', thirdOrderNo: '', amount: '', product: '',
    clientType: [], gameId: '', specId: '', roleName: '', insuranceSlots: '',
    quantity: 1, orderType: '',
  });
  loadCatalog();
  loadChannels(); // 首次打开时拉取真实渠道（新增与列表筛选共用）
  addVisible.value = true;
}

const addSpecOptions = computed(() => specOptionsOf(addForm.gameId));

async function submitAdd() {
  if (isFinance.value || addSubmitting.value) return;
  const { channel, thirdOrderNo, amount, product, clientType, gameId, specId, roleName, insuranceSlots, quantity } = addForm;
  if (!String(channel || '').trim()) return show('请选择所属渠道', 'warning');
  const thirdNo = String(thirdOrderNo || '').trim();
  if (!thirdNo) return show('请输入第三方订单号', 'warning');
  if (thirdNo.length > 64) return show('第三方订单号最多64字', 'warning');
  const amountStr = String(amount ?? '').trim();
  if (!amountStr) return show('请输入单价', 'warning');
  if (!/^\d+(\.\d{1,2})?$/.test(amountStr)) return show('单价需大于0，最多两位小数', 'warning');
  const amountNum = Number(amountStr);
  if (!Number.isFinite(amountNum) || amountNum <= 0) return show('单价需大于0', 'warning');
  if (!String(product || '').trim()) return show('请输入购买项目', 'warning');
  if (String(product).trim().length > 50) return show('购买项目不能超过50字', 'warning');
  if (!clientType.length) return show('请选择客户端', 'warning');
  if (!gameId) return show('请选择游戏名称', 'warning');
  if (!specId) return show('请选择游戏规格', 'warning');
  const insuranceSlotsText = String(insuranceSlots ?? '').trim();
  let insuranceSlotsNum;
  if (insuranceSlotsText) {
    insuranceSlotsNum = Number(insuranceSlotsText);
    if (!Number.isInteger(insuranceSlotsNum) || insuranceSlotsNum < 0) {
      return show('保险格数需为大于或等于0的整数', 'warning');
    }
  }
  const quantityText = String(quantity ?? '').trim();
  let quantityNum;
  if (quantityText) {
    quantityNum = Number(quantityText);
    if (!Number.isInteger(quantityNum) || quantityNum < 1 || quantityNum > 99) {
      return show('数量需为1到99的整数', 'warning');
    }
  }

  const payload = {
    channelCode: String(channel).trim(), // 传渠道编码（后端也接受渠道名称）
    thirdOrderNo: thirdNo,
    amount: amountNum,
    itemName: String(product).trim(),
    clients: clientType.join(','), // 后端契约示例："端游,手游"
    gameId: Number(gameId),
    specId: Number(specId),
    ...(String(roleName || '').trim() ? { roleName: String(roleName).trim() } : {}),
    ...(insuranceSlotsNum !== undefined ? { insuranceSlots: insuranceSlotsNum } : {}),
    ...(quantityText ? { quantity: quantityNum } : {}),
  };
  // 订单类型：可不填，不填按常规单；填了提交规范英文码 NORMAL/DISCOUNT（后端确认中英文都能收、入库英文码；
  // 特惠单对应 DISCOUNT，SPECIAL 在新增里会被拒绝）
  if (addForm.orderType) payload.orderType = addForm.orderType;
  // 店铺ID/备注：不在新增表单上（后端不接收），不提交

  addSubmitting.value = true;
  try {
    if (payVoucherFile.value) {
      if (!uploadedPayVoucherUrl) {
        const result = await fileApi.upload(payVoucherFile.value);
        if (!result?.url) return show('支付凭证上传未返回图片地址，请重试', 'error');
        uploadedPayVoucherUrl = result.url;
      }
      payload.payVoucherUrl = uploadedPayVoucherUrl;
    }
    if (!addVisible.value) return;
    await orderApi.create(payload);
    addVisible.value = false;
    show('新增成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    addSubmitting.value = false;
  }
}

/* ===== 查看关系（children/parentOrderNo 已由订单详情接口返回，行内缺失时拉详情） ===== */
const relationVisible = ref(false);
const relationRow = ref(null);
const relationData = ref({ main: null, children: [] });

/** 从当前列表数据按订单号回查第三方订单号（关系数据只返回 orderNo 时兜底） */
function thirdNoOfOrderNo(orderNo) {
  if (!orderNo) return '';
  const hit = rows.value.find((item) => item.orderNo === orderNo);
  return (hit && hit.thirdOrderNo) || '';
}

async function openRelation(row) {
  relationRow.value = row;
  relationData.value = { main: null, children: [] };
  relationVisible.value = true;
  const useData = (d) => {
    relationData.value.children = (d.children || [])
      .filter((c) => c && c.orderNo)
      .map((c) => ({ ...c, thirdOrderNo: c.thirdOrderNo || thirdNoOfOrderNo(c.orderNo) }));
    if (d.parentOrderNo) {
      relationData.value.main = {
        orderNo: d.parentOrderNo,
        thirdOrderNo: d.parentThirdOrderNo || thirdNoOfOrderNo(d.parentOrderNo),
      };
    }
  };
  useData(row);
  if (!relationData.value.children.length || !relationData.value.main) {
    try {
      const detail = await orderApi.detail(row.id);
      if (detail) useData(detail);
    } catch {
      /* 详情拉取失败时保留行内已有数据 */
    }
  }
}

const relationMainNo = computed(() => {
  const row = relationRow.value;
  if (!row) return '—';
  if (row.attribute === '子订单') return row.mainOrderNo || '—';
  if (relationData.value.main) return relationData.value.main.orderNo;
  return row.orderNo;
});

/** 主订单的第三方订单号：主单行取行内值；当前行为子单时取主单第三方号，缺失再按列表兜底 */
const relationMainThirdNo = computed(() => {
  const row = relationRow.value;
  if (!row) return '—';
  const mainThird = (relationData.value.main && relationData.value.main.thirdOrderNo) || '';
  if (row.attribute === '子订单') return mainThird || thirdNoOfOrderNo(row.mainOrderNo) || '—';
  return mainThird || row.thirdOrderNo || thirdNoOfOrderNo(relationMainNo.value) || '—';
});

/* ===== 绑主单（接口：POST /{id}/bind，parentOrderId 必填） ===== */
const bindVisible = ref(false);
const bindRow = ref(null);
const bindForm = reactive({ parentOrderId: '' });
const bindCandidates = ref([]); // [{ id, orderNo, spec }]
const bindDirection = ref('parent');
const bindPickerVisible = ref(false);
const bindLoading = ref(false);
const bindSaving = ref(false);
const bindKeyword = ref('');
const bindPage = ref(1);
const bindTotal = ref(0);
const selectedBindCandidate = computed(() =>
  bindCandidates.value.find((item) => String(item.id) === String(bindForm.parentOrderId)),
);

function chooseBindCandidate(candidate) {
  bindForm.parentOrderId = candidate.id;
  bindPickerVisible.value = false;
}

async function loadBindCandidates() {
  if (bindLoading.value) return;
  bindLoading.value = true;
  bindForm.parentOrderId = '';
  bindCandidates.value = [];
  try {
    const params = { page: bindPage.value, pageSize: 50, ...(bindKeyword.value.trim() ? { orderNo: bindKeyword.value.trim() } : {}) };
    const res = bindDirection.value === 'parent'
      ? await orderApi.bindableParents({ ...params, excludeId: bindRow.value.id })
      : await orderApi.list({ ...params, scope: 'ALL' });
    const list = Array.isArray(res) ? res : (res?.list || []);
    bindTotal.value = Array.isArray(res) ? res.length : Number(res?.total) || 0;
    bindCandidates.value = list.filter((item) => {
      if (String(item.id) === String(bindRow.value.id)) return false;
      if (bindDirection.value === 'parent') return true;
      return !item.parentOrderId && item.attribute !== 'SUB' && Number(item.frozen) !== 1 &&
        ['WAIT_DISPATCH', 'WAIT_TAKE', 'IN_PROGRESS'].includes(item.status) && !(item.children || []).length;
    }).map((item) => ({ id: item.id, orderNo: item.orderNo, statusText: statusText(item.status) }));
  } finally {
    bindLoading.value = false;
  }
}

async function openBindChild(row) {
  if (!canShow(row, '绑定子单') || bindSaving.value) return;
  bindDirection.value = 'child';
  bindRow.value = row;
  bindKeyword.value = '';
  bindPage.value = 1;
  bindPickerVisible.value = false;
  bindVisible.value = true;
  try { await loadBindCandidates(); } catch { /* 请求层提示 */ }
}

async function changeBindPage(page) {
  if (bindLoading.value || bindSaving.value) return;
  bindPage.value = page;
  try { await loadBindCandidates(); } catch { /* 请求层提示 */ }
}

/** 可绑主单候选：GET /api/admin/orders/bindable-parents（excludeId 排除当前订单，避免绑自己） */
async function openBindMain(row) {
  if (!canShow(row, '绑主单') || bindSaving.value) return;
  bindDirection.value = 'parent';
  bindKeyword.value = '';
  bindPage.value = 1;
  bindPickerVisible.value = false;
  bindRow.value = row;
  bindForm.parentOrderId = '';
  bindCandidates.value = [];
  bindVisible.value = true;
  try {
    await loadBindCandidates();
  } catch {
    bindCandidates.value = [];
  }
}

async function submitBindMain() {
  const row = bindRow.value;
  if (!row || bindSaving.value || bindLoading.value) return;
  if (!bindForm.parentOrderId) return show('请选择绑定主单', 'warning');
  bindSaving.value = true;
  try {
    const childId = bindDirection.value === 'child' ? bindForm.parentOrderId : row.id;
    const parentId = bindDirection.value === 'child' ? row.id : bindForm.parentOrderId;
    const child = await orderApi.detail(childId);
    if (child.parentOrderId || child.attribute === 'SUB' || Number(child.frozen) === 1 ||
      !['WAIT_DISPATCH', 'WAIT_TAKE', 'IN_PROGRESS'].includes(child.status) || (child.children || []).length) {
      show('该订单已绑定、已有子单或状态不允许，请重新选择', 'warning');
      return;
    }
    await orderApi.bind(childId, { parentOrderId: parentId });
    bindVisible.value = false;
    show('绑定成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    bindSaving.value = false;
  }
}

/* ===== 解绑（接口：POST /orders/unbind 批量；候选=主订单+当前订单，主单行追加 children 子订单） ===== */
const unbindVisible = ref(false);
const unbindRow = ref(null);
const unbindOptions = ref([]);
const unbindSelected = ref([]);

async function openUnbind(row) {
  unbindRow.value = row;
  unbindSelected.value = [];
  const options = [];
  // 本订单为子订单时可列出主订单（parentOrderId/parentOrderNo 已返回）
  if (row.attribute === '子订单' && row.mainOrderNo) {
    const parentId = Number(row.mainOrderNo);
    if (Number.isFinite(parentId) && parentId > 0) {
      options.push({ id: parentId, no: row.mainOrderNo, label: '主订单' });
    }
  }
  options.push({ id: row.id, no: row.orderNo, label: '当前订单' });
  // 主订单行：拉详情取 children（子订单列表接口已返回），追加为解绑候选
  if (row.attribute !== '子订单') {
    try {
      const detail = await orderApi.detail(row.id);
      ((detail && detail.children) || []).forEach((c) => {
        if (c && c.id && c.orderNo) options.push({ id: c.id, no: c.orderNo, label: `子订单·${c.orderNo}` });
      });
    } catch {
      /* 详情拉取失败则仅保留基础候选 */
    }
  }
  unbindOptions.value = options;
  unbindVisible.value = true;
}

async function submitUnbind() {
  const row = unbindRow.value;
  if (!row) return;
  if (!unbindSelected.value.length) return show('请选择需要解绑的订单', 'warning');
  try {
    // 批量解绑：POST /api/admin/orders/unbind（orderIds 传订单 ID 数组；选单项已存 ID）
    const res = await orderApi.unbindBatch(unbindSelected.value);
    const failures = (res && res.failures) || [];
    if (failures.length) {
      show(`部分解绑失败：${failures.map((f) => f.message || `订单${f.orderId}`).join('；')}`, 'warning');
    } else {
      show('解绑成功', 'success');
    }
    unbindVisible.value = false;
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  }
}

/* ===== 派单（系统派单=SYSTEM 大厅；人工派单=CLUB 指定俱乐部，可选直接指派打手） ===== */
const dispatchVisible = ref(false);
const dispatchRow = ref(null);
const dispatchForm = reactive({
  dispatchType: '系统派单',
  club: '',
  targetPlayerId: '',
  players: [],
  dltOrderNo: '',
  dltPrice: '',
  dltRemark: '',
});
const clubOptions = ref([]); // [{ id, name }]
const playerOptions = ref([]); // [{ id, name }]
const dispatchLoading = ref(false);
const playersLoading = ref(false);
const clubAccepted = computed(() => Boolean(dispatchRow.value?.lockedClubId));
let playersSearchTimer = null;
let playersRequestSequence = 0;

async function loadClubOptions() {
  if (clubOptions.value.length) return;
  try {
    const res = await clubApi.list({ page: 1, pageSize: 100 });
    clubOptions.value = ((res && res.list) || []).map((c) => ({
      id: c.id,
      name: c.name || c.clubName || String(c.id),
    }));
  } catch {
    clubOptions.value = [];
  }
}

/** 按订单规格和昵称搜索可指派打手，列表接口已排除退店人员 */
async function loadPlayers(clubId, keyword = '') {
  const requestSequence = ++playersRequestSequence;
  if (playersSearchTimer) {
    clearTimeout(playersSearchTimer);
    playersSearchTimer = null;
  }
  if (!clubId || !dispatchRow.value) {
    playerOptions.value = [];
    playersLoading.value = false;
    return;
  }
  playersLoading.value = true;
  try {
    const res = await orderApi.assignablePlayers(dispatchRow.value.id, {
      clubId: Number(clubId),
      keyword: String(keyword || '').trim(),
    });
    if (requestSequence !== playersRequestSequence) return;
    const list = Array.isArray(res) ? res : (res?.list || []);
    const selectedIds = [dispatchForm.targetPlayerId, ...dispatchForm.players]
      .filter((id) => id !== '' && id != null)
      .map((id) => String(id));
    const retainedOptions = playerOptions.value.filter((player) => selectedIds.includes(String(player.id)));
    const fetchedOptions = list
      .map((player) => ({
        id: player.id ?? player.playerId,
        name: player.name || player.nickname || '',
      }))
      .filter((player) => player.id != null);
    playerOptions.value = Array.from(
      new Map([...retainedOptions, ...fetchedOptions].map((player) => [String(player.id), player])).values()
    );
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    if (requestSequence === playersRequestSequence) playersLoading.value = false;
  }
}

function searchAssignablePlayers(keyword = '') {
  if (playersSearchTimer) clearTimeout(playersSearchTimer);
  playersSearchTimer = setTimeout(() => {
    playersSearchTimer = null;
    loadPlayers(dispatchForm.club, keyword);
  }, 300);
}

// 人工派单：切换俱乐部联动刷新可指派打手，并清空已选打手
watch(
  () => dispatchForm.club,
  (val) => {
    dispatchForm.players = dispatchForm.players.map(() => '');
    dispatchForm.targetPlayerId = '';
    loadPlayers(val, '');
  }
);

async function openDispatch(row) {
  const missing = [];
  if (!row.gameId) missing.push('游戏名称');
  if (!row.specId) missing.push('游戏规格');
  if (!row.orderTypeCode) missing.push('订单类型');
  if (!row.clients) missing.push('客户端');
  // 角色名接口未返回，暂不参与派单前置校验（待后端补充）
  if (missing.length) {
    show(`该订单尚未维护${missing.join('/')}`, 'warning');
    return;
  }
  dispatchRow.value = row;
  Object.assign(dispatchForm, {
    dispatchType: '系统派单',
    club: '',
    targetPlayerId: '',
    players: [],
    dltOrderNo: '',
    dltPrice: '',
    dltRemark: '',
  });
  playerOptions.value = [];
  dispatchVisible.value = true;
  dispatchLoading.value = true;
  try {
    // 打手人数/锁定俱乐部从详情补齐
    const detail = await orderApi.detail(row.id);
    dispatchRow.value = {
      ...row,
      playerCount: detail.playerCount,
      takenCount: detail.takenCount,
      lockedClubId: detail.lockedClubId,
    };
    const count = Math.max(1, Number(detail.playerCount) || 1);
    dispatchForm.players = Array.from({ length: Math.min(count, 3) }, () => '');
    if (detail.lockedClubId) {
      dispatchForm.dispatchType = '人工派单';
      dispatchForm.club = detail.lockedClubId;
    }
    await loadClubOptions();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    dispatchLoading.value = false;
  }
}

async function submitDispatch() {
  const row = dispatchRow.value;
  if (!row) return;
  if (dispatchForm.dispatchType === '代练通') {
    const dltOrderNo = String(dispatchForm.dltOrderNo || '').trim();
    const dltPriceText = String(dispatchForm.dltPrice ?? '').trim();
    const dltDispatchPrice = Number(dltPriceText);
    if (!dltOrderNo) return show('请输入订单号（代练通）', 'warning');
    if (dltOrderNo.length > 64) return show('订单号（代练通）最多64字', 'warning');
    if (!/^\d+(\.\d{1,2})?$/.test(dltPriceText) || !Number.isFinite(dltDispatchPrice) || dltDispatchPrice <= 0) {
      return show('派单价格（代练通）需大于0，最多两位小数', 'warning');
    }
    const maxDispatchPrice = (Number(row.amount) || 0) + (Number(row.platformAdjust) || 0);
    if (dltDispatchPrice > maxDispatchPrice) {
      return show('代练通派单价格不能大于订单金额加平台加减价', 'warning');
    }
  }
  const dispatchType = {
    系统派单: 'SYSTEM',
    人工派单: 'CLUB',
    代练通: 'DAILIANTONG',
  }[dispatchForm.dispatchType];
  if (dispatchType === 'CLUB' && !dispatchForm.club) {
    return show('请选择俱乐部', 'warning');
  }
  let slots = [];
  if (dispatchType === 'CLUB' && clubAccepted.value) {
    const emptyIndex = dispatchForm.players.findIndex((p) => !p);
    if (emptyIndex > -1) return show(`请选择打手${emptyIndex + 1}`, 'warning');
    slots = dispatchForm.players.map((playerId, i) => ({ slotNo: i + 1, playerId: Number(playerId) }));
  }
  try {
    dispatchLoading.value = true;
    if (dispatchType === 'DAILIANTONG') {
      await orderApi.dispatch(row.id, {
        dispatchType,
        dltOrderNo: String(dispatchForm.dltOrderNo).trim(),
        dltDispatchPrice: Number(dispatchForm.dltPrice),
        remark: String(dispatchForm.dltRemark || '').trim(),
      });
    } else if (dispatchType === 'CLUB' && clubAccepted.value) {
      await orderApi.assign(row.id, { slots });
    } else {
      await orderApi.dispatch(row.id, {
        dispatchType,
        targetClubId: dispatchType === 'CLUB' ? Number(dispatchForm.club) : undefined,
        ...(dispatchType === 'CLUB' && dispatchForm.targetPlayerId
          ? { targetPlayerId: Number(dispatchForm.targetPlayerId) }
          : {}),
      });
    }
    dispatchVisible.value = false;
    if (dispatchType === 'DAILIANTONG') {
      show('代练通派单成功，订单已进入进行中', 'success');
    } else {
      show(
        dispatchType === 'CLUB' && !clubAccepted.value
          ? (dispatchForm.targetPlayerId ? '已派单并指派打手' : '已派给俱乐部，等待接单')
          : '派单成功',
        'success'
      );
    }
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    dispatchLoading.value = false;
  }
}

/* ===== 加减价与打赏 ===== */
const priceVisible = ref(false);
const priceRow = ref(null);
const priceProofs = ref([]);
const priceProofPreviewUrls = computed(() => priceProofs.value.map((proof) => proof.preview));
const priceSubmitting = ref(false);
const priceOpening = ref(false);
const priceForm = reactive({
  type: '加价',
  amount: '',
  itemName: '',
  orderSource: '',
  orderNo: '',
});

function clearPriceProof() {
  priceProofs.value.forEach((proof) => URL.revokeObjectURL(proof.preview));
  priceProofs.value = [];
}

function addPriceProofs(files) {
  const selectedFiles = Array.from(files || []);
  const images = selectedFiles.filter((file) => file.type.startsWith('image/'));
  if (images.length !== selectedFiles.length) show('非图片文件已忽略', 'warning');
  const remaining = Math.max(0, 20 - priceProofs.value.length);
  if (images.length > remaining) show('打赏凭证最多上传20张，超出部分已忽略', 'warning');
  priceProofs.value.push(...images.slice(0, remaining).map((file) => ({
    file,
    preview: URL.createObjectURL(file),
  })));
}

function changePriceProof(event) {
  addPriceProofs(event.target.files);
  event.target.value = '';
}

function pastePriceProof(event) {
  const files = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (!files.length) return;
  event.preventDefault();
  addPriceProofs(files);
}

function dropPriceProof(event) {
  addPriceProofs(event.dataTransfer?.files);
}

function removePriceProof(index) {
  const [proof] = priceProofs.value.splice(index, 1);
  if (proof) URL.revokeObjectURL(proof.preview);
}

watch(priceVisible, (visible) => {
  if (!visible) clearPriceProof();
});

async function openPrice(row) {
  if (priceOpening.value || !canShow(row, '加减价')) return;
  priceOpening.value = true;
  try {
    if (row.status === '进行中') {
      const detail = await orderApi.detail(row.id);
      if (detail?.midReplace || detail?.midReplaceWaiting) {
        Object.assign(row, mapOrderRow(detail));
        show('中途换人后禁止加减价，订单完成后再操作', 'warning');
        return;
      }
    }
    clearPriceProof();
    priceRow.value = row;
    Object.assign(priceForm, {
      type: '加价',
      amount: '',
      itemName: '',
      orderSource: '',
      orderNo: '',
    });
    priceVisible.value = true;
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    priceOpening.value = false;
  }
}

async function submitPrice() {
  const row = priceRow.value;
  if (!row || priceSubmitting.value) return;
  const amountText = String(priceForm.amount).trim();
  const amount = Number(amountText);
  if (!amountText || !Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(amountText)) {
    return show('请输入大于0且最多两位小数的金额', 'warning');
  }
  if (priceForm.type === '打赏') {
    priceSubmitting.value = true;
    try {
      const evidenceUrls = [];
      for (const proof of priceProofs.value) {
        const result = await fileApi.upload(proof.file);
        if (!result?.url) return show('打赏凭证上传未返回图片地址，请重试', 'error');
        evidenceUrls.push(result.url);
      }
      await orderApi.tip(row.id, {
        amount,
        ...(String(priceForm.itemName).trim() ? { itemName: String(priceForm.itemName).trim() } : {}),
        ...(String(priceForm.orderSource).trim() ? { orderSource: String(priceForm.orderSource).trim() } : {}),
        ...(String(priceForm.orderNo).trim() ? { orderNo: String(priceForm.orderNo).trim() } : {}),
        ...(evidenceUrls.length ? { evidenceUrls } : {}),
      });
      priceVisible.value = false;
      show('打赏保存成功', 'success');
      fetchList();
    } catch {
      /* 错误提示由 request.js 统一弹出 */
    } finally {
      priceSubmitting.value = false;
    }
    return;
  }
  if (amount > Number(row.amount)) {
    return show(`${priceForm.type === '加价' ? '加' : '减'}：最多为订单总金额`, 'warning');
  }
  priceSubmitting.value = true;
  try {
    await orderApi.platformAdjust(row.id, {
      direction: priceForm.type === '加价' ? 'INCREASE' : 'DECREASE',
      amount,
    });
    priceVisible.value = false;
    show('加减价成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    priceSubmitting.value = false;
  }
}

/* ===== 呼叫（接口：POST /{id}/call，callType 必填；UI 保持原型类型选项） ===== */
const callVisible = ref(false);
const callRow = ref(null);
const callForm = reactive({ type: '', remark: '' });

function openCall(row) {
  callRow.value = row;
  Object.assign(callForm, { type: '', remark: '' });
  callVisible.value = true;
}

async function submitCall() {
  const row = callRow.value;
  if (!row) return;
  if (!callForm.type) return show('请选择呼叫类型', 'warning');
  try {
    // body 优先 type（英文枚举 ORDER/COMPLAINT/PLAYER/TECH/OTHER），其次 callType（也接受中文）
    await orderApi.call(row.id, { type: callForm.type, remark: callForm.remark });
    callVisible.value = false;
    show('呼叫成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  }
}

/* ===== 修改领取客服（列表领取人列铅笔；仅 ADMIN；PUT /{id}/owner，ownerAccountId 必填；
   候选人 GET /api/admin/accounts，KEFU 调用返回 403「仅管理员可修改领取客服」） ===== */
const ownerVisible = ref(false);
const ownerRow = ref(null);
const ownerForm = reactive({ ownerAccountId: '' });
const ownerOptions = ref([]); // [{ id, name }]
const ownerLoading = ref(false);

async function openOwnerEdit(row) {
  ownerRow.value = row;
  Object.assign(ownerForm, { ownerAccountId: '' });
  ownerVisible.value = true;
  ownerLoading.value = true;
  try {
    const list = await handoverApi.accounts({ status: 'NORMAL' });
    ownerOptions.value = list.map((a) => ({ id: a.accountId, name: a.accountName }));
  } catch {
    ownerOptions.value = [];
  } finally {
    ownerLoading.value = false;
  }
}

async function submitOwner() {
  const row = ownerRow.value;
  if (!row) return;
  if (!ownerForm.ownerAccountId) return show('请选择领取客服', 'warning');
  try {
    await orderApi.changeOwner(row.id, { ownerAccountId: Number(ownerForm.ownerAccountId) });
    ownerVisible.value = false;
    show('领取客服修改成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出（KEFU 403「仅管理员可修改领取客服」） */
  }
}

/* ===== 冻结 / 解冻 / 回退到待领取 ===== */
async function freezeRow(row) {
  const ok = await confirm({ title: '冻结', message: `确定冻结订单 ${row.orderNo} 吗？冻结后打手无法操作该订单。`, okText: '确定' });
  if (!ok) return;
  try {
    await orderApi.freeze(row.id, { reason: 'MANUAL' });
    show('冻结成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  }
}

async function unfreezeRow(row) {
  const ok = await confirm({ title: '解冻', message: `确定解冻订单 ${row.orderNo} 吗？`, okText: '确定' });
  if (!ok) return;
  try {
    await orderApi.unfreeze(row.id);
    show('解冻成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  }
}

const rollbackSubmitting = ref(false);

async function rollbackRow(row) {
  if (rollbackSubmitting.value || !canShow(row, '回退')) return;
  rollbackSubmitting.value = true;
  try {
    const ok = await confirm({
      title: '回退到待领取大厅',
      message: '回退后将清除领取人、派单及接单信息，释放已接单打手并解除分润锁，通知打手；订单回到待领取大厅，可由其他客服重新领取。本操作不扣款，是否继续？',
      okText: '确认回退',
    });
    if (!ok) return;
    await orderApi.rollback(row.id);
    show('订单已回退到待领取大厅', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    rollbackSubmitting.value = false;
  }
}

/* ===== 退款（接口：POST /{id}/refund 人工退款；原金额/部分退款展示依赖 refunded 字段接口待补充） ===== */
const refundVisible = ref(false);
const refundRow = ref(null);
const refundForm = reactive({ amount: '', reason: '' });

function openRefund(row) {
  refundRow.value = row;
  Object.assign(refundForm, { amount: '', reason: '' });
  refundVisible.value = true;
}

async function submitRefund() {
  const row = refundRow.value;
  if (!row) return;
  const amount = Number(refundForm.amount);
  if (!refundForm.amount || !Number.isFinite(amount) || amount <= 0) {
    return show('请输入正确的退款金额（大于0）', 'warning');
  }
  if (amount > Number(row.amount)) {
    return show('退款金额不能超过订单总金额', 'warning');
  }
  if (row.channelCode === 'DOUYIN') {
    return show('抖音订单不支持人工部分退款', 'warning');
  }
  try {
    await orderApi.refund(row.id, {
      amount,
      reason: String(refundForm.reason || '').trim(),
    });
    refundVisible.value = false;
    show('退款成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  }
}

/* ===== 转单（接口：POST /{id}/transfer；UI 保持原型目标文案，提交映射枚举） ===== */
const transferVisible = ref(false);
const transferSubmitting = ref(false);
const transferRow = ref(null);
const transferTab = ref('transfer');
const transferForm = reactive({ deduct: '否', amount: '', deductReason: '', target: '进入公共抢单大厅' });

function openTransfer(row) {
  if (transferSubmitting.value || !canShow(row, '转单')) return;
  if (midReplaceSearchTimer) clearTimeout(midReplaceSearchTimer);
  midReplaceSearchTimer = null;
  transferRow.value = row;
  transferTab.value = 'transfer';
  Object.assign(transferForm, { deduct: '否', amount: '', deductReason: '', target: '进入公共抢单大厅' });
  midReplaceRow.value = row;
  resetMidReplaceForm();
  midReplaceFormReady.value = false;
  midReplaceSearchSequence += 1;
  midReplacePlayers.value = [];
  loadMidReplaceClubOptions();
  loadMidReplaceDetails(row);
  transferVisible.value = true;
}

function selectTransferTab(tab) {
  if (tab === 'midReplace') {
    if (midReplaceCurrentPlayersLoading.value) return show('订单信息加载中，请稍候', 'warning');
    if (!midReplaceFormReady.value) return show('订单信息加载失败，请重新打开后重试', 'warning');
    if (midReplaceRow.value?.canMidReplace !== true) {
      return show(midReplaceRow.value?.midReplaceBlockReason || '当前订单暂不可中途换人', 'warning');
    }
  }
  transferTab.value = tab;
}

async function submitTransfer() {
  const row = transferRow.value;
  if (!row || transferSubmitting.value || !canShow(row, '转单')) return;
  let deduct = 0;
  let deductReason = '';
  if (transferForm.deduct === '是') {
    const amount = Number(transferForm.amount);
    if (!transferForm.amount || !Number.isFinite(amount) || amount <= 0) {
      return show('请输入扣款金额（总数）', 'warning');
    }
    deduct = amount;
    deductReason = String(transferForm.deductReason || '').trim();
    if (!deductReason) return show('请填写扣款原因', 'warning');
    if (deductReason.length > 200) return show('扣款原因最多200字', 'warning');
  }
  if (!['进入公共抢单大厅', '进入当前俱乐部'].includes(transferForm.target)) return show('请选择转单类型', 'warning');
  transferSubmitting.value = true;
  try {
    await orderApi.transfer(row.id, {
      type: transferForm.target === '进入公共抢单大厅' ? 'PUBLIC' : 'CLUB_HALL',
      deduct,
      ...(deduct > 0 ? { deductReason } : {}),
    });
    transferVisible.value = false;
    show('转单成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    transferSubmitting.value = false;
  }
}

/* ===== 中途换打手（保留原转单语义，单独走 mid-replace 接口） ===== */
const midReplaceSubmitting = ref(false);
const midReplaceRow = ref(null);
const midReplaceFormReady = ref(false);
const midReplaceCurrentPlayers = ref([]);
const midReplaceCurrentPlayersLoading = ref(false);
const midReplaceCurrentRemainingAmount = ref(null);
const midReplacePlayers = ref([]);
const midReplacePlayersLoading = ref(false);
const midReplaceClubLoading = ref(false);
const midReplaceSearchKeyword = ref('');
let midReplaceDetailSequence = 0;
const midReplaceForm = reactive({
  completedAmount: '',
  mode: 'MANUAL',
  club: '',
  targetPlayerId: '',
  dltOrderNo: '',
  dltPrice: '',
  dltRemark: '',
});
let midReplaceSearchTimer = null;
let midReplaceSearchSequence = 0;
async function loadMidReplaceClubOptions() {
  if (clubOptions.value.length || midReplaceClubLoading.value) return;
  midReplaceClubLoading.value = true;
  try {
    await loadClubOptions();
  } finally {
    midReplaceClubLoading.value = false;
  }
}
const midReplaceMaxDltPrice = computed(() => {
  const row = midReplaceRow.value;
  if (!row) return null;
  const maximum = Number(row.amount) + (Number(row.platformAdjust) || 0);
  return Number.isFinite(maximum) ? Math.max(0, maximum) : null;
});

function resetMidReplaceForm() {
  Object.assign(midReplaceForm, {
    completedAmount: '',
    mode: 'MANUAL',
    club: '',
    targetPlayerId: '',
    dltOrderNo: '',
    dltPrice: '',
    dltRemark: '',
  });
  midReplacePlayers.value = [];
  midReplaceSearchKeyword.value = '';
}

watch(
  () => midReplaceForm.mode,
  (mode) => {
    if (mode === 'MANUAL') loadMidReplaceClubOptions();
  }
);

watch(
  () => midReplaceForm.club,
  (clubId) => {
    midReplaceForm.targetPlayerId = '';
    midReplacePlayers.value = [];
    if (clubId) loadMidReplacePlayers(clubId);
    else {
      midReplaceSearchSequence += 1;
      midReplacePlayersLoading.value = false;
    }
  }
);

async function loadMidReplacePlayers(clubId, keyword = '') {
  const row = midReplaceRow.value;
  if (!row || !clubId) return;
  if (midReplaceSearchTimer) {
    clearTimeout(midReplaceSearchTimer);
    midReplaceSearchTimer = null;
  }
  const requestSequence = ++midReplaceSearchSequence;
  midReplacePlayersLoading.value = true;
  try {
    const res = await orderApi.assignablePlayers(row.id, {
      clubId: Number(clubId),
      keyword: String(keyword || '').trim(),
    });
    if (requestSequence !== midReplaceSearchSequence) return;
    const list = Array.isArray(res) ? res : (res?.list || []);
    const retained = midReplacePlayers.value.filter(
      (player) => String(player.id) === String(midReplaceForm.targetPlayerId)
    );
    const fetched = list
      .map((player) => ({
        id: player.id ?? player.playerId,
        name: player.name || player.nickname || '',
      }))
      .filter((player) => player.id != null);
    midReplacePlayers.value = Array.from(
      new Map([...retained, ...fetched].map((player) => [String(player.id), player])).values()
    );
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    if (requestSequence === midReplaceSearchSequence) midReplacePlayersLoading.value = false;
  }
}

async function loadMidReplaceDetails(row) {
  const requestSequence = ++midReplaceDetailSequence;
  midReplaceCurrentPlayers.value = [];
  midReplaceCurrentRemainingAmount.value = null;
  midReplaceCurrentPlayersLoading.value = true;
  try {
    const detail = await orderApi.detail(row.id);
    if (requestSequence !== midReplaceDetailSequence) return;
    const mappedDetail = mapDetail(detail);
    midReplaceRow.value = {
      ...row,
      ...mappedDetail,
      amount: detail.amount == null ? row.amount : mappedDetail.amount,
      platformAdjust: detail.platformAdjust == null ? row.platformAdjust : mappedDetail.platformAdjust,
      canMidReplace: detail.canMidReplace === undefined ? row.canMidReplace : detail.canMidReplace,
      midReplaceBlockReason: detail.midReplaceBlockReason ?? row.midReplaceBlockReason ?? '',
    };
    midReplaceCurrentPlayers.value = (detail?.slots || [])
      .filter((slot) => !slot.transferredAt && slot.playerId != null)
      .map((slot) => ({
        id: slot.playerId,
        name: slot.playerName || '',
        clubName: slot.clubName || '',
        clubId: slot.clubId,
      }));
    const alreadyReplaced = Boolean(detail.midReplace ?? row.midReplace) ||
      detail.midReplaceWaiting === true ||
      row.midReplaceWaiting === true;
    if (alreadyReplaced) {
      midReplaceCurrentRemainingAmount.value =
        detail.midReplaceRemainAmount ?? row.midReplaceRemainAmount ?? null;
    } else {
      midReplaceCurrentRemainingAmount.value =
        detail.midReplacePoolAmount ??
        row.midReplacePoolAmount ??
        detail.playerAmount ??
        row.playerAmount ??
        null;
    }
    midReplaceFormReady.value = true;
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    if (requestSequence === midReplaceDetailSequence) midReplaceCurrentPlayersLoading.value = false;
  }
}

function searchMidReplacePlayers(keyword = '') {
  midReplaceSearchKeyword.value = keyword;
  if (midReplaceSearchTimer) clearTimeout(midReplaceSearchTimer);
  midReplaceSearchTimer = setTimeout(() => {
    midReplaceSearchTimer = null;
    loadMidReplacePlayers(midReplaceForm.club, keyword);
  }, 300);
}

async function submitMidReplace() {
  const row = midReplaceRow.value;
  if (!row || !midReplaceFormReady.value || midReplaceSubmitting.value) return;
  if (row.canMidReplace !== true) {
    return show(row.midReplaceBlockReason || '当前订单暂不可中途换人', 'warning');
  }
  if (midReplaceCurrentRemainingAmount.value == null) {
    return show('未获取到当前剩余打手可得金额，请刷新订单后重试', 'warning');
  }
  const completedAmountText = String(midReplaceForm.completedAmount ?? '').trim();
  const completedAmount = Number(completedAmountText);
  if (!/^\d+(\.\d{1,2})?$/.test(completedAmountText) || !Number.isFinite(completedAmount) || completedAmount <= 0) {
    return show('请输入大于0且最多两位小数的已完成金额', 'warning');
  }
  if (completedAmount >= Number(midReplaceCurrentRemainingAmount.value)) {
    return show(`已完成金额必须小于当前剩余打手可得金额（${money(midReplaceCurrentRemainingAmount.value)}元）`, 'warning');
  }
  if (midReplaceForm.mode === 'MANUAL' && !midReplaceForm.club) {
    return show('请选择派单俱乐部', 'warning');
  }
  if (midReplaceForm.mode === 'MANUAL' && !midReplaceForm.targetPlayerId) {
    return show('请选择接手打手', 'warning');
  }
  if (midReplaceForm.mode === 'DAILIANTONG') {
    const dltPriceText = String(midReplaceForm.dltPrice ?? '').trim();
    const dltPrice = Number(dltPriceText);
    if (!String(midReplaceForm.dltOrderNo || '').trim()) return show('请输入订单号（代练通）', 'warning');
    if (String(midReplaceForm.dltOrderNo).trim().length > 64) return show('订单号（代练通）最多64字', 'warning');
    if (!/^\d+(\.\d{1,2})?$/.test(dltPriceText) || !Number.isFinite(dltPrice) || dltPrice <= 0) {
      return show('派单价格（代练通）需大于0，最多两位小数', 'warning');
    }
    if (midReplaceMaxDltPrice.value == null || dltPrice > midReplaceMaxDltPrice.value) {
      return show(`代练通派单价不能超过订单金额加平台加减价（${money(midReplaceMaxDltPrice.value)}元）`, 'warning');
    }
    if (String(midReplaceForm.dltRemark || '').length > 200) return show('代练通备注最多200字', 'warning');
  }
  const payload = {
    completedAmount,
    mode: midReplaceForm.mode === 'MANUAL' ? 'ASSIGN' : midReplaceForm.mode,
  };
  if (midReplaceForm.mode === 'MANUAL') {
    payload.targetPlayerId = Number(midReplaceForm.targetPlayerId);
  } else if (midReplaceForm.mode === 'DAILIANTONG') {
    payload.dltOrderNo = String(midReplaceForm.dltOrderNo).trim();
    payload.dltDispatchPrice = Number(midReplaceForm.dltPrice);
    const remark = String(midReplaceForm.dltRemark || '').trim();
    if (remark) payload.remark = remark;
  }
  midReplaceSubmitting.value = true;
  try {
    await orderApi.midReplace(row.id, payload);
    transferVisible.value = false;
    show('中途换人成功', 'success');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    midReplaceSubmitting.value = false;
  }
}

/* ===== 审核（接口：POST /{id}/audit，pass 必填，驳回必填 reason） ===== */
const auditVisible = ref(false);
const auditRow = ref(null);
const auditLogs = ref([]);
const auditDialogRef = ref(null);

async function openAudit(row) {
  if (!row || !canShow(row, '审核')) return;
  auditRow.value = row;
  auditLogs.value = [];
  auditVisible.value = true;
  try {
    // 审核弹窗需展示分润信息（平台/俱乐部加减价、账期），先拉订单详情 + 日志
    const [detail, logs] = await Promise.all([orderApi.detail(row.id), orderApi.logs(row.id)]);
    const mappedDetail = mapDetail(detail);
    auditRow.value = {
      ...mappedDetail,
      ...row,
      originalAmount: row.originalAmount ?? mappedDetail.originalAmount,
      amount: row.amount ?? mappedDetail.amount,
      dispatchAmount: row.dispatchAmount ?? mappedDetail.dispatchAmount,
    };
    auditLogs.value = (logs || []).map((l) => ({
      time: l.createdAt || '',
      text: l.content || '',
      op: l.operatorName || '',
      action: l.action || '',
    }));
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  }
}

async function submitAudit({ pass, reason }) {
  const row = auditRow.value;
  if (!row || !canShow(row, '审核')) return;
  try {
    await orderApi.audit(row.id, { pass, reason });
    auditVisible.value = false;
    show(pass ? '审核通过，订单已完成' : '已驳回', pass ? 'success' : 'warning');
    fetchList();
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  }
}
</script>

<template>
  <div class="order-list-tab list-page">
    <div class="list-page__search">
      <SearchComponent
        ref="searchComponentRef"
        :fields="searchFields"
        :initial-values="filter"
        :row-columns="4"
        :labelWidth="97"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <DataTable
      class="list-panel"
      :columns="visibleColumns"
      :data="rows"
      :loading="loading"
      :total="total"
      :page="page"
      :page-size="pageSize"
      @page-change="(p) => { onPageChange(p); fetchList(); }"
      @page-size-change="(s) => { onPageSizeChange(s); fetchList(); }"
    >
      <template #toolbar>
        <div class="toolbar-left">
          <div v-if="scopeOptions.length > 1" class="scope-switch">
            <button
              v-for="item in scopeOptions"
              :key="item.value"
              type="button"
              :class="['scope-btn', { active: scope === item.value }]"
              :disabled="filter.status === 'WAIT_CLAIM' && item.value === 'mine'"
              :title="filter.status === 'WAIT_CLAIM' && item.value === 'mine' ? '待领取订单需在全部订单中查看' : ''"
              @click="switchScope(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
          <button class="feed-refresh-btn" type="button" :disabled="loading" @click="refreshOrderList">
            刷新（{{ newFeedCount }}）
          </button>
          <button v-if="!isFinance" class="add-btn" type="button" @click="openAdd">新增</button>
        </div>
        <div class="column-display-control">
          <el-popover
            v-model:visible="columnChooserVisible"
            placement="bottom-end"
            :width="248"
            trigger="click"
            popper-class="order-column-chooser-popper"
          >
            <template #reference>
              <button
                class="column-display-btn"
                type="button"
                aria-label="选择表格显示字段"
                :aria-expanded="columnChooserVisible"
              >
                <span>字段显示</span>
                <span class="column-display-count">{{ visibleColumnKeys.length }}/{{ configurableColumns.length }}</span>
              </button>
            </template>
            <div class="column-chooser-panel">
              <div class="column-chooser-heading">
                <strong>选择显示字段</strong>
                <button type="button" @click="showAllColumns">全部显示</button>
              </div>
              <el-checkbox-group v-model="visibleColumnKeys" class="column-chooser-options">
                <el-checkbox
                  v-for="column in configurableColumns"
                  :key="column.key"
                  :value="column.key"
                >
                  {{ column.title }}
                </el-checkbox>
              </el-checkbox-group>
              <p>操作列固定显示</p>
            </div>
          </el-popover>
        </div>
      </template>

      <template #cell-orderNo="{ row }">
        <span class="order-no-cell">
          <span :class="['order-type-tag', { 'is-special': row.orderType === '特惠单' }]">
            {{ row.orderType === '特惠单' ? '特惠' : '常规' }}
          </span>
          <span>{{ row.orderNo || '—' }}</span>
          <button
            v-if="row.orderNo"
            class="order-copy-btn"
            type="button"
            :aria-label="`复制本平台订单号 ${row.orderNo}`"
            title="复制本平台订单号"
            @click="copyText(row.orderNo)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="5.25" y="2.25" width="8.5" height="10.5" rx="1.5" />
              <path d="M10.75 13.75H3.5A1.25 1.25 0 0 1 2.25 12.5V5.25" />
            </svg>
          </button>
        </span>
      </template>

      <template #cell-thirdOrderNo="{ row }">
        <span class="order-no-cell">
          <span
            v-if="row.channelCode"
            class="channel-tag order-channel-tag"
            :title="row.channel"
            aria-hidden="true"
          >
            {{ channelDisplayName(row.channelCode).slice(0, 1) }}
          </span>
          <span>{{ row.thirdOrderNo || '—' }}</span>
          <button
            v-if="row.thirdOrderNo"
            class="order-copy-btn"
            type="button"
            :aria-label="`复制第三方订单号 ${row.thirdOrderNo}`"
            title="复制第三方订单号"
            @click="copyText(row.thirdOrderNo)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="5.25" y="2.25" width="8.5" height="10.5" rx="1.5" />
              <path d="M10.75 13.75H3.5A1.25 1.25 0 0 1 2.25 12.5V5.25" />
            </svg>
          </button>
        </span>
      </template>

      <template #cell-amount="{ row }">{{ money(row.amount) }}</template>
      <template #cell-platformAdjust="{ row }">{{ adjustAmountText(row.platformAdjust) }}</template>
      <template #cell-clubAdjust="{ row }">{{ adjustAmountText(row.clubAdjust) }}</template>
      <template #cell-dispatchAmount="{ row }">
        <span v-if="row.dispatchTypeCode === 'DAILIANTONG' && row.dltDispatchPrice != null">{{ money(row.dltDispatchPrice) }}</span>
        <span v-else>{{ row.dispatchAmount == null || String(row.dispatchAmount).trim() === '' ? '--' : money(row.dispatchAmount) }}</span>
      </template>

      <template #cell-product="{ row }"><span :title="row.product || '—'">{{ row.product || '—' }}</span></template>

      <template #cell-gameName="{ row }"><span :title="row.gameName || '—'">{{ row.gameName || '—' }}</span></template>

      <template #cell-clientType="{ row }">{{ row.clients ? row.clients.split(/[,，]/).filter(Boolean).join('、') : '—' }}</template>

      <template #cell-spec="{ row }">{{ row.hideGameSpec ? '—' : row.spec || '—' }}</template>

      <template #cell-roleName="{ row }">{{ row.roleName || '—' }}</template>

      <template #cell-status="{ row }">
        <div class="status-wrap">
          <span class="status-badge" :class="STATUS_CLASS[row.status] || 'status-info'">{{ displayStatus(row) }}</span>
          <span v-if="row.dispatchTypeCode === 'DAILIANTONG'" class="order-tag tag-purple">代练通</span>
          <template v-for="(tag, index) in row.tags" :key="tag">
            <button
              v-if="tag === '售后中' && canSyncAfterSale(row)"
              type="button"
              class="order-tag tag-danger after-sale-sync-tag"
              :disabled="isSyncingAfterSale(row)"
              title="点击回查抖店售后状态"
              @click.stop="syncAfterSale(row)"
            >
              {{ isSyncingAfterSale(row) ? '回查中…' : (row.tagLabels[index] || tag) }}
            </button>
            <span v-else class="order-tag" :class="`tag-${tagClass(tag)}`">{{ row.tagLabels[index] || tag }}</span>
          </template>
        </div>
      </template>

      <template #cell-auditStatus="{ row }">
        <span class="status-badge" :class="AUDIT_CLASS[row.auditStatus] || 'status-muted'">{{ row.auditStatus }}</span>
      </template>

      <template #cell-attribute="{ row }">
        <div v-if="row.attribute !== '—'" class="attr-cell">
          <span>{{ row.attribute }}</span>
          <button class="link-btn" @click="openRelation(row)">查看关系</button>
        </div>
        <span v-else>—</span>
      </template>

      <template #cell-claimer="{ row }">
        <div class="claimer-cell">
          <span>企微名：{{ row.claimerCorp || '—' }}</span>
          <span class="claimer-name">
            客服名：{{ row.claimerName || '—' }}
            <!-- 仅管理员可编辑修改领取客服（原型标注）：列表行内铅笔 → 独立弹窗 PUT /{id}/owner -->
            <button v-if="isAdmin && row.claimerName" class="owner-edit-btn" type="button" title="修改领取客服" @click="openOwnerEdit(row)">✎</button>
          </span>
        </div>
      </template>

      <template #cell-player="{ row }">
        <span :title="playerNames(row)">{{ playerNames(row) || '—' }}</span>
      </template>

      <template #cell-club="{ row }">
        <span :title="clubNames(row)">{{ clubNames(row) || '—' }}</span>
      </template>

      <template #cell-createTime="{ row }">{{ row.createTime || '—' }}</template>

      <template #cell-op="{ row }">
        <div class="action-group">
          <span
            v-if="row.voidApprovalStatus"
            class="void-approval-state"
            :class="`is-${String(row.voidApprovalStatus).toLowerCase()}`"
          >
            {{ approvalStatusLabel(row.voidApprovalStatus) }}
          </span>
          <button v-if="canShow(row, '认领')" class="link-btn primary" @click="openClaim(row)">认领</button>
          <button v-if="canShow(row, '编辑')" class="link-btn" @click="openEdit(row)">编辑</button>
          <button v-if="canShow(row, '查看')" class="link-btn" @click="openDetail(row)">查看</button>
          <button v-if="canShow(row, '作废')" class="link-btn danger" @click="requestVoid(row)">作废</button>
          <button v-if="canShow(row, '绑主单')" class="link-btn" @click="openBindMain(row)">绑主单</button>
          <button v-if="canShow(row, '绑定子单')" class="link-btn" @click="openBindChild(row)">{{ row.children?.length ? '继续绑定' : '绑定子单' }}</button>
          <button v-if="canShow(row, '派单')" class="link-btn primary" @click="openDispatch(row)">派单</button>
          <button v-if="canShow(row, '加减价')" class="link-btn" @click="openPrice(row)">加减价</button>
          <button v-if="canShow(row, '呼叫')" class="link-btn" @click="openCall(row)">呼叫</button>
          <button v-if="canShow(row, '解绑')" class="link-btn" @click="openUnbind(row)">解绑</button>
          <button v-if="canShow(row, '冻结')" class="link-btn warning" @click="freezeRow(row)">冻结</button>
          <button v-if="!isFinance && row.canUnfreeze === true" class="link-btn info" @click="unfreezeRow(row)">解冻</button>
          <button v-if="canShow(row, '退款')" class="link-btn danger" @click="openRefund(row)">退款</button>
          <button v-if="canShow(row, '审核')" class="link-btn primary" @click="openAudit(row)">审核</button>
          <button v-if="canShow(row, '转单')" class="link-btn" @click="openTransfer(row)">转单</button>
          <button v-if="canShow(row, '回退')" class="link-btn warning" :disabled="rollbackSubmitting" @click="rollbackRow(row)">回退</button>
        </div>
      </template>
    </DataTable>

    <!-- 查看详情（接口：detail + logs） -->
    <AppModal v-model="detailVisible" title="查看" width="720px">
      <OrderDetailDialog v-if="detailRow" :row="detailRow" :logs="detailLogs" />
      <template #footer>
        <button class="btn btn-primary" @click="detailVisible = false">确定</button>
      </template>
    </AppModal>

    <!-- 编辑（维护订单信息 maintain；认领时直接在此编辑并提交） -->
    <AppModal v-model="editVisible" :title="editClaimMode ? '认领并编辑' : '编辑'" width="760px">
      <p v-if="editLoading" class="muted-text">正在加载最新订单信息…</p>
      <p v-else-if="editClaimMode && !editClaimed" class="muted-text">请先补充订单信息，点击“认领并保存”后将完成认领并保存修改。</p>
      <OrderEditDialog
        v-if="editRow"
        ref="editDialogRef"
        :row="editRow"
        :catalog="catalog"
        :logs="editLogs"
        :claim-mode="editClaimMode"
        :edit-approval="editRow.editApprovalStatus ? { status: editRow.editApprovalStatus } : null"
        @save="saveEdit"
        @request-edit="openEditRequest"
      />
      <template #footer>
        <button class="btn btn-plain" :disabled="editSaving" @click="editVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="editLoading || editSaving || !editRow || (!editClaimMode && !canSaveEdit(editRow))" data-shortcut-save :title="editClaimMode ? 'Ctrl+Enter 认领并保存' : 'Ctrl+Enter 保存'" @click="editDialogRef?.submit()">{{ editSaving ? '保存中…' : editClaimMode && !editClaimed ? '认领并保存' : '确定' }}</button>
      </template>
    </AppModal>

    <AppModal v-model="editRequestVisible" title="申请编辑订单" width="560px">
      <div v-if="editRequestRow" class="dialog-form">
        <p class="muted-text">申请通过后由后端更新游戏、规格、购买项目和订单金额；每单仅可申请一次。</p>
        <div class="form-row">
          <label class="required">游戏名称</label>
          <el-select v-model="editRequestForm.gameId" style="width: 100%" filterable @change="editRequestForm.specId = ''">
            <el-option v-for="item in gameOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="form-row">
          <label class="required">游戏规格</label>
          <el-select v-model="editRequestForm.specId" style="width: 100%" filterable>
            <el-option v-for="item in editRequestSpecOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="form-row">
          <label class="required">购买项目</label>
          <input v-model="editRequestForm.product" maxlength="50" placeholder="请输入购买项目" />
        </div>
        <div class="form-row">
          <label class="required">订单金额(元)</label>
          <input v-model="editRequestForm.amount" type="number" min="0.01" step="0.01" placeholder="大于0，最多两位小数" />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" :disabled="editRequestSubmitting" @click="editRequestVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="editRequestSubmitting" @click="submitEditRequest">
          {{ editRequestSubmitting ? '提交中…' : '提交申请' }}
        </button>
      </template>
    </AppModal>

    <!-- 新增订单（接口：POST /api/admin/orders；店铺ID/备注后端不接收，不展示） -->
    <AppModal v-model="addVisible" title="新增数据" width="520px" :close-on-click-outside="false">
      <div class="dialog-form" @paste="pastePayVoucher">
        <div class="form-row add-paste-row">
          <div class="add-paste-heading">
            <label>粘贴订单文本（自动识别字段）</label>
            <button type="button" class="btn btn-plain add-parse-btn" :disabled="addSubmitting || !addPasteText.trim()" @click="parseAddOrderText(addPasteText)">
              识别并填入
            </button>
          </div>
          <textarea
            v-model="addPasteText"
            rows="4"
            :disabled="addSubmitting"
            placeholder="粘贴订单内容，例如：&#10;门店金额：--&#10;订单编号：--&#10;购买项目：--&#10;pc/手游：--&#10;角色名:--&#10;保险格数:--"
            @paste="pasteAddOrderText"
          />
        </div>
        <div class="form-row">
          <label class="required">所属渠道</label>
          <el-select v-model="addForm.channel" placeholder="请选择渠道（抖音不支持人工新增）" style="width: 100%" filterable :loading="channelLoading">
            <el-option v-for="item in addChannelOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="form-row">
          <label class="required">第三方订单号</label>
          <input v-model="addForm.thirdOrderNo" maxlength="64" placeholder="请输入第三方订单号，最多64字" />
        </div>
        <div class="form-row">
          <label class="required">单价(元)</label>
          <input v-model="addForm.amount" type="number" step="0.01" min="0" placeholder="大于0，最多两位小数" />
        </div>
        <div class="form-row">
          <label class="required">购买项目</label>
          <input v-model="addForm.product" maxlength="50" placeholder="上限50字" />
        </div>
        <div class="form-row">
          <label class="required">客户端</label>
          <el-select v-model="addForm.clientType" multiple style="width: 100%" placeholder="支持多选">
            <el-option v-for="item in CLIENT_OPTIONS" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
        <div class="form-row">
          <label class="required">游戏名称</label>
          <el-select v-model="addForm.gameId" style="width: 100%" placeholder="请选择游戏" filterable @change="addForm.specId = ''">
            <el-option v-for="item in gameOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="form-row">
          <label class="required">游戏规格</label>
          <el-select v-model="addForm.specId" style="width: 100%" placeholder="请选择规格" filterable>
            <el-option v-for="item in addSpecOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="form-row">
          <label>角色名（选填）</label>
          <input v-model="addForm.roleName" maxlength="100" placeholder="请输入角色名" />
        </div>
        <div class="form-row">
          <label>保险格数（选填）</label>
          <input v-model="addForm.insuranceSlots" type="number" min="0" step="1" placeholder="请输入大于或等于0的整数" />
        </div>
        <div class="form-row">
          <label>数量</label>
          <input v-model="addForm.quantity" type="number" min="1" max="99" step="1" placeholder="选填，默认1，1-99的整数" />
        </div>
        <div class="form-row">
          <label>订单类型</label>
          <el-radio-group v-model="addForm.orderType">
            <el-radio v-for="item in TYPE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
          </el-radio-group>
        </div>
        <div class="form-row">
          <label>支付凭证（选填，仅平台内部可见）</label>
          <div class="pay-voucher-upload" tabindex="0" role="group" aria-label="支付凭证，可选择、粘贴或拖入图片" @dragover.prevent @drop.prevent.stop="dropPayVoucher">
            <el-image v-if="payVoucherPreview" :src="payVoucherPreview" style="width: 88px; height: 88px" fit="contain" alt="支付凭证" :preview-src-list="[payVoucherPreview]" preview-teleported />
            <label class="btn btn-plain">
              {{ payVoucherFile ? '重新选择' : '选择图片' }}
              <input type="file" accept="image/*" hidden :disabled="addSubmitting" @change="changePayVoucher" />
            </label>
            <button v-if="payVoucherFile" type="button" class="btn btn-plain" :disabled="addSubmitting" @click="clearPayVoucher">删除</button>
            <span>支持 Ctrl+V 粘贴或拖拽单张图片，确认建单时上传</span>
          </div>
        </div>
        <!-- 店铺ID / 备注：不在新增表单上（后端不接收，传了也丢弃），不展示 -->
      </div>
      <template #footer>
        <button class="btn btn-plain" :disabled="addSubmitting" @click="addVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="addSubmitting" @click="submitAdd">{{ addSubmitting ? '提交中…' : '确定' }}</button>
      </template>
    </AppModal>

    <!-- 查看关系（children/parentOrderNo 已由订单详情接口返回，行内缺失时拉详情） -->
    <AppModal v-model="relationVisible" title="查看关系" width="480px">
      <div class="relation-dialog">
        <div class="relation-row">
          <span>主订单</span>
          <div class="relation-main">
            <strong>{{ relationMainNo }}</strong>
            <span class="relation-third">第三方单号：{{ relationMainThirdNo }}</span>
          </div>
        </div>
        <div class="relation-row">
          <span>子订单</span>
          <div class="relation-list">
            <div v-for="child in relationData.children" :key="child.orderNo" class="relation-item">
              <strong>{{ child.orderNo }}</strong>
              <span class="relation-third">第三方单号：{{ child.thirdOrderNo || '—' }}</span>
            </div>
            <span v-if="!relationData.children.length" class="muted-text">暂无子订单</span>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-primary" @click="relationVisible = false">确定</button>
      </template>
    </AppModal>

    <!-- 绑主单（接口：bind） -->
    <AppModal v-model="bindVisible" :title="bindDirection === 'child' ? '绑定子单 / 继续绑定' : '绑主单'" width="480px">
      <div class="dialog-form">
        <div class="form-row">
          <label>当前订单</label>
          <strong class="readonly-value">{{ bindRow?.orderNo || '—' }}</strong>
        </div>
        <div class="form-row">
          <label class="required">{{ bindDirection === 'child' ? '选择未绑定子单' : '绑定主单' }}</label>
          <el-popover
            v-model:visible="bindPickerVisible"
            placement="bottom-start"
            :width="420"
            trigger="click"
            popper-class="bind-picker-popper"
          >
            <template #reference>
              <button
                type="button"
                class="bind-picker-trigger"
                :disabled="bindLoading || bindSaving"
                aria-haspopup="listbox"
                :aria-expanded="bindPickerVisible"
              >
                <span :class="{ 'is-placeholder': !selectedBindCandidate }">
                  {{ selectedBindCandidate ? `${selectedBindCandidate.orderNo}（${selectedBindCandidate.statusText || '—'}）` : '请选择订单' }}
                </span>
                <span class="bind-picker-trigger__arrow" aria-hidden="true"></span>
              </button>
            </template>
            <div class="bind-picker-panel">
              <div class="bind-search-controls">
                <input
                  v-model="bindKeyword"
                  :disabled="bindLoading || bindSaving"
                  placeholder="输入完整订单号搜索"
                  aria-label="按订单号精确搜索"
                  @keydown.enter.prevent="changeBindPage(1)"
                />
                <button class="btn btn-plain" :disabled="bindLoading || bindSaving" @click="changeBindPage(1)">搜索</button>
              </div>
              <div v-if="bindCandidates.length" class="bind-picker-options" role="listbox" aria-label="可绑定订单">
                <button
                  v-for="opt in bindCandidates"
                  :key="opt.id"
                  type="button"
                  class="bind-picker-option"
                  role="option"
                  :aria-selected="String(opt.id) === String(bindForm.parentOrderId)"
                  @click="chooseBindCandidate(opt)"
                >
                  <span class="bind-option__spec">{{ opt.orderNo }}</span>
                  <span class="bind-option__no">{{ opt.statusText || '—' }}</span>
                </button>
              </div>
              <div v-else class="bind-picker-empty">
                {{ bindLoading ? '加载中…' : '暂无可绑定订单，请搜索或翻页' }}
              </div>
              <div class="bind-pagination">
                <button
                  class="btn btn-plain"
                  :disabled="bindLoading || bindSaving || bindPage <= 1"
                  @click="changeBindPage(bindPage - 1)"
                >
                  上一页
                </button>
                <span class="bind-pagination__page">
                  {{ bindTotal }} 条 · {{ bindPage }} / {{ Math.max(1, Math.ceil(bindTotal / 50)) }} 页
                </span>
                <button
                  class="btn btn-plain"
                  :disabled="bindLoading || bindSaving || bindPage * 50 >= bindTotal"
                  @click="changeBindPage(bindPage + 1)"
                >
                  下一页
                </button>
              </div>
            </div>
          </el-popover>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" :disabled="bindSaving" @click="bindVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="bindLoading || bindSaving || !bindForm.parentOrderId" @click="submitBindMain">{{ bindSaving ? '绑定中…' : '确定' }}</button>
      </template>
    </AppModal>

    <!-- 解绑（unbind 单订单接口；多选依赖主/子单关系接口待补充） -->
    <AppModal v-model="unbindVisible" title="解绑" width="520px">
      <div class="dialog-form">
        <div class="form-row">
          <label>选择要解绑的订单</label>
          <el-checkbox-group v-model="unbindSelected" class="checkbox-col">
            <el-checkbox v-for="opt in unbindOptions" :key="opt.id" :value="opt.id">
              {{ opt.label }}：{{ opt.no }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" @click="unbindVisible = false">取消</button>
        <button class="btn btn-primary" @click="submitUnbind">确定</button>
      </template>
    </AppModal>

    <!-- 派单（人工派单可选直接指定打手；代练通等待接口接入） -->
    <AppModal v-model="dispatchVisible" title="派单" width="520px">
      <div class="dialog-form">
        <div class="form-row">
          <label>派单类型</label>
          <strong v-if="clubAccepted">人工派单（俱乐部已接单）</strong>
          <el-radio-group v-else v-model="dispatchForm.dispatchType">
            <el-radio value="系统派单" :disabled="dispatchLoading">系统派单</el-radio>
            <el-radio value="人工派单" :disabled="dispatchLoading">人工派单</el-radio>
            <el-radio value="代练通" :disabled="dispatchLoading">代练通</el-radio>
          </el-radio-group>
        </div>
        <template v-if="dispatchForm.dispatchType === '代练通'">
          <div class="form-row">
            <label class="required">订单号（代练通）</label>
            <input v-model="dispatchForm.dltOrderNo" maxlength="64" :disabled="dispatchLoading" placeholder="请输入代练通订单号" />
          </div>
          <div class="form-row">
            <label class="required">派单价格（代练通）</label>
            <input v-model="dispatchForm.dltPrice" type="number" min="0.01" step="0.01" :disabled="dispatchLoading" placeholder="请输入派单价格" />
          </div>
          <div class="form-row">
            <label>备注（代练通）</label>
            <textarea v-model="dispatchForm.dltRemark" rows="3" maxlength="200" :disabled="dispatchLoading" placeholder="请输入备注"></textarea>
            <div class="char-count">{{ dispatchForm.dltRemark.length }}/200</div>
          </div>
        </template>
        <template v-if="dispatchForm.dispatchType === '人工派单'">
          <div class="form-row">
            <label class="required">选择俱乐部</label>
            <el-select
              v-model="dispatchForm.club"
              filterable
              :loading="dispatchLoading"
              :disabled="clubAccepted"
              placeholder="请选择俱乐部"
              style="width: 100%"
            >
              <el-option v-for="item in clubOptions" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </div>
          <template v-if="clubAccepted">
            <div v-for="(_, index) in dispatchForm.players" :key="index" class="form-row">
              <label class="required">打手{{ index + 1 }}</label>
              <el-select
                v-model="dispatchForm.players[index]"
                :loading="playersLoading"
                filterable
                remote
                :remote-method="searchAssignablePlayers"
                placeholder="请选择打手（姓名 id）"
                style="width: 100%"
              >
                <el-option
                  v-for="item in playerOptions"
                  :key="item.id"
                  :label="`${item.name}（${item.id}）`"
                  :value="item.id"
                />
              </el-select>
            </div>
          </template>
          <div v-else-if="dispatchForm.club" class="form-row">
            <label>指定打手（选填）</label>
            <el-select
              v-model="dispatchForm.targetPlayerId"
              :loading="playersLoading"
              filterable
              remote
              clearable
              :remote-method="searchAssignablePlayers"
              placeholder="输入打手名称筛选，可不选"
              style="width: 100%"
            >
              <el-option
                v-for="item in playerOptions"
                :key="item.id"
                :label="`${item.name}（${item.id}）`"
                :value="item.id"
              />
            </el-select>
          </div>
        </template>
      </div>
      <template #footer>
        <button class="btn btn-plain" @click="dispatchVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="dispatchLoading || playersLoading" @click="submitDispatch">确定</button>
      </template>
    </AppModal>

    <!-- 加减价 / 打赏 -->
    <AppModal v-model="priceVisible" :title="priceForm.type === '打赏' ? '订单打赏' : '加减价'" width="440px">
      <div class="dialog-form">
        <div class="form-row">
          <label class="required">选择操作</label>
          <el-radio-group v-model="priceForm.type">
            <el-radio value="加价" :disabled="!['待派单', '进行中'].includes(priceRow?.status)">加价</el-radio>
            <el-radio value="减价" :disabled="!['待派单', '进行中'].includes(priceRow?.status)">减价</el-radio>
            <el-radio value="打赏">打赏</el-radio>
          </el-radio-group>
        </div>
        <template v-if="priceForm.type === '打赏'">
          <div class="form-row">
            <label>项目名称</label>
            <input v-model="priceForm.itemName" maxlength="100" placeholder="选填" />
          </div>
          <div class="form-row">
            <label>订单来源</label>
            <input v-model="priceForm.orderSource" placeholder="选填，可自由填写" />
          </div>
          <div class="form-row">
            <label>订单号</label>
            <input v-model="priceForm.orderNo" maxlength="100" placeholder="选填，外部打赏订单号" />
          </div>
          <div class="form-row">
            <label>图片凭证</label>
            <div
              class="pay-voucher-upload"
              tabindex="0"
              role="group"
              aria-label="打赏图片凭证，可选择、粘贴或拖入图片"
              @paste="pastePriceProof"
              @dragover.prevent
              @drop.prevent.stop="dropPriceProof"
            >
              <div v-for="(proof, index) in priceProofs" :key="proof.preview" class="price-proof-item">
                <el-image
                  :src="proof.preview"
                  :alt="`打赏图片凭证 ${index + 1}`"
                  fit="contain"
                  :preview-src-list="priceProofPreviewUrls"
                  :initial-index="index"
                  preview-teleported
                />
                <button type="button" class="btn btn-plain" :aria-label="`删除第 ${index + 1} 张凭证`" @click="removePriceProof(index)">删除</button>
              </div>
              <label class="btn btn-plain">
                选择图片
                <input type="file" accept="image/*" multiple hidden @change="changePriceProof" />
              </label>
              <span>可选择、粘贴或拖入图片，最多20张</span>
            </div>
          </div>
          <div class="form-row">
            <label class="required">金额(元)</label>
            <input v-model="priceForm.amount" type="number" step="0.01" min="0" placeholder="仅支持正数，最多两位小数" />
          </div>
        </template>
        <div v-else class="form-row">
          <label class="required">金额(元)</label>
          <input v-model="priceForm.amount" type="number" step="0.01" min="0" placeholder="仅支持正数，最多两位小数" />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" :disabled="priceSubmitting" @click="priceVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="priceSubmitting" @click="submitPrice">
          {{ priceSubmitting ? '提交中…' : '确定' }}
        </button>
      </template>
    </AppModal>

    <!-- 呼叫（接口：call） -->
    <AppModal v-model="callVisible" title="呼叫" width="440px">
      <div class="dialog-form">
        <div class="form-row">
          <label class="required">类型</label>
          <el-select v-model="callForm.type" style="width: 100%">
            <el-option v-for="item in CALL_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <!-- <p class="form-tip">呼叫类型文案已对齐后端枚举：订单问题/投诉/打手问题/技术问题/其他（提交英文枚举）。</p> -->
        </div>
        <div class="form-row">
          <label>备注</label>
          <textarea v-model="callForm.remark" rows="3" maxlength="200" placeholder="请输入备注"></textarea>
          <div class="char-count">{{ callForm.remark.length }}/200</div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" @click="callVisible = false">取消</button>
        <button class="btn btn-primary" @click="submitCall">确定</button>
      </template>
    </AppModal>

    <!-- 修改领取客服（列表领取人列铅笔入口；仅管理员；PUT /{id}/owner） -->
    <AppModal v-model="ownerVisible" title="修改领取客服" width="440px">
      <div class="dialog-form">
        <div class="form-row">
          <label>当前客服</label>
          <strong>{{ ownerRow ? `${ownerRow.claimerName || '—'}（${ownerRow.claimerCorp || '—'}）` : '—' }}</strong>
        </div>
        <div class="form-row">
          <label class="required">领取客服</label>
          <el-select
            v-model="ownerForm.ownerAccountId"
            filterable
            :loading="ownerLoading"
            placeholder="请选择领取客服"
            style="width: 100%"
          >
            <el-option v-for="item in ownerOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" @click="ownerVisible = false">取消</button>
        <button class="btn btn-primary" @click="submitOwner">确定</button>
      </template>
    </AppModal>

    <!-- 退款（接口：refund） -->
    <AppModal v-model="refundVisible" title="退款" width="440px">
      <div class="dialog-form">
        <div class="form-row">
          <label>订单金额(元)</label>
          <strong>{{ refundRow ? money(refundRow.amount) : '—' }}</strong>
        </div>
        <div v-if="refundRow?.refunded" class="form-row">
          <label>原金额(元)</label>
          <strong>{{ money(refundRow.amount + (refundRow.refundAmount || 0)) }}</strong>
        </div>
        <div v-if="refundRow?.refunded" class="form-row">
          <label>部分退款金额(元)</label>
          <strong>{{ money(refundRow.refundAmount || 0) }}</strong>
        </div>
        <div class="form-row">
          <label class="required">退款金额</label>
          <div class="amount-input">
            <input v-model="refundForm.amount" type="number" step="0.01" min="0" placeholder="0＜退款金额≤订单总金额" />
            <span>元</span>
          </div>
        </div>
        <div class="form-row">
          <label>退款原因</label>
          <textarea v-model="refundForm.reason" rows="3" maxlength="200" placeholder="请输入退款原因（可选）"></textarea>
          <div class="char-count">{{ refundForm.reason.length }}/200</div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" @click="refundVisible = false">取消</button>
        <button class="btn btn-primary" @click="submitRefund">确定</button>
      </template>
    </AppModal>

    <AppModal v-model="transferVisible" title="转单" width="620px">
      <div class="transfer-tabs" role="tablist" aria-label="订单交接方式">
        <button
          type="button"
          role="tab"
          :aria-selected="transferTab === 'transfer'"
          :class="{ active: transferTab === 'transfer' }"
          :disabled="transferSubmitting || midReplaceSubmitting"
          @click="selectTransferTab('transfer')"
        >
          转单
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="transferTab === 'midReplace'"
          :class="{ active: transferTab === 'midReplace' }"
          :disabled="transferSubmitting || midReplaceSubmitting"
          @click="selectTransferTab('midReplace')"
        >
          中途换人
        </button>
      </div>
      <div v-if="transferTab === 'transfer'" class="dialog-form">
        <div class="form-row">
          <label class="required">是否扣款</label>
          <el-radio-group v-model="transferForm.deduct" :disabled="transferSubmitting">
            <el-radio value="是">是</el-radio>
            <el-radio value="否">否</el-radio>
          </el-radio-group>
        </div>
        <div class="form-row">
          <label :class="{ required: transferForm.deduct === '是' }">扣款总额（元）</label>
          <input
            v-model="transferForm.amount"
            type="number"
            step="0.01"
            min="0"
            :disabled="transferForm.deduct === '否' || transferSubmitting"
            placeholder="若多人订单，此处为总值"
          />
          <span class="readonly">总扣款金额，由当前有效打手均分</span>
        </div>
        <div v-if="transferForm.deduct === '是'" class="form-row">
          <label class="required">扣款原因</label>
          <textarea
            v-model="transferForm.deductReason"
            maxlength="200"
            rows="3"
            :disabled="transferSubmitting"
            placeholder="请填写扣款原因，最多200字"
          />
        </div>
        <div class="form-row">
          <label class="required">选择转单类型</label>
          <el-radio-group v-model="transferForm.target" :disabled="transferSubmitting">
            <el-radio value="进入公共抢单大厅">进入公共抢单大厅</el-radio>
            <el-radio value="进入当前俱乐部">进入当前俱乐部</el-radio>
          </el-radio-group>
        </div>
      </div>
      <div v-else class="dialog-form mid-replace-dialog">
        <template v-if="midReplaceFormReady">
          <div class="form-row">
            <label>当前打手</label>
            <div class="mid-replace-current-players">
              <span v-if="midReplaceCurrentPlayersLoading">加载中…</span>
              <template v-else-if="midReplaceCurrentPlayers.length">
                <span v-for="player in midReplaceCurrentPlayers" :key="player.id">
                  {{ player.name || '未命名打手' }}（{{ player.id }}）<template v-if="player.clubName"> · {{ player.clubName }}<template v-if="player.clubId">（{{ player.clubId }}）</template></template>
                </span>
              </template>
              <span v-else>暂无当前打手信息</span>
            </div>
          </div>
          <div class="form-row">
            <label>剩余打手可得</label>
            <span class="readonly">
              {{ midReplaceCurrentRemainingAmount == null ? (midReplaceCurrentPlayersLoading ? '加载中…' : '暂无金额数据') : `${money(midReplaceCurrentRemainingAmount)}元` }}
            </span>
          </div>
          <div class="form-row">
            <label class="required">已完成金额</label>
            <div class="mid-replace-amount">
              <input
                v-model="midReplaceForm.completedAmount"
                type="number"
                min="0.01"
                :max="midReplaceCurrentRemainingAmount ?? undefined"
                step="0.01"
                :disabled="midReplaceSubmitting"
                placeholder="请输入已完成金额"
              />
              <span>元</span>
            </div>
          </div>
          <!-- <p class="mid-replace-note">已完成金额必须小于剩余打手可得金额，需为正数且最多两位小数。</p> -->
          <div class="form-row">
            <label class="required">换人方式</label>
            <el-radio-group
              v-model="midReplaceForm.mode"
              :disabled="midReplaceSubmitting"
            >
              <el-radio value="MANUAL">人工派单</el-radio>
              <el-radio value="HALL">放入大厅</el-radio>
              <el-radio value="DAILIANTONG">代练通</el-radio>
            </el-radio-group>
          </div>
          <div v-if="midReplaceForm.mode === 'MANUAL'" class="form-row">
            <label class="required">选择俱乐部</label>
            <el-select
              v-model="midReplaceForm.club"
              filterable
              clearable
              :loading="midReplaceClubLoading"
              :disabled="midReplaceSubmitting"
              placeholder="请选择俱乐部"
            >
              <el-option v-for="item in clubOptions" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </div>
          <div v-if="midReplaceForm.mode === 'MANUAL'" class="form-row">
            <label class="required">选择打手</label>
            <el-select
              v-model="midReplaceForm.targetPlayerId"
              filterable
              remote
              clearable
              reserve-keyword
              :remote-method="searchMidReplacePlayers"
              :loading="midReplacePlayersLoading"
              :disabled="!midReplaceForm.club || midReplaceSubmitting"
              placeholder="请先选择俱乐部，再选择打手"
              @visible-change="(visible) => visible && loadMidReplacePlayers(midReplaceForm.club, midReplaceSearchKeyword)"
            >
              <el-option
                v-for="player in midReplacePlayers"
                :key="player.id"
                :label="`${player.name || player.id}（${player.id}）`"
                :value="player.id"
              />
            </el-select>
          </div>
          <template v-if="midReplaceForm.mode === 'DAILIANTONG'">
            <div class="form-row">
              <label class="required">订单号（代练通）</label>
              <input
                v-model="midReplaceForm.dltOrderNo"
                maxlength="64"
                :disabled="midReplaceSubmitting"
                placeholder="请输入代练通订单号"
              />
            </div>
            <div class="form-row">
              <label class="required">派单价格（代练通）</label>
              <input
                v-model="midReplaceForm.dltPrice"
                type="number"
                min="0.01"
                :max="midReplaceMaxDltPrice ?? undefined"
                step="0.01"
                :disabled="midReplaceSubmitting"
                placeholder="请输入派单价格"
              />
              <span class="readonly">最多 {{ midReplaceMaxDltPrice == null ? '—' : `${money(midReplaceMaxDltPrice)}元` }}</span>
            </div>
            <div class="form-row">
              <label>备注（代练通）</label>
              <textarea
                v-model="midReplaceForm.dltRemark"
                rows="2"
                maxlength="200"
                :disabled="midReplaceSubmitting"
                placeholder="请输入备注"
              />
            </div>
          </template>
        </template>
      </div>
      <template #footer>
        <button
          class="btn btn-plain"
          :disabled="transferSubmitting || midReplaceSubmitting"
          @click="transferVisible = false"
        >
          取消
        </button>
        <button
          v-if="transferTab === 'transfer'"
          class="btn btn-primary"
          :disabled="transferSubmitting"
          @click="submitTransfer"
        >
          {{ transferSubmitting ? '转单中…' : '确定转单' }}
        </button>
        <button
          v-else
          class="btn btn-primary"
          :disabled="midReplaceSubmitting || !midReplaceFormReady"
          @click="submitMidReplace"
        >
          {{ midReplaceSubmitting ? '提交中…' : '确定换人' }}
        </button>
      </template>
    </AppModal>

    <!-- 审核（接口：audit，pass/reason） -->
    <AppModal v-model="auditVisible" title="审核" width="620px">
      <AuditDialog v-if="auditRow" ref="auditDialogRef" :row="auditRow" :logs="auditLogs" @submit="submitAudit" />
      <template #footer>
        <button class="btn btn-plain" @click="auditVisible = false">取消</button>
        <button class="btn btn-primary" @click="auditDialogRef?.submit()">确定</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.pay-voucher-upload {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  border: 1px dashed var(--primary-border-strong);
  border-radius: 8px;
  background: var(--primary-soft);
}

.pay-voucher-upload > span {
  flex-basis: 100%;
  color: var(--text-sub);
  font-size: 12px;
}

.price-proof-item {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.price-proof-item img {
  width: 88px;
  height: 88px;
  border-radius: 6px;
  object-fit: contain;
  background: var(--bg-card);
}

.pay-voucher-upload:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.mid-replace-amount {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mid-replace-current-players {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-main);
}

.transfer-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--input-border);
}

.transfer-tabs button {
  position: relative;
  padding: 10px 16px;
  border: 0;
  background: transparent;
  color: var(--text-sub);
  font-size: 14px;
  cursor: pointer;
}

.transfer-tabs button.active {
  color: var(--primary);
  font-weight: 600;
}

.transfer-tabs button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.transfer-tabs button.active::after {
  position: absolute;
  right: 12px;
  bottom: -1px;
  left: 12px;
  height: 2px;
  background: var(--primary);
  content: '';
}

.mid-replace-amount input {
  width: 180px;
}

.mid-replace-note {
  margin: 4px 0 0 130px;
  color: var(--text-sub);
  font-size: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.column-display-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 8px 13px;
  background: var(--bg-elevated);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.column-display-control {
  margin-left: auto;
}

.column-display-btn:hover {
  border-color: var(--primary-border-strong);
  background: var(--primary-faint);
}

.column-display-count {
  color: var(--text-sub);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.column-chooser-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: var(--text-main);
  font-size: 13px;
}

.column-chooser-heading button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: 12px;
  cursor: pointer;
}

.column-chooser-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}

.column-chooser-options :deep(.el-checkbox) {
  margin-right: 0;
}

.column-chooser-options :deep(.el-checkbox__label) {
  padding-left: 6px;
  color: var(--text-main);
  font-size: 12px;
}

.column-chooser-panel p {
  margin: 12px 0 0;
  color: var(--text-sub);
  font-size: 11px;
}

.feed-refresh-btn {
  border: 1px solid var(--primary-border);
  border-radius: 9px;
  padding: 8px 13px;
  background: var(--primary-faint);
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.feed-refresh-btn:hover:not(:disabled) {
  background: var(--primary-tint);
}

.feed-refresh-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.scope-switch {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
}

.scope-btn {
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 6px 14px;
  background: transparent;
  color: var(--text-sub);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.scope-btn:hover {
  color: var(--primary);
  background: var(--bg-hover);
}

.scope-btn.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: var(--text-invert);
  font-weight: 700;
  box-shadow: 0 6px 14px var(--primary-glow-strong);
}

.add-btn {
  border: none;
  border-radius: 10px;
  padding: 9px 20px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: var(--text-invert);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 20px var(--primary-glow-strong);
  transition: filter 0.18s ease, box-shadow 0.18s ease;
}

.add-btn:hover {
  filter: brightness(1.08);
  box-shadow: 0 14px 26px var(--primary-glow-strong);
}

.order-no-cell {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.order-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  flex: 0 0 auto;
}

.order-copy-btn:hover {
  background: var(--primary-faint);
}

.order-copy-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.order-channel-tag {
  min-width: 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-sub);
  font-size: 11px;
}

.special-tag {
  padding: 2px 6px;
  border-radius: 6px;
  background: linear-gradient(135deg, #ff8a65, #ff5a5f);
  color: var(--text-invert);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}

/* 订单类型标记显示在本平台订单号前 */
.order-type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-sub);
  background: var(--bg-hover);
}

.order-type-tag.is-special {
  color: #ff5a5f;
  background: rgba(255, 90, 95, 0.1);
}

/* 渠道首字标签 */
.channel-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 6px;
  background: var(--primary-faint);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.readonly-value {
  font-size: 13px;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}

.bind-option__spec {
  font-size: 13px;
  color: var(--text-main);
}

.bind-option__no {
  font-size: 12px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.muted-text {
  color: var(--text-faint);
  font-size: 12px;
}

.status-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  white-space: nowrap;
  color: #fff;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.status-success { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 2px 10px rgba(16, 185, 129, 0.35); }
.status-warning { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 2px 10px rgba(245, 158, 11, 0.35); }
.status-info { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35); }
.status-progress { background: linear-gradient(135deg, #8b5cf6, #7c3aed); box-shadow: 0 2px 10px rgba(139, 92, 246, 0.35); }
.status-danger { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 2px 10px rgba(239, 68, 68, 0.35); }
.status-muted { background: linear-gradient(135deg, #6b7280, #4b5563); box-shadow: 0 2px 8px rgba(107, 114, 128, 0.25); }

/* 订单标签独立列（原型列表字段） */
.tag-list {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.order-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
}

.after-sale-sync-tag {
  border: 0;
  font-family: inherit;
  cursor: pointer;
}

.after-sale-sync-tag:hover:not(:disabled) {
  text-decoration: underline;
}

.after-sale-sync-tag:disabled {
  cursor: wait;
  opacity: 0.7;
}

.tag-warn { color: #b45309; background: rgba(245, 158, 11, 0.12); }
.tag-info { color: #1d4ed8; background: rgba(59, 130, 246, 0.12); }
.tag-success { color: #0f9f6e; background: rgba(15, 159, 110, 0.1); }
.tag-danger { color: #d92d20; background: rgba(217, 45, 32, 0.1); }
.tag-muted { color: #475467; background: rgba(71, 84, 103, 0.1); }
.tag-purple { color: var(--primary); background: var(--primary-faint); }

.attr-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.claimer-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--text-main);
  line-height: 1.5;
  white-space: nowrap;
}

.claimer-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.owner-edit-btn {
  border: none;
  background: transparent;
  color: var(--brand-color, #409eff);
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
  line-height: 1;
}

.owner-edit-btn:hover {
  opacity: 0.8;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 4px 10px;
  flex-wrap: nowrap;
  min-width: max-content;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.link-btn:hover {
  background: var(--primary-faint);
}

.link-btn.primary {
  color: var(--primary);
  font-weight: 600;
}

.link-btn.danger { color: #d92d20; }
.link-btn.danger:hover { background: rgba(217, 45, 32, 0.08); }
.link-btn.warning { color: #d97706; }
.link-btn.warning:hover { background: rgba(217, 119, 6, 0.08); }
.link-btn.info { color: #1d4ed8; }
.link-btn.info:hover { background: rgba(29, 78, 216, 0.08); }

/* ===== 弹窗通用 ===== */
.dialog-form {
  display: grid;
  gap: 16px;
}

.form-row {
  display: grid;
  gap: 8px;
}

.form-row label {
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.form-row label.required::before {
  content: '*';
  color: #f04438;
  margin-right: 4px;
}

.claim-dialog :deep(.el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 22px;
  min-height: 30px;
}

.void-approval-state {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
}

.void-approval-state.is-pending { color: #b45309; background: #fffbeb; }
.void-approval-state.is-approved { color: #047857; background: #ecfdf5; }
.void-approval-state.is-rejected { color: #b91c1c; background: #fef2f2; }

.claim-dialog :deep(.el-radio) {
  margin-right: 0;
  height: 30px;
}

.qr-upload {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
  border: 1px dashed var(--primary-border-strong);
  border-radius: 8px;
  background: var(--primary-soft);
}

.qr-upload:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.qr-preview {
  width: 88px;
  height: 88px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
}

.qr-empty,
.qr-upload-tip {
  color: var(--text-faint);
  font-size: 12px;
}

.qr-upload-btn {
  display: inline-flex;
  align-items: center;
  border: 1px dashed var(--primary-border-strong);
  border-radius: 8px;
  padding: 7px 14px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12.5px;
  cursor: pointer;
}

.qr-upload-btn:hover {
  background: var(--primary-faint);
}

.qr-remove-btn {
  border: none;
  background: transparent;
  color: var(--danger, #d92d20);
  font-size: 12px;
  cursor: pointer;
}

.qr-upload-tip {
  flex-basis: 100%;
}

.bind-picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  background: var(--input-bg);
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.bind-picker-trigger:hover:not(:disabled),
.bind-picker-trigger[aria-expanded='true'] {
  border-color: var(--primary);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

.bind-picker-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bind-picker-trigger .is-placeholder {
  color: var(--text-faint);
}

.bind-picker-trigger__arrow {
  width: 8px;
  height: 8px;
  border-right: 1.5px solid var(--text-faint);
  border-bottom: 1.5px solid var(--text-faint);
  transform: rotate(45deg) translateY(-2px);
  transition: transform 0.18s ease;
}

.bind-picker-trigger[aria-expanded='true'] .bind-picker-trigger__arrow {
  transform: rotate(225deg) translate(-2px, -1px);
}

.bind-picker-panel {
  display: grid;
  gap: 10px;
  color: var(--text-main);
}

.bind-search-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bind-search-controls input {
  flex: 1;
  width: 0;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--input-border);
  border-radius: 9px;
  background: var(--input-bg);
  color: var(--text-main);
  font-size: 13px;
  outline: none;
}

.bind-search-controls input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

.bind-search-controls .btn {
  flex: none;
  min-width: 68px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border-soft);
  background: var(--bg-elevated);
  color: var(--text-main);
}

.bind-search-controls .btn:hover:not(:disabled) {
  border-color: var(--primary-border-strong);
  background: var(--primary-faint);
  color: var(--primary);
}

.bind-search-controls .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.bind-picker-options {
  display: grid;
  gap: 3px;
  max-height: 220px;
  overflow: auto;
  padding: 2px;
}

.bind-picker-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
}

.bind-picker-option:hover,
.bind-picker-option[aria-selected='true'] {
  background: var(--primary-faint);
}

.bind-picker-option[aria-selected='true'] .bind-option__spec {
  color: var(--primary);
  font-weight: 700;
}

.bind-picker-empty {
  padding: 18px 8px;
  color: var(--text-faint);
  font-size: 13px;
  text-align: center;
}

.bind-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
}

.bind-pagination .btn {
  min-width: 82px;
  padding: 7px 10px;
  border: 1px solid var(--border-soft);
  background: var(--bg-elevated);
  color: var(--text-main);
}

.bind-pagination .btn:hover:not(:disabled) {
  border-color: var(--primary-border-strong);
  background: var(--primary-faint);
  color: var(--primary);
}

.bind-pagination .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.bind-pagination__page {
  color: var(--text-sub);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

:deep(.order-column-chooser-popper) {
  padding: 12px;
  border-color: var(--border-soft);
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--text-main);
}

:deep(.bind-picker-popper) {
  padding: 12px;
  border-color: var(--border-soft);
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--text-main);
}

.form-row input,
.form-row textarea {
  width: 100%;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 13px;
  color: var(--text-main);
  box-sizing: border-box;
  background: var(--input-bg);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.form-row input:focus,
.form-row textarea:focus {
  border-color: var(--primary);
  outline: none;
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 4px var(--input-focus-ring);
}

.form-row textarea {
  resize: vertical;
  min-height: 100px;
}

.add-paste-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.add-paste-heading .add-parse-btn {
  flex-shrink: 0;
  padding: 5px 10px;
}

.form-row textarea {
  resize: vertical;
  min-height: 76px;
}

.dialog-form :deep(.el-select) {
  width: 100%;
}

.dialog-form :deep(.el-select__wrapper) {
  min-height: 42px;
  border-radius: 12px !important;
  padding: 4px 14px;
  align-items: center;
}

.dialog-form :deep(.el-select:not(.is-multiple) .el-select__wrapper) {
  height: 42px !important;
  line-height: 34px;
}

.dialog-form :deep(.el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 22px;
  min-height: 30px;
}

.dialog-form :deep(.el-radio) {
  margin-right: 0;
  height: 30px;
}

.checkbox-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.amount-input span {
  color: var(--text-sub);
  font-size: 13px;
}

.char-count {
  text-align: right;
  color: var(--text-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

/* 查看关系弹窗 */
.relation-dialog {
  display: grid;
  gap: 16px;
}

.relation-row {
  display: flex;
  gap: 16px;
  align-items: baseline;
}

.relation-row > span {
  flex: 0 0 64px;
  color: var(--text-sub);
  font-size: 12.5px;
}

.relation-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-main);
  word-break: break-all;
}

.relation-main,
.relation-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.relation-third {
  color: var(--text-faint);
  font-size: 11.5px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.form-tip {
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.28);
  color: var(--warning-text);
  font-size: 12px;
  line-height: 1.8;
}

/* ===== 底部按钮 ===== */
.btn {
  border: none;
  border-radius: 12px;
  padding: 10px 22px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: background 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, transform 0.18s ease;
}

.btn:active {
  transform: translateY(1px);
}

.btn-plain {
  background: var(--bg-hover);
  color: var(--text-sub);
}

.btn-plain:hover {
  background: var(--border-faint);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: var(--text-invert);
  box-shadow: 0 12px 24px var(--primary-glow-strong);
}

.btn-primary:hover {
  filter: brightness(1.06);
  box-shadow: 0 16px 30px var(--primary-border-strong);
}
</style>
