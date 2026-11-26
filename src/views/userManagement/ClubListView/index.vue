<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { useConfirm } from '../../../composables/useConfirm';
import { useToast } from '../../../composables/useToast';
import { useListMemory } from '../../../composables/useListMemory';
import { useFileDropPaste } from '../../../composables/useFileDropPaste';
import { clubApi } from '../../../api/modules/club';
import { gameApi } from '../../../api/modules/game';
import { fileApi } from '../../../api/modules/file';
import { useUserStore } from '../../../stores/user';

const { confirm } = useConfirm();
const { show } = useToast();

/** 当前角色：客服（service）仅有查看权限，隐藏新增按钮与全部操作按钮 */
const userStore = useUserStore();
const isService = computed(() => (userStore.role || '') === 'service');
const isAdmin = computed(() => (userStore.role || '') === 'admin');

// ============ 筛选 ============
const filter = reactive({
  clubId: '',
  clubName: '',
  phone: '',
  accountStatus: '',
  createTime: [],
});

const { page, pageSize, onPageSizeChange, onPageChange, restoreFilter, rememberFilter } = useListMemory({
  filterKeys: ['clubId', 'clubName', 'phone', 'accountStatus', 'createTime'],
});
restoreFilter(filter);

// ============ 列表（服务端分页） ============
const rows = ref([]);
const total = ref(0);
const loading = ref(false);

const allColumns = [
  { key: 'id', title: '俱乐部ID' },
  { key: 'name', title: '俱乐部名称' },
  { key: 'phone', title: '俱乐部手机号' },
  { key: 'license', title: '营业执照' },
  { key: 'incomeBalance', title: '收益余额(元)' },
  { key: 'depositBalance', title: '押金余额(元)' },
  { key: 'completedCount', title: '已完成' },
  { key: 'rejectedCount', title: '未通过' },
  { key: 'frozenCount', title: '冻结' },
  { key: 'status', title: '状态' },
  { key: 'op', title: '操作' },
];

/** 客服仅查看：隐藏"操作"列（编辑/分润/规格/资产管理/接单/冻结/退店/停用启用等按钮均不可见） */
const columns = computed(() =>
  isService.value ? allColumns.filter((col) => col.key !== 'op') : allColumns
);

const accountStatusOptions = [
  { label: '可接单', value: 'CAN_TAKE' },
  { label: '禁止接单', value: 'BLOCK_TAKE' },
  { label: '未冻结', value: 'UNFROZEN' },
  { label: '冻结', value: 'FROZEN' },
  { label: '在店', value: 'IN_STORE' },
  { label: '退店', value: 'QUIT' },
];

