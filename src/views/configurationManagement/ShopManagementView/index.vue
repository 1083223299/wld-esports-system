<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { useToast } from '../../../composables/useToast';
import { channelApi } from '../../../api/modules/channel';
import SkuMapping from '../SkuMappingView/index.vue';

const { show } = useToast();
const channels = ref([]);
const shops = ref([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const filter = reactive({ channelId: '', keyword: '' });
const currentView = ref('shops');
const selectedShopId = ref('');

const searchFields = computed(() => [
  {
    prop: 'channelId',
    label: '所属渠道',
    type: 'select',
    placeholder: '请选择渠道',
    span: 6,
    options: [
      { label: '全部渠道', value: '' },
      ...channels.value.map((channel) => ({
        label: channel.name || channel.code || `渠道${channel.id}`,
        value: String(channel.id),
      })),
    ],
  },
  {
    prop: 'keyword',
    label: '店铺名称/ID',
    type: 'input',
    placeholder: '请输入店铺名称或ID',
    span: 8,
  },
]);

const filteredShops = computed(() => {
  const keyword = filter.keyword.trim().toLowerCase();
  return shops.value.filter((shop) => {
    if (filter.channelId && String(shop.channelId) !== String(filter.channelId)) return false;
    if (!keyword) return true;
    return `${shop.shopName} ${shop.shopId}`.toLowerCase().includes(keyword);
  });
});

const visibleShops = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredShops.value.slice(start, start + pageSize.value);
});

const columns = [
  { key: 'shopId', title: '店铺编号' },
  { key: 'shopName', title: '店铺名称' },
  { key: 'source', title: '店铺来源' },
  // { key: 'createdAt', title: '创建时间' },
  { key: 'op', title: '操作' },
];

async function fetchShops() {
  loading.value = true;
  try {
    const list = await channelApi.list();
    channels.value = list;
    shops.value = list.flatMap((channel) =>
      (Array.isArray(channel.shops) ? channel.shops : []).map((shop) => ({
        ...shop,
        channelId: channel.id,
        channelName: channel.name || channel.code || '-',
        source: channel.name || channel.code || '-',
        shopName: shop.shopName || '-',
        shopId: shop.shopId || '',
        createdAt: shop.createdAt || shop.createTime || '-',
      }))
    );
    page.value = 1;
  } catch (error) {
    channels.value = [];
    shops.value = [];
    show(error?.message || '店铺信息加载失败，请重试', 'error');
  } finally {
    loading.value = false;
  }
}

function handleSearch(values) {
  Object.assign(filter, values);
  page.value = 1;
}

function handleReset() {
  filter.channelId = '';
  filter.keyword = '';
  page.value = 1;
}

function pageChange(nextPage) {
  page.value = nextPage;
}

function pageSizeChange(nextPageSize) {
  pageSize.value = nextPageSize;
  page.value = 1;
}

function openSkuMappings(shop) {
  if (!shop.shopId) {
    show('该店铺缺少店铺ID，无法筛选 SKU 映射', 'warning');
    return;
  }
  selectedShopId.value = shop.shopId;
  currentView.value = 'sku';
}

onMounted(fetchShops);
</script>

<template>
  <div class="shop-management-page" :class="{ 'shop-management-page--sku': currentView === 'sku' }">
    <SkuMapping
      v-if="currentView === 'sku'"
      :shop-id="selectedShopId"
      @back="currentView = 'shops'"
    />

    <template v-else>
      <div class="shop-management-heading">
        <div>
          <h2>店铺管理</h2>
          <p>查看渠道下已接入的店铺，并从店铺进入对应的 SKU 映射。</p>
        </div>
        <button class="btn btn-plain" :disabled="loading" @click="fetchShops">
          {{ loading ? '刷新中…' : '刷新' }}
        </button>
      </div>

      <!-- <div class="shop-management-notice">
        店铺信息由渠道配置接口同步；当前系统接口仅提供店铺查询，新增、编辑和删除需后端开放对应能力。
      </div> -->

      <div class="list-page__search">
        <SearchComponent
          :fields="searchFields"
          :initial-values="filter"
          :row-columns="2"
          :labelWidth="90"
          @search="handleSearch"
          @reset="handleReset"
        />
      </div>

      <DataTable
        :columns="columns"
        :data="visibleShops"
        :loading="loading"
        :total="filteredShops.length"
        :page="page"
        :page-size="pageSize"
        :empty-text="shops.length ? '没有符合条件的店铺' : '暂无店铺信息'"
        @page-change="pageChange"
        @page-size-change="pageSizeChange"
      >
        <template #cell-op="{ row }">
          <button class="link-btn" @click="openSkuMappings(row)">商品配置</button>
        </template>
      </DataTable>
    </template>
  </div>
</template>

<style scoped>
.shop-management-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.shop-management-page--sku {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.shop-management-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.shop-management-heading h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
}

.shop-management-heading p {
  margin: 6px 0 0;
  color: var(--text-sub);
  font-size: 13px;
}

.shop-management-notice {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-sub);
  background: var(--bg-card);
  font-size: 13px;
  line-height: 1.6;
}

.link-btn {
  border: none;
  border-radius: 8px;
  padding: 3px 8px;
  color: #2563eb;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
}
</style>
