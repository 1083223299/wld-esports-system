<template>
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="800px" :before-close="handleClose"
        :close-on-click-modal="false" class="withdraw-dialog">

        <!-- 申请表单 -->
        <el-form ref="withdrawForm" :model="formData" :rules="formRules" label-width="120px" label-position="right"
            class="withdraw-form">

            <!-- ==================== 基础信息区块 ==================== -->
            <!-- 1. 游戏公会（禁用输入框） -->
            <el-form-item label="游戏公会：" required>
                <el-input v-model="formData.tradeName" placeholder="游戏公会名称" :disabled="true" class="disabled-input">
                    <i slot="prefix" class="el-input__icon el-icon-office-building"></i>
                </el-input>
                <div class="form-tip">系统自动带入，不可修改</div>
            </el-form-item>

            <!-- 2. 公会ID（禁用输入框） -->
            <el-form-item label="公会ID：" required>
                <el-input v-model="formData.tradeNo" placeholder="公会唯一标识" :disabled="true" class="disabled-input">
                    <i slot="prefix" class="el-input__icon el-icon-tickets"></i>
                </el-input>
                <div class="form-tip">系统自动带入，不可修改</div>
            </el-form-item>

            <!-- 3. 可提现金额（禁用输入框） -->
            <el-form-item label="可提现金额：" required>
                <el-input v-model="formData.availableAmount" placeholder="可提现金额" :disabled="true"
                    class="disabled-input amount-input">
                    <i slot="prefix" class="el-input__icon el-icon-money"></i>
                </el-input>
                <div class="form-tip">系统自动结算不可修改；可提现金额大于{{ formatCurrency(withdrawConfig.minWithdrawAmount) }}才可以提现</div>
            </el-form-item>

            <el-divider class="form-divider"></el-divider>

            <!-- ==================== 申请信息区块 ==================== -->
            <!-- 4. 申请金额（可编辑） -->
            <el-form-item label="申请金额：" prop="amount" required>
                <el-input v-model="formData.amount" placeholder="请输入申请金额" :max="availableAmount"
                    @input="handleAmountInput">
                    <i slot="prefix" class="el-input__icon el-icon-edit-outline"></i>
                </el-input>
                <div class="form-tip">最大可申请金额：{{ formatCurrency(availableAmount) }}</div>
            </el-form-item>

            <!-- 5. 收款银行 -->
            <el-form-item label="收款银行：" prop="bank" required>
                <el-input v-model="formData.bank" placeholder="请输入收款银行名称" clearable>
                    <i slot="prefix" class="el-input__icon el-icon-bank-card"></i>
                </el-input>
                <div class="form-tip">例如：中国工商银行、中国建设银行等</div>
            </el-form-item>

            <!-- 6. 收款账号 -->
            <el-form-item label="收款账号：" prop="bankAccount" required>
                <el-input v-model="formData.bankAccount" placeholder="请输入银行账号" clearable @blur="validatebankAccount">
                    <i slot="prefix" class="el-input__icon el-icon-bank-card"></i>
                </el-input>
                <div class="form-tip">请输入16-19位数字银行账号</div>
            </el-form-item>

            <!-- 7. 发票类型 -->
            <el-form-item label="发票类型：" prop="invoiceType" required>
                <el-radio-group v-model="formData.invoiceType" @change="handleInvoiceTypeChange">
                    <el-radio label="1">自备发票</el-radio>
                    <el-radio label="2">平台代开</el-radio>
                </el-radio-group>
                <div v-if="isPlatformInvoice" class="form-tip tax-tip">
                    按{{ formatRate(withdrawConfig.taxRate) }}的税点扣除，代扣金额{{ formatCurrency(taxAmount) }}，本次实际到账{{ formatCurrency(actualAmount) }}
                </div>
            </el-form-item>

            <!-- ==================== 上传发票区块 ==================== -->
            <!-- 8. 上传发票 -->
            <el-form-item v-if="isSelfInvoice" label="上传发票：" prop="invoiceImages" required>
                <div class="invoice-upload-wrapper">
                    <el-upload class="invoice-uploader" action="#" :show-file-list="false"
                        :before-upload="beforeAvatarUpload" :http-request="handleAvatarUpload" :disabled="uploading">

                        <!-- 上传区域 -->
                        <div class="upload-area">
                            <!-- 已上传图片预览 -->
                            <div v-if="formData.invoiceImages.length > 0" class="preview-wrapper">
                                <img :src="formData.invoiceImages[0]" class="preview-image" />
                                <div class="preview-overlay">
                                    <div class="preview-actions">
                                        
                                        <el-button type="danger" icon="el-icon-delete-solid" circle size="mini"
                                            @click.stop="handleRemoveImage" title="删除图片">
                                        </el-button>
                                    </div>
                                </div>
                            </div>

                            <!-- 上传按钮（无图片时） -->
                            <div v-else class="upload-trigger">
                                <div class="upload-icon-wrapper">
                                    <i class="el-icon-picture-outline upload-icon"></i>
                                    <div class="upload-text">点击上传发票</div>
                                    <div class="upload-subtext">PNG/JPG 最大2MB</div>
                                </div>
                            </div>

                            <!-- 上传进度条 -->
                            <div v-if="uploading" class="upload-progress-layer">
                                <div class="progress-content">
                                    <div class="progress-icon-wrapper">
                                        <i class="el-icon-loading progress-icon"></i>
                                    </div>
                                    <div class="progress-text">{{ uploadProgress }}%</div>
                                    <el-progress :percentage="uploadProgress" :stroke-width="4" color="#409eff"
                                        class="custom-progress">
                                    </el-progress>
                                </div>
                            </div>
                        </div>

                    </el-upload>

                    <!-- 提示信息 -->
                    <!-- <div class="upload-tips">
                        <div class="tip-item">
                            <i class="el-icon-info tip-icon"></i>
                            <span class="tip-text">仅支持上传png、jpg、jpeg格式的发票图片</span>
                        </div>
                        <div class="tip-item">
                            <i class="el-icon-info tip-icon"></i>
                            <span class="tip-text">图片大小不得超过2MB</span>
                        </div>
                        <div class="tip-item">
                            <i class="el-icon-info tip-icon"></i>
                            <span class="tip-text">建议上传清晰、完整的发票照片</span>
                        </div>
                    </div> -->
                </div>
            </el-form-item>
        </el-form>

        <span slot="footer" class="dialog-footer">
            <el-button @click="handleCancel" size="medium">取 消</el-button>
            <el-button type="primary" :loading="submitting" @click="handleSubmit" :disabled="!canSubmit" size="medium">
                提 交 申 请
            </el-button>
        </span>
    </el-dialog>
