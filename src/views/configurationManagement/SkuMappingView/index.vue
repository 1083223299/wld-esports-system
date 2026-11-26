// SkuMapping 组件，用于管理游戏的 SKU 映射
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { useToast } from '../../../composables/useToast';
import { useConfirm } from '../../../composables/useConfirm';
import { gameApi } from '../../../api/modules/game';
import { channelApi } from '../../../api/modules/channel';
import { downloadBlob } from '../../../utils/downloadBlob';
import { showErrorDialog } from '../../../utils/showErrorDialog';

const { show } = useToast();
const { confirm } = useConfirm();
const props = defineProps({
  shopId: { type: [String, Number], default: '' },
});
const emit = defineEmits(['back']);

// ============ 店铺（渠道）tabs ============
// 店铺列表来自渠道配置（channelApi.all，含真实 shopId）
const shops = ref([]);
const activeShop = ref(null);
const hasActiveShop = computed(() => Boolean(activeShop.value?.shopId));

async function loadShops() {
  try {
    const list = await channelApi.all();
    shops.value = (Array.isArray(list) ? list : []).map((c) => ({
      channel: c.channel || c.channelCode || '',
      shop: c.shopName || c.channel || c.channelCode || c.shopId || '',
      shopId: c.shopId || '',
    }));
    const requestedShopId = String(props.shopId || '');
    activeShop.value = requestedShopId
      ? shops.value.find((shop) => String(shop.shopId) === requestedShopId) || null
      : shops.value[0] || null;
    if (requestedShopId && !activeShop.value) {
      show('指定店铺不存在或已不可用，请从店铺管理重新进入', 'warning');
    }
  } catch (error) {
    shops.value = [];
    activeShop.value = null;
    show(error?.message || '店铺列表加载失败，请重试', 'error');
  }
}

/** 切换店铺：重置页码并按 shopId 重新拉取 */
function selectShop(s) {
  activeShop.value = s;
  page.value = 1;
  fetchList();
}

// ============ 筛选 ============
const filter = reactive({
  productId: '',
  skuId: '',
  skuName: '',
  matched: '',
});

const searchFields = [
  { prop: 'productId', label: '商品ID', type: 'input', placeholder: '请输入商品ID', span: 5 },
  { prop: 'skuId', label: 'SKUID', type: 'input', placeholder: '请输入SKUID', span: 5 },
  { prop: 'skuName', label: 'SKU名称', type: 'input', placeholder: '请输入SKU名称', span: 5 },
  {
    prop: 'matched',
    label: '是否匹配',
    type: 'select',
    placeholder: '请选择',
    span: 5,
    options: [
      { label: '全部', value: '' },
      { label: '已匹配', value: 'matched' },
      { label: '未匹配', value: 'unmatched' },
    ],
  },
];

// ============ 列表 ============
const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const skuImportInput = ref(null);
const skuImportTarget = ref(null);
const importingProductIds = ref(new Set());
const exportingProductIds = ref(new Set());
const deletingProductIds = ref(new Set());
const productEditVisible = ref(false);
const productEditLoading = ref(false);
const productEditSaving = ref(false);
const productEditError = ref('');
const productEditShelfError = ref('');
const editingProduct = ref(null);
const productEditSkus = ref([]);
const productEditAllSkus = ref([]);
const productEditSearch = reactive({ skuId: '', itemName: '' });
const productEditSearchLoading = ref(false);
const productEditSearchError = ref('');
const updatingProductIds = ref(new Set());
let productEditSequence = 0;
let productEditSearchSequence = 0;
let listRequestSequence = 0;
const suggestVisible = ref(false);
const suggestLoading = ref(false);
const suggestApplying = ref(false);
const suggestItems = ref([]);
const suggestTotal = ref(0);
const suggestApplyable = ref(0);
const selectedSuggestIds = ref([]);
const sortedSuggestItems = computed(() => [...suggestItems.value].sort((a, b) => {
  const aReady = isSuggestionApplyable(a);
  const bReady = isSuggestionApplyable(b);
  return Number(bReady) - Number(aReady);
}));
const selectableSuggestionCount = computed(() =>
  suggestItems.value.filter(canSelectSuggestion).length
);

const columns = [
  { key: 'productName', title: '商品名称', width: 240, wrap: true },
  { key: 'productId', title: '商品ID', width: 190 },
  { key: 'skuCount', title: 'SKU数量', width: 90 },
  { key: 'matchedCount', title: '已匹配数', width: 100 },
  { key: 'action', title: '操作', width: 200 },
];

const productGroups = computed(() => {
  return rows.value.map((product, index) => {
    const key = product.productId != null && product.productId !== ''
      ? `product:${product.productId}`
      : `product-row:${index}`;
    return {
      ...product,
      key,
      id: key,
      productName: product.productName || '',
      productId: product.productId || '',
      skuCount: Number(product.skuCount) || 0,
      matchedCount: Number(product.matchedCount) || 0,
    };
  });
});

function normalizeSkuRows(list) {
  return (Array.isArray(list) ? list : []).map((item) => ({
    ...item,
    skuName: item.itemName || '',
    client: String(item.clients || '')
      .split(',')
      .map((client) => CLIENT_EN[String(client).trim()] || client.trim())
      .filter(Boolean),
      gameName: item.gameName || gameNameOf(Number(item.gameId)),
    spec: item.specName || item.spec?.name || '',
      matched: item.matched === true
        || item.matched === 1
        || item.matched === '1'
        || item.matched === 'true'
        || item.matched === '已匹配'
        || (item.matched == null && !!(item.gameId && item.specId)),
  }));
}

function shelfNoOf(sku) {
  return sku?.shelfNo || sku?.specNo || sku?.skuCode || sku?.shelfNumber || '';
}

async function copyShelfNo(value) {
  const text = String(value ?? '').trim();
  if (!text) return;
  try {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!copied) throw new Error('浏览器未能复制货架编号');
    }
    show('货架编号已复制', 'success');
  } catch (error) {
    show(error?.message || '复制失败，请检查剪贴板权限', 'error');
  }
}

async function fetchList() {
  const requestSequence = ++listRequestSequence;
  if (!activeShop.value?.shopId) {
    rows.value = [];
    total.value = 0;
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const res = await gameApi.skuProducts({
      page: page.value,
      pageSize: pageSize.value,
      shopId: activeShop.value.shopId || '',
      productId: filter.productId,
      skuId: filter.skuId,
      skuName: filter.skuName,
      matched: filter.matched,
    });
    if (requestSequence !== listRequestSequence) return;
    rows.value = res?.list || [];
    total.value = Number(res?.total) || 0;
  } catch (error) {
    if (requestSequence === listRequestSequence) {
      rows.value = [];
      total.value = 0;
      show(error?.message || '商品列表加载失败，请重试', 'error');
    }
  } finally {
    if (requestSequence === listRequestSequence) loading.value = false;
  }
}

async function fetchProductSkuRows(shopId, productId, search = {}) {
  const resultRows = [];
  let resultTotal = 0;
  let resultPage = 1;
  const resultPageSize = 200;
  do {
    const result = await gameApi.skuListByProduct({
      page: resultPage,
      pageSize: resultPageSize,
      shopId,
      productId,
      skuId: search.skuId,
      itemName: search.itemName,
    });
    resultRows.push(...(result.list || []));
    resultTotal = Number(result.total) || 0;
    if (!(result.list || []).length || resultRows.length >= resultTotal) break;
    resultPage += 1;
  } while (resultRows.length < resultTotal);
  return normalizeSkuRows(resultRows);
}

function handleSearch(values) {
  Object.assign(filter, values);
  page.value = 1;
  fetchList();
}

