<template>
  <el-dialog
    :visible.sync="dialogVisible"
    width="560px"
    custom-class="deposit-deduct-dialog"
    append-to-body
    :close-on-click-modal="false"
    :show-close="false"
    @close="handleClose"
  >
    <div class="deposit-deduct__panel" v-loading="balanceLoading">
      <div class="deposit-deduct__header">
        <div>
          <div class="deposit-deduct__title">保证金扣减</div>
          <div class="deposit-deduct__subtitle">扣减后，保证金余额支持为负数</div>
        </div>
        <div class="deposit-deduct__user">
          {{ type === 1 ? "俱乐部ID" : "用户ID" }} {{ targetId || "--" }}
        </div>
      </div>

      <div class="deposit-deduct__balance">
        <div class="deposit-deduct__balance-label">保证金余额</div>
        <div class="deposit-deduct__balance-row">
          <div class="deposit-deduct__balance-value">{{ formatAmount(currentBalance) }}</div>
          <div class="deposit-deduct__balance-unit">元</div>
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="96px"
        class="deposit-deduct__form"
      >
        <div class="deposit-deduct__card">
          <el-form-item label="扣减" prop="amount">
            <div class="deposit-deduct__amount">
              <el-input
                v-model="form.amount"
                class="deposit-deduct__amount-input"
                placeholder="请输入扣减金额"
                @input="handleAmountInput"
              />
              <span class="deposit-deduct__amount-unit">元</span>
            </div>
          </el-form-item>
          <el-form-item label="原因" prop="reason">
            <el-input
              v-model="form.reason"
              type="textarea"
              :rows="4"
              maxlength="50"
              show-word-limit
              placeholder="请输入扣减原因"
            />
          </el-form-item>
        </div>

        <div class="deposit-deduct__card deposit-deduct__card--upload">
          <div class="deposit-deduct__upload-title">
            <span class="is-required">*</span>扣除凭证（上限5组）
          </div>
          <div class="deposit-deduct__upload-desc">支持图片，最多上传 5 张</div>
          <el-form-item label-width="0" prop="ossIds" class="deposit-deduct__upload-item">
            <div class="deposit-deduct__upload-list">
              <div
                v-for="(item, index) in voucherList"
                :key="`${item.ossId}-${index}`"
                class="deposit-deduct__upload-thumb"
              >
                <img :src="item.url" alt="" @click="previewImage(index)" />
                <button type="button" class="deposit-deduct__upload-remove" @click="removeVoucher(index)">
                  <i class="el-icon-close" />
                </button>
              </div>
              <el-upload
                v-if="voucherList.length < 5"
                action="#"
                :show-file-list="false"
                :before-upload="beforeUpload"
                :http-request="handleUpload"
                accept=".png,.jpg,.jpeg"
                :disabled="uploading"
                class="deposit-deduct__uploader"
              >
                <div class="deposit-deduct__upload-trigger">
                  <template v-if="uploading">
                    <i class="el-icon-loading" />
                    <span>上传中</span>
                  </template>
                  <template v-else>
                    <i class="el-icon-plus" />
                    <span>上传</span>
                  </template>
                </div>
              </el-upload>
            </div>
          </el-form-item>
        </div>
      </el-form>

      <div class="deposit-deduct__footer">
        <el-button class="deposit-deduct__btn deposit-deduct__btn--ghost" @click="closeDialog">取消</el-button>
        <el-button
          type="primary"
          class="deposit-deduct__btn deposit-deduct__btn--primary"
          :loading="submitting"
          @click="submit"
        >提交</el-button>
      </div>
    </div>

    <ImgZoom v-model="previewVisible" :img-list="previewList" :init-index="previewIndex" />
  </el-dialog>
</template>

<script>
import ImgZoom from "@/components/ImgZoom/index.vue";
import { fileUpload } from "@/api/user";
import {
  getDepositAccount,
  addDepositAccountApproval
} from "@/api/depositAccountApproval";

