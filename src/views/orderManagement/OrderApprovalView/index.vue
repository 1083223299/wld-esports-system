<script setup>
import { onMounted, reactive, ref } from 'vue';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { useConfirm } from '../../../composables/useConfirm';
import { useToast } from '../../../composables/useToast';
import { orderApi } from '../../../api/modules/order';

const { confirm } = useConfirm();
const { show } = useToast();

const filter = reactive({
  type: '',
  timeRange: [],
  status: '',
});
const searchFields = [
  {
    prop: 'type',
    label: '审批事项',
    type: 'select',
    placeholder: '全部事项',
    options: [
      { label: '全部事项', value: '' },
      { label: '申请规格编辑', value: 'SPEC_EDIT' },
      { label: '申请作废', value: 'VOID' },
    ],
  },
  {
    prop: 'timeRange',
    label: '申请时间',
    type: 'daterange',
    startPlaceholder: '开始时间',
    endPlaceholder: '结束时间',
  },
  {
    prop: 'status',
    label: '审批状态',
    type: 'select',
    placeholder: '全部状态',
    options: [
      { label: '全部状态', value: '' },
      { label: '审批中', value: 'PENDING' },
      { label: '已同意', value: 'APPROVED' },
      { label: '已驳回', value: 'REJECTED' },
    ],
  },
];
const columns = [
  { key: 'type', title: '审批事项' },
  { key: 'order', title: '订单信息', width: 420, wrap: true },
  { key: 'applicant', title: '申请人' },
  { key: 'requestedAt', title: '时间' },
  { key: 'status', title: '状态' },
  { key: 'op', title: '操作', width: 180 },
];

const page = ref(1);
const pageSize = ref(20);
const requests = ref([]);
const total = ref(0);
const loading = ref(false);
const actingId = ref(null);

function dateQuery(value) {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const pad = (part) => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).trim().replace(' ', 'T');
}

function normalizeType(type, label = '') {
  const value = String(type || label).toUpperCase();
  return value === 'VOID' || value === '申请作废' ? 'VOID' : 'SPEC_EDIT';
}

function normalizeStatus(status, label = '') {
  const value = String(status || label).toUpperCase();
  if (value === 'APPROVED' || value === '已同意') return 'APPROVED';
  if (value === 'REJECTED' || value === '已驳回') return 'REJECTED';
  return 'PENDING';
}

function mapApproval(item = {}) {
  const type = normalizeType(item.type, item.typeLabel);
  const status = normalizeStatus(item.status, item.statusLabel);
  return {
    ...item,
    id: item.id ?? item.approvalId,
    type,
    typeLabel: item.typeLabel || (type === 'VOID' ? '申请作废' : '申请规格编辑'),
    status,
    statusLabel: statusLabel(status),
    orderNo: item.orderNo || '',
    thirdOrderNo: item.thirdOrderNo || '',
    itemName: item.itemName || '',
    applicantName: item.applicantName || '',
    createdAt: item.createdAt || '',
  };
}

function buildParams() {
  const [from, to] = Array.isArray(filter.timeRange) ? filter.timeRange : [];
  return {
    type: filter.type,
    status: filter.status,
    from: dateQuery(from),
    to: dateQuery(to),
    page: page.value,
    pageSize: pageSize.value,
  };
}

async function fetchRequests() {
  loading.value = true;
  try {
    const result = await orderApi.orderApprovals(buildParams());
    const list = Array.isArray(result?.list) ? result.list : [];
    requests.value = list.map(mapApproval);
    total.value = Number(result?.total) || 0;
  } catch {
    /* Errors are surfaced by request.js; retain the last successful result. */
  } finally {
    loading.value = false;
  }
}

onMounted(fetchRequests);

function handleSearch(values) {
  Object.assign(filter, values);
  page.value = 1;
  fetchRequests();
}

function handleReset() {
  filter.type = '';
  filter.timeRange = [];
  filter.status = '';
  page.value = 1;
  fetchRequests();
}

function typeLabel(request) {
  return request.typeLabel || (request.type === 'VOID' ? '申请作废' : '申请规格编辑');
}

function statusLabel(status) {
  return ({ PENDING: '审批中', APPROVED: '已同意', REJECTED: '已驳回' })[status] || '—';
}

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false });
}

async function approveRequest(request) {
  if (actingId.value != null || request.status !== 'PENDING' || request.id == null) return;
  const approved = await confirm({
    title: '确认同意审批',
    message: `确定同意${typeLabel(request)}申请（订单 ${request.orderNo || request.orderId}）吗？`,
    okText: '同意',
  });
  if (!approved) return;
  actingId.value = request.id;
  try {
    await orderApi.approveOrderApproval(request.id);
    show('审批已同意', 'success');
    await fetchRequests();
  } catch {
    /* Errors are surfaced by request.js. */
  } finally {
    actingId.value = null;
  }
}

