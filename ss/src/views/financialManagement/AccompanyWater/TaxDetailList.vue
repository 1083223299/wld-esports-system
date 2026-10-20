<template>
  <div class="tax-detail-page">
    <div class="search-module">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        label-width="120px"
        :confirm-reset="false"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <div class="summary-bar">
      <span>提现金额合计(元)：{{ formatAmount(summary.withdrawAmount) }}</span>
      <span>代扣税费合计(元)：{{ formatAmount(summary.taxAmount) }}</span>
      <span>第三方代发费用合计(元)：{{ formatAmount(summary.serviceFee) }}</span>
    </div>

    <el-card class="list-card" shadow="never">
      <div ref="tableWrapper" class="table-wrapper">
        <el-table
          v-loading="loading"
          :data="tableData"
          :height="tableHeight"
          stripe
          :row-key="getRowKey"
          :border="false"
          empty-text="暂无纳税明细"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
        >
          <el-table-column label="#" width="60">
            <template slot-scope="{ $index }">
              {{ (pagination.pageNum - 1) * pagination.pageSize + $index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="orderNo" label="提现单号" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.orderNo || "-" }}</template>
          </el-table-column>
          <el-table-column label="陪陪信息" min-width="160">
            <template slot-scope="{ row }">
              <div class="user-cell">
                <div>{{ row.nickname || "-" }}</div>
                <div class="sub-text">陪陪ID：{{ row.userId || "-" }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="提现金额(元)" width="130">
            <template slot-scope="{ row }">{{ formatAmount(row.totalAmount) }}</template>
          </el-table-column>
          <el-table-column label="代扣税费(元)" width="120">
            <template slot-scope="{ row }">{{ formatAmount(row.taxAmount) }}</template>
          </el-table-column>
          <el-table-column label="陪玩到账金额(元)" width="150">
            <template slot-scope="{ row }">{{ formatAmount(row.actualPayAmount) }}</template>
          </el-table-column>
          <el-table-column label="第三方名称" width="120">
            <template slot-scope="{ row }">{{ getChannelText(row.channel) }}</template>
          </el-table-column>
          <el-table-column label="第三方代发费用(元)" width="160">
            <template slot-scope="{ row }">{{ formatAmount(row.serviceFee) }}</template>
          </el-table-column>
          <el-table-column prop="thirdOrderNo" label="第三方业务单号" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.thirdOrderNo || "-" }}</template>
          </el-table-column>
          <el-table-column label="创建时间" width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.finishTime || row.createTime || "-" }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { getUserWithdrawTaxList } from "@/api/orderFlow";

const CHANNEL_MAP = {
  1: "云账户",
  2: "支付宝转账",
};