export default {
  name: "DepositDeductDialog",
  components: { ImgZoom },
  props: {
    visible: { type: Boolean, default: false },
    /** 0 个人 1 工会/俱乐部 */
    type: { type: Number, default: 0 },
    targetId: { type: [String, Number], default: "" },
    depositAmount: { type: [String, Number], default: "" }
  },
  data() {
    return {
      balanceLoading: false,
      submitting: false,
      uploading: false,
      currentBalance: "",
      form: {
        amount: "",
        reason: "",
        ossIds: []
      },
      voucherList: [],
      previewVisible: false,
      previewList: [],
      previewIndex: 0,
      rules: {
        amount: [{ required: true, validator: this.validateAmount, trigger: "blur" }],
        reason: [{ required: true, message: "请输入扣减原因", trigger: "blur" }],
        ossIds: [{ validator: this.validateVouchers, trigger: "change" }]
      }
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit("update:visible", val);
      }
    }
  },
  watch: {
    visible(val) {
      if (val) this.initDialog();
    }
  },
  methods: {
    formatAmount(val) {
      if (val === null || val === undefined || val === "") return "--";
      const num = Number(val);
      return Number.isFinite(num) ? num : String(val);
    },
    async initDialog() {
      this.resetForm();
      this.currentBalance = this.depositAmount;
      if (!this.targetId && this.targetId !== 0) return;
      this.balanceLoading = true;
      try {
        const res = await getDepositAccount({
          id: Number(this.targetId),
          type: Number(this.type)
        });
        // 拦截器返回 response.data.data，余额在 res.data
        let balance = res;
        if (res && typeof res === "object" && res.data !== undefined) {
          balance = res.data;
        }
        if (balance !== undefined && balance !== null && typeof balance !== "object") {
          this.currentBalance = balance;
        }
      } catch (e) {
        // 保留列表余额
      } finally {
        this.balanceLoading = false;
      }
    },
    handleAmountInput(val) {
      let text = String(val || "").replace(/[^\d.]/g, "");
      const parts = text.split(".");
      if (parts.length > 2) text = `${parts[0]}.${parts.slice(1).join("")}`;
      if (parts[1] && parts[1].length > 2) {
        text = `${parts[0]}.${parts[1].slice(0, 2)}`;
      }
      this.form.amount = text;
    },
    validateAmount(rule, value, callback) {
      if (value === "" || value === null || value === undefined) {
        callback(new Error("请输入扣减金额"));
        return;
      }
      const num = Number(value);
      if (!Number.isFinite(num) || num <= 0) {
        callback(new Error("请输入大于0的金额"));
        return;
      }
      callback();
    },
    validateVouchers(rule, value, callback) {
      if (!this.voucherList.length) {
        callback(new Error("请上传扣除凭证"));
        return;
      }
      callback();
    },
    beforeUpload(file) {
      const okType = ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
      if (!okType) {
        this.$message.error("仅支持 png、jpg 图片");
        return false;
      }
      if (file.size / 1024 / 1024 > 20) {
        this.$message.error("图片不能超过 20MB");
        return false;
      }
      return true;
    },
    async handleUpload({ file }) {
      this.uploading = true;
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fileUpload(formData);
        const uploadData =
          response && response.data && response.data.data
            ? response.data.data
            : response.data;
        if (
          (response.code === 200 ||
            response.success ||
            (response.data && response.data.code === 200)) &&
          uploadData &&
          uploadData.url
        ) {
          this.voucherList.push({
            url: uploadData.url,
            ossId: uploadData.ossId || ""
          });
          this.form.ossIds = this.voucherList.map((item) => item.url).filter(Boolean);
          this.$nextTick(() => {
            if (this.$refs.formRef) this.$refs.formRef.validateField("ossIds");
          });
        } else {
          throw new Error(
            response.message ||
              (response.data && response.data.errorMessage) ||
              "上传失败"
          );
        }
      } catch (error) {
        this.$message.error((error && error.message) || "上传失败");
      } finally {
        this.uploading = false;
      }
    },
    removeVoucher(index) {
      this.voucherList.splice(index, 1);
      this.form.ossIds = this.voucherList.map((item) => item.url).filter(Boolean);
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.validateField("ossIds");
      });
    },
    previewImage(index) {
      this.previewList = this.voucherList.map((item) => item.url);
      this.previewIndex = index || 0;
      this.previewVisible = true;
    },
    resetForm() {
      this.form = { amount: "", reason: "", ossIds: [] };
      this.voucherList = [];
      this.submitting = false;
      this.uploading = false;
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },
    handleClose() {
      this.resetForm();
    },
    closeDialog() {
      this.dialogVisible = false;
    },
    submit() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return;
        if (!this.targetId && this.targetId !== 0) {
          this.$message.error("缺少目标ID");
          return;
        }
        this.submitting = true;
        try {
          await addDepositAccountApproval({
            utId: Number(this.targetId),
            type: Number(this.type),
            amount: Number(this.form.amount),
            reason: this.form.reason.trim(),
            // 扣除凭证传图片 URL
            ossIds: this.voucherList.map((item) => item.url).filter(Boolean)
          });
          this.$message.success("提交成功，已进入审核");
          this.dialogVisible = false;
          this.$emit("success");
        } catch (e) {
          // 错误由拦截器提示
        } finally {
          this.submitting = false;
        }
      });
    }
  }
};
</script>

