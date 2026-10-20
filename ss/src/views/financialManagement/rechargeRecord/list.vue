<template>
  <div class="list-wrapper">
    <div class="search-module">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="queryForm"
        :gutter="20"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <el-table
          v-loading="loading"
          :data="tableData"
          stripe
          style="width: 100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="orderNo" label="订单号" min-width="180" show-overflow-tooltip />
          <el-table-column prop="userName" label="用户名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.userName || "-" }}
            </template>
          </el-table-column>
          <el-table-column prop="userId" label="用户ID" min-width="120" />
          <el-table-column label="充值比例" min-width="140">
            <template slot-scope="{ row }">
              {{ formatRatio(row.rechargeRatio) }}
            </template>
          </el-table-column>
          <el-table-column label="充值金额" min-width="120" align="right">
            <template slot-scope="{ row }">
              ¥{{ formatAmount(row.amount) }}
            </template>
          </el-table-column>
          <el-table-column label="获得未来币" min-width="120" align="right">
            <template slot-scope="{ row }">
              {{ formatAmount(row.wlbCoin) }}
            </template>
          </el-table-column>
          <el-table-column label="支付方式" min-width="120">
            <template slot-scope="{ row }">
              {{ getPaymentMethodText(row.paymentChannel) }}
            </template>
          </el-table-column>
          <el-table-column label="支付渠道" min-width="100">
            <template slot-scope="{ row }">
              <el-tag :type="getPayChannelTag(row.payChannel)" size="small">
                {{ getPayChannelText(row.payChannel) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="订单状态" min-width="130">
            <template slot-scope="{ row }">
              <el-tag :type="getOrderStatusTag(row.orderStatus)" size="small">
                {{ getOrderStatusText(row.orderStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="支付时间" min-width="160" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.createTime || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="88" fixed="right">
            <template slot-scope="{ row }">
              <el-button
                v-permission="'system:rechargeRecord:detail'"
                type="text"
                class="action-button"
                @click="handleDetail(row)"
              >
                详情
              </el-button>
            </template>
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
import { RechargeOrderList } from "@/api/orderFlow";
import {
  ORDER_STATUS_MAP,
  PAY_CHANNEL_MAP,
  PAYMENT_METHOD_MAP,
} from "./constants";

export default {
  name: "ListCompanion",
  components: {
    SearchForm,
    PaginationSimple,
  },
  inject: ["switchToEdit", "getSharedData"],
  data() {
    return {
      queryForm: {
        orderNo: "",
        userId: "",
        payChannel: "",
        orderStatus: "",
        payTimeRange: [],
        startTime: "",
        endTime: "",
      },
      searchItems: [
        {
          type: "input",
          prop: "orderNo",
          label: "订单号",
          placeholder: "请输入订单号",
          clearable: true,
        },
        {
          type: "input",
          prop: "userId",
          label: "用户ID",
          placeholder: "请输入用户ID",
          clearable: true,
          inputType: "number",
        },
        {
          type: "select",
          prop: "payChannel",
          label: "支付渠道",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "小程序", value: "1" },
            { label: "安卓", value: "2" },
            { label: "iOS", value: "3" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "orderStatus",
          label: "订单状态",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "充值成功", value: "1" },
            { label: "充值部分退款", value: "12" },
            { label: "退款成功", value: "11" },
            { label: "退款失败", value: "1111" },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "payTimeRange",
          label: "支付时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          maxRangeDays: 31,
          pickerOptions: {
            shortcuts: [
              {
                text: "最近一周",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 7);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
              {
                text: "最近一个月",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 30);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
            ],
          },
        },
      ],
      tableData: [],
      loading: false,
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
    };
  },
  mounted() {
    this.fetchTableData();
  },
  activated() {
    const sharedData = this.getSharedData();
    if (sharedData.needRefreshList) {
      sharedData.needRefreshList = false;
      this.fetchTableData();
    }
  },
  methods: {
    isRequestSuccess(res) {
      if (typeof res?.success === "boolean") {
        return res.success;
      }
      if (typeof res?.data?.success === "boolean") {
        return res.data.success;
      }
      return false;
    },
    getResponseData(res) {
      if (typeof res?.success === "boolean") {
        return res.data;
      }
      if (typeof res?.data?.success === "boolean") {
        return res.data.data;
      }
      return res?.data;
    },
    getResponseMessage(res, fallback) {
      return res?.errorMessage || res?.msg || res?.data?.errorMessage || fallback;
    },
    formatAmount(amount) {
      if (amount === null || amount === undefined || amount === "") {
        return "0.00";
      }
      const num = Number(amount);
      return Number.isNaN(num) ? "0.00" : num.toFixed(2);
    },
    formatRatio(value) {
      if (value === null || value === undefined || value === "") {
        return "-";
      }
      if (typeof value === "string" && value.includes(":")) {
        return value;
      }
      const num = Number(value);
      if (Number.isNaN(num)) {
        return String(value);
      }
      return `1元=${String(num).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")}未来币`;
    },
    getPaymentMethodText(method) {
      return PAYMENT_METHOD_MAP[String(method)] || method || "-";
    },
    getPayChannelText(channel) {
      return PAY_CHANNEL_MAP[String(channel)] || channel || "-";
    },
    getPayChannelTag(channel) {
      const map = {
        "1": "warning",
        "2": "success",
        "3": "info",
      };
      return map[String(channel)] || "info";
    },
    getOrderStatusText(status) {
      return ORDER_STATUS_MAP[String(status)]?.label || status || "-";
    },
    getOrderStatusTag(status) {
      return ORDER_STATUS_MAP[String(status)]?.type || "info";
    },
    buildQueryParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        orderNo: this.queryForm.orderNo || undefined,
        userId: this.queryForm.userId || undefined,
        payChannel: this.queryForm.payChannel || undefined,
        orderStatus: this.queryForm.orderStatus || undefined,
        startTime: this.queryForm.startTime || undefined,
        endTime: this.queryForm.endTime || undefined,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      return params;
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const res = await RechargeOrderList(this.buildQueryParams());
        if (this.isRequestSuccess(res)) {
          const data = this.getResponseData(res) || {};
          this.tableData = Array.isArray(data.rows) ? data.rows : [];
          this.pagination.total = Number(data.total) || 0;
        } else {
          this.tableData = [];
          this.pagination.total = 0;
          this.$message.error(this.getResponseMessage(res, "查询充值记录失败"));
        }
      } catch (error) {
        console.error("获取充值记录列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
        this.$message.error("获取充值记录列表失败");
      } finally {
        this.loading = false;
      }
    },
    handleSearch(formData) {
      this.queryForm = {
        ...this.queryForm,
        orderNo: formData.orderNo || "",
        userId: formData.userId || "",
        payChannel: formData.payChannel || "",
        orderStatus: formData.orderStatus || "",
        payTimeRange: Array.isArray(formData.payTimeRange) ? formData.payTimeRange : [],
        startTime:
          Array.isArray(formData.payTimeRange) && formData.payTimeRange.length === 2
            ? formData.payTimeRange[0]
            : "",
        endTime:
          Array.isArray(formData.payTimeRange) && formData.payTimeRange.length === 2
            ? formData.payTimeRange[1]
            : "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.queryForm = {
        orderNo: "",
        userId: "",
        payChannel: "",
        orderStatus: "",
        payTimeRange: [],
        startTime: "",
        endTime: "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(pageNum) {
      this.pagination.pageNum = pageNum;
      this.fetchTableData();
    },
    handleDetail(row) {
      this.switchToEdit(row);
    },
  },
};
</script>

<style scoped lang="scss">
.list-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-module {
  flex-shrink: 0;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 24px;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 0;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.pagination-fixed {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
}

.action-button {
  padding: 0;
  color: #409eff;
}

.el-tag {
  border-width: 0;
}

.el-tag--success {
  background-color: rgba(27, 194, 134, 0.1);
  color: #1bc286;
}

.el-tag--warning {
  background-color: rgba(255, 129, 7, 0.1);
  color: #ff8107;
}

.el-tag--danger {
  background-color: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.el-tag--info {
  background-color: rgba(144, 147, 153, 0.1);
  color: #909399;
}
</style>