function handleReset() {
  filter.productId = '';
  filter.skuId = '';
  filter.skuName = '';
  filter.matched = '';
  page.value = 1;
  fetchList();
}

function pageChange(p) {
  page.value = p;
  fetchList();
}

function pageSizeChange(size) {
  pageSize.value = size;
  page.value = 1;
  fetchList();
}

async function openSkuImport(group) {
  if (!activeShop.value?.shopId) {
    await showErrorDialog('请先选择有效店铺', '无法导入');
    return;
  }
  skuImportTarget.value = group;
  if (skuImportInput.value) skuImportInput.value.value = '';
  skuImportInput.value?.click();
}

async function confirmDeleteProductPrice(group) {
  const shopId = activeShop.value?.shopId;
  const productId = String(group.productId || '').trim();
  if (!shopId || !productId) {
    show('缺少店铺或商品信息，无法删除', 'error');
    return;
  }

  const confirmed = await confirm({
    title: '删除',
    message: `确认删除商品「${group.productName || group.productId}」吗？删除后无法恢复。`,
    okText: '确认删除',
    cancelText: '取消',
  });
  if (!confirmed) return;

  const deletingIds = new Set(deletingProductIds.value);
  if (deletingIds.has(group.key)) return;
  deletingIds.add(group.key);
  deletingProductIds.value = deletingIds;
  try {
    await gameApi.deleteSkuProduct({ shopId, productId });
    show('商品配置已删除', 'success');
    if (rows.value.length <= 1 && page.value > 1) page.value -= 1;
    await fetchList();
  } catch (error) {
    show(error?.message || '删除失败，请重试', 'error');
  } finally {
    const currentDeletingIds = new Set(deletingProductIds.value);
    currentDeletingIds.delete(group.key);
    deletingProductIds.value = currentDeletingIds;
  }
}

function importFailureMessage(result, fallback) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const messages = errors.map((item) => String(item?.message || '').trim()).filter(Boolean);
  if (messages.length) return messages.join('\n');
  const message = String(result?.message || '').trim();
  return message && message.toLowerCase() !== 'ok' ? message : fallback;
}

async function showSkuImportResult(result) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const summary = `导入完成：更新 ${Number(result?.updated) || 0} 条，跳过 ${Number(result?.skipped) || 0} 条，失败 ${Number(result?.failed) || 0} 条`;
  const errorSummary = errors.slice(0, 3)
    .map((item) => `第${item.row ?? '-'}行：${item.message || '导入失败'}`)
    .join('；');
  const remaining = errors.length > 3 ? `；另有 ${errors.length - 3} 条错误` : '';
  const hasFailures = errors.length > 0 || Number(result?.failed) > 0;
  if (hasFailures) {
    await showErrorDialog([summary, errorSummary ? `错误：${errorSummary}${remaining}` : ''].filter(Boolean).join('\n'), '导入结果');
    return;
  }
  show(summary, 'success');
}

async function handleSkuImportFile(event) {
  const file = event.target.files?.[0];
  const group = skuImportTarget.value;
  const shopId = activeShop.value?.shopId;
  skuImportTarget.value = null;
  if (!file || !group) return;
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    await showErrorDialog('请选择 .xlsx 格式的 Excel 文件', '导入失败');
    event.target.value = '';
    return;
  }
  if (!shopId) {
    await showErrorDialog('请先选择有效店铺', '无法导入');
    event.target.value = '';
    return;
  }
  if (!String(group.productId || '').trim()) {
    await showErrorDialog('商品ID缺失，无法导入客户端配置', '无法导入');
    event.target.value = '';
    return;
  }

  importingProductIds.value.add(group.key);
  try {
    const confirmed = await confirm({
      title: '确认导入客户端配置',
      message: `将导入店铺商品「${group.productName || group.productId}」的客户端映射。仅更新“客户端”列，商品ID和SKUID用于定位，其它列不会写入。确认继续？`,
      okText: '确认导入',
      cancelText: '取消',
    });
    if (!confirmed) return;
    const result = await gameApi.importSkuProduct({
      shopId,
      productId: group.productId,
      file,
    });
    if (!result?.ok) {
      await showErrorDialog(importFailureMessage(result, 'SKU 映射导入失败'), 'SKU 映射导入失败');
      return;
    }
    await showSkuImportResult(result);
    await fetchList();
  } catch (error) {
    if (!error?.requestNotified) {
      await showErrorDialog(error?.message || 'SKU 映射导入失败，请重试', 'SKU 映射导入失败');
    }
  } finally {
    importingProductIds.value.delete(group.key);
    event.target.value = '';
  }
}

async function exportSkuProduct(group) {
  const shopId = activeShop.value?.shopId;
  if (!shopId) {
    await showErrorDialog('请先选择有效店铺', '无法导出');
    return;
  }
  if (!String(group.productId || '').trim()) {
    await showErrorDialog('商品ID缺失，无法导出商品配置', '无法导出');
    return;
  }
  if (exportingProductIds.value.has(group.key)) return;
  exportingProductIds.value.add(group.key);
  try {
    const response = await gameApi.exportSkuProduct({ shopId, productId: group.productId });
    if (!(response instanceof Blob)) {
      const message = typeof response === 'string' && response.trim()
        ? response
        : importFailureMessage(response, '商品配置导出失败');
      await showErrorDialog(message, '商品配置导出失败');
      return;
    }
    downloadBlob(response, `商品配置-${group.productId || '导出'}.xlsx`);
  } catch (error) {
    if (!error?.requestNotified) {
      await showErrorDialog(error?.message || '商品配置导出失败，请重试', '商品配置导出失败');
    }
  } finally {
    exportingProductIds.value.delete(group.key);
  }
}

async function loadCurrentResultIds() {
  if (!activeShop.value?.shopId) return [];
  const resultPageSize = 100;
  const ids = [];
  let resultTotal = 0;
  let resultPage = 1;
  do {
    const result = await gameApi.skuList({
      page: resultPage,
      pageSize: resultPageSize,
      shopId: activeShop.value.shopId || '',
      productId: filter.productId,
      skuId: filter.skuId,
      skuName: filter.skuName,
      matched: filter.matched,
    });
    resultTotal = Number(result.total) || 0;
    ids.push(...(result.list || []).map((item) => Number(item.id)).filter(Number.isFinite));
    if (!(result.list || []).length || ids.length >= resultTotal) break;
    resultPage += 1;
  } while (ids.length < resultTotal);
  return ids;
}

async function openSuggestPreview() {
  if (suggestLoading.value) return;
  suggestLoading.value = true;
  try {
    const ids = [...new Set(await loadCurrentResultIds())];
    if (!ids.length) {
      show('当前筛选条件下没有可补齐的 SKU 映射', 'warning');
      return;
    }
    const result = await gameApi.suggestSkuMappings({
      ids,
      onlyUnmatched: false,
    });
    suggestItems.value = Array.isArray(result?.items) ? result.items : [];
    suggestTotal.value = Number(result?.total) || suggestItems.value.length;
    suggestApplyable.value = suggestItems.value.filter(isSuggestionApplyable).length;
    selectedSuggestIds.value = suggestItems.value
      .filter(canSelectSuggestion)
      .map((item) => Number(item.id))
      .filter(Number.isFinite);
    suggestVisible.value = true;
  } catch (error) {
    console.error('[sku-mapping] 规则补齐预览失败:', error);
  } finally {
    suggestLoading.value = false;
  }
}

function selectAllSuggestions() {
  const ids = suggestItems.value
    .filter(canSelectSuggestion)
    .map((item) => Number(item.id))
    .filter(Number.isFinite);
  const allSelected = ids.length > 0 && ids.every((id) => selectedSuggestIds.value.includes(id));
  selectedSuggestIds.value = allSelected ? [] : ids;
}

