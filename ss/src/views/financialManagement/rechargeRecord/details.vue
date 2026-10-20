<template>
  <div class="recharge-detail-page">
    <div class="page-header" @click="goBack">
      <i class="el-icon-arrow-left"></i>
      <span class="page-title">充值记录详情</span>
    </div>

    <el-card shadow="never" class="section-card">
      <div slot="header" class="card-header">
        <span>充值记录详情</span>
        <span class="header-order-no">订单号：{{ sharedData.orderNo || "-" }}</span>
      </div>

      <div v-loading="loading">
        <div v-if="detailTableData.length" class="table-wrapper">
          <el-table
            :data="detailTableData"
            stripe
            style="width: 100%"
            :header-row-style="{ backgroundColor: '#F6F6FB' }"
            :cell-style="{ textAlign: 'center' }"
            :header-cell-style="{ textAlign: 'center' }"
          >
            <el-table-column prop="userName" label="用户名称" min-width="120" show-overflow-tooltip>
              <template slot-scope="{ row }">
                {{ row.userName || "-" }}
              </template>
            </el-table-column>
            <el-table-column prop="userId" label="用户ID" min-width="120" />
            <el-table-column label="充值比例" min-width="140">
              <template slot-scope="{ row }">
                {{ formatRatio(row.rechargeRatio) }}
              </template>
            </el-table-column>
            <el-table-column label="充值金额" min-width="120" align="right">
              <template slot-scope="{ row }">
                ¥{{ formatAmount(row.amount) }}
              </template>
            </el-table-column>
            <el-table-column label="获得未来币" min-width="120" align="right">
              <template slot-scope="{ row }">
                {{ formatAmount(row.wlbCoin) }}
              </template>
            </el-table-column>
            <el-table-column label="支付方式" min-width="120">
              <template slot-scope="{ row }">
                {{ getPaymentMethodText(row.paymentChannel) }}
              </template>
            </el-table-column>
            <el-table-column label="支付渠道" min-width="100">
              <template slot-scope="{ row }">
                <el-tag :type="getPayChannelTag(row.payChannel)" size="small">
                  {{ getPayChannelText(row.payChannel) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="订单状态" min-width="130">
              <template slot-scope="{ row }">
                <el-tag :type="getOrderStatusTag(row.orderStatus)" size="small">
                  {{ getOrderStatusText(row.orderStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="支付时间" min-width="160" show-overflow-tooltip>
              <template slot-scope="{ row }">
                {{ row.createTime || "-" }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template slot-scope="{ row }">
                <el-button
                  v-if="canShowRefundButton(row)"
                  v-permission="'system:rechargeRecord:refund'"
                  type="text"
                  class="action-button"
                  @click="handleRefund"
                >
                  退款
                </el-button>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="暂无订单数据" />
      </div>
    </el-card>

    <el-card shadow="never" class="section-card">
      <div slot="header" class="card-header">
        <span>退款记录</span>
      </div>

      <div v-loading="refundLoading">
        <div v-if="refundRecordData.length" class="table-wrapper">
          <el-table
            :data="refundRecordData"
            stripe
            style="width: 100%"
            :header-row-style="{ backgroundColor: '#F6F6FB' }"
            :cell-style="{ textAlign: 'center' }"
            :header-cell-style="{ textAlign: 'center' }"
          >
            <el-table-column prop="refundNo" label="退款流水号" min-width="180" show-overflow-tooltip />
            <el-table-column prop="userName" label="用户名称" min-width="120" show-overflow-tooltip>
              <template slot-scope="{ row }">
                {{ row.userName || "-" }}
              </template>
            </el-table-column>
            <el-table-column prop="userId" label="用户ID" min-width="120" />
            <el-table-column label="退款比例" min-width="140">
              <template slot-scope="{ row }">
                {{ formatRatio(row.refundRatio) }}
              </template>
            </el-table-column>
            <el-table-column label="退款金额" min-width="120" align="right">
              <template slot-scope="{ row }">
                ¥{{ formatAmount(row.refundAmount) }}
              </template>
            </el-table-column>
            <el-table-column label="扣除未来币" min-width="120" align="right">
              <template slot-scope="{ row }">
                {{ formatAmount(row.deductCoin) }}
              </template>
            </el-table-column>
            <el-table-column label="退款渠道" min-width="120">
              <template slot-scope="{ row }">
                <el-tag :type="getPaymentMethodTag(row.paymentChannel)" size="small">
                  {{ getPaymentMethodText(row.paymentChannel) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="退款状态" min-width="110">
              <template slot-scope="{ row }">
                <el-tag :type="getRefundStatusTag(row.refundStatus)" size="small">
                  {{ getRefundStatusText(row.refundStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="applyTime" label="申请时间" min-width="160" show-overflow-tooltip>
              <template slot-scope="{ row }">
                {{ row.applyTime || "-" }}
              </template>
            </el-table-column>
            <el-table-column prop="completeTime" label="完成时间" min-width="160" show-overflow-tooltip>
              <template slot-scope="{ row }">
                {{ row.completeTime || "-" }}
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="暂无退款记录" />
      </div>
    </el-card>

    <el-dialog
      title="退款操作"
      :visible.sync="refundDialogVisible"
      width="520px"
      class="refund-dialog"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form
        ref="refundForm"
        :model="refundForm"
        :rules="formRules"
        label-width="110px"
      >
        <el-form-item label="退款金额(元)" prop="refundAmount">
          <el-input
            v-model="refundForm.refundAmount"
            placeholder="请输入退款金额"
            @input="handleRefundAmountChange"
          >
            <template slot="append">元</template>
          </el-input>
          <div class="input-tip">
            可退金额：¥{{ formatAmount(refundableAmount) }}，退款金额需小于等于该笔订单充值金额。
          </div>
        </el-form-item>
        <el-form-item label="扣除未来币">
          <div class="form-value">{{ formatAmount(calcDeductCoin) }} 未来币</div>
          <div class="input-tip">
            系统按充值汇率自动计算，当前最多可扣除 {{ formatAmount(refundableCoin) }} 未来币。
          </div>
        </el-form-item>
        <el-form-item label="退款方式">
          <div class="form-value">原路退回</div>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button
          v-permission="'system:rechargeRecord:refund'"
          type="primary"
          :loading="submitLoading"
          @click="submitRefund"
        >
          确定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { RechargeOrderDetail, RechargeRefundDetail, rechargeRefund } from "@/api/orderFlow";
import {
  ORDER_STATUS_MAP,
  PAY_CHANNEL_MAP,
  PAYMENT_METHOD_MAP,
  REFUND_STATUS_MAP,
} from "./constants";

export default {
  name: "DetailsCompanion",
  inject: ["switchToList", "getSharedData"],
  data() {
    const validateRefundAmount = (rule, value, callback) => {
      if (value === "" || value === null || value === undefined) {
        callback(new Error("请输入退款金额"));
        return;
      }

      if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
        callback(new Error("退款金额最多保留2位小数"));
        return;
      }

      const amount = Number(value);
      if (Number.isNaN(amount) || amount <= 0) {
        callback(new Error("退款金额必须大于0"));
        return;
      }

      if (amount > this.refundableAmount) {
        callback(new Error(`退款金额不能大于可退金额 ¥${this.formatAmount(this.refundableAmount)}`));
        return;
      }

      if (this.calcDeductCoin > this.refundableCoin) {
        callback(new Error(`扣除未来币不能大于可扣未来币 ${this.formatAmount(this.refundableCoin)}`));
        return;
      }

      callback();
    };

    return {
      loading: false,
      refundLoading: false,
      submitLoading: false,
      orderDetail: {},
      refundRecordData: [],
      refundDialogVisible: false,
      refundForm: {
        refundAmount: "",
      },
      formRules: {
        refundAmount: [{ validator: validateRefundAmount, trigger: ["blur", "change"] }],
      },
      sharedData: {
        orderNo: "",
        needRefreshList: false,
      },
    };
  },
  computed: {
    detailTableData() {
      return this.orderDetail && this.orderDetail.orderNo ? [this.orderDetail] : [];
    },
    calcDeductCoin() {
      const amount = Number(this.refundForm.refundAmount) || 0;
      const ratio = this.getRechargeRatioValue();
      return Number((amount * ratio).toFixed(2));
    },
    effectiveRefundRecords() {
      return this.refundRecordData.filter((item) => ![2, 3].includes(Number(item.refundStatus)));
    },
    refundedAmount() {
      return this.effectiveRefundRecords.reduce((sum, item) => {
        return sum + (Number(item.refundAmount) || 0);
      }, 0);
    },
    deductedCoinAmount() {
      return this.effectiveRefundRecords.reduce((sum, item) => {
        return sum + (Number(item.deductCoin) || 0);
      }, 0);
    },
    refundableAmount() {
      const totalAmount = Number(this.orderDetail.amount) || 0;
      return Math.max(Number((totalAmount - this.refundedAmount).toFixed(2)), 0);
    },
    refundableCoin() {
      const totalCoin = Number(this.orderDetail.wlbCoin) || 0;
      return Math.max(Number((totalCoin - this.deductedCoinAmount).toFixed(2)), 0);
    },
  },
  activated() {
    this.sharedData = this.getSharedData() || {};
    if (this.sharedData.orderNo) {
      this.initPageData();
    }
  },
  methods: {
    async initPageData() {
      await Promise.all([this.fetchOrderDetail(), this.fetchRefundList()]);
    },
    goBack() {
      this.switchToList();
    },
    isRequestSuccess(res) {
      if (typeof res?.success === "boolean") {
        return res.success;
      }
      if (typeof res?.data?.success === "boolean") {
        return res.data.success;
      }
      return false;
    },
    getResponseData(res) {
      if (typeof res?.success === "boolean") {
        return res.data;
      }
      if (typeof res?.data?.success === "boolean") {
        return res.data.data;
      }
      return res?.data;
    },
    getResponseMessage(res, fallback) {
      return res?.errorMessage || res?.msg || res?.data?.errorMessage || fallback;
    },
    formatAmount(amount) {
      if (amount === null || amount === undefined || amount === "") {
        return "0.00";
      }
      const num = Number(amount);
      return Number.isNaN(num) ? "0.00" : num.toFixed(2);
    },
    formatRatio(value) {
      if (value === null || value === undefined || value === "") {
        return "-";
      }
      if (typeof value === "string" && value.includes(":")) {
        return value;
      }
      const num = Number(value);
      if (Number.isNaN(num)) {
        return String(value);
      }
      return `1元=${String(num).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")}未来币`;
    },
    getRechargeRatioValue() {
      const ratio = Number(this.orderDetail.rechargeRatio);
      return Number.isNaN(ratio) || ratio <= 0 ? 1 : ratio;
    },
    getPaymentMethodText(method) {
      return PAYMENT_METHOD_MAP[String(method)] || method || "-";
    },
    getPaymentMethodTag(method) {
      const map = {
        "1": "warning",
        "2": "info",
        "3": "success",
        "4": "danger",
      };
      return map[String(method)] || "info";
    },
    getPayChannelText(channel) {
      return PAY_CHANNEL_MAP[String(channel)] || channel || "-";
    },
    getPayChannelTag(channel) {
      const map = {
        "1": "warning",
        "2": "success",
        "3": "info",
      };
      return map[String(channel)] || "info";
    },
    getOrderStatusText(status) {
      return ORDER_STATUS_MAP[String(status)]?.label || status || "-";
    },
    getOrderStatusTag(status) {
      return ORDER_STATUS_MAP[String(status)]?.type || "info";
    },
    getRefundStatusText(status) {
      return REFUND_STATUS_MAP[Number(status)]?.label || String(status ?? "-");
    },
    getRefundStatusTag(status) {
      return REFUND_STATUS_MAP[Number(status)]?.type || "info";
    },
    canShowRefundButton(order) {
      const orderStatus = String(order?.orderStatus || "");
      return ["1", "12"].includes(orderStatus) && this.refundableAmount > 0;
    },
    handleRefundAmountChange(value) {
      let sanitizedValue = String(value || "").replace(/[^\d.]/g, "");
      sanitizedValue = sanitizedValue.replace(/^(\d+)\.(\d{0,2}).*$/, "$1.$2");

      const firstDotIndex = sanitizedValue.indexOf(".");
      if (firstDotIndex !== -1) {
        const integerPart = sanitizedValue.slice(0, firstDotIndex + 1);
        const decimalPart = sanitizedValue.slice(firstDotIndex + 1).replace(/\./g, "");
        sanitizedValue = integerPart + decimalPart;
      }

      this.refundForm.refundAmount = sanitizedValue;

      this.$nextTick(() => {
        if (this.$refs.refundForm) {
          this.$refs.refundForm.validateField("refundAmount");
        }
      });
    },
    handleDialogClose() {
      this.refundForm = {
        refundAmount: "",
      };
      this.$nextTick(() => {
        if (this.$refs.refundForm) {
          this.$refs.refundForm.clearValidate();
        }
      });
    },
    async fetchOrderDetail() {
      this.loading = true;
      try {
        const res = await RechargeOrderDetail(this.sharedData.orderNo);
        if (this.isRequestSuccess(res)) {
          this.orderDetail = this.getResponseData(res) || {};
        } else {
          this.orderDetail = {};
          this.$message.error(this.getResponseMessage(res, "获取充值记录详情失败"));
        }
      } catch (error) {
        console.error("获取充值记录详情失败:", error);
        this.orderDetail = {};
        this.$message.error("获取充值记录详情失败");
      } finally {
        this.loading = false;
      }
    },
    async fetchRefundList() {
      this.refundLoading = true;
      try {
        const res = await RechargeRefundDetail(this.sharedData.orderNo);
        if (this.isRequestSuccess(res)) {
          const list = this.getResponseData(res);
          this.refundRecordData = Array.isArray(list) ? list : [];
        } else {
          this.refundRecordData = [];
          this.$message.error(this.getResponseMessage(res, "获取退款记录失败"));
        }
      } catch (error) {
        console.error("获取退款记录失败:", error);
        this.refundRecordData = [];
        this.$message.error("获取退款记录失败");
      } finally {
        this.refundLoading = false;
      }
    },
    handleRefund() {
      this.refundForm = {
        refundAmount: "",
      };
      this.refundDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.refundForm) {
          this.$refs.refundForm.clearValidate();
        }
      });
    },
    submitRefund() {
      this.$refs.refundForm.validate(async (valid) => {
        if (!valid) {
          return;
        }

        this.submitLoading = true;
        try {
          const res = await rechargeRefund({
            orderNo: this.orderDetail.orderNo,
            refundAmount: Number(this.refundForm.refundAmount),
          });

          if (this.isRequestSuccess(res)) {
            this.sharedData.needRefreshList = true;
            this.$message.success("退款申请已提交");
            this.refundDialogVisible = false;
            await this.initPageData();
          } else {
            this.$message.error(this.getResponseMessage(res, "退款申请失败"));
          }
        } catch (error) {
          console.error("退款申请失败:", error);
          this.$message.error("退款申请失败");
        } finally {
          this.submitLoading = false;
        }
      });
    },
  },
};
</script>

<style scoped lang="scss">
.recharge-detail-page {
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-sizing: border-box;
  background: #fff;
  border-radius: 24px;
}

.page-header {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-bottom: 20px;
  cursor: pointer;
  color: #303133;

  i {
    margin-right: 8px;
    font-size: 18px;
  }
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.section-card {
  margin-bottom: 20px;
  border: none;
  border-radius: 16px;

  ::v-deep .el-card__header {
    padding: 16px 20px;
    border-bottom: 1px solid #ebeef5;
    background: #fafafa;
  }

  ::v-deep .el-card__body {
    padding: 20px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.header-order-no {
  font-size: 13px;
  font-weight: 400;
  color: #606266;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.action-button {
  padding: 0;
  color: #409eff;
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

.refund-dialog {
  .form-value {
    line-height: 32px;
    font-weight: 500;
    color: #303133;
  }

  .input-tip {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
    line-height: 1.5;
  }

  ::v-deep .el-dialog__body {
    padding: 20px 24px;
  }

  ::v-deep .el-form-item.is-error .input-tip {
    color: #f56c6c;
  }
}

.dialog-footer {
  text-align: right;

  .el-button {
    min-width: 80px;
  }
}

@media screen and (max-width: 768px) {
  .card-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
