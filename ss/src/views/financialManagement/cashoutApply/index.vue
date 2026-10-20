<template>
    <div class="container">
        <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
            @search="handleSearch" @reset="handleReset">
        </SearchForm>
        <!-- 列表区域 -->
        <el-card class="list-card" shadow="never">
            <!-- 固定顶部：操作按钮区域 -->
            <div class="action-bar-fixed">
                <el-button v-permission="'system:cashoutApply:apply'" type="primary" class="add-btn"
                    :loading="withdrawCheckLoading" @click="handleAdd">
                    申请提现
                </el-button>
            </div>
            <!-- 表格滚动区域 -->
            <div class="table-scroll-container">
                <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }" height="100%" row-class-name="tableRowClassName"
                    ref="table">
                    <el-table-column prop="amount" label="申请金额" />
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
                    <el-table-column prop="status" label="状态">
                        <template slot-scope="scope">
                            <el-tag type="warning" effect="plain" size="mini" v-if="scope.row.status == 0">待审核</el-tag>
                            <el-tag type="danger" effect="plain" size="mini" v-if="scope.row.status == 1">已拒绝</el-tag>
                            <el-tag type="" effect="plain" size="mini" v-if="scope.row.status == 2">待打款</el-tag>
                            <el-tag type="success" effect="plain" size="mini" v-if="scope.row.status == 3">已打款</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="userId" label="发票">
                        <template slot-scope="scope">
                            <img v-if="scope.row.invoiceUrl" :src="scope.row.invoiceUrl" class="fapiao"
                                @click="previewAvatar(scope.row.invoiceUrl)" />
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
        <!-- 申请提现弹窗 -->
        <WithdrawApplyDialog :visible.sync="showWithdrawDialog" :union-info="currentUnion"
            :last-bank-info="lastBankInfo" @submit-success="handleFormSubmit" />
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
import AvatarPreviewDialog from "@/components/AvatarPreviewDialog/index.vue"; // 头像预览弹窗
import WithdrawApplyDialog from './components/ApplyDialog.vue'


