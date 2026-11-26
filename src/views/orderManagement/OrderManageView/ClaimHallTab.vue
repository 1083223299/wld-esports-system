<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import AppModal from '../../../components/AppModal.vue';
import { useToast } from '../../../composables/useToast';
import { useListMemory } from '../../../composables/useListMemory';
import { subscribeOrderFeed } from '../../../api/orderFeed';
import { orderApi, TYPE_OPTIONS, statusText, typeText } from '../../../api/modules/order';
import { channelNameMap } from '../../../api/modules/channel';
import { fileApi } from '../../../api/modules/file';
import { useUserStore } from '../../../stores/user';
import { STATUS_CLASS } from './mockData';

/**
 * 客服领单大厅（接口联调）：GET /api/admin/orders/claim-hall
 * 服务端分页，支持订单号、第三方订单号和创建时间筛选；认领后进入订单列表
 * 鉴权：Authorization Bearer {token} 由 request.js 自动附加
 * 认领：POST /api/admin/orders/{id}/claim（可带 groupQrUrl），认领后可选维护信息（orderType/roleName/teamCode）
 * 说明：claim-hall 已返回 createdAt（后端确认），创建时间列/筛选按接口数据展示；
 *      群二维码先上传至文件管理端，再随认领请求提交。
 */
const { show } = useToast();
const userStore = useUserStore();

const filter = reactive({
  orderNo: '',
  thirdOrderNo: '',
  createTime: [],
});

const { page, pageSize, onPageSizeChange, onPageChange, restoreFilter, rememberFilter } = useListMemory({
  filterKeys: ['orderNo', 'thirdOrderNo', 'createTime'],
  defaultPageSize: 20,
});
restoreFilter(filter);

const searchFields = [
  { prop: 'orderNo', label: '本平台订单号', type: 'input', placeholder: '请输入订单号', span: 8 },
  { prop: 'thirdOrderNo', label: '第三方订单号', type: 'input', placeholder: '请输入订单号', span: 8 },
  {
    prop: 'createTime',
    label: '创建时间',
    type: 'daterange',
    startPlaceholder: '开始时间',
    endPlaceholder: '结束时间',
    span: 8,
    shortcuts: [
      { text: '今天', value: () => { const d = new Date(); return [d, d]; } },
      { text: '最近7天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); return [start, end]; } },
      { text: '最近30天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 29); return [start, end]; } },
    ],
  },
];

/* 渠道编码 → 名称映射（后端契约：接口只回 channelCode，渠道列显示名称用 GET /api/admin/channels 映射，
 * 不使用写死的 DOUYIN / XHS / PRIVATE） */
const channelNames = ref({}); // { code: name }

/** 渠道编码 → 渠道名称；未匹配到时原样显示编码 */
function channelDisplay(code) {
  if (!code) return '—';
  const key = String(code).trim();
  return channelNames.value[key] || key;
}

/** 后端字段 → 页面展示字段 */
function mapRow(item = {}) {
  const tags = new Set((item.tags || []).map((tag) => tag === 'AFTER_SALE' ? '售后中' : tag));
  if (Number(item.frozen) === 1) tags.add('冻结');
  if (item.afterSaleFlag !== undefined && item.afterSaleFlag !== null) {
    if (Number(item.afterSaleFlag) === 1) tags.add('售后中');
    else tags.delete('售后中');
  }
  return {
    id: item.id,
    orderNo: item.orderNo || '',
    orderType: typeText(item.orderType),
    gameId: item.gameId,
    specId: item.specId,
    channel: channelDisplay(item.channelCode),
    channelCode: item.channelCode,
    thirdOrderNo: item.thirdOrderNo || '',
    amount: Number(item.amount) || 0,
    product: item.itemName || '',
    playerCount: item.playerCount,
    takenCount: item.takenCount,
    status: statusText(item.status),
    statusCode: item.status,
    tags: Array.from(tags),
    frozen: Number(item.frozen) === 1,
    afterSale: Number(item.afterSaleFlag) === 1,
    ownerName: item.ownerName || '',
    // 创建时间：claim-hall 已返回 createdAt（后端确认），按接口数据展示
    createTime: item.createdAt || '',
  };
}

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

const allRows = ref([]);
const total = ref(0);
const loading = ref(false);
const newFeedCount = ref(0);
const syncingAfterSaleIds = ref(new Set());
let orderFeedSubscription = null;

function maxOrderId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item?.id) || 0), 0);
}

function formatDateQuery(value) {
  if (!value) return undefined;
  return String(value).trim().replace(' ', 'T');
}