const searchFields = [
  { prop: 'clubId', label: '俱乐部ID', type: 'input', placeholder: '请输入俱乐部ID', span: 6 },
  { prop: 'clubName', label: '俱乐部名称', type: 'input', placeholder: '请输入俱乐部名称', span: 6 },
  { prop: 'phone', label: '俱乐部手机号', type: 'input', placeholder: '请输入手机号', span: 6 },
  {
    prop: 'accountStatus',
    label: '状态',
    type: 'select',
    placeholder: '全部',
    span: 6,
    options: [{ label: '全部', value: '' }, ...accountStatusOptions],
  },
  {
    prop: 'createTime',
    label: '创建时间',
    type: 'daterange',
    startPlaceholder: '开始时间',
    endPlaceholder: '结束时间',
    span: 6,
    shortcuts: [
      { text: '今天', value: () => { const d = new Date(); return [d, d]; } },
      { text: '最近7天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); return [start, end]; } },
      { text: '最近30天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 29); return [start, end]; } },
    ],
  },
];

function toDateStr(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 时间筛选传参：yyyy-MM-ddTHH:mm:ss（后端只接受 yyyy-MM-dd 或 yyyy-MM-ddTHH:mm:ss，空格分隔会报 400） */
function toDateTimeStr(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatMoney(value) {
  if (value === undefined || value === null || value === '') return '0.00';
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function orderCount(value) {
  const num = Number(value);
  return `${Number.isFinite(num) ? num : 0}单`;
}

async function fetchList() {
  loading.value = true;
  try {
    const [start, end] = Array.isArray(filter.createTime) ? filter.createTime : [];
    const res = await clubApi.list({
      page: page.value,
      pageSize: pageSize.value,
      id: filter.clubId,
      name: filter.clubName,
      phone: filter.phone,
      accountStatus: filter.accountStatus,
      createdFrom: toDateTimeStr(start),
      createdTo: toDateTimeStr(end),
    });
    rows.value = res.list || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch(values) {
  Object.assign(filter, values);
  rememberFilter(filter, true);
  fetchList();
}

function handleReset() {
  Object.keys(filter).forEach((key) => {
    if (Array.isArray(filter[key])) filter[key] = [];
    else filter[key] = '';
  });
  rememberFilter(filter, true);
  fetchList();
}

function pageChange(nextPage) {
  onPageChange(nextPage);
  fetchList();
}

// ============ 新增 / 编辑俱乐部 ============
const editModalVisible = ref(false);
const editingId = ref(null); // null = 新增
const editForm = reactive({
  name: '',
  phone: '',
  password: '',
  licenseUrl: '', // 营业执照图片地址（后端 C1 开放后生效）
  files: [], // 文件（上限5组文件）[{url,name}]
  remark: '', // 备注（后端 C1 开放后生效）
});

function openAdd() {
  editingId.value = null;
  Object.assign(editForm, { name: '', phone: '', password: '', licenseUrl: '', files: [], remark: '' });
  specRowList.value = [{ gameId: null, mode: 'all', specId: null }];
  editModalVisible.value = true;
  loadSpecCatalog().catch(() => {});
}

async function openEdit(row) {
  editingId.value = row.id;
  Object.assign(editForm, {
    name: row.name || '',
    phone: row.phone || '',
    password: '',
    licenseUrl: row.licenseUrl || '',
    files: Array.isArray(row.files) ? row.files.map((f) => (typeof f === 'string' ? { url: f, name: f } : { url: f.url, name: f.name || f.url })) : [],
    remark: row.remark || '',
  });
  specRowList.value = [];
  editModalVisible.value = true;
  try {
    await loadSpecCatalog();
    const list = normalizeSpecList(await clubApi.getSpecs(Number(row.id)));
    specRowList.value = list.map((cfg) =>
      cfg.all
        ? { gameId: Number(cfg.gameId), mode: 'all', specId: null }
        : { gameId: Number(cfg.gameId), mode: 'single', specId: Number(cfg.specId) },
    );
    if (!specRowList.value.length) specRowList.value = [{ gameId: null, mode: 'all', specId: null }];
  } catch {
    /* 错误由 request.js 统一提示 */
  }
}

async function submitEdit() {
  if (!editForm.name.trim()) {
    show('请输入俱乐部名称', 'warning');
    return;
  }
  if (!editForm.phone.trim()) {
    show('请输入手机号', 'warning');
    return;
  }
  const hasSpec = specRowList.value.some((r) => r.gameId);
  if (!hasSpec) {
    show('请选择可接单规格', 'warning');
    return;
  }
  const payload = {
    name: editForm.name.trim(),
    phone: editForm.phone.trim(),
  };
  // 编辑时密码留空表示不修改
  if (editForm.password) payload.password = editForm.password;
  // 后端 C1 开放后生效：营业执照 / 文件 / 备注先随表单提交，暂未开放的字段由后端忽略
  if (editForm.licenseUrl) payload.licenseUrl = editForm.licenseUrl;
  payload.remark = editForm.remark || '';
  payload.files = editForm.files.map((f) => ({ url: f.url, name: f.name }));
  // 可接单规格：全选游戏传 {gameId,all:true}，单规格传 {gameId,specId}
  payload.specs = specRowList.value
    .filter((r) => r.gameId)
    .map((r) => (r.mode === 'all' ? { gameId: r.gameId, all: true } : { gameId: r.gameId, specId: r.specId }));
  try {
    if (editingId.value) {
      await clubApi.update(editingId.value, payload);
      show('编辑成功', 'success');
    } else {
      await clubApi.create(payload);
      show('新增成功', 'success');
    }
    editModalVisible.value = false;
    fetchList();
  } catch (e) {
    // 错误提示由 request.js 统一弹出
  }
}

// ============ 新增 / 编辑弹窗：营业执照与文件上传 ============
const maxEditFiles = 5;
const licenseUploading = ref(false);
const editFileUploading = ref(false);

function openLicensePicker() {
  document.getElementById('club-license-input')?.click();
}

async function handleLicense(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  licenseUploading.value = true;
  try {
    const res = await fileApi.upload(file);
    editForm.licenseUrl = res.url;
    show('营业执照已上传', 'success');
  } catch {
    /* 统一提示 */
  } finally {
    licenseUploading.value = false;
  }
}

function removeLicense() {
  editForm.licenseUrl = '';
}

function openEditFilePicker() {
  document.getElementById('club-edit-file-input')?.click();
}

async function uploadClubFiles(picked, targetFiles, maxFiles, uploading) {
  if (!picked.length) return;
  if (uploading.value) return;
  const room = maxFiles - targetFiles.length;
  if (room <= 0) return show(`最多上传 ${maxFiles} 个文件`, 'warning');
  uploading.value = true;
  try {
    for (const file of picked.slice(0, room)) {
      const res = await fileApi.upload(file);
      targetFiles.push({ url: res.url, name: res.name || res.fileName || res.originalFilename || file.name });
    }
    show('文件已上传', 'success');
  } catch {
    /* 统一提示 */
  } finally {
    uploading.value = false;
  }
}

async function handleEditFiles(event) {
  const picked = Array.from(event.target.files || []);
  event.target.value = '';
  await uploadClubFiles(picked, editForm.files, maxEditFiles, editFileUploading);
}

const {
  isDragging: editFilesDragging,
  onDragOver: onEditFilesDragOver,
  onDragEnter: onEditFilesDragEnter,
  onDragLeave: onEditFilesDragLeave,
  onDrop: onEditFilesDrop,
  onPaste: onEditFilesPaste,
} = useFileDropPaste((files) => uploadClubFiles(files, editForm.files, maxEditFiles, editFileUploading));

function removeEditFile(index) {
  editForm.files.splice(index, 1);
}

function isImageFile(url = '') {
  return /\.(png|jpe?g|gif|webp|bmp|svg|jfif)(\?|#|$)/i.test(url);
}

/** 综合 URL 与文件名后缀判断是否图片（CDN 地址常不带后缀） */
function fileIsImage(item) {
  return isImageFile(item?.url) || isImageFile(item?.name);
}

/* ===== 文件展示交互（视频/音频弹窗预览无下载；其他文件点击直接下载） ===== */
const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];
const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'];

const getFileExt = (name = '') => {
  const dot = (name || '').lastIndexOf('.');
  return dot > -1 ? (name || '').slice(dot + 1).toLowerCase() : '';
};
const isVideoFile = (item) => VIDEO_EXTS.includes(getFileExt(item?.name || ''));
const isAudioFile = (item) => AUDIO_EXTS.includes(getFileExt(item?.name || ''));

const mediaPreview = ref({ visible: false, url: '', name: '', kind: '' }); // kind: video | audio
function openMediaPreview(item) {
  if (!item || !item.url) return;
  mediaPreview.value = {
    visible: true,
    url: item.url,
    name: item.name || '预览',
    kind: isVideoFile(item) ? 'video' : 'audio',
  };
}

/** 触发下载：创建临时 a 标签模拟点击（跨域资源时以服务器响应头为准，属前端唯一可行方式） */
function triggerDownload(item) {
  if (!item || !item.url) return;
  const a = document.createElement('a');
  a.href = item.url;
  a.download = item.name || '';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** 视频/音频文件卡片图标文案 */
const mediaIcon = (item) => (isVideoFile(item) ? '🎬' : '🎵');

function licenseImages(row) {
  const raw = row.licenseUrl || row.licenses;
  if (!raw) return [];
  return Array.isArray(raw) ? raw.filter(Boolean) : [raw];
}

// ============ 新增 / 编辑弹窗：表单内可接单规格（行式：游戏下拉 + 规格下拉 + 增减行） ============
const specRowList = ref([{ gameId: null, mode: 'all', specId: null }]);

function specOptionsOf(gameId) {
  const game = specCatalog.value.find((g) => g.gameId === gameId);
  return game ? game.specs : [];
}

function specSelectValue(row) {
  return row.mode === 'all' ? 'all' : String(row.specId ?? '');
}

function onSpecGameChange(row) {
  row.mode = 'all';
  row.specId = null;
}

function onSpecSelect(row, value) {
  if (value === 'all') {
    row.mode = 'all';
    row.specId = null;
  } else {
    row.mode = 'single';
    row.specId = Number(value);
  }
}

function addSpecRow() {
  specRowList.value.push({ gameId: null, mode: 'all', specId: null });
}

function removeSpecRow(index) {
  specRowList.value.splice(index, 1);
  if (!specRowList.value.length) specRowList.value.push({ gameId: null, mode: 'all', specId: null });
}

// ============ 营业执照预览 ============
const licenseModalVisible = ref(false);
const currentLicenseRow = ref(null);

const currentLicenseUrl = computed(() => currentLicenseRow.value?.licenseUrl || '');

function openLicenseViewer(row) {
  currentLicenseRow.value = row;
  licenseModalVisible.value = true;
}

// ============ 启用 / 停用账号 ============
async function toggleStatus(row) {
  const next = row.status === 'NORMAL' ? 'DISABLED' : 'NORMAL';
  const actionLabel = next === 'DISABLED' ? '停用' : '启用';
  const ok = await confirm({
    title: '提示',
    message: `确认${actionLabel}俱乐部「${row.name}」吗？${next === 'DISABLED' ? '停用后该俱乐部将无法登录。' : ''}`,
    okText: '确认',
  });
  if (!ok) return;
  try {
    await clubApi.updateStatus(row.id, next);
    row.status = next;
    show(`${actionLabel}成功`, 'success');
  } catch (e) {
    // 错误提示由 request.js 统一弹出
  }
}

// ============ 接单 / 冻结 / 退店标志 ============
function canShowAction(row, action) {
  switch (action) {
    case '禁止接单':
      return Number(row.canTake) === 1;
    case '开启接单':
      return Number(row.canTake) === 0;
    case '钱包冻结':
      return Number(row.walletFrozen ?? 0) !== 1;
    case '钱包解冻':
      return Number(row.walletFrozen ?? 0) === 1;
    case '退店':
      return Number(row.inStore) === 1;
    case '恢复在店':
      return Number(row.inStore) === 0;
    default:
      return true;
  }
}

const ACTION_RULES = {
  禁止接单: '仅禁止主动接单（抢单大厅），系统仍可派发订单',
  钱包冻结: '冻结后押金、收益均无法提现',
  退店: '退店后该账号将变为禁止接单，且不再允许转单、派单；押金提现需同时满足已退店且钱包未冻结',
};

async function triggerAction(action, row) {
  const ok = await confirm({
    title: '提示',
    message: ACTION_RULES[action]
      ? `确认${action}俱乐部「${row.name}」吗？\n${ACTION_RULES[action]}`
      : `确认${action}俱乐部「${row.name}」吗？此操作将影响其当前状态。`,
    okText: '确认',
  });
  if (!ok) return;

  let flags = {};
  if (action === '禁止接单') flags = { canTake: 0 };
  if (action === '开启接单') flags = { canTake: 1 };
  if (action === '钱包冻结') flags = { walletFrozen: 1 };
  if (action === '钱包解冻') flags = { walletFrozen: 0 };
  if (action === '退店') flags = { inStore: 0 };
  if (action === '恢复在店') flags = { inStore: 1 };

  try {
    await clubApi.updateFlags(row.id, flags);
    // 本地同步可见状态；列表接口已返回 walletFrozen，刷新列表后以接口字段为准
    if (action === '禁止接单') row.canTake = 0;
    if (action === '开启接单') row.canTake = 1;
    if (action === '钱包冻结') row.walletFrozen = 1;
    if (action === '钱包解冻') row.walletFrozen = 0;
    if (action === '退店') {
      // 规则：退店后该账号变为禁止接单
      row.inStore = 0;
      row.canTake = 0;
      row.quitAt = new Date().toISOString();
    }
    if (action === '恢复在店') {
      row.inStore = 1;
      row.quitAt = '';
    }
    show(`${action}成功`, 'success');
  } catch (e) {
    // 错误提示由 request.js 统一弹出
  }
}

// ============ 分润配置 ============
const configDialogVisible = ref(false);
const profitLoading = ref(false);
const configSaving = ref(false);
const clearProfitConfigsPending = ref(false);
const profitLoadError = ref(false);
const profitCurrentRow = ref(null);
const specKeyword = ref('');
const specViewFilter = ref('all');
const profitCopyVisible = ref(false);
const profitCopySaving = ref(false);
const profitCopyClubLoading = ref(false);
const profitCopyError = ref('');
const profitCopySearchHint = ref('');
const profitCopySourceId = ref('');
const profitCopyTargetIds = ref([]);
const profitCopyClubOptions = ref([]);
let profitCopySearchSequence = 0;
let profitCopySearchTimer = null;
let specCopySearchTimer = null;
// 分润类型：percent 百分比分润（统一比例）/ fixed 固定分润（按规格填金额）
const profitMode = ref('percent');
const percentRate = ref('');
// 每行：{ gameId, gameName, specId, specName, configured, clubRate, clubFixed, playerRate, playerFixed, settleDays, fixedAmount }
const profitRows = ref([]);
const fixedProfitAmounts = reactive({});

const configDialogTitle = computed(() => `俱乐部配置 - ${profitCurrentRow.value?.name ?? ''}`);

// 平台分润 = 100 - 俱乐部/打手总分润
const platformRateText = computed(() => {
  const rate = Number(percentRate.value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return '--';
  return `${(100 - rate).toFixed(2)}%`;
});

const authorizedSpecCount = computed(() =>
  specGameRows.value.reduce((count, game) =>
    count + (game.all ? game.specs.length : game.checked.size), 0)
);

const allSpecCount = computed(() =>
  specGameRows.value.reduce((count, game) => count + game.specs.length, 0)
);

const configuredFixedAmountCount = computed(() =>
  specGameRows.value.reduce((count, game) =>
    count + game.specs.filter((spec) => hasFixedAmount(spec)).length, 0)
);

function hasFixedAmount(spec) {
  const amount = fixedProfitAmounts[spec.id];
  return amount !== '' && amount !== undefined && amount !== null;
}

const visibleSpecGameRows = computed(() => {
  const keyword = specKeyword.value.trim().toLowerCase();
  return specGameRows.value.filter((game) => {
    const gameMatchesKeyword = !keyword || String(game.gameName || '').toLowerCase().includes(keyword);
    const hasVisibleSpecs = game.specs.some((spec) => {
      const matchesKeyword = gameMatchesKeyword
        || String(spec.name || '').toLowerCase().includes(keyword)
        || String(spec.specNo || '').toLowerCase().includes(keyword);
      if (!matchesKeyword) return false;
      if (specViewFilter.value === 'configured') return hasFixedAmount(spec);
      if (specViewFilter.value === 'authorized') return isSpecSelected(game, spec.id);
      return true;
    });
    return hasVisibleSpecs || (
      !game.specs.length &&
      specViewFilter.value === 'all' &&
      gameMatchesKeyword
    );
  });
});

function visibleSpecs(game) {
  const keyword = specKeyword.value.trim().toLowerCase();
  const gameMatchesKeyword = !keyword || String(game.gameName || '').toLowerCase().includes(keyword);
  return game.specs.filter((spec) => {
    const matchesKeyword = gameMatchesKeyword
      || String(spec.name || '').toLowerCase().includes(keyword)
      || String(spec.specNo || '').toLowerCase().includes(keyword);
    if (!matchesKeyword) return false;
    if (specViewFilter.value === 'configured') return hasFixedAmount(spec);
    if (specViewFilter.value === 'authorized') return isSpecSelected(game, spec.id);
    return true;
  });
}

function clearSpecKeyword() {
  specKeyword.value = '';
}

function isSpecSelected(game, specId) {
  return game.all || game.checked.has(Number(specId));
}

function toProfitArray(list) {
  if (Array.isArray(list)) return list;
  if (list && typeof list === 'object') {
    if (Array.isArray(list.list)) return list.list;
    if (Array.isArray(list.items)) return list.items;
    if (Array.isArray(list.data)) return list.data;
  }
  return [];
}

async function loadConfiguration(clubId) {
  profitLoading.value = true;
  specLoading.value = true;
  profitLoadError.value = false;
  specLoadError.value = false;
  specLoadErrorMsg.value = '';
  try {
    const [response] = await Promise.all([
      clubApi.getConfiguration(Number(clubId)),
      loadSpecCatalog(),
    ]);
    const configuration = response?.data ?? response;
    if (!configuration || !Array.isArray(configuration.specs) || !Array.isArray(configuration.profitConfigs)) {
      throw new Error('俱乐部配置响应格式异常');
    }

    buildSpecRows(normalizeSpecList(configuration.specs));
    const specById = new Map(specCatalog.value.flatMap((game) =>
      game.specs.map((spec) => [Number(spec.id), { ...spec, gameId: Number(game.gameId), gameName: game.gameName }])
    ));
    profitRows.value = toProfitArray(configuration.profitConfigs).map((item) => {
      const specId = Number(item.specId);
      const spec = specById.get(specId) || {};
      return {
        gameId: Number(item.gameId ?? spec.gameId),
        gameName: item.gameName || spec.gameName || '',
        specId,
        specName: item.specName || spec.name || '',
        configured: true,
        clubMode: item.clubMode || 'PERCENT',
        clubRate: item.clubRate ?? '',
        clubFixed: item.clubFixed ?? '',
        playerMode: item.playerMode || 'PERCENT',
        playerRate: item.playerRate ?? '',
        playerFixed: item.playerFixed ?? '',
        settleDays: item.settleDays ?? '',
      };
    });
    Object.keys(fixedProfitAmounts).forEach((specId) => delete fixedProfitAmounts[specId]);
    profitRows.value.forEach((row) => {
      fixedProfitAmounts[row.specId] = row.clubMode === 'FIXED' ? row.clubFixed : '';
    });
  } catch (error) {
    profitLoadError.value = true;
    specLoadError.value = true;
    specLoadErrorMsg.value = error?.message || '配置加载失败，请检查接口或稍后重试';
  } finally {
    profitLoading.value = false;
    specLoading.value = false;
  }
}

async function openConfig(row) {
  clearProfitConfigsPending.value = false;
  profitCurrentRow.value = row;
  currentRow.value = row;
  specKeyword.value = '';
  specViewFilter.value = 'all';
  profitRows.value = [];
  Object.keys(fixedProfitAmounts).forEach((specId) => delete fixedProfitAmounts[specId]);
  profitMode.value = 'percent';
  percentRate.value = '';
  specGameRows.value = [];
  profitLoadError.value = false;
  specLoadError.value = false;
  specLoadErrorMsg.value = '';
  configDialogVisible.value = true;
  await loadConfiguration(row.id);

  const authorizedIds = new Set(specGameRows.value.flatMap((game) =>
    game.all ? game.specs.map((spec) => Number(spec.id)) : [...game.checked]
  ));
  const authorizedConfigs = profitRows.value.filter((config) => authorizedIds.has(config.specId));
  if (configuration.mode === 'FIXED' || authorizedConfigs.some((config) => config.clubMode === 'FIXED')) {
    profitMode.value = 'fixed';
  }

  const configuredRates = authorizedConfigs
    .filter((config) => config.clubMode === 'PERCENT')
    .map((r) => Number(r.clubRate));
  const rateSet = new Set(configuredRates.filter((v) => Number.isFinite(v)));
  const defaultClubRate = configuration.clubRate;
  percentRate.value = defaultClubRate !== undefined && defaultClubRate !== null && defaultClubRate !== ''
    ? defaultClubRate
    : rateSet.size === 1
      ? [...rateSet][0]
      : '';
}

async function loadProfitCopyClubs(keyword = '') {
  const sequence = ++profitCopySearchSequence;
  profitCopyClubLoading.value = true;
  try {
    const result = await clubApi.list({
      page: 1,
      pageSize: 100,
      name: String(keyword || '').trim(),
    });
    if (sequence !== profitCopySearchSequence) return;

    const clubs = (result?.list || []).map((club) => ({
      id: Number(club.id),
      name: club.name || `俱乐部 ${club.id}`,
    }));
    const resultTotal = Number(result?.total) || clubs.length;
    profitCopySearchHint.value = String(keyword || '').trim()
      ? clubs.length
        ? `找到 ${resultTotal} 家俱乐部，请在下方来源或目标下拉框中选择`
        : '没有找到匹配的俱乐部，请修改名称后重试'
      : `已加载 ${clubs.length} 家俱乐部${resultTotal > clubs.length ? `（共 ${resultTotal} 家，可输入名称搜索）` : ''}`;
    const selectedIds = new Set([
      Number(profitCurrentRow.value?.id),
      Number(profitCopySourceId.value),
      ...profitCopyTargetIds.value.map(Number),
    ].filter(Number.isFinite));
    const preserved = profitCopyClubOptions.value.filter((club) => selectedIds.has(club.id));
    const optionsById = new Map([...preserved, ...clubs].map((club) => [club.id, club]));
    profitCopyClubOptions.value = [...optionsById.values()];
  } catch {
    if (sequence === profitCopySearchSequence) {
      profitCopyError.value = '俱乐部列表加载失败，请检查后重试';
      profitCopySearchHint.value = '';
    }
  } finally {
    if (sequence === profitCopySearchSequence) profitCopyClubLoading.value = false;
  }
}

function scheduleProfitCopySearch(keyword = '') {
  if (profitCopySearchTimer) clearTimeout(profitCopySearchTimer);
  profitCopySearchTimer = setTimeout(() => {
    profitCopySearchTimer = null;
    loadProfitCopyClubs(keyword);
  }, 300);
}

function openProfitCopy() {
  profitCopyError.value = '';
  profitCopySearchHint.value = '';
  profitCopySourceId.value = '';
  profitCopyTargetIds.value = profitCurrentRow.value?.id ? [Number(profitCurrentRow.value.id)] : [];
  profitCopyClubOptions.value = profitCurrentRow.value
    ? [{ id: Number(profitCurrentRow.value.id), name: profitCurrentRow.value.name || '' }]
    : [];
  profitCopyVisible.value = true;
  loadProfitCopyClubs();
}

onBeforeUnmount(() => {
  if (profitCopySearchTimer) clearTimeout(profitCopySearchTimer);
  if (specCopySearchTimer) clearTimeout(specCopySearchTimer);
});

async function submitProfitCopy() {
  if (profitCopySaving.value) return;
  const sourceClubId = Number(profitCopySourceId.value);
  const targetClubIds = [...new Set(profitCopyTargetIds.value.map(Number))];
  if (!Number.isInteger(sourceClubId) || sourceClubId <= 0) {
    profitCopyError.value = '请选择来源俱乐部';
    return;
  }
  if (!targetClubIds.length) {
    profitCopyError.value = '请选择至少一个目标俱乐部';
    return;
  }
  if (targetClubIds.includes(sourceClubId)) {
    profitCopyError.value = '来源俱乐部不能同时作为目标俱乐部';
    return;
  }
  profitCopyError.value = '';
  if (profitCopySaving.value) return;

  profitCopySaving.value = true;
  try {
    const result = await clubApi.copyProfitConfigs(sourceClubId, targetClubIds);
    profitCopyVisible.value = false;
    if (result?.inserted != null || result?.updated != null || result?.hiddenOff != null) {
      const inserted = Number(result.inserted) || 0;
      const updated = Number(result.updated) || 0;
      const hiddenOff = Number(result.hiddenOff) || 0;
      const listVisible = result.listVisible == null ? NaN : Number(result.listVisible);
      const hiddenNames = Array.isArray(result.hiddenOffNames)
        ? result.hiddenOffNames.filter(Boolean).map(String)
        : [];
      const hiddenNamesText = hiddenNames.length
        ? `：${hiddenNames.slice(0, 3).join('、')}${hiddenNames.length > 3 ? `等${hiddenNames.length}项` : ''}`
        : '';
      let message = `新增 ${inserted} 条，更新 ${updated} 条`;
      if (hiddenOff > 0) message += `；其中 ${hiddenOff} 条因游戏停用未显示${hiddenNamesText}`;
      if (Number.isFinite(listVisible)) message += `；列表可见 ${listVisible} 条`;
      show(message, 'success', 6000);
    } else {
      show(
        result?.copied != null
          ? `分润配置复制成功，共复制到 ${result.copied} 个俱乐部`
          : '分润配置复制成功',
        'success',
      );
    }
    if (targetClubIds.includes(Number(profitCurrentRow.value?.id))) {
      await loadConfiguration(Number(profitCurrentRow.value.id));
    }
  } catch {
    profitCopyError.value = '复制失败，请检查提示信息后重试';
  } finally {
    profitCopySaving.value = false;
  }
}

async function clearConfigurationSelection() {
  if (profitMode.value !== 'fixed' || configSaving.value || profitLoading.value || specLoading.value) return;
  const ok = await confirm({
    title: '清空选择',
    message: '确定清空全部规格勾选和固定金额吗？清空后需点击“保存全部”才会生效。',
    okText: '确认清空',
  });
  if (!ok || profitMode.value !== 'fixed' || configSaving.value || !configDialogVisible.value) return;
  clearProfitConfigsPending.value = true;
  specGameRows.value.forEach((game) => {
    game.all = false;
    game.checked.clear();
    game.specs.forEach((spec) => {
      fixedProfitAmounts[spec.id] = '';
    });
  });
  Object.keys(fixedProfitAmounts).forEach((specId) => { fixedProfitAmounts[specId] = ''; });
  specKeyword.value = '';
  specViewFilter.value = 'all';
  show('已清空全部规格选择和固定金额，点击“保存全部”后生效', 'success');
}

function buildConfigurationPayload() {
  const specs = buildSpecPayload();
  if (!specs.length && !Object.values(fixedProfitAmounts).some((amount) => amount != null && String(amount).trim() !== '')) {
    return {
      mode: 'FIXED', specs: [], profitConfigs: [],
      ...(clearProfitConfigsPending.value ? { clearProfitConfigs: true } : {}),
    };
  }
  if (profitMode.value === 'percent') {
    const rate = Number(percentRate.value);
    if (String(percentRate.value).trim() === '' || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      show('俱乐部/打手总分润需为 0-100 的数字', 'warning');
      return;
    }
    if (!authorizedSpecCount.value) {
      show('该俱乐部暂无授权规格，无法保存分润配置', 'warning');
      return;
    }
    return { mode: 'PERCENT', clubRate: rate, specs };
  }

  const allSpecs = specGameRows.value.flatMap((game) =>
    game.specs.map((spec) => ({
      ...spec,
      gameId: game.gameId,
      gameName: game.gameName,
    }))
  );
  const profitConfigs = [];
  const hasPercentageFallback = specGameRows.value.some((game) =>
    game.specs.some((spec) => isSpecSelected(game, spec.id) && !hasFixedAmount(spec))
  );
  const rateText = String(percentRate.value).trim();
  let clubRate;
  if (hasPercentageFallback || rateText !== '') {
    const rate = Number(rateText);
    if (rateText === '' || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      show('请先在“百分比分润”页签设置 0-100 的比例', 'warning');
      return;
    }
    clubRate = rate;
  }

  for (const spec of allSpecs) {
    const rawAmount = fixedProfitAmounts[spec.id];
    if (rawAmount === '' || rawAmount === undefined || rawAmount === null) continue;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 0 ||
      !/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(String(rawAmount).trim())) {
      show(`「${spec.gameName}·${spec.name}」金额需为非负数，最多两位小数`, 'warning');
      return;
    }
    profitConfigs.push({
      specId: spec.id,
      clubMode: 'FIXED',
      clubFixed: amount,
      playerMode: 'FIXED',
      playerFixed: 0,
    });
  }

  return {
    mode: 'FIXED',
    ...(clearProfitConfigsPending.value ? { clearProfitConfigs: true } : {}),
    ...(clubRate === undefined ? {} : { clubRate }),
    specs,
    profitConfigs,
  };
}

function buildSpecPayload() {
  return specGameRows.value
    .filter((row) => row.all || row.checked.size > 0)
    .map((row) => ({
      gameId: row.gameId,
      all: row.all,
      specIds: row.all ? [] : [...row.checked],
    }));
}

async function submitCombinedConfig() {
  if (!profitCurrentRow.value || configSaving.value) return;
  if (profitLoading.value || specLoading.value || profitLoadError.value || specLoadError.value) {
    show('配置数据未完整加载，请检查后重试', 'warning');
    return;
  }

  const payload = buildConfigurationPayload();
  if (!payload) return;

  configSaving.value = true;
  try {
    await clubApi.saveConfiguration(Number(profitCurrentRow.value.id), payload);
    show('分润配置与可接单规格保存成功', 'success');
    configDialogVisible.value = false;
  } catch {
    // 错误提示由 request.js 统一处理
  } finally {
    configSaving.value = false;
  }
}

// ============ 资产管理（充值 / 扣减 / 余额抵扣） ============
const assetModalVisible = ref(false);
const currentRow = ref(null);

const assetForm = reactive({
  assetType: '收益', // 收益 / 押金
  operation: '充值', // 充值 / 扣减 / 余额抵扣
  amount: '',
  reason: '',
  files: [], // 凭证文件 [{ url, name }]，最多 5 个
});

const assetUploading = ref(false);
const maxAssetFiles = 5;

const WALLET_TYPE_MAP = { 收益: 'INCOME', 押金: 'DEPOSIT' };
const WALLET_ACTION_MAP = { 充值: 'CREDIT', 扣减: 'DEDUCT', 余额抵扣: 'OFFSET' };

const assetTypeOptions = ['收益', '押金'];

const assetOperationOptions = computed(() => {
  if (assetForm.assetType === '押金') {
    return ['充值', '扣减'];
  }
  return ['充值', '扣减', '余额抵扣'];
});

const getAssetOperationLabel = computed(() => {
  if (assetForm.operation === '充值') return '充值金额（元）';
  if (assetForm.operation === '扣减') return '扣减金额（元）';
  return '抵扣金额（元）';
});

const getAssetPlaceholder = computed(() => {
  if (assetForm.operation === '充值') return '请输入充值金额';
  if (assetForm.operation === '扣减') return '请输入扣减金额';
  return '请输入抵扣金额';
});

const getAssetReasonLabel = computed(() => {
  if (assetForm.operation === '充值') return '充值原因';
  if (assetForm.operation === '扣减') return '扣减原因';
  return '抵扣原因';
});

// 列表接口返回收益/押金余额：incomeBalance / depositBalance（单位元）
const currentAssetBalance = computed(() => {
  const row = currentRow.value;
  if (!row) return '-';
  const key = assetForm.assetType === '收益' ? 'incomeBalance' : 'depositBalance';
  const value = row[key];
  if (value === undefined || value === null || value === '') return '-';
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : '-';
});

function normalizeAssetAmount(value) {
  if (value === '' || value === null || value === undefined) return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return Number(amount.toFixed(2));
}

function handleAssetTypeChange(type) {
  assetForm.assetType = type;
  if (type === '押金' && assetForm.operation === '余额抵扣') {
    assetForm.operation = '充值';
  }
  assetForm.amount = '';
}

function openAssetFilePicker() {
  document.getElementById('club-asset-upload-input')?.click();
}

async function handleAssetFiles(event) {
  const picked = Array.from(event.target.files || []);
  event.target.value = '';
  await uploadClubFiles(picked, assetForm.files, maxAssetFiles, assetUploading);
}

const {
  isDragging: assetFilesDragging,
  onDragOver: onAssetFilesDragOver,
  onDragEnter: onAssetFilesDragEnter,
  onDragLeave: onAssetFilesDragLeave,
  onDrop: onAssetFilesDrop,
  onPaste: onAssetFilesPaste,
} = useFileDropPaste((files) => uploadClubFiles(files, assetForm.files, maxAssetFiles, assetUploading));

function removeAssetFile(index) {
  assetForm.files.splice(index, 1);
}

function openAsset(row) {
  currentRow.value = row;
  Object.assign(assetForm, {
    assetType: '收益',
    operation: '充值',
    amount: '',
    reason: '',
    files: [],
  });
  assetModalVisible.value = true;
}

async function submitAsset() {
  if (!currentRow.value) return;

  if (assetForm.assetType === '押金' && assetForm.operation === '余额抵扣') {
    show('押金余额不支持余额抵扣', 'warning');
    return;
  }

  const amount = normalizeAssetAmount(assetForm.amount);
  if (amount === '' || amount === 0) {
    show('请输入有效金额', 'warning');
    return;
  }

  if (assetForm.reason.trim().length > 200) {
    show('原因不能超过200字', 'warning');
    return;
  }

  try {
    await clubApi.adjustWallet(currentRow.value.id, {
      walletType: WALLET_TYPE_MAP[assetForm.assetType],
      action: WALLET_ACTION_MAP[assetForm.operation],
      amount,
      reason: assetForm.reason.trim(),
      files: assetForm.files.map((f) => f.url),
    });
    assetModalVisible.value = false;
    show('资产已更新', 'success');
  } catch (e) {
    // 错误提示由 request.js 统一弹出
  }
}

// ============ 可接单规格 ============
const specLoading = ref(false);
const specLoadError = ref(false);
const specLoadErrorMsg = ref('');
const specCopyVisible = ref(false);
const specCopySaving = ref(false);
const specCopyClubLoading = ref(false);
const specCopyError = ref('');
const specCopySearchHint = ref('');
const specCopySourceId = ref('');
const specCopyTargetIds = ref([]);
const specCopyClubOptions = ref([]);
let specCopySearchSequence = 0;
// 游戏-规格目录：真实规格 ID 取游戏列表/规格接口 data.list[].specs[].id
const specCatalog = ref([]); // [{ gameId, gameName, specs: [{ id, name, specNo }] }]
const specGameRows = ref([]); // [{ gameId, gameName, specs, all, checked:Set<number> }]
const batchSpecVisible = ref(false);
const batchSpecLoading = ref(false);
const batchSubmitting = ref(false);
const batchSubmitProgress = ref('');
const batchSpecGames = ref([]);
const batchSpecKeyword = ref('');
const batchSpecFilter = ref('all');
const batchClubKeyword = ref('');
const batchClubLoading = ref(false);
const batchClubError = ref('');
const batchClubRows = ref([]);
const batchClubTotal = ref(0);
const batchClubPage = ref(1);
const batchClubPageSize = 20;
const batchSelectedClubs = ref([]);
const batchFixedProfitAmounts = reactive({});
const batchTemplateKeyword = ref('');
const batchTemplateRows = ref([]);
const batchTemplateSearched = ref(false);
const batchTemplateLoading = ref(false);
const batchTemplateApplying = ref(null);
const batchTemplateError = ref('');
let batchTemplateRevision = 0;

async function searchBatchTemplates() {
  if (batchTemplateApplying.value != null || batchSubmitting.value) return;
  const revision = ++batchTemplateRevision;
  batchTemplateLoading.value = true;
  batchTemplateError.value = '';
  batchTemplateSearched.value = true;
  try {
    const result = await clubApi.list({ name: batchTemplateKeyword.value.trim(), page: 1, pageSize: 20 });
    if (revision !== batchTemplateRevision) return;
    batchTemplateRows.value = result?.list || [];
  } catch (error) {
    if (revision !== batchTemplateRevision) return;
    batchTemplateRows.value = [];
    batchTemplateError.value = error?.message || '模板俱乐部搜索失败，请重试';
  } finally {
    if (revision === batchTemplateRevision) batchTemplateLoading.value = false;
  }
}

async function applyBatchTemplate(club) {
  if (batchTemplateApplying.value != null || batchTemplateLoading.value || batchSpecLoading.value || batchSubmitting.value) return;
  const revision = ++batchTemplateRevision;
  batchTemplateApplying.value = club.id;
  batchTemplateError.value = '';
  try {
    const [groups, profitConfigs] = await Promise.all([
      clubApi.getSpecs(club.id),
      clubApi.getProfitConfigs(club.id),
    ]);
    if (revision !== batchTemplateRevision || !batchSpecVisible.value) return;
    if (!Array.isArray(groups)) throw new Error('模板规格数据格式异常，请重试');
    const templateAmounts = new Map();
    toProfitArray(profitConfigs).forEach((config) => {
      const rawAmount = config.clubFixed;
      if (config.clubMode !== 'FIXED' || rawAmount == null || String(rawAmount).trim() === '') return;
      const amount = Number(rawAmount);
      if (Number.isFinite(amount) && amount >= 0) templateAmounts.set(Number(config.specId), amount);
    });
    const selected = new Map();
    let missing = 0;
    for (const group of groups) {
      const gameId = Number(group.gameId);
      const game = batchSpecGames.value.find((game) => Number(game.gameId) === gameId);
      const ids = new Set([
        ...(Array.isArray(group.specIds) ? group.specIds : []),
        ...(Array.isArray(group.specs) ? group.specs.map((spec) => spec.specId) : []),
      ].map(Number).filter(Number.isFinite));
      if (!game) { missing += Math.max(1, ids.size); continue; }
      const available = new Set(game.specs.map((spec) => Number(spec.id)));
      missing += [...ids].filter((id) => !available.has(id)).length;
      const chosen = selected.get(gameId) || new Set();
      (group.all === true ? [...available] : [...ids].filter((id) => available.has(id))).forEach((id) => chosen.add(id));
      selected.set(gameId, chosen);
    }
    clearBatchSpecSelection();
    let count = 0;
    let amountCount = 0;
    batchSpecGames.value.forEach((game) => {
      const ids = [...(selected.get(Number(game.gameId)) || [])];
      game.all = game.specs.length > 0 && ids.length === game.specs.length;
      game.checked = game.all ? [] : ids;
      game.expanded = ids.length > 0;
      count += ids.length;
      ids.forEach((id) => {
        if (!templateAmounts.has(id)) return;
        batchFixedProfitAmounts[id] = templateAmounts.get(id);
        amountCount += 1;
      });
    });
    const remaining = count - amountCount;
    show(count ? `已应用「${club.name}」的 ${count} 个规格，带入 ${amountCount} 项固定金额${remaining ? `，还有 ${remaining} 项需手动填写` : ''}` : '该俱乐部还没有可接单规格', count ? 'success' : 'warning');
    if (missing) show(`模板中有 ${missing} 项游戏或规格不在当前目录，未应用`, 'warning');
  } catch (error) {
    if (revision === batchTemplateRevision) batchTemplateError.value = error?.message || '模板应用失败，请重试';
  } finally {
    if (revision === batchTemplateRevision) batchTemplateApplying.value = null;
  }
}

const filteredBatchSpecGames = computed(() => {
  const keyword = batchSpecKeyword.value.trim().toLocaleLowerCase();
  return batchSpecGames.value
    .map((source) => ({
      source,
      visibleSpecs: source.specs.filter((spec) => {
        const matchesKeyword = !keyword ||
          source.gameName.toLocaleLowerCase().includes(keyword) ||
          spec.name.toLocaleLowerCase().includes(keyword) ||
          String(spec.specNo || '').toLocaleLowerCase().includes(keyword);
        if (!matchesKeyword) return false;
        const selected = isBatchSpecSelected(source, spec.id);
        if (batchSpecFilter.value === 'selected') return selected;
        if (batchSpecFilter.value === 'amount') return selected && hasBatchFixedProfitAmount(spec);
        return true;
      }),
    }))
    .filter((game) => game.visibleSpecs.length);
});

const batchCatalogSpecCount = computed(() =>
  batchSpecGames.value.reduce((count, game) => count + game.specs.length, 0)
);

const batchSelectedSpecCount = computed(() =>
  batchSpecGames.value.reduce((count, game) => count + (game.all ? game.specs.length : game.checked.length), 0)
);

const batchSelectedAmountCount = computed(() =>
  batchSelectedSpecs.value.filter((spec) => hasBatchFixedProfitAmount(spec)).length
);

function hasBatchFixedProfitAmount(spec) {
  const amount = batchFixedProfitAmounts[spec.id];
  return amount !== undefined && amount !== null && String(amount).trim() !== '';
}

const batchSelectedSpecLabels = computed(() =>
  batchSpecGames.value
    .filter((game) => game.all || game.checked.length)
    .map((game) => game.all
      ? `${game.gameName}（全部 ${game.specs.length} 项）`
      : `${game.gameName}（${game.checked.length} 项）`)
);

const batchSelectedSpecs = computed(() =>
  batchSpecGames.value.flatMap((game) =>
    game.specs
      .filter((spec) => game.all || game.checked.includes(Number(spec.id)))
      .map((spec) => ({ ...spec, gameId: Number(game.gameId), gameName: game.gameName }))
  )
);

const batchClubPageCount = computed(() =>
  Math.max(1, Math.ceil(batchClubTotal.value / batchClubPageSize))
);

const batchPageSelected = computed(() =>
  batchClubRows.value.length > 0 &&
  batchClubRows.value.every((club) => batchSelectedClubs.value.some((selected) => selected.id === Number(club.id)))
);

async function openBatchSpec() {
  batchTemplateRevision += 1;
  batchTemplateKeyword.value = '';
  batchTemplateRows.value = [];
  batchTemplateSearched.value = false;
  batchTemplateLoading.value = false;
  batchTemplateApplying.value = null;
  batchTemplateError.value = '';
  batchSpecVisible.value = true;
  batchSpecLoading.value = true;
  batchSpecKeyword.value = '';
  batchSpecFilter.value = 'all';
  batchClubKeyword.value = '';
  batchClubError.value = '';
  batchClubPage.value = 1;
  batchSelectedClubs.value = [];
  Object.keys(batchFixedProfitAmounts).forEach((specId) => delete batchFixedProfitAmounts[specId]);
  batchSpecGames.value = [];
  try {
    await loadSpecCatalog();
    batchSpecGames.value = specCatalog.value.map((game) => ({
      ...game,
      all: false,
      checked: [],
      expanded: false,
    }));
  } catch {
    batchSpecGames.value = [];
    show('游戏规格加载失败，请稍后重试', 'error');
  } finally {
    batchSpecLoading.value = false;
  }
  await loadBatchClubs();
}

async function loadBatchClubs() {
  batchClubLoading.value = true;
  batchClubError.value = '';
  try {
    const result = await clubApi.list({
      page: batchClubPage.value,
      pageSize: batchClubPageSize,
      name: batchClubKeyword.value.trim(),
    });
    batchClubRows.value = (result?.list || []).map((club) => ({
      id: Number(club.id),
      name: club.name || `俱乐部 ${club.id}`,
      phone: club.phone || '',
    }));
    batchClubTotal.value = Number(result?.total) || batchClubRows.value.length;
  } catch (error) {
    batchClubRows.value = [];
    batchClubTotal.value = 0;
    batchClubError.value = error?.message || '俱乐部列表加载失败，请重试';
  } finally {
    batchClubLoading.value = false;
  }
}

function searchBatchClubs() {
  batchClubPage.value = 1;
  loadBatchClubs();
}

function changeBatchClubPage(nextPage) {
  if (nextPage < 1 || nextPage > batchClubPageCount.value || nextPage === batchClubPage.value) return;
  batchClubPage.value = nextPage;
  loadBatchClubs();
}

function isBatchClubSelected(clubId) {
  return batchSelectedClubs.value.some((club) => club.id === Number(clubId));
}

function toggleBatchClub(club, checked) {
  const id = Number(club.id);
  if (checked) {
    if (!isBatchClubSelected(id)) batchSelectedClubs.value.push(club);
  } else {
    batchSelectedClubs.value = batchSelectedClubs.value.filter((selected) => selected.id !== id);
  }
}

function toggleBatchPageClubs(checked) {
  batchClubRows.value.forEach((club) => toggleBatchClub(club, checked));
}

function removeBatchClub(clubId) {
  batchSelectedClubs.value = batchSelectedClubs.value.filter((club) => club.id !== Number(clubId));
}

function toggleBatchGameAll(game, checked) {
  game.all = checked;
  if (checked) game.checked = [];
}

function toggleBatchGameExpanded(game) {
  game.expanded = !game.expanded;
}

function clearBatchSpecSelection() {
  batchSpecKeyword.value = '';
  batchSpecFilter.value = 'all';
  batchSpecGames.value.forEach((game) => {
    game.all = false;
    game.checked = [];
  });
  Object.keys(batchFixedProfitAmounts).forEach((specId) => delete batchFixedProfitAmounts[specId]);
}

function toggleBatchSpec(game, specId, checked) {
  const selectedIds = new Set(
    game.all ? game.specs.map((spec) => Number(spec.id)) : game.checked.map(Number)
  );
  if (checked) selectedIds.add(Number(specId));
  else selectedIds.delete(Number(specId));
  if (game.specs.length && selectedIds.size === game.specs.length) {
    game.all = true;
    game.checked = [];
  } else {
    game.all = false;
    game.checked = [...selectedIds];
  }
}

function isBatchSpecSelected(game, specId) {
  return game.all || game.checked.includes(Number(specId));
}

async function submitBatchSpec() {
  if (batchSubmitting.value || batchTemplateApplying.value != null) return;
  const selectedClubs = [...new Set(batchSelectedClubs.value.map((club) => Number(club.id)))];
  const selectedSpecs = batchSelectedSpecs.value;
  if (!selectedSpecs.length) {
    show('请先选择至少一个游戏规格', 'warning');
    return;
  }
  if (!selectedClubs.length) {
    show('请至少选择一个俱乐部', 'warning');
    return;
  }
  const missingAmount = selectedSpecs.find((spec) => !hasBatchFixedProfitAmount(spec));
  if (missingAmount) {
    show(`请填写「${missingAmount.gameName}·${missingAmount.name}」的固定金额`, 'warning');
    return;
  }
  const invalidSpec = selectedSpecs.find((spec) => {
    const rawAmount = String(batchFixedProfitAmounts[spec.id]).trim();
    const amount = Number(rawAmount);
    return !Number.isFinite(amount) || amount < 0 ||
      !/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(rawAmount);
  });
  if (invalidSpec) {
    show(`「${invalidSpec.gameName}·${invalidSpec.name}」金额需为非负数，最多两位小数`, 'warning');
    return;
  }
  const configuredSpecs = selectedSpecs.map((spec) => {
    const item = { gameId: spec.gameId, specId: Number(spec.id) };
    const rawAmount = batchFixedProfitAmounts[spec.id];
    if (hasBatchFixedProfitAmount(spec)) {
      item.fixedProfitAmount = Number(rawAmount);
    }
    return item;
  });
  const batches = [];
  for (let clubIndex = 0; clubIndex < selectedClubs.length; clubIndex += 100) {
    const clubIds = selectedClubs.slice(clubIndex, clubIndex + 100);
    const maxSpecsPerBatch = Math.min(200, Math.floor(5000 / clubIds.length));
    for (let specIndex = 0; specIndex < configuredSpecs.length; specIndex += maxSpecsPerBatch) {
      batches.push({
        clubIds,
        specs: configuredSpecs.slice(specIndex, specIndex + maxSpecsPerBatch),
      });
    }
  }
  const results = [];
  batchSubmitting.value = true;
  batchSubmitProgress.value = `准备提交 ${batches.length} 批`;
  try {
    for (let index = 0; index < batches.length; index += 1) {
      batchSubmitProgress.value = `正在提交第 ${index + 1}/${batches.length} 批`;
      try {
        const result = await clubApi.batchAddSpecs({
          clubIds: batches[index].clubIds,
          specs: batches[index].specs,
        });
        results.push(result);
      } catch {
        if (results.length) {
          show(
            `批量新增部分完成：已完成 ${results.length}/${batches.length} 批；第 ${index + 1} 批失败，后续未提交。请检查已成功数据后重试。`,
            'warning',
            8000
          );
        }
        return;
      }
    }
  } finally {
    batchSubmitting.value = false;
    batchSubmitProgress.value = '';
  }

  batchSpecVisible.value = false;
  const count = (key) => results.reduce((sum, result) => sum + (Number(result?.[key]) || 0), 0);
  const summary = [
    `新增授权 ${count('permissionAddedCount')}`,
    `已存在跳过 ${count('permissionExistingCount')}`,
    `新建分润 ${count('profitCreatedCount')}`,
    `更新分润 ${count('profitUpdatedCount')}`,
  ].join('，');
  show(`批量新增成功：${selectedClubs.length} 家俱乐部，${selectedSpecs.length} 个规格；${summary}`, 'success', 6000);
  fetchList().catch(() => show('批量新增已完成，但俱乐部列表刷新失败', 'warning'));
}

async function loadSpecCatalog() {
  if (specCatalog.value.length) return;
  // 游戏列表接口已改服务端分页（返回分页对象），规格目录需取全量 → 用 listAll()
  const games = await gameApi.listAll();
  const catalog = await Promise.all(
    (games || []).map(async (game) => {
      let specs = [];
      const inlineSpecs = Array.isArray(game.specs) ? game.specs : [];
      // 游戏列表内联规格不含 specNo，需从规格接口读取货架编号。
      if (inlineSpecs.length && inlineSpecs.every((spec) => spec?.specNo != null)) {
        specs = inlineSpecs;
      } else {
        try {
          specs = await gameApi.specs(game.id);
        } catch (e) {
          specs = inlineSpecs;
        }
      }
      return {
        gameId: game.id,
        gameName: game.name,
        specs: (specs || []).map((s) => ({
          id: Number(s.id ?? s),
          name: s.name ?? s,
          specNo: s?.specNo == null ? '' : String(s.specNo),
        })),
      };
    })
  );
  specCatalog.value = catalog;
}

function buildSpecRows(list) {
  const configMap = new Map((list || []).map((item) => [Number(item.gameId), item]));
  specGameRows.value = specCatalog.value.map((game) => {
    const cfg = configMap.get(game.gameId);
    const all = !!(cfg && cfg.all);
    const checked = new Set(all || !cfg ? [] : (Array.isArray(cfg.specIds) ? cfg.specIds.map(Number) : []));
    return { ...game, all, checked, expanded: false };
  });
}

function toggleSpecGameExpanded(game) {
  game.expanded = !game.expanded;
}

// 兼容后端 data 返回结构差异：数组 / { list: [] } / { specs: [] } / { items: [] } / 单个对象
function normalizeSpecList(list) {
  if (Array.isArray(list)) return list;
  if (list && typeof list === 'object') {
    if (Array.isArray(list.list)) return list.list;
    if (Array.isArray(list.specs)) return list.specs;
    if (Array.isArray(list.items)) return list.items;
    if ('gameId' in list) return [list];
  }
  return [];
}

async function loadSpecConfig(clubId) {
  specLoading.value = true;
  specLoadError.value = false;
  specLoadErrorMsg.value = '';
  try {
    await loadSpecCatalog();
    const list = await clubApi.getSpecs(Number(clubId));
    buildSpecRows(normalizeSpecList(list));
  } catch (e) {
    // 错误提示由 request.js 统一弹出，这里仅标记加载失败态并记录原因
    specLoadError.value = true;
    specLoadErrorMsg.value = e?.message || '未知错误';
  } finally {
    specLoading.value = false;
  }
}

async function loadSpecCopyClubs(keyword = '') {
  const sequence = ++specCopySearchSequence;
  specCopyClubLoading.value = true;
  try {
    const result = await clubApi.list({
      page: 1,
      pageSize: 100,
      name: String(keyword || '').trim(),
    });
    if (sequence !== specCopySearchSequence) return;

    const clubs = (result?.list || []).map((club) => ({
      id: Number(club.id),
      name: club.name || `俱乐部 ${club.id}`,
    }));
    const resultTotal = Number(result?.total) || clubs.length;
    specCopySearchHint.value = String(keyword || '').trim()
      ? clubs.length
        ? `找到 ${resultTotal} 家俱乐部，请在下方来源或目标下拉框中选择`
        : '没有找到匹配的俱乐部，请修改名称后重试'
      : `已加载 ${clubs.length} 家俱乐部${resultTotal > clubs.length ? `（共 ${resultTotal} 家，可输入名称搜索）` : ''}`;
    const selectedIds = new Set([
      Number(currentRow.value?.id),
      Number(specCopySourceId.value),
      ...specCopyTargetIds.value.map(Number),
    ].filter(Number.isFinite));
    const preserved = specCopyClubOptions.value.filter((club) => selectedIds.has(club.id));
    const optionsById = new Map([...preserved, ...clubs].map((club) => [club.id, club]));
    specCopyClubOptions.value = [...optionsById.values()];
  } catch {
    if (sequence === specCopySearchSequence) {
      specCopyError.value = '俱乐部列表加载失败，请检查后重试';
      specCopySearchHint.value = '';
    }
  } finally {
    if (sequence === specCopySearchSequence) specCopyClubLoading.value = false;
  }
}

function scheduleSpecCopySearch(keyword = '') {
  if (specCopySearchTimer) clearTimeout(specCopySearchTimer);
  specCopySearchTimer = setTimeout(() => {
    specCopySearchTimer = null;
    loadSpecCopyClubs(keyword);
  }, 300);
}

function openSpecCopy() {
  specCopyError.value = '';
  specCopySearchHint.value = '';
  specCopySourceId.value = '';
  specCopyTargetIds.value = currentRow.value?.id ? [Number(currentRow.value.id)] : [];
  specCopyClubOptions.value = currentRow.value
    ? [{ id: Number(currentRow.value.id), name: currentRow.value.name || '' }]
    : [];
  specCopyVisible.value = true;
  loadSpecCopyClubs();
}

async function submitSpecCopy() {
  if (specCopySaving.value) return;
  const sourceClubId = Number(specCopySourceId.value);
  const targetClubIds = [...new Set(specCopyTargetIds.value.map(Number))];
  if (!Number.isInteger(sourceClubId) || sourceClubId <= 0) {
    specCopyError.value = '请选择来源俱乐部';
    return;
  }
  if (!targetClubIds.length) {
    specCopyError.value = '请选择至少一个目标俱乐部';
    return;
  }
  if (targetClubIds.includes(sourceClubId)) {
    specCopyError.value = '来源俱乐部不能同时作为目标俱乐部';
    return;
  }

  specCopyError.value = '';
  specCopySaving.value = true;
  try {
    const result = await clubApi.copySpecs(sourceClubId, targetClubIds);
    specCopyVisible.value = false;
    const copiedValue = result?.copiedTargets;
    const changedValue = result?.changedTargets;
    const copiedCount = Array.isArray(copiedValue)
      ? copiedValue.length
      : copiedValue == null
        ? NaN
        : Number(copiedValue);
    const changedCount = Array.isArray(changedValue)
      ? changedValue.length
      : changedValue == null
        ? NaN
        : Number(changedValue);
    const summary = [];
    if (Number.isFinite(copiedCount)) summary.push(`目标 ${copiedCount} 家`);
    if (Number.isFinite(changedCount)) summary.push(`变更 ${changedCount} 项`);
    show(
      `可接单规格复制成功${summary.length ? `：${summary.join('，')}` : ''}`,
      'success',
      6000,
    );
    if (targetClubIds.includes(Number(currentRow.value?.id))) {
      await loadSpecConfig(Number(currentRow.value.id));
    }
  } catch {
    specCopyError.value = '复制失败，请检查提示信息后重试';
  } finally {
    specCopySaving.value = false;
  }
}

function toggleGameAll(row) {
  if (configSaving.value || !row.specs.length) return;
  row.all = !row.all;
  if (row.all) row.checked.clear();
}

function toggleSpec(row, specId) {
  if (configSaving.value) return;
  if (row.all) {
    row.checked = new Set(row.specs.map((spec) => Number(spec.id)));
    row.all = false;
  }
  specId = Number(specId);
  if (row.checked.has(specId)) row.checked.delete(specId);
  else row.checked.add(specId);
  // 单规格全选后自动视为“全部规格”
  row.all = row.specs.length > 0 && row.checked.size === row.specs.length;
  if (row.all) row.checked.clear();
}

onMounted(fetchList);
</script>

<template>
  <div class="list-page">
    <div class="list-page__search">
      <SearchComponent :fields="searchFields" :initial-values="filter" @search="handleSearch" :labelWidth="97" @reset="handleReset" />
    </div>

    <DataTable
      :columns="columns"
      :data="rows"
      :loading="loading"
      :total="total"
      :page="page"
      :page-size="pageSize"
      @page-change="pageChange"
      @page-size-change="onPageSizeChange"
    >
      <template #toolbar>
        <div class="table-toolbar">
          <button v-if="!isService" class="action-btn primary" type="button" @click="openAdd">新增</button>
          <button v-if="!isService" class="action-btn batch-add" type="button" @click="openBatchSpec">
            批量新增
          </button>
        </div>
      </template>

      <template #cell-license="{ row }">
        <div v-if="licenseImages(row).length" class="license-thumb-row">
          <el-image
            v-for="(url, i) in licenseImages(row)"
            :key="`${url}-${i}`"
            class="license-thumb"
            :src="url"
            fit="cover"
            :preview-src-list="licenseImages(row)"
            :initial-index="i"
            preview-teleported
            title="点击放大"
          />
        </div>
        <span v-else class="muted-text">暂无</span>
      </template>

      <template #cell-incomeBalance="{ row }">{{ formatMoney(row.incomeBalance) }}</template>

      <template #cell-depositBalance="{ row }">{{ formatMoney(row.depositBalance) }}</template>

      <template #cell-completedCount="{ row }">{{ orderCount(row.completedCount) }}</template>

      <template #cell-rejectedCount="{ row }">{{ orderCount(row.rejectedCount) }}</template>

      <template #cell-frozenCount="{ row }">{{ orderCount(row.frozenCount) }}</template>

      <template #cell-status="{ row }">
        <div class="status-group">
          <span :class="['status-badge', Number(row.canTake) === 1 ? 'status-success' : 'status-danger']">
            {{ Number(row.canTake) === 1 ? '可接单' : '禁止接单' }}
          </span>
          <span :class="['status-badge', Number(row.walletFrozen) === 1 ? 'status-danger' : 'status-success']">
            {{ Number(row.walletFrozen) === 1 ? '冻结' : '未冻结' }}
          </span>
          <span :class="['status-badge', Number(row.inStore) === 1 ? 'status-success' : 'status-muted']">
            {{ Number(row.inStore) === 1 ? '在店' : '退店' }}
          </span>
        </div>
      </template>

      <template #cell-op="{ row }">
        <div class="action-group">
          <button class="link-btn" type="button" @click="openEdit(row)">编辑</button>
          <button class="link-btn" type="button" @click="openConfig(row)">配置</button>
          <button class="link-btn" type="button" @click="openAsset(row)">资产管理</button>

          <button v-if="canShowAction(row, '禁止接单')" class="link-btn danger" type="button" @click="triggerAction('禁止接单', row)">
            禁止接单
          </button>
          <button v-if="canShowAction(row, '开启接单')" class="link-btn success" type="button" @click="triggerAction('开启接单', row)">
            开启接单
          </button>

          <button v-if="canShowAction(row, '钱包冻结')" class="link-btn warning" type="button" @click="triggerAction('钱包冻结', row)">
            钱包冻结
          </button>
          <button v-if="canShowAction(row, '钱包解冻')" class="link-btn info" type="button" @click="triggerAction('钱包解冻', row)">
            钱包解冻
          </button>

          <button v-if="canShowAction(row, '退店')" class="link-btn muted" type="button" @click="triggerAction('退店', row)">退店</button>
          <button v-if="canShowAction(row, '恢复在店')" class="link-btn link" type="button" @click="triggerAction('恢复在店', row)">
            恢复在店
          </button>

          <button v-if="row.status === 'NORMAL'" class="link-btn danger" type="button" @click="toggleStatus(row)">停用</button>
          <button v-else class="link-btn success" type="button" @click="toggleStatus(row)">启用</button>
        </div>
      </template>
    </DataTable>

    <!-- 分润与可接单规格统一配置 -->
    <AppModal
      v-model="configDialogVisible"
      :title="configDialogTitle"
      width="980px"
    >
      <div class="combined-config-card club-modal-content">
        <div class="profit-type-switch">
          <button
            type="button"
            :class="['profit-type-btn', { active: profitMode === 'percent' }]"
            @click="profitMode = 'percent'"
          >
            百分比分润
          </button>
          <button
            type="button"
            :class="['profit-type-btn', { active: profitMode === 'fixed' }]"
            @click="profitMode = 'fixed'"
          >
            固定分润
          </button>
        </div>

        <div class="combined-config-heading">
          <div>
            <p>
              {{ profitMode === 'percent'
                ? '统一比例应用于该俱乐部已授权规格；可接单规格保持不变。'
                : '填写固定金额的规格走固定分润；已接单但留空的规格按“百分比分润”页签中的比例计算。' }}
            </p>
          </div>
          <div class="combined-config-tools">
            <div v-if="profitMode === 'fixed'" class="spec-search-input">
              <input v-model="specKeyword" placeholder="搜索游戏、规格或货架编号" />
              <button
                v-if="specKeyword"
                class="spec-search-clear"
                type="button"
                aria-label="清除搜索条件"
                title="清除搜索条件"
                @click="clearSpecKeyword"
              >
                ×
              </button>
            </div>
            <!-- <button
              v-if="isAdmin"
              class="btn btn-plain"
              type="button"
              :disabled="profitCopySaving || configSaving || profitLoading"
              @click="openProfitCopy"
            >
              复制分润
            </button>
            <button
              v-if="isAdmin && profitMode === 'fixed'"
              class="btn btn-plain"
              type="button"
              :disabled="specCopySaving || configSaving || specLoading"
              @click="openSpecCopy"
            >
              复制规格
            </button> -->
          </div>
        </div>

        <template v-if="profitMode === 'percent'">
          <div class="profit-field">
            <label>俱乐部/打手总分润</label>
            <div class="profit-rate-input">
              <input v-model="percentRate" type="number" min="0" max="100" placeholder="请输入比例" />
              <span>%</span>
            </div>
          </div>
          <div class="profit-platform-row">
            <span>平台分润</span>
            <strong>{{ platformRateText }}</strong>
          </div>
          <div v-if="profitLoading || specLoading" class="spec-loading">配置加载中…</div>
          <div v-else-if="profitLoadError || specLoadError" class="spec-empty">
            配置加载失败，请检查接口或稍后重试
            <span v-if="specLoadErrorMsg" class="spec-error-detail">{{ specLoadErrorMsg }}</span>
          </div>
          <div v-else class="config-scope-note">
            当前比例将应用于 {{ authorizedSpecCount }} 条已授权规格；接单规格保持不变。
          </div>
        </template>

        <template v-else>
          <div v-if="profitLoading || specLoading" class="spec-loading">配置加载中…</div>
          <div v-else-if="profitLoadError || specLoadError" class="spec-empty">
            配置加载失败，请检查接口或稍后重试
            <span v-if="specLoadErrorMsg" class="spec-error-detail">{{ specLoadErrorMsg }}</span>
          </div>
          <div v-else-if="!specGameRows.length" class="spec-empty">暂无游戏规格数据，请先在游戏货架中配置</div>
          <div v-else class="combined-fixed-list-wrap">
            <div class="combined-spec-overview">
              <div class="combined-spec-stats">
                <span>全部规格 <strong>{{ allSpecCount }}</strong></span>
                <span>已填金额 <strong>{{ configuredFixedAmountCount }}</strong></span>
                <span>可接单 <strong>{{ authorizedSpecCount }}</strong></span>
              </div>
              <div class="combined-spec-filters" role="group" aria-label="规格筛选">
                <button
                  type="button"
                  :class="{ active: specViewFilter === 'all' }"
                  :aria-pressed="specViewFilter === 'all'"
                  @click="specViewFilter = 'all'"
                >
                  全部
                </button>
                <button
                  type="button"
                  :class="{ active: specViewFilter === 'configured' }"
                  :aria-pressed="specViewFilter === 'configured'"
                  @click="specViewFilter = 'configured'"
                >
                  已填金额
                </button>
                <button
                  type="button"
                  :class="{ active: specViewFilter === 'authorized' }"
                  :aria-pressed="specViewFilter === 'authorized'"
                  @click="specViewFilter = 'authorized'"
                >
                  可接单
                </button>
              </div>
            </div>
            <div v-if="!visibleSpecGameRows.length" class="spec-empty">
              {{ specViewFilter === 'configured'
                ? '暂无已填写固定分润的规格'
                : specViewFilter === 'authorized'
                  ? '暂无可接单规格'
                  : '没有找到匹配的游戏、规格或货架编号' }}
            </div>
            <template v-else>
              <div class="combined-spec-table-head">
                <span>规格（勾选后可接单）</span>
                <span>固定分润金额</span>
              </div>
              <div class="spec-game-list combined-spec-list">
                <div v-for="game in visibleSpecGameRows" :key="game.gameId" class="spec-game-item">
                  <div class="spec-game-head">
                    <button
                      type="button"
                      class="spec-game-collapse"
                      :aria-expanded="game.expanded"
                      @click="toggleSpecGameExpanded(game)"
                    >
                      <span class="spec-game-chevron" aria-hidden="true">
                        <svg viewBox="0 0 16 16"><path d="m3.5 6 4.5 4.5L12.5 6" /></svg>
                      </span>
                      <span class="spec-game-name">{{ game.gameName }}</span>
                    </button>
                    <label class="spec-all-toggle" :class="{ muted: !game.specs.length }">
                      <input
                        type="checkbox"
                        :checked="game.all"
                        :disabled="configSaving || !game.specs.length"
                        @change="toggleGameAll(game)"
                      />
                      <span>全部规格</span>
                    </label>
                  </div>
                  <div v-if="game.expanded && game.specs.length" class="combined-spec-rows">
                    <div v-for="spec in visibleSpecs(game)" :key="spec.id" class="combined-spec-row">
                      <label :class="['spec-tag', { active: isSpecSelected(game, spec.id) }]">
                        <input
                          type="checkbox"
                          :checked="isSpecSelected(game, spec.id)"
                          :disabled="configSaving"
                          @change="toggleSpec(game, spec.id)"
                        />
                        <span class="spec-row-shelf-number">{{ spec.specNo || '-' }}</span>
                        <span>{{ spec.name }}</span>
                      </label>
                      <label class="combined-spec-amount">
                        <input
                          v-model="fixedProfitAmounts[spec.id]"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="请输入金额"
                          :disabled="configSaving"
                        />
                        <span>元</span>
                      </label>
                    </div>
                  </div>
                  <div v-else-if="game.expanded" class="spec-game-none">该游戏暂未配置规格</div>
                </div>
                <p v-if="specLoadErrorMsg" class="spec-error-detail">{{ specLoadErrorMsg }}</p>
              </div>
            </template>
          </div>
        </template>
      </div>
      <template #footer>
        <button class="btn btn-plain" type="button" :disabled="configSaving" @click="configDialogVisible = false">取消</button>
        <button v-if="profitMode === 'fixed'" class="btn btn-plain" type="button" :disabled="configSaving || profitLoading || specLoading || profitLoadError || specLoadError" @click="clearConfigurationSelection">清空选择</button>
        <button
          class="btn btn-primary"
          data-shortcut-save
          title="Ctrl+Enter 保存"
          type="button"
          :disabled="profitLoading || specLoading || configSaving"
          @click="submitCombinedConfig"
        >
          {{ configSaving ? '保存中…' : '保存全部' }}
        </button>
      </template>
    </AppModal>

    <AppModal v-model="profitCopyVisible" title="复制分润配置" width="560px">
      <div class="profit-copy-dialog club-modal-content">
        <p class="profit-copy-tip">
          选择来源俱乐部和一个或多个目标俱乐部。目标中已有的额外规格不会删除；匹配规格仅更新俱乐部分润和账期，保留打手固定分润。
        </p>
        <div class="profit-copy-field">
          <label>来源俱乐部</label>
          <el-select
            v-model="profitCopySourceId"
            filterable
            remote
            :remote-method="scheduleProfitCopySearch"
            :loading="profitCopyClubLoading"
            placeholder="输入名称搜索并选择来源俱乐部"
            style="width: 100%"
            @change="profitCopyError = ''"
          >
            <el-option
              v-for="club in profitCopyClubOptions"
              :key="club.id"
              :label="`${club.name}（${club.id}）`"
              :value="club.id"
              :disabled="profitCopyTargetIds.includes(club.id)"
            />
          </el-select>
        </div>
        <div class="profit-copy-field">
          <label>目标俱乐部</label>
          <el-select
            v-model="profitCopyTargetIds"
            multiple
            filterable
            remote
            collapse-tags
            collapse-tags-tooltip
            :remote-method="scheduleProfitCopySearch"
            :loading="profitCopyClubLoading"
            placeholder="输入名称搜索一个或多个目标俱乐部"
            style="width: 100%"
            @change="profitCopyError = ''"
          >
            <el-option
              v-for="club in profitCopyClubOptions"
              :key="club.id"
              :label="`${club.name}（${club.id}）`"
              :value="club.id"
              :disabled="Number(profitCopySourceId) === club.id"
            />
          </el-select>
        </div>
        <p v-if="profitCopySearchHint" class="profit-copy-search-hint">{{ profitCopySearchHint }}</p>
        <p v-if="profitCopyError" class="profit-copy-error">{{ profitCopyError }}</p>
      </div>
      <template #footer>
        <button class="btn btn-plain" type="button" :disabled="profitCopySaving" @click="profitCopyVisible = false">取消</button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="profitCopySaving || profitCopyClubLoading"
          @click="submitProfitCopy"
        >
          {{ profitCopySaving ? '复制中…' : profitCopyClubLoading ? '加载俱乐部中…' : '确认复制' }}
        </button>
      </template>
    </AppModal>

    <!-- 营业执照预览 -->
    <AppModal v-model="licenseModalVisible" title="营业执照" width="760px">
      <div class="club-modal-content">
        <div v-if="currentLicenseUrl" class="license-preview">
          <el-image
            :src="currentLicenseUrl"
            alt="营业执照预览"
            fit="contain"
            :preview-src-list="[currentLicenseUrl]"
            preview-teleported
          />
        </div>
        <div v-else class="empty-preview">暂无营业执照</div>
      </div>
    </AppModal>

    <!-- 新增 / 编辑俱乐部 -->
    <AppModal v-model="editModalVisible" :title="editingId ? '编辑俱乐部' : '新增俱乐部'" width="480px">
      <div class="club-modal-body">
        <div class="form-row">
          <label class="required">俱乐部名称</label>
          <input v-model="editForm.name" placeholder="请输入俱乐部名称" />
        </div>
        <div class="form-row">
          <label class="required">手机号</label>
          <input v-model="editForm.phone" placeholder="请输入手机号" />
        </div>
        <div class="form-row">
          <label>密码</label>
          <input v-model="editForm.password" type="password" :placeholder="editingId ? '留空表示不修改密码' : '留空则初始密码为手机号'" autocomplete="new-password" />
        </div>

        <div class="form-row">
          <label>营业执照（上传图片）</label>
          <input id="club-license-input" type="file" accept="image/*" hidden :disabled="licenseUploading" @change="handleLicense" />
          <div v-if="editForm.licenseUrl" class="license-pick-preview">
            <el-image
              class="license-pick-preview-image"
              :src="editForm.licenseUrl"
              alt="营业执照"
              fit="cover"
              :preview-src-list="[editForm.licenseUrl]"
              preview-teleported
            />
            <button type="button" class="license-close" @click="removeLicense" title="移除">×</button>
          </div>
          <button v-else type="button" class="license-square-btn" :disabled="licenseUploading" @click="openLicensePicker">
            {{ licenseUploading ? '上传中…' : '＋' }}
          </button>
        </div>

        <div class="form-row spec-section">
          <label class="required">可接单规格</label>
          <div class="spec-rows-inline">
            <div v-for="(row, idx) in specRowList" :key="idx" class="spec-row">
              <el-select v-model="row.gameId" class="spec-game-select" placeholder="选择游戏" @change="onSpecGameChange(row)">
                <el-option v-for="g in specCatalog" :key="g.gameId" :label="g.gameName" :value="g.gameId" />
              </el-select>
              <el-select
                class="spec-value-select"
                :model-value="specSelectValue(row)"
                placeholder="选择规格"
                @change="onSpecSelect(row, $event)"
              >
                <el-option label="全部" value="all" />
                <el-option v-for="s in specOptionsOf(row.gameId)" :key="s.id" :label="s.name" :value="String(s.id)" />
              </el-select>
              <button v-if="specRowList.length > 1" type="button" class="icon-btn spec-row-remove" @click="removeSpecRow(idx)" title="移除该行">−</button>
              <button v-if="idx === specRowList.length - 1" type="button" class="icon-btn spec-add" @click="addSpecRow" title="新增一行">+</button>
            </div>
          </div>
        </div>

        <div class="form-row">
          <label>文件(上限5组文件)</label>
          <input id="club-edit-file-input" type="file" multiple hidden :disabled="editFileUploading" @change="handleEditFiles" />
          <div
            class="file-drop"
            :class="{ 'is-dragging': editFilesDragging }"
            tabindex="0"
            aria-label="文件上传区域，支持拖拽或粘贴文件"
            @dragover.prevent="onEditFilesDragOver"
            @dragenter.prevent="onEditFilesDragEnter"
            @dragleave="onEditFilesDragLeave"
            @drop.prevent="onEditFilesDrop"
            @paste="onEditFilesPaste"
          >
            <div class="file-drop-head">
              <button type="button" class="upload-btn-outline" :disabled="editFileUploading" @click="openEditFilePicker">
                {{ editFileUploading ? '上传中…' : '上传文件' }}
              </button>
              <span class="file-drop-tip">上限5组文件 · 支持拖入文件或 Ctrl+V 粘贴文件</span>
            </div>
            <div v-if="editForm.files.length" class="file-chips">
              <div v-for="(item, index) in editForm.files" :key="`${item.name}-${index}`" class="file-chip">
                <el-image
                  v-if="fileIsImage(item)"
                  class="chip-thumb"
                  :src="item.url"
                  fit="cover"
                  :preview-src-list="[item.url]"
                  preview-teleported
                  title="点击放大"
                />
                <template v-else-if="isVideoFile(item) || isAudioFile(item)">
                  <span class="chip-file-icon clickable" @click="openMediaPreview(item)">{{ mediaIcon(item) }}</span>
                  <span class="chip-name clickable" :title="item.name" @click="openMediaPreview(item)">{{ item.name }}</span>
                  <!-- 视频/音频：点击弹窗预览，不提供下载按钮 -->
                </template>
                <template v-else>
                  <span class="chip-file-icon clickable" @click="triggerDownload(item)">文件</span>
                  <span class="chip-name clickable" :title="item.name" @click="triggerDownload(item)">{{ item.name }}</span>
                  <a class="chip-download" :href="item.url" :download="item.name" title="下载">⬇</a>
                </template>
                <button type="button" class="chip-remove" @click="removeEditFile(index)">×</button>
              </div>
            </div>
          </div>
        </div>

        <div class="form-row">
          <label>备注</label>
          <textarea v-model="editForm.remark" rows="3" maxlength="200" placeholder="请输入备注"></textarea>
          <div class="reason-count">{{ editForm.remark.length }}/200</div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" type="button" @click="editModalVisible = false">取消</button>
        <button class="btn btn-primary" type="button" data-shortcut-save title="Ctrl+Enter 保存" @click="submitEdit">{{ editingId ? '保存' : '确定' }}</button>
      </template>
    </AppModal>

    <!-- 资产管理 -->
    <AppModal v-model="assetModalVisible" title="资产管理" width="560px">
      <div class="asset-dialog-card club-modal-content">
        <div class="asset-type-switch">
          <button
            v-for="item in assetTypeOptions"
            :key="item"
            type="button"
            :class="['type-btn', { active: assetForm.assetType === item }]"
            @click="handleAssetTypeChange(item)"
          >
            {{ item }}
          </button>
        </div>

        <div class="asset-balance-row">
          <span>{{ assetForm.assetType }}余额（元）</span>
          <strong>{{ currentAssetBalance }}</strong>
        </div>

        <div class="asset-field-group radio-group">
          <label class="field-label">操作</label>
          <div class="radio-list">
            <label v-for="item in assetOperationOptions" :key="item" class="radio-item">
              <input v-model="assetForm.operation" type="radio" :value="item" />
              <span>{{ item }}</span>
            </label>
          </div>
        </div>

        <div class="asset-field-group">
          <label class="field-label required">{{ getAssetOperationLabel }}</label>
          <input
            v-model.number="assetForm.amount"
            type="number"
            step="0.01"
            min="-999999999"
            :placeholder="getAssetPlaceholder"
          />
        </div>

        <div class="asset-field-group">
          <label class="field-label">文件(上限5组文件)</label>
          <div
            class="upload-box"
            :class="{ 'is-dragging': assetFilesDragging }"
            tabindex="0"
            aria-label="文件上传区域，支持拖拽或粘贴文件"
            @dragover.prevent="onAssetFilesDragOver"
            @dragenter.prevent="onAssetFilesDragEnter"
            @dragleave="onAssetFilesDragLeave"
            @drop.prevent="onAssetFilesDrop"
            @paste="onAssetFilesPaste"
          >
            <input
              id="club-asset-upload-input"
              type="file"
              multiple
              hidden
              :disabled="assetUploading"
              @change="handleAssetFiles"
            />
            <div class="upload-toolbar">
              <button type="button" class="upload-trigger" :disabled="assetUploading" @click="openAssetFilePicker">
                {{ assetUploading ? '上传中…' : '上传文件' }}
              </button>
              <span class="upload-tip">上限5组文件 · 支持拖入文件或 Ctrl+V 粘贴文件</span>
            </div>
            <div v-if="assetForm.files.length" class="file-chips">
              <div v-for="(item, index) in assetForm.files" :key="`${item.name}-${index}`" class="file-chip">
                <el-image
                  v-if="fileIsImage(item)"
                  class="chip-thumb"
                  :src="item.url"
                  fit="cover"
                  :preview-src-list="[item.url]"
                  preview-teleported
                  title="点击放大"
                />
                <template v-else-if="isVideoFile(item) || isAudioFile(item)">
                  <span class="chip-file-icon clickable" @click="openMediaPreview(item)">{{ mediaIcon(item) }}</span>
                  <span class="chip-name clickable" :title="item.name" @click="openMediaPreview(item)">{{ item.name }}</span>
                  <!-- 视频/音频：点击弹窗预览，不提供下载按钮 -->
                </template>
                <template v-else>
                  <span class="chip-file-icon clickable" @click="triggerDownload(item)">文件</span>
                  <span class="chip-name clickable" :title="item.name" @click="triggerDownload(item)">{{ item.name }}</span>
                  <a class="chip-download" :href="item.url" :download="item.name" title="下载">⬇</a>
                </template>
                <button type="button" class="chip-remove" @click="removeAssetFile(index)">×</button>
              </div>
            </div>
          </div>
        </div>

        <div class="asset-field-group">
          <label class="field-label required">{{ getAssetReasonLabel }}</label>
          <textarea
            v-model="assetForm.reason"
            rows="3"
            maxlength="200"
            placeholder="请输入本次操作原因"
          ></textarea>
          <div class="reason-count">{{ assetForm.reason.length }}/200</div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" type="button" @click="assetModalVisible = false">取消</button>
        <button class="btn btn-primary" type="button" @click="submitAsset">确定</button>
      </template>
    </AppModal>

    <!-- 视频/音频预览弹窗（仅预览，不提供下载） -->
    <AppModal v-model="mediaPreview.visible" :title="mediaPreview.name" width="640px">
      <div class="media-preview-body">
        <video v-if="mediaPreview.kind === 'video'" :src="mediaPreview.url" controls autoplay class="media-player"></video>
        <audio v-else :src="mediaPreview.url" controls autoplay class="media-player-audio"></audio>
        <!-- <p class="media-preview-tip">仅预览，不提供下载</p> -->
      </div>
    </AppModal>

    <AppModal v-model="specCopyVisible" title="复制可接单规格" width="560px">
      <div class="profit-copy-dialog spec-copy-dialog club-modal-content">
        <p class="profit-copy-tip">
          可接单规格将按游戏合并到目标俱乐部，保留目标已有规格并补充来源中多出的规格；同一游戏任一方为“全部规格”时，合并结果为全部规格。
        </p>
        <div class="profit-copy-field">
          <label>来源俱乐部</label>
          <el-select
            v-model="specCopySourceId"
            filterable
            remote
            :remote-method="scheduleSpecCopySearch"
            :loading="specCopyClubLoading"
            placeholder="输入名称搜索并选择来源俱乐部"
            style="width: 100%"
            @change="specCopyError = ''"
          >
            <el-option
              v-for="club in specCopyClubOptions"
              :key="club.id"
              :label="`${club.name}（${club.id}）`"
              :value="club.id"
              :disabled="specCopyTargetIds.includes(club.id)"
            />
          </el-select>
        </div>
        <div class="profit-copy-field">
          <label>目标俱乐部</label>
          <el-select
            v-model="specCopyTargetIds"
            multiple
            filterable
            remote
            collapse-tags
            collapse-tags-tooltip
            :remote-method="scheduleSpecCopySearch"
            :loading="specCopyClubLoading"
            placeholder="输入名称搜索一个或多个目标俱乐部"
            style="width: 100%"
            @change="specCopyError = ''"
          >
            <el-option
              v-for="club in specCopyClubOptions"
              :key="club.id"
              :label="`${club.name}（${club.id}）`"
              :value="club.id"
              :disabled="Number(specCopySourceId) === club.id"
            />
          </el-select>
        </div>
        <p v-if="specCopySearchHint" class="profit-copy-search-hint">{{ specCopySearchHint }}</p>
        <p v-if="specCopyError" class="profit-copy-error">{{ specCopyError }}</p>
      </div>
      <template #footer>
        <button
          class="btn btn-plain"
          type="button"
          :disabled="specCopySaving"
          @click="specCopyVisible = false"
        >
          取消
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="specCopySaving || specCopyClubLoading"
          @click="submitSpecCopy"
        >
          {{ specCopySaving ? '复制中…' : specCopyClubLoading ? '加载俱乐部中…' : '确认复制' }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="batchSpecVisible"
      title="批量新增可接单规格"
      width="900px"
      height="min(96vh, 1080px)"
    >
      <div class="batch-spec-modal">
        <section class="batch-section batch-spec-section">
          <div class="batch-section-head">
            <div>
              <span class="batch-step">01</span>
              <div class="batch-section-copy">
                <h3>选择游戏规格</h3>
                <p>跨游戏多选，已选规格需填写固定金额</p>
              </div>
            </div>
            <div class="batch-section-tools">
              <div class="batch-filter-row batch-filter-row--inline">
                <input v-model="batchSpecKeyword" placeholder="搜索游戏名、规格名或货架编号" />
                <button
                  type="button"
                  class="batch-text-btn"
                  @click="clearBatchSpecSelection"
                >
                  清空选择
                </button>
              </div>
            </div>
          </div>
          <div class="batch-template">
            <form class="batch-template-search" @submit.prevent="searchBatchTemplates">
              <label for="batch-template-club">套用俱乐部规格</label>
              <input id="batch-template-club" v-model="batchTemplateKeyword" placeholder="输入俱乐部名称搜索模板" :disabled="batchSubmitting || batchTemplateApplying != null" />
              <button type="submit" class="btn btn-plain" :disabled="batchTemplateLoading || batchTemplateApplying != null || batchSubmitting">{{ batchTemplateLoading ? '搜索中…' : '搜索' }}</button>
            </form>
            <p class="batch-template-tip">应用将替换规格勾选并带入源俱乐部的固定金额；百分比或未配置金额需手填，点击底部确认后保存。</p>
            <p v-if="batchTemplateError" role="alert" class="profit-copy-error">{{ batchTemplateError }}</p>
            <div v-if="batchTemplateRows.length" class="batch-template-results" :aria-busy="batchTemplateLoading || batchTemplateApplying != null">
              <div v-for="club in batchTemplateRows" :key="club.id" class="batch-template-row">
                <span>{{ club.name }} <span class="batch-template-tip">ID {{ club.id }}</span></span>
                <button type="button" class="batch-text-btn" :disabled="batchTemplateLoading || batchTemplateApplying != null || batchSpecLoading || batchSubmitting" @click="applyBatchTemplate(club)">{{ batchTemplateApplying === club.id ? '应用中…' : '应用' }}</button>
              </div>
            </div>
            <p v-else-if="batchTemplateSearched && !batchTemplateLoading && !batchTemplateError" class="batch-template-tip">未找到匹配的俱乐部</p>
          </div>
          <div class="combined-spec-overview">
            <div class="combined-spec-stats">
              <span>全部规格 <strong>{{ batchCatalogSpecCount }}</strong></span>
              <span>已选规格 <strong>{{ batchSelectedSpecCount }}</strong></span>
              <span>已填金额 <strong>{{ batchSelectedAmountCount }}</strong></span>
            </div>
            <div class="combined-spec-filters" role="group" aria-label="批量新增规格筛选">
              <button
                type="button"
                :class="{ active: batchSpecFilter === 'all' }"
                :aria-pressed="batchSpecFilter === 'all'"
                @click="batchSpecFilter = 'all'"
              >
                全部 {{ batchCatalogSpecCount }}
              </button>
              <button
                type="button"
                :class="{ active: batchSpecFilter === 'selected' }"
                :aria-pressed="batchSpecFilter === 'selected'"
                @click="batchSpecFilter = 'selected'"
              >
                已选 {{ batchSelectedSpecCount }}
              </button>
              <button
                type="button"
                :class="{ active: batchSpecFilter === 'amount' }"
                :aria-pressed="batchSpecFilter === 'amount'"
                @click="batchSpecFilter = 'amount'"
              >
                已填金额 {{ batchSelectedAmountCount }}
              </button>
            </div>
          </div>
          <div v-if="batchSpecLoading" class="batch-state">正在加载游戏规格…</div>
          <div v-else-if="!filteredBatchSpecGames.length" class="batch-state">
            {{ !batchSpecGames.length
              ? '游戏规格加载失败或暂无规格'
              : batchSpecKeyword.trim()
                ? '没有匹配的游戏规格'
                : batchSpecFilter === 'selected'
                  ? '暂无已选规格'
                  : batchSpecFilter === 'amount'
                    ? '暂无已填金额的已选规格'
                    : '没有可显示的游戏规格' }}
          </div>
          <div v-else class="batch-game-grid">
            <article v-for="game in filteredBatchSpecGames" :key="game.source.gameId" class="batch-game-card">
              <div class="batch-game-card-head" :class="{ expanded: game.source.expanded }">
                <button
                  type="button"
                  class="batch-game-collapse"
                  :aria-expanded="game.source.expanded"
                  @click="toggleBatchGameExpanded(game.source)"
                >
                  <span class="batch-game-chevron" aria-hidden="true">
                    <svg viewBox="0 0 16 16"><path d="m3.5 6 4.5 4.5L12.5 6" /></svg>
                  </span>
                  <strong>{{ game.source.gameName }}</strong>
                </button>
                <label class="batch-all-toggle">
                  <input
                    type="checkbox"
                    :checked="game.source.all"
                    @change="toggleBatchGameAll(game.source, $event.target.checked)"
                  />
                  <span>全部规格</span>
                </label>
              </div>
              <div v-if="game.source.expanded" class="batch-spec-options">
                <div
                  v-for="spec in game.visibleSpecs"
                  :key="spec.id"
                  :class="['batch-spec-option', { selected: isBatchSpecSelected(game.source, spec.id) }]"
                >
                  <label class="batch-spec-option-toggle" :title="`${game.source.gameName} · ${spec.name}`">
                    <input
                      type="checkbox"
                      :checked="isBatchSpecSelected(game.source, spec.id)"
                      @change="toggleBatchSpec(game.source, spec.id, $event.target.checked)"
                    />
                    <span class="batch-spec-shelf-number">{{ spec.specNo || '-' }}</span>
                    <span>{{ spec.name }}</span>
                  </label>
                  <label class="batch-spec-amount">
                    <input
                      v-model="batchFixedProfitAmounts[spec.id]"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="请输入金额"
                    />
                    <span>元</span>
                  </label>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="batch-section batch-club-section">
          <div class="batch-section-head">
            <div>
              <span class="batch-step">02</span>
              <div class="batch-section-copy">
                <h3>选择目标俱乐部</h3>
                <p>支持搜索、跨页多选</p>
              </div>
            </div>
            <div class="batch-section-tools">
              <div class="batch-club-total">已选 <strong>{{ batchSelectedClubs.length }}</strong> 家俱乐部</div>
              <div class="batch-filter-row batch-filter-row--inline">
                <input
                  v-model="batchClubKeyword"
                  placeholder="输入俱乐部名称搜索"
                  @keyup.enter="searchBatchClubs"
                />
                <button type="button" class="batch-search-btn" :disabled="batchClubLoading" @click="searchBatchClubs">
                  {{ batchClubLoading ? '搜索中…' : '搜索' }}
                </button>
              </div>
            </div>
          </div>
          <div class="batch-club-list">
            <div class="batch-club-list-head">
              <label>
                <input
                  type="checkbox"
                  :checked="batchPageSelected"
                  :disabled="!batchClubRows.length || batchClubLoading"
                  @change="toggleBatchPageClubs($event.target.checked)"
                />
                <span>选择本页</span>
              </label>
              <span>共 {{ batchClubTotal }} 家</span>
            </div>
            <div v-if="batchClubLoading" class="batch-state">正在加载俱乐部…</div>
            <div v-else-if="batchClubError" class="batch-state error">{{ batchClubError }}</div>
            <div v-else-if="!batchClubRows.length" class="batch-state">没有找到俱乐部</div>
            <label
              v-for="club in batchClubRows"
              v-else
              :key="club.id"
              class="batch-club-row"
            >
              <input
                type="checkbox"
                :checked="isBatchClubSelected(club.id)"
                @change="toggleBatchClub(club, $event.target.checked)"
              />
              <span class="batch-club-name">{{ club.name }}</span>
              <span class="batch-club-meta">ID {{ club.id }}<template v-if="club.phone"> · {{ club.phone }}</template></span>
            </label>
            <div class="batch-club-pagination">
              <button
                type="button"
                :disabled="batchClubPage <= 1 || batchClubLoading"
                @click="changeBatchClubPage(batchClubPage - 1)"
              >
                上一页
              </button>
              <span>{{ batchClubPage }} / {{ batchClubPageCount }}</span>
              <button
                type="button"
                :disabled="batchClubPage >= batchClubPageCount || batchClubLoading"
                @click="changeBatchClubPage(batchClubPage + 1)"
              >
                下一页
              </button>
            </div>
          </div>
          <div v-if="batchSelectedClubs.length" class="batch-selected-clubs">
            <span class="batch-selected-label">已选俱乐部</span>
            <span v-for="club in batchSelectedClubs" :key="club.id" class="batch-selected-chip">
              {{ club.name }}
              <button type="button" :aria-label="`移除${club.name}`" @click="removeBatchClub(club.id)">×</button>
            </span>
          </div>
        </section>

      </div>
      <template #footer>
        <div class="batch-footer-summary">
          {{ batchSelectedSpecCount }} 个规格 · {{ batchSelectedClubs.length }} 家俱乐部
        </div>
        <button class="btn btn-plain" type="button" @click="batchSpecVisible = false">取消</button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="batchSubmitting || batchSpecLoading || batchTemplateApplying != null || !batchSelectedSpecCount || !batchSelectedClubs.length"
          @click="submitBatchSpec"
        >
          {{ batchSubmitProgress || (batchSubmitting ? '提交中…' : '确认批量新增') }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.batch-template {
  flex-shrink: 0;
  margin-bottom: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.batch-template-search,
.batch-template-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.batch-template-search input {
  flex: 1;
  min-width: 160px;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-main);
}

.batch-template-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-faint);
}

.batch-template-results {
  margin-top: 8px;
}

.batch-template-row {
  justify-content: space-between;
  padding: 6px 0;
  border-top: 1px solid var(--border);
}

.list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-page__search {
  background: var(--bg-card);
  border: 1px solid #edf0f5;
  border-radius: 12px;
  padding: 18px 18px 0;
  margin-bottom: 20px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 0 0 12px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  height: 34px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: var(--text-invert);
  box-shadow: 0 12px 24px var(--primary-glow);
}

.action-btn.batch-add {
  border: 1px solid var(--primary-border-strong);
  background: var(--primary-faint);
  color: var(--primary);
}

.action-btn.batch-add:hover {
  background: var(--primary-soft);
}

.action-btn:hover {
  transform: translateY(-1px);
}

.action-group {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px 8px;
  min-width: max-content;
}

.link-btn {
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 8px;
  white-space: nowrap;
  flex: 0 0 auto;
  transition: background 0.15s ease, color 0.15s ease;
}

.link-btn:hover {
  background: rgba(37, 99, 235, 0.08);
}

.link-btn.danger {
  color: #d92d20;
}

.link-btn.danger:hover {
  background: rgba(217, 45, 32, 0.08);
}

.link-btn.success {
  color: #0f9f6e;
}

.link-btn.success:hover {
  background: rgba(15, 159, 110, 0.08);
}

.link-btn.warning {
  color: #d97706;
}

.link-btn.warning:hover {
  background: rgba(217, 119, 6, 0.08);
}

.link-btn.info {
  color: #1d4ed8;
}

.link-btn.info:hover {
  background: rgba(29, 78, 216, 0.08);
}

.link-btn.muted {
  color: #475467;
}

.link-btn.muted:hover {
  background: rgba(71, 84, 103, 0.08);
}

.list-page__body td:last-child {
  min-width: 560px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.license-link {
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.license-link:hover {
  background: rgba(37, 99, 235, 0.08);
}

.muted-text {
  color: #98a2b3;
}

.batch-spec-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
  color: var(--text-main);
}

.batch-section {
  display: flex;
  flex-direction: column;
  flex: none;
  padding: 14px;
  border: 1px solid var(--border-soft, #e4e7ec);
  border-radius: 12px;
  background: var(--bg-card);
}

.batch-spec-section {
  overflow: visible;
}

.batch-spec-section > .batch-section-head,
.batch-spec-section > .combined-spec-overview {
  flex-shrink: 0;
}

.batch-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.batch-section-head > div:first-child {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.batch-section-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.batch-step {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--primary-faint);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.batch-section-head h3 {
  margin: 0;
  font-size: 14px;
}

.batch-section-copy {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.batch-section-head p {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-faint);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-spec-total,
.batch-club-total {
  flex: none;
  color: var(--text-sub);
  font-size: 12px;
}

.batch-spec-total strong,
.batch-club-total strong {
  color: var(--primary);
  font-size: 16px;
}

.batch-filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.batch-filter-row--inline {
  flex: 1;
  max-width: 440px;
  min-width: 0;
  margin-bottom: 0;
}

.batch-filter-row input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: none;
  background: var(--bg-input, var(--bg-card));
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  background: #f8fafc;
}

.batch-filter-row input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-border);
}

.batch-search-btn,
.batch-text-btn {
  flex: none;
  border: 0;
  border-radius: 8px;
  padding: 0 14px;
  color: var(--primary);
  background: var(--primary-faint);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.batch-search-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.batch-text-btn {
  padding: 0 8px;
  background: transparent;
}

.batch-game-grid {
  display: grid;
  flex: none;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 10px;
  padding: 2px 4px 2px 0;
}

.batch-game-card {
  min-width: 0;
  padding: 11px;
  border: 1px solid var(--border-soft, #e4e7ec);
  border-radius: 10px;
  background: var(--bg-elevated, #f8fafc);
}

.batch-game-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.batch-game-collapse {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
}

.batch-spec-shelf-number {
  flex: none;
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
}

.batch-game-collapse > strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-game-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 7px;
  background: var(--primary-faint);
  color: var(--primary);
  transition: transform 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.batch-game-chevron svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.batch-game-collapse:hover .batch-game-chevron {
  background: var(--primary);
  color: var(--text-invert, #fff);
}

.batch-game-collapse[aria-expanded="true"] .batch-game-chevron {
  transform: rotate(180deg);
}

.batch-game-card-head.expanded {
  margin-bottom: 9px;
}

.batch-all-toggle,
.batch-club-list-head label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  color: var(--text-sub);
  font-size: 11px;
  cursor: pointer;
}

.batch-all-toggle input,
.batch-spec-option input,
.batch-club-list-head input,
.batch-club-row input {
  accent-color: var(--primary);
}

.batch-spec-options {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}

.batch-spec-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(110px, 42%) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 34px;
}

.batch-spec-option-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-sub);
  cursor: pointer;
}

.batch-spec-option-toggle input {
  flex: none;
  margin: 0;
  accent-color: var(--primary);
}

.batch-spec-option-toggle span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.batch-spec-option.selected {
  color: var(--primary);
}

.batch-spec-option.selected .batch-spec-option-toggle {
  border-color: var(--primary-border-strong);
  background: var(--primary-faint);
  color: var(--primary);
}

.batch-spec-amount {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: var(--text-faint);
  font-size: 11px;
}

.batch-spec-amount input {
  width: 100%;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: none;
  background: var(--bg-input, var(--bg-card));
  color: var(--text-main);
  font: inherit;
}

.batch-spec-amount input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-border);
}

.batch-state {
  display: grid;
  flex: none;
  place-items: center;
  min-height: 60px;
  color: var(--text-faint);
  font-size: 12px;
}

.batch-state.error {
  color: var(--danger, #d92d20);
}

.batch-club-list {
  display: flex;
  flex: none;
  flex-direction: column;
  border: 1px solid var(--border-soft, #e4e7ec);
  border-radius: 9px;
}

.batch-club-list-head,
.batch-club-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(150px, 0.8fr);
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 5px 10px;
  border-bottom: 1px solid var(--border-faint, #eef1f5);
  font-size: 12px;
}

.batch-club-list-head {
  grid-template-columns: 1fr auto;
  background: var(--bg-thead);
  color: var(--text-faint);
}

.batch-club-list-head > span {
  padding-right: 4px;
}

.batch-club-row {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-club-row > input {
  align-self: center;
  justify-self: center;
  margin: 0;
}

.batch-club-row:hover {
  background: var(--bg-hover);
}

.batch-club-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-club-meta {
  overflow: hidden;
  color: var(--text-faint);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-club-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 38px;
  border-top: 1px solid var(--border-soft, #e4e7ec);
  background: var(--bg-card);
  color: var(--text-sub);
  font-size: 12px;
}

.batch-club-pagination button {
  border: 0;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  font: inherit;
}

.batch-club-pagination button:disabled {
  color: var(--text-faint);
  cursor: not-allowed;
}

.batch-selected-clubs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
}

.batch-selected-label {
  color: var(--text-faint);
  font-size: 11px;
}

.batch-selected-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 999px;
  background: var(--primary-faint);
  color: var(--primary);
  font-size: 11px;
}

.batch-selected-chip button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.batch-footer-summary {
  margin-right: auto;
  color: var(--text-sub);
  font-size: 12px;
}

@media (max-width: 760px) {
  .batch-game-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .batch-section-head {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .batch-section-tools {
    width: 100%;
    flex: 1 1 100%;
    flex-wrap: wrap;
  }

  .batch-filter-row--inline {
    flex: 1 1 100%;
  }

  .batch-section-head p {
    max-width: 260px;
  }

  .batch-filter-row--inline {
    max-width: none;
  }
}

.license-thumb-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.license-thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #eef0f4;
  cursor: zoom-in;
  overflow: hidden;
}
.license-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-group {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  min-width: max-content;
}

.license-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 70vh;
  overflow: auto;
}

.license-preview .el-image {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(46, 16, 101, 0.14);
}

.empty-preview {
  padding: 48px 12px;
  text-align: center;
  color: #8a93a6;
  font-size: 13px;
}

.status-success {
  color: #0f9f6e;
  background: rgba(15, 159, 110, 0.08);
}

.status-danger {
  color: #d92d20;
  background: rgba(217, 45, 32, 0.08);
}

.status-muted {
  color: #475467;
  background: rgba(71, 84, 103, 0.08);
}

/* ===== 新增 / 编辑 表单 ===== */
.prototype-form {
  display: grid;
  gap: 16px;
}

.field-row {
  display: grid;
  gap: 8px;
}

.field-row label {
  color: #5b6478;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.prototype-form input,
.prototype-form select {
  width: 100%;
  border: 1px solid #e3e7f0;
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 13px;
  color: #1f2937;
  box-sizing: border-box;
  background: #fbfcfe;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.prototype-form input:focus,
.prototype-form select:focus {
  border-color: #8b5cf6;
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-border);
}

/* ===== 资产管理弹窗 ===== */
.asset-dialog-card {
  display: grid;
  gap: 18px;
}

.asset-type-switch {
  display: inline-flex;
  gap: 6px;
  width: 100%;
  padding: 5px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--bg-elevated);
}

.type-btn {
  flex: 1;
  height: 40px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-sub);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-btn:hover {
  color: var(--primary);
}

.type-btn.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  border-color: transparent;
  color: var(--text-invert);
  box-shadow: 0 10px 22px var(--primary-glow-strong);
}

.asset-balance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 14px;
  color: var(--text-invert);
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(255, 255, 255, 0.22), transparent 55%),
    linear-gradient(135deg, var(--primary), var(--primary-hover));
  box-shadow: 0 14px 30px var(--primary-glow-strong);
}

.asset-balance-row span {
  font-size: 13px;
  opacity: 0.9;
}

.asset-balance-row strong {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.asset-field-group {
  display: grid;
  gap: 8px;
}

.field-label {
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.field-label.required::before {
  content: '*';
  color: #f04438;
  margin-right: 4px;
}

.radio-group {
  margin-top: 2px;
}

.radio-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  width: 100%;
}

.radio-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-sub);
  font-size: 13px;
  cursor: pointer;
  background: var(--bg-elevated);
  transition: all 0.18s ease;
}

.radio-item:hover {
  border-color: var(--primary-border-strong);
  color: var(--primary);
}

.radio-item input {
  width: auto;
  accent-color: var(--primary);
}

.radio-item:has(input:checked) {
  border-color: transparent;
  color: var(--primary);
  background: var(--primary-faint);
  box-shadow: inset 0 0 0 1px var(--primary-border-strong);
  font-weight: 600;
}

.asset-field-group input,
.asset-field-group textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elevated);
  padding: 11px 14px;
  font-size: 13px;
  box-sizing: border-box;
  color: var(--text-main);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.asset-field-group input:focus,
.asset-field-group textarea:focus {
  border-color: var(--primary);
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-border);
}

.asset-field-group textarea {
  resize: vertical;
  min-height: 84px;
}

.reason-count {
  text-align: right;
  color: var(--text-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

/* ===== 分润配置弹窗 ===== */
.combined-config-card {
  display: grid;
  gap: 16px;
}

.combined-config-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.combined-config-heading > div:first-child {
  min-width: 0;
}

.combined-config-heading p {
  margin: 0;
  color: var(--text-sub);
  font-size: 12px;
}

.config-scope-note {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--primary-faint);
  border-radius: 12px;
  background: var(--primary-faint);
  color: var(--text-sub);
  font-size: 13px;
}

.combined-config-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.spec-search-input {
  display: flex;
  align-items: center;
  width: 346px;
  height: 36px;
  border: 1px solid var(--border);
  /* border-radius: 10px; */
  background: var(--bg-elevated);
}

.spec-search-input:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-border);
}

.spec-search-input input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 12px;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 13px;
  /* background: #f8fafc; */
}

