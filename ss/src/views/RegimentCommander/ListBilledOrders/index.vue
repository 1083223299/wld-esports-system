<template>
  <div class="billed-order-page">
    <div class="search-module">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20" label-width="96px"
        :confirm-reset="false" @search="handleSearch" @reset="handleReset" />
    </div>

    <div class="summary-bar">
      <div class="summary-bar__value">净成交合计: {{ formatAmount(netTotalAmount) }}</div>
      <div class="summary-bar__note">统计当前筛选条件下，已出账订单的金额合计</div>
    </div>

    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <el-table v-loading="loading" :data="tableData" stripe :row-key="getRowKey" :border="false" height="100%"
          empty-text="暂无已出账订单" :default-sort="{ prop: 'settleTime', order: 'descending' }"
          :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }"
          :header-row-style="{ backgroundColor: '#F6F6FB' }">
          <el-table-column prop="orderId" label="订单号" min-width="240" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <span v-if="row.orderTypeLabel" class="order-tag">[{{ row.orderTypeLabel }}]</span>
              {{ row.orderId || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="团长名称" min-width="160" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.leaderDisplayName || row.leaderNickname || "-" }}</template>
          </el-table-column>
          <el-table-column v-if="!isGuildUser" label="所属公会" min-width="140" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.tradeName || row.tradeId || "-" }}</template>
          </el-table-column>
          <el-table-column prop="bossId" label="用户ID" width="120">
            <template slot-scope="{ row }">{{ row.bossId || "-" }}</template>
          </el-table-column>
          <el-table-column prop="bossNickname" label="用户名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.bossNickname || "-" }}</template>
          </el-table-column>
          <el-table-column prop="waiterId" label="陪陪ID" width="120">
            <template slot-scope="{ row }">{{ row.waiterId || "-" }}</template>
          </el-table-column>
          <el-table-column prop="waiterNickname" label="陪陪名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.waiterNickname || "-" }}</template>
          </el-table-column>
          <el-table-column prop="gameName" label="游戏名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.gameName || "-" }}</template>
          </el-table-column>
          <el-table-column prop="purchaseProduct" label="购买商品" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.purchaseProduct || "-" }}</template>
          </el-table-column>
          <el-table-column prop="netAmount" label="净交易金额" width="130">
            <template slot-scope="{ row }">{{ formatAmount(row.netAmount) }}</template>
          </el-table-column>
          <el-table-column prop="settleTime" label="出账时间" width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.settleTime || "-" }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { isGuildRole } from "@/utils/permission";
import { formatDateTime } from "@/utils/dateUtils";
import { getBilledOrderList } from "@/api/regimentCommander";

const getDefaultSettleRange = () => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  return [formatDateTime(start), formatDateTime(end)];
};

