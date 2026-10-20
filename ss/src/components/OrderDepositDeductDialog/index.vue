<template>
  <el-dialog
    :visible.sync="dialogVisible"
    width="560px"
    custom-class="order-deposit-deduct-dialog"
    append-to-body
    :close-on-click-modal="false"
    :show-close="false"
    @close="handleClose"
  >
    <div class="order-deduct__panel" v-loading="balanceLoading">
      <div class="order-deduct__header">
        <div>
          <div class="order-deduct__title">保证金扣除</div>
          <div class="order-deduct__subtitle">扣减后，保证金余额支持为负数</div>
        </div>
        <div v-if="accountType === 1 && clubId" class="order-deduct__badge">
          俱乐部ID {{ clubId }}
        </div>
      </div>

      <div class="order-deduct__balance">
        <div class="order-deduct__account">
          <div class="order-deduct__account-label">{{ accountLabel }}</div>
          <div class="order-deduct__account-value">{{ accountName || "--" }}</div>
        </div>
        <div class="order-deduct__balance-label">保证金余额</div>
        <div class="order-deduct__balance-row">
          <div class="order-deduct__balance-value">{{ formatAmount(currentBalance) }}</div>
          <div class="order-deduct__balance-unit">元</div>
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="96px"
        class="order-deduct__form"
      >
        <div class="order-deduct__card">
          <el-form-item label="扣除原因" prop="reasonId">
            <el-select
              v-model="form.reasonId"
              placeholder="请选择扣除原因"
              style="width: 100%"
              :loading="reasonLoading"
              @change="handleReasonChange"
            >
              <el-option
                v-for="item in reasonOptions"
                :key="item.id"
                :label="item.reasonName"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="扣除金额" prop="amount">
            <div class="order-deduct__amount is-readonly">
              <el-input
                v-model="form.amount"
                class="order-deduct__amount-input"
                placeholder="请先选择扣除原因"
                readonly
              />
              <span class="order-deduct__amount-unit">元</span>
            </div>
          </el-form-item>
        </div>

        <div class="order-deduct__card order-deduct__card--upload">
          <div class="order-deduct__upload-title">
            <span class="is-required">*</span>扣除凭证（上限5个）
          </div>
          <div class="order-deduct__upload-desc">支持 png、jpg、jpeg、mp4，最多上传 5 个</div>
          <el-form-item label-width="0" prop="ossIds" class="order-deduct__upload-item">
            <div class="order-deduct__upload-list">
              <div
                v-for="(item, index) in voucherList"
                :key="`${item.ossId || item.url}-${index}`"
                class="order-deduct__upload-thumb"
              >
                <template v-if="item.type === 'video'">
                  <video :src="item.url" muted preload="metadata" />
                  <div class="order-deduct__video-mask" @click="previewVideo(item.url)">
                    <i class="el-icon-video-play" />
                  </div>
                </template>
                <img v-else :src="item.url" alt="" @click="previewImage(index)" />
                <button type="button" class="order-deduct__upload-remove" @click="removeVoucher(index)">
                  <i class="el-icon-close" />
                </button>
              </div>
              <el-upload
                v-if="voucherList.length < 5"
                action="#"
                :show-file-list="false"
                :before-upload="beforeUpload"
                :http-request="handleUpload"
                accept=".png,.jpg,.jpeg,.mp4"
                :disabled="uploading"
                class="order-deduct__uploader"
              >
                <div class="order-deduct__upload-trigger">
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

        <div class="order-deduct__card">
          <div class="order-deduct__section-title">给下单人发券补偿</div>
          <div class="order-deduct__section-desc">选填，选择后将向订单下单人发放对应奖品</div>
          <el-form-item label="奖品ID" prop="prizeId" label-width="72px">
            <el-select
              v-model="form.prizeId"
              filterable
              remote
              clearable
              reserve-keyword
              placeholder="请输入奖品名称或ID搜索"
              :remote-method="searchPrize"
              :loading="prizeLoading"
              style="width: 100%"
            >
              <el-option
                v-for="item in prizeOptions"
                :key="item.prizeId"
                :label="formatPrizeLabel(item)"
                :value="item.prizeId"
              />
            </el-select>
          </el-form-item>
        </div>
      </el-form>

      <div class="order-deduct__footer">
        <el-button class="order-deduct__btn order-deduct__btn--ghost" @click="closeDialog">取消</el-button>
        <el-button
          type="primary"
          class="order-deduct__btn order-deduct__btn--primary"
          :loading="submitting"
          @click="submit"
        >提交</el-button>
      </div>
    </div>

    <ImgZoom v-model="previewVisible" :img-list="previewList" :init-index="previewIndex" />

    <el-dialog
      :visible.sync="videoPreviewVisible"
      title="视频预览"
      width="640px"
      append-to-body
      custom-class="order-deduct-video-dialog"
      @closed="videoPreviewUrl = ''"
    >
      <video
        v-if="videoPreviewUrl"
        :src="videoPreviewUrl"
        controls
        autoplay
        class="order-deduct__video-player"
      />
    </el-dialog>
  </el-dialog>
