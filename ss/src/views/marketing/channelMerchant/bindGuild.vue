<!--
  渠道商绑定公会列表
  - POST /business/channel-merchant/bind-guild/page
  - POST /business/channel-merchant/bind-guild/search
  - POST /business/channel-merchant/bind-guild/add
-->
<template>
  <div class="channel-merchant-page">
    <div class="page-title-bar">
      <el-button type="text" class="back-btn" icon="el-icon-arrow-left" @click="handleBack" />
      <h2 class="page-title">绑定公会 · {{ merchantName }}</h2>
    </div>

    <SearchForm
      ref="searchForm"
      :fields="searchItems"
      :initial-values="filterForm"
      :gutter="20"
      label-width="110px"
      @search="handleSearch"
      @reset="handleReset"
    />

    <el-card class="list-card" shadow="never">
      <div class="action-bar-fixed">
        <el-button
          type="primary"
          icon="el-icon-plus"
          class="add-btn"
          @click="openManualBind"
        >
          手动绑定
        </el-button>
      </div>

      <div class="table-wrapper">
        <el-table
          :data="tableData"
          v-loading="loading"
          stripe
          height="100%"
          row-key="id"
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :header-cell-style="{ textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="tradeId" label="公会ID" min-width="120" show-overflow-tooltip />
          <el-table-column prop="tradeName" label="公会名称" min-width="140" show-overflow-tooltip />
          <el-table-column label="负责人" min-width="180">
            <template slot-scope="{ row }">
              <div class="leader-cell">
                <div>{{ row.leaderName || "-" }}</div>
                <div class="leader-cell__phone">
                  <PhoneDisplay :value="row.leaderPhone" />
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="陪玩师" min-width="90">
            <template slot-scope="{ row }">
              {{ formatCount(row.waiterCount) }}
            </template>
          </el-table-column>
          <el-table-column label="保证金" min-width="120">
            <template slot-scope="{ row }">
              {{ formatMoney(row.depositAmount) }}
            </template>
          </el-table-column>
          <el-table-column prop="bindTime" label="绑定时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="来源" min-width="110">
            <template slot-scope="{ row }">
              {{ row.bindSourceName || getBindSourceText(row.bindSource) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <div class="total-text">共 {{ pagination.total }} 条</div>
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :selected-rows="[]"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <ManualBindDialog
      :visible.sync="manualVisible"
      :channel-merchant-id="merchantId"
      :merchant-name="merchantName"
      @success="handleBindSuccess"
    />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import ManualBindDialog from "./components/ManualBindDialog.vue";
import { getBindGuildPage } from "@/api/channelMerchant";

function createFilterForm() {
  return {
    keyword: "",
  };
}

export default {
  name: "BindGuild",
  components: {
    SearchForm,
    PaginationSimple,
    PhoneDisplay,
    ManualBindDialog,
  },
  props: {
    merchant: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      loading: false,
      tableData: [],
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      filterForm: createFilterForm(),
      manualVisible: false,
      searchItems: [
        {
          type: "input",
          prop: "keyword",
          label: "公会ID/名称",
          placeholder: "请输入公会ID或名称",
          clearable: true,
          span: 6,
        },
      ],
    };
  },
  computed: {
    // 渠道商主键ID：与列表接口返回的 id 保持一致，避免 Number() 大整数精度丢失
    merchantId() {
      if (!this.merchant || this.merchant.id === null || this.merchant.id === undefined || this.merchant.id === "") {
        return null;
      }
      return this.merchant.id;
    },
    merchantName() {
      return (this.merchant && this.merchant.name) || "-";
    },
  },
  created() {
    this.fetchList();
  },
  methods: {
    formatCount(val) {
      if (val === null || val === undefined || val === "") return 0;
      return Number(val) || 0;
    },
    formatMoney(val) {
      if (val === null || val === undefined || val === "") return "¥0";
      const num = Number(val);
      if (!Number.isFinite(num)) return String(val);
      return `¥${num.toLocaleString("zh-CN")}`;
    },
    getBindSourceText(source) {
      const map = { 1: "后台绑定", 2: "扫码入驻" };
      return map[Number(source)] || "-";
    },
    handleBack() {
      this.$emit("back");
    },
    handleSearch(form) {
      if (form) this.filterForm = { ...this.filterForm, ...form };
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleReset() {
      this.filterForm = createFilterForm();
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchList();
    },
    normalizeListRes(res) {
      const payload = res && res.data != null ? res.data : res;
      if (payload && Array.isArray(payload.rows)) {
        return {
          rows: payload.rows,
          total: Number(payload.total) || 0,
        };
      }
      if (Array.isArray(payload)) {
        return { rows: payload, total: payload.length };
      }
      return { rows: [], total: 0 };
    },
    async fetchList() {
      if (this.merchantId == null) {
        this.tableData = [];
        this.pagination.total = 0;
        return;
      }
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          channelMerchantId: this.merchantId,
        };
        const keyword = String((this.filterForm && this.filterForm.keyword) || "").trim();
        if (keyword) params.keyword = keyword;
        const res = await getBindGuildPage(params);
        const { rows, total } = this.normalizeListRes(res);
        this.tableData = rows;
        this.pagination.total = total;
      } catch (e) {
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    openManualBind() {
      if (this.merchantId == null) {
        this.$message.warning("缺少渠道商信息");
        return;
      }
      this.manualVisible = true;
    },
    handleBindSuccess() {
      this.pagination.pageNum = 1;
      this.fetchList();
    },
  },
};
</script>

<style scoped lang="scss">
.channel-merchant-page {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-title-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.back-btn {
  color: #4e5969;
  padding: 0;
  font-size: 18px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border-radius: 24px;
}

::v-deep .list-card .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 24px 8px;
  min-height: 0;
}

.action-bar-fixed {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.add-btn {
  background: #6a35ff;
  border-color: #6a35ff;
  border-radius: 8px;
  padding-left: 28px;
  padding-right: 28px;
}

.add-btn:hover,
.add-btn:focus {
  background: #8f5eff;
  border-color: #8f5eff;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
}

.total-text {
  font-size: 14px;
  color: #606266;
}

.leader-cell {
  line-height: 1.4;
}

.leader-cell__phone {
  margin-top: 2px;
  color: #86909c;
  font-size: 12px;
}
</style>
