<template>
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="600px" :before-close="handleClose"
        :close-on-click-modal="false" class="review-dialog" :append-to-body="true">

        <!-- 申请信息展示 -->
        <div class="info-section">
            <div class="info-row">
                <div class="info-col">
                    <div class="info-label">公会名称：</div>
                    <div class="info-value">{{ reviewData.unionName }}</div>
                </div>
                <div class="info-col">
                    <div class="info-label">公会ID：</div>
                    <div class="info-value">{{ reviewData.tradeNo }}</div>
                </div>
            </div>
            <div class="info-row">
                <div class="info-col">
                    <div class="info-label">申请金额：</div>
                    <div class="info-value amount">{{ formatCurrency(reviewData.amount) }}</div>
                </div>
                <div class="info-col">
                    <div class="info-label">剩余可提现金额：</div>
                    <div class="info-value remaining">{{ formatCurrency(reviewData.remainingAmount) }}</div>
                </div>
            </div>
            <div class="info-row">
                <div class="info-col">
                    <div class="info-label">申请时间：</div>
                    <div class="info-value">{{ formatDateTime(reviewData.applyTime) }}</div>
                </div>
            </div>
        </div>

        <el-divider class="form-divider"></el-divider>

        <div class="invoice-section">
            <div class="section-header">
                <span class="section-title">发票与费用明细</span>
            </div>
            <div class="invoice-row">
                <span class="invoice-label">发票类型</span>
                <el-tag :type="getInvoiceTypeTag(reviewData.invoiceType)" effect="plain" size="mini">
                    {{ getInvoiceTypeText(reviewData.invoiceType) }}
                </el-tag>
            </div>
            <div v-if="String(reviewData.invoiceType) === '2'" class="invoice-row">
                <span class="invoice-label">代开发票税费</span>
                <strong class="invoice-value deduct">{{ getTaxFeeText(reviewData.amount, reviewData.actualAmount) }}</strong>
            </div>
            <div class="invoice-row is-actual">
                <span class="invoice-label">实际到账金额</span>
                <strong class="invoice-value actual">{{ formatOptionalCurrency(reviewData.actualAmount) }}</strong>
            </div>
        </div>

        <el-divider class="form-divider"></el-divider>

        <!-- 备注输入 -->
        <div class="remark-section">
            <div class="section-header">
                <span class="section-title">处理备注</span>
            </div>

            <el-input type="textarea" v-model="formData.remark" placeholder="请输入处理备注（拒绝时必须填写原因）" :rows="4"
                :maxlength="200" show-word-limit clearable class="remark-textarea">
            </el-input>

            <!-- 提示信息 -->
            <div class="remark-tips">
                <div class="tip-item">
                    <i class="el-icon-info tip-icon"></i>
                    <span class="tip-text">同意时备注可选，拒绝时必须填写原因</span>
                </div>
            </div>
        </div>

        <span slot="footer" class="dialog-footer">
            <el-button @click="handleCancel" size="medium" class="cancel-btn">取 消</el-button>
            <el-button type="danger" :loading="submitting" @click="handleReject" size="medium" :disabled="submitting"
                class="reject-btn">
                拒 绝
            </el-button>
            <el-button type="primary" :loading="submitting" @click="handleApprove" size="medium" :disabled="submitting"
                class="approve-btn">
                同 意
            </el-button>
        </span>
    </el-dialog>
</template>

