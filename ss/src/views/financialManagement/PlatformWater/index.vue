<template>
  <div class="container">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule" class="search-panel">
      <SearchForm
        ref="searchForm"
        :fields="safeSearchItems"
        :initial-values="filterForm"
        :gutter="20"
        label-width="88px"
        :confirm-reset="false"
        @search="handleSearch"
        @reset="handleReset"
      />
      <!-- <el-button
        type="primary"
        class="export-button"
        icon="el-icon-download"
        :loading="exportLoading"
        @click="handleExport"
      >
        导出
      </el-button> -->
    </div>

    <!-- 统计卡片区域 -->
    <!-- <div class="stats-wrap">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-icon-box income-bg">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">总收入</span>
            <div class="stat-row">
              <span class="stat-num income">+{{ formatAmount(statsData.totalIncome) }}</span>
              <span class="stat-extra">{{ statsData.incomeCount }} 笔</span>
            </div>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon-box expense-bg">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">总支出</span>
            <div class="stat-row">
              <span class="stat-num expense">-{{ formatAmount(statsData.totalExpense) }}</span>
              <span class="stat-extra">{{ statsData.expenseCount }} 笔</span>
            </div>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon-box refund-bg">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">退款金额</span>
            <div class="stat-row">
              <span class="stat-num refund">-{{ formatAmount(statsData.refundAmount) }}</span>
              <span class="stat-extra">{{ statsData.refundCount }} 笔</span>
            </div>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon-box net-bg">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">净额</span>
            <div class="stat-row">
              <span class="stat-num" :class="statsData.netAmount >= 0 ? 'income' : 'expense'">
                {{ statsData.netAmount >= 0 ? "+" : "-" }}{{ formatAmount(Math.abs(statsData.netAmount)) }}
              </span>
              <span class="stat-extra">{{ statsData.netCount }} 笔</span>
            </div>
          </div>
        </div>
      </div>
    </div> -->

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <el-table
          ref="platformFlowTable"
          :data="tableData"
          stripe
          :row-key="getRowKey"
          v-loading="loading"
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <!-- <el-table-column label="用户ID" width="130" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ getUserId(row) }}
            </template>
          </el-table-column>

          <el-table-column label="用户昵称" width="140" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ getUserName(row) }}
            </template>
          </el-table-column> -->

          <el-table-column prop="code" label="流水号" min-width="190" show-overflow-tooltip />

          <el-table-column label="流水类型" width="130">
            <template slot-scope="{ row }">
              <el-tag :type="getFlowTypeTag(row.flowType)" size="small">
                {{ getFlowTypeText(row.flowType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="收支方向" width="100">
            <template slot-scope="{ row }">
              <el-tag :type="getDirectionTag(row.direction)" size="small">
                {{ getDirectionText(row.direction) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="支付方式" width="120">
            <template slot-scope="{ row }">
              {{ getPaymentChannelText(row.paymentChannel) }}
            </template>
          </el-table-column>

          <el-table-column label="金额" width="120">
            <template slot-scope="{ row }">
              <span class="amount-text" :class="getAmountClass(row.direction)">
                {{ getAmountSign(row.direction) }}{{ formatAmount(Math.abs(Number(row.amount) || 0)) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="createTime" label="创建时间" width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.createTime || "-" }}
            </template>
          </el-table-column>

          <el-table-column prop="operator" label="操作人" width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.operator || "-" }}
            </template>
          </el-table-column>

          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.remark || "-" }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <div class="pagination-remake">备注：支付方式未来币为平台虚拟币预充值或消费；其他均为现金</div>
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
import { PlatformFlowExport, PlatformFlowList } from "@/api/orderFlow";

const FLOW_TYPE_OPTIONS = [
  { label: "全部", value: "" },
  { label: "未来币充值", value: "1" },
  { label: "订单收入", value: "2" },
  { label: "工会提现", value: "3" },
  { label: "陪陪佣金", value: "4" },
  { label: "未来币退款", value: "5" },
  { label: "订单退款", value: "6" },
  { label: "活动收益", value: "14" },
];

const FLOW_TYPE_MAP = {
  "1": { label: "未来币充值", type: "success" },
  "2": { label: "订单收入", type: "success" },
  "3": { label: "工会提现", type: "warning" },
  "4": { label: "陪陪佣金", type: "info" },
  "5": { label: "未来币退款", type: "danger" },
  "6": { label: "订单退款", type: "danger" },
  "14": { label: "活动收益", type: "warning" },
};

const DIRECTION_MAP = {
  "0": { label: "收入", type: "success" },
  "1": { label: "支出", type: "danger" },
};

const PAYMENT_CHANNEL_MAP = {
  "0": "淘宝",
  "1": "未来币",
  "2": "Apple",
  "3": "支付宝",
};

const EMPTY_SUMMARY = {
  totalIncome: 0,
  incomeCount: 0,
  totalExpense: 0,
  expenseCount: 0,
  refundAmount: 0,
  refundCount: 0,
  netAmount: 0,
  netCount: 0,
};

export default {
  name: "PlatformFlowList",
  components: {
    SearchForm,
    PaginationSimple,
  },
  data() {
    return {
      searchItems: [
        // {
        //   type: "input",
        //   prop: "userId",
        //   inputType: "integer",
        //   label: "用户ID",
        //   placeholder: "请输入用户ID",
        //   clearable: true,
        // },
        // {
        //   type: "input",
        //   prop: "userName",
        //   label: "用户昵称",
        //   placeholder: "请输入用户昵称",
        //   clearable: true,
        // },
        {
          type: "input",
          prop: "code",
          label: "流水号",
          placeholder: "请输入流水号",
          clearable: true,
        },
        {
          type: "select",
          prop: "flowType",
          label: "流水类型",
          placeholder: "请选择流水类型",
          options: FLOW_TYPE_OPTIONS,
          clearable: true,
          multiple: true,
        },
        {
          type: "select",
          prop: "direction",
          label: "收支方向",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "收入", value: "0" },
            { label: "支出", value: "1" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "paymentChannel",
          label: "支付方式",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "淘宝", value: "0" },
            { label: "Apple", value: "2" },
            { label: "支付宝", value: "3" },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "createTimeRange",
          label: "创建时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          maxRangeDays: 93,
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
              {
                text: "最近三个月",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 90);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
            ],
          },
        },
      ],
      filterForm: {
        userId: "",
        userName: "",
        code: "",
        flowType: [],
        direction: "",
        paymentChannel: "",
        createTimeRange: [],
        startTime: "",
        endTime: "",
      },
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      tableData: [],
      loading: false,
      exportLoading: false,
      statsData: { ...EMPTY_SUMMARY },
    };
  },
  mounted() {
    this.fetchTableData();
  },
  computed: {
    safeSearchItems() {
      return this.searchItems
        .filter((item) => item && item.prop)
        .map((item) => {
          if (["select", "radio", "tree-select"].includes(item.type)) {
            return {
              ...item,
              options: Array.isArray(item.options)
                ? item.options.filter((option) => option && Object.prototype.hasOwnProperty.call(option, "value"))
                : [],
            };
          }
          return item;
        });
    },
  },
  methods: {
    getFlowTypeText(type) {
      return FLOW_TYPE_MAP[String(type)]?.label || "-";
    },
    getFlowTypeTag(type) {
      return FLOW_TYPE_MAP[String(type)]?.type || "info";
    },
    getDirectionText(direction) {
      return DIRECTION_MAP[String(direction)]?.label || "-";
    },
    getDirectionTag(direction) {
      return DIRECTION_MAP[String(direction)]?.type || "info";
    },
    getPaymentChannelText(channel) {
      return PAYMENT_CHANNEL_MAP[String(channel)] || "-";
    },
    getAmountSign(direction) {
      return String(direction) === "1" ? "-" : "+";
    },
    getAmountClass(direction) {
      return String(direction) === "1" ? "expense" : "income";
    },
    getRowKey(row) {
      if (!row) {
        return `empty-${this.pagination.pageNum}`;
      }
      const index = this.tableData.indexOf(row);
      const rowIndex = index > -1 ? index : 0;
      const code = row.code || row.id || row.flowId || "no-code";
      return `${code}-${this.pagination.pageNum}-${rowIndex}`;
    },
    getUserId(row) {
      if (!row) {
        return "-";
      }
      return row.waiterId || row.userId || "-";
    },
    getUserName(row) {
      if (!row) {
        return "-";
      }
      return row.waiterName || row.userName || row.nickName || "-";
    },
    formatAmount(amount) {
      if (amount === null || amount === undefined || amount === "") {
        return "0.00";
      }
      const num = Number(amount);
      return Number.isNaN(num) ? "0.00" : num.toFixed(2);
    },
    formatFlowTypeParam(flowType) {
      if (Array.isArray(flowType)) {
        return flowType.filter(Boolean).join(",");
      }
      return flowType || "";
    },
    buildQueryParams(includePage = true) {
      const params = {
        userId: this.filterForm.userId || undefined,
        userName: this.filterForm.userName || undefined,
        code: this.filterForm.code || undefined,
        flowType: this.formatFlowTypeParam(this.filterForm.flowType) || undefined,
        direction: this.filterForm.direction || undefined,
        paymentChannel: this.filterForm.paymentChannel || undefined,
        startTime: this.filterForm.startTime || undefined,
        endTime: this.filterForm.endTime || undefined,
      };

      if (includePage) {
        params.pageNum = this.pagination.pageNum;
        params.pageSize = this.pagination.pageSize;
      }

      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      return params;
    },
    getBusinessData(res) {
      if (!res) {
        return {};
      }
      if (res.data && !(res.data instanceof Blob)) {
        return res.data.data || res.data;
      }
      return res.data || res;
    },
    isSuccessResponse(data) {
      if (!data) {
        return false;
      }
      if (String(data.code) === "200" || data.success === true || data.errorCode === "0") {
        return true;
      }
      return Array.isArray(data.rows) || Boolean(data.summary);
    },
    getResponseMessage(data, fallback) {
      return data?.errorMessage || data?.msg || fallback;
    },
    normalizeSummary(summary) {
      return {
        ...EMPTY_SUMMARY,
        ...(summary || {}),
      };
    },
    syncFilterForm(formData) {
      const createTimeRange = Array.isArray(formData.createTimeRange)
        ? formData.createTimeRange
        : [];
      this.filterForm = {
        ...this.filterForm,
        userId: formData.userId || "",
        userName: formData.userName || "",
        code: formData.code || "",
        flowType: Array.isArray(formData.flowType) ? formData.flowType : [],
        direction: formData.direction || "",
        paymentChannel: formData.paymentChannel || "",
        createTimeRange,
        startTime: createTimeRange.length === 2 ? createTimeRange[0] : "",
        endTime: createTimeRange.length === 2 ? createTimeRange[1] : "",
      };
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
    async fetchTableData() {
      this.loading = true;
      try {
        const response = await PlatformFlowList(this.buildQueryParams(true));
        const data = this.getBusinessData(response);
        if (!this.isSuccessResponse(data)) {
          this.$message.error(this.getResponseMessage(data, "查询失败"));
          return;
        }
        this.tableData = Array.isArray(data.rows) ? data.rows.filter(Boolean) : [];
        this.pagination.total = Number(data.total || 0);
        this.statsData = this.normalizeSummary(data.summary);
        this.$nextTick(() => {
          if (this.$refs.platformFlowTable) {
            this.$refs.platformFlowTable.doLayout();
          }
        });
      } catch (error) {
        console.error("获取平台流水列表失败:", error);
        this.$message.error("获取平台流水列表失败");
      } finally {
        this.loading = false;
      }
    },
    async handleExport() {
      this.exportLoading = true;
      try {
        const response = await PlatformFlowExport(this.buildQueryParams(false));
        await this.downloadExportResponse(response);
        this.$message.success("导出成功");
      } catch (error) {
        console.error("导出平台流水失败:", error);
        this.$message.error("导出失败");
      } finally {
        this.exportLoading = false;
      }
    },
    async downloadExportResponse(response) {
      const blob = response?.data instanceof Blob ? response.data : response;
      if (!(blob instanceof Blob)) {
        const data = this.getBusinessData(response);
        if (data?.downloadUrl) {
          window.open(data.downloadUrl, "_blank");
          return;
        }
        throw new Error("导出响应格式错误");
      }

      if (blob.type && blob.type.indexOf("application/json") > -1) {
        const text = await blob.text();
        const data = text ? JSON.parse(text) : {};
        if (data.downloadUrl) {
          window.open(data.downloadUrl, "_blank");
          return;
        }
        if (!this.isSuccessResponse(data)) {
          throw new Error(this.getResponseMessage(data, "导出失败"));
        }
      }

      const fileName = this.getExportFileName(response) || `平台流水_${this.formatDateForFile(new Date())}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    getExportFileName(response) {
      const disposition = response?.headers?.["content-disposition"] || response?.headers?.["Content-Disposition"];
      if (!disposition) {
        return "";
      }
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        return decodeURIComponent(utf8Match[1]);
      }
      const fileNameMatch = disposition.match(/filename="?([^";]+)"?/i);
      return fileNameMatch && fileNameMatch[1] ? decodeURIComponent(fileNameMatch[1]) : "";
    },
    formatDateForFile(date) {
      const pad = (num) => String(num).padStart(2, "0");
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.tableData = [];
      this.fetchTableData();
    },
  },
};
</script>

<style scoped>
.container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-panel {
  position: relative;
  flex-shrink: 0;
}

.export-button {
  position: absolute;
  right: 222px;
  bottom: 28px;
  width: 93px;
  height: 40px;
  padding: 0;
  border-radius: 8px;
  background-color: #10b981;
  border-color: #10b981;
}

.export-button:hover,
.export-button:focus {
  background-color: #0ea572;
  border-color: #0ea572;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border-radius: 12px;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
  position: relative;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pagination-remake {
  color: #b10505;
  font-size: 14px;
}

.stats-wrap {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 12px 14px;
  transition: box-shadow 0.2s;
}

.stat-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.income-bg {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.expense-bg {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.refund-bg {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.net-bg {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
}

.stat-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  line-height: 1;
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  line-height: 1.3;
}

.stat-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-num.income,
.amount-text.income {
  color: #67c23a;
}

.stat-num.expense,
.amount-text.expense {
  color: #f56c6c;
}

.stat-num.refund {
  color: #e6a23c;
}

.stat-extra {
  font-size: 12px;
  color: #909399;
  line-height: 1;
  flex-shrink: 0;
}

.amount-text {
  font-weight: 500;
}

@media screen and (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .export-button {
    position: static;
    display: flex;
    margin: -8px 24px 16px auto;
  }
}

@media screen and (max-width: 768px) {
  .container {
    padding: 12px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .pagination-fixed {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