.spec-search-clear {
  display: grid;
  flex: none;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-sub);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.spec-search-clear:hover {
  background: var(--primary-faint);
  color: var(--text-main);
}

.combined-fixed-list-wrap {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.combined-fixed-hint {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--primary-border);
  border-radius: 10px;
  background: var(--primary-faint);
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.5;
}

.combined-spec-table-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 210px);
  gap: 12px;
  padding: 0 12px;
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 700;
}

.combined-spec-table-head span:last-child {
  text-align: left;
}

.combined-spec-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border: 1px solid var(--border-soft, #e4e7ec);
  border-radius: 10px;
  background: var(--bg-elevated, #f8fafc);
}

.combined-spec-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--text-sub);
  font-size: 12px;
}

.combined-spec-stats strong {
  margin-left: 3px;
  color: var(--primary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.combined-spec-filters {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 8px;
  background: var(--bg-muted, #eef2f6);
}

.combined-spec-filters button {
  padding: 5px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-sub);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}

.combined-spec-filters button.active {
  background: var(--bg-card, #fff);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.12);
  font-weight: 600;
}

.combined-spec-list {
  max-height: 60vh;
}

.combined-spec-rows {
  display: grid;
  gap: 8px;
}

.combined-spec-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 210px);
  align-items: center;
  gap: 12px;
}

.combined-spec-amount {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-sub);
  font-size: 12px;
}

