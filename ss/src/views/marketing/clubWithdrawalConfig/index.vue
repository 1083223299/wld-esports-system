<template>
    <div class="container">
        <el-card class="config-card" shadow="never" v-loading="loading">
            <div class="form-wrap">
                <!-- 最低提现金额 -->
                <div class="form-item">
                    <span class="form-label">最低提现金额</span>
                    <div class="form-control">
                        <div class="input-unit-wrap">
                            <el-input
                                v-model="form.minWithdrawAmount"
                                placeholder="请输入"
                                clearable
                                class="input-main"
                            ></el-input>
                            <span class="unit-text">元</span>
                        </div>
                        <p class="form-desc">填写大于 0 的数字（单位：元），账户余额达到该数值才可发起提现</p>
                        <p class="form-error" v-if="errors.minWithdrawAmount">{{ errors.minWithdrawAmount }}</p>
                    </div>
                </div>

                <!-- 代扣税点 -->
                <div class="form-item">
                    <span class="form-label">代扣税点</span>
                    <div class="form-control">
                        <div class="input-unit-wrap">
                            <el-input
                                v-model="form.taxRate"
                                placeholder="请输入"
                                clearable
                                class="input-main"
                            ></el-input>
                            <span class="unit-text">%</span>
                        </div>
                        <p class="form-desc">仅工会提现且平台代开发票时按此比例扣税，请填写 0~100 之间、最多两位小数的百分比数值</p>
                        <p class="form-error" v-if="errors.taxRate">{{ errors.taxRate }}</p>
                    </div>
                </div>

                <!-- 保存按钮 -->
                <div class="form-item">
                    <span class="form-label"></span>
                    <div class="form-control">
                        <el-button type="primary" size="medium" :loading="saveLoading" @click="handleSave">保存</el-button>
                    </div>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script>
import { getWithdrawConfig, saveWithdrawConfig } from "@/api/cashout";

export default {
    name: "ClubWithdrawalConfig",
    data() {
        return {
            form: {
                minWithdrawAmount: "",
                taxRate: "",
            },
            errors: {
                minWithdrawAmount: "",
                taxRate: "",
            },
            loading: false,
            saveLoading: false,
        };
    },
    mounted() {
        this.fetchConfig();
    },
    methods: {
        getBusinessData(res) {
            if (!res) {
                return {};
            }
            return res.data || res;
        },

        isSuccessResponse(res) {
            if (!res) {
                return false;
            }
            return res.success === true || res.errorCode === "0" || String(res.code) === "200" || res === true;
        },

        getResponseMessage(res, fallback) {
            return res && (res.errorMessage || res.msg) ? (res.errorMessage || res.msg) : fallback;
        },

        async fetchConfig() {
            this.loading = true;
            try {
                const res = await getWithdrawConfig({});
                const data = this.getBusinessData(res);
                if (
                    !this.isSuccessResponse(res) &&
                    data.minWithdrawAmount === undefined &&
                    data.taxRate === undefined
                ) {
                    this.$message.error(this.getResponseMessage(res, "获取配置失败"));
                    return;
                }
                this.form.minWithdrawAmount = data.minWithdrawAmount !== undefined && data.minWithdrawAmount !== null
                    ? String(data.minWithdrawAmount)
                    : "";
                this.form.taxRate = data.taxRate !== undefined && data.taxRate !== null
                    ? String(data.taxRate)
                    : "";
            } catch (e) {
                console.error("获取工会提现配置失败:", e);
                this.$message.error("获取配置失败");
            } finally {
                this.loading = false;
            }
        },

        // 校验最低提现金额：必须为数字且大于 0
        validateMinAmount() {
            const val = this.form.minWithdrawAmount;
            if (val === "" || val === null || val === undefined) {
                this.errors.minWithdrawAmount = "请输入最低提现金额";
                return false;
            }
            const num = Number(val);
            if (isNaN(num)) {
                this.errors.minWithdrawAmount = "请输入有效的数字";
                return false;
            }
            if (num <= 0) {
                this.errors.minWithdrawAmount = "金额必须大于 0";
                return false;
            }
            this.errors.minWithdrawAmount = "";
            return true;
        },

        // 校验代扣税点：0~100，最多两位小数
        validateTaxRate() {
            const val = this.form.taxRate;
            if (val === "" || val === null || val === undefined) {
                this.errors.taxRate = "请输入代扣税点";
                return false;
            }
            const num = Number(val);
            if (isNaN(num)) {
                this.errors.taxRate = "请输入有效的数字";
                return false;
            }
            if (num < 0 || num > 100) {
                this.errors.taxRate = "税点范围必须在 0~100 之间";
                return false;
            }
            // 检查最多两位小数
            const str = String(val);
            const dotIndex = str.indexOf(".");
            if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) {
                this.errors.taxRate = "最多支持两位小数";
                return false;
            }
            this.errors.taxRate = "";
            return true;
        },

        // 保存
        async handleSave() {
            const valid1 = this.validateMinAmount();
            const valid2 = this.validateTaxRate();
            if (!valid1 || !valid2) return;

            try {
                await this.$confirm("确定要保存当前配置吗？", "提示", {
                    confirmButtonText: "确定",
                    cancelButtonText: "取消",
                    type: "warning",
                });
                this.saveLoading = true;
                const params = {
                    minWithdrawAmount: Number(this.form.minWithdrawAmount),
                    taxRate: Number(this.form.taxRate),
                };
                const res = await saveWithdrawConfig(params);
                const data = this.getBusinessData(res);
                if (!this.isSuccessResponse(res) && data !== true) {
                    this.$message.error(this.getResponseMessage(res, "保存失败"));
                    return;
                }
                this.$message.success("保存成功");
            } catch (e) {
                if (e !== "cancel" && e !== "close") {
                    console.error("保存工会提现配置失败:", e);
                    this.$message.error("保存失败");
                }
            } finally {
                this.saveLoading = false;
            }
        },
    },
};
</script>

<style scoped>
.container {
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
}

.config-card {
    border-radius: 12px;
    overflow: hidden;
}

.form-wrap {
    max-width: 600px;
    padding: 10px 0;
}

.form-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 24px;
}

.form-label {
    width: 110px;
    line-height: 40px;
    font-size: 14px;
    color: #606266;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
}

.tip-icon {
    font-size: 16px;
    color: #c0c4cc;
    cursor: help;
}

.form-control {
    flex: 1;
    min-width: 0;
}

/* 输入框 + 单位 */
.input-unit-wrap {
    display: flex;
    align-items: center;
    background: #f5f7fa;
    border-radius: 12px;
    padding: 0 12px;
    width: 260px;
    transition: background 0.2s;
}

.input-unit-wrap:focus-within {
    background: #fff;
    box-shadow: 0 0 0 1px #409EFF;
}

.input-main {
    flex: 1;
}

.input-main ::v-deep .el-input__inner {
    border: none;
    background: transparent;
    padding: 0 8px;
    height: 40px;
    line-height: 40px;
    border-radius: 12px;
}

.unit-text {
    font-size: 14px;
    color: #909399;
    flex-shrink: 0;
    padding-left: 4px;
}

/* 描述文字 */
.form-desc {
    margin: 6px 0 0 0;
    font-size: 12px;
    color: #909399;
    line-height: 1.5;
}

/* 校验错误 */
.form-error {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #F56C6C;
    line-height: 1;
}
</style>