export default {
  name: "ListBilledOrders",
  components: {
    SearchForm,
    PaginationSimple,
  },
  data() {
    const settleRange = getDefaultSettleRange();
    return {
      filterForm: {
        orderId: "",
        boundLeaderStatus: 0,
        leaderId: "",
        leaderNickname: "",
        tradeId: "",
        bossId: "",
        bossNickname: "",
        waiterId: "",
        waiterNickname: "",
        settleTimeRange: settleRange,
      },
      searchItems: [],
      tableData: [],
      loading: false,
      netTotalAmount: 0,
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
    };
  },
  computed: {
    isGuildUser() {
      return isGuildRole();
    },
  },
  created() {
    this.searchItems = this.buildSearchItems();
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    buildSearchItems() {
      const items = [
        {
          type: "input",
          prop: "orderId",
          label: "订单号",
          placeholder: "请输入订单号",
          clearable: true,
        },
        {
          type: "select",
          prop: "boundLeaderStatus",
          label: "是否绑定团长",
          placeholder: "请选择",
          clearable: true,
          options: [
            { label: "全部", value: 0 },
            { label: "已绑定", value: 1 },
            { label: "未绑定", value: 2 },
          ],
        },
        {
          type: "input",
          prop: "leaderId",
          label: "团长ID",
          placeholder: "请输入团长ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "leaderNickname",
          label: "团长名称",
          placeholder: "请输入团长名称",
          clearable: true,
        },
      ];
      if (!this.isGuildUser) {
        items.push({
          type: "input",
          prop: "tradeId",
          label: "公会ID",
          placeholder: "请输入公会ID",
          clearable: true,
        });
      }
      items.push(
        {
          type: "input",
          prop: "bossId",
          label: "用户ID",
          placeholder: "请输入用户ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "bossNickname",
          label: "用户名称",
          placeholder: "请输入用户名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "waiterId",
          label: "陪陪ID",
          placeholder: "请输入陪陪ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "waiterNickname",
          label: "陪陪名称",
          placeholder: "请输入陪陪名称",
          clearable: true,
        },
        {
          type: "daterange",
          prop: "settleTimeRange",
          label: "出账时间",
          startPlaceholder: "开始时间",
          endPlaceholder: "结束时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          maxRangeDays: 90,
          defaultValue: getDefaultSettleRange(),
          clearable: false,
        }
      );
      return items;
    },
    getBusinessData(res) {
      if (!res) return {};
      if (res.data && typeof res.data === "object") return res.data;
      return res;
    },
    getRowKey(row) {
      const index = this.tableData.indexOf(row);
      return row.orderId || `${this.pagination.pageNum}-${index}`;
    },
    formatAmount(value) {
      const number = Number(value);
      return `¥${(Number.isFinite(number) ? number : 0).toFixed(2)}`;
    },
    syncFilterForm(formData) {
      this.filterForm = {
        orderId: formData.orderId || "",
        boundLeaderStatus: formData.boundLeaderStatus === "" || formData.boundLeaderStatus == null
          ? 0
          : formData.boundLeaderStatus,
        leaderId: formData.leaderId || "",
        leaderNickname: formData.leaderNickname || "",
        tradeId: formData.tradeId || "",
        bossId: formData.bossId || "",
        bossNickname: formData.bossNickname || "",
        waiterId: formData.waiterId || "",
        waiterNickname: formData.waiterNickname || "",
        settleTimeRange: Array.isArray(formData.settleTimeRange) && formData.settleTimeRange.length === 2
          ? formData.settleTimeRange
          : getDefaultSettleRange(),
      };
    },
    handleSearch(formData) {
      this.syncFilterForm(formData || {});
      this.pagination.pageNum = 1;
      this.fetchData();
    },
    handleReset(formData) {
      const resetData = {
        ...(formData || {}),
        settleTimeRange: getDefaultSettleRange(),
        boundLeaderStatus: 0,
      };
      if (this.$refs.searchForm) {
        this.$refs.searchForm.setFormData(resetData);
      }
      this.syncFilterForm(resetData);
      this.pagination.pageNum = 1;
      this.fetchData();
    },
    handleCurrentChange(pageNum) {
      this.pagination.pageNum = pageNum;
      this.fetchData();
    },
    buildQuery() {
      const query = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        orderId: this.filterForm.orderId || undefined,
        boundLeaderStatus: this.filterForm.boundLeaderStatus || 0,
        leaderId: this.filterForm.leaderId || undefined,
        leaderNickname: this.filterForm.leaderNickname || undefined,
        bossId: this.filterForm.bossId || undefined,
        bossNickname: this.filterForm.bossNickname || undefined,
        waiterId: this.filterForm.waiterId || undefined,
        waiterNickname: this.filterForm.waiterNickname || undefined,
      };
      if (!this.isGuildUser && this.filterForm.tradeId) {
        query.tradeId = this.filterForm.tradeId;
      }
      if (this.filterForm.settleTimeRange.length === 2) {
        query.settleTimeStart = this.filterForm.settleTimeRange[0];
        query.settleTimeEnd = this.filterForm.settleTimeRange[1];
      }
      Object.keys(query).forEach((key) => {
        if (query[key] === undefined || query[key] === "") delete query[key];
      });
      return query;
    },
    async fetchData() {
      this.loading = true;
      try {
        const res = await getBilledOrderList(this.buildQuery());
        const data = this.getBusinessData(res);
        const page = data.page || data;
        this.tableData = Array.isArray(page.rows) ? page.rows : [];
        this.pagination.total = Number(page.total || 0);
        this.netTotalAmount = Number(data.netTotalAmount || 0);
      } catch (error) {
        console.error("查询已出账订单失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
        this.netTotalAmount = 0;
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.billed-order-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

.search-module,
.summary-bar {
  flex-shrink: 0;
}

.summary-bar {
  margin-bottom: 16px;
  padding: 16px 20px;
  border-radius: 16px;
  background: #fff;
}

.summary-bar__value {
  color: #1d2129;
  font-size: 18px;
  font-weight: 600;
}

.summary-bar__note {
  margin-top: 4px;
  color: #86909c;
  font-size: 12px;
}

.list-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 24px;
}

::v-deep .list-card>.el-card__body {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 20px 0;
  box-sizing: border-box;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.order-tag {
  margin-right: 4px;
  color: #6a35ff;
}

.pagination-fixed {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 10px 0;
  border-top: 1px solid #ebeef5;
}

::v-deep .el-table {
  color: #4e5969;
}
</style>