.combined-spec-amount input {
  width: 100%;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--bg-elevated);
  color: var(--text-main);
  font-size: 13px;
}

.combined-spec-amount input:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--primary-border);
}

@media (max-width: 760px) {
  .combined-config-heading {
    display: grid;
  }

  .combined-config-tools {
    justify-content: flex-start;
  }

  .spec-search-input {
    flex: 1 1 100%;
    width: 100%;
  }

  .combined-spec-row {
    grid-template-columns: minmax(0, 1fr) minmax(120px, 150px);
    gap: 8px;
  }

  .combined-spec-table-head {
    grid-template-columns: minmax(0, 1fr) minmax(120px, 150px);
    gap: 8px;
  }
}

.profit-type-switch {
  display: inline-flex;
  gap: 6px;
  width: 100%;
  padding: 5px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--bg-elevated);
  box-sizing: border-box;
}

.profit-type-btn {
  flex: 1;
  height: 40px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-sub);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profit-type-btn:hover {
  color: var(--primary);
}

.profit-type-btn.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  border-color: transparent;
  color: var(--text-invert);
  box-shadow: 0 10px 22px var(--primary-glow-strong);
}

.profit-field {
  display: grid;
  gap: 8px;
}

.profit-field label {
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.profit-rate-input {
  display: flex;
  align-items: center;
  gap: 6px;
}

.profit-rate-input input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elevated);
  padding: 11px 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  box-sizing: border-box;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.profit-rate-input input:focus {
  border-color: var(--primary);
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-border);
}

