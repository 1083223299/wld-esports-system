<template>
  <div class="container">
    <div class="hero-tabs" role="tablist" aria-label="陪陪流水类型">
      <button
        type="button"
        class="hero-tab"
        :class="{ 'is-active': activeTab === 'wallet' }"
        role="tab"
        :aria-selected="activeTab === 'wallet'"
        @click="switchTab('wallet')"
      >
        <div class="hero-tab__icon">
          <i class="el-icon-wallet" />
        </div>
        <div class="hero-tab__body">
          <div class="hero-tab__title">
            钱包流水
            <em v-if="activeTab === 'wallet'">当前</em>
          </div>
          <!-- <div class="hero-tab__desc">陪陪账户收支明细</div> -->
        </div>
        <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
      </button>
      <button
        type="button"
        class="hero-tab"
        :class="{ 'is-active': activeTab === 'tax' }"
        role="tab"
        :aria-selected="activeTab === 'tax'"
        @click="switchTab('tax')"
      >
        <div class="hero-tab__icon">
          <i class="el-icon-document" />
        </div>
        <div class="hero-tab__body">
          <div class="hero-tab__title">
            纳税明细
            <em v-if="activeTab === 'tax'">当前</em>
          </div>
          <!-- <div class="hero-tab__desc">云账户代发成功提现记录</div> -->
        </div>
        <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
      </button>
    </div>

    <div v-show="activeTab === 'wallet'" class="tab-panel">
          <div class="search-module">
            <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
              @search="handleSearch" @reset="handleReset" />
          </div>

          <el-card class="list-card" shadow="never">
            <div ref="tableWrapper" class="table-wrapper">
              <el-table v-loading="loading" :data="tableData" stripe row-key="code" :border="false"
                :height="tableHeight"
                :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                :header-cell-style="{ textAlign: 'center' }">
                <el-table-column prop="code" label="流水号" min-width="180" show-overflow-tooltip />

                <el-table-column label="陪陪信息" min-width="180">
                  <template slot-scope="{ row }">
                    <div class="user-cell">
                      <div>{{ row.waiterName || "-" }}</div>
                      <div class="sub-text">陪陪ID：{{ row.waiterId || "-" }}</div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="陪陪类型" width="120">
                  <template slot-scope="{ row }">
                    <el-tag :type="getUserIdentificationTag(row.userIdentification)" size="small">
                      {{ getUserIdentificationText(row.userIdentification) }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="所属公会" min-width="180">
                  <template slot-scope="{ row }">
                    <div v-if="showUnionInfo(row)" class="user-cell">
                      <div>{{ row.unionName || "-" }}</div>
                      <div class="sub-text">公会ID：{{ row.tradeId || "-" }}</div>
                    </div>
                    <span v-else>-</span>
                  </template>
                </el-table-column>

                <el-table-column label="商户名称" min-width="160" show-overflow-tooltip>
                  <template slot-scope="{ row }">
                    {{ row.merchantName || "-" }}
                  </template>
                </el-table-column>

                <el-table-column label="流水类型" width="120">
                  <template slot-scope="{ row }">
                    <el-tag :type="getFlowTypeTag(row.flowType)" size="small">
                      {{ getFlowTypeText(row.flowType) }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="渠道" width="120">
                  <template slot-scope="{ row }">
                    <el-tag :type="getSourceChannelTag(row.sourceChannel)" size="small">
                      {{ getSourceChannelText(row.sourceChannel) }}
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

                <el-table-column label="交易金额" width="120" align="right">
                  <template slot-scope="{ row }">
                    {{ row.direction == '0' ? '+' : '-' }}{{ formatAmount(row.balance) }}
                  </template>
                </el-table-column>

                <el-table-column prop="operation" label="操作人" width="140" show-overflow-tooltip>
                  <template slot-scope="{ row }">
                    {{ row.operation || "-" }}
                  </template>
                </el-table-column>

                <el-table-column prop="createTime" label="创建时间" width="180" show-overflow-tooltip>
                  <template slot-scope="{ row }">
                    {{ row.createTime || "-" }}
                  </template>
                </el-table-column>

                <el-table-column prop="content" label="备注" min-width="180" show-overflow-tooltip>
                  <template slot-scope="{ row }">
                    {{ row.content || "-" }}
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="pagination-fixed">
              <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize"
                :total="pagination.total" @current-change="handleCurrentChange" />
            </div>
          </el-card>
    </div>

    <TaxDetailList ref="taxDetailList" v-if="taxInited" v-show="activeTab === 'tax'" class="tab-panel" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import TaxDetailList from "./TaxDetailList.vue";
import { AccompanyWaterList } from "@/api/orderFlow";

const USER_IDENTIFICATION_MAP = {
  "1": { label: "个人陪陪", type: "info" },
  "2": { label: "公会陪陪", type: "warning" },
  "3": { label: "商户公会陪陪", type: "success" },
};

const SOURCE_CHANNEL_OPTIONS = [
  { label: "全部", value: "" },
  { label: "app-安卓", value: "app_android" },
  { label: "app-ios", value: "app_ios" },
  { label: "商户淘宝", value: "merchant_tb_xcx" },
  { label: "未来洞淘宝", value: "tb_xcx" },
];

const SOURCE_CHANNEL_MAP = {
  app_android: { label: "app-安卓", type: "info" },
  app_ios: { label: "app-ios", type: "info" },
  merchant_tb_xcx: { label: "商户淘宝", type: "warning" },
  tb_xcx: { label: "未来洞淘宝", type: "success" },
  android: { label: "app-安卓", type: "info" },
  ios: { label: "app-ios", type: "info" },
};

const FLOW_TYPE_MAP = {
  "1": { label: "订单收入", type: "success" },
  "2": { label: "提现", type: "warning" },
  "3": { label: "退款", type: "danger" },
};

const DIRECTION_MAP = {
  "0": { label: "收入", type: "success" },
  "1": { label: "支出", type: "danger" },
};

export default {
  name: "AccompanyWaterList",
  components: {
    SearchForm,
    PaginationSimple,
    TaxDetailList,
  },
  data() {
    return {
      activeTab: "wallet",
      taxInited: false,
      searchItems: [
        {
          type: "input",
          prop: "code",
          label: "流水号",
          placeholder: "请输入流水号",
          clearable: true,
        },
        {
          type: "input",
          prop: "waiterName",
          label: "陪陪名称",
          placeholder: "请输入陪陪名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "waiterId",
          label: "陪陪ID",
          placeholder: "请输入陪陪ID",
          inputType: "integer",
          clearable: true,
        },
        {
          type: "select",
          prop: "userIdentification",
          label: "陪陪类型",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "个人陪陪", value: "1" },
            { label: "公会陪陪", value: "2" },
            { label: "商户公会陪陪", value: "3" },
          ],
          clearable: true,
        },
        {
          type: "input",
          prop: "merchantName",
          label: "商户名称",
          placeholder: "请输入商户名称",
          clearable: true,
        },
        {
          type: "select",
          prop: "sourceChannel",
          label: "渠道",
          placeholder: "全部",
          options: SOURCE_CHANNEL_OPTIONS,
          clearable: true,
        },
        {
          type: "select",
          prop: "flowType",
          label: "流水类型",
          placeholder: "请选择流水类型",
          options: [
            { label: "全部", value: "" },
            { label: "订单收入", value: "1" },
            { label: "提现", value: "2" },
            { label: "退款", value: "3" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "direction",
          label: "收支方向",
          placeholder: "请选择收支方向",
          options: [
            { label: "全部", value: "" },
            { label: "收入", value: "0" },
            { label: "支出", value: "1" },
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
      filterForm: {
        code: "",
        waiterName: "",
        waiterId: "",
        userIdentification: "",
        merchantName: "",
        sourceChannel: "",
        flowType: "",
        direction: "",
        createTimeRange: [],
        startTime: "",
        endTime: "",
      },
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      tableData: [],
      loading: false,
      tableHeight: 400,
    };
  },
  mounted() {
    this.setTableHeight();
    window.addEventListener("resize", this.setTableHeight);
    this.fetchTableData();
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
    getUserIdentificationText(type) {
      return USER_IDENTIFICATION_MAP[String(type)]?.label || "-";
    },
    getUserIdentificationTag(type) {
      return USER_IDENTIFICATION_MAP[String(type)]?.type || "info";
    },
    normalizeSourceChannel(channel) {
      const value = String(channel || "").trim();
      if (value === "android") return "app_android";
      if (value === "ios") return "app_ios";
      return value;
    },
    getSourceChannelText(channel) {
      const key = this.normalizeSourceChannel(channel);
      return SOURCE_CHANNEL_MAP[key]?.label || key || "-";
    },
    getSourceChannelTag(channel) {
      const key = this.normalizeSourceChannel(channel);
      return SOURCE_CHANNEL_MAP[key]?.type || "info";
    },
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
    showUnionInfo(row) {
      return ["2", "3"].includes(String(row.userIdentification)) && (row.unionName || row.tradeId);
    },
    formatAmount(amount) {
      if (amount === null || amount === undefined || amount === "") {
        return "0.00";
      }
      const num = Number(amount);
      return Number.isNaN(num) ? "0.00" : num.toFixed(2);
    },
    getTableResponseData(res) {
      if (Array.isArray(res?.rows) || typeof res?.total !== "undefined") {
        return res;
      }
      if (Array.isArray(res?.data?.rows) || typeof res?.data?.total !== "undefined") {
        return res.data;
      }
      return {};
    },
    getResponseMessage(res, fallback) {
      return res?.errorMessage || res?.msg || res?.data?.errorMessage || fallback;
    },
    buildQueryParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        code: this.filterForm.code || undefined,
        waiterName: this.filterForm.waiterName || undefined,
        waiterId: this.filterForm.waiterId || undefined,
        userIdentification: this.filterForm.userIdentification || undefined,
        merchantName: this.filterForm.merchantName || undefined,
        sourceChannel: this.filterForm.sourceChannel || undefined,
        flowType: this.filterForm.flowType || undefined,
        direction: this.filterForm.direction || undefined,
        startTime: this.filterForm.startTime || undefined,
        endTime: this.filterForm.endTime || undefined,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      return params;
    },
    handleSearch(formData) {
      this.filterForm = {
        ...this.filterForm,
        code: formData.code || "",
        waiterName: formData.waiterName || "",
        waiterId: formData.waiterId || "",
        userIdentification: formData.userIdentification || "",
        merchantName: formData.merchantName || "",
        sourceChannel: formData.sourceChannel || "",
        flowType: formData.flowType || "",
        direction: formData.direction || "",
        createTimeRange: Array.isArray(formData.createTimeRange) ? formData.createTimeRange : [],
        startTime:
          Array.isArray(formData.createTimeRange) && formData.createTimeRange.length === 2
            ? formData.createTimeRange[0]
            : "",
        endTime:
          Array.isArray(formData.createTimeRange) && formData.createTimeRange.length === 2
            ? formData.createTimeRange[1]
            : "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
        code: "",
        waiterName: "",
        waiterId: "",
        userIdentification: "",
        merchantName: "",
        sourceChannel: "",
        flowType: "",
        direction: "",
        createTimeRange: [],
        startTime: "",
        endTime: "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const res = await AccompanyWaterList(this.buildQueryParams());
        const data = this.getTableResponseData(res);
        this.tableData = Array.isArray(data.rows) ? data.rows : [];
        this.pagination.total = Number(data.total) || 0;
      } catch (error) {
        console.error("获取陪陪流水列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
        this.$message.error(this.getResponseMessage(error, "获取陪陪流水列表失败"));
      } finally {
        this.loading = false;
      }
    },
    handleCurrentChange(pageNum) {
      this.pagination.pageNum = pageNum;
      this.fetchTableData();
    },
    switchTab(tab) {
      if (this.activeTab === tab) return;
      this.activeTab = tab;
      if (tab === "tax") {
        this.taxInited = true;
        this.$nextTick(() => {
          this.$refs.taxDetailList && this.$refs.taxDetailList.setTableHeight();
          this.$refs.taxDetailList && this.$refs.taxDetailList.fetchTableData();
        });
        return;
      }
      this.$nextTick(() => this.setTableHeight());
      this.fetchTableData();
    },
  },
};
</script>

<style scoped lang="scss">
.container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hero-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 16px;
  flex-shrink: 0;
}

.hero-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 12px 16px;
  border: 1px solid #ece8f8;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 244, 255, 0.96)),
    #fff;
  box-shadow: 0 8px 20px rgba(74, 45, 140, 0.05);
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  outline: none;
}

.hero-tab:hover {
  transform: translateY(-1px);
  border-color: rgba(106, 53, 255, 0.28);
  box-shadow: 0 10px 24px rgba(106, 53, 255, 0.1);
}

.hero-tab.is-active {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(135deg, #6a35ff 0%, #9047f8 55%, #7b3dff 100%);
  box-shadow:
    0 12px 26px rgba(106, 53, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.hero-tab.is-active::after {
  content: "";
  position: absolute;
  right: -36px;
  top: -36px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 68%);
  pointer-events: none;
}

.hero-tab__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 18px;
  color: #6a35ff;
  background: rgba(106, 53, 255, 0.1);
}

.hero-tab.is-active .hero-tab__icon {
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
}

.hero-tab__body {
  flex: 1;
  min-width: 0;
}

.hero-tab__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.hero-tab__title em {
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.hero-tab:not(.is-active) .hero-tab__title em {
  display: none;
}

.hero-tab.is-active .hero-tab__title {
  color: #fff;
}

.hero-tab__desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.hero-tab.is-active .hero-tab__desc {
  color: rgba(255, 255, 255, 0.82);
}

.hero-tab__arrow {
  color: #c0c4cc;
  font-size: 14px;
}

.hero-tab.is-active .hero-tab__arrow {
  color: rgba(255, 255, 255, 0.85);
}

.tab-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.search-module {
  flex-shrink: 0;
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
}

.pagination-fixed {
  flex-shrink: 0;
  padding: 10px 0 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

.user-cell {
  line-height: 1.5;
}

.sub-text {
  font-size: 12px;
  color: #909399;
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
