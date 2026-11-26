// GameListView 组件，用于管理游戏列表及其 SKU 映射
<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import DataTable from '../../../components/DataTable.vue';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { useConfirm } from '../../../composables/useConfirm';
import { useToast } from '../../../composables/useToast';
import { useListMemory } from '../../../composables/useListMemory';
import { gameApi } from '../../../api/modules/game';
import { fileApi } from '../../../api/modules/file';
import defaultGameLogo from '../../../assets/images/default-game-logo.svg';
import { showErrorDialog } from '../../../utils/showErrorDialog';

const { confirm } = useConfirm();
const { show } = useToast();

// ============ 筛选 ============
const filter = reactive({
  shelfNo: '',
  gameId: '',
  gameName: '',
  createTime: [],
});

const searchFields = [
  { prop: 'shelfNo', label: '货架编号', type: 'input', placeholder: '请输入货架编号', span: 4 },
  { prop: 'gameId', label: '游戏ID', type: 'input', placeholder: '请输入游戏ID', span: 5 },
  { prop: 'gameName', label: '游戏名称', type: 'input', placeholder: '请输入游戏名称', span: 5 },
  {
    prop: 'createTime',
    label: '创建时间',
    type: 'daterange',
    startPlaceholder: '开始时间',
    endPlaceholder: '结束时间',
    shortcuts: [
      { text: '今天', value: () => { const d = new Date(); return [d, d]; } },
      { text: '最近7天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); return [start, end]; } },
      { text: '最近30天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 29); return [start, end]; } },
    ],
    span: 6,
  },
];

// ============ 列表 ============
const rows = ref([]);
const total = ref(0);
const gameLogoPreviewUrls = computed(() => rows.value.map(gameLogoOf));
const customOrderSavingIds = ref(new Set());
const gameImportInput = ref(null);
const gameImportTarget = ref(null);
const importingGameIds = ref(new Set());
const { page, pageSize, onPageSizeChange, onPageChange, restoreFilter, rememberFilter } = useListMemory({
  filterKeys: ['shelfNo', 'gameId', 'gameName', 'createTime'],
});
restoreFilter(filter);
const loading = ref(false);

const columns = [
  { key: 'id', title: '游戏ID' },
  { key: 'name', title: '游戏名称' },
  { key: 'logo', title: '游戏logo' },
  { key: 'settleDays', title: '账期天数' },
  { key: 'createdAt', title: '创建时间' },
  { key: 'customOrder', title: '用户自定义下单开关' },
  { key: 'op', title: '操作' },
];

function isCustomOrderEnabled(row) {
  const value = row.customOrderEnabled ?? row.allowCustomOrder ?? 1;
  return value === true || value === 1 || value === '1';
}

async function toggleCustomOrder(row) {
  if (customOrderSavingIds.value.has(row.id)) return;
  const previousValue = isCustomOrderEnabled(row);
  const nextValue = !previousValue;
  customOrderSavingIds.value.add(row.id);
  row.customOrderEnabled = nextValue ? 1 : 0;

  try {
    const currentSpecs = Array.isArray(row.specs) && row.specs.length
      ? row.specs
      : await gameApi.specs(row.id);
    const specs = currentSpecs.map((spec) => (typeof spec === 'string' ? spec : spec.name)).filter(Boolean);
    await gameApi.update(row.id, {
      name: row.name,
      settleDays: row.settleDays,
      specs,
      logoUrl: row.logoUrl || row.logo || row.gameLogo || '',
      customOrderEnabled: nextValue ? 1 : 0,
    });
    row.allowCustomOrder = nextValue ? 1 : 0;
    show(`已${nextValue ? '开启' : '关闭'}「${row.name}」的用户自定义下单`, 'success');
  } catch (error) {
    row.customOrderEnabled = previousValue ? 1 : 0;
    row.allowCustomOrder = previousValue ? 1 : 0;
    show(error?.message || '开关保存失败，请重试', 'error');
  } finally {
    customOrderSavingIds.value.delete(row.id);
  }
}

/** 日期（Date 或字符串）→ 'yyyy-MM-ddTHH:mm:ss'，供 createdFrom/createdTo 使用（后端只接受 yyyy-MM-dd 或 yyyy-MM-ddTHH:mm:ss） */
function toDateTimeStr(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value).replace(/-/g, '/'));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function fetchList() {
  loading.value = true;
  try {
    // 服务端分页/筛选：specNo、id 完全匹配、name 模糊、createdFrom/createdTo 区间
    const range = Array.isArray(filter.createTime) && filter.createTime.length === 2 ? filter.createTime : [];
    const res = await gameApi.list({
      page: page.value,
      pageSize: pageSize.value,
      specNo: filter.shelfNo,
      id: filter.gameId,
      name: filter.gameName,
      createdFrom: toDateTimeStr(range[0]),
      createdTo: toDateTimeStr(range[1]),
    });
    rows.value = (res && res.list) || [];
    total.value = (res && res.total) || 0;
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
  filter.shelfNo = '';
  filter.gameId = '';
  filter.gameName = '';
  filter.createTime = [];
  rememberFilter(filter, true);
  fetchList();
}

function pageChange(p) {
  onPageChange(p);
  fetchList();
}

function openGameImport(row) {
  gameImportTarget.value = row;
  if (gameImportInput.value) gameImportInput.value.value = '';
  gameImportInput.value?.click();
}

function importFailureMessage(result, fallback) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const messages = errors.map((item) => String(item?.message || '').trim()).filter(Boolean);
  if (messages.length) return messages.join('\n');
  const message = String(result?.message || '').trim();
  return message && message.toLowerCase() !== 'ok' ? message : fallback;
}

async function showGameSpecImportResult(result) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const summary = `导入完成：新增 ${Number(result?.created) || 0} 个规格，跳过 ${Number(result?.skipped) || 0} 个规格，跳过其他游戏 ${Number(result?.skippedGames) || 0} 组，失败 ${Number(result?.failed) || 0} 条`;
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

async function handleGameImportFile(event) {
  const file = event.target.files?.[0];
  const row = gameImportTarget.value;
  gameImportTarget.value = null;
  if (!file || !row) return;
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    await showErrorDialog('请选择 .xlsx 格式的 Excel 文件', '导入失败');
    event.target.value = '';
    return;
  }

  importingGameIds.value.add(row.id);
  try {
    const result = await gameApi.importSpecs(row.id, file);
    if (!result?.ok) {
      await showErrorDialog(importFailureMessage(result, '游戏规格导入失败'), '游戏规格导入失败');
      return;
    }
    await showGameSpecImportResult(result);
    await fetchList();
  } catch (error) {
    if (!error?.requestNotified) {
      await showErrorDialog(error?.message || '游戏规格导入失败，请重试', '游戏规格导入失败');
    }
  } finally {
    importingGameIds.value.delete(row.id);
    event.target.value = '';
  }
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

function gameLogoOf(row) {
  if (row?.logoLoadError) return defaultGameLogo;
  return row?.logo || row?.logoUrl || row?.gameLogo || defaultGameLogo;
}

function gameLogoPreviewIndex(row) {
  return rows.value.findIndex((item) => item.id === row.id);
}

function handleGameLogoError(row, event) {
  row.logoLoadError = true;
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied) return;
  image.dataset.fallbackApplied = 'true';
  image.src = defaultGameLogo;
}

