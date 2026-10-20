<!--
  俱乐部保证金充值弹窗
  ---------------------------------------------------------------------------
  - 首充 / 补缴金额提交 → POST /business/club-deposit/recharge
  - 成功后用 orderStr 生成二维码展示（不打开链接）
  - 同时轮询 POST /business/club-deposit/recharge-pay-status
    payStatus: 0继续 / 1成功 / 2停止；paid / continuePolling 同步判断
-->
<template>
  <el-dialog
    :title="dialogTitle"
    :visible.sync="dialogVisible"
    :width="step === 'form' ? '480px' : '420px'"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 步骤1：填写金额 -->
    <el-form v-if="step === 'form'" ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="充值金额" prop="amount">
        <div class="amount-field">
          <el-input-number
            v-model="form.amount"
            :min="0"
            :precision="2"
            :step="100"
            controls-position="right"
            class="amount-input"
          />
          <span class="amount-unit">元</span>
        </div>
        <div v-if="isFirstRecharge" class="form-tip">
          首充支持自定义金额，需 ≥ 充足金额
          <template v-if="minAmount > 0">（当前充足金额 {{ minAmount }} 元）</template>
        </div>
        <div v-else-if="minAmount > 0" class="form-tip">补缴金额至少为 {{ minAmount }} 元</div>
      </el-form-item>
    </el-form>

    <!-- 步骤2：扫码支付 + 轮询 -->
    <div v-else-if="step === 'pay'" class="pay-panel">
      <div class="pay-panel__amount">
        <span class="pay-panel__amount-label">应付金额</span>
        <div class="pay-panel__amount-value">
          ¥{{ formatPayAmount(payData.amount || form.amount) }}
        </div>
      </div>

      <div class="pay-panel__qr" v-loading="qrLoading">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="支付二维码" class="pay-panel__qr-img" />
        <div v-else class="pay-panel__qr-empty">二维码生成失败，请关闭后重试</div>
      </div>

      <div class="pay-panel__hint">
        请使用<span>{{ payChannelText }}</span>扫描二维码完成支付
      </div>

      <div class="pay-panel__poll" :class="`is-${pollUiStatus}`">
        <i :class="pollIconClass" />
        <span>{{ pollStatusText }}</span>
      </div>

      <div class="pay-panel__meta">
        <div v-if="payData.orderNo" class="pay-panel__meta-row">
          <span>订单号</span>
          <em>{{ payData.orderNo }}</em>
        </div>
        <div v-if="payData.payChannel" class="pay-panel__meta-row">
          <span>支付渠道</span>
          <em>{{ payData.payChannel }}</em>
        </div>
      </div>
    </div>

    <!-- 步骤3：支付结果 -->
    <div v-else class="result-panel" :class="`is-${step}`">
      <div class="result-panel__icon">
        <i :class="step === 'success' ? 'el-icon-success' : 'el-icon-error'" />
      </div>
      <div class="result-panel__title">
        {{ step === 'success' ? '支付成功' : '支付未完成' }}
      </div>
      <div class="result-panel__desc">
        {{
          step === 'success'
            ? `已到账 ¥${formatPayAmount(payStatusData.amount || payData.amount || form.amount)}`
            : pollFailText
        }}
      </div>
      <div v-if="payData.orderNo" class="result-panel__order">订单号：{{ payData.orderNo }}</div>
      <div v-if="step === 'success' && payStatusData.payTime" class="result-panel__order">
        支付时间：{{ payStatusData.payTime }}
      </div>
    </div>

    <div slot="footer">
      <template v-if="step === 'form'">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      </template>
      <template v-else-if="step === 'pay'">
        <el-button @click="handlePayLater">稍后支付</el-button>
        <el-button type="primary" :loading="pollChecking" @click="checkPayStatus(true)">
          我已完成支付
        </el-button>
      </template>
      <template v-else>
        <el-button type="primary" @click="handleResultClose">完成</el-button>
      </template>
    </div>
  </el-dialog>
</template>

<script>
import QRCode from "qrcode";
import { clubDepositRecharge, clubDepositRechargePayStatus } from "@/api/clubDeposit";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TIMES = 90; // 约 3 分钟