</template>

<script>
import ImgZoom from "@/components/ImgZoom/index.vue";
import { fileUpload } from "@/api/user";
import {
  getDepositAccount,
  addDepositAccountApproval
} from "@/api/depositAccountApproval";
import { getDepositDeductReasonList } from "@/api/deductionConfig";
import { OperationPrizeList } from "@/api/prize";

export default {
  name: "OrderDepositDeductDialog",
  components: { ImgZoom },
  props: {
    visible: { type: Boolean, default: false },
    orderId: { type: [String, Number], default: "" },
    /** 0 个人陪陪 1 俱乐部 */
    accountType: { type: Number, default: 0 },
    accountId: { type: [String, Number], default: "" },
    accountName: { type: String, default: "" },
    clubId: { type: [String, Number], default: "" }
  },
  data() {
    return {
      balanceLoading: false,
      reasonLoading: false,
      prizeLoading: false,
      submitting: false,
      uploading: false,
      currentBalance: "",
      reasonOptions: [],
      prizeOptions: [],
      form: {
        reasonId: "",
        reason: "",
        amount: "",
        ossIds: [],
        prizeId: null
      },
      voucherList: [],
      previewVisible: false,
      previewList: [],
      previewIndex: 0,
      videoPreviewVisible: false,
      videoPreviewUrl: "",
      rules: {
        reasonId: [{ required: true, message: "请选择扣除原因", trigger: "change" }],
        amount: [{ required: true, validator: this.validateAmount, trigger: "blur" }],
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
    },
    accountLabel() {
      return this.accountType === 1 ? "俱乐部名称" : "陪陪名称";
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
    normalizeList(res) {
      const payload = res && res.data != null ? res.data : res;
      const rows = payload.rows || payload.list || (Array.isArray(payload) ? payload : []);
      return Array.isArray(rows) ? rows : [];
    },
    async initDialog() {
      this.resetForm();
      await Promise.all([this.fetchBalance(), this.fetchReasonOptions()]);
      this.searchPrize("");
    },
    async fetchBalance() {
      if (!this.accountId && this.accountId !== 0) return;
      this.balanceLoading = true;
      try {
        const res = await getDepositAccount({
          id: Number(this.accountId),
          type: Number(this.accountType)
        });
        let balance = res;
        if (res && typeof res === "object" && res.data !== undefined) {
          balance = res.data;
        }
        if (balance !== undefined && balance !== null && typeof balance !== "object") {
          this.currentBalance = balance;
        }
      } catch (e) {
        // 余额拉取失败时保持空展示
      } finally {
        this.balanceLoading = false;
      }
    },
    async fetchReasonOptions() {
      this.reasonLoading = true;
      try {
        const res = await getDepositDeductReasonList({});
        const rows = this.normalizeList(res);
        // 文档：1正常 0停用；缺省按正常
        this.reasonOptions = rows.filter((item) => {
          const status = item && item.status;
          return status !== 0 && status !== "0";
        });
      } catch (e) {
        this.reasonOptions = [];
      } finally {
        this.reasonLoading = false;
      }
    },
    handleReasonChange(id) {
      const row = this.reasonOptions.find((item) => item.id === id);
      if (!row) {
        this.form.reason = "";
        this.form.amount = "";
        return;
      }
      this.form.reason = row.reasonName || "";
      const amount =
        Number(this.accountType) === 1 ? row.clubAmount : row.personalAmount;
      if (amount !== undefined && amount !== null && amount !== "") {
        this.form.amount = String(amount);
      } else {
        this.form.amount = "";
      }
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.validateField("amount");
      });
    },
    formatPrizeLabel(row) {
      if (!row) return "";
      const name = row.prizeName || `奖品${row.prizeId}`;
      const extras = [];
      if (row.faceValue != null && row.faceValue !== "") {
        extras.push(`面值¥${row.faceValue}`);
      } else if (row.reduceAmount != null && row.reduceAmount !== "") {
        extras.push(`立减¥${row.reduceAmount}`);
      } else if (row.discountValue != null && row.discountValue !== "") {
        extras.push(`${row.discountValue}折`);
      }
      if (String(row.validType) === "2" && row.validDays) {
        extras.push(`有效${row.validDays}天`);
      } else if (row.validStartTime && row.validEndTime) {
        extras.push(`${row.validStartTime}~${row.validEndTime}`);
      }
      return extras.length ? `${name}（${extras.join(" / ")}）` : name;
    },
    async searchPrize(query) {
      this.prizeLoading = true;
      try {
        const params = {
          prizeSource: 2,
          pageNum: 1,
          pageSize: 50
        };
        const text = String(query || "").trim();
        if (text) {
          if (/^\d+$/.test(text)) {
            params.prizeId = text;
          } else {
            params.prizeName = text;
          }
        }
        const res = await OperationPrizeList(params);
        const rows = this.normalizeList(res);
        this.prizeOptions = rows.map((item) => {
          const rawId = item.prizeId != null ? item.prizeId : item.id;
          return {
            ...item,
            // 雪花 ID 必须用字符串，避免 Number 丢精度
            prizeId: rawId == null || rawId === "" ? "" : String(rawId),
          };
        });
      } catch (e) {
        this.prizeOptions = [];
      } finally {
        this.prizeLoading = false;
      }
    },
    validateAmount(rule, value, callback) {
      if (value === "" || value === null || value === undefined) {
        callback(new Error("请输入扣除金额"));
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
    isVideoFile(file) {
      const type = (file && file.type) || "";
      const name = ((file && file.name) || "").toLowerCase();
      return type === "video/mp4" || name.endsWith(".mp4");
    },
    beforeUpload(file) {
      const isVideo = this.isVideoFile(file);
      const okType =
        isVideo ||
        ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
      if (!okType) {
        this.$message.error("仅支持 png、jpg、jpeg、mp4");
        return false;
      }
      const maxMb = isVideo ? 50 : 20;
      if (file.size / 1024 / 1024 > maxMb) {
        this.$message.error(isVideo ? "视频不能超过 50MB" : "图片不能超过 20MB");
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
            ossId: uploadData.ossId || "",
            type: this.isVideoFile(file) ? "video" : "image"
          });
          this.syncOssIds();
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
    syncOssIds() {
      this.form.ossIds = this.voucherList.map((item) => item.url).filter(Boolean);
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.validateField("ossIds");
      });
    },
    removeVoucher(index) {
      this.voucherList.splice(index, 1);
      this.syncOssIds();
    },
    previewImage(index) {
      const images = this.voucherList.filter((item) => item.type !== "video");
      const current = this.voucherList[index];
      if (!current || current.type === "video") return;
      this.previewList = images.map((item) => item.url);
      const imgIndex = images.findIndex((item) => item.url === current.url);
      this.previewIndex = imgIndex >= 0 ? imgIndex : 0;
      this.previewVisible = true;
    },
    previewVideo(url) {
      if (!url) return;
      this.videoPreviewUrl = url;
      this.videoPreviewVisible = true;
    },
    resetForm() {
      this.form = {
        reasonId: "",
        reason: "",
        amount: "",
        ossIds: [],
        prizeId: null
      };
      this.voucherList = [];
      this.currentBalance = "";
      this.submitting = false;
      this.uploading = false;
      this.prizeOptions = [];
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
        if (!this.orderId && this.orderId !== 0) {
          this.$message.error("缺少订单ID");
          return;
        }
        this.submitting = true;
        try {
          const payload = {
            orderId: String(this.orderId),
            amount: Number(this.form.amount),
            reason: String(this.form.reason || "").trim(),
            ossIds: this.voucherList.map((item) => item.url).filter(Boolean)
          };
          if (this.form.prizeId != null && this.form.prizeId !== "") {
            // 奖品 ID 为大整数，禁止 Number()，否则末位会丢精度
            payload.prizeId = String(this.form.prizeId);
          }
          if (this.accountId || this.accountId === 0) {
            payload.utId = Number(this.accountId);
          }
          if (this.accountType === 0 || this.accountType === 1) {
            payload.type = Number(this.accountType);
          }
          await addDepositAccountApproval(payload);
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
::v-deep .order-deposit-deduct-dialog {
  border-radius: 20px;
  overflow: hidden;
}

::v-deep .order-deposit-deduct-dialog .el-dialog__header {
  display: none;
}

::v-deep .order-deposit-deduct-dialog .el-dialog__body {
  padding: 0;
}

.order-deduct__panel {
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.1), transparent 26%),
    linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
}

.order-deduct__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.order-deduct__title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2533;
}

.order-deduct__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #8a93a6;
}