.profit-rate-input span {
  color: var(--text-sub);
  font-size: 14px;
  font-weight: 600;
  flex: 0 0 auto;
}

.profit-platform-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 14px;
  color: var(--text-invert);
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(255, 255, 255, 0.22), transparent 55%),
    linear-gradient(135deg, var(--primary), var(--primary-hover));
  box-shadow: 0 14px 30px var(--primary-glow-strong);
}

.profit-platform-row span {
  font-size: 13px;
  opacity: 0.9;
}

.profit-platform-row strong {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.profit-tip {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--primary-faint);
  color: #8a93a6;
  font-size: 12px;
  line-height: 1.6;
}

.profit-copy-dialog {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.profit-copy-tip {
  margin: 0;
  padding: 11px 13px;
  border: 1px solid var(--primary-faint);
  border-radius: 10px;
  background: var(--primary-faint);
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.65;
}

.profit-copy-search-hint {
  margin: 0;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.4;
}

.profit-copy-field {
  display: grid;
  gap: 8px;
}

.profit-copy-field label {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
}

.profit-copy-field :deep(.el-select__wrapper) {
  min-height: 40px;
  border-radius: 10px;
  box-shadow: 0 0 0 1px #e3e7f0 inset;
}

.profit-copy-field :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--primary) inset, 0 0 0 3px var(--primary-border);
}