</template>

<script>
// 引入上传API
import { fileUpload } from '@/api/user'
import { getWithdrawConfig, PostCashoutAdd } from '@/api/cashout'

export default {
    name: 'WithdrawApplyDialog',
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        unionInfo: {
            type: Object,
            default: () => ({
                tradeName: '',
                tradeNo: '',
                availableAmount: 0
            })
        },
        lastBankInfo: {
            type: Object,
            default: () => ({
                bank: '',
                bankAccount: ''
            })
        }
    },
    data() {
        // 验证银行账号格式
        const validatebankAccount = (rule, value, callback) => {
            if (!value) {
                return callback(new Error('请输入收款账号'));
            }
            const bankAccountRegex = /^\d{16,19}$/;
            if (!bankAccountRegex.test(value)) {
                return callback(new Error('银行账号格式不正确（16-19位数字）'));
            }
            callback();
        };

        // 验证申请金额
        const validateAmount = (rule, value, callback) => {
            if (!value) {
                return callback(new Error('请输入申请金额'));
            }
            const amount = parseFloat(value);
            if (isNaN(amount) || amount <= 0) {
                return callback(new Error('申请金额必须为正数'));
            }
            if (amount > this.availableAmount) {
                return callback(new Error('申请金额不可超过可提现金额'));
            }
            if (amount < Number(this.withdrawConfig.minWithdrawAmount || 0)) {
                return callback(new Error(`申请金额不能低于最低提现金额${this.formatCurrency(this.withdrawConfig.minWithdrawAmount)}`));
            }
            const decimalRegex = /^\d+(\.\d{1,2})?$/;
            if (!decimalRegex.test(value)) {
                return callback(new Error('金额最多保留两位小数'));
            }
            callback();
        };

        return {
            dialogVisible: this.visible,
            submitting: false,
            amountError: '',
            configLoading: false,
            withdrawConfig: {
                minWithdrawAmount: 0,
                taxRate: 0
            },

            // 上传相关状态
            uploading: false,
            uploadProgress: 0,
            cancelUpload: null,
            invoiceOssId: '',

            // 表单数据
            formData: {
                tradeName: this.unionInfo.tradeName || '',
                tradeNo: this.unionInfo.tradeNo || '',
                availableAmount: this.formatNumber(this.unionInfo.availableAmount || 0),
                amount: '',
                bank: this.lastBankInfo.bank || '',
                bankAccount: this.lastBankInfo.bankAccount || '',
                invoiceType: '1',
                invoiceImages: []
            },

            // 表单验证规则
            formRules: {
                amount: [
                    { required: true, validator: validateAmount, trigger: 'blur' }
                ],
                bank: [
                    { required: true, message: '请输入收款银行', trigger: 'blur' }
                ],
                bankAccount: [
                    { required: true, validator: validatebankAccount, trigger: 'blur' }
                ],
                invoiceType: [
                    { required: true, message: '请选择发票类型', trigger: 'change' }
                ],
                invoiceImages: [  // 新增发票验证规则
                    {
                        required: true,
                        validator: (rule, value, callback) => {
                            if (this.formData.invoiceType === '1' && (!value || value.length === 0)) {
                                callback(new Error('请上传发票图片'));
                            } else {
                                callback();
                            }
                        },
                        trigger: 'change'
                    }
                ]
            }
        };
    },
    computed: {
        dialogTitle() {
            return this.unionInfo.tradeName ? `申请提现 - ${this.unionInfo.tradeName}` : '申请提现';
        },
        availableAmount() {
            return parseFloat(this.unionInfo.availableAmount || 0);
        },
        currentAmount() {
            const amount = parseFloat(this.formData.amount);
            return Number.isNaN(amount) ? 0 : amount;
        },
        isSelfInvoice() {
            return this.formData.invoiceType === '1';
        },
        isPlatformInvoice() {
            return this.formData.invoiceType === '2';
        },
        taxAmount() {
            if (!this.isPlatformInvoice) {
                return 0;
            }
            return this.roundMoney(this.currentAmount * Number(this.withdrawConfig.taxRate || 0) / 100);
        },
        actualAmount() {
            return this.roundMoney(Math.max(this.currentAmount - this.taxAmount, 0));
        },
        canSubmit() {
            if (this.configLoading) {
                return false;
            }
            if (this.availableAmount <= 0 || this.availableAmount < Number(this.withdrawConfig.minWithdrawAmount || 0)) {
                return false;
            }
            return this.isPlatformInvoice || this.formData.invoiceImages.length > 0;
        }
    },
    mounted() {
        if (this.dialogVisible) {
            this.fetchWithdrawConfig();
        }
    },
    watch: {
        visible(val) {
            this.dialogVisible = val;
            if (val) {
                this.initDialog();
                this.fetchWithdrawConfig();
            }
        },
        dialogVisible(val) {
            this.$emit('update:visible', val);
        },
        unionInfo: {
            immediate: true,
            deep: true,
            handler(newVal) {
                if (newVal) {
                    this.formData.tradeName = newVal.tradeName || '';
                    this.formData.tradeNo = newVal.tradeNo || '';
                    this.formData.availableAmount = this.formatNumber(newVal.availableAmount || 0);

                    if (this.availableAmount > 0) {
                        this.formData.amount = this.formatNumber(this.availableAmount);
                    }
                }
            }
        },
        'formData.amount': function (val) {
            if (val) {
                const amount = parseFloat(val);
                if (!isNaN(amount) && amount > this.availableAmount) {
                    this.amountError = '申请金额不可超过可提现金额';
                } else {
                    this.amountError = '';
                }
            }
        }
    },
    methods: {
        // ==================== 表单相关方法 ====================
        getBusinessData(res) {
            if (!res) {
                return {};
            }
            return res.data || res;
        },

        async fetchWithdrawConfig() {
            this.configLoading = true;
            try {
                const res = await getWithdrawConfig({});
                const data = this.getBusinessData(res);
                this.withdrawConfig = {
                    minWithdrawAmount: Number(data.minWithdrawAmount || 0),
                    taxRate: Number(data.taxRate || 0)
                };
            } catch (error) {
                console.error('获取提现配置失败:', error);
                this.$message.error('获取提现配置失败');
            } finally {
                this.configLoading = false;
            }
        },

        initDialog() {
            this.submitting = false;
            this.amountError = '';
            this.uploading = false;
            this.uploadProgress = 0;
            this.invoiceOssId = '';

            this.$nextTick(() => {
                if (this.$refs.withdrawForm) {
                    this.$refs.withdrawForm.clearValidate();
                }
            });

            this.formData.tradeName = this.unionInfo.tradeName || '';
            this.formData.tradeNo = this.unionInfo.tradeNo || '';
            this.formData.availableAmount = this.formatNumber(this.unionInfo.availableAmount || 0);
            this.formData.invoiceType = '1';

            if (this.lastBankInfo.bank) {
                this.formData.bank = this.lastBankInfo.bank;
            }
            if (this.lastBankInfo.bankAccount) {
                this.formData.bankAccount = this.lastBankInfo.bankAccount;
            }

            this.formData.invoiceImages = [];

            if (this.availableAmount > 0) {
                this.formData.amount = this.formatNumber(this.availableAmount);
            } else {
                this.formData.amount = '';
            }
        },

        formatCurrency(amount) {
            return `¥${this.formatNumber(amount)}`;
        },

        formatRate(rate) {
            return `${this.formatNumber(rate)}%`;
        },

        formatNumber(num) {
            return parseFloat(num || 0).toFixed(2);
        },

        roundMoney(num) {
            return Math.round(Number(num || 0) * 100) / 100;
        },

        handleAmountInput(value) {
            let newValue = value.replace(/[^\d.]/g, '');
            const dotIndex = newValue.indexOf('.');
            if (dotIndex !== -1) {
                const beforeDot = newValue.substring(0, dotIndex);
                const afterDot = newValue.substring(dotIndex + 1);
                newValue = beforeDot + '.' + afterDot.replace(/\./g, '');
            }
            if (dotIndex !== -1) {
                const decimalPart = newValue.split('.')[1];
                if (decimalPart && decimalPart.length > 2) {
                    newValue = newValue.substring(0, newValue.length - 1);
                }
            }
            this.formData.amount = newValue;
        },

        handleInvoiceTypeChange() {
            if (this.isPlatformInvoice) {
                this.formData.invoiceImages = [];
                this.invoiceOssId = '';
            }
            this.$nextTick(() => {
                if (this.$refs.withdrawForm) {
                    this.$refs.withdrawForm.validateField('invoiceImages');
                }
            });
        },

        validatebankAccount() {
            this.$refs.withdrawForm.validateField('bankAccount');
        },

        // ==================== 上传相关方法 ====================
        handleRemoveImage() {
            this.$confirm('确定要删除发票图片吗？', '提示', {
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
                if (this.invoiceOssId) {
                    // await deleteFile({ ossId: this.invoiceOssId });
                }

                this.formData.invoiceImages = [];
                this.invoiceOssId = null;
                this.$message.success('发票图片已删除');

                this.$nextTick(() => {
                    if (this.$refs.withdrawForm) {
                        this.$refs.withdrawForm.validateField('invoiceImages');
                    }
                });
            } catch (error) {
                this.$message.error('删除失败：' + (error.message || '请稍后重试'));
            }
        },

        beforeAvatarUpload(file) {
            const isImage = file.type.startsWith("image/");
            const isLt2M = file.size / 1024 / 1024 < 2;

            if (!isImage) {
                this.$message.error("只能上传图片文件");
                return false;
            }

            const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
            if (!allowedTypes.includes(file.type)) {
                this.$message.error("仅支持上传png、jpg、jpeg格式的图片");
                return false;
            }

            if (!isLt2M) {
                this.$message.error("图片大小不能超过 2MB");
                return false;
            }

            return true;
        },

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
                    this.formData.invoiceImages = [previewUrl];
                    this.invoiceOssId = response.data.ossId;

                    setTimeout(() => {
                        onSuccess("success");
                        this.$message.success("发票上传成功");
                        this.uploading = false;
                        this.uploadProgress = 0;

                        // 触发表单验证
                        this.$nextTick(() => {
                            if (this.$refs.withdrawForm) {
                                this.$refs.withdrawForm.validateField('invoiceImages');
                            }
                        });
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

        // ==================== 提交相关方法 ====================
        async handleSubmit() {
            try {
                // 1. 验证表单
                const valid = await this.$refs.withdrawForm.validate();
                if (!valid) {
                    return;
                }
                // 2. 验证发票是否上传（额外验证）
                if (this.isSelfInvoice && (!this.invoiceOssId || this.formData.invoiceImages.length === 0)) {
                    this.$message.error('请先上传发票图片');
                    return;
                }
                // 3. 验证金额
                const amount = parseFloat(this.formData.amount);
                if (amount > this.availableAmount) {
                    this.$message.error('申请金额不可超过可提现金额');
                    return;
                }

                if (amount <= 0) {
                    this.$message.error('申请金额必须大于0元');
                    return;
                }

                if (amount < Number(this.withdrawConfig.minWithdrawAmount || 0)) {
                    this.$message.error(`申请金额不能低于最低提现金额${this.formatCurrency(this.withdrawConfig.minWithdrawAmount)}`);
                    return;
                }

                this.submitting = true;

                // 4. 构造请求参数（使用更清晰的写法）
                const searchParam = {
                    amount: amount,
                    bank: this.formData.bank,
                    bankAccount: this.formData.bankAccount,
                    invoiceType: this.formData.invoiceType,
                    invoice: this.isSelfInvoice ? this.invoiceOssId || '' : '',
                    taxRate: this.isPlatformInvoice ? Number(this.withdrawConfig.taxRate || 0) : 0,
                    taxAmount: this.taxAmount,
                    actualAmount: this.actualAmount
                };

                // 5. 清理空参数
                Object.keys(searchParam).forEach((key) => {
                    if (searchParam[key] === undefined || searchParam[key] === '' || searchParam[key] === null) {
                        delete searchParam[key];
                    }
                });

                console.log('提交信息', searchParam);

                // 6. 统一使用 async/await 风格
                const res = await PostCashoutAdd(searchParam);

                if (res.code === 200) {
                    this.$message.success('提现申请提交成功！');
                    this.saveBankInfoToLocal();
                    this.dialogVisible = false;

                    // 提交成功后重置表单
                    this.resetForm();

                    // 发出提交成功事件，包含表单数据和响应数据
                    this.$emit('submit-success', {
                        formData: searchParam,
                        response: res.data
                    });
                } else {
                    // 处理业务错误
                    const errorMsg = res.message || res.errorMessage || '提现申请失败';
                    this.$message.error(errorMsg);
                    throw new Error(errorMsg); // 抛出错误让catch捕获
                }
            } catch (error) {
                this.$message.error("获取数据失败，请稍后重试");
            } finally {
                this.submitting = false;
            }
        },

        // 添加重置表单方法
        resetForm() {
            this.$nextTick(() => {
                if (this.$refs.withdrawForm) {
                    this.$refs.withdrawForm.resetFields();
                }
            });

            // 重置部分数据
            this.formData.amount = this.formatNumber(this.availableAmount);
            this.formData.invoiceType = '1';
            this.formData.invoiceImages = [];
            this.invoiceOssId = '';
            this.uploading = false;
            this.uploadProgress = 0;
        },
        saveBankInfoToLocal() {
            const bankInfo = {
                bank: this.formData.bank,
                bankAccount: this.formData.bankAccount,
                saveTime: new Date().getTime()
            };

            try {
                localStorage.setItem(`withdraw_bank_info_${this.formData.tradeNo}`,
                    JSON.stringify(bankInfo));
            } catch (e) {
                console.warn('本地存储失败:', e);
            }
        },

        handleCancel() {
            this.dialogVisible = false;
        },

        handleClose(done) {
            if (this.hasFormDataChanged()) {
                this.$confirm('确定要取消提现申请吗？已填写的数据将不会保存', '提示', {
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
            const originalAmount = this.formatNumber(this.availableAmount);
            const currentAmount = this.formData.amount;

            return currentAmount !== originalAmount ||
                this.formData.invoiceType !== '1' ||
                this.formData.bank !== this.lastBankInfo.bank ||
                this.formData.bankAccount !== this.lastBankInfo.bankAccount ||
                this.formData.invoiceImages.length > 0;
        }
    }
};
</script>

<style lang="scss" scoped>
.withdraw-dialog {
    ::v-deep .el-dialog {
        margin-top: 10vh !important;
        border-radius: 12px;
        overflow: hidden;

        // &__header {
        // background: #FFF;
        // padding: 20px 20px 0;

        // .el-dialog__title {
        //     color: #000;
        //     font-size: 18px;
        //     font-weight: 600;
        // }

        // .el-dialog__headerbtn {
        //     top: 20px;

        //     .el-dialog__close {
        //         color: white;
        //         font-size: 20px;

        //         &:hover {
        //             color: #f0f0f0;
        //         }
        //     }
        // }
        // }

        &__body {
            padding: 24px;
            background-color: #FFF;
        }

        &__footer {
            padding: 16px 24px;
            background-color: #FFF;
            border-top: 1px solid #e4e7ed;
        }
    }

    .withdraw-form {
        .el-form-item {
            margin-bottom: 20px;

            &:last-child {
                margin-bottom: 0;
            }

            ::v-deep .el-form-item__label {
                font-weight: 500;
                color: #333;
                padding-right: 20px;
            }
        }

        .form-divider {
            margin: 24px 0;
            background-color: #e4e7ed;
        }

        .disabled-input {
            ::v-deep .el-input__inner {
                background-color: #f5f7fa;
                border-color: #e4e7ed;
                color: #606266;
                cursor: not-allowed;

                &:hover {
                    border-color: #e4e7ed;
                }
            }

            ::v-deep .el-input__icon {
                color: #909399;
            }
        }

        .amount-input {
            ::v-deep .el-input__inner {
                color: #e6a23c;
                font-weight: 600;
                font-size: 16px;
            }
        }

        .form-tip {
            font-size: 12px;
            color: #909399;
            margin-top: 6px;
            line-height: 1.4;
            padding-left: 12px;
        }

        .error-tip {
            font-size: 12px;
            color: #f56c6c;
            margin-top: 6px;
            padding-left: 12px;
        }

        .tax-tip {
            color: #909399;
            background: #f5f7fa;
            border-radius: 6px;
            padding: 8px 12px;
        }

        // ==================== 新版上传组件样式 ====================
        .invoice-upload-wrapper {
            .invoice-uploader {
                width: 100%;

                .upload-area {
                    position: relative;
                    width: 150px;
                    height: 160px;
                    border: 2px dashed #dcdfe6;
                    border-radius: 8px;
                    cursor: pointer;
                    overflow: hidden;
                    background: #fafafa;
                    transition: all 0.3s ease;

                    &:hover {
                        border-color: #409eff;
                        background: #f0f7ff;
                    }

                    .preview-wrapper {
                        position: relative;
                        width: 100%;
                        height: 100%;

                        .preview-image {
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            background: #fff;
                        }

                        .preview-overlay {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(0, 0, 0, 0.3);
                            opacity: 0;
                            transition: opacity 0.3s;
                            display: flex;
                            justify-content: flex-end;

                            &:hover {
                                opacity: 1;
                            }

                            .preview-actions {
                                .el-button {
                                    // background: rgba(255, 255, 255, 0.9);
                                    border: none;
                                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

                                    &:hover {
                                        transform: scale(1.1);
                                    }
                                }
                            }
                        }
                    }

                    .el-icon-delete-solid {
                        color: red;
                    }

                    .upload-trigger {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;

                        .upload-icon-wrapper {
                            text-align: center;
                            color: #909399;

                            .upload-icon {
                                font-size: 28px;
                                color: #c0c4cc;
                                display: block;
                            }

                            .upload-text {
                                font-size: 14px;
                                color: #666;
                                font-weight: 500;
                            }

                            .upload-subtext {
                                font-size: 12px;
                                color: #999;
                                margin-top: -10px;
                            }
                        }
                    }

                    .upload-progress-layer {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.95);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10;

                        .progress-content {
                            text-align: center;
                            width: 80%;

                            .progress-icon-wrapper {
                                margin-bottom: 12px;

                                .progress-icon {
                                    font-size: 32px;
                                    color: #409eff;
                                    animation: rotating 2s linear infinite;
                                }
                            }

                            .progress-text {
                                font-size: 14px;
                                color: #409eff;
                                font-weight: 500;
                                margin-bottom: 10px;
                            }

                            .custom-progress {
                                ::v-deep .el-progress-bar__outer {
                                    background-color: #ebeef5;
                                    border-radius: 4px;
                                }

                                ::v-deep .el-progress-bar__inner {
                                    border-radius: 4px;
                                    background: linear-gradient(90deg, #409eff, #66b1ff);
                                    transition: width 0.6s ease;
                                }
                            }
                        }
                    }
                }
            }

            .upload-tips {
                margin-top: 12px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 6px;

                .tip-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 6px;
                    font-size: 12px;

                    &:last-child {
                        margin-bottom: 0;
                    }

                    .tip-icon {
                        color: #909399;
                        margin-right: 6px;
                        font-size: 14px;
                    }

                    .tip-text {
                        color: #606266;
                    }
                }
            }
        }
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;

        .el-button {
            min-width: 100px;
            height: 40px;
            border-radius: 6px;
            font-weight: 500;

            &:first-child {
                color: #666;
                border-color: #dcdfe6;

                &:hover {
                    color: #409eff;
                    border-color: #409eff;
                    background-color: rgba(64, 158, 255, 0.05);
                }
            }

            &:last-child {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;

                &:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                &:active {
                    transform: translateY(0);
                }

                &[disabled] {
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
    .withdraw-dialog {
        ::v-deep .el-dialog {
            width: 90% !important;
            max-width: 500px;
            margin-top: 5vh !important;
        }

        .withdraw-form {
            ::v-deep .el-form-item__label {
                text-align: left;
                padding-bottom: 6px;
            }

            .invoice-upload-wrapper {
                .invoice-uploader {
                    .upload-area {
                        height: 150px;
                    }
                }
            }
        }
    }
}
</style>