export default {
  name: "ClubDepositRechargeDialog",
  props: {
    visible: { type: Boolean, default: false },
    isFirstRecharge: { type: Boolean, default: false },
    defaultAmount: { type: [Number, String], default: 0 },
    minAmount: { type: [Number, String], default: 0 }
  },
  data() {
    const validateAmount = (rule, value, callback) => {
      if (value === null || value === undefined || value === "") {
        callback(new Error("请输入金额"));
        return;
      }
      const num = Number(value);
      if (Number.isNaN(num) || num <= 0) {
        callback(new Error("请输入金额"));
        return;
      }
      const min = Number(this.minAmount) || 0;
      if (min > 0 && num < min) {
        if (this.isFirstRecharge) {
          callback(new Error(`首充金额需≥充足金额${min}元`));
        } else {
          callback(new Error(`补缴金额至少为${min}元`));
        }
        return;
      }
      callback();
    };
    return {
      submitting: false,
      step: "form", // form | pay | success | fail
      qrLoading: false,
      qrDataUrl: "",
      payData: {},
      payStatusData: {},
      pollTimer: null,
      pollTimes: 0,
      pollChecking: false,
      pollUiStatus: "waiting", // waiting | polling | timeout
      paidSuccess: false,
      form: { amount: undefined },
      rules: {
        amount: [{ required: true, validator: validateAmount, trigger: "change" }]
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
    dialogTitle() {
      if (this.step === "pay") return "扫码支付";
      if (this.step === "success") return "支付结果";
      if (this.step === "fail") return "支付结果";
      return "充值";
    },
    payChannelText() {
      const channel = String(this.payData.payChannel || "").toLowerCase();
      const orderStr = String(this.payData.orderStr || "").toLowerCase();
      if (channel.includes("支付宝") || orderStr.includes("alipay")) return "支付宝";
      if (channel.includes("微信") || orderStr.includes("weixin") || orderStr.includes("wx")) {
        return "微信";
      }
      return this.payData.payChannel || "手机";
    },
    pollStatusText() {
      if (this.pollUiStatus === "timeout") {
        return "暂未查询到支付结果，可点击「我已完成支付」重试";
      }
      if (this.pollUiStatus === "polling") {
        return "正在查询支付结果…";
      }
      return "等待扫码支付中…";
    },
    pollIconClass() {
      if (this.pollUiStatus === "timeout") return "el-icon-warning-outline";
      return "el-icon-loading";
    },
    pollFailText() {
      if (this.pollUiStatus === "timeout") {
        return "轮询超时，如已付款请稍后在变动明细中确认到账";
      }
      return "支付失败或已取消，请重新发起充值";
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.resetState();
        this.form.amount = Number(this.defaultAmount) || undefined;
        this.$nextTick(() => {
          if (this.$refs.formRef) this.$refs.formRef.clearValidate();
        });
      } else {
        this.stopPolling();
      }
    }
  },
  beforeDestroy() {
    this.stopPolling();
  },
  methods: {
    resetState() {
      this.stopPolling();
      this.submitting = false;
      this.step = "form";
      this.qrLoading = false;
      this.qrDataUrl = "";
      this.payData = {};
      this.payStatusData = {};
      this.pollTimes = 0;
      this.pollChecking = false;
      this.pollUiStatus = "waiting";
      this.paidSuccess = false;
    },
    handleClose() {
      // 支付成功时已 emit；扫码中关闭也刷新一次，避免漏掉已到账
      const shouldRefresh =
        this.step === "pay" || this.step === "fail" || this.step === "success";
      const alreadyEmitted = this.paidSuccess;
      this.stopPolling();
      this.resetState();
      this.$emit("update:visible", false);
      if (shouldRefresh && !alreadyEmitted) {
        this.$emit("success");
      }
    },
    handleResultClose() {
      this.handleClose();
    },
    formatPayAmount(val) {
      const num = Number(val);
      if (Number.isNaN(num)) return "0.00";
      return num.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },
    resolvePayPayload(res) {
      if (!res) return null;
      if (res.data && (res.data.orderStr || res.data.orderNo || res.data.payChannel)) {
        return res.data;
      }
      if (res.orderStr || res.orderNo) return res;
      return res.data || null;
    },
    resolveStatusPayload(res) {
      if (!res) return null;
      if (res.data && (res.data.orderNo || res.data.payStatus !== undefined || res.data.paid !== undefined)) {
        return res.data;
      }
      if (res.orderNo || res.payStatus !== undefined || res.paid !== undefined) return res;
      return res.data || null;
    },
    async renderQrCode(orderStr) {
      const text = orderStr == null ? "" : String(orderStr).trim();
      if (!text) {
        this.qrDataUrl = "";
        return false;
      }
      this.qrLoading = true;
      try {
        this.qrDataUrl = await QRCode.toDataURL(text, {
          width: 220,
          margin: 2,
          color: {
            dark: "#1f2533",
            light: "#ffffff"
          },
          errorCorrectionLevel: "M"
        });
        return true;
      } catch (error) {
        this.qrDataUrl = "";
        return false;
      } finally {
        this.qrLoading = false;
      }
    },
    stopPolling() {
      if (this.pollTimer) {
        window.clearTimeout(this.pollTimer);
        this.pollTimer = null;
      }
    },
    startPolling() {
      this.stopPolling();
      this.pollTimes = 0;
      this.pollUiStatus = "polling";
      this.scheduleNextPoll(0);
    },
    scheduleNextPoll(delay) {
      this.stopPolling();
      this.pollTimer = window.setTimeout(() => {
        this.checkPayStatus(false);
      }, delay);
    },
    /**
     * @param {boolean} manual 手动点「我已完成支付」
     */
    async checkPayStatus(manual = false) {
      const orderNo = this.payData && this.payData.orderNo;
      if (!orderNo || this.step !== "pay") return;

      if (manual) this.pollChecking = true;
      try {
        const res = await clubDepositRechargePayStatus({ orderNo });
        const data = this.resolveStatusPayload(res) || {};
        this.payStatusData = data;

        const payStatus = Number(data.payStatus);
        const paid = data.paid === true || payStatus === 1;
        const stopPoll = data.continuePolling === false || payStatus === 2;
        const keepPoll = data.continuePolling === true || payStatus === 0;

        if (paid) {
          this.handlePaySuccess(data);
          return;
        }

        if (stopPoll && !paid) {
          this.handlePayFail(data);
          return;
        }

        if (manual && keepPoll) {
          this.$message.info("暂未查询到支付成功，请稍后再试或继续扫码支付");
        }

        this.pollTimes += 1;
        if (this.pollTimes >= POLL_MAX_TIMES) {
          this.pollUiStatus = "timeout";
          this.stopPolling();
          return;
        }

        this.pollUiStatus = "polling";
        this.scheduleNextPoll(POLL_INTERVAL_MS);
      } catch (error) {
        // 轮询失败不打断，继续下一轮；手动查询时给轻提示
        if (manual) {
          this.$message.warning("支付结果查询失败，请稍后重试");
        }
        this.pollTimes += 1;
        if (this.pollTimes >= POLL_MAX_TIMES) {
          this.pollUiStatus = "timeout";
          this.stopPolling();
          return;
        }
        if (this.step === "pay") {
          this.pollUiStatus = "polling";
          this.scheduleNextPoll(POLL_INTERVAL_MS);
        }
      } finally {
        if (manual) this.pollChecking = false;
      }
    },
    handlePaySuccess(data) {
      this.stopPolling();
      this.paidSuccess = true;
      this.payStatusData = data || {};
      this.step = "success";
      this.$message.success("支付成功");
      this.$emit("success", data || this.payData);
    },
    handlePayFail(data) {
      this.stopPolling();
      this.payStatusData = data || {};
      this.step = "fail";
    },
    handlePayLater() {
      this.handleClose();
    },
    handleSubmit() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return;
        this.submitting = true;
        try {
          const amount = Number(this.form.amount);
          const res = await clubDepositRecharge({ amount });
          if (!res || res.success === false) {
            if (!(res && res.errorMessage)) {
              this.$message.error("充值发起失败");
            }
            return;
          }

          const payData = this.resolvePayPayload(res) || {};
          const orderStr = payData.orderStr == null ? "" : String(payData.orderStr).trim();
          if (!orderStr) {
            this.$message.warning("未返回支付二维码内容，请稍后在变动明细中确认");
            this.$emit("success", payData);
            this.dialogVisible = false;
            return;
          }
          if (!payData.orderNo) {
            this.$message.warning("未返回订单号，无法轮询支付结果");
          }

          this.payData = payData;
          const ok = await this.renderQrCode(orderStr);
          if (!ok) {
            this.$message.error("二维码生成失败，请重试");
            return;
          }
          this.step = "pay";
          if (payData.orderNo) {
            this.startPolling();
          }
        } catch (error) {
          // 接口错误已由 request 拦截器提示
        } finally {
          this.submitting = false;
        }
      });
    }
  }
};
</script>