<script>
import { PostApproval } from "@/api/cashout"
export default {
    name: 'ReviewDialog',
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        reviewData: {
            type: Object,
            default: () => ({
                unionName: '',
                amount: 0,
                remainingAmount: 0,
                applyTime: '',
                invoiceType: '',
                actualAmount: ''
            })
        }
    },
    data() {
        return {
            dialogVisible: this.visible,
            submitting: false,
            formData: {
                remark: ''
            }
        };
    },
    computed: {
        dialogTitle() {
            return `审核 - ${this.reviewData.unionName}`;
        }
    },
    watch: {
        visible(val) {
            this.dialogVisible = val;
            if (val) {
                this.initDialog();
            }
        },
        dialogVisible(val) {
            this.$emit('update:visible', val);
        }
    },
    methods: {
        initDialog() {
            this.submitting = false;
            this.formData.remark = '';
        },

        formatCurrency(amount) {
            const num = parseFloat(amount || 0);
            return `¥${num.toFixed(2)}`;
        },

        formatOptionalCurrency(amount) {
            if (amount === null || amount === undefined || amount === '') {
                return '-';
            }
            const num = Number(amount);
            return Number.isNaN(num) ? '-' : `¥${num.toFixed(2)}`;
        },

        getInvoiceTypeText(invoiceType) {
            const map = {
                '1': '自备发票',
                '2': '平台代开',
            };
            return map[String(invoiceType)] || '-';
        },

        getInvoiceTypeTag(invoiceType) {
            const map = {
                '1': 'success',
                '2': 'warning',
            };
            return map[String(invoiceType)] || 'info';
        },

        getTaxFeeText(amount, actualAmount) {
            const amountNumber = Number(amount);
            const actualAmountNumber = Number(actualAmount);
            if (Number.isNaN(amountNumber) || Number.isNaN(actualAmountNumber)) {
                return '-';
            }
            return `- ¥${(amountNumber - actualAmountNumber).toFixed(2)}`;
        },

        formatDateTime(dateTime) {
            if (!dateTime) return '-';
            return dateTime;
        },

        // 同意审核
        async handleApprove() {
            try {
                this.submitting = true;

                const submitData = {
                    unionTransactionId: this.reviewData.unionTransactionId,
                    status: 2, // 待打款
                    remark: this.formData.remark || '',
                    action: 'approve'
                };

                // 模拟API调用
                // await new Promise(resolve => setTimeout(resolve, 800));
                const res = await PostApproval(submitData);
                if (res.code === 200) {
                    this.$message.success('审核通过，状态已变更为"待打款"');
                    this.dialogVisible = false;
                    this.$emit('submit-success', submitData);
                }

            } catch (error) {
                console.error('审核失败:', error);
                this.$message.error(error.message || '操作失败，请稍后重试');
            } finally {
                this.submitting = false;
            }
        },

        // 拒绝审核
        async handleReject() {
            try {
                // 验证备注是否填写
                if (!this.formData.remark || this.formData.remark.trim() === '') {
                    this.$message.error('拒绝必须填写原因');
                    return;
                }

                this.submitting = true;
                console.log('传参', this.reviewData.unionTransactionId)
                const submitData = {
                    unionTransactionId: this.reviewData.unionTransactionId,
                    status: 1, // 已拒绝
                    remark: this.formData.remark.trim(),
                    action: 'reject'
                };

                // 模拟API调用
                // await new Promise(resolve => setTimeout(resolve, 800));
                const res = await PostApproval(submitData);
                if (res.code === 200) {
                    this.$message.success('已拒绝申请');
                    this.dialogVisible = false;
                    this.$emit('submit-success', submitData);
                }

            } catch (error) {
                console.error('拒绝失败:', error);
                this.$message.error(error.message || '操作失败，请稍后重试');
            } finally {
                this.submitting = false;
            }
        },

        handleCancel() {
            this.dialogVisible = false;
        },

        handleClose(done) {
            if (this.hasFormDataChanged()) {
                this.$confirm('确定要关闭吗？已填写的备注将不会保存', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    center: true
                }).then(() => {
                    done();
                }).catch(() => { });
            } else {
                done();
            }
        },

        hasFormDataChanged() {
            return this.formData.remark && this.formData.remark.trim() !== '';
        }
    }
};
</script>

