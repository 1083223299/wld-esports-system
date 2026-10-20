<template>
    <div class="container">
        <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
            @search="handleSearch" @reset="handleReset" />

        <el-card class="list-card" shadow="never">
            <div class="table-scroll-container">
                <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }" height="100%">
                    <el-table-column prop="userId" label="用户ID" min-width="120" />
                    <el-table-column prop="userName" label="用户名称" min-width="120" show-overflow-tooltip />
                    <el-table-column prop="userPhone" label="手机号" min-width="130" show-overflow-tooltip />
                    <el-table-column label="扣减类型" min-width="110">
                        <template slot-scope="{ row }">
                            {{ getTypeText(row.type) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="未来币金额" min-width="110">
                        <template slot-scope="{ row }">
                            <span class="amount-text">{{ formatSignedAmount(row.amount) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="reason" label="原因" min-width="150" show-overflow-tooltip />
                    <el-table-column label="扣除凭证" min-width="180">
                        <template slot-scope="{ row }">
                            <div v-if="row.ossUrls.length" class="voucher-list">
                                <div v-for="(img, index) in row.ossUrls.slice(0, 5)" :key="`${row.id}-${index}`"
                                    class="voucher-item" @click="previewVoucher(row.ossUrls, index)">
                                    <img :src="img" alt="" />
                                </div>
                            </div>
                            <span v-else>-</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="orderId" label="关联订单号" min-width="200" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            <span v-if="row.orderId" class="order-text order-link" @click="goOrderFlow(row.orderId)">
                                {{ row.orderId }}
                            </span>
                            <span v-else>-</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="createTime" label="提交时间" min-width="160">
                        <template slot-scope="{ row }">
                            {{ row.createTime || "-" }}
                        </template>
                    </el-table-column>
                    <el-table-column label="状态" min-width="100">
                        <template slot-scope="{ row }">
                            <span :class="['status-tag', `is-${getStatusTheme(row.status)}`]">
                                {{ getStatusText(row.status) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="auditRemark" label="原因" min-width="140" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            <span v-if="row.status === 2" class="reject-text">{{ row.auditRemark || "-" }}</span>
                            <span v-else>{{ row.auditRemark || "-" }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" fixed="right" min-width="110">
                        <template slot-scope="{ row }">
                            <div class="action-buttons">
                                <template v-if="row.status === 0">
                                    <el-button type="text" size="mini" class="approve-btn"
                                        @click="handleTodoAction('通过', row)"
                                        v-permission="'system:DeductionApproval:audit'">通过</el-button>
                                    <el-button type="text" size="mini" class="reject-btn"
                                        @click="handleTodoAction('驳回', row)"
                                        v-permission="'system:DeductionApproval:audit'">驳回</el-button>
                                </template>
                                <span v-else>-</span>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <div class="pagination-fixed">
                <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize"
                    :total="pagination.total" :show-batch-actions="false" @current-change="handleCurrentChange" />
            </div>
        </el-card>

        <ImgZoom v-model="voucherPreviewVisible" :img-list="voucherPreviewList" :initial-index="voucherPreviewIndex" />

        <el-dialog :visible.sync="rejectDialogVisible" width="520px" custom-class="reject-dialog" append-to-body
            :close-on-click-modal="false" @close="resetRejectForm">
            <div class="reject-dialog__header">
                <div class="reject-dialog__header-icon">驳</div>
                <div class="reject-dialog__header-main">
                    <div class="reject-dialog__title">驳回申请</div>
                    <div class="reject-dialog__desc">请填写驳回原因，提交后将更新当前审核状态。</div>
                </div>
            </div>

            <el-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" label-width="88px"
                class="reject-dialog__form">
                <el-form-item label="驳回原因" prop="auditRemark">
                    <el-input v-model="rejectForm.auditRemark" type="textarea" :rows="5" maxlength="50" show-word-limit
                        placeholder="请输入驳回原因" />
                </el-form-item>
            </el-form>

            <div slot="footer" class="reject-dialog__footer">
                <el-button @click="rejectDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="auditSubmitting" @click="submitReject">提交</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import { listAccountApproval, editAccountApproval } from "@/api/personalSupport";

const DEFAULT_PAGE_SIZE = 10;
const createDefaultFilterForm = () => ({
    userId: "",
    userName: "",
    phone: "",
    type: "",
    status: "",
    createTime: []
});

/**
 * 账户审核列表页
 * 仅处理列表查询、筛选、分页与凭证预览逻辑
 */
export default {
    name: "DeductionApproval",
    components: {
        SearchForm,
        PaginationSimple,
        ImgZoom
    },
    data() {
        return {
            searchItems: [
                {
                    prop: "userId",
                    label: "用户ID",
                    type: "input",
                    inputType: "integer",
                    placeholder: "请输入用户ID",
                    clearable: true
                },
                {
                    prop: "userName",
                    label: "用户名称",
                    type: "input",
                    placeholder: "请输入用户名称",
                    clearable: true
                },
                {
                    prop: "phone",
                    label: "用户手机号",
                    type: "input",
                    placeholder: "请输入用户手机号",
                    clearable: true
                },
                {
                    prop: "type",
                    label: "扣减类型",
                    type: "select",
                    placeholder: "请选择扣减类型",
                    clearable: true,
                    options: [
                        { label: "我的余额", value: 0 },
                        { label: "可用余额（可提现）", value: 1 }
                    ]
                },
                {
                    prop: "status",
                    label: "状态",
                    type: "select",
                    placeholder: "请选择状态",
                    clearable: true,
                    options: [
                        { label: "待审核", value: 0 },
                        { label: "通过", value: 1 },
                        { label: "驳回", value: 2 }
                    ]
                },
                {
                    prop: "createTime",
                    label: "提交时间",
                    type: "daterange",
                    valueFormat: "yyyy-MM-dd HH:mm:ss",
                    startPlaceholder: "开始时间",
                    endPlaceholder: "结束时间",
                    clearable: true
                }
            ],
            filterForm: createDefaultFilterForm(),
            pagination: {
                pageNum: 1,
                pageSize: DEFAULT_PAGE_SIZE,
                total: 0
            },
            tableData: [],
            loading: false,
            voucherPreviewVisible: false,
            voucherPreviewList: [],
            voucherPreviewIndex: 0,
            auditSubmitting: false,
            rejectDialogVisible: false,
            rejectForm: {
                id: "",
                auditRemark: ""
            },
            rejectRules: {
                auditRemark: [
                    { required: true, message: "请输入驳回原因", trigger: "blur" },
                    { max: 50, message: "驳回原因不能超过50字", trigger: "blur" }
                ]
            }
        };
    },
    created() {
        this.fetchTableData();
    },
    methods: {
        createDefaultFilterForm() {
            return createDefaultFilterForm();
        },
        /**
         * 构建列表请求参数，过滤无效值
         * @returns {Object}
         */
        buildQueryParams() {
            const params = {
                pageSize: this.pagination.pageSize > 0 ? this.pagination.pageSize : DEFAULT_PAGE_SIZE,
                pageNum: this.pagination.pageNum > 0 ? this.pagination.pageNum : 1,
                userId: this.normalizeInteger(this.filterForm.userId),
                userName: this.normalizeText(this.filterForm.userName),
                phone: this.normalizeText(this.filterForm.phone),
                type: this.normalizeEnum(this.filterForm.type, [0, 1]),
                status: this.normalizeEnum(this.filterForm.status, [0, 1, 2]),
                createStartTime: this.getDateRangeValue(this.filterForm.createTime, 0),
                createEndTime: this.getDateRangeValue(this.filterForm.createTime, 1)
            };

            return Object.keys(params).reduce((result, key) => {
                const value = params[key];
                if (this.isValidParamValue(value)) {
                    result[key] = value;
                }
                return result;
            }, {});
        },
        async fetchTableData() {
            if (this.loading) {
                return;
            }
            this.loading = true;
            try {
                const res = await listAccountApproval(this.buildQueryParams());
                if (!res || Number(res.code) !== 200) {
                    const message = [res && res.errorCode, res && res.errorMessage].filter(Boolean).join("：") || "获取账户审核列表失败";
                    this.$message.error(message);
                    this.tableData = [];
                    this.pagination.total = 0;
                    return;
                }

                const data = res.data || {};
                const rows = Array.isArray(data.rows) ? data.rows : [];
                this.tableData = rows.map(item => this.normalizeTableRow(item));
                this.pagination.total = Number(data.total || 0);
            } catch (error) {
                console.error("获取账户审核列表失败:", error);
                this.$message.error(error && error.message ? error.message : "获取账户审核列表失败，请稍后重试");
                this.tableData = [];
                this.pagination.total = 0;
            } finally {
                this.loading = false;
            }
        },
        /**
         * 统一处理列表数据，避免表格渲染 undefined
         * @param {Object} item
         * @returns {Object}
         */
        normalizeTableRow(item = {}) {
            return {
                id: item.id || "",
                userId: item.userId || "",
                userName: item.userName || "-",
                userPhone: item.userPhone || "-",
                type: this.normalizeEnum(item.type, [0, 1]),
                amount: item.amount === null || item.amount === undefined ? 0 : item.amount,
                reason: item.reason || "-",
                orderId: item.orderId || "",
                status: this.normalizeEnum(item.status, [0, 1, 2]),
                auditRemark: item.auditRemark || "-",
                ossIds: Array.isArray(item.ossIds) ? item.ossIds : [],
                ossUrls: Array.isArray(item.ossUrls) ? item.ossUrls.filter(Boolean) : [],
                createTime: item.createTime || item.submitTime || "-",
                updateTime: item.updateTime || item.auditTime || "-"
            };
        },
        handleSearch(formValues) {
            this.filterForm = {
                ...this.createDefaultFilterForm(),
                ...formValues
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleReset() {
            this.filterForm = this.createDefaultFilterForm();
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleCurrentChange(page) {
            this.pagination.pageNum = page;
            this.fetchTableData();
        },
        goOrderFlow(orderId) {
            if (!orderId) return;
            this.$router.push({
                path: "/financialManagement/orderFlow",
                query: { orderId }
            });
        },
        previewVoucher(list, index = 0) {
            if (!Array.isArray(list) || !list.length) {
                return;
            }
            this.voucherPreviewList = list;
            this.voucherPreviewIndex = index;
            this.voucherPreviewVisible = true;
        },
        handleTodoAction(action, row) {
            if (action === "通过") {
                this.handleApprove(row);
                return;
            }
            this.openRejectDialog(row);
        },
        async handleApprove(row) {
            if (this.auditSubmitting) {
                return;
            }
            try {
                await this.$confirm("通过即进行扣除，确认通过该申请吗？", "通过确认", {
                    confirmButtonText: "确认通过",
                    cancelButtonText: "取消",
                    type: "warning"
                });
                await this.submitAudit({
                    id: row.id,
                    status: 1
                }, "通过成功");
            } catch (error) {
                if (error !== "cancel" && error !== "close") {
                    console.error("通过审核失败:", error);
                }
            }
        },
        openRejectDialog(row) {
            this.rejectForm = {
                id: row.id,
                auditRemark: ""
            };
            this.rejectDialogVisible = true;
            this.$nextTick(() => {
                if (this.$refs.rejectFormRef) {
                    this.$refs.rejectFormRef.clearValidate();
                }
            });
        },
        submitReject() {
            if (!this.$refs.rejectFormRef || this.auditSubmitting) {
                return;
            }
            this.$refs.rejectFormRef.validate(async valid => {
                if (!valid) {
                    return;
                }
                await this.submitAudit({
                    id: this.rejectForm.id,
                    status: 2,
                    auditRemark: this.normalizeText(this.rejectForm.auditRemark)
                }, "驳回成功");
                this.rejectDialogVisible = false;
            });
        },
        async submitAudit(payload, successMessage) {
            this.auditSubmitting = true;
            try {
                const requestPayload = Object.keys(payload).reduce((result, key) => {
                    const value = payload[key];
                    if (value !== undefined && value !== null && value !== "") {
                        result[key] = value;
                    }
                    return result;
                }, {});
                const res = await editAccountApproval(requestPayload);
                if (!res || Number(res.code) !== 200) {
                    const message = [res && res.errorCode, res && res.errorMessage].filter(Boolean).join("：") || "审核操作失败";
                    this.$message.error(message);
                    return;
                }
                this.$message.success(successMessage);
                this.fetchTableData();
            } catch (error) {
                console.error("审核操作失败:", error);
                this.$message.error(error && error.message ? error.message : "审核操作失败，请稍后重试");
            } finally {
                this.auditSubmitting = false;
            }
        },
        resetRejectForm() {
            this.rejectForm = {
                id: "",
                auditRemark: ""
            };
            if (this.$refs.rejectFormRef) {
                this.$refs.rejectFormRef.resetFields();
            }
        },
        isValidParamValue(value) {
            if (value === undefined || value === null || value === "") {
                return false;
            }
            if (Array.isArray(value) && value.length === 0) {
                return false;
            }
            return true;
        },
        normalizeText(value) {
            return String(value || "").trim();
        },
        normalizeInteger(value) {
            const text = String(value || "").trim();
            return /^\d+$/.test(text) ? text : "";
        },
        normalizeEnum(value, validValues) {
            if (value === "" || value === null || value === undefined) {
                return "";
            }
            const normalizedValue = Number(value);
            return validValues.includes(normalizedValue) ? normalizedValue : "";
        },
        getDateRangeValue(range, index) {
            return Array.isArray(range) && range.length === 2 ? range[index] : "";
        },
        getTypeText(type) {
            const map = {
                0: "我的余额",
                1: "可用余额（可提现）"
            };
            return map[Number(type)] || "-";
        },
        getStatusText(status) {
            const map = {
                0: "待审核",
                1: "通过",
                2: "驳回"
            };
            return map[Number(status)] || "-";
        },
        getStatusTheme(status) {
            const map = {
                0: "pending",
                1: "success",
                2: "reject"
            };
            return map[Number(status)] || "default";
        },
        formatSignedAmount(value) {
            const amount = Number(value || 0);
            if (!Number.isFinite(amount)) {
                return "-0.00";
            }
            return amount > 0 ? `-${amount.toFixed(2)}` : amount.toFixed(2);
        }
    }
};
</script>

<style scoped>
.container {
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.list-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}

::v-deep .list-card .el-card__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.table-scroll-container {
    flex: 1;
    min-height: 0;
    overflow: auto;
}

.pagination-fixed {
    flex-shrink: 0;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: flex-end;
}

.amount-text {
    color: #f56c6c;
    font-weight: 700;
}

.reject-text {
    color: #f56c6c;
}

.order-text {
    color: #2b78ff;
    font-weight: 600;
}

.order-link {
    cursor: pointer;
}

.order-link:hover {
    color: #165dff;
    text-decoration: underline;
}

.voucher-list {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
}

.voucher-item {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e7ebf2;
    background: #f7f9ff;
    cursor: pointer;
}

.voucher-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.status-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 72px;
    height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
}

.status-tag.is-pending {
    background: rgba(255, 173, 51, 0.12);
    color: #ff9f1a;
}

.status-tag.is-success {
    background: rgba(52, 199, 89, 0.12);
    color: #20a053;
}

.status-tag.is-reject {
    background: rgba(245, 108, 108, 0.12);
    color: #f56c6c;
}

.status-tag.is-default {
    background: rgba(123, 132, 150, 0.12);
    color: #7b8496;
}

.action-buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.approve-btn {
    color: #409eff;
    font-weight: 600;
}

.reject-btn {
    color: #f56c6c;
}

.reject-dialog__header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    padding: 18px 20px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(245, 108, 108, 0.14) 0%, rgba(255, 148, 114, 0.12) 100%);
}

.reject-dialog__header-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(135deg, #f56c6c 0%, #ff8a65 100%);
    box-shadow: 0 10px 22px rgba(245, 108, 108, 0.24);
}

.reject-dialog__header-main {
    flex: 1;
}

.reject-dialog__title {
    font-size: 20px;
    font-weight: 700;
    color: #1f2533;
    line-height: 1.2;
}

.reject-dialog__desc {
    margin-top: 6px;
    font-size: 13px;
    color: #7b8496;
    line-height: 1.6;
}

.reject-dialog__form {
    padding: 4px 4px 0;
}

.reject-dialog__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 18px;
    border-top: 1px solid #eef1f6;
}

::v-deep .reject-dialog {
    border-radius: 18px;
    overflow: hidden;
}

::v-deep .reject-dialog .el-dialog__body {
    padding: 22px 24px 16px;
}

::v-deep .reject-dialog .el-dialog__footer {
    padding: 0 24px 22px;
}

::v-deep .reject-dialog .el-textarea__inner {
    border-radius: 14px;
    min-height: 136px !important;
}
</style>
