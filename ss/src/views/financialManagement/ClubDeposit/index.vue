<!--
  俱乐部保证金查询页（ClubDeposit）
  ---------------------------------------------------------------------------
  职责：
  1. 展示当前俱乐部保证金概览（余额、人数、状态提示、充值/提现入口）
  2. 查看后台配置的保证金规则（富文本 configDesc）
  3. 查询余额变动明细（类型 / 时间筛选 + 分页）
  4. 发起充值、提现（弹窗组件）

  接口：
  - POST /business/club-deposit/overview      首页概览
  - POST /business/club-deposit/flow-list     变动明细
  - 充值 / 提现见各弹窗组件

  布局约定：
  - 整页 flex 一屏展示：顶部 hero 固定高度，下方明细区占满剩余空间，表格内部滚动
-->
<template>
  <div class="club-deposit-page" v-loading="pageLoading">
    <!-- ========== 顶部保障金概览 ========== -->
    <section class="hero-card">
      <div class="hero-card__top">
        <div>
          <div class="hero-card__title">保证金</div>
          <div class="hero-card__sub">当前陪玩人数：{{ overview.waiterCount || 0 }}人</div>
        </div>
        <el-button type="text" class="rule-link" @click="rulesVisible = true">
          查看保证金规则
        </el-button>
      </div>

      <div class="hero-card__balance">
        <div class="hero-card__balance-label">当前余额(元)</div>
        <div class="hero-card__balance-value">{{ formatMoney(overview.balanceAmount) }}</div>
        <!-- 状态色：ok 绿 / warn 橙 / danger 红，文案优先用接口 adminTips；概览未成功加载时不展示，避免非管理员看到兜底文案 -->
        <div v-if="overviewReady" :class="['hero-card__tips', `is-${statusTheme}`]">
          {{ displayTips }}
        </div>
      </div>

      <div class="hero-card__actions">
        <!-- canRecharge / canWithdraw 由 overview 接口控制显隐 -->
        <el-button
          v-if="overview.canRecharge !== false"
          type="primary"
          class="btn-primary"
          @click="openRecharge"
        >
          充值
        </el-button>
        <el-button
          v-if="overview.canWithdraw"
          class="btn-ghost"
          @click="openWithdraw"
        >
          提现
        </el-button>
      </div>
    </section>

    <!-- ========== 变动明细（筛选 + 表格 + 分页） ========== -->
    <el-card class="flow-card" shadow="never">
      <div class="flow-card__header">
        <div class="flow-card__title">变动明细</div>
        <SearchForm
          ref="searchForm"
          :fields="searchItems"
          :initial-values="filterForm"
          :gutter="20"
          @search="handleSearch"
          @reset="handleReset"
        />
      </div>

      <!-- height=100%：随 table-wrap 自适应，内容多时表格内部滚动 -->
      <div class="table-wrap">
        <el-table
          :data="tableData"
          v-loading="listLoading"
          stripe
          height="100%"
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :header-cell-style="{ textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
        >
          <el-table-column label="类型" min-width="120">
            <template slot-scope="{ row }">
              {{ row.bizTypeName || bizTypeLabel(row.bizType) }}
            </template>
          </el-table-column>
          <el-table-column label="金额（元）" min-width="120">
            <template slot-scope="{ row }">
              <span :class="['amount', Number(row.amount) >= 0 ? 'is-plus' : 'is-minus']">
                {{ formatSignedAmount(row.amount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="打款凭证" min-width="120">
            <template slot-scope="{ row }">
              <img
                v-if="isImageUrl(row.payVoucher)"
                :src="row.payVoucher"
                class="voucher-thumb"
                @click="previewImage(row.payVoucher)"
              />
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="关联订单号" min-width="180">
            <template slot-scope="{ row }">
              <el-button
                v-if="row.bizOrderNo"
                type="text"
                class="order-link"
                @click="goOrderFlow(row.bizOrderNo)"
              >
                {{ row.bizOrderNo }}
              </el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="时间" min-width="170">
            <template slot-scope="{ row }">
              {{ row.createTime || "-" }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- ========== 子弹窗 ========== -->
    <RulesDialog
      :visible.sync="rulesVisible"
      :config-desc="depositConfig.configDesc"
    />

    <RechargeDialog
      :visible.sync="rechargeVisible"
      :is-first-recharge="isFirstRecharge"
      :default-amount="rechargeDefaultAmount"
      :min-amount="rechargeMinAmount"
      @success="handleRechargeSuccess"
    />

    <WithdrawDialog
      :visible.sync="withdrawVisible"
      :amount="overview.availableAmount"
      :invoice-tax-rate="depositConfig.invoiceTaxRate"
      :union-info="unionInfo"
      @success="handleWithdrawSuccess"
    />

    <avatar-preview-dialog
      :visible.sync="previewVisible"
      :avatar-url="previewUrl"
      Title="打款凭证预览"
      @close="previewVisible = false"
    />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import AvatarPreviewDialog from "@/components/AvatarPreviewDialog/index.vue";
import { getClubDepositOverview, getClubDepositFlowList } from "@/api/clubDeposit";
import { getInfoUnion } from "@/api/cashout";
import RulesDialog from "./components/RulesDialog.vue";
import RechargeDialog from "./components/RechargeDialog.vue";
import WithdrawDialog from "./components/WithdrawDialog.vue";

/** 变动明细业务类型：与筛选下拉、列表兜底文案一致 */
const BIZ_TYPE_MAP = {
  1: "充值",
  2: "订单扣款",
  3: "提现",
  4: "其他扣款"
};

/** overview 默认空结构，避免字段缺失导致模板报错 */
function createEmptyOverview() {
  return {
    tradeId: "",
    waiterCount: 0,
    balanceAmount: 0,
    availableAmount: 0,
    freezeAmount: 0,
    needRechargeAmount: 0,
    status: 0, // 0充足 1未缴纳 2即将不足 3不足 4冻结（以后端为准）
    waiterCountStatus: 0, // 人数档位预警状态
    adminTips: "",
    canRecharge: true,
    canWithdraw: false,
    depositClubConfig: null, // 后台俱乐部保证金配置（规则富文本、档位、税点等）
    currentWaiterRange: null, // 当前人数所在档位
    currentMaxSupportRange: null
  };
}

export default {
  name: "ClubDeposit",
  components: {
    SearchForm,
    PaginationSimple,
    AvatarPreviewDialog,
    RulesDialog,
    RechargeDialog,
    WithdrawDialog
  },
  data() {
    return {
      pageLoading: false,
      listLoading: false,
      overviewReady: false,
      overview: createEmptyOverview(),
      /** 提现弹窗展示用：公会名称 / 公会编号 */
      unionInfo: {
        tradeName: "",
        tradeNo: ""
      },
      searchItems: [
        {
          type: "select",
          prop: "bizType",
          label: "类型",
          placeholder: "请选择",
          clearable: true,
          options: [
            { label: "全部", value: "" },
            { label: "充值", value: 1 },
            { label: "订单扣款", value: 2 },
            { label: "提现", value: 3 },
            { label: "其他扣款", value: 4 }
          ]
        },
        {
          type: "daterange",
          prop: "timeRange",
          label: "时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始时间",
          endPlaceholder: "结束时间"
        }
      ],
      filterForm: {
        bizType: "",
        timeRange: []
      },
      tableData: [],
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0
      },
      rulesVisible: false,
      rechargeVisible: false,
      withdrawVisible: false,
      previewVisible: false,
      previewUrl: ""
    };
  },
  computed: {
    /** 从 overview.depositClubConfig 抽出规则弹窗 / 提现税点所需字段 */
    depositConfig() {
      const cfg = this.overview.depositClubConfig || {};
      return {
        warningPeopleDiff: cfg.warningPeopleDiff || 0,
        configDesc: cfg.configDesc || "", // 富文本 HTML
        invoiceTaxRate: cfg.invoiceTaxRate || 0,
        rangeList: Array.isArray(cfg.rangeList) ? cfg.rangeList : []
      };
    },
    /**
     * 提示文案主题色
     * - ok：充足
     * - warn：即将不足 / 人数预警
     * - danger：未缴纳、不足、冻结等
     */
    statusTheme() {
      const status = Number(this.overview.status);
      const peopleStatus = Number(this.overview.waiterCountStatus);
      if (status === 0 && (!peopleStatus || peopleStatus === 0)) return "ok";
      if (status === 2 || peopleStatus === 1 || peopleStatus === 2) return "warn";
      return "danger";
    },
    /** 优先展示后端 adminTips，缺失时用本地兜底文案 */
    displayTips() {
      return this.overview.adminTips || this.fallbackTips;
    },
    fallbackTips() {
      const map = {
        0: "当前保证金充足",
        1: "保证金未缴纳，俱乐部下搭档暂无法接技术单。请根据您俱乐部的搭档人数进行缴纳",
        2: "保证金余额即将低于阈值，请尽快补缴，以免影响搭档接单",
        3: "保证金余额不足，请尽快补缴，以免影响搭档接单",
        4: "当前保证金已冻结"
      };
      return map[Number(this.overview.status)] || "当前保证金充足";
    },
    /** 余额为 0 或 status=未缴纳 → 视为首充，可自定义金额且需≥充足金额 */
    isFirstRecharge() {
      return Number(this.overview.balanceAmount) <= 0 || Number(this.overview.status) === 1;
    },
    /** 充值弹窗默认金额：首充取当前档位 depositAmount（充足金额），补缴取 needRechargeAmount */
    rechargeDefaultAmount() {
      if (this.isFirstRecharge) {
        const range = this.overview.currentWaiterRange || {};
        return Number(range.depositAmount || this.overview.needRechargeAmount || 0);
      }
      return Number(this.overview.needRechargeAmount || 0) || undefined;
    },
    /** 最低可充金额：首充=充足金额，补缴=需补缴金额 */
    rechargeMinAmount() {
      if (this.isFirstRecharge) {
        const range = this.overview.currentWaiterRange || {};
        return Number(range.depositAmount || this.overview.needRechargeAmount || 0);
      }
      return Number(this.overview.needRechargeAmount || 0);
    }
  },
  created() {
    this.initPage();
  },
  methods: {
    /** 非公会管理员时接口会直接拒绝，避免并行请求叠多个相同报错 */
    isGuildAdminDenied(error) {
      return String((error && error.message) || "").includes("不是公会管理员");
    },
    /** 先拉概览；若无权限则只保留拦截器那一次提示，不再继续查明细 */
    async initPage() {
      this.pageLoading = true;
      try {
        try {
          await this.fetchOverview();
        } catch (error) {
          if (this.isGuildAdminDenied(error)) {
            return;
          }
        }
        await Promise.all([this.fetchFlowList(), this.fetchUnionInfo()]);
      } finally {
        this.pageLoading = false;
      }
    },
    formatMoney(val) {
      const num = Number(val);
      if (Number.isNaN(num)) return "0.00";
      return num.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },
    /** 明细金额：正数加 + 前缀，负数原样（接口一般已带负号） */
    formatSignedAmount(val) {
      const num = Number(val);
      if (Number.isNaN(num)) return "-";
      if (num > 0) return `+${num}`;
      return String(num);
    },
    bizTypeLabel(type) {
      return BIZ_TYPE_MAP[Number(type)] || "-";
    },
    isImageUrl(val) {
      if (!val) return false;
      const text = String(val);
      return /^https?:\/\//.test(text) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(text);
    },
    async fetchOverview() {
      try {
        const res = await getClubDepositOverview({});
        if (res && res.success && res.data) {
          this.overview = {
            ...createEmptyOverview(),
            ...res.data
          };
          this.overviewReady = true;
        } else {
          this.overviewReady = false;
        }
      } catch (error) {
        this.overviewReady = false;
        // 业务错误已由 request 拦截器提示，这里只向上抛给 initPage 判断权限
        throw error;
      }
    },
    /** 提现弹窗回填公会名 / 公会编号；失败不阻断主流程 */
    async fetchUnionInfo() {
      try {
        const res = await getInfoUnion();
        if (res && (res.code === 200 || res.success) && res.data) {
          this.unionInfo = {
            tradeName: res.data.tradeName || "",
            tradeNo: res.data.tradeNo || ""
          };
        }
      } catch (error) {
        // 提现弹窗再兜底
      }
    },
    buildFlowParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize
      };
      if (this.filterForm.bizType !== "" && this.filterForm.bizType !== null && this.filterForm.bizType !== undefined) {
        params.bizType = Number(this.filterForm.bizType);
      }
      if (Array.isArray(this.filterForm.timeRange) && this.filterForm.timeRange.length === 2) {
        params.startTime = this.filterForm.timeRange[0];
        params.endTime = this.filterForm.timeRange[1];
      }
      return params;
    },
    async fetchFlowList() {
      this.listLoading = true;
      try {
        const res = await getClubDepositFlowList(this.buildFlowParams());
        if (res && res.success) {
          const data = res.data || {};
          this.tableData = Array.isArray(data.rows) ? data.rows : Array.isArray(data) ? data : [];
          this.pagination.total = Number(data.total || this.tableData.length || 0);
        } else {
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        this.tableData = [];
        this.pagination.total = 0;
        // 业务错误已由 request 拦截器提示，避免与「不是公会管理员」重复弹窗
      } finally {
        this.listLoading = false;
      }
    },
    handleSearch(form) {
      this.filterForm = {
        bizType: form && form.bizType !== undefined ? form.bizType : "",
        timeRange: (form && form.timeRange) || []
      };
      this.pagination.pageNum = 1;
      this.fetchFlowList();
    },
    handleReset() {
      this.filterForm = { bizType: "", timeRange: [] };
      this.pagination.pageNum = 1;
      this.fetchFlowList();
    },
    handlePageChange(page) {
      this.pagination.pageNum = page;
      this.fetchFlowList();
    },
    openRecharge() {
      if (this.overview.canRecharge === false) {
        this.$message.warning("当前不可充值");
        return;
      }
      this.rechargeVisible = true;
    },
    openWithdraw() {
      if (!this.overview.canWithdraw) {
        this.$message.warning("当前不可提现");
        return;
      }
      this.withdrawVisible = true;
    },
    async handleRechargeSuccess() {
      await this.fetchOverview();
      await this.fetchFlowList();
    },
    async handleWithdrawSuccess() {
      await this.fetchOverview();
      await this.fetchFlowList();
    },
    previewImage(url) {
      this.previewUrl = url;
      this.previewVisible = true;
    },
    /** 跳转订单流水，带上关联订单号 */
    goOrderFlow(orderNo) {
      this.$router.push({
        path: "/financialManagement/orderFlow",
        query: { orderId: orderNo }
      });
    }
  }
};
</script>

<style scoped lang="scss">
/* 一屏布局：外层不滚动，明细区吃满剩余高度 */
.club-deposit-page {
  height: 100%;
  padding: 16px 20px;
  box-sizing: border-box;
  overflow: hidden;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.hero-card {
  position: relative;
  flex-shrink: 0;
  margin-bottom: 12px;
  padding: 14px 20px 16px;
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, rgba(143, 3, 255, 0.08), transparent 40%),
    linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  border: 1px solid rgba(143, 160, 196, 0.12);
  box-shadow: 0 8px 20px rgba(31, 35, 41, 0.04);
}

.hero-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.hero-card__title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2a46;
  line-height: 24px;
}

.hero-card__sub {
  margin-top: 2px;
  font-size: 12px;
  color: #7a849f;
}

.rule-link {
  color: #6a35ff;
  font-weight: 500;
  padding: 0;
}

.hero-card__balance {
  margin-top: 10px;
  text-align: center;
}

.hero-card__balance-label {
  font-size: 12px;
  color: #8a93ac;
}

.hero-card__balance-value {
  margin-top: 2px;
  font-size: 32px;
  line-height: 38px;
  font-weight: 700;
  letter-spacing: -1px;
  color: #1a2440;
}

.hero-card__tips {
  margin: 6px auto 0;
  max-width: 720px;
  font-size: 12px;
  line-height: 18px;

  &.is-ok {
    color: #67c23a;
  }

  &.is-warn {
    color: #e6a23c;
  }

  &.is-danger {
    color: #f56c6c;
  }
}

.hero-card__actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn-primary {
  min-width: 88px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #8f03ff 0%, #6a35ff 100%);
}

.btn-ghost {
  min-width: 88px;
  border-radius: 10px;
}

.flow-card {
  flex: 1;
  min-height: 0;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

::v-deep .flow-card > .el-card__body {
  height: 100%;
  min-height: 0;
  padding: 14px 16px 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.flow-card__header {
  flex-shrink: 0;
}

.flow-card__title {
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

::v-deep .flow-card .search-form,
::v-deep .flow-card .el-form {
  margin-bottom: 0;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  margin-top: 4px;
  overflow: hidden;
}

::v-deep .table-wrap .el-table {
  height: 100% !important;
}

.amount.is-plus {
  color: #303133;
  font-weight: 600;
}

.amount.is-minus {
  color: #f56c6c;
  font-weight: 600;
}

.voucher-thumb {
  width: 48px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}

.order-link {
  color: #409eff;
}

.pagination-wrap {
  flex-shrink: 0;
  margin-top: 0;
  border-top: 1px solid #ebeef5;
  background: #fff;
}
</style>