<style scoped lang="scss">
.amount-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.amount-input {
  flex: 1;
  width: 100%;
}

.amount-unit {
  color: #606266;
}

.form-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 18px;
}

.pay-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 8px 8px;
}

.pay-panel__amount {
  text-align: center;
  margin-bottom: 18px;
}

.pay-panel__amount-label {
  display: block;
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.pay-panel__amount-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2533;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.pay-panel__qr {
  width: 236px;
  height: 236px;
  border-radius: 16px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.08), transparent 40%),
    #f7f8fc;
  border: 1px solid #eef0f5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 28px rgba(49, 56, 84, 0.08);
}

.pay-panel__qr-img {
  width: 200px;
  height: 200px;
  display: block;
  border-radius: 8px;
  background: #fff;
}

.pay-panel__qr-empty {
  padding: 0 20px;
  text-align: center;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}

.pay-panel__hint {
  margin-top: 16px;
  font-size: 14px;
  color: #606266;

  span {
    color: #6a35ff;
    font-weight: 600;
    margin: 0 2px;
  }
}

.pay-panel__poll {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(106, 53, 255, 0.08);
  color: #6a35ff;

  &.is-timeout {
    background: rgba(230, 162, 60, 0.12);
    color: #e6a23c;
  }

  i {
    font-size: 14px;
  }
}

.pay-panel__meta {
  width: 100%;
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f8f9fd;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pay-panel__meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #909399;

  em {
    font-style: normal;
    color: #303133;
    word-break: break-all;
    text-align: right;
  }
}

.result-panel {
  text-align: center;
  padding: 18px 8px 8px;

  &.is-success .result-panel__icon {
    color: #67c23a;
  }

  &.is-fail .result-panel__icon {
    color: #f56c6c;
  }
}

.result-panel__icon {
  font-size: 52px;
  line-height: 1;
  margin-bottom: 12px;
}

.result-panel__title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2533;
}

.result-panel__desc {
  margin-top: 8px;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.result-panel__order {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}
</style>