// ============ 新增 / 编辑 ============
const editVisible = ref(false);
const editingId = ref(null); // null = 新增
const editForm = reactive({
  name: '',
  settleDays: '',
  specs: [''],
  logo: '', // 游戏logo（必填，图片 url）【字段名待后端确认】
  customOrderEnabled: true, // 用户自定义下单开关【字段名待后端确认】
});
const editSaving = ref(false);
const editSpecRows = ref([]);
const originalEditSpecRows = ref([]);
const editSpecPage = ref(1);
const editSpecPageSize = ref(20);
const editSpecTotal = ref(0);
const editSpecAllTotal = ref(0);
const editSpecKeywordInput = ref('');
const editSpecKeyword = ref('');
const editSpecLoading = ref(false);
const editSpecLoadError = ref('');
let editSpecRequestSequence = 0;
let nextEditSpecKey = 0;
const editSpecsDirty = computed(() => {
  if (editSpecRows.value.length !== originalEditSpecRows.value.length) return true;
  return originalEditSpecRows.value.some((original) => {
    const current = editSpecRows.value.find((row) => row.id === original.id);
    return !current || current.name !== original.name;
  }) || editSpecRows.value.some((row) => row.id == null);
});
const logoUploading = ref(false);

function resetEditForm() {
  editForm.name = '';
  editForm.settleDays = '';
  editForm.specs = [''];
  editForm.logo = '';
  editForm.customOrderEnabled = true;
}

