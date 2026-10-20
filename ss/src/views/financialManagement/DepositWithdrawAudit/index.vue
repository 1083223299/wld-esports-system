<template>
  <div class="deposit-withdraw-audit">
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
            个人提现
            <em v-if="activeTab === 'personal'">当前</em>
          </div>
          <div class="hero-tab__desc">系统打款优先，失败后人工处理</div>
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
            俱乐部提现
            <em v-if="activeTab === 'club'">当前</em>
          </div>
          <div class="hero-tab__desc">人工审核并上传打款凭证</div>
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
        <!-- 个人提现 -->
        <el-table
          v-if="activeTab === 'personal'"
          :data="tableData"
          v-loading="loading"
          stripe
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :header-cell-style="{ textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="userName" label="用户名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="userId" label="用户ID" min-width="120" />
          <el-table-column label="收款方式" min-width="100">
            <template slot-scope="{ row }">
              {{ row.accountTypeName || "支付宝" }}
            </template>
          </el-table-column>
          <el-table-column prop="accountNo" label="收款账号" min-width="160" show-overflow-tooltip />
          <el-table-column label="打款金额（元）" min-width="120">
            <template slot-scope="{ row }">
              {{ formatAmount(row.payAmount) }}
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="提交时间" min-width="170" />
          <el-table-column label="状态" min-width="180">
            <template slot-scope="{ row }">
              <span class="status-pill" :class="getStatusClass(row)">
                {{ formatPersonalStatus(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="原因" min-width="160" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.reason || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template slot-scope="{ row }">
              <template v-if="isPendingAudit(row)">
                <el-button type="text" style="color: #409EFF" @click="handleApprove(row)">通过</el-button>
                <el-button type="text" style="color: #F56C6C" @click="openReject(row)">驳回</el-button>
              </template>
              <template v-else-if="isManualPayPending(row)">
                <el-button type="text" style="color: #409EFF" @click="openPaySuccess(row)">打款成功</el-button>
                <el-button type="text" style="color: #F56C6C" @click="openPayFail(row)">打款失败</el-button>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 俱乐部提现 -->
        <el-table
          v-else
          :data="tableData"
          v-loading="loading"
          stripe
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :header-cell-style="{ textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="clubName" label="俱乐部名称" min-width="140" show-overflow-tooltip />
          <el-table-column prop="clubId" label="俱乐部ID" min-width="120" />
          <el-table-column prop="bankName" label="收款银行" min-width="120" show-overflow-tooltip />
          <el-table-column prop="accountNo" label="收款账号" min-width="150" show-overflow-tooltip />
          <el-table-column label="打款金额（元）" min-width="120">
            <template slot-scope="{ row }">
              {{ formatAmount(row.payAmount) }}
            </template>
          </el-table-column>
          <el-table-column label="发票" min-width="120">
            <template slot-scope="{ row }">
              <template v-if="Number(row.invoiceType) === 2">
                {{ row.invoiceTypeName || "平台代开" }}
              </template>
              <img
                v-else-if="isImageUrl(row.invoiceFileUrl || row.invoiceFile)"
                :src="row.invoiceFileUrl || row.invoiceFile"
                class="thumb"
                @click="previewImage(row.invoiceFileUrl || row.invoiceFile)"
              />
              <span v-else>{{ row.invoiceTypeName || "-" }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="提交时间" min-width="170" />
          <el-table-column label="状态" min-width="120">
            <template slot-scope="{ row }">
              <span class="status-pill" :class="getStatusClass(row)">
                {{ formatClubStatus(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="打款凭证" min-width="110">
            <template slot-scope="{ row }">
              <img
                v-if="isImageUrl(row.payVoucherUrl || row.payVoucher)"
                :src="row.payVoucherUrl || row.payVoucher"
                class="thumb"
                @click="previewImage(row.payVoucherUrl || row.payVoucher)"
              />
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="原因" min-width="140" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.reason || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template slot-scope="{ row }">
              <template v-if="isPendingAudit(row)">
                <el-button type="text" style="color: #409EFF" @click="handleApprove(row)">通过</el-button>
                <el-button type="text" style="color: #F56C6C" @click="openReject(row)">驳回</el-button>
              </template>
              <template v-else-if="isWaitPay(row)">
                <el-button type="text" style="color: #409EFF" @click="openPaySuccess(row)">打款成功</el-button>
                <el-button type="text" style="color: #F56C6C" @click="openPayFail(row)">打款失败</el-button>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <RejectDialog
      :visible.sync="rejectVisible"
      :submitting="actionLoading"
      @confirm="submitReject"
    />
    <PaySuccessDialog
      :visible.sync="paySuccessVisible"
      :submitting="actionLoading"
      @confirm="submitPaySuccess"
    />
    <PayFailDialog
      :visible.sync="payFailVisible"
      :submitting="actionLoading"
      @confirm="submitPayFail"
    />
    <avatar-preview-dialog
      :visible.sync="previewVisible"
      :avatar-url="previewUrl"
      Title="图片预览"
      @close="previewVisible = false"
    />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import AvatarPreviewDialog from "@/components/AvatarPreviewDialog/index.vue";
import {
  getPersonalDepositWithdrawList,
  getClubDepositWithdrawList,
  auditPersonalDepositWithdraw,
  auditClubDepositWithdraw,
  payPersonalDepositWithdraw,
  payClubDepositWithdraw
} from "@/api/depositWithdrawOrder";
import RejectDialog from "./components/RejectDialog.vue";
import PaySuccessDialog from "./components/PaySuccessDialog.vue";
import PayFailDialog from "./components/PayFailDialog.vue";
import {
  PERSONAL_STATUS_OPTIONS,
  CLUB_STATUS_OPTIONS,
  isPendingAudit,
  isManualPayPending,
  isWaitPay,
  isImageUrl
} from "./constants";

function createPersonalFilter() {
  return {
    userName: "",
    userId: "",
    status: "",
    timeRange: []
  };
}

function createClubFilter() {
  return {
    clubName: "",
    clubId: "",
    status: "",
    timeRange: []
  };
}

export default {
  name: "DepositWithdrawAudit",
  components: {
    SearchForm,
    PaginationSimple,
    AvatarPreviewDialog,
    RejectDialog,
    PaySuccessDialog,
    PayFailDialog
  },
  data() {
    return {
      activeTab: "personal",
      loading: false,
      actionLoading: false,
      tableData: [],
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      filterForm: createPersonalFilter(),
      currentRow: null,
      rejectVisible: false,
      paySuccessVisible: false,
      payFailVisible: false,
      previewVisible: false,
      previewUrl: ""
    };
  },
  computed: {
    searchItems() {
      if (this.activeTab === "personal") {
        return [
          {
            type: "input",
            prop: "userName",
            label: "用户名称",
            placeholder: "请输入",
            clearable: true
          },
          {
            type: "input",
            prop: "userId",
            label: "用户ID",
            placeholder: "请输入",
            clearable: true
          },
          {
            type: "select",
            prop: "status",
            label: "状态",
            placeholder: "请选择",
            clearable: true,
            options: PERSONAL_STATUS_OPTIONS
          },
          {
            type: "daterange",
            prop: "timeRange",
            label: "提交时间",
            valueFormat: "yyyy-MM-dd HH:mm:ss",
            startPlaceholder: "开始日期",
            endPlaceholder: "结束日期"
          }
        ];
      }
      return [
        {
          type: "input",
          prop: "clubName",
          label: "俱乐部名称",
          placeholder: "请输入",
          clearable: true
        },
        {
          type: "input",
          prop: "clubId",
          label: "俱乐部ID",
          placeholder: "请输入",
          clearable: true
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择",
          clearable: true,
          options: CLUB_STATUS_OPTIONS
        },
        {
          type: "daterange",
          prop: "timeRange",
          label: "提交时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期"
        }
      ];
    }
  },
  created() {
    this.applyRouteQuery();
    this.fetchList();
  },
  activated() {
    if (this.applyRouteQuery()) {
      this.pagination.pageNum = 1;
      this.fetchList();
    }
  },
  watch: {
    "$route.query": {
      deep: true,
      handler() {
        if (this.applyRouteQuery()) {
          this.pagination.pageNum = 1;
          this.fetchList();
        }
      }
    }
  },
  methods: {
    isPendingAudit,
    isManualPayPending,
    isWaitPay,
    isImageUrl,
    /** 系统消息跳转：?tab=personal&status=5&userId=xxx */
    applyRouteQuery() {
      const q = (this.$route && this.$route.query) || {};
      let changed = false;
      const nextTab = q.tab === "club" || q.tab === "personal" ? q.tab : "";
      if (nextTab && this.activeTab !== nextTab) {
        this.activeTab = nextTab;
        this.filterForm =
          nextTab === "personal" ? createPersonalFilter() : createClubFilter();
        changed = true;
      }
      if (q.status !== undefined && q.status !== null && q.status !== "") {
        const status = Number(q.status);
        if (!Number.isNaN(status) && this.filterForm.status !== status) {
          this.filterForm = { ...this.filterForm, status };
          changed = true;
        }
      }
      if (
        this.activeTab === "personal" &&
        q.userId !== undefined &&
        q.userId !== null &&
        q.userId !== ""
      ) {
        if (String(this.filterForm.userId || "") !== String(q.userId)) {
          this.filterForm = { ...this.filterForm, userId: String(q.userId) };
          changed = true;
        }
      }
      if (
        this.activeTab === "club" &&
        q.clubId !== undefined &&
        q.clubId !== null &&
        q.clubId !== ""
      ) {
        if (String(this.filterForm.clubId || "") !== String(q.clubId)) {
          this.filterForm = { ...this.filterForm, clubId: String(q.clubId) };
          changed = true;
        }
      }
      if (changed) {
        this.$nextTick(() => {
          if (this.$refs.searchForm && this.$refs.searchForm.setFormData) {
            this.$refs.searchForm.setFormData({ ...this.filterForm });
          }
        });
      }
      return changed;
    },
    formatAmount(val) {
      if (val === null || val === undefined || val === "") return "-";
      return Number(val);
    },
    formatStatus(row, options) {
      const status = Number(row && row.status);
      const option = options.find(
        (item) => item.value !== "" && Number(item.value) === status
      );
      return option ? option.label : (row && row.statusName) || "-";
    },
    formatPersonalStatus(row) {
      return this.formatStatus(row, PERSONAL_STATUS_OPTIONS);
    },
    formatClubStatus(row) {
      return this.formatStatus(row, CLUB_STATUS_OPTIONS);
    },
    getStatusClass(row) {
      return {
        0: "is-pending",
        1: "is-wait-pay",
        2: "is-rejected",
        5: "is-manual",
        8: "is-failed",
        9: "is-success"
      }[Number(row && row.status)] || "is-default";
    },
    switchTab(tab) {
      if (this.activeTab === tab) return;
      this.activeTab = tab;
      this.filterForm = tab === "personal" ? createPersonalFilter() : createClubFilter();
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    buildParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize
      };
      const form = this.filterForm || {};
      if (this.activeTab === "personal") {
        if (form.userName) params.userName = form.userName;
        if (form.userId !== "" && form.userId !== null && form.userId !== undefined) {
          params.userId = Number(form.userId);
        }
      } else {
        if (form.clubName) params.clubName = form.clubName;
        if (form.clubId !== "" && form.clubId !== null && form.clubId !== undefined) {
          params.clubId = Number(form.clubId);
        }
      }
      if (form.status !== "" && form.status !== null && form.status !== undefined) {
        params.status = Number(form.status);
      }
      if (Array.isArray(form.timeRange) && form.timeRange.length === 2) {
        params.startTime = form.timeRange[0];
        params.endTime = form.timeRange[1];
      }
      return params;
    },
    async fetchList() {
      this.loading = true;
      try {
        const api =
          this.activeTab === "personal"
            ? getPersonalDepositWithdrawList
            : getClubDepositWithdrawList;
        const res = await api(this.buildParams());
        if (res && res.success) {
          const data = res.data || {};
          this.tableData = Array.isArray(data.rows) ? data.rows : [];
          this.pagination.total = Number(data.total || 0);
        } else {
          this.tableData = [];
          this.pagination.total = 0;
          this.$message.error((res && res.errorMessage) || "获取列表失败");
        }
      } catch (error) {
        this.tableData = [];
        this.pagination.total = 0;
        this.$message.error("获取列表失败");
      } finally {
        this.loading = false;
      }
    },
    handleSearch(form) {
      this.filterForm = { ...(form || {}) };
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleReset() {
      this.filterForm =
        this.activeTab === "personal" ? createPersonalFilter() : createClubFilter();
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handlePageChange(page) {
      this.pagination.pageNum = page;
      this.fetchList();
    },
    handleApprove(row) {
      this.$confirm("确认通过该提现申请吗？", "提示", { type: "warning" })
        .then(async () => {
          this.actionLoading = true;
          try {
            const api =
              this.activeTab === "personal"
                ? auditPersonalDepositWithdraw
                : auditClubDepositWithdraw;
            const res = await api({
              orderNo: row.orderNo,
              auditStatus: 1
            });
            if (!res || !res.success) {
              throw new Error((res && res.errorMessage) || "审核失败");
            }
            this.$message.success("审核通过");
            this.fetchList();
          } catch (error) {
            this.$message.error(error.message || "审核失败");
          } finally {
            this.actionLoading = false;
          }
        })
        .catch(() => {});
    },
    openReject(row) {
      this.currentRow = row;
      this.rejectVisible = true;
    },
    async submitReject(remark) {
      if (!this.currentRow) return;
      this.actionLoading = true;
      try {
        const api =
          this.activeTab === "personal"
            ? auditPersonalDepositWithdraw
            : auditClubDepositWithdraw;
        const res = await api({
          orderNo: this.currentRow.orderNo,
          auditStatus: 2,
          auditRemark: remark
        });
        if (!res || !res.success) {
          throw new Error((res && res.errorMessage) || "驳回失败");
        }
        this.$message.success("已驳回");
        this.rejectVisible = false;
        this.fetchList();
      } catch (error) {
        this.$message.error(error.message || "驳回失败");
      } finally {
        this.actionLoading = false;
      }
    },
    openPaySuccess(row) {
      this.currentRow = row;
      this.paySuccessVisible = true;
    },
    openPayFail(row) {
      this.currentRow = row;
      this.payFailVisible = true;
    },
    async submitPaySuccess(payVoucher) {
      if (!this.currentRow) return;
      this.actionLoading = true;
      try {
        const api =
          this.activeTab === "personal"
            ? payPersonalDepositWithdraw
            : payClubDepositWithdraw;
        const res = await api({
          orderNo: this.currentRow.orderNo,
          payResult: 1,
          payVoucher
        });
        if (!res || !res.success) {
          throw new Error((res && res.errorMessage) || "操作失败");
        }
        this.$message.success("已标记打款成功");
        this.paySuccessVisible = false;
        this.fetchList();
      } catch (error) {
        this.$message.error(error.message || "操作失败");
      } finally {
        this.actionLoading = false;
      }
    },
    async submitPayFail(remark) {
      if (!this.currentRow) return;
      this.actionLoading = true;
      try {
        const api =
          this.activeTab === "personal"
            ? payPersonalDepositWithdraw
            : payClubDepositWithdraw;
        const res = await api({
          orderNo: this.currentRow.orderNo,
          payResult: 2,
          payRemark: remark
        });
        if (!res || !res.success) {
          throw new Error((res && res.errorMessage) || "操作失败");
        }
        this.$message.success("已标记打款失败");
        this.payFailVisible = false;
        this.fetchList();
      } catch (error) {
        this.$message.error(error.message || "操作失败");
      } finally {
        this.actionLoading = false;
      }
    },
    previewImage(url) {
      this.previewUrl = url;
      this.previewVisible = true;
    }
  }
};
</script>

<style scoped lang="scss">
.deposit-withdraw-audit {
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

.hero-tab::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: transparent;
  transition: background 0.25s ease;
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

.hero-tab.is-active::before {
  background: rgba(255, 255, 255, 0.55);
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
  box-shadow: inset 0 0 0 1px rgba(106, 53, 255, 0.08);
  transition: all 0.25s ease;
}

.hero-tab.is-active .hero-tab__icon {
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
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
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.hero-tab.is-active .hero-tab__title {
  color: #fff;
}

.hero-tab__desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.hero-tab.is-active .hero-tab__desc {
  color: rgba(255, 255, 255, 0.82);
}

.hero-tab__arrow {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #c0c4cc;
  background: #f5f5f8;
  transition: all 0.25s ease;
  flex-shrink: 0;
  font-size: 12px;
}

.hero-tab:hover .hero-tab__arrow {
  color: #6a35ff;
  background: rgba(106, 53, 255, 0.1);
}

.hero-tab.is-active .hero-tab__arrow {
  color: #6a35ff;
  background: #fff;
  transform: translateX(2px);
}

@media (max-width: 900px) {
  .hero-tabs {
    grid-template-columns: 1fr;
  }
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border-radius: 20px;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 0;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;

  &.is-pending {
    color: #b26a00;
    background: #fff7e6;
    border-color: #ffe0a3;
  }

  &.is-wait-pay {
    color: #2768c7;
    background: #edf5ff;
    border-color: #bdd9ff;
  }

  &.is-rejected,
  &.is-failed {
    color: #d94a4a;
    background: #fff0f0;
    border-color: #ffc8c8;
  }

  &.is-manual {
    color: #c45600;
    background: #fff3e8;
    border-color: #ffc89c;
  }

  &.is-success {
    color: #27864a;
    background: #edfaF2;
    border-color: #b9ebcb;
  }

  &.is-default {
    color: #606266;
    background: #f4f4f5;
    border-color: #dcdfe6;
  }
}

.thumb {
  width: 56px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}
</style>