.order-deduct__badge {
  flex-shrink: 0;
  height: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(144, 71, 248, 0.08);
  color: #9047f8;
  font-size: 12px;
  font-weight: 600;
}

.order-deduct__balance {
  position: relative;
  margin-bottom: 16px;
  padding: 20px 22px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #1f2433 0%, #34435f 100%);
  box-shadow: 0 14px 28px rgba(44, 58, 88, 0.18);
  overflow: hidden;
}

.order-deduct__balance::after {
  content: "";
  position: absolute;
  right: -18px;
  top: -18px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.order-deduct__account,
.order-deduct__balance-label,
.order-deduct__balance-row {
  position: relative;
  z-index: 1;
}

.order-deduct__account {
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.order-deduct__account-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
}

.order-deduct__account-value {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  word-break: break-all;
}

.order-deduct__balance-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.order-deduct__balance-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
}

.order-deduct__balance-value {
  font-size: 34px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.order-deduct__balance-unit {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.66);
}

.order-deduct__card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(225, 230, 239, 0.9);
  border-radius: 18px;
  padding: 18px 18px 8px;
  margin-bottom: 14px;
  box-shadow: 0 10px 28px rgba(83, 97, 123, 0.06);
}

.order-deduct__section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2533;
}

.order-deduct__section-desc {
  margin: 4px 0 12px;
  font-size: 12px;
  color: #909399;
}