<style lang="scss" scoped>
.review-dialog {
    ::v-deep .el-dialog {
        margin-top: 10vh !important;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);

        &__header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 24px;

            .el-dialog__title {
                color: #fff;
                font-size: 18px;
                font-weight: 600;
            }

            .el-dialog__headerbtn {
                top: 24px;
                right: 24px;

                .el-dialog__close {
                    color: #fff;
                    font-size: 20px;

                    &:hover {
                        color: rgba(255, 255, 255, 0.8);
                    }
                }
            }
        }

        &__body {
            padding: 24px;
            background-color: #fff;
            max-height: 70vh;
            overflow-y: auto;
        }

        &__footer {
            padding: 16px 24px;
            background-color: #fff;
            border-top: 1px solid #e8e8e8;
        }
    }

    .info-section {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;

        .info-row {
            display: flex;
            margin-bottom: 12px;

            &:last-child {
                margin-bottom: 0;
            }

            .info-col {
                flex: 1;

                &:first-child {
                    margin-right: 12px;
                }
            }
        }

        .info-label {
            font-size: 13px;
            color: #666;
            margin-bottom: 4px;
        }

        .info-value {
            font-size: 14px;
            color: #333;
            font-weight: 500;

            &.amount {
                color: #e6a23c;
                font-weight: 600;
                font-size: 16px;
            }

            &.remaining {
                color: #67c23a;
                font-weight: 600;
                font-size: 16px;
            }
        }
    }

    .form-divider {
        margin: 20px 0;
        background-color: #e8e8e8;
    }

    .invoice-section {
        margin-bottom: 20px;

        .section-header {
            margin-bottom: 14px;

            .section-title {
                font-size: 15px;
                font-weight: 600;
                color: #333;
            }
        }

        .invoice-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 32px;
            color: #606266;
            font-size: 14px;

            & + .invoice-row {
                margin-top: 8px;
            }

            &.is-actual {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #ebeef5;
            }
        }

        .invoice-label {
            color: #606266;
        }

        .invoice-value {
            font-size: 15px;
            font-weight: 600;
        }

        .deduct {
            color: #303133;
        }

        .actual {
            color: #e6a23c;
            font-size: 17px;
        }
    }

    .remark-section {
        .section-header {
            margin-bottom: 16px;

            .section-title {
                font-size: 15px;
                font-weight: 600;
                color: #333;
            }
        }

        .remark-textarea {
            ::v-deep .el-textarea__inner {
                border-radius: 8px;
                border: 1px solid #dcdfe6;
                padding: 12px;
                font-size: 14px;
                color: #333;
                resize: vertical;
                min-height: 100px;
                transition: all 0.3s ease;

                &:focus {
                    border-color: #6A35FF;
                    box-shadow: 0 0 0 2px rgba(106, 53, 255, 0.1);
                }

                &::placeholder {
                    color: #999;
                }
            }

            ::v-deep .el-input__count {
                background: transparent;
                color: #999;
                font-size: 12px;
                bottom: 8px;
                right: 12px;
            }
        }

        .remark-tips {
            margin-top: 12px;
            padding: 12px;
            background: #f0f9ff;
            border-radius: 6px;
            border-left: 4px solid #409eff;

            .tip-item {
                display: flex;
                align-items: center;

                .tip-icon {
                    color: #409eff;
                    margin-right: 8px;
                    font-size: 16px;
                    flex-shrink: 0;
                }

                .tip-text {
                    color: #606266;
                    font-size: 13px;
                    line-height: 1.5;
                }
            }
        }
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 16px;

        .cancel-btn {
            min-width: 90px;
            height: 40px;
            border-radius: 8px;
            border: 1px solid #dcdfe6;
            color: #666;
            font-weight: 500;

            &:hover {
                border-color: #6A35FF;
                color: #6A35FF;
                background: #f9f7ff;
            }
        }

        .reject-btn {
            min-width: 90px;
            height: 40px;
            border-radius: 8px;
            background: #ff4d4f;
            border: none;
            color: white;
            font-weight: 500;

            &:hover:not(.is-disabled) {
                background: #ff7875;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
            }

            &:active:not(.is-disabled) {
                transform: translateY(0);
            }

            &.is-disabled {
                background: #ffccc7;
                cursor: not-allowed;

                &:hover {
                    transform: none;
                    box-shadow: none;
                }
            }
        }

        .approve-btn {
            min-width: 90px;
            height: 40px;
            border-radius: 8px;
            background: linear-gradient(135deg, #6A35FF 0%, #9047F8 100%);
            border: none;
            color: white;
            font-weight: 500;

            &:hover:not(.is-disabled) {
                opacity: 0.9;
                transform: translateY(-1px);
                box-shadow: 0 4px 16px rgba(106, 53, 255, 0.3);
            }

            &:active:not(.is-disabled) {
                transform: translateY(0);
            }

            &.is-disabled {
                background: #c0c4cc;
                cursor: not-allowed;

                &:hover {
                    transform: none;
                    box-shadow: none;
                }
            }
        }
    }
}

@media screen and (max-width: 768px) {
    .review-dialog {
        ::v-deep .el-dialog {
            width: 95% !important;
            max-width: 500px;
            margin-top: 5vh !important;
        }

        .info-section {
            .info-row {
                flex-direction: column;

                .info-col {
                    margin-right: 0;
                    margin-bottom: 12px;

                    &:last-child {
                        margin-bottom: 0;
                    }
                }
            }
        }

        .dialog-footer {
            flex-direction: column;
            gap: 12px;

            .cancel-btn,
            .reject-btn,
            .approve-btn {
                width: 100%;
                margin: 0;
            }
        }
    }
}
</style>
