<template>
  <div class="deposit-flow-page">
    <div class="hero-tabs" role="tablist">
      <button
        type="button"
        class="hero-tab"
        :class="{ 'is-active': activeTab === 'personal' }"
        role="tab"
        :aria-selected="activeTab === 'personal'"
        @click="switchTab('personal')"
      >
        <div class="hero-tab__icon">
          <i class="el-icon-user" />
        </div>
        <div class="hero-tab__body">
          <div class="hero-tab__title">
            个人
            <em v-if="activeTab === 'personal'">当前</em>
          </div>
          <div class="hero-tab__desc">个人保证金收支明细</div>
        </div>
        <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
      </button>
      <button
        type="button"
        class="hero-tab"
        :class="{ 'is-active': activeTab === 'club' }"
        role="tab"
        :aria-selected="activeTab === 'club'"
        @click="switchTab('club')"
      >
        <div class="hero-tab__icon">
          <i class="el-icon-office-building" />
        </div>
        <div class="hero-tab__body">
          <div class="hero-tab__title">
            俱乐部
            <em v-if="activeTab === 'club'">当前</em>
          </div>
          <div class="hero-tab__desc">俱乐部保证金收支明细</div>
        </div>
        <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
      </button>
    </div>

    <SearchForm
      :key="activeTab"
      ref="searchForm"
      :fields="searchItems"
      :initial-values="filterForm"
      :gutter="20"
      @search="handleSearch"
      @reset="handleReset"
    />

    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <!-- 个人 -->
        <el-table
          v-if="activeTab === 'personal'"
          :data="tableData"
          v-loading="loading"
          stripe
          height="100%"
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :header-cell-style="{ textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="userId" label="用户ID" min-width="120" show-overflow-tooltip />
          <el-table-column prop="userName" label="用户名称" min-width="120" show-overflow-tooltip />
          <el-table-column label="用户手机号" min-width="140">
            <template slot-scope="{ row }">
              <PhoneDisplay :value="row.phone" />
            </template>
          </el-table-column>
          <el-table-column label="收支类型" min-width="130">
            <template slot-scope="{ row }">
              {{ getPersonalBizTypeText(row.bizType) }}
            </template>
          </el-table-column>
          <el-table-column label="保证金金额（元）" min-width="140">
            <template slot-scope="{ row }">
              <span :class="amountClass(row.amount)">{{ formatDepositAmount(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="变动时间" min-width="170" />
          <el-table-column label="关联订单号" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <el-button
                v-if="row.bizOrderNo"
                type="text"
                class="order-link"
                @click="goOrderFlow(row.bizOrderNo)"
              >{{ row.bizOrderNo }}</el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 俱乐部 -->
        <el-table
          v-else
          :data="tableData"
          v-loading="loading"
          stripe
          height="100%"
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :header-cell-style="{ textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="tradeId" label="俱乐部ID" min-width="120" show-overflow-tooltip />
          <el-table-column prop="tradeName" label="俱乐部名称" min-width="140" show-overflow-tooltip />
          <el-table-column label="收支类型" min-width="130">
            <template slot-scope="{ row }">
              {{ getClubBizTypeText(row.bizType) }}
            </template>
          </el-table-column>
          <el-table-column label="保证金金额（元）" min-width="140">
            <template slot-scope="{ row }">
              <span :class="amountClass(row.amount)">{{ formatDepositAmount(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="变动时间" min-width="170" />
          <el-table-column label="关联订单号" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <el-button
                v-if="row.bizOrderNo"
                type="text"
                class="order-link"
                @click="goOrderFlow(row.bizOrderNo)"
              >{{ row.bizOrderNo }}</el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <div class="total-text">总计：{{ pagination.total }}条</div>
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
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import {
  getPersonalDepositFlowList,
  getClubDepositFlowList
} from "@/api/depositFlow";

function createPersonalFilter() {
  return {
    userId: "",
    userName: "",
    phone: "",
    bizType: "",
    timeRange: [],
    bizOrderNo: ""
  };
}

function createClubFilter() {
  return {
    tradeId: "",
    tradeName: "",
    bizType: "",
    timeRange: [],
    bizOrderNo: ""
  };
}

export default {
  name: "DepositFlow",
  components: {
    SearchForm,
    PaginationSimple,
    PhoneDisplay
  },
  data() {
    return {
      activeTab: "personal",
      loading: false,
      tableData: [],
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      filterForm: createPersonalFilter(),
      personalBizTypeOptions: [
        { label: "全部", value: "" },
        { label: "收入-充值", value: 1 },
        { label: "支出-订单扣款", value: 2 },
        { label: "支出-提现", value: 3 },
        { label: "支出-其他扣款", value: 4 }
      ],
      clubBizTypeOptions: [
        { label: "全部", value: "" },
        { label: "收入-充值", value: 1 },
        { label: "支出-订单扣款", value: 2 },
        { label: "支出-结算扣款", value: 3 },
        { label: "支出-提现", value: 4 }
      ]
    };
  },
  computed: {
    searchItems() {
      if (this.activeTab === "personal") {
        return [
          {
            type: "input",
            prop: "userId",
            label: "用户ID",
            placeholder: "请输入",
            clearable: true
          },
          {
            type: "input",
            prop: "userName",
            label: "用户名称",
            placeholder: "请输入",
            clearable: true
          },
          {
            type: "input",
            prop: "phone",
            label: "用户手机号",
            placeholder: "请输入",
            clearable: true
          },
          {
            type: "select",
            prop: "bizType",
            label: "收支类型",
            placeholder: "请选择",
            clearable: true,
            options: this.personalBizTypeOptions
          },
          {
            type: "daterange",
            prop: "timeRange",
            label: "变动时间",
            valueFormat: "yyyy-MM-dd HH:mm:ss",
            startPlaceholder: "开始日期",
            endPlaceholder: "结束日期"
          },
          {
            type: "input",
            prop: "bizOrderNo",
            label: "关联订单号",
            placeholder: "请输入",
            clearable: true
          }
        ];
      }
      return [
        {
          type: "input",
          prop: "tradeId",
          label: "俱乐部ID",
          placeholder: "请输入",
          clearable: true
        },
        {
          type: "input",
          prop: "tradeName",
          label: "俱乐部名称",
          placeholder: "请输入",
          clearable: true
        },
        {
          type: "select",
          prop: "bizType",
          label: "收支类型",
          placeholder: "请选择",
          clearable: true,
          options: this.clubBizTypeOptions
        },
        {
          type: "daterange",
          prop: "timeRange",
          label: "变动时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期"
        },
        {
          type: "input",
          prop: "bizOrderNo",
          label: "关联订单号",
          placeholder: "请输入",
          clearable: true
        }
      ];
    }
  },
  created() {
    this.fetchList();
  },
  methods: {
    getPersonalBizTypeText(type) {
      const map = {
        1: "收入-充值",
        2: "支出-订单扣款",
        3: "支出-提现",
        4: "支出-其他扣款"
      };
      return map[Number(type)] || "-";
    },
    getClubBizTypeText(type) {
      const map = {
        1: "收入-充值",
        2: "支出-订单扣款",
        3: "支出-提现",
        4: "支出-其他扣款"
      };
      return map[Number(type)] || "-";
    },
    formatDepositAmount(val) {
      if (val === null || val === undefined || val === "") return "-";
      const num = Number(val);
      if (!Number.isFinite(num)) return String(val);
      if (num > 0) return `+${num}`;
      return String(num);
    },
    amountClass(val) {
      const num = Number(val);
      if (!Number.isFinite(num) || num === 0) return "";
      return num > 0 ? "amount--in" : "amount--out";
    },
    switchTab(tab) {
      if (this.activeTab === tab) return;
      this.activeTab = tab;
      this.filterForm = tab === "personal" ? createPersonalFilter() : createClubFilter();
      this.pagination.pageNum = 1;
      this.tableData = [];
      this.pagination.total = 0;
      this.fetchList();
    },
    handleSearch(e) {
      if (e) this.filterForm = { ...this.filterForm, ...e };
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleReset() {
      this.filterForm =
        this.activeTab === "personal" ? createPersonalFilter() : createClubFilter();
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchList();
    },
    buildParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize
      };
      const form = this.filterForm || {};
      if (this.activeTab === "personal") {
        if (form.userId !== "" && form.userId != null) {
          const userId = Number(form.userId);
          if (Number.isFinite(userId)) params.userId = userId;
        }
        if (form.userName) params.userName = form.userName;
        if (form.phone) params.phone = form.phone;
      } else {
        if (form.tradeId !== "" && form.tradeId != null) {
          const tradeId = Number(form.tradeId);
          if (Number.isFinite(tradeId)) params.tradeId = tradeId;
        }
        if (form.tradeName) params.tradeName = form.tradeName;
      }
      if (form.bizType !== "" && form.bizType != null) {
        params.bizType = Number(form.bizType);
      }
      if (form.bizOrderNo) params.bizOrderNo = form.bizOrderNo;
      if (Array.isArray(form.timeRange) && form.timeRange.length === 2) {
        params.startTime = form.timeRange[0];
        params.endTime = form.timeRange[1];
      }
      return params;
    },
    normalizeListRes(res) {
      const payload = res && res.data != null ? res.data : res;
      if (payload && Array.isArray(payload.rows)) {
        return {
          rows: payload.rows,
          total: Number(payload.total) || 0
        };
      }
      if (Array.isArray(payload)) {
        return { rows: payload, total: payload.length };
      }
      return { rows: [], total: 0 };
    },
    async fetchList() {
      this.loading = true;
      try {
        const params = this.buildParams();
        const api =
          this.activeTab === "personal"
            ? getPersonalDepositFlowList
            : getClubDepositFlowList;
        const res = await api(params);
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
    goOrderFlow(orderNo) {
      if (!orderNo) return;
      this.$router.push({
        path: "/financialManagement/orderFlow",
        query: { orderId: orderNo }
      });
    }
  }
};
</script>

<style scoped lang="scss">
.deposit-flow-page {
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

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

::v-deep .list-card .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
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

.order-link {
  color: #409eff !important;
  padding: 0;
}

.amount--in {
  color: #67c23a;
  font-weight: 600;
}

.amount--out {
  color: #f56c6c;
  font-weight: 600;
}
</style>
