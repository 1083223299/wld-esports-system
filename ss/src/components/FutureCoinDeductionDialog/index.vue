<template>
  <div class="future-coin-deduction-dialog-root">
    <el-dialog :visible.sync="dialogVisible" width="560px" :close-on-click-modal="false"
      custom-class="future-coin-deduction-dialog"
      append-to-body @close="handleDialogClose">
      <div class="deduction-dialog__panel" v-loading="deductionLoading">
        <div class="deduction-dialog__header">
          <div>
            <div class="deduction-dialog__title">未来币扣减</div>
            <div class="deduction-dialog__subtitle">请填写扣减信息并上传扣除凭证，提交后进入审核流程</div>
          </div>
          <div class="deduction-dialog__user">{{ userIdLabel }} {{ deductionForm.userId || '--' }}</div>
        </div>

        <div class="deduction-summary">
          <div class="deduction-summary__label">{{ deductionBalanceLabel }}</div>
          <div class="deduction-summary__value">{{ formatAmount(currentDeductionBalance) }}</div>
          <div class="deduction-summary__unit">未来币</div>
        </div>

        <el-form ref="deductionFormRef" :model="deductionForm" :rules="deductionRules" label-width="96px" class="deduction-form">
          <div class="deduction-form-card">
            <el-form-item label="扣减类型" prop="type">
              <el-radio-group v-model="deductionForm.type" @change="handleDeductionTypeChange" class="deduction-radio-group">
                <el-radio :label="0" class="deduction-radio">我的余额</el-radio>
                <el-radio :label="1" class="deduction-radio">可用余额（可提现）</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item prop="amount">
              <template slot="label"><span class="deduction-label-required">*</span>扣减</template>
              <div class="deduction-amount" :class="{ 'is-focus': amountFocused }">
                <el-input v-model="deductionForm.amount" class="deduction-amount__input" placeholder="请输入扣减金额"
                  @input="handleDeductionAmountInput" @focus="amountFocused = true" @blur="amountFocused = false" />
                <span class="deduction-amount__unit">未来币</span>
              </div>
            </el-form-item>

            <el-form-item label="原因" prop="reason">
              <el-input v-model="deductionForm.reason" type="textarea" :rows="5" maxlength="50" show-word-limit
                placeholder="请输入申请原因" />
            </el-form-item>
          </div>

          <div class="deduction-upload-card">
            <div class="deduction-upload-card__header">
              <div class="deduction-upload-card__title"><span class="deduction-required">*</span>扣除凭证</div>
              <div class="deduction-upload-card__desc">仅支持图片，最多上传 5 张，支持点击预览大图</div>
            </div>
            <el-form-item label-width="0" prop="ossIds" class="deduction-upload-card__form-item">
              <div class="deduction-upload">
                <div class="deduction-upload__list">
                  <div v-for="(item, index) in deductionVoucherList" :key="`${item.ossId}-${index}`" class="deduction-upload__item">
                    <img :src="item.url" class="deduction-upload__img" @click="previewDeductionVoucher(index)" />
                    <button type="button" class="deduction-upload__remove" @click="removeDeductionVoucher(index)">
                      <i class="el-icon-close"></i>
                    </button>
                  </div>

                  <el-upload v-if="deductionVoucherList.length < 5" action="#" :show-file-list="false"
                    :before-upload="beforeDeductionUpload" :http-request="handleDeductionUpload"
                    class="deduction-upload__uploader" accept=".png,.jpg,.jpeg" :disabled="deductionUploading">
                    <div class="deduction-upload__trigger">
                      <div v-if="deductionUploading" class="deduction-upload__loading">
                        <i class="el-icon-loading"></i>
                        <span>上传中...</span>
                      </div>
                      <template v-else>
                        <i class="el-icon-plus"></i>
                        <span>上传图片</span>
                      </template>
                    </div>
                  </el-upload>
                </div>
              </div>
            </el-form-item>
          </div>
        </el-form>

        <div class="deduction-dialog__footer">
          <el-button class="deduction-dialog__btn deduction-dialog__btn--ghost" @click="closeDialog">取消</el-button>
          <el-button type="primary" class="deduction-dialog__btn deduction-dialog__btn--primary"
            :loading="deductionSubmitting" @click="submitDeduction">提交</el-button>
        </div>
      </div>
    </el-dialog>
    <ImgZoom v-model="deductionPreviewVisible" :img-list="deductionPreviewList" :initial-index="deductionPreviewIndex" />
  </div>
</template>

<script>
import ImgZoom from "@/components/ImgZoom/index.vue";
import { fileUpload } from "@/api/user";
import { getUserAccountDetail, addAccountApproval } from "@/api/personalSupport";