async function rejectRequest(request) {
  if (actingId.value != null || request.status !== 'PENDING' || request.id == null) return;
  const rejected = await confirm({
    title: '确认驳回审批',
    message: `确定驳回订单 ${request.orderNo || request.orderId} 的${typeLabel(request)}吗？`,
    okText: '驳回',
  });
  if (!rejected) return;
  actingId.value = request.id;
  try {
    await orderApi.rejectOrderApproval(request.id);
    show('审批已驳回', 'success');
    await fetchRequests();
  } catch {
    /* Errors are surfaced by request.js. */
  } finally {
    actingId.value = null;
  }
}

function formatEditChanges(request = {}) {
  const items = [
    request.gameName && `游戏：${request.gameName}`,
    request.specName && `规格：${request.specName}`,
    request.itemName && `购买项目：${request.itemName}`,
    request.amount != null && `金额：${Number(request.amount).toFixed(2)}元`,
  ].filter(Boolean);
  return items.length ? items.join('；') : '申请一次编辑权限';
}
</script>

<template>
  <div class="order-approval-page list-page">
    <!-- <header class="page-heading">
      <div>
        <h1>订单相关审批</h1>
        <p>审批订单规格编辑与作废申请。</p>
      </div>
    </header> -->

    <div class="approval-search">
      <SearchComponent
        :fields="searchFields"
        :initial-values="filter"
        :row-columns="3"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <DataTable
      :columns="columns"
      :data="requests"
      :loading="loading"
      :total="total"
      :page="page"
      :page-size="pageSize"
      empty-text="暂无审批申请"
      @page-change="(value) => { page = value; fetchRequests(); }"
      @page-size-change="(value) => { pageSize = value; page = 1; fetchRequests(); }"
    >
      <template #cell-type="{ row }">{{ typeLabel(row) }}</template>
      <template #cell-applicant="{ row }">{{ row.applicantName || '—' }}</template>
      <template #cell-order="{ row }">
        <div class="approval-order">
          <strong>{{ row.thirdOrderNo || '—' }}</strong>
          <span>{{ row.type === 'SPEC_EDIT' ? formatEditChanges(row) : '申请作废订单' }}</span>
        </div>
      </template>
      <template #cell-requestedAt="{ row }">{{ formatTime(row.createdAt) }}</template>
      <template #cell-status="{ row }">
        <div class="approval-status">
          <span class="status-badge" :class="`status-${row.status.toLowerCase()}`">{{ row.statusLabel || statusLabel(row.status) }}</span>
        </div>
      </template>
      <template #cell-op="{ row }">
        <div v-if="row.status === 'PENDING'" class="approval-actions">
          <button type="button" class="link-btn primary" :disabled="actingId != null" @click="approveRequest(row)">同意</button>
          <button type="button" class="link-btn danger" :disabled="actingId != null" @click="rejectRequest(row)">驳回</button>
        </div>
        <span v-else>—</span>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.order-approval-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  /* padding: 18px 20px 24px; */
  box-sizing: border-box;
}

.page-heading h1 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
}

.page-heading p {
  margin: 6px 0 0;
  color: var(--text-sub);
  font-size: 13px;
}

.approval-order,
.approval-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.approval-order span,
.approval-status small {
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.5;
}

.approval-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.approval-actions .link-btn {
  min-width: 52px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, opacity 0.16s ease;
}

.approval-actions .link-btn.primary {
  color: #fff;
  background: var(--primary);
  box-shadow: 0 2px 6px var(--primary-ring);
}

.approval-actions .link-btn.primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.approval-actions .link-btn.danger {
  color: #c2413a;
  border-color: rgba(194, 65, 58, 0.2);
  background: rgba(194, 65, 58, 0.06);
}

.approval-actions .link-btn.danger:hover:not(:disabled) {
  border-color: rgba(194, 65, 58, 0.32);
  background: rgba(194, 65, 58, 0.12);
}

.approval-actions .link-btn:focus-visible {
  outline: 2px solid var(--primary-ring);
  outline-offset: 2px;
}

.approval-actions .link-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status-badge {
  width: fit-content;
  padding: 3px 9px;
  border-radius: 7px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.status-pending { background: #d97706; }
.status-approved { background: #059669; }
.status-rejected { background: #dc2626; }

</style>
