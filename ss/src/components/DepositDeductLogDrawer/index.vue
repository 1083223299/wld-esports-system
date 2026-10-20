<template>
  <el-drawer
    :visible.sync="drawerVisible"
    direction="rtl"
    size="82vw"
    class="deposit-deduct-log-drawer"
    :with-header="false"
    append-to-body
    @open="handleOpen"
  >
    <div class="deposit-deduct-log-drawer__body" v-loading="loading">
      <div class="deposit-deduct-log-drawer__summary">
        <div>
          <div class="deposit-deduct-log-drawer__title">扣减日志</div>
          <div class="deposit-deduct-log-drawer__subtitle">
            {{ type === 1 ? "俱乐部" : "用户" }}
            {{ targetName || "--" }} · ID {{ targetId || "--" }}
          </div>
        </div>
        <el-button type="text" class="deposit-deduct-log-drawer__close" @click="drawerVisible = false">
          <i class="el-icon-close" />
        </el-button>
      </div>

      <div class="deposit-deduct-log-drawer__search">
        <SearchForm
          ref="searchForm"
          :fields="searchItems"
          :initial-values="filterForm"
          :gutter="20"
          @search="handleSearch"
          @reset="handleReset"
        />
      </div>

      <div class="deposit-deduct-log-drawer__table">
        <el-table
          :data="tableData"
          stripe
          :border="false"
          height="100%"
          class="deduct-log-table"
          :header-row-style="{ backgroundColor: '#F6F7FB' }"
          :header-cell-style="{ textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
        >
          <el-table-column label="扣除金额(元)" width="120" align="center">
            <template slot-scope="{ row }">
              <span class="amount-text">{{ formatAmount(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="扣除原因" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.reason || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="扣除凭证" width="100" align="center">
            <template slot-scope="{ row }">
              <el-button
                v-if="row.voucherList && row.voucherList.length"
                type="text"
                class="voucher-link"
                @click="openVoucher(row)"
              >查看</el-button>
              <span v-else class="empty-dash">-</span>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" width="176" align="center">
            <template slot-scope="{ row }">
              {{ row.createTime || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="扣除时间" width="176" align="center">
            <template slot-scope="{ row }">
              {{ row.deductTime || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120" align="center" class-name="status-col">
            <template slot-scope="{ row }">
              <span :class="['status-tag', `is-${getStatusTheme(row.status)}`]">
                {{ getStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="驳回原因" min-width="160" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <span v-if="Number(row.status) === 2" class="reject-text">
                {{ row.auditRemark || "-" }}
              </span>
              <span v-else class="empty-dash">-</span>
            </template>
          </el-table-column>
          <el-table-column label="关联订单号" min-width="200" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <el-button
                v-if="row.orderId"
                type="text"
                class="order-link"
                @click="goOrderFlow(row.orderId)"
              >{{ row.orderId }}</el-button>
              <span v-else class="empty-dash">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="deposit-deduct-log-drawer__pagination">
        <div class="total-text">总计：{{ pagination.total }}条</div>
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog
      :visible.sync="voucherVisible"
      width="520px"
      custom-class="deposit-log-voucher-dialog"
      append-to-body
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div class="voucher-panel">
        <div class="voucher-panel__title">扣除凭证</div>
        <div v-if="voucherList.length" class="voucher-panel__list">
          <div
            v-for="(img, index) in voucherList"
            :key="`${img}-${index}`"
            class="voucher-panel__item"
            @click="previewVoucher(index)"
          >
            <img :src="img" alt="" />
          </div>
        </div>
        <div v-else class="voucher-panel__empty">暂无凭证</div>
        <div class="voucher-panel__footer">
          <el-button class="voucher-panel__btn" @click="voucherVisible = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>

    <ImgZoom v-model="previewVisible" :img-list="voucherList" :init-index="previewIndex" />
  </el-drawer>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import { getDepositAccountApprovalList } from "@/api/depositAccountApproval";

function createFilter() {
  return {
    orderId: "",
    status: "",
    submitTime: [],
    deductTime: []
  };
}

export default {
  name: "DepositDeductLogDrawer",
  components: { SearchForm, PaginationSimple, ImgZoom },
  props: {
    visible: { type: Boolean, default: false },
    /** 0 个人 1 工会/俱乐部 */
    type: { type: Number, default: 0 },
    targetId: { type: [String, Number], default: "" },
    targetName: { type: String, default: "" }
  },
  data() {
    return {
      loading: false,
      tableData: [],
      filterForm: createFilter(),
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      searchItems: [
        {
          type: "input",
          prop: "orderId",
          label: "订单号",
          placeholder: "请输入",
          clearable: true
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择",
          clearable: true,
          options: [
            { label: "全部", value: "" },
            { label: "待审核", value: 0 },
            { label: "通过", value: 1 },
            { label: "驳回", value: 2 }
          ]
        },
        {
          type: "daterange",
          prop: "submitTime",
          label: "提交时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期"
        },
        {
          type: "daterange",
          prop: "deductTime",
          label: "扣除时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期"
        }
      ],
      voucherVisible: false,
      voucherList: [],
      previewVisible: false,
      previewIndex: 0
    };
  },
  computed: {
    drawerVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit("update:visible", val);
      }
    }
  },
  methods: {
    formatAmount(val) {
      if (val === null || val === undefined || val === "") return "-";
      const num = Number(val);
      return Number.isFinite(num) ? String(num) : String(val);
    },
    getStatusText(status) {
      const map = { 0: "待审核", 1: "通过", 2: "驳回" };
      return map[Number(status)] || "-";
    },
    getStatusTheme(status) {
      const map = { 0: "pending", 1: "success", 2: "reject" };
      return map[Number(status)] || "default";
    },
    normalizeVoucherUrls(item = {}) {
      const candidates = [
        item.voucherUrls,
        item.ossUrls,
        item.voucherOssUrls,
        item.urls,
        item.voucherOssIds
      ];
      let list = [];
      for (let i = 0; i < candidates.length; i += 1) {
        if (Array.isArray(candidates[i]) && candidates[i].length) {
          list = candidates[i];
          break;
        }
      }
      return list
        .map((url) => String(url || "").trim())
        .filter((url) => /^https?:\/\//i.test(url));
    },
    normalizeRow(item = {}) {
      const status = item.status === "" || item.status == null ? "" : Number(item.status);
      const deductTime =
        item.deductTime ||
        item.auditTime ||
        (Number(status) === 1 ? item.updateTime : "") ||
        "";
      return {
        id: item.id || "",
        amount: item.amount,
        reason: item.reason || "",
        voucherList: this.normalizeVoucherUrls(item),
        createTime: item.createTime || "",
        deductTime,
        status,
        auditRemark: item.auditRemark || "",
        orderId: item.orderId || ""
      };
    },
    handleOpen() {
      this.filterForm = createFilter();
      this.pagination.pageNum = 1;
      this.tableData = [];
      this.pagination.total = 0;
      this.$nextTick(() => {
        this.fetchList();
      });
    },
    handleSearch(e) {
      if (e) this.filterForm = { ...this.filterForm, ...e };
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleReset() {
      this.filterForm = createFilter();
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handlePageChange(val) {
      this.pagination.pageNum = val;
      this.fetchList();
    },
    buildParams() {
      const form = this.filterForm || {};
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        type: Number(this.type)
      };
      const id = Number(this.targetId);
      if (Number.isFinite(id)) {
        if (Number(this.type) === 1) {
          params.clubId = id;
        } else {
          params.companionId = id;
        }
      }
      if (form.orderId) params.orderId = String(form.orderId).trim();
      if (form.status !== "" && form.status != null) {
        params.status = Number(form.status);
      }
      if (Array.isArray(form.submitTime) && form.submitTime.length === 2) {
        params.startTime = form.submitTime[0];
        params.endTime = form.submitTime[1];
      }
      if (Array.isArray(form.deductTime) && form.deductTime.length === 2) {
        params.deductStartTime = form.deductTime[0];
        params.deductEndTime = form.deductTime[1];
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
      if (!this.targetId && this.targetId !== 0) {
        this.tableData = [];
        this.pagination.total = 0;
        return;
      }
      this.loading = true;
      try {
        const res = await getDepositAccountApprovalList(this.buildParams());
        const { rows, total } = this.normalizeListRes(res);
        this.tableData = rows.map((item) => this.normalizeRow(item));
        this.pagination.total = total;
      } catch (e) {
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    openVoucher(row) {
      this.voucherList = (row && row.voucherList) || [];
      this.voucherVisible = true;
      if (!this.voucherList.length) {
        this.$message.warning("暂无可预览的凭证地址");
      }
    },
    previewVoucher(index = 0) {
      if (!this.voucherList.length) return;
      this.previewIndex = index || 0;
      this.previewVisible = true;
    },
    goOrderFlow(orderId) {
      if (!orderId) return;
      const { href } = this.$router.resolve({
        path: "/financialManagement/orderFlow",
        query: { orderId }
      });
      window.open(href, "_blank");
    }
  }
};
</script>

<style scoped lang="scss">
.deposit-deduct-log-drawer__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 28px 20px;
  box-sizing: border-box;
  background: #f5f6fa;
}

.deposit-deduct-log-drawer__summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
  padding: 4px 2px;
}

.deposit-deduct-log-drawer__title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2533;
  letter-spacing: 0.2px;
}

.deposit-deduct-log-drawer__subtitle {
  margin-top: 8px;
  font-size: 13px;
  color: #8a93a6;
  line-height: 1.5;
}

.deposit-deduct-log-drawer__close {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #fff;
  font-size: 18px;
  color: #909399;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.deposit-deduct-log-drawer__search {
  margin-bottom: 16px;
  background: #fff;
  border-radius: 14px;
  padding: 16px 16px 4px;
  border: 1px solid #eef0f5;
  box-shadow: 0 8px 20px rgba(49, 56, 84, 0.04);
}

.deposit-deduct-log-drawer__table {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 14px;
  padding: 8px 12px 12px;
  overflow: hidden;
  border: 1px solid #eef0f5;
  box-shadow: 0 8px 20px rgba(49, 56, 84, 0.04);
}

.deduct-log-table ::v-deep .el-table__header th {
  height: 48px;
  padding: 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  background: #f6f7fb !important;
}

.deduct-log-table ::v-deep .el-table__body td {
  padding: 16px 8px;
  font-size: 13px;
  color: #303645;
}

.deduct-log-table ::v-deep .el-table__row {
  height: 56px;
}

.deduct-log-table ::v-deep .el-table__body tr:hover > td {
  background: #fafbff !important;
}

.deduct-log-table ::v-deep .status-col .cell {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.deposit-deduct-log-drawer__pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding: 4px 2px 0;
}

.total-text {
  font-size: 13px;
  color: #606266;
}

.amount-text {
  font-weight: 700;
  color: #1f2533;
  font-variant-numeric: tabular-nums;
}

.empty-dash {
  color: #c0c4cc;
}

.order-link,
.voucher-link {
  color: #409eff;
  padding: 0;
  font-weight: 600;
}

.reject-text {
  color: #f56c6c;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  box-sizing: border-box;
  white-space: nowrap;
}

.status-tag.is-pending {
  background: rgba(255, 173, 51, 0.12);
  color: #ff9f1a;
}

.status-tag.is-success {
  background: rgba(52, 199, 89, 0.12);
  color: #20a053;
}

.status-tag.is-reject {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

.status-tag.is-default {
  background: rgba(123, 132, 150, 0.12);
  color: #7b8496;
}

::v-deep .deposit-log-voucher-dialog {
  border-radius: 16px;
  overflow: hidden;
}

::v-deep .deposit-log-voucher-dialog .el-dialog__header {
  display: none;
}

::v-deep .deposit-log-voucher-dialog .el-dialog__body {
  padding: 0;
}

.voucher-panel {
  padding: 20px 22px;
}

.voucher-panel__title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2533;
  margin-bottom: 14px;
}

.voucher-panel__list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.voucher-panel__item {
  width: 84px;
  height: 84px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e8eaf0;
  cursor: pointer;
  background: #f7f8fc;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.voucher-panel__empty {
  padding: 24px 0;
  text-align: center;
  color: #909399;
}

.voucher-panel__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.voucher-panel__btn {
  min-width: 88px;
  border-radius: 10px;
  font-weight: 600;
  background: #2f3542;
  border-color: #2f3542;
  color: #fff;
}
</style>