function buildHallParams() {
  const [from, to] = Array.isArray(filter.createTime) ? filter.createTime : [];
  return {
    page: page.value,
    pageSize: pageSize.value,
    orderNo: String(filter.orderNo || '').trim(),
    thirdOrderNo: String(filter.thirdOrderNo || '').trim(),
    from: formatDateQuery(from),
    to: formatDateQuery(to),
  };
}

async function fetchHall() {
  loading.value = true;
  try {
    const result = await orderApi.claimHall(buildHallParams());
    const list = result?.list || [];
    allRows.value = list.map(mapRow);
    total.value = Number(result?.total) || 0;
    newFeedCount.value = 0;
    orderFeedSubscription?.update({ sinceId: maxOrderId(list) });
  } catch {
    allRows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function canSyncAfterSale(row) {
  return (
    ['admin', 'service'].includes(userStore.role) &&
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
      show('售后状态回查未返回有效订单数据，请刷新领单大厅', 'warning');
      return;
    }

    const index = allRows.value.findIndex((item) => String(item.id) === String(row.id));
    if (index >= 0) allRows.value.splice(index, 1, mapRow(updatedOrder));
    else await fetchHall();
    show('售后状态已回查', 'success');
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    syncingAfterSaleIds.value.delete(row.id);
  }
}

function handleSearch(values) {
  Object.assign(filter, values);
  rememberFilter(filter, true);
  fetchHall();
}

function handleReset() {
  Object.keys(filter).forEach((key) => {
    if (Array.isArray(filter[key])) filter[key] = [];
    else filter[key] = '';
  });
  rememberFilter(filter, true);
  fetchHall();
}

function handlePageChange(nextPage) {
  onPageChange(nextPage);
  fetchHall();
}

function handlePageSizeChange(nextPageSize) {
  onPageSizeChange(nextPageSize);
  fetchHall();
}

function refreshHall() {
  onPageChange(1);
  fetchHall();
}

onMounted(async () => {
  orderFeedSubscription = subscribeOrderFeed('claimHall', (count) => {
    newFeedCount.value = count;
  });
  try {
    channelNames.value = await channelNameMap(); // 渠道映射就绪后再拉列表
  } catch {
    channelNames.value = {};
  }
  fetchHall();
});

const columns = [
  { key: 'orderNo', title: '本平台订单号' },
  { key: 'thirdOrderNo', title: '第三方订单号' },
  { key: 'amount', title: '订单金额（元）' },
  { key: 'product', title: '购买项目' },
  { key: 'status', title: '订单状态' },
  { key: 'createTime', title: '创建时间' },
  { key: 'op', title: '操作' },
];

/* ===== 认领弹窗（人数由后端管理；多人订单由接单打手邀请队友） ===== */
const claimVisible = ref(false);
const claimSubmitting = ref(false);
const currentRow = ref(null);
const claimForm = reactive({
  orderType: 'NORMAL',
  roleName: '',
  groupCode: '',
  groupQrFile: null,
  groupQrPreview: '',
});

function clearQrPreview() {
  if (claimForm.groupQrPreview) URL.revokeObjectURL(claimForm.groupQrPreview);
  claimForm.groupQrFile = null;
  claimForm.groupQrPreview = '';
}

function setQrImage(file) {
  if (!file || claimSubmitting.value) return;
  if (!file.type.startsWith('image/')) {
    show('请选择图片文件', 'warning');
    return;
  }

  clearQrPreview();
  claimForm.groupQrFile = file;
  claimForm.groupQrPreview = URL.createObjectURL(file);
}

function handleQrImage(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  setQrImage(file);
}

function handleQrPaste(event) {
  if (!claimVisible.value || claimSubmitting.value) return;
  const item = Array.from(event.clipboardData?.items || []).find(
    (item) => item.kind === 'file' && item.type.startsWith('image/')
  );
  const file = item?.getAsFile();
  if (!file) return;
  event.preventDefault();
  setQrImage(file);
}

function handleQrDrop(event) {
  const files = Array.from(event.dataTransfer?.files || []);
  setQrImage(files.find((file) => file.type.startsWith('image/')) || files[0]);
}

watch(claimVisible, (visible) => {
  window.removeEventListener('paste', handleQrPaste);
  if (visible) window.addEventListener('paste', handleQrPaste);
  if (!visible) clearQrPreview();
});

onBeforeUnmount(() => {
  window.removeEventListener('paste', handleQrPaste);
  orderFeedSubscription?.close();
  clearQrPreview();
});

function openClaim(row) {
  if (!canClaim(row)) {
    show('该订单当前不可认领，请刷新领单大厅', 'warning');
    fetchHall();
    return;
  }
  clearQrPreview();
  currentRow.value = row;
  Object.assign(claimForm, { orderType: 'NORMAL', roleName: '', groupCode: '' });
  claimVisible.value = true;
}

function canClaim(row) {
  return row.statusCode === 'WAIT_CLAIM' && !row.frozen && !row.afterSale;
}

async function submitClaim() {
  const row = currentRow.value;
  if (!row || claimSubmitting.value) return;
  if (!canClaim(row)) {
    claimVisible.value = false;
    show('该订单状态已变化，无法认领，请刷新领单大厅', 'warning');
    fetchHall();
    return;
  }
  const form = { ...claimForm };
  claimSubmitting.value = true;
  try {
    // 先上传二维码，避免上传失败后订单已被认领。
    let claimData;
    if (form.groupQrFile) {
      const uploadResult = await fileApi.upload(form.groupQrFile);
      if (!uploadResult?.url) {
        show('二维码上传未返回图片地址，请重试', 'error');
        return;
      }
      claimData = { groupQrUrl: uploadResult.url };
    }
    // 认领请求可选携带群二维码地址；未选择二维码时保持原有无 body 请求。
    await orderApi.claim(row.id, claimData);
    // 认领时填写的维护字段通过维护订单信息接口补录（未填写则不调用）；
    //    组队码 teamCode 新 OpenAPI 已支持（maintain），填写则随认领提交
    const orderType = form.orderType !== 'NORMAL' ? form.orderType : undefined;
    const roleName = String(form.roleName || '').trim() || undefined;
    const teamCode = String(form.groupCode || '').trim() || undefined;
    if (
      orderType !== undefined ||
      roleName !== undefined || teamCode !== undefined
    ) {
      const detail = row.gameId != null && row.specId != null
        ? null
        : await orderApi.detail(row.id);
      const gameId = row.gameId ?? detail?.gameId;
      const specId = row.specId ?? detail?.specId;
      await orderApi.maintain(row.id, {
        ...(gameId != null && specId != null ? { gameId, specId } : {}),
        orderType,
        roleName,
        teamCode,
      });
    }
    claimVisible.value = false;
    show('认领成功，已进入订单列表', 'success');
    fetchHall();
  } catch {
    /* 错误提示由 request.js 统一弹出；回读大厅以移除已被领取的旧数据。 */
    await fetchHall();
  } finally {
    claimSubmitting.value = false;
  }
}

const TAG_CLASS_MAP = {
  卡单: 'warn',
  待发货: 'info',
  已发货: 'success',
  售后中: 'danger',
  部分退款: 'danger',
  呼叫: 'warn',
  冻结: 'muted',
  存单: 'purple',
};

function tagClass(tag) {
  return TAG_CLASS_MAP[tag] || 'info';
}
</script>

<template>
  <div class="claim-tab list-page">
    <div class="list-page__search">
      <SearchComponent
        :fields="searchFields"
        :initial-values="filter"
        :row-columns="3"
        :labelWidth="97"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <DataTable
      class="list-panel"
      :columns="columns"
      :data="allRows"
      :loading="loading"
      :total="total"
      :page="page"
      :page-size="pageSize"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <template #toolbar>
        <div class="claim-toolbar">
          <h2 class="list-title">领单大厅</h2>
          <button class="feed-refresh-btn" type="button" :disabled="loading" @click="refreshHall">
            刷新（{{ newFeedCount }}）
          </button>
        </div>
      </template>

      <template #cell-amount="{ row }">{{ Number(row.amount).toFixed(2) }}</template>

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
            @click.stop="copyText(row.orderNo)"
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
            {{ channelDisplay(row.channelCode).slice(0, 1) }}
          </span>
          <span>{{ row.thirdOrderNo || '—' }}</span>
          <button
            v-if="row.thirdOrderNo"
            class="order-copy-btn"
            type="button"
            :aria-label="`复制第三方订单号 ${row.thirdOrderNo}`"
            title="复制第三方订单号"
            @click.stop="copyText(row.thirdOrderNo)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="5.25" y="2.25" width="8.5" height="10.5" rx="1.5" />
              <path d="M10.75 13.75H3.5A1.25 1.25 0 0 1 2.25 12.5V5.25" />
            </svg>
          </button>
        </span>
      </template>

      <template #cell-status="{ row }">
        <div class="status-wrap">
          <span class="status-badge" :class="STATUS_CLASS[row.status] || 'status-info'">{{ row.status }}</span>
          <template v-for="tag in row.tags" :key="tag">
            <button
              v-if="tag === '售后中' && canSyncAfterSale(row)"
              type="button"
              class="order-tag tag-danger after-sale-sync-tag"
              :disabled="isSyncingAfterSale(row)"
              title="点击回查抖店售后状态"
              @click.stop="syncAfterSale(row)"
            >
              {{ isSyncingAfterSale(row) ? '回查中…' : tag }}
            </button>
            <span v-else class="order-tag" :class="`tag-${tagClass(tag)}`">{{ tag }}</span>
          </template>
        </div>
      </template>

      <template #cell-createTime="{ row }">{{ row.createTime || '—' }}</template>

      <template #cell-op="{ row }">
        <button v-if="canClaim(row)" class="link-btn primary" @click="openClaim(row)">认领</button>
        <span v-else>—</span>
      </template>
    </DataTable>

    <!-- <p class="perm-hint">仅客服角色可领取订单</p> -->

    <AppModal v-model="claimVisible" title="领取" width="480px">
      <div class="claim-dialog">
        <div class="form-row">
          <label>订单类型</label>
          <el-radio-group v-model="claimForm.orderType">
            <el-radio v-for="item in TYPE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
          </el-radio-group>
        </div>
        <div class="form-row">
          <label>角色名</label>
          <input v-model="claimForm.roleName" placeholder="请输入角色名" />
        </div>
        <div class="form-row">
          <label>组队码</label>
          <!-- 组队码 teamCode：maintain 已支持（新 OpenAPI），填写则随认领提交 -->
          <input v-model="claimForm.groupCode" placeholder="请输入组队码" />
        </div>
        <div class="form-row">
          <label>群二维码</label>
          <div
            class="qr-upload"
            tabindex="0"
            role="group"
            aria-label="群二维码上传，可粘贴图片或拖入图片，也可选择文件"
            @dragover.prevent
            @drop.prevent.stop="handleQrDrop"
          >
            <el-image
              v-if="claimForm.groupQrPreview"
              :src="claimForm.groupQrPreview"
              class="qr-preview"
              alt="群二维码预览"
              fit="contain"
              :preview-src-list="[claimForm.groupQrPreview]"
              preview-teleported
            />
            <span v-else class="qr-empty">未选择二维码</span>
            <label class="qr-upload-btn">
              {{ claimForm.groupQrFile ? '重新选择' : '选择图片' }}
              <input type="file" accept="image/*" :disabled="claimSubmitting" hidden @change="handleQrImage" />
            </label>
            <button
              v-if="claimForm.groupQrFile"
              type="button"
              class="qr-remove-btn"
              :disabled="claimSubmitting"
              @click="clearQrPreview"
            >
              删除
            </button>
            <span class="qr-upload-tip">可直接 Ctrl+V 粘贴图片，或将图片拖到此处；点击领取时上传</span>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" :disabled="claimSubmitting" @click="claimVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="claimSubmitting" @click="submitClaim">
          {{ claimSubmitting ? '上传并领取中…' : '领取' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.status-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
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

.order-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
}

.tag-warn { color: #b45309; background: rgba(245, 158, 11, 0.12); }
.tag-info { color: #1d4ed8; background: rgba(59, 130, 246, 0.12); }
.tag-success { color: #0f9f6e; background: rgba(15, 159, 110, 0.1); }
.tag-danger { color: #d92d20; background: rgba(217, 45, 32, 0.1); }
.tag-muted { color: #475467; background: rgba(71, 84, 103, 0.1); }
.tag-purple { color: var(--primary); background: var(--primary-faint); }

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

.order-no-cell {
  display: inline-flex;
  align-items: center;
  gap: 5px;
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

.order-type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  color: var(--text-sub);
  background: var(--bg-hover);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
}

.order-type-tag.is-special {
  color: #ff5a5f;
  background: rgba(255, 90, 95, 0.1);
}

.order-channel-tag {
  min-width: 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 4px;
  font-size: 11px;
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

.muted-text {
  color: var(--text-faint);
  font-size: 12px;
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
  transition: background 0.15s ease, color 0.15s ease;
}

.link-btn.primary {
  color: var(--primary);
  font-weight: 600;
}

.link-btn:hover {
  background: var(--primary-soft);
}

.perm-hint {
  flex: 0 0 auto;
  margin: 0;
  text-align: right;
  font-size: 12px;
  color: #8a93a6;
}

.claim-dialog {
  display: grid;
  gap: 16px;
}

.form-row {
  display: grid;
  gap: 8px;
}

.form-row label {
  color: #5b6478;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.form-row input {
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

.form-row input:focus {
  border-color: #8b5cf6;
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-border);
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

.claim-dialog :deep(.el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 22px;
  min-height: 30px;
}

.claim-dialog :deep(.el-radio) {
  margin-right: 0;
  height: 30px;
}

.claim-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feed-refresh-btn {
  border: 1px solid var(--primary-border);
  border-radius: 9px;
  padding: 7px 12px;
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
</style>