<style scoped lang="scss">
::v-deep .deposit-deduct-dialog {
  border-radius: 20px;
  overflow: hidden;
}

::v-deep .deposit-deduct-dialog .el-dialog__header {
  display: none;
}

::v-deep .deposit-deduct-dialog .el-dialog__body {
  padding: 0;
}

.deposit-deduct__panel {
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.1), transparent 26%),
    linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
}

.deposit-deduct__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.deposit-deduct__title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2533;
}

.deposit-deduct__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #8a93a6;
}

.deposit-deduct__user {
  flex-shrink: 0;
  height: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(144, 71, 248, 0.08);
  color: #9047f8;
  font-size: 12px;
  font-weight: 600;
}

.deposit-deduct__balance {
  position: relative;
  margin-bottom: 16px;
  padding: 20px 22px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #1f2433 0%, #34435f 100%);
  box-shadow: 0 14px 28px rgba(44, 58, 88, 0.18);
  overflow: hidden;
}

.deposit-deduct__balance::after {
  content: "";
  position: absolute;
  right: -18px;
  top: -18px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.deposit-deduct__balance-label,
.deposit-deduct__balance-row {
  position: relative;
  z-index: 1;
}

.deposit-deduct__balance-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.deposit-deduct__balance-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
}

.deposit-deduct__balance-value {
  font-size: 34px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.deposit-deduct__balance-unit {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.66);
}

.deposit-deduct__card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(225, 230, 239, 0.9);
  border-radius: 18px;
  padding: 18px 18px 8px;
  margin-bottom: 14px;
  box-shadow: 0 10px 28px rgba(83, 97, 123, 0.06);
}

.deposit-deduct__form ::v-deep .el-form-item {
  margin-bottom: 18px;
}

.deposit-deduct__form ::v-deep .el-form-item:last-child {
  margin-bottom: 8px;
}

.deposit-deduct__form ::v-deep .el-form-item__label {
  font-weight: 600;
  color: #303645;
}

.deposit-deduct__form ::v-deep .el-textarea__inner {
  border-radius: 14px;
  border-color: #e2e8f2;
  background: #fbfcff;
}

.deposit-deduct__form ::v-deep .el-textarea__inner:focus {
  border-color: #9047f8;
  box-shadow: 0 0 0 3px rgba(144, 71, 248, 0.08);
}

.is-required {
  color: #f56c6c;
  margin-right: 2px;
}

.deposit-deduct__amount {
  display: flex;
  align-items: center;
  max-width: 300px;
  height: 44px;
  padding-right: 4px;
  border: 1px solid #e2e8f2;
  border-radius: 14px;
  background: #fbfcff;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: #d0d7e6;
  }

  &:focus-within {
    border-color: #9047f8;
    box-shadow: 0 0 0 3px rgba(144, 71, 248, 0.1);
  }
}

.deposit-deduct__amount-input {
  flex: 1;
  min-width: 0;

  ::v-deep .el-input__inner {
    height: 42px;
    line-height: 42px;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    padding-right: 8px;
  }
}

.deposit-deduct__amount-unit {
  flex-shrink: 0;
  min-width: 48px;
  height: 34px;
  margin-right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(144, 71, 248, 0.08);
  color: #6a4ce0;
  font-size: 13px;
  font-weight: 700;
}

.deposit-deduct__upload-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2533;
}

.deposit-deduct__upload-desc {
  margin: 4px 0 12px;
  font-size: 12px;
  color: #909399;
}

.deposit-deduct__upload-item {
  margin-bottom: 0 !important;
}

.deposit-deduct__upload-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.deposit-deduct__upload-thumb,
.deposit-deduct__upload-trigger {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.deposit-deduct__upload-thumb {
  border: 1px solid #e8eaf0;
}

.deposit-deduct__upload-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.deposit-deduct__upload-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
}

.deposit-deduct__upload-trigger {
  border: 1px dashed #d5dae5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #909399;
  background: #fafafa;
  cursor: pointer;
}

.deposit-deduct__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.deposit-deduct__btn {
  min-width: 88px;
  border-radius: 10px;
  font-weight: 600;
}

.deposit-deduct__btn--ghost {
  background: #f3f4f8;
  border-color: #f3f4f8;
  color: #606266;
}

.deposit-deduct__btn--primary {
  background: #2f3542;
  border-color: #2f3542;
}
</style>
