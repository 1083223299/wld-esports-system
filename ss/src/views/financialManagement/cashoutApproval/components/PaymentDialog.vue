<template>
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="600px" :before-close="handleClose"
        :close-on-click-modal="false" class="payment-dialog" :append-to-body="true">

        <!-- 申请信息展示 -->
        <div class="info-section">
            <div class="info-row">
                <div class="info-col">
                    <div class="info-label">公会名称：</div>
                    <div class="info-value">{{ paymentData.unionName }}</div>
                </div>
                <div class="info-col">
                    <div class="info-label">公会ID：</div>
                    <div class="info-value">{{ paymentData.unionId }}</div>
                </div>
            </div>
            <div class="info-row">
                <div class="info-col">
                    <div class="info-label">申请金额：</div>
                    <div class="info-value amount">{{ formatCurrency(paymentData.applyAmount) }}</div>
                </div>
                <div class="info-col">
                    <div class="info-label">收款账户：</div>
                    <div class="info-value">{{ paymentData.bankInfo || '无' }}</div>
                </div>
            </div>
            <div class="info-row">
                <div class="info-col">
                    <div class="info-label">申请时间：</div>
                    <div class="info-value">{{ formatDateTime(paymentData.applyTime) }}</div>
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
                <el-tag :type="getInvoiceTypeTag(paymentData.invoiceType)" effect="plain" size="mini">
                    {{ getInvoiceTypeText(paymentData.invoiceType) }}
                </el-tag>
            </div>
            <div v-if="String(paymentData.invoiceType) === '2'" class="invoice-row">
                <span class="invoice-label">代开发票税费</span>
                <strong class="invoice-value deduct">{{ getTaxFeeText(paymentData.applyAmount, paymentData.actualAmount) }}</strong>
            </div>
            <div class="invoice-row is-actual">
                <span class="invoice-label">实际到账金额</span>
                <strong class="invoice-value actual">{{ formatOptionalCurrency(paymentData.actualAmount) }}</strong>
            </div>
        </div>

        <el-divider class="form-divider"></el-divider>

        <!-- 上传打款凭证 -->
        <div class="upload-section">
            <div class="section-header">
                <span class="section-title">上传打款凭证</span>
                <span class="required-mark">*</span>
            </div>

            <el-upload class="voucher-uploader" action="#" :show-file-list="false" :before-upload="beforeAvatarUpload"
                :http-request="handleAvatarUpload" :disabled="uploading">

                <div class="upload-card">
                    <!-- 上传中状态 -->
                    <div v-if="uploading" class="uploading-state">
                        <div class="uploading-content">
                            <i class="el-icon-loading uploading-icon"></i>
                            <div class="uploading-text">上传中 {{ uploadProgress }}%</div>
                            <el-progress :percentage="uploadProgress" :stroke-width="8" color="#6A35FF"
                                :show-text="false" class="upload-progress">
                            </el-progress>
                        </div>
                    </div>

                    <!-- 已上传图片 -->
                    <div v-else-if="formData.voucherImage" class="uploaded-state">
                        <div class="image-container">
                            <img :src="formData.voucherImage" class="voucher-image" @click="previewImage" />
                            <div class="image-actions">
                                <el-tooltip content="预览" placement="top">
                                    <el-button type="text" icon="el-icon-view" circle size="mini"
                                        @click.stop="previewImage" class="preview-btn">
                                    </el-button>
                                </el-tooltip>
                                <el-tooltip content="删除" placement="top">
                                    <el-button type="text" icon="el-icon-delete" circle size="mini"
                                        @click.stop="handleRemoveImage" class="delete-btn">
                                    </el-button>
                                </el-tooltip>
                            </div>
                        </div>
                        <div class="uploaded-info">
                            <div class="success-icon">
                                <i class="el-icon-success"></i>
                            </div>
                            <div class="uploaded-text">上传完成</div>
                            <div class="upload-hint">点击可重新上传</div>
                        </div>
                    </div>

                    <!-- 上传按钮 -->
                    <div v-else class="upload-state">
                        <div class="upload-placeholder">
                            <div class="upload-icon">
                                <i class="el-icon-upload"></i>
                            </div>
                            <div class="upload-text">点击上传打款凭证</div>
                            <div class="upload-subtext">支持 PNG、JPG 格式，大小不超过 5MB</div>
                        </div>
                    </div>
                </div>
            </el-upload>

            <!-- 提示信息 -->
            <div class="upload-tips">
                <div class="tip-item">
                    <i class="el-icon-warning tip-icon"></i>
                    <span class="tip-text">打款凭证为必填项，请上传清晰的银行转账截图</span>
                </div>
            </div>
        </div>

        <span slot="footer" class="dialog-footer">
            <el-button @click="handleCancel" size="medium" class="cancel-btn">取 消</el-button>
            <el-button type="primary" :loading="submitting" @click="handlePayment" size="medium"
                :disabled="!formData.voucherImage || submitting" class="confirm-btn">
                打款成功
            </el-button>
        </span>

        <!-- 图片预览弹窗 -->
        <el-dialog :visible.sync="previewVisible" width="60%" top="5vh" append-to-body class="image-preview-dialog">
            <div class="preview-header">
                <span class="preview-title">凭证预览</span>
                <el-button type="text" icon="el-icon-close" @click="previewVisible = false"
                    class="close-btn"></el-button>
            </div>
            <div class="preview-body">
                <img :src="previewImageUrl" class="preview-large-image" alt="凭证预览" />
            </div>
        </el-dialog>
    </el-dialog>
