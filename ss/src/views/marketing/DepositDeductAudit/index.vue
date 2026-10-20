<template>
  <div class="deposit-deduct-audit">
    <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20" @search="handleSearch"
      @reset="handleReset" />

    <el-card class="list-card" shadow="never">
      <div class="table-scroll-container">
        <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false" height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">
          <el-table-column label="订单号" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <el-button v-if="row.orderId" type="text" class="order-link" @click="goOrderFlow(row.orderId)">{{
                row.orderId }}</el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column label="账号类型" min-width="100">
            <template slot-scope="{ row }">
              {{ getAccountTypeText(row.type) }}
            </template>
          </el-table-column>

          <el-table-column label="扣除账号" min-width="140">
            <template slot-scope="{ row }">
              <div class="account-cell">
                <div class="account-cell__name">{{ row.accountName || "-" }}</div>
                <div class="account-cell__id">{{ row.utId || "-" }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="保证金扣减金额(元)" min-width="140">
            <template slot-scope="{ row }">
              <span class="amount-text">{{ formatAmount(row.amount) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="reason" label="扣除原因" min-width="140" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.reason || "-" }}
            </template>
          </el-table-column>

          <el-table-column label="补偿奖品ID" min-width="160" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <div v-if="row.prizeId">{{ row.prizeId }}</div>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column label="补偿奖品信息" min-width="200" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.prizeInfo || "-" }}
            </template>
          </el-table-column>

          <el-table-column label="扣除凭证" min-width="100">
            <template slot-scope="{ row }">
              <el-button v-if="hasVoucher(row)" type="text" class="voucher-link"
                @click="openVoucherDialog(row)">查看</el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column prop="createTime" label="提交时间" min-width="170">
            <template slot-scope="{ row }">
              {{ row.createTime || "-" }}
            </template>
          </el-table-column>

          <el-table-column label="状态" min-width="100">
            <template slot-scope="{ row }">
              <span :class="['status-tag', `is-${getAuditStatusTheme(row.status)}`]">
                {{ getAuditStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="驳回原因" min-width="140" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <span v-if="Number(row.status) === 2" class="reject-text">
                {{ row.auditRemark || "-" }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" fixed="right" min-width="120">
            <template slot-scope="{ row }">
              <div v-if="Number(row.status) === 0" class="action-buttons">
                <el-button type="text" class="approve-btn" @click="handleApprove(row)">通过</el-button>
                <el-button type="text" class="reject-btn" @click="openRejectDialog(row)">驳回</el-button>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <div class="total-text">总计：{{ pagination.total }}条</div>
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 扣除凭证 -->
    <el-dialog :visible.sync="voucherDialogVisible" width="560px" custom-class="voucher-dialog" append-to-body
      :close-on-click-modal="false" :show-close="false">
      <div class="voucher-dialog__panel">
        <div class="voucher-dialog__title">扣除凭证</div>
        <div v-if="voucherList.length" class="voucher-dialog__list">
          <div v-for="(item, index) in voucherList" :key="`${item.url}-${index}`" class="voucher-dialog__item"
            @click="previewVoucher(index)">
            <template v-if="item.isVideo">
              <div class="voucher-dialog__video">
                <i class="el-icon-video-camera" />
                <span>视频</span>
              </div>
            </template>
            <img v-else :src="item.url" alt="" />
          </div>
        </div>
        <div v-else class="voucher-dialog__empty">暂无凭证</div>
        <div class="voucher-dialog__footer">
          <el-button class="dark-btn" @click="voucherDialogVisible = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 驳回原因 -->
    <el-dialog :visible.sync="rejectDialogVisible" width="520px" custom-class="reject-dialog" append-to-body
      :close-on-click-modal="false" :show-close="false" @close="resetRejectForm">
      <div class="reject-dialog__panel">
        <div class="reject-dialog__title">驳回原因</div>
        <el-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" class="reject-dialog__form"
          hide-required-asterisk>
          <el-form-item prop="auditRemark" label-width="0">
            <div class="reject-dialog__label"><span class="is-required">*</span>请输入驳回原因</div>
            <el-input v-model="rejectForm.auditRemark" type="textarea" :rows="5" maxlength="50" show-word-limit
              placeholder="请输入驳回原因" />
          </el-form-item>
        </el-form>
        <div class="reject-dialog__footer">
          <el-button class="dark-btn dark-btn--ghost" @click="rejectDialogVisible = false">取消</el-button>
          <el-button class="dark-btn" type="primary" :loading="auditSubmitting" @click="submitReject">
            提交
          </el-button>
        </div>
      </div>
    </el-dialog>

    <ImgZoom v-model="previewVisible" :img-list="previewList" :init-index="previewIndex" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import {
  getDepositAccountApprovalList,
  auditDepositAccountApproval
} from "@/api/depositAccountApproval";

export default {
  name: "DepositDeductAudit",
  components: {
    SearchForm,
    PaginationSimple,
    ImgZoom
  },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "orderId",
          label: "订单号",
          placeholder: "请输入订单号",
          clearable: true
        },
        {
          type: "select",
          prop: "type",
          label: "账号类型",
          placeholder: "请选择",
          clearable: true,
          options: [
            { label: "全部", value: "" },
            { label: "个人陪", value: 0 },
            { label: "俱乐部", value: 1 }
          ]
        },
        {
          type: "input",
          prop: "companionId",
          label: "陪陪ID",
          placeholder: "请输入陪陪ID",
          clearable: true,
          inputType: "number"
        },
        {
          type: "input",
          prop: "companionName",
          label: "陪陪名称",
          placeholder: "请输入陪陪名称",
          clearable: true
        },
        {
          type: "input",
          prop: "clubId",
          label: "俱乐部ID",
          placeholder: "请输入俱乐部ID",
          clearable: true,
          inputType: "number"
        },
        {
          type: "input",
          prop: "clubName",
          label: "俱乐部名称",
          placeholder: "请输入俱乐部名称",
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
          prop: "createTime",
          label: "提交时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始时间",
          endPlaceholder: "结束时间",
          clearable: true
        }
      ],
      filterForm: {
        orderId: "",
        type: "",
        companionId: "",
        companionName: "",
        clubId: "",
        clubName: "",
        status: "",
        createTime: []
      },
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0
      },
      tableData: [],
      loading: false,
      auditSubmitting: false,
      voucherDialogVisible: false,
      voucherList: [],
      previewVisible: false,
      previewList: [],
      previewIndex: 0,
      rejectDialogVisible: false,
      rejectForm: {
        id: "",
        auditRemark: ""
      },
      rejectRules: {
        auditRemark: [
          { required: true, message: "请输入驳回原因", trigger: "blur" },
          { max: 50, message: "驳回原因不能超过50字", trigger: "blur" }
        ]
      }
    };
  },
  created() {
    this.fetchTableData();
  },
  methods: {
    getAccountTypeText(type) {
      const map = { 0: "个人陪", 1: "俱乐部" };
      return map[Number(type)] || "-";
    },
    getAuditStatusText(status) {
      const map = { 0: "待审核", 1: "通过", 2: "驳回" };
      return map[Number(status)] || "-";
    },
    getAuditStatusTheme(status) {
      const map = { 0: "pending", 1: "success", 2: "reject" };
      return map[Number(status)] || "default";
    },
    formatAmount(val) {
      if (val === null || val === undefined || val === "") return "-";
      const num = Number(val);
      return Number.isFinite(num) ? String(num) : String(val);
    },
    normalizeText(value) {
      return String(value || "").trim();
    },
    normalizeInteger(value) {
      const text = String(value || "").trim();
      return /^\d+$/.test(text) ? Number(text) : "";
    },
    normalizeEnum(value, validValues) {
      if (value === "" || value === null || value === undefined) return "";
      const num = Number(value);
      return validValues.includes(num) ? num : "";
    },
    isValidParamValue(value) {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    },
    parsePrizeName(prizeInfo) {
      if (!prizeInfo) return "";
      const text = String(prizeInfo).trim();
      const parts = text.split(/\s+/);
      return parts[0] || "";
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
        .filter((url) => /^https?:\/\//i.test(url))
        .map((url) => ({
          url,
          isVideo: /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(url)
        }));
    },
    hasVoucher(row) {
      return (
        (Array.isArray(row.voucherList) && row.voucherList.length > 0) ||
        (Array.isArray(row.voucherOssIds) && row.voucherOssIds.length > 0)
      );
    },
    normalizeTableRow(item = {}) {
      const voucherList = this.normalizeVoucherUrls(item);
      return {
        id: item.id || "",
        orderId: item.orderId || "",
        type: this.normalizeEnum(item.type, [0, 1]),
        utId: item.utId || "",
        accountName: item.accountName || "",
        amount: item.amount,
        reason: item.reason || "",
        prizeId: item.prizeId || "",
        prizeName: this.parsePrizeName(item.prizeInfo),
        prizeInfo: item.prizeInfo || "",
        voucherOssIds: Array.isArray(item.voucherOssIds) ? item.voucherOssIds : [],
        voucherList,
        createTime: item.createTime || "",
        status: this.normalizeEnum(item.status, [0, 1, 2]),
        auditRemark: item.auditRemark || ""
      };
    },
    buildQueryParams() {
      const form = this.filterForm || {};
      const params = {
        pageNum: this.pagination.pageNum > 0 ? this.pagination.pageNum : 1,
        pageSize: this.pagination.pageSize > 0 ? this.pagination.pageSize : 10,
        orderId: this.normalizeText(form.orderId),
        type: this.normalizeEnum(form.type, [0, 1]),
        companionId: this.normalizeInteger(form.companionId),
        companionName: this.normalizeText(form.companionName),
        clubId: this.normalizeInteger(form.clubId),
        clubName: this.normalizeText(form.clubName),
        status: this.normalizeEnum(form.status, [0, 1, 2])
      };
      if (Array.isArray(form.createTime) && form.createTime.length === 2) {
        params.startTime = form.createTime[0];
        params.endTime = form.createTime[1];
      }
      return Object.keys(params).reduce((result, key) => {
        const value = params[key];
        if (this.isValidParamValue(value)) result[key] = value;
        return result;
      }, {});
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
    async fetchTableData() {
      this.loading = true;
      try {
        const res = await getDepositAccountApprovalList(this.buildQueryParams());
        const { rows, total } = this.normalizeListRes(res);
        this.tableData = rows.map((item) => this.normalizeTableRow(item));
        this.pagination.total = total;
      } catch (e) {
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    handleSearch(formValues) {
      this.filterForm = {
        orderId: "",
        type: "",
        companionId: "",
        companionName: "",
        clubId: "",
        clubName: "",
        status: "",
        createTime: [],
        ...(formValues || {})
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
        orderId: "",
        type: "",
        companionId: "",
        companionName: "",
        clubId: "",
        clubName: "",
        status: "",
        createTime: []
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },
    goOrderFlow(orderId) {
      if (!orderId) return;
      const { href } = this.$router.resolve({
        path: "/financialManagement/orderFlow",
        query: { orderId }
      });
      window.open(href, "_blank");
    },
    openVoucherDialog(row) {
      this.voucherList = Array.isArray(row.voucherList) ? row.voucherList : [];
      this.voucherDialogVisible = true;
      if (!this.voucherList.length) {
        this.$message.warning("暂无可预览的凭证地址（接口未返回 URL）");
      }
    },
    previewVoucher(index = 0) {
      const images = this.voucherList.filter((item) => !item.isVideo).map((item) => item.url);
      if (!images.length) {
        this.$message.info("当前为视频凭证，暂不支持预览");
        return;
      }
      const current = this.voucherList[index];
      let start = 0;
      if (current && !current.isVideo) {
        start = images.indexOf(current.url);
      }
      this.previewList = images;
      this.previewIndex = start >= 0 ? start : 0;
      this.previewVisible = true;
    },
    async handleApprove(row) {
      if (this.auditSubmitting) return;
      try {
        await this.$confirm("通过即进行扣除，确认通过该申请吗？", "通过确认", {
          confirmButtonText: "确认通过",
          cancelButtonText: "取消",
          type: "warning"
        });
        await this.submitAudit(
          { id: row.id, status: 1 },
          "通过成功"
        );
      } catch (error) {
        if (error !== "cancel" && error !== "close") {
          // 库存不足等错误由拦截器提示
        }
      }
    },
    openRejectDialog(row) {
      this.rejectForm = {
        id: row.id,
        auditRemark: ""
      };
      this.rejectDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.rejectFormRef) this.$refs.rejectFormRef.clearValidate();
      });
    },
    submitReject() {
      if (!this.$refs.rejectFormRef || this.auditSubmitting) return;
      this.$refs.rejectFormRef.validate(async (valid) => {
        if (!valid) return;
        const ok = await this.submitAudit(
          {
            id: this.rejectForm.id,
            status: 2,
            auditRemark: this.normalizeText(this.rejectForm.auditRemark)
          },
          "驳回成功"
        );
        if (ok) this.rejectDialogVisible = false;
      });
    },
    async submitAudit(payload, successMessage) {
      this.auditSubmitting = true;
      try {
        await auditDepositAccountApproval(payload);
        this.$message.success(successMessage);
        this.fetchTableData();
        return true;
      } catch (error) {
        const msg = (error && error.message) || "";
        if (msg.includes("库存")) {
          // 已由拦截器提示；这里再兜底一次更贴近需求文案
          if (!msg.includes("补偿奖品库存不足")) {
            this.$message.error("补偿奖品库存不足，请驳回修改补偿奖品");
          }
        }
        return false;
      } finally {
        this.auditSubmitting = false;
      }
    },
    resetRejectForm() {
      this.rejectForm = { id: "", auditRemark: "" };
      if (this.$refs.rejectFormRef) this.$refs.rejectFormRef.resetFields();
    }
  }
};
</script>

<style scoped lang="scss">
.deposit-deduct-audit {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

::v-deep .list-card .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-scroll-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
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
  font-size: 13px;
  color: #606266;
}

.order-link,
.voucher-link,
.approve-btn {
  color: #409eff;
  font-weight: 600;
  padding: 0;
}

.reject-btn,
.reject-text {
  color: #f56c6c;
}

.amount-text {
  color: #303133;
  font-weight: 600;
}

.account-cell,
.prize-cell {
  line-height: 1.4;
}

.account-cell__name,
.prize-cell__name {
  color: #303133;
  font-weight: 600;
}

.account-cell__id,
.prize-cell__id {
  margin-top: 2px;
  color: #909399;
  font-size: 12px;
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

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.dark-btn {
  min-width: 88px;
  border-radius: 10px;
  font-weight: 600;
  background: #2f3542;
  border-color: #2f3542;
  color: #fff;
}

.dark-btn--ghost {
  background: #f3f4f8;
  border-color: #f3f4f8;
  color: #606266;
}

::v-deep .voucher-dialog,
::v-deep .reject-dialog {
  border-radius: 18px;
  overflow: hidden;
}

::v-deep .voucher-dialog .el-dialog__header,
::v-deep .reject-dialog .el-dialog__header {
  display: none;
}

::v-deep .voucher-dialog .el-dialog__body,
::v-deep .reject-dialog .el-dialog__body {
  padding: 0;
}

.voucher-dialog__panel,
.reject-dialog__panel {
  padding: 22px 24px;
}

.voucher-dialog__title,
.reject-dialog__title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2533;
  margin-bottom: 16px;
}

.voucher-dialog__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 96px;
}

.voucher-dialog__item {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e8eaf0;
  background: #f7f8fc;
  cursor: pointer;
}

.voucher-dialog__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.voucher-dialog__video {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #909399;
  background: #f0f2f5;
}

.voucher-dialog__empty {
  color: #909399;
  padding: 24px 0;
  text-align: center;
}

.voucher-dialog__footer,
.reject-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.reject-dialog__label {
  margin-bottom: 8px;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.is-required {
  color: #f56c6c;
  margin-right: 4px;
}

.reject-dialog__form ::v-deep .el-form-item {
  margin-bottom: 0;
}

.reject-dialog__form ::v-deep .el-textarea__inner {
  border-radius: 12px;
  min-height: 136px !important;
}
</style>