export default {
  name: "FutureCoinDeductionDialog",
  components: {
    ImgZoom
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    userId: {
      type: [String, Number],
      default: ""
    },
    userIdLabel: {
      type: String,
      default: "用户ID"
    },
    orderId: {
      type: [String, Number],
      default: ""
    }
  },
  data() {
    return {
      deductionLoading: false,
      deductionSubmitting: false,
      deductionUploading: false,
      amountFocused: false,
      deductionPreviewVisible: false,
      deductionPreviewIndex: 0,
      deductionPreviewList: [],
      deductionVoucherList: [],
      accountDetail: {
        userId: "",
        amount: 0,
        allAmount: 0,
        freezeAmount: 0,
        withdrawnAmount: 0,
        availableAmount: 0
      },
      deductionForm: {
        userId: "",
        type: 0,
        amount: "",
        reason: "",
        ossIds: []
      },
      deductionRules: {
        type: [{ required: true, message: "请选择扣减类型", trigger: "change" }],
        amount: [{ validator: (rule, value, callback) => this.validateDeductionAmount(rule, value, callback), trigger: "blur" }],
        reason: [
          { required: true, message: "请输入申请原因", trigger: "blur" },
          { max: 50, message: "申请原因不能超过50字", trigger: "blur" }
        ],
        ossIds: [{ validator: (rule, value, callback) => this.validateDeductionVouchers(rule, value, callback), trigger: "change" }]
      }
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(value) {
        this.$emit("update:visible", value);
      }
    },
    currentDeductionBalance() {
      return Number(this.deductionForm.type === 0 ? this.accountDetail.amount : this.accountDetail.availableAmount) || 0;
    },
    deductionBalanceLabel() {
      return this.deductionForm.type === 0 ? "我的余额" : "可用余额（可提现）";
    }
  },
  watch: {
    visible(value) {
      if (value) {
        this.initializeDialog();
      }
    }
  },
  methods: {
    async initializeDialog() {
      if (!this.userId) {
        this.$message.error("缺少用户ID");
        this.closeDialog();
        return;
      }
      this.resetDeductionForm(this.userId);
      this.deductionLoading = true;
      const success = await this.fetchAccountDetail(this.userId);
      this.deductionLoading = false;
      if (!success) {
        this.closeDialog();
        return;
      }
      this.handleDeductionTypeChange();
    },
    async fetchAccountDetail(userId) {
      this.accountDetail = {
        userId: userId || "",
        amount: 0,
        allAmount: 0,
        freezeAmount: 0,
        withdrawnAmount: 0,
        availableAmount: 0
      };
      try {
        const res = await getUserAccountDetail(userId);
        if (res && res.success && res.data) {
          this.accountDetail = {
            ...this.accountDetail,
            ...res.data
          };
          return true;
        }
        this.$message.error((res && res.errorMessage) || "获取资产信息失败");
        return false;
      } catch (error) {
        console.error("获取资产信息失败:", error);
        this.$message.error("获取资产信息失败");
        return false;
      }
    },
    handleDeductionTypeChange() {
      if (this.$refs.deductionFormRef) {
        this.$refs.deductionFormRef.clearValidate(["amount"]);
      }
    },
    handleDeductionAmountInput(value) {
      this.deductionForm.amount = String(value || "")
        .replace(/[^\d.]/g, "")
        .replace(/(\..*)\./g, "$1")
        .replace(/^(\d+)\.(\d{0,2}).*$/, "$1.$2");
    },
    validateDeductionAmount(rule, value, callback) {
      if (value === "" || value === null || value === undefined) {
        callback(new Error("请输入扣减金额"));
        return;
      }
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) {
        callback(new Error("扣减金额必须大于0"));
        return;
      }
      callback();
    },
    validateDeductionVouchers(rule, value, callback) {
      if (!Array.isArray(this.deductionForm.ossIds) || !this.deductionForm.ossIds.length) {
        callback(new Error("请上传扣除凭证"));
        return;
      }
      callback();
    },
    beforeDeductionUpload(file) {
      const isImage = file.type.startsWith("image/");
      const isLt5M = file.size / 1024 / 1024 < 5;
      const allowedTypes = ["image/png", "image/jpg", "image/jpeg"];
      if (!isImage || !allowedTypes.includes(file.type)) {
        this.$message.error("仅支持上传png、jpg、jpeg格式的图片");
        return false;
      }
      if (!isLt5M) {
        this.$message.error("图片大小不能超过 5MB");
        return false;
      }
      if (this.deductionVoucherList.length >= 5) {
        this.$message.error("最多上传5张凭证");
        return false;
      }
      return true;
    },
    async handleDeductionUpload({ file, onSuccess }) {
      try {
        this.deductionUploading = true;
        const formData = new FormData();
        formData.append("file", file);
        const response = await fileUpload(formData);
        if (response.code === 200 && response.data && response.data.ossId) {
          const item = {
            url: URL.createObjectURL(file),
            ossId: response.data.ossId
          };
          this.deductionVoucherList.push(item);
          this.deductionForm.ossIds = this.deductionVoucherList.map(voucher => voucher.ossId);
          if (this.$refs.deductionFormRef) {
            this.$refs.deductionFormRef.validateField("ossIds");
          }
          onSuccess && onSuccess("success");
          this.$message.success("凭证上传成功");
          return;
        }
        throw new Error(response.message || "上传失败");
      } catch (error) {
        this.$message.error(error.message || "上传失败");
      } finally {
        this.deductionUploading = false;
      }
    },
    removeDeductionVoucher(index) {
      this.deductionVoucherList.splice(index, 1);
      this.deductionForm.ossIds = this.deductionVoucherList.map(voucher => voucher.ossId);
      if (this.$refs.deductionFormRef) {
        this.$refs.deductionFormRef.validateField("ossIds");
      }
    },
    previewDeductionVoucher(index) {
      this.deductionPreviewList = this.deductionVoucherList.map(item => item.url);
      this.deductionPreviewIndex = index;
      this.deductionPreviewVisible = true;
    },
    resetDeductionForm(userId = "") {
      this.deductionVoucherList = [];
      this.deductionPreviewList = [];
      this.deductionForm = {
        userId: userId || "",
        type: 0,
        amount: "",
        reason: "",
        ossIds: []
      };
      this.$nextTick(() => {
        if (this.$refs.deductionFormRef) {
          this.$refs.deductionFormRef.clearValidate();
        }
      });
    },
    handleDialogClose() {
      this.resetDeductionForm();
      this.amountFocused = false;
      this.deductionLoading = false;
      this.deductionSubmitting = false;
      this.deductionUploading = false;
    },
    closeDialog() {
      this.dialogVisible = false;
    },
    async submitDeduction() {
      if (!this.$refs.deductionFormRef) {
        return;
      }
      this.$refs.deductionFormRef.validate(async valid => {
        if (!valid) {
          return;
        }
        this.deductionSubmitting = true;
        try {
          const payload = {
            userId: this.deductionForm.userId,
            type: this.deductionForm.type,
            amount: Number(this.deductionForm.amount),
            reason: this.deductionForm.reason,
            ossIds: this.deductionForm.ossIds
          };
          if (this.orderId !== "" && this.orderId !== null && this.orderId !== undefined) {
            payload.orderId = this.orderId;
          }
          const res = await addAccountApproval(payload);
          if (res && (res.success || res.code === 200)) {
            this.$message.success("提交成功");
            this.$emit("success", res);
            this.closeDialog();
            return;
          }
          this.$message.error((res && (res.errorMessage || res.msg)) || "提交失败");
        } catch (error) {
          console.error("未来币扣减提交失败:", error);
          this.$message.error("提交失败");
        } finally {
          this.deductionSubmitting = false;
        }
      });
    },
    formatAmount(value) {
      const amount = Number(value || 0);
      if (!Number.isFinite(amount)) {
        return "0.00";
      }
      return amount.toFixed(2);
    }
  }
};
</script>