.profit-copy-field :deep(.el-tag) {
  border: 0;
  border-radius: 6px;
  background: var(--primary-faint);
  color: var(--primary);
}

.profit-copy-error {
  margin: 0;
  color: var(--el-color-danger);
  font-size: 13px;
}

/* ===== 可接单规格弹窗 ===== */
.spec-loading,
.spec-empty {
  padding: 32px 12px;
  text-align: center;
  color: #8a93a6;
  font-size: 13px;
}

.spec-error-detail {
  display: block;
  margin-top: 8px;
  color: #d92d20;
  font-size: 12px;
  word-break: break-all;
}

.spec-game-list {
  display: grid;
  gap: 12px;
  max-height: 46vh;
  overflow-y: auto;
  padding-right: 4px;
}

.spec-game-item {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--bg-elevated);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.spec-game-item:hover {
  border-color: var(--primary-border-strong);
  box-shadow: 0 6px 16px var(--primary-border);
}

.spec-game-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.spec-game-collapse {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.spec-row-shelf-number {
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
}

.spec-game-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.spec-game-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 7px;
  background: var(--primary-faint);
  color: var(--primary);
  transition: transform 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.spec-game-chevron svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.spec-game-collapse:hover .spec-game-chevron {
  background: var(--primary);
  color: var(--text-invert, #fff);
}

.spec-game-collapse[aria-expanded="true"] .spec-game-chevron {
  transform: rotate(180deg);
}

.spec-all-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-sub);
  cursor: pointer;
  user-select: none;
}