</template>

<script>
import { fileUpload } from '@/api/user'
import { PutPayment } from "@/api/cashout"

export default {
    name: 'PaymentDialog',
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        paymentData: {
            type: Object,
            default: () => ({
                unionName: '',
                unionId: '',
                applyAmount: 0,
                bankInfo: '',
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
            uploading: false,
            uploadProgress: 0,
            cancelUpload: null,
            voucherOssId: '',
            previewVisible: false,
            previewImageUrl: '',

            formData: {
                voucherImage: ''
            }
        };
    },
    computed: {
        dialogTitle() {
            return `打款 - ${this.paymentData.unionName}`;
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
            this.uploading = false;
            this.uploadProgress = 0;
            this.voucherOssId = '';
            this.formData.voucherImage = '';
            this.previewVisible = false;
            this.previewImageUrl = '';
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

        // 预览图片
        previewImage() {
            if (this.formData.voucherImage) {
                this.previewImageUrl = this.formData.voucherImage;
                this.previewVisible = true;
            }
        },

        // 删除凭证图片
        handleRemoveImage() {
            this.$confirm('确定要删除凭证图片吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
                beforeClose: (action, instance, done) => {
                    if (action === 'confirm') {
                        instance.confirmButtonLoading = true;
                        this.executeRemoveImage().finally(() => {
                            instance.confirmButtonLoading = false;
                            done();
                        });
                    } else {
                        done();
                    }
                }
            }).then(() => {
                // 在beforeClose中已经处理
            }).catch(() => {
                // 取消删除
            });
        },

        async executeRemoveImage() {
            try {
                if (this.voucherOssId) {
                    // await deleteFile({ ossId: this.voucherOssId });
                }

                this.formData.voucherImage = '';
                this.voucherOssId = null;
                this.$message.success('凭证已删除');

            } catch (error) {
                this.$message.error('删除失败：' + (error.message || '请稍后重试'));
            }
        },

        // 图片上传前校验
        beforeAvatarUpload(file) {
            const isImage = file.type.startsWith("image/");
            const isLt5M = file.size / 1024 / 1024 < 5;

            if (!isImage) {
                this.$message.error("只能上传图片文件");
                return false;
            }

            const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
            if (!allowedTypes.includes(file.type)) {
                this.$message.error("仅支持上传png、jpg、jpeg格式的图片");
                return false;
            }

            if (!isLt5M) {
                this.$message.error("图片大小不能超过 5MB");
                return false;
            }

            return true;
        },

        // 图片上传处理
        async handleAvatarUpload({ file, onSuccess, onProgress }) {
            try {
                this.uploading = true;
                this.uploadProgress = 0;

                const progressInterval = setInterval(() => {
                    if (this.uploadProgress < 90) {
                        this.uploadProgress += 10;
                        onProgress({ percent: this.uploadProgress });
                    }
                }, 200);

                const formData = new FormData();
                formData.append('file', file);

                const controller = new AbortController();
                this.cancelUpload = () => {
                    controller.abort();
                    clearInterval(progressInterval);
                    this.uploading = false;
                    this.uploadProgress = 0;
                };

                const response = await fileUpload(formData, {
                    signal: controller.signal,
                    onUploadProgress: (progressEvent) => {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        this.uploadProgress = percent;
                        onProgress({ percent });
                    }
                });

                clearInterval(progressInterval);
                this.uploadProgress = 100;

                if (response.code === 200) {
                    const previewUrl = URL.createObjectURL(file);
                    this.formData.voucherImage = previewUrl;
                    this.voucherOssId = response.data.ossId;

                    setTimeout(() => {
                        onSuccess("success");
                        this.$message.success("凭证上传成功");
                        this.uploading = false;
                        this.uploadProgress = 0;
                    }, 300);
                } else {
                    throw new Error(response.message || '上传失败');
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.$message.error(error.message || '上传失败');
                }
                this.uploading = false;
                this.uploadProgress = 0;
            }
        },

        // 提交打款
        async handlePayment() {
            try {
                // 验证是否已上传凭证
                if (!this.formData.voucherImage || this.formData.voucherImage.trim() === '') {
                    this.$message.error('请先上传打款凭证');
                    return;
                }

                this.submitting = true;
                console.log('测试打款', this.paymentData)
                const submitData = {
                    unionTransactionId: this.paymentData.unionTransactionId,
                    // status: 3, // 已打款
                    // voucherOssId: this.voucherOssId || '',
                    // voucherUrl: this.formData.voucherImage,
                    paymentProof: this.voucherOssId,
                    // action: 'payment'
                };

                // 模拟API调用
                // await new Promise(resolve => setTimeout(resolve, 800));
                const res = await PutPayment(submitData);
                if (res.code === 200) {
                    this.$message.success('打款成功，状态已变更为"已打款"');
                    this.dialogVisible = false;
                    this.$emit('submit-success', submitData);
                }



            } catch (error) {
                console.error('打款失败:', error);
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
                this.$confirm('确定要取消吗？已上传的凭证将不会保存', '提示', {
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
            return this.formData.voucherImage && this.formData.voucherImage.trim() !== '';
        }
    }
};
</script>

<style lang="scss" scoped>
.payment-dialog {
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

    .upload-section {
        .section-header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;

            .section-title {
                font-size: 15px;
                font-weight: 600;
                color: #333;
                margin-right: 4px;
            }

            .required-mark {
                color: #f56c6c;
                font-size: 16px;
            }
        }

        .voucher-uploader {
            width: 100%;

            .upload-card {
                width: 100%;
                border: 2px dashed #dcdfe6;
                border-radius: 8px;
                overflow: hidden;
                background: #fff;
                transition: all 0.3s ease;
                cursor: pointer;

                &:hover {
                    border-color: #6A35FF;
                    background: #f9f7ff;
                }

                // 上传中状态
                .uploading-state {
                    padding: 40px 20px;
                    text-align: center;

                    .uploading-content {
                        .uploading-icon {
                            font-size: 32px;
                            color: #6A35FF;
                            margin-bottom: 16px;
                            animation: rotating 2s linear infinite;
                        }

                        .uploading-text {
                            color: #333;
                            font-size: 14px;
                            margin-bottom: 16px;
                            font-weight: 500;
                        }

                        .upload-progress {
                            width: 80%;
                            margin: 0 auto;

                            ::v-deep .el-progress-bar__outer {
                                background-color: #f0f0f0;
                                border-radius: 10px;
                                height: 8px;
                            }

                            ::v-deep .el-progress-bar__inner {
                                border-radius: 10px;
                                background: linear-gradient(90deg, #6A35FF, #9047F8);
                            }
                        }
                    }
                }

                // 已上传状态
                .uploaded-state {
                    display: flex;
                    align-items: center;
                    padding: 20px;

                    .image-container {
                        position: relative;
                        width: 120px;
                        height: 120px;
                        border-radius: 8px;
                        overflow: hidden;
                        flex-shrink: 0;
                        margin-right: 20px;

                        .voucher-image {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                            cursor: pointer;
                            transition: transform 0.3s ease;

                            &:hover {
                                transform: scale(1.05);
                            }
                        }

                        .image-actions {
                            position: absolute;
                            bottom: 8px;
                            right: 8px;
                            display: flex;
                            gap: 6px;
                            opacity: 0;
                            transition: opacity 0.3s ease;

                            .preview-btn {
                                background: rgba(255, 255, 255, 0.9);
                                color: #6A35FF;

                                &:hover {
                                    background: #fff;
                                }
                            }

                            .delete-btn {
                                background: rgba(255, 255, 255, 0.9);
                                color: #f56c6c;

                                &:hover {
                                    background: #fff;
                                }
                            }
                        }

                        &:hover .image-actions {
                            opacity: 1;
                        }
                    }

                    .uploaded-info {
                        flex: 1;

                        .success-icon {
                            font-size: 24px;
                            color: #67c23a;
                            margin-bottom: 8px;
                        }

                        .uploaded-text {
                            color: #333;
                            font-size: 15px;
                            font-weight: 500;
                            margin-bottom: 4px;
                        }

                        .upload-hint {
                            color: #999;
                            font-size: 13px;
                        }
                    }
                }

                // 上传按钮状态
                .upload-state {
                    padding: 40px 20px;
                    text-align: center;

                    .upload-placeholder {
                        .upload-icon {
                            font-size: 48px;
                            color: #c0c4cc;
                            margin-bottom: 16px;
                            transition: color 0.3s ease;
                        }

                        .upload-text {
                            color: #333;
                            font-size: 15px;
                            font-weight: 500;
                            margin-bottom: 8px;
                        }

                        .upload-subtext {
                            color: #999;
                            font-size: 13px;
                            line-height: 1.5;
                        }
                    }
                }
            }
        }

        .upload-tips {
            margin-top: 12px;
            padding: 12px;
            background: #f0f9eb;
            border-radius: 6px;
            border-left: 4px solid #67c23a;

            .tip-item {
                display: flex;
                align-items: center;

                .tip-icon {
                    color: #67c23a;
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

    // 图片预览弹窗
    .image-preview-dialog {
        ::v-deep .el-dialog {
            border-radius: 12px;
            overflow: hidden;
            background: #000;

            &__header {
                background: rgba(0, 0, 0, 0.8);
                padding: 16px 24px;

                .preview-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                }

                .preview-title {
                    color: #fff;
                    font-size: 16px;
                    font-weight: 500;
                }

                .close-btn {
                    color: #fff;
                    font-size: 20px;

                    &:hover {
                        color: rgba(255, 255, 255, 0.8);
                    }
                }
            }

            &__body {
                padding: 0;
                background: #000;
            }
        }

        .preview-body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 400px;
            background: #000;

            .preview-large-image {
                max-width: 100%;
                max-height: 70vh;
                object-fit: contain;
                display: block;
            }
        }
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 16px;

        .cancel-btn {
            min-width: 100px;
            height: 40px;
            border-radius: 8px;
            border: 1px solid #dcdfe6;
            color: #666;

            &:hover {
                border-color: #6A35FF;
                color: #6A35FF;
                background: #f9f7ff;
            }
        }

        .confirm-btn {
            min-width: 100px;
            height: 40px;
            border-radius: 8px;
            background: linear-gradient(135deg, #6A35FF 0%, #9047F8 100%);
            border: none;
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

.preview-body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    background: #000;


}

.preview-large-image {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    display: block;
}

// 旋转动画
@keyframes rotating {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@media screen and (max-width: 768px) {
    .payment-dialog {
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

        .uploaded-state {
            flex-direction: column;
            text-align: center;

            .image-container {
                margin-right: 0 !important;
                margin-bottom: 16px;
            }
        }

        .dialog-footer {
            flex-direction: column;

            .cancel-btn,
            .confirm-btn {
                width: 100%;
            }
        }
    }
}
</style>