import { getApplicationList, getInfoUnion, checkUnionWithdraw } from "@/api/cashout"
export default {
    name: 'cashoutApply',
    components: {
        SearchForm,// 搜索表单组件
        PaginationSimple,// 分页组件
        AvatarPreviewDialog,
        WithdrawApplyDialog
    },

    data() {
        return {
            // 搜索表单配置项
            searchItems: [
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
                    type: "select",
                    prop: "invoiceType",
                    label: "发票类型",
                    placeholder: "全部",
                    options: [
                        { label: "全部", value: "" },
                        { label: "自备发票", value: "1" },
                        { label: "平台代开", value: "2" },
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
                invoiceType: '',
                startTime: '',
                endTime: '',
            },
            // 分页相关
            pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
            // 表格数据
            tableData: [],
            loading: false,

            previewAvatarUrl: "",       // 预览头像URL
            avatarDialogVisible: false, // 头像预览弹窗显示状态

            showWithdrawDialog: false,
            withdrawCheckLoading: false,
            currentUnion: {
                tradeName: '董瑞游戏公会',
                tradeNo: 'UNION2024001',
                availableAmount: 50000,
            },
            lastBankInfo: {
                bank: '',
                bankAccount: ''
            }
        }
    },
    created() {
        // 获取提现申请列表
        this.fetchTableData()
        // 获取公会详情信息
        this.getInfoUnionAsync()
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
            this.fetchTableData();       // 重新获取数据
        },
        // 分页
        handleCurrentChange(val) {
            this.pagination.pageNum = val;
            this.fetchTableData(); // 重新获取数据
        },
        // 获取提现申请列表
        async fetchTableData() {
            this.loading = true;
            const searchParam = {
                ...this.filterForm, pageSize: this.pagination.pageSize, pageNum: this.pagination.pageNum
            };
            Object.keys(searchParam).forEach((key) =>
                searchParam[key] === undefined || searchParam[key] === ""
                    ? delete searchParam[key]
                    : ""
            );
            await getApplicationList(searchParam)
                .then((res) => {
                    if (res.code == 200) {
                        this.pagination.total = res.data.total; // 设置总记录数
                        this.tableData = res.data.rows
                        this.loading = false; // 关闭加载状态
                    }
                }).catch((error) => {
                    console.error("获取提现申请列表失败:", error);
                    this.tableData = [];
                    this.pagination.total = 0;
                    this.loading = false; // 关闭加载状态
                    this.$message.error("获取数据失败，请稍后重试");
                });
        },
        // 获取公会详情信息
        async getInfoUnionAsync() {
            await getInfoUnion()
                .then((res) => {
                    if (res.code == 200) {
                        this.currentUnion = {
                            tradeName: res.data.tradeName,
                            tradeNo: res.data.tradeNo,
                            availableAmount: res.data.amount
                        }
                        console.log('公会详情信息', res);
                    }
                }).catch((error) => {
                    console.error("获取公会信息失败:", error);
                    this.$message.error("获取公会信息失败");
                });
        },
        // 搜索条件重置
        handleReset() {
            this.filterForm = {
                tradeName: '',
                tradeNo: '',
                tradeNamePerson: '',
                status: '',
                invoiceType: '',
                startTime: '',
                endTime: '',
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },

        // 申请提现：先校验，通过后再弹窗
        async handleAdd() {
            if (this.withdrawCheckLoading) return;
            this.withdrawCheckLoading = true;
            try {
                const tradeId = (this.$store.getters.userData || {}).tradeId;
                if (!tradeId) {
                    this.$message.error('未获取到公会ID，无法申请提现');
                    return;
                }

                const res = await checkUnionWithdraw(tradeId);
                const checkData = (res && res.data) || {};
                if (checkData.flag === true) {
                    await this.getInfoUnionAsync();
                    this.showWithdrawDialog = true;
                } else {
                    this.$message.error(checkData.msg || '提现检查不通过，暂不可申请提现');
                }
            } catch (error) {
                console.error('提现前校验失败:', error);
            } finally {
                this.withdrawCheckLoading = false;
            }
        },
        // 提交方法
        async handleFormSubmit(submitData) {
            try {
                console.log('提现申请成功提交的数据:', submitData);

                // 关闭弹窗
                this.showWithdrawDialog = false;

                // 保存银行信息到本地缓存
                if (submitData.formData) {
                    const bankInfo = {
                        bank: submitData.formData.bank,
                        bankAccount: submitData.formData.bankAccount,
                        saveTime: new Date().getTime()
                    };

                    try {
                        localStorage.setItem(`withdraw_bank_info_${this.currentUnion.tradeNo}`,
                            JSON.stringify(bankInfo));
                    } catch (e) {
                        console.warn('本地存储失败:', e);
                    }
                }

                // 显示成功提示
                this.$message.success('提现申请已提交，请等待审核');

                // 延迟500ms后刷新列表，给用户更好的体验
                setTimeout(() => {
                    this.fetchTableData();
                }, 500);

            } catch (error) {
                console.error('处理提现申请结果失败:', error);
                this.$message.error('处理提交结果失败');
            }
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
        },

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

.add-btn {
    background: #6A35FF;
    padding-left: 55px;
    padding-right: 57px;
    border-radius: 8px;
    border: none;
}

.unionLogo {
    width: 46px;
    height: 46px;
    border-radius: 8px;
}

.SpeciaTypes {
    display: flex;
    align-items: center;
    justify-content: center;
}

.ProfitSharingRatio {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.SpeciaTypes_name {
    color: #101010;
    margin-right: 10px;
}

.phone-display {
    display: flex;
    align-items: center;
    justify-content: center;
}

.phone-toggle {
    width: 16px;
    height: 16px;
    margin-left: 13px;
}

.pagination-container {
    flex-direction: column;
    align-items: stretch;
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

.fapiao {
    width: 90px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.3s ease;
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
</style>
