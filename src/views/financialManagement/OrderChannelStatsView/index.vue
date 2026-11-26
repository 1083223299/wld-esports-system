<script setup>
import { onMounted, reactive, ref } from 'vue';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { financeApi } from '../../../api/modules/finance';

const channelOptions = [
  { label: '企微', value: 'WECOM' },
  { label: '微信', value: 'WECHAT' },
  { label: '抖店', value: 'DOUYIN' },
];

const filter = reactive({
  channelCode: '',
  timeRange: [],
});

const searchFields = [
  {
    prop: 'channelCode',
    label: '渠道',
    type: 'select',
    placeholder: '全部渠道',
    options: [{ label: '全部渠道', value: '' }, ...channelOptions],
  },
  {
    prop: 'timeRange',
    label: '统计时间',
    type: 'daterange',
    startPlaceholder: '开始时间',
    endPlaceholder: '结束时间',
  },
];

const columns = [
  { key: 'channelName', title: '渠道' },
  { key: 'orderAmountTotal', title: '订单金额总额（元）' },
  { key: 'dispatchAmountTotal', title: '派单总额（元）' },
];

const rows = ref([]);
const loading = ref(false);
const errorMessage = ref('');
let requestSequence = 0;

function formatRequestDate(value) {
  if (!value) return undefined;
  if (value instanceof Date) {
    const pad = (part) => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  return String(value).trim().replace(' ', 'T');
}

function formatAmount(value) {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function fetchStatistics() {
  const currentRequest = ++requestSequence;
  const range = Array.isArray(filter.timeRange) ? filter.timeRange : [];
  loading.value = true;
  errorMessage.value = '';
  rows.value = [];

  try {
    const result = await financeApi.channelStats({
      from: formatRequestDate(range[0]),
      to: formatRequestDate(range[1]),
      channelCode: filter.channelCode || undefined,
    });
    if (currentRequest !== requestSequence) return;
    if (!Array.isArray(result?.list)) {
      throw new Error('渠道统计接口返回数据格式错误');
    }
    rows.value = result.list;
  } catch (error) {
    if (currentRequest === requestSequence) {
      errorMessage.value = error?.message || '渠道订单统计加载失败';
    }
  } finally {
    if (currentRequest === requestSequence) loading.value = false;
  }
}

function handleSearch(values) {
  Object.assign(filter, values);
  fetchStatistics();
}

function handleReset() {
  filter.channelCode = '';
  filter.timeRange = [];
  fetchStatistics();
}

onMounted(fetchStatistics);
</script>

<template>
  <div class="order-channel-stats-page list-page">
    <header class="page-heading">
      <div>
        <h1>渠道订单统计</h1>
        <p>按渠道查看订单金额总额与派单总额</p>
      </div>
    </header>

    <div class="stats-search">
      <SearchComponent
        :fields="searchFields"
        :initial-values="filter"
        :row-columns="4"
        :label-width="90"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <section class="stats-table-section">
      <div class="stats-table-heading">
        <h2>分渠道汇总</h2>
      </div>
      <p v-if="errorMessage" class="stats-error" role="alert">{{ errorMessage }}</p>
      <DataTable
        class="stats-table"
        :columns="columns"
        :data="rows"
        :loading="loading"
        :total="rows.length"
        :show-pagination="false"
        empty-text="当前筛选条件下暂无统计数据"
      >
        <template #cell-orderAmountTotal="{ row }">
          {{ formatAmount(row.orderAmountTotal) }}
        </template>
        <template #cell-dispatchAmountTotal="{ row }">
          {{ formatAmount(row.dispatchAmountTotal) }}
        </template>
      </DataTable>
    </section>
  </div>
</template>

<style scoped>
.order-channel-stats-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  /* padding: 18px 20px 24px; */
  box-sizing: border-box;
}

.page-heading h1,
.stats-table-heading h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
  font-weight: 700;
}

.page-heading p {
  margin: 6px 0 0;
  color: var(--text-sub);
  font-size: 13px;
}

.stats-search {
  flex: 0 0 auto;
}

.stats-error {
  margin: 0 0 10px;
  padding: 10px 12px;
  border: 1px solid rgba(217, 45, 32, 0.22);
  border-radius: 8px;
  background: rgba(217, 45, 32, 0.06);
  color: var(--danger);
  font-size: 13px;
}

.stats-table-section {
  min-height: 0;
}

.stats-table-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.stats-table-heading h2 {
  font-size: 15px;
}

@media (max-width: 640px) {
  .order-channel-stats-page {
    padding: 14px 12px 20px;
  }
}
</style>