<style>
.future-coin-deduction-dialog {
  border-radius: 24px;
  overflow: hidden;
  margin-top: 8vh !important;
}

.future-coin-deduction-dialog .el-dialog__header {
  display: none;
}

.future-coin-deduction-dialog .el-dialog__body {
  padding: 0 !important;
}

.future-coin-deduction-dialog .el-dialog__footer {
  padding: 0 !important;
}

.future-coin-deduction-dialog .el-form-item__error {
  padding-top: 4px;
}
</style>

<style scoped>

.deduction-dialog__panel {
  padding: 26px 28px 24px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.1), transparent 24%),
    radial-gradient(circle at top right, rgba(12, 167, 255, 0.08), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
}

.deduction-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.deduction-dialog__title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2533;
}

.deduction-dialog__subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #7b8496;
}

.deduction-dialog__user {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(143, 3, 255, 0.08);
  font-size: 12px;
  font-weight: 600;
  color: #6a4ce0;
}

.deduction-summary {
  position: relative;
  margin-bottom: 16px;
  padding: 22px 22px 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1f2433 0%, #34435f 100%);
  box-shadow: 0 14px 28px rgba(44, 58, 88, 0.2);
  overflow: hidden;
}

.deduction-summary::after {
  content: "";
  position: absolute;
  right: -18px;
  top: -18px;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.deduction-summary__label,
.deduction-summary__value,
.deduction-summary__unit {
  position: relative;
  z-index: 1;
}

.deduction-summary__label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.deduction-summary__value {
  margin-top: 10px;
  font-size: 34px;
  line-height: 1;
  font-weight: 700;
  color: #fff;
}

.deduction-summary__unit {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
}

.deduction-form ::v-deep .el-form-item {
  margin-bottom: 20px;
}

.deduction-form ::v-deep .el-form-item__label {
  font-weight: 600;
  color: #303645;
}

.deduction-form-card,
.deduction-upload-card {
  padding: 18px 18px 4px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(225, 230, 239, 0.88);
  box-shadow: 0 10px 28px rgba(83, 97, 123, 0.08);
}

.deduction-upload-card {
  margin-top: 14px;
  padding-bottom: 16px;
}

.deduction-radio-group {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  width: 100%;
}

.deduction-radio {
  margin-right: 0;
}

.deduction-radio-group ::v-deep .el-radio__label {
  font-size: 14px;
  color: #4b5565;
}

.deduction-radio-group ::v-deep .el-radio__input.is-checked+.el-radio__label {
  color: #5b46d6;
  font-weight: 600;
}

.deduction-radio-group ::v-deep .el-radio__inner {
  width: 16px;
  height: 16px;
  border-color: #c9d2e3;
}

.deduction-radio-group ::v-deep .el-radio__input.is-checked .el-radio__inner {
  border-color: #8f03ff;
  background: #8f03ff;
}

.deduction-radio-group ::v-deep .el-radio__inner::after {
  width: 6px;
  height: 6px;
}

.deduction-amount {
  display: flex;
  align-items: stretch;
  max-width: 320px;
  height: 42px;
  overflow: hidden;
  border: 1px solid #e2e8f2;
  border-radius: 14px;
  background: #fbfcff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.deduction-amount.is-focus {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.deduction-amount__input {
  flex: 1;
  min-width: 0;
}

.deduction-amount__input ::v-deep .el-input__inner {
  height: 40px;
  line-height: 40px;
  border: none !important;
  border-radius: 0 !important;
  background: transparent;
  box-shadow: none !important;
}

.deduction-amount__input ::v-deep .el-input__inner:focus {
  border: none !important;
  box-shadow: none !important;
}

.deduction-amount__unit {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 0 14px;
  border-left: 1px solid #e2e8f2;
  background: #f5f7fb;
  color: #5d6678;
  font-size: 14px;
  font-weight: 600;
}

.deduction-form ::v-deep .el-input__inner,
.deduction-form ::v-deep .el-textarea__inner {
  border-radius: 14px;
  border-color: #e2e8f2;
  background: #fbfcff;
}

.deduction-form ::v-deep .el-input__inner {
  height: 42px;
  line-height: 42px;
}

.deduction-form ::v-deep .el-input__inner:focus,
.deduction-form ::v-deep .el-textarea__inner:focus {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.deduction-upload-card__header {
  margin-bottom: 14px;
}

.deduction-upload-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2533;
}

.deduction-required {
  margin-right: 4px;
  color: #f56c6c;
}

.deduction-label-required {
  margin-right: 4px;
  color: #f56c6c;
}

.deduction-upload-card__desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #8a94a6;
}