function openCreate() {
  editingId.value = null;
  editSpecRequestSequence += 1;
  resetEditForm();
  editSpecRows.value = [];
  originalEditSpecRows.value = [];
  editSpecPage.value = 1;
  editSpecPageSize.value = 20;
  editSpecTotal.value = 0;
  editSpecAllTotal.value = 0;
  editSpecKeywordInput.value = '';
  editSpecKeyword.value = '';
  editSpecLoadError.value = '';
  editVisible.value = true;
}

function getSpecSortParts(spec) {
  const name = String(spec?.name ?? spec ?? '').trim();
  const match = name.match(/^(.*?)(\d+(?:\.\d+)?)\s*([^\d]*)$/);
  return {
    name,
    group: (match ? match[1] : name).trim().replace(/[ \t/_-]+$/, ''),
    quantity: match ? Number(match[2]) : null,
    unit: match ? match[3].trim() : '',
  };
}

function sortGameSpecs(specs) {
  return [...specs].sort((left, right) => {
    const a = getSpecSortParts(left);
    const b = getSpecSortParts(right);
    const groupOrder = a.group.localeCompare(b.group, 'zh-CN', { numeric: true, sensitivity: 'base' });
    if (groupOrder) return groupOrder;
    if (a.quantity == null && b.quantity != null) return -1;
    if (a.quantity != null && b.quantity == null) return 1;
    if (a.quantity != null && b.quantity != null && a.quantity !== b.quantity) {
      return a.quantity - b.quantity;
    }
    const unitOrder = a.unit.localeCompare(b.unit, 'zh-CN', { numeric: true, sensitivity: 'base' });
    return unitOrder || a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' });
  });
}

async function fetchEditSpecs() {
  if (!editingId.value) return;
  const sequence = ++editSpecRequestSequence;
  editSpecLoading.value = true;
  editSpecLoadError.value = '';
  try {
    const result = await gameApi.listSpecs(editingId.value, {
      keyword: editSpecKeyword.value,
      page: editSpecPage.value,
      pageSize: editSpecPageSize.value,
    });
    if (sequence !== editSpecRequestSequence) return;
    const specs = sortGameSpecs(result.list || []).map((spec) => {
      const id = spec?.id == null ? null : Number(spec.id);
      return {
        id,
        key: id == null ? `new-${++nextEditSpecKey}` : `spec-${id}`,
        name: String(spec?.name ?? spec ?? ''),
        specNo: spec?.specNo == null ? '' : String(spec.specNo),
      };
    });
    editSpecRows.value = specs;
    originalEditSpecRows.value = specs.map((spec) => ({ ...spec }));
    editSpecTotal.value = result.total;
    if (!editSpecKeyword.value) editSpecAllTotal.value = result.total;
  } catch (error) {
    if (sequence !== editSpecRequestSequence) return;
    editSpecRows.value = [];
    originalEditSpecRows.value = [];
    editSpecLoadError.value = error?.message || '规格加载失败，请重试';
  } finally {
    if (sequence === editSpecRequestSequence) editSpecLoading.value = false;
  }
}

async function openEdit(row) {
  editingId.value = row.id;
  editForm.name = row.name || '';
  editForm.settleDays = row.settleDays ?? '';
  editForm.specs = [''];
  // Keep the legacy logo aliases for rows returned by older game-list responses.
  editForm.logo = row.logo || row.logoUrl || row.gameLogo || '';
  editForm.customOrderEnabled = row.customOrderEnabled ?? row.allowCustomOrder ?? true;
  editSpecRows.value = [];
  originalEditSpecRows.value = [];
  editSpecPage.value = 1;
  editSpecPageSize.value = 20;
  editSpecTotal.value = 0;
  editSpecAllTotal.value = 0;
  editSpecKeywordInput.value = '';
  editSpecKeyword.value = '';
  editSpecLoadError.value = '';
  editVisible.value = true;
  await fetchEditSpecs();
}

function searchEditSpecs() {
  if (editSpecsDirty.value) {
    show('请先保存当前页的规格修改，再搜索或切换分页', 'warning');
    return;
  }
  editSpecKeyword.value = editSpecKeywordInput.value.trim();
  editSpecPage.value = 1;
  fetchEditSpecs();
}

function changeEditSpecPage(page) {
  if (editSpecsDirty.value) {
    show('请先保存当前页的规格修改，再搜索或切换分页', 'warning');
    return;
  }
  editSpecPage.value = page;
  fetchEditSpecs();
}