.spec-all-toggle.muted {
  opacity: 0.5;
  cursor: not-allowed;
}

.spec-all-toggle input {
  width: auto;
  accent-color: var(--primary);
}

.spec-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spec-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-sub);
  font-size: 12.5px;
  cursor: pointer;
  user-select: none;
  transition: all 0.16s ease;
}

.spec-tag:hover {
  border-color: #c9b8ff;
  color: var(--primary);
}

.spec-tag.active {
  border-color: transparent;
  background: var(--primary-faint);
  color: var(--primary);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px var(--primary-border-strong);
}

.spec-tag input {
  width: auto;
  margin: 0;
  accent-color: var(--primary);
}

.spec-game-none {
  color: #98a2b3;
  font-size: 12px;
}

.spec-tip {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--primary-faint);
  color: #8a93a6;
  font-size: 12px;
  line-height: 1.6;
}

/* ===== 弹窗底部按钮 ===== */
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-plain {
  background: #f2f4f7;
  color: #475467;
}

.btn-plain:hover {
  background: #e8ecf3;
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

/* 资产凭证文件列表 */
.upload-box .upload-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.upload-trigger {
  padding: 6px 14px;
  border: 1px solid var(--primary-border, #c7d7fe);
  border-radius: 8px;
  background: #f5f8ff;
  color: var(--primary, #4e6ef2);
  cursor: pointer;
}
.upload-tip {
  color: #98a2b3;
  font-size: 12px;
}

.file-drop.is-dragging,
.upload-box.is-dragging {
  border-color: var(--primary);
  background: var(--primary-faint);
  box-shadow: 0 0 0 3px var(--primary-border);
}

.file-drop:focus-visible,
.upload-box:focus-visible {
  outline: 2px solid var(--primary-border-strong);
  outline-offset: 2px;
}

.license-pick-preview {
  position: relative;
  width: 88px;
  height: 88px;
}
.license-pick-preview-image {
  width: 88px;
  height: 88px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
}
.license-close {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #fff;
  background: rgba(31, 41, 55, 0.78);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: all 0.18s ease;
}
.license-close:hover {
  background: #f04438;
}

/* ===== 新增/编辑弹窗表单（对齐 GameListView 约定） ===== */
.club-modal-body {
  display: grid;
  gap: 16px;
}
.club-modal-body .form-row {
  display: grid;
  gap: 8px;
}
.club-modal-body .form-row label,
.club-modal-body .spec-section > label {
  color: #5b6478;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.club-modal-body label.required::before {
  content: '*';
  color: #f04438;
  margin-right: 4px;
}
.club-modal-body input,
.club-modal-body select,
.club-modal-body textarea {
  width: 100%;
  border: 1px solid #e3e7f0;
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 13px;
  color: #1f2937;
  box-sizing: border-box;
  background: #fbfcfe;
  font-family: inherit;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}
.club-modal-body input:focus,
.club-modal-body select:focus,
.club-modal-body textarea:focus {
  border-color: #8b5cf6;
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-border);
}

/* 规格：每行 游戏下拉 + 规格下拉 + 删除；新增按钮排在最后一行后，不单独换行 */
.spec-section {
  display: grid;
  gap: 10px;
}
.spec-rows-inline {
  display: grid;
  gap: 10px;
}
.spec-rows-inline .spec-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
}
.spec-rows-inline .spec-game-select {
  width: 42%;
  flex-shrink: 0;
}
.spec-rows-inline .spec-value-select {
  flex: 1;
  min-width: 0;
}
.spec-add {
  align-self: center;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #e3e7f0;
  background: #fbfcfe;
  color: #475467;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.18s ease;
}
.icon-btn:hover {
  border-color: #8b5cf6;
  color: var(--primary);
  background: var(--bg-card);
}

/* 营业执照正方形上传按钮 */
.license-square-btn {
  width: 88px;
  height: 88px;
  border: 1px dashed #c3c9d6;
  border-radius: 12px;
  background: #fbfcfe;
  color: #98a2b3;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}
.license-square-btn:hover {
  border-color: #3563e9;
  color: #3563e9;
}

/* 文件虚线容器 + 描边上传按钮 */
.file-drop {
  border: 1.5px dashed #c9d4f5;
  border-radius: 12px;
  background: #f6f8ff;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-drop-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.upload-btn-outline {
  border: 1px solid #2e9e82;
  color: #2e9e82;
  background: #fff;
  border-radius: 8px;
  padding: 7px 18px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.upload-btn-outline:hover {
  background: #eef9f5;
}
.file-drop-tip {
  color: #98a2b3;
  font-size: 12px;
}
.file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.file-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  background: #fff;
  max-width: 260px;
}
.chip-thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: zoom-in;
}
.chip-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.chip-file-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #eef2ff;
  color: #6366f1;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chip-name {
  color: #344054;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}
.chip-download {
  color: #667085;
  font-size: 14px;
  text-decoration: none;
  flex-shrink: 0;
}
.chip-download:hover {
  color: #3563e9;
}

.chip-file-icon.clickable,
.chip-name.clickable {
  cursor: pointer;
}
.chip-file-icon.clickable:hover,
.chip-name.clickable:hover {
  color: #3563e9;
}

/* 视频/音频预览弹窗 */
.media-preview-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}
.media-player {
  width: 100%;
  max-height: 60vh;
  border-radius: 10px;
  background: #0f172a;
}
.media-player-audio {
  width: 100%;
}
.media-preview-tip {
  margin: 0;
  font-size: 12px;
  color: #98a2b3;
  text-align: center;
}
.chip-remove {
  border: none;
  background: transparent;
  color: #98a2b3;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  flex-shrink: 0;
}
.chip-remove:hover {
  color: #f04438;
}
</style>

