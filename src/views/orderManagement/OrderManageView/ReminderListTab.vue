<script setup>
import { onMounted, ref } from 'vue';
import DataTable from '../../../components/DataTable.vue';
import { useListMemory } from '../../../composables/useListMemory';
import { orderApi } from '../../../api/modules/order';
import { channelNameMap } from '../../../api/modules/channel';

/**
 * 催单列表（接口联调）：GET /api/admin/orders/urge-hall
 * 未支付第三方订单（status=WAIT_PAY），支付或取消后离开本列表
 * 需求无搜索模块：仅服务端分页，不传筛选参数（筛选接口由后端补充后再加）
 * 鉴权：Authorization Bearer {token} 由 request.js 自动附加
 */
const { page, pageSize, onPageSizeChange, onPageChange } = useListMemory();

const rows = ref([]);
const total = ref(0);
const loading = ref(false);

/* 渠道编码 → 名称映射（后端契约：接口只回 channelCode，渠道列显示名称用 GET /api/admin/channels 映射，
 * 不使用写死的 DOUYIN / XHS / PRIVATE） */
const channelNames = ref({}); // { code: name }

/** 渠道编码 → 渠道名称；未匹配到时原样显示编码 */
function channelDisplay(code) {
  if (!code) return '—';
  const key = String(code).trim();
  return channelNames.value[key] || key;
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
}

/** 后端字段 → 页面展示字段 */
function mapRow(item = {}) {
  return {
    id: item.id,
    thirdOrderNo: item.thirdOrderNo || '',
    channel: channelDisplay(item.channelCode),
    channelCode: item.channelCode,
    amount: Number(item.amount) || 0,
    product: item.itemName || '',
    status: item.status,
    createTime: item.createdAt || '',
  };
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await orderApi.urgeHall({ page: page.value, pageSize: pageSize.value });
    rows.value = ((res && res.list) || []).map(mapRow);
    total.value = (res && res.total) || 0;
  } catch {
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    channelNames.value = await channelNameMap(); // 渠道映射就绪后再拉列表
  } catch {
    channelNames.value = {};
  }
  fetchList();
});

const columns = [
  { key: 'thirdOrderNo', title: '第三方订单号' },
  { key: 'amount', title: '订单金额（元）' },
  { key: 'product', title: '购买项目' },
  { key: 'createTime', title: '创建时间' },
];
</script>

<template>
  <div class="reminder-tab list-page">
    <DataTable
      class="list-panel"
      :columns="columns"
      :data="rows"
      :loading="loading"
      :total="total"
      :page="page"
      :page-size="pageSize"
      @page-change="(p) => { onPageChange(p); fetchList(); }"
      @page-size-change="(s) => { onPageSizeChange(s); fetchList(); }"
    >
      <template #toolbar>
        <h2 class="list-title">催单列表</h2>
      </template>

      <template #cell-amount="{ row }">{{ Number(row.amount).toFixed(2) }}</template>

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

      <template #cell-product="{ row }">{{ row.product || '—' }}</template>

      <template #cell-createTime="{ row }">{{ row.createTime || '—' }}</template>
    </DataTable>
  </div>
</template>

<style scoped>
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
</style>