function changeEditSpecPageSize(size) {
  if (editSpecsDirty.value) {
    show('请先保存当前页的规格修改，再搜索或切换分页', 'warning');
    return;
  }
  editSpecPageSize.value = size;
  editSpecPage.value = 1;
  fetchEditSpecs();
}

function addSpec() {
  if (editingId.value) {
    editSpecRows.value.push({ id: null, key: `new-${++nextEditSpecKey}`, name: '' });
  } else {
    editForm.specs.push('');
  }
}

function removeSpec(idx) {
  if (editingId.value) {
    const row = editSpecRows.value[idx];
    if (!row) return;
    const removedIds = new Set(
      originalEditSpecRows.value
        .filter((original) => !editSpecRows.value.some((current) => current.id === original.id))
        .map((original) => original.id)
    );
    const addedCount = editSpecRows.value.filter((current) => current.id == null && current.name.trim()).length;
    const projectedCount = editSpecAllTotal.value - removedIds.size + addedCount;
    const rowCount = row.id != null || row.name.trim() ? 1 : 0;
    if (rowCount > 0 && projectedCount - rowCount < 1) {
      show('至少保留一个游戏规格', 'warning');
      return;
    }
    editSpecRows.value.splice(idx, 1);
    return;
  }
  if (editForm.specs.length <= 1) {
    show('至少保留一个游戏规格', 'warning');
    return;
  }
  editForm.specs.splice(idx, 1);
}

/* ===== 游戏logo 上传（单图，必填） ===== */
function openLogoPicker() {
  document.getElementById('game-logo-input')?.click();
}

async function handleLogoFile(event) {
  const picked = Array.from(event.target.files || []);
  event.target.value = '';
  if (!picked.length) return;
  const file = picked[0];
  if (!/^image\//.test(file.type) && !/\.(png|jpe?g|gif|webp|bmp|ico|svg)$/i.test(file.name)) {
    show('请上传图片格式的logo', 'warning');
    return;
  }
  logoUploading.value = true;
  try {
    const res = await fileApi.upload(file);
    editForm.logo = res.url;
    show('logo已上传', 'success');
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    logoUploading.value = false;
  }
}

function removeLogo() {
  editForm.logo = '';
}

async function submitEdit() {
  if (editSaving.value || editSpecLoading.value) return;
  const isEditing = Boolean(editingId.value);
  if (!editForm.name.trim()) {
    show('请输入游戏名称', 'warning');
    return;
  }
  if (editForm.name.trim().length > 15) {
    show('游戏名称最多15字', 'warning');
    return;
  }
  const specs = isEditing ? [] : editForm.specs.map((s) => s.trim()).filter(Boolean);
  if (!isEditing) {
    if (!specs.length) {
      show('请至少填写一个游戏规格', 'warning');
      return;
    }
    const dupSpec = specs.find((s, i) => specs.indexOf(s) !== i);
    if (dupSpec) {
      show(`游戏规格「${dupSpec}」重复`, 'warning');
      return;
    }
    if (specs.some((s) => s.length > 50)) {
      show('单个游戏规格不能超过50个字', 'warning');
      return;
    }
  } else {
    const blankExisting = editSpecRows.value.find((row) => row.id != null && !row.name.trim());
    if (blankExisting) {
      show('已有规格名称不能为空，请使用删除按钮移除该规格', 'warning');
      return;
    }
    const currentNames = editSpecRows.value.map((row) => row.name.trim()).filter(Boolean);
    const dupSpec = currentNames.find((name, index) => currentNames.indexOf(name) !== index);
    if (dupSpec) {
      show(`游戏规格「${dupSpec}」重复`, 'warning');
      return;
    }
    if (currentNames.some((name) => name.length > 50)) {
      show('单个游戏规格不能超过50个字', 'warning');
      return;
    }
    const removedCount = originalEditSpecRows.value
      .filter((original) => !editSpecRows.value.some((current) => current.id === original.id)).length;
    const addedCount = editSpecRows.value.filter((row) => row.id == null && row.name.trim()).length;
    if (editSpecAllTotal.value - removedCount + addedCount < 1) {
      show('请至少保留一个游戏规格', 'warning');
      return;
    }
  }
  // 账期天数：必填正整数（与后端口径一致：不传/0/负数/小数/非数字均返回「请填写账期天数」）
  const settleDays = Number(editForm.settleDays);
  if (!editForm.settleDays || !Number.isInteger(settleDays) || settleDays <= 0) {
    show('请填写账期天数', 'warning');
    return;
  }
  // 游戏logo：必填（原型批注1：加游戏logo字段，必填）
  if (!editForm.logo) {
    show('请上传游戏logo', 'warning');
    return;
  }

  const payload = {
    name: editForm.name.trim(),
    settleDays,
    ...(!isEditing ? { specs } : {}),
    logoUrl: editForm.logo,
    customOrderEnabled: editForm.customOrderEnabled ? 1 : 0,
  };

  editSaving.value = true;
  try {
    if (editingId.value) {
      await gameApi.update(editingId.value, payload);
      for (const original of originalEditSpecRows.value) {
        if (!editSpecRows.value.some((row) => row.id === original.id)) {
          await gameApi.removeSpec(editingId.value, original.id);
        }
      }
      for (const original of originalEditSpecRows.value) {
        const current = editSpecRows.value.find((row) => row.id === original.id);
        if (current && current.name.trim() !== original.name) {
          await gameApi.updateSpec(editingId.value, original.id, current.name.trim());
        }
      }
      for (const row of editSpecRows.value) {
        if (row.id == null && row.name.trim()) {
          await gameApi.createSpec(editingId.value, row.name.trim());
        }
      }
      show('编辑成功', 'success');
    } else {
      await gameApi.create(payload);
      show('新增成功', 'success');
    }
    editVisible.value = false;
    fetchList();
  } catch (e) {
    show(e?.message || '保存失败', 'error');
    if (isEditing) await fetchEditSpecs();
  } finally {
    editSaving.value = false;
  }
}