.deduction-upload-card__form-item {
  margin-bottom: 0 !important;
}

.deduction-upload__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.deduction-upload__item,
.deduction-upload__trigger {
  width: 92px;
  height: 92px;
  border-radius: 18px;
}

.deduction-upload__item {
  position: relative;
  overflow: hidden;
  border: 1px solid #e6eaf2;
  background: #fff;
  box-shadow: 0 8px 20px rgba(90, 105, 132, 0.08);
}

.deduction-upload__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.deduction-upload__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(31, 37, 51, 0.72);
  color: #fff;
  cursor: pointer;
}

.deduction-upload__uploader {
  display: inline-flex;
}

.deduction-upload__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  border: 1px dashed #cad3e4;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
  color: #6d7890;
  transition: all 0.2s ease;
}

.deduction-upload__trigger:hover {
  border-color: #8f03ff;
  color: #6a4ce0;
  box-shadow: 0 10px 22px rgba(143, 3, 255, 0.08);
}

.deduction-upload__loading {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.deduction-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
}

.deduction-dialog__btn {
  min-width: 92px;
  height: 38px;
  border-radius: 999px;
}

.deduction-dialog__btn--ghost {
  border-color: #dbe1ec;
  background: #fff;
  color: #566174;
}

.deduction-dialog__btn--ghost:hover,
.deduction-dialog__btn--ghost:focus {
  color: #566174;
  border-color: #c8d1e0;
  background: #f8faff;
}

.deduction-dialog__btn--primary {
  border: none;
  background: linear-gradient(135deg, #8f03ff 0%, #5c67ff 100%);
  box-shadow: 0 10px 22px rgba(108, 95, 255, 0.22);
}

.deduction-dialog__btn--primary:hover,
.deduction-dialog__btn--primary:focus {
  background: linear-gradient(135deg, #7b00df 0%, #4f58eb 100%);
}
</style>