.order-deduct__form ::v-deep .el-form-item {
  margin-bottom: 18px;
}

.order-deduct__form ::v-deep .el-form-item:last-child {
  margin-bottom: 8px;
}

.order-deduct__form ::v-deep .el-form-item__label {
  font-weight: 600;
  color: #303645;
}

.order-deduct__form ::v-deep .el-input__inner,
.order-deduct__form ::v-deep .el-textarea__inner {
  border-radius: 14px;
  border-color: #e2e8f2;
  background: #fbfcff;
}

.order-deduct__form ::v-deep .el-input__inner:focus,
.order-deduct__form ::v-deep .el-textarea__inner:focus {
  border-color: #9047f8;
  box-shadow: 0 0 0 3px rgba(144, 71, 248, 0.08);
}

.is-required {
  color: #f56c6c;
  margin-right: 2px;
}

.order-deduct__amount {
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

  &.is-readonly {
    background: #f5f7fb;
    cursor: default;

    &:hover,
    &:focus-within {
      border-color: #e2e8f2;
      box-shadow: none;
    }

    .order-deduct__amount-input ::v-deep .el-input__inner {
      color: #606266;
      cursor: default;
    }
  }
}

.order-deduct__amount-input {
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

.order-deduct__amount-unit {
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

.order-deduct__upload-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2533;
}

.order-deduct__upload-desc {
  margin: 4px 0 12px;
  font-size: 12px;
  color: #909399;
}

.order-deduct__upload-item {
  margin-bottom: 0 !important;
}

.order-deduct__upload-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.order-deduct__upload-thumb,
.order-deduct__upload-trigger {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.order-deduct__upload-thumb {
  border: 1px solid #e8eaf0;
  background: #111;
}

.order-deduct__upload-thumb img,
.order-deduct__upload-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-deduct__upload-thumb img {
  cursor: pointer;
}

.order-deduct__video-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  font-size: 28px;
  cursor: pointer;
}

.order-deduct__upload-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
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

.order-deduct__upload-trigger {
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

.order-deduct__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.order-deduct__btn {
  min-width: 88px;
  border-radius: 10px;
  font-weight: 600;
}

.order-deduct__btn--ghost {
  background: #f3f4f8;
  border-color: #f3f4f8;
  color: #606266;
}

.order-deduct__btn--primary {
  background: #2f3542;
  border-color: #2f3542;
}

.order-deduct__video-player {
  width: 100%;
  max-height: 420px;
  background: #000;
  border-radius: 8px;
}
</style>