// ============ 删除 ============
async function handleDelete(row) {
  const ok = await confirm({
    title: '删除确认',
    message: `确认删除游戏「${row.name}」吗？此操作为软删除，历史订单数据仍可关联查询。`,
    okText: '确认删除',
  });
  if (!ok) return;
  await gameApi.remove(row.id);
  show('删除成功', 'success');
  fetchList();
}

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div class="game-list-view">
    <input
      ref="gameImportInput"
      class="visually-hidden-file-input"
      type="file"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      hidden
      @change="handleGameImportFile"
    />
    <!-- 游戏列表视图 -->
    <div class="list-page">
      <div class="list-page__search">
        <SearchComponent
          :fields="searchFields"
          :initial-values="filter"
          :row-columns="4"
          @search="handleSearch"
          @reset="handleReset"
        />
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
          <div class="toolbar-row">
            <button class="btn btn-primary" @click="openCreate">新增</button>
          </div>
        </template>

        <template #cell-settleDays="{ row }">
          {{ row.settleDays != null ? `${row.settleDays}天` : '-' }}
        </template>

        <template #cell-logo="{ row }">
          <el-image
            class="game-logo-thumb"
            :src="gameLogoOf(row)"
            :alt="`${row.name || '游戏'}logo`"
            fit="cover"
            :preview-src-list="gameLogoPreviewUrls"
            :initial-index="gameLogoPreviewIndex(row)"
            preview-teleported
            @error="handleGameLogoError(row, $event)"
          />
        </template>

        <template #cell-customOrder="{ row }">
          <button
            type="button"
            role="switch"
            :aria-checked="isCustomOrderEnabled(row)"
            :aria-label="`${row.name}用户自定义下单`"
            :disabled="customOrderSavingIds.has(row.id)"
            class="custom-order-switch"
            :class="{
              on: isCustomOrderEnabled(row),
              saving: customOrderSavingIds.has(row.id),
            }"
            @click="toggleCustomOrder(row)"
          >
            <span class="dot" />
          </button>
        </template>

        <template #cell-op="{ row }">
          <div class="action-group">
            <button class="link-btn" @click="openEdit(row)">编辑</button>
            <button class="link-btn danger" @click="handleDelete(row)">删除</button>
            <button class="link-btn" type="button" :disabled="importingGameIds.has(row.id)" @click="openGameImport(row)">
              {{ importingGameIds.has(row.id) ? '导入中…' : '导入' }}
            </button>
          </div>
        </template>
      </DataTable>

      <!-- 新增 / 编辑 弹窗 -->
      <AppModal v-model="editVisible" :title="editingId ? '编辑游戏' : '新增游戏'" width="720px">
        <div class="game-modal-content">
          <div class="form-grid">
            <div class="form-row">
              <label class="required">游戏名称</label>
              <input v-model="editForm.name" maxlength="15" placeholder="上限15个字" />
            </div>
            <div class="form-row">
              <label class="required">账期天数</label>
              <div class="bill-period-wrap">
                <input
                  v-model.number="editForm.settleDays"
                  type="number"
                  min="1"
                  placeholder="请输入天数"
                />
                <span class="unit">天</span>
              </div>
            </div>
            <div class="form-row form-row--logo">
              <label class="required">游戏logo</label>
              <div class="logo-uploader">
                <input id="game-logo-input" type="file" accept="image/*" hidden @change="handleLogoFile" />
                <div v-if="editForm.logo" class="logo-preview">
                  <el-image
                    class="logo-preview-image"
                    :src="editForm.logo"
                    alt="游戏logo"
                    fit="cover"
                    :preview-src-list="[editForm.logo]"
                    preview-teleported
                  />
                  <button type="button" class="logo-remove" title="移除logo" aria-label="移除logo" @click="removeLogo">×</button>
                </div>
                <button v-else type="button" class="logo-pick" :disabled="logoUploading" @click="openLogoPicker">
                  {{ logoUploading ? '上传中…' : '点击上传logo' }}
                </button>
              </div>
            </div>
            <div class="custom-order-setting" :class="{ enabled: editForm.customOrderEnabled }">
              <div class="custom-order-copy">
                <span class="custom-order-title">用户自定义下单</span>
              </div>
              <button
                type="button"
                class="custom-order-switch lg"
                :class="{ on: editForm.customOrderEnabled }"
                :aria-pressed="editForm.customOrderEnabled"
                aria-label="切换用户自定义下单"
                @click="editForm.customOrderEnabled = !editForm.customOrderEnabled"
              >
                <span class="dot" />
              </button>
            </div>
          </div>

          <div v-if="!editingId" class="spec-section">
            <div class="spec-section-heading">
              <label class="required">游戏规格</label>
              <span>至少添加一项，可按需增删</span>
            </div>
            <div class="spec-list">
              <div v-for="(spec, idx) in editForm.specs" :key="idx" class="spec-row">
                <span class="spec-index">{{ String(idx + 1).padStart(2, '0') }}</span>
                <input v-model="editForm.specs[idx]" maxlength="50" placeholder="请输入游戏规格，上限50字" />
                <button
                  v-if="editForm.specs.length > 1"
                  type="button"
                  class="icon-btn"
                  @click="removeSpec(idx)"
                  title="删除该规格"
                  aria-label="删除该规格"
                >
                  −
                </button>
                <button
                  v-if="idx === editForm.specs.length - 1"
                  type="button"
                  class="icon-btn"
                  @click="addSpec"
                  title="新增规格"
                  aria-label="新增规格"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div v-else class="spec-section spec-section--paged">
            <div class="spec-section-heading">
              <label class="required">游戏规格</label>
              <span>共 {{ editSpecTotal }} 条；修改后请先保存再搜索或切页</span>
            </div>
            <div class="edit-spec-search">
              <el-input
                v-model="editSpecKeywordInput"
                clearable
                placeholder="按规格名称或货架编号搜索"
                :disabled="editSpecLoading || editSaving"
                @keyup.enter="searchEditSpecs"
              />
              <button
                class="btn btn-plain"
                type="button"
                :disabled="editSpecLoading || editSaving"
                @click="searchEditSpecs"
              >
                搜索
              </button>
            </div>
            <div v-if="editSpecLoading" class="edit-spec-state">规格加载中…</div>
            <div v-else-if="editSpecLoadError" class="edit-spec-state error">
              {{ editSpecLoadError }}
              <button class="link-btn" type="button" @click="fetchEditSpecs">重试</button>
            </div>
            <template v-else>
              <div v-if="!editSpecRows.length" class="edit-spec-state">
                {{ editSpecKeyword ? '没有匹配的规格' : '暂无规格，请添加' }}
                <button
                  type="button"
                  class="icon-btn"
                  data-modal-dirty
                  :disabled="editSaving"
                  @click="addSpec"
                  title="新增规格"
                  aria-label="新增规格"
                >
                  +
                </button>
              </div>
              <div v-else class="spec-list spec-list--paged">
                <div class="spec-list-heading">
                  <span>货架编号</span>
                  <span>规格名称</span>
                </div>
                <div v-for="(spec, idx) in editSpecRows" :key="spec.key" class="spec-row">
                  <div class="spec-shelf-number">
                    <span>{{ spec.specNo }}</span>
                    <button
                      v-if="spec.specNo"
                      type="button"
                      class="shelf-number-copy"
                      :aria-label="`复制货架编号 ${spec.specNo}`"
                      title="复制货架编号"
                      @click.stop="copyShelfNo(spec.specNo)"
                    >
                      <svg aria-hidden="true" viewBox="0 0 16 16">
                        <rect x="5.5" y="2.5" width="8" height="10" rx="1.5" />
                        <path d="M3.5 5.5H3A1.5 1.5 0 0 0 1.5 7v6A1.5 1.5 0 0 0 3 14.5h6a1.5 1.5 0 0 0 1.5-1.5v-.5" />
                      </svg>
                    </button>
                  </div>
                  <input
                    v-model="spec.name"
                    maxlength="50"
                    placeholder="请输入游戏规格，上限50字"
                    :disabled="editSaving"
                  />
                  <button
                    type="button"
                    class="icon-btn"
                    data-modal-dirty
                    :disabled="editSaving"
                    @click="removeSpec(idx)"
                    title="删除该规格"
                    aria-label="删除该规格"
                  >
                    −
                  </button>
                  <button
                    v-if="idx === editSpecRows.length - 1"
                    type="button"
                    class="icon-btn"
                    :disabled="editSaving"
                    @click="addSpec"
                    title="新增规格"
                    aria-label="新增规格"
                  >
                    +
                  </button>
                </div>
              </div>
              <PaginationSimple
                v-if="editSpecTotal > 0"
                :current-page="editSpecPage"
                :page-size="editSpecPageSize"
                :page-sizes="[10, 20, 50]"
                :total="editSpecTotal"
                :show-batch-actions="false"
                @current-change="changeEditSpecPage"
                @page-size-change="changeEditSpecPageSize"
              />
            </template>
          </div>
        </div>
        <template #footer>
          <button class="btn btn-plain" :disabled="editSaving" @click="editVisible = false">取消</button>
          <button class="btn btn-primary" data-shortcut-save title="Ctrl+Enter 保存" :disabled="editSaving || editSpecLoading || logoUploading" @click="submitEdit">
            {{ editSaving ? '保存中…' : '确 定' }}
          </button>
        </template>
      </AppModal>

    </div>
  </div>