export default {
  name: "TaxDetailList",
  components: {
    SearchForm,
    PaginationSimple,
  },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "orderNo",
          label: "提现单号",
          placeholder: "请输入提现单号",
          clearable: true,
        },
        {
          type: "input",
          prop: "userNickname",
          label: "陪陪名称",
          placeholder: "请输入陪陪名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "userId",
          label: "陪陪ID",
          placeholder: "请输入陪陪ID",
          inputType: "integer",
          clearable: true,
        },
        {
          type: "select",
          prop: "channel",
          label: "第三方名称",
          placeholder: "请选择第三方名称",
          options: [
            { label: "全部", value: "" },
            { label: "云账户", value: 1 },
          ],
          clearable: false,
        },
        {
          type: "input",
          prop: "thirdOrderNo",
          label: "第三方业务单号",
          placeholder: "请输入第三方业务单号",
          clearable: true,
        },
        {
          type: "daterange",
          prop: "createTimeRange",
          label: "创建时间",
          startPlaceholder: "开始时间",
          endPlaceholder: "结束时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          clearable: true,
        },
      ],
      filterForm: {
        orderNo: "",
        userNickname: "",
        userId: "",
        channel: "",
        thirdOrderNo: "",
        createTimeRange: [],
      },
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      tableData: [],
      summary: {
        withdrawAmount: 0,
        taxAmount: 0,
        serviceFee: 0,
      },
      loading: false,
      tableHeight: 400,
    };
  },
  mounted() {
    this.setTableHeight();
    window.addEventListener("resize", this.setTableHeight);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.setTableHeight);
  },
  methods: {
    setTableHeight() {
      this.$nextTick(() => {
        const el = this.$refs.tableWrapper;
        if (el) {
          this.tableHeight = el.clientHeight;
        }
      });
    },
    getChannelText(channel) {
      if (channel === null || channel === undefined || channel === "") return "-";
      return CHANNEL_MAP[Number(channel)] || "-";
    },
    formatAmount(amount) {
      if (amount === null || amount === undefined || amount === "") return "0.00";
      const num = Number(amount);
      return Number.isNaN(num) ? "0.00" : num.toFixed(2);
    },
    getRowKey(row) {
      return row.id || row.orderNo || `${this.pagination.pageNum}-${this.tableData.indexOf(row)}`;
    },
    getBusinessData(res) {
      if (!res) return {};
      if (res.data && typeof res.data === "object") return res.data;
      return res;
    },
    syncFilterForm(formData) {
      this.filterForm = {
        orderNo: formData.orderNo || "",
        userNickname: formData.userNickname || "",
        userId: formData.userId || "",
        channel: formData.channel === 0 ? 0 : formData.channel || "",
        thirdOrderNo: formData.thirdOrderNo || "",
        createTimeRange: Array.isArray(formData.createTimeRange) ? formData.createTimeRange : [],
      };
    },
    buildQuery() {
      const query = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        orderNo: this.filterForm.orderNo || undefined,
        userNickname: this.filterForm.userNickname || undefined,
        thirdOrderNo: this.filterForm.thirdOrderNo || undefined,
      };
      const userId = String(this.filterForm.userId || "").trim();
      if (userId) query.userId = userId;
      if (this.filterForm.channel !== "" && this.filterForm.channel !== null && this.filterForm.channel !== undefined) {
        query.channel = this.filterForm.channel;
      }
      if (this.filterForm.createTimeRange.length === 2) {
        query.startTime = this.filterForm.createTimeRange[0];
        query.endTime = this.filterForm.createTimeRange[1];
      }
      Object.keys(query).forEach((key) => {
        if (query[key] === undefined || query[key] === "") delete query[key];
      });
      return query;
    },
    handleSearch(formData) {
      this.syncFilterForm(formData || {});
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset(formData) {
      this.syncFilterForm(formData || {});
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(pageNum) {
      this.pagination.pageNum = pageNum;
      this.fetchTableData();
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const res = await getUserWithdrawTaxList(this.buildQuery());
        const data = this.getBusinessData(res);
        const records = data.records || {};
        this.tableData = Array.isArray(records.rows) ? records.rows : [];
        this.pagination.total = Number(records.total || 0);
        this.summary = {
          withdrawAmount: data.summary ? data.summary.withdrawAmount : 0,
          taxAmount: data.summary ? data.summary.taxAmount : 0,
          serviceFee: data.summary ? data.summary.serviceFee : 0,
        };
      } catch (error) {
        console.error("获取纳税明细失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
        this.summary = { withdrawAmount: 0, taxAmount: 0, serviceFee: 0 };
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped lang="scss">
.tax-detail-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.search-module {
  flex-shrink: 0;

  ::v-deep .search-form-container {
    margin-bottom: 0;
  }

  ::v-deep .search-form .el-form-item {
    display: flex;
    align-items: center;

    .el-form-item__label {
      flex: 0 0 120px;
      width: 120px !important;
      padding-right: 12px;
      line-height: 40px;
      white-space: nowrap;
      text-align: left;
    }

    .el-form-item__content {
      flex: 1;
      margin-left: 0 !important;
      width: auto !important;
      min-width: 0;
    }
  }
}

.summary-bar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 24px 40px;
  margin: 16px 0;
  padding: 12px 16px;
  border-radius: 8px;
  background: #f3eaff;
  color: #6a35ff;
  font-size: 14px;
  font-weight: 600;
}

.list-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 24px;

  ::v-deep .el-card__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    padding: 20px 20px 0;
    box-sizing: border-box;
  }
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;

  ::v-deep .el-table {
    min-width: 1280px;
  }
}

.pagination-fixed {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 10px 0 16px;
  border-top: 1px solid #ebeef5;
}

.user-cell {
  line-height: 1.5;
}

.sub-text {
  color: #909399;
  font-size: 12px;
}
</style>