function getSuggestionField(item, prefix, field) {
  const suffix = `${field[0].toUpperCase()}${field.slice(1)}`;
  const direct = item[`${prefix}${suffix}`];
  if (direct && typeof direct === 'object') return direct.id ?? direct.name ?? '';
  return direct ?? item[`${prefix}${suffix}Id`] ?? item[`${prefix}${suffix}Name`] ?? '';
}

function normalizeSuggestionClients(value) {
  const values = (Array.isArray(value) ? value : String(value || '').split(','))
    .map((client) => String(client).trim().toUpperCase())
    .filter(Boolean)
    .sort();
  return values.join(',');
}

function isSuggestionChanged(item) {
  if (item.changed !== undefined && item.changed !== null) {
    return item.changed === true || item.changed === 1 || item.changed === '1' || item.changed === 'true';
  }
  if (String(item.confidence || '').toUpperCase() === 'NONE') return false;

  const fields = ['game', 'spec'];
  for (const field of fields) {
    const current = getSuggestionField(item, 'current', field);
    const suggested = getSuggestionField(item, 'suggested', field);
    if (current !== '' || suggested !== '') {
      if (String(current) !== String(suggested)) return true;
    }
  }
  const currentClients = normalizeSuggestionClients(item.currentClients);
  const suggestedClients = normalizeSuggestionClients(item.suggestedClients);
  if (currentClients || suggestedClients) return currentClients !== suggestedClients;
  return false;
}

function isSuggestionApplyable(item) {
  return !!item.applyable && isSuggestionChanged(item);
}

function canSelectSuggestion(item) {
  const gameId = Number(item.suggestedGameId ?? item.suggestedGame?.id);
  const specId = Number(item.suggestedSpecId ?? item.suggestedSpec?.id);
  return item.id != null && Number.isFinite(gameId) && Number.isFinite(specId);
}

function toggleSuggestion(item, checked) {
  const id = Number(item.id);
  if (!Number.isFinite(id) || !canSelectSuggestion(item)) return;
  selectedSuggestIds.value = checked
    ? [...new Set([...selectedSuggestIds.value, id])]
    : selectedSuggestIds.value.filter((selectedId) => selectedId !== id);
}

function suggestionGame(item, prefix) {
  const value = item[`${prefix}GameName`] || item[`${prefix}Game`]?.name;
  const id = item[`${prefix}GameId`] ?? item[`${prefix}Game`]?.id;
  return value || (id != null ? `游戏 #${id}` : '未设置');
}

function suggestionSpec(item, prefix) {
  const value = item[`${prefix}SpecName`] || item[`${prefix}Spec`]?.name;
  const id = item[`${prefix}SpecId`] ?? item[`${prefix}Spec`]?.id;
  return value || (id != null ? `规格 #${id}` : '未设置');
}

function suggestionClients(item, prefix) {
  const clients = item[`${prefix}Clients`];
  if (Array.isArray(clients)) return clients.join('、') || '未设置';
  return clients ? String(clients).replaceAll(',', '、') : '未设置';
}

function suggestionReasons(item) {
  if (Array.isArray(item.reasons)) return item.reasons.join('；');
  return item.reasons || '—';
}

async function applySuggestions() {
  const selectedItems = suggestItems.value.filter(
    (item) => canSelectSuggestion(item) && selectedSuggestIds.value.includes(Number(item.id))
  );
  if (!selectedItems.length) {
    show('请至少选择一条包含游戏和规格的建议', 'warning');
    return;
  }
  suggestApplying.value = true;
  try {
    const result = await gameApi.applySkuMappingSuggestions({
      items: selectedItems.map((item) => ({
        id: Number(item.id),
        gameId: Number(item.suggestedGameId ?? item.suggestedGame?.id),
        specId: Number(item.suggestedSpecId ?? item.suggestedSpec?.id),
        clients: Array.isArray(item.suggestedClients)
          ? item.suggestedClients.join(',')
          : String(item.suggestedClients || ''),
      })),
    });
    const applied = Number(result?.applied) || 0;
    const skipped = Number(result?.skipped) || 0;
    show(`规则补齐完成：已写入 ${applied} 条，跳过 ${skipped} 条`, 'success');
    suggestVisible.value = false;
    fetchList();
  } catch (error) {
    console.error('[sku-mapping] 规则补齐落库失败:', error);
  } finally {
    suggestApplying.value = false;
  }
}

// ============ 游戏目录（规格按需通过分页接口加载） ============
const allGames = ref([]);
async function loadAllGames() {
  const games = (await gameApi.listAll()) || [];
  allGames.value = games.map((g) => ({ id: Number(g.id), name: g.name }));
}

/** 后端客户端枚举 → 页面中文 */
const CLIENT_EN = { PC: '端游', MOBILE: '手游' };
/** 页面中文 → 后端枚举（多选时逗号分隔） */
const CLIENT_CN = { 端游: 'PC', 手游: 'MOBILE' };
const CLIENT_OPTIONS = [
  { label: '手游', value: 'MOBILE' },
  { label: '端游', value: 'PC' },
];

function gameNameOf(gameId) {
  const g = allGames.value.find((x) => x.id === gameId);
  return g ? g.name : '';
}

// ============ 添加商品弹窗 ============
const addVisible = ref(false);
const addForm = reactive({ productIds: '' });
const addSaving = ref(false);
const addPreview = ref([]);
const addPreviewLoading = ref(false);
let addPreviewTimer = null;
let addPreviewSequence = 0;

function parseAddProductIds() {
  return [...new Set(
    String(addForm.productIds || '')
      .split(/[;；,\s]+/)
      .map((productId) => productId.trim())
      .filter(Boolean)
  )];
}

function addSkuStatus(sku) {
  return ['新增', '更新', '无变动'].includes(sku?.diffStatus)
    ? sku.diffStatus
    : '待确认';
}

function normalizeClientSelection(clients) {
  const values = (Array.isArray(clients) ? clients : String(clients || '').split(','))
    .map((client) => {
      const value = String(client).trim();
      return CLIENT_CN[value] || value;
    });
  return [...new Set(values.filter((value) => CLIENT_EN[value]))];
}

function togglePreviewClient(sku, client, checked) {
  const selected = new Set(normalizeClientSelection(sku.clients));
  if (checked) selected.add(client);
  else selected.delete(client);
  sku.clients = CLIENT_OPTIONS
    .map((option) => option.value)
    .filter((value) => selected.has(value));
}

const canSubmitAdd = computed(() => {
  const productIds = parseAddProductIds();
  return Boolean(
    hasActiveShop.value
      && productIds.length
      && !addPreviewLoading.value
      && addPreview.value.length === productIds.length
      && addPreview.value.every((preview, index) =>
        preview.productId === productIds[index]
          && !preview.error
          && preview.skus.every((sku) => addSkuStatus(sku) !== '待确认')
      )
  );
});

async function loadAddPreview(productIds, requestSequence, shopId) {
  const previews = await Promise.all(productIds.map(async (productId) => {
    try {
      const response = await gameApi.previewSkuProduct({ shopId, productId });
      const data = response?.data ?? response;
      const skus = Array.isArray(data?.list) ? data.list : [];
      const previewSkus = skus.map((sku) => {
        const clients = normalizeClientSelection(sku.clients);
        return {
          ...sku,
          clients,
        };
      });
      return {
        productId,
        productName: data?.productName || data?.product?.name || '',
        addedCount: Number(data?.addedCount) || 0,
        updatedCount: Number(data?.updatedCount) || 0,
        unchangedCount: Number(data?.unchangedCount) || 0,
        skus: previewSkus,
      };
    } catch (error) {
      return { productId, skus: [], error: error?.message || '商品预览失败' };
    }
  }));

  if (
    requestSequence === addPreviewSequence
      && addVisible.value
      && shopId === String(activeShop.value?.shopId || '')
  ) {
    addPreview.value = previews;
    addPreviewLoading.value = false;
  }
}