</template>

<style scoped>
.game-list-view {
  height: 100%;
}

.list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
  align-items: center;
}

.action-group {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px 12px;
  min-width: max-content;
}

.link-btn {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
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

/* 弹窗 */
.game-modal-content {
  display: grid;
  gap: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
  padding: 20px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--bg-card);
}

.form-row {
  display: grid;
  align-content: start;
  gap: 9px;
}

.form-row label,
.spec-section > label {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.form-row label.required::before,
.spec-section > label.required::before {
  content: '*';
  color: #f04438;
  margin-right: 4px;
}

.form-row input,
.form-row select,
.spec-row input {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 10px 13px;
  font-size: 13px;
  color: var(--text-main);
  box-sizing: border-box;
  background: var(--bg-card);
  font-family: inherit;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.form-row input:focus,
.form-row select:focus,
.spec-row input:focus {
  border-color: #8b5cf6;
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.bill-period-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bill-period-wrap .unit {
  color: var(--text-sub);
  font-size: 13px;
}

.spec-section {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  background: var(--bg-card);
}

.spec-section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.spec-section-heading > span {
  color: var(--text-sub);
  font-size: 12px;
}

.spec-list {
  display: grid;
  gap: 9px;
}

.edit-spec-search {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-spec-search :deep(.el-input) {
  flex: 1;
  min-width: 0;
}

.edit-spec-search .btn {
  min-width: 88px;
  white-space: nowrap;
}

.edit-spec-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 56px;
  color: var(--text-sub);
  font-size: 13px;
}

.edit-spec-state.error {
  color: #d92d20;
}

.spec-list--paged {
  max-height: 34vh;
  overflow-y: auto;
  padding-right: 4px;
}

.spec-list-heading {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-soft);
  background: var(--bg-card);
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 600;
}

.spec-list-heading > :first-child {
  width: 76px;
  flex: 0 0 76px;
  text-align: center;
}

.spec-list-heading > :nth-child(2) {
  flex: 1;
  min-width: 0;
  padding-left: 13px;
}

.spec-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.spec-index {
  width: 76px;
  flex: 0 0 76px;
  color: var(--text-sub);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}

.spec-shelf-number {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 76px;
  flex: 0 0 76px;
  color: var(--text-sub);
  font-size: 11px;
  white-space: nowrap;
}

.shelf-number-copy {
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
  color: var(--primary-hover);
  background: var(--bg-hover);
}

.spec-row input {
  flex: 1;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--border-soft);
  background: var(--bg-toolbar);
  color: var(--text-sub);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.18s ease;
}

.icon-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--bg-card);
}