<!-- 弹窗外壳外观，通过内容容器 :has 命中 -->
<style>
.modal-overlay:has(.club-modal-content) {
  background: rgba(17, 12, 46, 0.55);
  backdrop-filter: blur(6px);
}

.modal-box:has(.club-modal-content) {
  border-radius: 22px;
  border: 1px solid var(--primary-border);
  box-shadow: 0 40px 90px rgba(46, 16, 101, 0.35), 0 6px 20px rgba(46, 16, 101, 0.16);
}

.modal-box:has(.club-modal-content) .modal-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  border-bottom: none;
}

.modal-box:has(.club-modal-content) .modal-header strong {
  color: var(--text-invert);
  font-size: 18px;
  letter-spacing: 0.02em;
}

.modal-box:has(.club-modal-content) .modal-title-dot {
  background: var(--bg-card);
  box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.22);
}

.modal-box:has(.club-modal-content) .modal-header .btn-link {
  color: rgba(255, 255, 255, 0.9);
}

.modal-box:has(.club-modal-content) .modal-header .btn-link:hover {
  background: rgba(255, 255, 255, 0.18);
  color: var(--text-invert);
}

.modal-box:has(.club-modal-content) .modal-body {
  padding: 24px;
  background: var(--bg-card);
}

.modal-box:has(.club-modal-content) .modal-footer {
  padding: 16px 24px 20px;
  /* background: linear-gradient(180deg, rgba(248, 250, 255, 0.7), rgba(243, 240, 255, 0.95)); */
  border-top: 1px solid var(--primary-faint);
}

[data-theme='nightgold'] .modal-overlay:has(.club-modal-content) {
  background: rgba(5, 7, 11, 0.72);
  backdrop-filter: blur(5px);
}

[data-theme='nightgold'] .modal-box:has(.club-modal-content) {
  box-shadow: 0 32px 72px rgba(0, 0, 0, 0.68), 0 4px 18px rgba(0, 0, 0, 0.4);
}

[data-theme='nightgold'] .modal-box:has(.club-modal-content) .modal-header {
  background: linear-gradient(180deg, #1b202a, #171b23);
  border-bottom: 1px solid var(--border-soft);
}

[data-theme='nightgold'] .modal-box:has(.club-modal-content) .modal-header strong {
  color: var(--text-main);
}

[data-theme='nightgold'] .modal-box:has(.club-modal-content) .modal-title-dot {
  background: var(--primary);
  box-shadow: 0 0 0 4px rgba(212, 164, 64, 0.14);
}
</style>