watch(
  [
    () => addVisible.value,
    () => addForm.productIds,
    () => activeShop.value?.shopId,
  ],
  () => {
    if (addPreviewTimer) clearTimeout(addPreviewTimer);
    addPreviewSequence += 1;
    addPreview.value = [];
    addPreviewLoading.value = false;

    const productIds = parseAddProductIds();
    const shopId = String(activeShop.value?.shopId || '');
    if (!addVisible.value || !shopId || !productIds.length) return;

    const requestSequence = addPreviewSequence;
    addPreviewLoading.value = true;
    addPreviewTimer = setTimeout(() => {
      loadAddPreview(productIds, requestSequence, shopId);
    }, 450);
  },
  { flush: 'post' }
);

function openAdd() {
  if (!hasActiveShop.value) {
    show('请先选择一个有效店铺', 'warning');
    return;
  }
  addForm.productIds = '';
  addVisible.value = true;
}

async function submitAdd() {
  const productIds = parseAddProductIds();
  if (!productIds.length) {
    show('请输入商品ID', 'warning');
    return;
  }
  if (!canSubmitAdd.value) {
    show('请等待商品 SKU 预览完成并确认新增状态', 'warning');
    return;
  }
  if (!hasActiveShop.value) {
    show('请先选择一个有效店铺', 'warning');
    return;
  }

  const shopId = activeShop.value.shopId;
  addSaving.value = true;
  const succeeded = [];
  const failed = [];
  try {
    for (const productId of productIds) {
      try {
        const preview = addPreview.value.find((item) => item.productId === productId);
        const list = (preview?.skus || [])
          .map((sku) => ({
            skuId: String(sku.skuId || '').trim(),
            clients: normalizeClientSelection(sku.clients)
              .map((client) => CLIENT_EN[client])
              .filter(Boolean),
          }));
        await gameApi.syncSkuProduct({
          shopId,
          productId,
          list,
        });
        succeeded.push(productId);
      } catch (error) {
        failed.push({ productId, message: error?.message || '同步失败' });
      }
    }

    if (succeeded.length) {
      addVisible.value = false;
      await fetchList();
    }

    if (failed.length) {
      const failures = failed
        .slice(0, 3)
        .map((item) => `${item.productId}（${item.message}）`)
        .join('；');
      const remaining = failed.length > 3 ? `；另有 ${failed.length - 3} 个失败` : '';
      show(`同步完成：成功 ${succeeded.length} 个，失败 ${failed.length} 个。${failures}${remaining}`, succeeded.length ? 'warning' : 'error');
    } else {
      show(`成功同步 ${succeeded.length} 个商品及其 SKU`, 'success');
    }
  } finally {
    addSaving.value = false;
  }
}

// ============ 商品维度 SKU 编辑 ============
async function openProductEdit(product) {
  if (!hasActiveShop.value || !product.productId) {
    show('当前商品缺少有效的店铺或商品 ID', 'warning');
    return;
  }
  const sequence = ++productEditSequence;
  const shopId = String(activeShop.value.shopId);
  editingProduct.value = product;
  productEditSkus.value = [];
  productEditAllSkus.value = [];
  productEditSearch.skuId = '';
  productEditSearch.itemName = '';
  productEditSearchLoading.value = false;
  productEditSearchError.value = '';
  productEditSearchSequence += 1;
  productEditError.value = '';
  productEditShelfError.value = '';
  productEditVisible.value = true;
  productEditLoading.value = true;
  try {
    const previewPromise = gameApi.previewSkuProduct({
      shopId,
      productId: product.productId,
    }).then((response) => {
      const data = response?.data ?? response;
      return { skus: Array.isArray(data?.list) ? data.list : [] };
    }, (error) => ({ error }));
    const [skus, preview] = await Promise.all([
      fetchProductSkuRows(shopId, product.productId),
      previewPromise,
    ]);
    if (sequence !== productEditSequence) return;
    if (preview.error) {
      productEditShelfError.value = preview.error?.message || '货架编号加载失败';
      show(`SKU 已加载，但货架编号加载失败：${productEditShelfError.value}`, 'warning');
    }
    const previewBySkuId = new Map(
      (preview.skus || []).map((sku) => [String(sku.skuId), sku])
    );
    productEditAllSkus.value = skus.map((sku) => {
      const clientSelection = normalizeClientSelection(sku.client);
      const previewSku = previewBySkuId.get(String(sku.skuId));
      return {
        ...sku,
        shelfNo: shelfNoOf(sku) || shelfNoOf(previewSku),
        clientSelection,
        originalClientSelection: [...clientSelection],
      };
    });
    productEditSkus.value = productEditAllSkus.value;
  } catch (error) {
    if (sequence === productEditSequence) {
      productEditError.value = error?.message || '商品 SKU 加载失败，请重试';
      show(error?.message || '商品 SKU 加载失败，请重试', 'error');
    }
  } finally {
    if (sequence === productEditSequence) productEditLoading.value = false;
  }
}

async function searchProductEditSkus() {
  if (!editingProduct.value || productEditLoading.value || productEditSearchLoading.value) return;
  const sequence = ++productEditSearchSequence;
  const editSequence = productEditSequence;
  const shopId = String(activeShop.value?.shopId || '');
  const productId = String(editingProduct.value.productId || '');
  productEditSearchLoading.value = true;
  productEditSearchError.value = '';

  try {
    const resultRows = await fetchProductSkuRows(shopId, productId, productEditSearch);
    if (sequence !== productEditSearchSequence || editSequence !== productEditSequence) return;

    const allRows = [...productEditAllSkus.value];
    const rowsBySkuId = new Map(allRows.map((sku) => [String(sku.skuId), sku]));
    for (const sku of resultRows) {
      const key = String(sku.skuId);
      if (rowsBySkuId.has(key)) continue;
      const clientSelection = normalizeClientSelection(sku.client);
      const row = {
        ...sku,
        clientSelection,
        originalClientSelection: [...clientSelection],
      };
      allRows.push(row);
      rowsBySkuId.set(key, row);
    }

    productEditAllSkus.value = allRows;
    const resultIds = new Set(resultRows.map((sku) => String(sku.skuId)));
    productEditSkus.value = allRows.filter((sku) => resultIds.has(String(sku.skuId)));
  } catch (error) {
    if (sequence === productEditSearchSequence && editSequence === productEditSequence) {
      productEditSearchError.value = error?.message || 'SKU 搜索失败，请重试';
      show(productEditSearchError.value, 'error');
    }
  } finally {
    if (sequence === productEditSearchSequence) productEditSearchLoading.value = false;
  }
}

function resetProductEditSearch() {
  productEditSearch.skuId = '';
  productEditSearch.itemName = '';
  searchProductEditSkus();
}

function closeProductEdit() {
  if (productEditSaving.value) return;
  productEditSequence += 1;
  productEditSearchSequence += 1;
  productEditVisible.value = false;
}

function toggleProductSkuClient(sku, client, checked) {
  const selected = new Set(sku.clientSelection);
  if (checked) selected.add(client);
  else selected.delete(client);
  sku.clientSelection = CLIENT_OPTIONS
    .map((option) => option.value)
    .filter((value) => selected.has(value));
}

function hasProductSkuClientChanges(sku) {
  const original = [...sku.originalClientSelection].sort();
  const current = [...sku.clientSelection].sort();
  return original.length !== current.length
    || original.some((client, index) => client !== current[index]);
}