.icon-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

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
  background: var(--border-soft);
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

/* 游戏logo 缩略图（列表） */
.game-logo-thumb {
  width: 40px;
  height: 40px;
  border-radius: 9px;
  background: var(--bg-toolbar);
}

/* 用户自定义下单开关（列表展示，编辑在弹窗内操作） */
.custom-order-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #d0d5dd;
  transition: background 0.18s ease;
  vertical-align: middle;
  cursor: pointer;
}

.custom-order-switch:focus-visible {
  outline: 3px solid var(--primary-ring);
  outline-offset: 2px;
}

.custom-order-switch:disabled {
  cursor: wait;
}

.custom-order-switch .dot {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: left 0.18s ease;
}

.custom-order-switch.on {
  background: var(--primary);
}

.custom-order-switch.on .dot {
  left: 21px;
}

.custom-order-switch.saving {
  opacity: 0.65;
}

.custom-order-switch.lg {
  width: 48px;
  height: 26px;
  cursor: pointer;
}

.custom-order-switch.lg .dot {
  width: 20px;
  height: 20px;
}

.custom-order-switch.lg.on .dot {
  left: 25px;
}

.custom-order-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-order-setting {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 68px;
  padding: 13px 16px;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--bg-toolbar);
  transition: border-color 0.18s ease, background 0.18s ease;
}

