<template>
    <div class="container">
        <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
            @search="handleSearch" @reset="handleReset">
        </SearchForm>
        <!-- 列表区域 -->
        <el-card class="list-card" shadow="never">
            <!-- 固定顶部：操作按钮区域 -->
            <div class="action-bar-fixed">
                <!-- 去掉了申请提现按钮 -->
            </div>
            <!-- 表格滚动区域 -->
            <div class="table-scroll-container">
                <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }" height="100%" row-class-name="tableRowClassName"
                    ref="table">
                    <el-table-column prop="tradeName" label="公会名称" />
                    <el-table-column prop="tradeNo" label="公会ID" />
                    <el-table-column prop="amount" label="申请金额">
                        <template slot-scope="scope">
                            <span class="amount-text">¥{{ formatNumber(scope.row.amount) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="invoiceType" label="发票类型">
                        <template slot-scope="scope">
                            <el-tag :type="getInvoiceTypeTag(scope.row.invoiceType)" effect="plain" size="mini">
                                {{ getInvoiceTypeText(scope.row.invoiceType) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="actualAmount" label="实际到账">
                        <template slot-scope="scope">
                            <div class="actual-amount-cell">
                                <div class="actual-amount-value">{{ formatAmount(scope.row.actualAmount) }}</div>
                                <div
                                    v-if="String(scope.row.invoiceType) === '2' && getTaxAmount(scope.row) !== '-'"
                                    class="actual-amount-tax"
                                >
                                    代扣：{{ getTaxAmount(scope.row) }}
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column prop="invoiceUrl" label="发票">
                        <template slot-scope="scope">
                            <img v-if="scope.row.invoiceUrl" :src="scope.row.invoiceUrl" class="fapiao"
                                @click="previewAvatar(scope.row.invoiceUrl)" />
                            <span v-else class="no-invoice">-</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="status" label="状态">
                        <template slot-scope="scope">
                            <el-tag type="warning" effect="plain" size="mini" v-if="scope.row.status == 0">待审核</el-tag>
                            <el-tag type="danger" effect="plain" size="mini" v-if="scope.row.status == 1">已拒绝</el-tag>
                            <el-tag type="" effect="plain" size="mini" v-if="scope.row.status == 2">待打款</el-tag>
                            <el-tag type="success" effect="plain" size="mini" v-if="scope.row.status == 3">已打款</el-tag>
                        </template>
                    </el-table-column>

                    <el-table-column prop="createTime" label="申请时间" />
                    <el-table-column prop="processingTime" label="处理时间" />
                    <el-table-column prop="unitPrice" label="备注">
                        <template slot-scope="scope">
                            <div v-if="scope.row.remark == null || !scope.row.remark">-</div>
                            <div v-else class="remark-text"
                                :style="scope.row.status == 1 ? 'color: #f56c6c' : 'color:#67C23A'">
                                <span>{{ scope.row.status == 1 ? '拒绝原因:' : '备注:' }}{{ scope.row.remark }}</span>
                                <img :src="scope.row.paymentProofUrl" alt="" class="paymentProofUrl"
                                    v-if="scope.row.paymentProofUrl != null"
                                    @click="previewAvatar(scope.row.paymentProofUrl)">
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作 " fixed="right">
                        <template slot-scope="scope">
                            <div class="action-buttons">
                                <!-- 根据状态显示不同操作按钮 -->
                                <el-button v-permission="'system:cashoutApproval:review'" v-if="scope.row.status == 0"
                                    type="text" @click="handleReview(scope.row)" style="color: #9047F8;">
                                    审核
                                </el-button>
                                <el-button v-permission="'system:cashoutApproval:makeMoney'"
                                    v-if="scope.row.status == 2" type="text" @click="handlePayment(scope.row)"
                                    style="color: #9047F8;">
                                    打款
                                </el-button>
                                <!-- 已拒绝和已打款状态不显示操作按钮 -->
                                <span v-if="scope.row.status == 1 || scope.row.status == 3" class="no-action">-</span>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
            <!-- 固定底部：分页区域 -->
            <div class="pagination-fixed">
                <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize"
                    :total="pagination.total" @current-change="handleCurrentChange" />
            </div>
        </el-card>

        <!-- 弹窗组件 -->
        <avatar-preview-dialog :visible.sync="avatarDialogVisible" :avatar-url="previewAvatarUrl"
            @close="handleAvatarDialogClose" Title="发票预览" />

        <!-- 审核弹窗 -->
        <ReviewDialog :visible.sync="showReviewDialog" :review-data="currentReviewData"
            @submit-success="handleReviewSubmit" />

        <!-- 打款弹窗 -->
        <PaymentDialog :visible.sync="showPaymentDialog" :payment-data="currentPaymentData"
            @submit-success="handlePaymentSubmit" />
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
import AvatarPreviewDialog from "@/components/AvatarPreviewDialog/index.vue"; // 头像预览弹窗

import ReviewDialog from './components/ReviewDialog.vue'; // 审核弹窗
import PaymentDialog from './components/PaymentDialog.vue'; // 打款弹窗

import { getCashoutList, getInfoBlance } from "@/api/cashout"

export default {
    name: 'CashoutApproval',
    components: {
        SearchForm, // 搜索表单组件
        PaginationSimple, // 分页组件
        AvatarPreviewDialog, // 头像预览弹窗
        ReviewDialog, // 审核弹窗
        PaymentDialog, // 打款弹窗
    },

    data() {
        return {
            // 搜索表单配置项
            searchItems: [
                {
                    type: "input",
                    prop: "tradeName",
                    label: "公会名称",
                    placeholder: "请输入公会名称",
                    clearable: true,
                },
                {
                    type: "input",
                    prop: "tradeNo",
                    label: "公会ID",
                    placeholder: "请输入公会ID",
                    clearable: true,
                },
                {
                    type: "select",
                    prop: "status",
                    label: "状态",
                    placeholder: "全部",
                    options: [
                        { label: "全部", value: null },
                        { label: "待审核", value: 0 },
                        { label: "已拒绝", value: 1 },
                        { label: "待打款", value: 2 },
                        { label: "已打款", value: 3 },
                    ],
                    clearable: true,
                },
                {
                    type: "daterange",
                    prop: "createTime",
                    label: "申请时间",
                    valueFormat: "yyyy-MM-dd HH:mm:ss",
                    startPlaceholder: "开始日期",
                    endPlaceholder: "结束日期",
                    pickerOptions: {
                        onPick: ({ maxDate, minDate }) => {
                            if (minDate && !maxDate) {
                                this.searchItems.find(item => item.prop === 'createTime').pickerOptions.disabledDate = (time) => {
                                    const selectedDate = minDate;
                                    const current = new Date(time);
                                    const timeDiff = Math.abs(current.getTime() - selectedDate.getTime());
                                    const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                                    // 如果日期差大于31天，则禁用
                                    return dayDiff > 31;
                                };
                            } else {
                                // 当选择了两个日期后，重置禁用规则
                                this.searchItems.find(item => item.prop === 'createTime').pickerOptions.disabledDate = null;
                            }
                        },
                        disabledDate: null,
                        // 快捷选择配置
                        shortcuts: [
                            {
                                text: "最近一周",
                                onClick(picker) {
                                    const end = new Date();
                                    end.setHours(23, 59, 59, 999);
                                    const start = new Date();
                                    start.setTime(end.getTime() - 3600 * 1000 * 24 * 7);
                                    start.setHours(0, 0, 0, 0);
                                    picker.$emit("pick", [start, end]);
                                },
                            },
                            {
                                text: "最近一个月",
                                onClick(picker) {
                                    const end = new Date();
                                    end.setHours(23, 59, 59, 999);
                                    const start = new Date();
                                    start.setTime(end.getTime() - 3600 * 1000 * 24 * 30);
                                    start.setHours(0, 0, 0, 0);
                                    picker.$emit("pick", [start, end]);
                                },
                            },
                        ],
                    },
                },
            ],
            // 筛选表单
            filterForm: {
                tradeName: '',
                tradeNo: '',
                tradeNamePerson: '',
                status: '',
                startTime: '',
                endTime: '',
            },
            // 分页相关
            pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
            // 表格数据
            tableData: [
            ],
            loading: false,

            // 弹窗相关状态
            previewAvatarUrl: "", // 预览头像URL
            avatarDialogVisible: false, // 头像预览弹窗显示状态
            showReviewDialog: false, // 审核弹窗显示状态
            showPaymentDialog: false, // 打款弹窗显示状态

            // 当前操作的数据
            currentReviewData: {
                unionTransactionId: '',
                unionName: '',
                unionId: '',
                applyAmount: 0,
                remainingAmount: 0, // 剩余可提现金额
                applyTime: '',
                invoiceType: '',
                actualAmount: ''
            },

            currentPaymentData: {
                unionTransactionId: '',
                unionName: '',
                unionId: '',
                applyAmount: 0,
                bankInfo: '', // 收款账户信息
                applyTime: '',
                invoiceType: '',
                actualAmount: ''
            }
        }
    },
    created() {
        // 获取公会列表
        this.fetchTableData()
    },
    methods: {
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
        formatAmount(amount) {
            if (amount === null || amount === undefined || amount === '') {
                return '-';
            }
            const num = Number(amount);
            return Number.isNaN(num) ? '-' : `¥${num.toFixed(2)}`;
        },
        getTaxAmount(row) {
            const amount = Number(row.amount);
            const actualAmount = Number(row.actualAmount);
            if (Number.isNaN(amount) || Number.isNaN(actualAmount)) {
                return '-';
            }
            const taxAmount = amount - actualAmount;
            return `¥${taxAmount.toFixed(2)}`;
        },
        /*** 处理搜索事件 * @param {Object} e 搜索表单数据 */
        handleSearch(e) {
            if (e) {
                const formValues = e;
                // 处理日期范围
                if (formValues.createTime && formValues.createTime.length === 2) {
                    this.filterForm.startTime = formValues.createTime[0];
                    this.filterForm.endTime = formValues.createTime[1];
                } else {
                    this.filterForm.startTime = "";
                    this.filterForm.endTime = "";
                }
                delete formValues.createTime;
                this.filterForm = { ...this.filterForm, ...formValues };
            }
            this.pagination.pageNum = 1; // 重置页码
            this.fetchTableData(); // 重新获取数据
        },

        // 分页
        handleCurrentChange(val) {
            this.pagination.pageNum = val;
            this.fetchTableData(); // 重新获取数据
        },

        // 获取公会列表
        async fetchTableData() {
            this.loading = true;
            const searchParam = {
                ...this.filterForm,
                pageSize: this.pagination.pageSize,
                pageNum: this.pagination.pageNum
            };

            // 清理空参数
            Object.keys(searchParam).forEach((key) =>
                searchParam[key] === undefined || searchParam[key] === ""
                    ? delete searchParam[key]
                    : ""
            );

            await getCashoutList(searchParam)
                .then((res) => {
                    if (res.code == 200) {
                        this.pagination.total = res.data.total; // 设置总记录数
                        this.tableData = res.data.rows;
                        this.loading = false; // 关闭加载状态
                    }
                }).catch((error) => {
                    console.error("获取公会列表失败:", error);
                    this.tableData = [];
                    this.pagination.total = 0;
                    this.loading = false; // 关闭加载状态
                    this.$message.error("获取数据失败，请稍后重试");
                });
        },

        // 搜索条件重置
        handleReset() {
            this.filterForm = {
                tradeName: '',
                tradeNo: '',
                tradeNamePerson: '',
                status: '',
                startTime: '',
                endTime: '',
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },

        // 格式化数字
        formatNumber(num) {
            return parseFloat(num || 0).toFixed(2);
        },

        // 审核操作
        async handleReview(row) {
            const searchParam = {
                unionTransactionId: row.unionTransactionId
            };
            await getInfoBlance(searchParam).then((res) => {
                if (res.code == 200) {
                    this.currentReviewData = {
                        tradeNo: res.data.tradeNo, // 公会ID
                        unionName: res.data.tradeName,
                        amount: res.data.amount,
                        applyTime: res.data.createTime,
                        remainingAmount: res.data.availableBalance, // 计算剩余金额
                        unionTransactionId: res.data.unionTransactionId,
                        invoiceType: res.data.invoiceType || row.invoiceType,
                        actualAmount: res.data.actualAmount !== undefined ? res.data.actualAmount : row.actualAmount
                    };
                    this.showReviewDialog = true;
                    console.log('this.currentReviewData', this.currentReviewData);
                } else {
                    this.$message.error("获取余额失败，请稍后重试");
                }
            })
        },


        // 处理审核提交
        handleReviewSubmit(submitData) {
            console.log('审核提交数据:', submitData);
            this.fetchTableData()
            // 提示成功
            const actionText = submitData.action === 'approve' ? '审核通过' : '审核拒绝';
            this.$message.success(`${actionText}成功`);
        },

        // 打款操作
        handlePayment(row) {
            this.currentPaymentData = {
                unionId: row.tradeNo, // 公会ID
                unionName: row.tradeName,
                applyAmount: row.amount,
                applyTime: row.createTime,
                bankInfo: row.bank + ' ' + row.bankAccount, // 获取银行信息（这里需要根据实际数据调整）
                unionTransactionId: row.unionTransactionId, // 使用唯一标识符
                invoiceType: row.invoiceType,
                actualAmount: row.actualAmount,


                // remainingAmount: row.availableBalance, // 计算剩余金额
                // unionTransactionId: row.unionTransactionId,




                // unionName: row.tradeNo,
                // unionId: row.id,
                // applyAmount: row.amount,
                // bankInfo: this.getBankInfo(row), // 获取银行信息（这里需要根据实际数据调整）
                // applyTime: row.CreateTime
            };
            this.showPaymentDialog = true;
        },


        // 处理打款提交
        handlePaymentSubmit(submitData) {
            console.log('打款提交数据:', submitData);
            this.fetchTableData()
            // 提示成功
            this.$message.success('打款成功');
        },

        // 格式化当前时间
        formatCurrentTime() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        },

        /** * 预览头像* @param {Object} user 用户数据 */
        previewAvatar(user) {
            this.previewAvatarUrl = user;
            this.avatarDialogVisible = true;

        },

        /**
         * 关闭头像预览弹窗
         */
        handleAvatarDialogClose() {
            this.avatarDialogVisible = false;
            this.previewAvatarUrl = "";
        }
    }
}
</script>

<style scoped>
.container {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.list-card {
    border-radius: 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* 重要：防止整个卡片滚动 */
}

/* 固定顶部操作栏 */
.action-bar-fixed {
    margin-bottom: 20px;
    padding: 0 12px;
    /* 与表格内容对齐 */
    flex-shrink: 0;
    /* 防止被压缩 */
}

/* 表格滚动区域 */
.table-scroll-container {
    flex: 1;
    overflow-y: auto;
    margin-right: -12px;
}

/* 固定底部分页 */
.pagination-fixed {
    background: white;
    flex-shrink: 0;
    /* 防止被压缩 */
    position: sticky;
    bottom: 0;
    z-index: 10;
}

/* 移除之前的卡片内边距 */
::v-deep .el-card__body {
    padding: 24px 24px 0 24px;
    /* 上下内边距，左右为0 */
    height: 100%;
    display: flex;
    flex-direction: column;
}

/* 调整表格样式 */
::v-deep .el-table {
    min-height: 100px;
}

.action-bar {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

/* 金额样式 */
.amount-text {
    color: #e6a23c;
    font-weight: 600;
}

.actual-amount-cell {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.4;
}

.actual-amount-value {
    color: #303133;
    font-weight: 500;
}

.actual-amount-tax {
    margin-top: 4px;
    color: #909399;
    font-size: 12px;
}

/* 发票样式 */
.fapiao {
    width: 90px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.fapiao:hover {
    transform: scale(1.05);
}

.no-invoice {
    color: #c0c4cc;
}

/* 备注样式 */
.remark-text {
    width: 100%;
    text-align: left;
    font-size: 12px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    /* white-space: nowrap; */
    /* 添加以下样式确保居中 */
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.paymentProofUrl {
    width: 90px;
    height: 40px;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.3s ease;
    margin-top: 10px;
    object-fit: cover;
}

/* 操作按钮样式 */
.action-buttons {
    display: flex;
    justify-content: center;
    gap: 8px;
}

.no-action {
    color: #c0c4cc;
    font-size: 14px;
}

/* 表格行悬停效果 */
::v-deep .tableRowClassName:hover {
    background-color: #f5f7fa !important;
}
</style>