async function submitProductEdit() {
  const changedRows = productEditAllSkus.value.filter(hasProductSkuClientChanges);
  if (!changedRows.length) {
    show('没有需要保存的客户端修改', 'warning');
    return;
  }

  productEditSaving.value = true;
  try {
    const list = productEditAllSkus.value.map((sku) => ({
      skuId: String(sku.skuId || '').trim(),
      clients: sku.clientSelection
        .map((client) => CLIENT_EN[client])
        .filter(Boolean),
    }));
    await gameApi.updateSkuClients({
      shopId: activeShop.value.shopId,
      productId: editingProduct.value.productId,
      list,
    });
    for (const sku of productEditAllSkus.value) {
      sku.originalClientSelection = [...sku.clientSelection];
    }
    productEditVisible.value = false;
    show(`已保存 ${changedRows.length} 条 SKU 客户端设置`, 'success');
    await fetchList();
  } catch (error) {
    show(error?.message || 'SKU 客户端保存失败，请重试', 'error');
  } finally {
    productEditSaving.value = false;
  }
}

async function updateProduct(product) {
  if (updatingProductIds.value.has(product.key)) return;
  const hasUnsavedChanges = productEditVisible.value
    && editingProduct.value?.key === product.key
    && productEditAllSkus.value.some(hasProductSkuClientChanges);
  if (hasUnsavedChanges) {
    const confirmed = await confirm({
      title: '确认更新商品',
      message: '当前有尚未保存的客户端修改。更新后会重新加载商品 SKU，未保存的修改将丢失，是否继续？',
      okText: '继续更新',
      cancelText: '返回编辑',
    });
    if (!confirmed) return;
  }

  const updating = new Set(updatingProductIds.value);
  updating.add(product.key);
  updatingProductIds.value = updating;
  try {
    await gameApi.syncSkuProduct({
      shopId: activeShop.value.shopId,
      productId: product.productId,
    });
    show(`商品 ${product.productId} 更新成功`, 'success');
    await fetchList();
    if (productEditVisible.value && editingProduct.value?.key === product.key) {
      await openProductEdit(product);
    }
  } catch (error) {
    show(error?.message || `商品 ${product.productId} 更新失败`, 'error');
  } finally {
    const nextUpdating = new Set(updatingProductIds.value);
    nextUpdating.delete(product.key);
    updatingProductIds.value = nextUpdating;
  }
}

onMounted(async () => {
  // 店铺与游戏目录都就绪后再拉列表，保证游戏名/规格、店铺筛选首屏正确
  await Promise.all([loadShops(), loadAllGames()]);
  fetchList();
});

onBeforeUnmount(() => {
  if (addPreviewTimer) clearTimeout(addPreviewTimer);
  addPreviewSequence += 1;
  productEditSequence += 1;
});

function goBack() {
  emit('back');
}
</script>