.custom-order-setting.enabled {
  border-color: var(--primary-border);
  background: var(--primary-faint);
}

.custom-order-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.custom-order-title {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
}

.custom-order-hint {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
}

/* logo 上传 */
.form-row--logo {
  grid-column: 1 / -1;
}

.logo-uploader {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 76px;
}

.logo-preview {
  position: relative;
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  padding: 3px;
  border-radius: 14px;
  border: 1px solid var(--border-soft);
  background: var(--bg-card);
  box-sizing: border-box;
}

.logo-preview-image {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background: var(--bg-toolbar);
}

.logo-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
}

.logo-pick {
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  border: 1px dashed var(--border);
  border-radius: 14px;
  background: var(--bg-card);
  color: var(--text-sub);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.logo-pick:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.logo-pick:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logo-hint {
  max-width: 220px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.6;
}

.muted-text { color: #98a2b3; }
</style>

<!-- 弹窗外壳美化 -->
<style>
.modal-overlay:has(.game-modal-content) {
  background: rgba(17, 12, 46, 0.55);
  backdrop-filter: blur(6px);
}

.modal-box:has(.game-modal-content) {
  border-radius: 22px;
  border: 1px solid var(--primary-border);
  box-shadow: 0 40px 90px rgba(46, 16, 101, 0.35);
  width: min(720px, 90vw) !important;
}

.modal-box:has(.game-modal-content) .modal-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  border-bottom: none;
}

.modal-box:has(.game-modal-content) .modal-header strong {
  color: var(--text-invert);
  font-size: 18px;
}

.modal-box:has(.game-modal-content) .modal-body {
  padding: 24px;
  background: var(--bg-card);
}

.modal-box:has(.game-modal-content) .modal-footer {
  padding: 16px 24px 20px;
  background: var(--bg-toolbar);
  border-top: 1px solid var(--primary-faint);
}
.btn-link {
  color: var(--text-invert);
}

@media (max-width: 640px) {
  .modal-box:has(.game-modal-content) .modal-body {
    padding: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .custom-order-setting {
    gap: 12px;
    padding: 12px;
  }

  .custom-order-hint {
    max-width: 40ch;
  }

  .spec-section {
    padding: 16px;
  }

  .spec-section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .edit-spec-search {
    flex-wrap: wrap;
  }

  .edit-spec-search .el-input {
    flex-basis: 100%;
  }

  .edit-spec-search .btn {
    flex: 1;
  }

}
</style>