<template>
  <div class="sku-page">
    <div class="sku-header">
      <div class="sku-title-row">
        <button class="back-link" @click="goBack">返回店铺管理</button>
        <h2 class="sku-title">商品配置</h2>
        <span v-if="activeShop?.shop" class="sku-current-shop">当前店铺：{{ activeShop.shop }}</span>
      </div>
    </div>

    <!-- <div v-if="shops.length" class="shop-tabs">
      <button
        v-for="s in shops"
        :key="s.shopId || s.shop"
        type="button"
        class="shop-tab"
        :class="{ active: activeShop?.shopId === s.shopId }"
        @click="selectShop(s)"
      >
        {{ s.shop }}
      </button>
    </div>
    <div v-else class="shop-empty">
      暂无可用店铺，请先在店铺管理中确认渠道下已配置店铺。
    </div> -->

    <!-- 筛选 -->
    <div class="list-page__search">
      <SearchComponent
        :fields="searchFields"
        :initial-values="filter"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <!-- 列表 -->
    <div class="sku-list-panel">
      <input
        ref="skuImportInput"
        class="visually-hidden-file-input"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        @change="handleSkuImportFile"
      />
      <div class="sku-list-toolbar">
        <button class="btn btn-primary" :disabled="!hasActiveShop" @click="openAdd">添加商品</button>
      </div>

      <div
        class="sku-list-body"
        v-loading="loading"
        element-loading-text="加载中..."
        element-loading-background="var(--bg-card)"
      >
        <table class="sku-product-table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key">{{ column.title }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && !productGroups.length">
              <td :colspan="columns.length"><div class="sku-list-empty">暂无 SKU 商品</div></td>
            </tr>
            <tr v-for="group in productGroups" :key="group.id" class="product-main-row">
                <td>{{ group.productName || '-' }}</td>
                <td>{{ group.productId || '-' }}</td>
                <td>{{ group.skuCount }}</td>
                <td>{{ group.matchedCount }}</td>
                <td>
                  <div class="product-actions">
                    <button class="link-btn" type="button" @click="openProductEdit(group)">编辑</button>
                    <button
                      class="link-btn"
                      type="button"
                      :disabled="importingProductIds.has(group.key)"
                      @click="openSkuImport(group)"
                    >
                      {{ importingProductIds.has(group.key) ? '导入中…' : '导入' }}
                    </button>
                    <button
                      class="link-btn"
                      type="button"
                      :disabled="exportingProductIds.has(group.key)"
                      @click="exportSkuProduct(group)"
                    >
                      {{ exportingProductIds.has(group.key) ? '导出中…' : '导出' }}
                    </button>
                    <button
                      class="link-btn danger"
                      type="button"
                      :disabled="deletingProductIds.has(group.key)"
                      @click="confirmDeleteProductPrice(group)"
                    >
                      {{ deletingProductIds.has(group.key) ? '删除中…' : '删除' }}
                    </button>
                  </div>
                </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sku-list-footer">
        <PaginationSimple
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          :show-batch-actions="false"
          @current-change="pageChange"
          @page-size-change="pageSizeChange"
        />
      </div>
    </div>

    <!-- 添加商品弹窗 -->
    <AppModal v-model="addVisible" title="添加商品" width="1100px" height="min(88vh, 920px)">
      <div class="sku-modal-content add-product-modal">
        <div class="form-row">
          <label class="required">商品ID</label>
          <textarea
            v-model="addForm.productIds"
            :disabled="addSaving"
            rows="2"
            placeholder="请输入商品ID，多个商品用分号、逗号或换行分隔"
          ></textarea>
          <div class="add-preview-hint">输入后自动查询当前店铺的商品 SKU；可直接勾选客户端，点击确认新增时一并保存。</div>
        </div>

        <div class="add-preview-list">
          <div v-if="addPreviewLoading" class="add-preview-placeholder">正在查询商品及 SKU…</div>
          <div v-else-if="!parseAddProductIds().length" class="add-preview-placeholder">
            输入商品 ID 后，将在这里展示商品的 SKU 和新增状态。
          </div>
          <div v-else-if="!addPreview.length" class="add-preview-placeholder">没有可展示的商品预览。</div>
          <article v-for="preview in addPreview" :key="preview.productId" class="add-preview-product">
            <div class="add-preview-heading">
              <strong>{{ preview.productName || '商品' }}</strong>
              <span>商品 ID：{{ preview.productId }}</span>
              <span class="add-preview-diff-summary">
                新增 {{ preview.addedCount }} · 更新 {{ preview.updatedCount }} · 无变动 {{ preview.unchangedCount }}
              </span>
            </div>
            <div v-if="preview.error" class="sku-load-error">{{ preview.error }}</div>
            <div v-else-if="preview.skus.length" class="sku-detail-scroll add-preview-scroll">
              <table class="sku-detail-table add-preview-table">
                <thead>
                  <tr>
                    <th>游戏ID</th>
                    <th>SKUID</th>
                    <th>SKU名称</th>
                    <th>客户端</th>
                    <th>货架编号</th>
                    <th>游戏名称</th>
                    <th>游戏规格</th>
                    <th>匹配状态</th>
                    <th>是否新增</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="sku in preview.skus" :key="sku.skuId">
                    <td>{{ sku.gameId ?? '-' }}</td>
                    <td>{{ sku.skuId || '-' }}</td>
                    <td :title="sku.itemName || sku.skuName || ''">{{ sku.itemName || sku.skuName || '-' }}</td>
                    <td>
                      <div class="preview-client-editor">
                        <label
                          v-for="client in CLIENT_OPTIONS"
                          :key="client.value"
                          class="preview-client-option"
                        >
                          <input
                            type="checkbox"
                            :checked="normalizeClientSelection(sku.clients).includes(client.value)"
                            :disabled="addSaving"
                            @change="togglePreviewClient(sku, client.value, $event.target.checked)"
                          />
                          <span>{{ client.label }}</span>
                        </label>
                      </div>
                    </td>
                    <td>
                      <div class="shelf-number-copy-cell">
                        <span>{{ shelfNoOf(sku) || '-' }}</span>
                        <button
                          v-if="shelfNoOf(sku)"
                          type="button"
                          class="shelf-number-copy"
                          :aria-label="`复制货架编号 ${shelfNoOf(sku)}`"
                          title="复制货架编号"
                          @click.stop="copyShelfNo(shelfNoOf(sku))"
                        >
                          <svg aria-hidden="true" viewBox="0 0 16 16">
                            <rect x="5.5" y="2.5" width="8" height="10" rx="1.5" />
                            <path d="M3.5 5.5H3A1.5 1.5 0 0 0 1.5 7v6A1.5 1.5 0 0 0 3 14.5h6a1.5 1.5 0 0 0 1.5-1.5v-.5" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td :title="sku.gameName || gameNameOf(Number(sku.gameId)) || (sku.gameId != null ? `游戏 #${sku.gameId}` : '未匹配')">
                      {{ sku.gameName || gameNameOf(Number(sku.gameId)) || (sku.gameId != null ? `游戏 #${sku.gameId}` : '未匹配') }}
                    </td>
                    <td :title="sku.specName || sku.spec?.name || (sku.specId != null ? `规格 #${sku.specId}` : '')">
                      {{ sku.specName || sku.spec?.name || (sku.specId != null ? `规格 #${sku.specId}` : '-') }}
                    </td>
                    <td>{{ sku.matched === true || sku.matched === 1 || sku.matched === '1' ? '已匹配' : '未匹配' }}</td>
                    <td>
                      <span class="add-sku-status" :class="{
                        'is-new': addSkuStatus(sku) === '新增',
                        'is-updated': addSkuStatus(sku) === '更新',
                        'is-unchanged': addSkuStatus(sku) === '无变动',
                      }">
                        {{ addSkuStatus(sku) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="add-preview-empty">该商品暂无 SKU。</div>
          </article>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" :disabled="addSaving" @click="addVisible = false">取 消</button>
        <button class="btn btn-primary" data-shortcut-save title="Ctrl+Enter 保存" :disabled="addSaving || !canSubmitAdd" @click="submitAdd">
          {{ addSaving ? '正在新增…' : '确认新增' }}
        </button>
      </template>
    </AppModal>

    <AppModal v-model="suggestVisible" title="SKU 规则补齐预览" width="760px" height="min(86vh, 900px)">
      <div class="suggest-preview">
        <div class="suggest-summary">
          <span>候选 <strong>{{ suggestTotal }}</strong> 条</span>
          <span>可落库 <strong>{{ suggestApplyable }}</strong> 条</span>
          <span>可选择 <strong>{{ selectableSuggestionCount }}</strong> 条</span>
          <span>已选 <strong>{{ selectedSuggestIds.length }}</strong> 条</span>
          <button type="button" class="link-btn" @click="selectAllSuggestions">
            {{ selectedSuggestIds.length === selectableSuggestionCount && selectableSuggestionCount > 0 ? '取消全选' : '全选建议项' }}
          </button>
        </div>
        <div v-if="sortedSuggestItems.length" class="suggest-list">
          <article v-for="item in sortedSuggestItems" :key="item.id" class="suggest-item">
            <label class="suggest-check">
              <input
                type="checkbox"
                :checked="selectedSuggestIds.includes(Number(item.id))"
                :disabled="!canSelectSuggestion(item) || suggestApplying"
                :title="!canSelectSuggestion(item) ? '该建议缺少有效的游戏或规格 ID' : ''"
                @change="toggleSuggestion(item, $event.target.checked)"
              />
            </label>
            <div class="suggest-item-content">
              <div class="suggest-item-heading">
                <strong>{{ item.itemName || item.skuName || `SKU ${item.skuId || item.id}` }}</strong>
                <span class="suggest-confidence">{{ item.confidence || '—' }}</span>
                <span class="suggest-state" :class="{ ready: isSuggestionApplyable(item) }">
                  {{ isSuggestionApplyable(item) ? '可落库' : (!isSuggestionChanged(item) ? '无需变更' : '需人工处理') }}
                </span>
              </div>
              <div class="suggest-identifiers">
                商品 {{ item.productId || '—' }} · SKU {{ item.skuId || '—' }}
              </div>
              <div class="suggest-mapping">
                <div>
                  <small>当前</small>
                  <span>{{ suggestionGame(item, 'current') }} / {{ suggestionSpec(item, 'current') }}</span>
                  <span class="muted">{{ suggestionClients(item, 'current') }}</span>
                </div>
                <span class="suggest-arrow">→</span>
                <div>
                  <small>建议</small>
                  <span>{{ suggestionGame(item, 'suggested') }} / {{ suggestionSpec(item, 'suggested') }}</span>
                  <span class="muted">{{ suggestionClients(item, 'suggested') }}</span>
                </div>
              </div>
              <div class="suggest-reasons">依据：{{ suggestionReasons(item) }}</div>
            </div>
          </article>
        </div>
        <div v-else class="suggest-empty">没有返回规则补齐建议</div>
      </div>
      <template #footer>
        <button class="btn btn-plain" :disabled="suggestApplying" @click="suggestVisible = false">
          取 消
        </button>
        <button
          class="btn btn-primary"
          :disabled="suggestApplying || !selectedSuggestIds.length"
          @click="applySuggestions"
        >
          {{ suggestApplying ? '正在落库…' : `确认落库（${selectedSuggestIds.length}）` }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="productEditVisible"
      title="编辑商品 SKU"
      width="1100px"
      height="min(88vh, 920px)"
    >
      <div class="sku-modal-content product-edit-modal">
        <div class="product-edit-heading">
          <strong>{{ editingProduct?.productName || '商品' }}</strong>
          <span>商品 ID：{{ editingProduct?.productId || '-' }}</span>
          <span>共 {{ productEditAllSkus.length }} 个 SKU，当前显示 {{ productEditSkus.length }} 条</span>
          <button
            type="button"
            class="btn btn-primary product-edit-refresh"
            :disabled="productEditLoading || productEditSearchLoading || productEditSaving || updatingProductIds.has(editingProduct?.key)"
            @click="updateProduct(editingProduct)"
          >
            {{ updatingProductIds.has(editingProduct?.key) ? '更新中…' : '更新商品' }}
          </button>
          <span v-if="productEditShelfError" class="product-edit-shelf-error">
            {{ productEditShelfError }}
            <button type="button" class="link-btn" @click="openProductEdit(editingProduct)">重试</button>
          </span>
        </div>
        <form class="product-edit-search" @submit.prevent="searchProductEditSkus">
          <label>
            <span>SKU ID</span>
            <input
              v-model="productEditSearch.skuId"
              :disabled="productEditLoading || productEditSearchLoading || productEditSaving"
              placeholder="模糊搜索 SKU ID"
            />
          </label>
          <label>
            <span>SKU 名称</span>
            <input
              v-model="productEditSearch.itemName"
              :disabled="productEditLoading || productEditSearchLoading || productEditSaving"
              placeholder="模糊搜索 SKU 名称"
            />
          </label>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="productEditLoading || productEditSearchLoading || productEditSaving"
          >
            {{ productEditSearchLoading ? '搜索中…' : '搜索' }}
          </button>
          <button
            type="button"
            class="btn btn-plain"
            :disabled="productEditLoading || productEditSearchLoading || productEditSaving"
            @click="resetProductEditSearch"
          >
            重置
          </button>
          <span v-if="productEditSearchError" class="product-edit-search-error">
            {{ productEditSearchError }}
          </span>
        </form>
        <div class="sku-detail-scroll product-edit-scroll">
          <table class="sku-detail-table product-edit-table">
            <thead>
              <tr>
                <th>游戏ID</th>
                <th>SKUID</th>
                <th>SKU名称</th>
                <th>客户端</th>
                <th>货架编号</th>
                <th>游戏名称</th>
                <th>游戏规格</th>
                <th>匹配状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="productEditLoading || productEditSearchLoading">
                <td colspan="8" class="product-edit-placeholder">
                  {{ productEditSearchLoading ? '正在搜索 SKU…' : '正在加载该商品全部 SKU…' }}
                </td>
              </tr>
              <tr v-else-if="productEditError">
                <td colspan="8" class="product-edit-placeholder product-edit-error">
                  {{ productEditError }}
                  <button type="button" class="link-btn" @click="openProductEdit(editingProduct)">
                    重试
                  </button>
                </td>
              </tr>
              <tr v-else-if="!productEditSkus.length">
                <td colspan="8" class="product-edit-placeholder">
                  {{ productEditSearch.skuId || productEditSearch.itemName ? '没有符合搜索条件的 SKU' : '该商品暂无 SKU 数据' }}
                </td>
              </tr>
              <template v-else>
                <tr v-for="sku in productEditSkus" :key="sku.id || sku.skuId">
                  <td>{{ sku.gameId ?? '-' }}</td>
                  <td>{{ sku.skuId || '-' }}</td>
                  <td :title="sku.skuName || ''">{{ sku.skuName || '-' }}</td>
                  <td>
                    <div class="preview-client-editor">
                      <label
                        v-for="client in CLIENT_OPTIONS"
                        :key="client.value"
                        class="preview-client-option"
                      >
                        <input
                          type="checkbox"
                          :checked="sku.clientSelection.includes(client.value)"
                          :disabled="productEditLoading || productEditSaving"
                          @change="toggleProductSkuClient(sku, client.value, $event.target.checked)"
                        />
                        <span>{{ client.label }}</span>
                      </label>
                    </div>
                  </td>
                  <td>
                    <div class="shelf-number-copy-cell">
                      <span>{{ shelfNoOf(sku) || '-' }}</span>
                      <button
                        v-if="shelfNoOf(sku)"
                        type="button"
                        class="shelf-number-copy"
                        :aria-label="`复制货架编号 ${shelfNoOf(sku)}`"
                        title="复制货架编号"
                        @click.stop="copyShelfNo(shelfNoOf(sku))"
                      >
                        <svg aria-hidden="true" viewBox="0 0 16 16">
                          <rect x="5.5" y="2.5" width="8" height="10" rx="1.5" />
                          <path d="M3.5 5.5H3A1.5 1.5 0 0 0 1.5 7v6A1.5 1.5 0 0 0 3 14.5h6a1.5 1.5 0 0 0 1.5-1.5v-.5" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td :title="sku.gameName || '未匹配'">{{ sku.gameName || '未匹配' }}</td>
                  <td :title="sku.spec || ''">{{ sku.spec || '-' }}</td>
                  <td>{{ sku.matched ? '已匹配' : '未匹配' }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" :disabled="productEditSaving" @click="closeProductEdit">取 消</button>
        <button
          class="btn btn-primary"
          data-shortcut-save
          title="Ctrl+Enter 保存"
          :disabled="productEditLoading || productEditSearchLoading || productEditSaving || !productEditAllSkus.length"
          @click="submitProductEdit"
        >
          {{ productEditSaving ? '正在保存…' : '确定保存' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.sku-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.sku-list-panel {
  display: flex;
  min-height: 0;
  flex: 1 1 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
}

.sku-list-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}

.sku-list-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-actions .link-btn:disabled {
  color: var(--text-sub, #98a2b3);
  cursor: not-allowed;
}

.sku-list-body {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
}

.sku-product-table {
  width: 100%;
  min-width: 850px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.sku-product-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  color: var(--text-sub);
  background: var(--bg-thead);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.sku-product-table th:nth-child(1) { width: 28%; }
.sku-product-table th:nth-child(2) { width: 22%; }
.sku-product-table th:nth-child(3) { width: 10%; }
.sku-product-table th:nth-child(4) { width: 14%; }
.sku-product-table th:nth-child(5) { width: 26%; }

.sku-product-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-faint);
  color: var(--text-main);
  font-size: 13px;
  vertical-align: middle;
}

.sku-product-table tbody tr.product-main-row:hover td {
  background: var(--bg-hover);
}

.sku-list-empty {
  padding: 64px 16px;
  color: var(--text-sub);
  text-align: center;
}

.sku-list-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px;
  border-top: 1px solid var(--border-faint);
  background: var(--bg-toolbar, var(--bg-card));
}

.sku-detail-scroll {
  width: 100%;
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.sku-detail-table {
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
  table-layout: fixed;
  background: var(--bg-card);
  font-size: 12px;
}

.sku-detail-table th,
.sku-detail-table td {
  padding: 8px 10px;
  border: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sku-detail-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  color: var(--text-sub);
  background: var(--bg-thead);
  font-weight: 600;
}

.sku-detail-table th:nth-child(1) { width:132px; }
.sku-detail-table th:nth-child(2) { width: 120px; }
.sku-detail-table th:nth-child(3) { width: 260px; }
.sku-detail-table th:nth-child(4) { width: 120px; }
.sku-detail-table th:nth-child(5) { width: 120px; }
.sku-detail-table th:nth-child(6) { width: 140px; }
.sku-detail-table th:nth-child(7) { width: 140px; }
.sku-detail-table th:nth-child(8) { width: 90px; }
.sku-detail-table th:nth-child(9) { width: 100px; }

.shelf-number-copy-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
}

.shelf-number-copy-cell > span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.shelf-number-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  padding: 2px 3px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--primary, #0fae9a);
  cursor: pointer;
}

.shelf-number-copy svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.3;
}

.shelf-number-copy:hover {
  color: var(--primary-hover, #0b8d7e);
  background: var(--bg-hover);
}

.sku-detail-table td:nth-child(3),
.sku-detail-table td:nth-child(6),
.sku-detail-table td:nth-child(7) {
  white-space: normal;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.sku-load-error {
  color: #d92d20;
  font-size: 12px;
  padding: 6px;
}

.sku-refresh-status {
  margin-bottom: 6px;
  color: var(--text-sub, #667085);
  font-size: 12px;
}

.sku-refresh-status.error {
  color: #d92d20;
}

.sku-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.sku-title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.sku-title {
  margin: 0;
  font-size: 18px;
  color: #1f2433;
}

.sku-current-shop {
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--primary, #6941c6);
  background: var(--primary-soft, #f3efff);
  font-size: 12px;
}

.back-link {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 11px;
  background: var(--bg-card);
  color: #6a35ff;
  cursor: pointer;
  font-size: 12.5px;
}

.sku-subtitle {
  font-size: 12px;
  color: #8a93a6;
}

.shop-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: var(--bg-elevated, #f2f4f7);
  border: 1px solid var(--border-soft, transparent);
  border-radius: 12px;
}

.shop-empty {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-sub);
  background: var(--bg-card);
  font-size: 13px;
}

.shop-tab {
  border: none;
  background: transparent;
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-sub, #475467);
  cursor: pointer;
  transition: all 0.18s ease;
}

.shop-tab:hover {
  color: var(--primary, #8b5cf6);
}

.shop-tab.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: var(--text-invert, #fff);
  box-shadow: 0 8px 18px var(--primary-glow-strong, rgba(139, 92, 246, 0.35));
}

.muted {
  color: #98a2b3;
}

.link-btn {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  border-radius: 8px;
  font-size: 12px;
  padding: 3px 8px;
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

/* 弹窗 */
.sku-modal-content {
  display: grid;
  gap: 18px;
}

.add-product-modal {
  min-height: 0;
}

.add-preview-hint {
  color: var(--text-sub, #667085);
  font-size: 12px;
}

.add-preview-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(52vh, 520px);
  min-height: 150px;
  overflow: auto;
}

.add-preview-placeholder,
.add-preview-empty {
  padding: 18px;
  color: var(--text-sub, #667085);
  font-size: 13px;
  text-align: center;
}

.add-preview-product {
  overflow: hidden;
  border: 1px solid var(--border, #e4e7ec);
  border-radius: 10px;
  background: var(--bg-card);
}

.add-preview-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  color: var(--text-main, #1d2939);
  background: var(--bg-thead);
  font-size: 13px;
}

.add-preview-heading span {
  color: var(--text-sub, #667085);
  font-size: 12px;
}

.add-preview-heading .add-preview-diff-summary {
  margin-left: auto;
  white-space: nowrap;
}

.add-preview-scroll {
  max-height: 280px;
  border: 0;
  border-radius: 0;
}

.add-preview-table {
  min-width: 1240px;
}

.product-edit-modal {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
}

.product-edit-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--text-main, #1d2939);
  font-size: 13px;
}

.product-edit-heading span {
  color: var(--text-sub, #667085);
  font-size: 12px;
}

.product-edit-refresh {
  margin-left: auto;
}

.product-edit-heading .product-edit-shelf-error {
  color: var(--warning, #b54708);
}

.product-edit-shelf-error .link-btn {
  margin-left: 6px;
}

.product-edit-search {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.product-edit-search label {
  display: grid;
  flex: 1 1 220px;
  gap: 5px;
  color: var(--text-sub, #667085);
  font-size: 12px;
}

.product-edit-search input {
  width: 100%;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--border, #d0d5dd);
  border-radius: 7px;
  color: var(--text-main, #1d2939);
  background: var(--bg-card, #fff);
  font-size: 13px;
}

.product-edit-search input:focus {
  outline: none;
  border-color: var(--primary, #0fae9a);
}

.product-edit-search-error {
  flex: 1 0 100%;
  color: var(--danger, #d92d20);
  font-size: 12px;
}

.product-edit-scroll {
  flex: 1;
  min-height: 180px;
  max-height: min(62vh, 640px);
}

.product-edit-table {
  min-width: 1140px;
}

.product-edit-table th:nth-child(8) {
  width: 90px;
}

.product-edit-placeholder {
  padding: 32px !important;
  color: var(--text-sub, #667085);
  text-align: center !important;
}

.product-edit-error {
  color: var(--danger, #d92d20);
}

.product-edit-error .link-btn {
  margin-left: 8px;
}

.add-preview-table th:nth-child(4) {
  width: 120px;
}

.add-preview-table th:nth-child(9) {
  width: 120px;
}

.add-sku-status {
  color: var(--text-sub, #667085);
}

.add-sku-status.is-new {
  color: #039855;
  font-weight: 600;
}

.add-sku-status.is-updated {
  color: #b54708;
  font-weight: 600;
}

.add-sku-status.is-unchanged {
  color: var(--text-sub, #667085);
}

.preview-client-editor {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.preview-client-option {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-main, #1d2939);
  font-size: 11px;
  cursor: pointer;
}

.preview-client-option input {
  margin: 0;
  accent-color: var(--primary, #6941c6);
}

.form-row {
  display: grid;
  gap: 8px;
}

.form-row label {
  /* color: #5b6478; */
  font-size: 12px;
  font-weight: 600;
}

.form-row label.required::before {
  content: '*';
  color: #f04438;
  margin-right: 4px;
}

.form-row input,
.form-row select,
.form-row textarea {
  width: 100%;
  border: 1px solid #e3e7f0;
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 13px;
  color: #1f2937;
  box-sizing: border-box;
  background: #fbfcfe;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  font-family: inherit;
}

.form-row textarea {
  resize: vertical;
  min-height: 90px;
}

.form-row input:focus,
.form-row select:focus,
.form-row textarea:focus {
  border-color: #8b5cf6;
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-border);
}

.suggest-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  height: 100%;
}

.suggest-summary {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid var(--border-soft, #e4e7ec);
  border-radius: 10px;
  background: var(--bg-elevated, #f8fafc);
  color: var(--text-sub, #475467);
  font-size: 13px;
}

.suggest-summary strong {
  color: var(--text-main, #1d2939);
}

.suggest-summary .link-btn {
  margin-left: auto;
}

.suggest-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.suggest-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-soft, #e4e7ec);
  border-radius: 10px;
  background: var(--bg-card);
}

.suggest-check {
  flex: none;
  padding-top: 3px;
}

.suggest-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--text-main, #1d2939);
  font-size: 13px;
}

.suggest-item-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.suggest-item-heading strong {
  overflow-wrap: anywhere;
}

.suggest-confidence,
.suggest-state {
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--bg-elevated, #f2f4f7);
  color: var(--text-sub, #475467);
  font-size: 11px;
}

.suggest-state.ready {
  background: rgba(18, 183, 106, 0.12);
  color: #039855;
}

.suggest-identifiers,
.suggest-reasons {
  color: var(--text-sub, #667085);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.suggest-mapping {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--bg-elevated, #f8fafc);
}

.suggest-mapping > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-wrap: anywhere;
}

.suggest-mapping small {
  color: var(--text-sub, #667085);
}

.suggest-arrow {
  color: var(--primary, #8b5cf6);
  font-weight: 700;
}

.suggest-empty {
  display: grid;
  place-items: center;
  flex: 1;
  min-height: 180px;
  color: var(--text-sub, #667085);
}

@media (max-width: 640px) {
  .suggest-summary {
    gap: 10px;
  }

  .suggest-summary .link-btn {
    margin-left: 0;
  }

  .suggest-mapping {
    grid-template-columns: minmax(0, 1fr);
  }

  .suggest-arrow {
    transform: rotate(90deg);
    justify-self: center;
  }
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 10px 22px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
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
}
</style>

<style>
.modal-overlay:has(.sku-modal-content) {
  background: rgba(17, 12, 46, 0.55);
  backdrop-filter: blur(6px);
}

.modal-box:has(.sku-modal-content) {
  border-radius: 22px;
  border: 1px solid var(--primary-border);
}

.modal-box:has(.sku-modal-content) .modal-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  border-bottom: none;
}

.modal-box:has(.sku-modal-content) .modal-header strong {
  color: var(--text-invert);
  font-size: 18px;
}

.modal-box:has(.sku-modal-content) .modal-body {
  padding: 24px;
  background: var(--bg-card);
}

.modal-box:has(.sku-modal-content) .modal-footer {
  padding: 16px 24px 20px;
  /* background: linear-gradient(180deg, rgba(248, 250, 255, 0.7), rgba(243, 240, 255, 0.95)); */
  border-top: 1px solid var(--primary-faint);
}
.btn-link {
  color: var(--text-invert);
}
</style>
