<template>
    <div class="deduction-config-wrapper">
        <div ref="responsiveModule">
            <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
                @search="handleSearch" @reset="handleReset">
            </SearchForm>
        </div>

        <el-card class="list-card" shadow="never">
            <div class="action-bar">
                <el-button type="primary" icon="el-icon-plus" @click="handleAdd">
                    新增
                </el-button>
            </div>

            <div class="table-wrapper">
                <el-table :data="tableData" stripe v-loading="loading" :border="false"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }">
                    <el-table-column label="扣减原因" min-width="160" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            {{ row.reasonName || "-" }}
                        </template>
                    </el-table-column>

                    <el-table-column label="个人扣减金额" min-width="130">
                        <template slot-scope="{ row }">
                            <span class="amount-text">{{ formatAmount(row.personalAmount) }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column label="俱乐部扣减金额" min-width="130">
                        <template slot-scope="{ row }">
                            <span class="amount-text">{{ formatAmount(row.clubAmount) }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column prop="reasonDesc" label="备注" min-width="160" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            {{ row.reasonDesc || "-" }}
                        </template>
                    </el-table-column>

                    <el-table-column label="最后变动时间" min-width="170">
                        <template slot-scope="{ row }">
                            {{ row.updateTime || row.createTime || "-" }}
                        </template>
                    </el-table-column>

                    <el-table-column label="操作" width="120" fixed="right">
                        <template slot-scope="{ row }">
                            <div class="action-buttons">
                                <el-button type="text" style="color: #409EFF" @click="handleEdit(row)">
                                    编辑
                                </el-button>
                                <el-button type="text" style="color: #F56C6C" @click="handleDelete(row)">
                                    删除
                                </el-button>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <div class="pagination-fixed">
                <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize"
                    :total="pagination.total" @current-change="handleCurrentChange">
                </PaginationSimple>
            </div>
        </el-card>

        <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="620px" :close-on-click-modal="false"
            @close="handleDialogClose">
            <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px"
                v-loading="detailLoading" :validate-on-rule-change="false">
                <el-form-item label="扣减原因" prop="reasonName">
                    <el-input v-model.trim="formData.reasonName" placeholder="请输入扣减原因" maxlength="50"
                        show-word-limit />
                </el-form-item>

                <el-form-item label="个人扣减金额" prop="personalAmount">
                    <div class="amount-field">
                        <el-input-number v-model="formData.personalAmount" :min="0" :precision="2" :step="1"
                            controls-position="right" class="full-width-number" />
                        <span class="amount-field__unit">元</span>
                    </div>
                </el-form-item>

                <el-form-item label="俱乐部扣减金额" prop="clubAmount">
                    <div class="amount-field">
                        <el-input-number v-model="formData.clubAmount" :min="0" :precision="2" :step="1"
                            controls-position="right" class="full-width-number" />
                        <span class="amount-field__unit">元</span>
                    </div>
                </el-form-item>

                <el-form-item label="备注" prop="reasonDesc">
                    <el-input v-model="formData.reasonDesc" type="textarea" :rows="4" placeholder="请输入备注"
                        maxlength="50" show-word-limit />
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="submitLoading" @click="handleSubmit">提交</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import {
    getDepositDeductReasonList,
    getDepositDeductReasonDetail,
    addDepositDeductReason,
    editDepositDeductReason,
    deleteDepositDeductReason
} from "@/api/deductionConfig";

/** 文档约定：status 1正常 0停用；不传默认正常 */
const EMPTY_FORM = {
    id: "",
    reasonName: "",
    personalAmount: undefined,
    clubAmount: undefined,
    reasonDesc: "",
    sortNo: 0,
    status: "1"
};

export default {
    name: "DeductionConfig",
    components: { SearchForm, PaginationSimple },
    data() {
        const validateAmount = (rule, value, callback) => {
            if (value === null || value === undefined || value === "") {
                callback(new Error(rule.message || "请输入金额"));
                return;
            }
            if (Number(value) < 0) {
                callback(new Error("金额不能小于0"));
                return;
            }
            callback();
        };
        const validateReasonDesc = (rule, value, callback) => {
            const text = String(value || "").trim();
            if (!text) {
                callback(new Error("请输入备注"));
                return;
            }
            if (text.length > 50) {
                callback(new Error("备注最多50个字"));
                return;
            }
            callback();
        };

        return {
            searchItems: [
                {
                    type: "input",
                    prop: "reasonName",
                    label: "扣减原因",
                    placeholder: "请输入",
                    clearable: true
                }
            ],
            filterForm: {
                reasonName: ""
            },
            allTableData: [],
            tableData: [],
            loading: false,
            pagination: {
                pageNum: 1,
                pageSize: 10,
                total: 0
            },
            dialogVisible: false,
            dialogMode: "add",
            submitLoading: false,
            detailLoading: false,
            formData: { ...EMPTY_FORM },
            formRules: {
                reasonName: [{ required: true, message: "请输入扣减原因", trigger: "blur" }],
                personalAmount: [
                    { required: true, message: "请输入个人扣减金额", trigger: "change" },
                    { validator: validateAmount, trigger: "change", message: "请输入个人扣减金额" }
                ],
                clubAmount: [
                    { required: true, message: "请输入俱乐部扣减金额", trigger: "change" },
                    { validator: validateAmount, trigger: "change", message: "请输入俱乐部扣减金额" }
                ],
                reasonDesc: [{ required: true, validator: validateReasonDesc, trigger: "blur" }]
            }
        };
    },
    computed: {
        dialogTitle() {
            return this.dialogMode === "edit" ? "编辑" : "新增";
        }
    },
    mounted() {
        this.fetchTableData();
    },
    methods: {
        formatAmount(value) {
            if (value === 0 || value === "0") return "0元";
            return value || value === 0 ? `${value}元` : "-";
        },
        buildQueryParams() {
            const params = {};
            if (this.filterForm.reasonName) {
                params.reasonName = this.filterForm.reasonName;
            }
            return params;
        },
        normalizeListRows(data) {
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.rows)) return data.rows;
            if (Array.isArray(data?.list)) return data.list;
            if (Array.isArray(data?.data)) return data.data;
            return [];
        },
        applyPageSlice() {
            const { pageNum, pageSize } = this.pagination;
            const start = (pageNum - 1) * pageSize;
            this.tableData = this.allTableData.slice(start, start + pageSize);
        },
        normalizeDetailData(data) {
            if (!data) return { ...EMPTY_FORM };
            return {
                id: data.id || "",
                reasonName: data.reasonName || "",
                personalAmount: data.personalAmount || data.personalAmount === 0 ? Number(data.personalAmount) : undefined,
                clubAmount: data.clubAmount || data.clubAmount === 0 ? Number(data.clubAmount) : undefined,
                reasonDesc: data.reasonDesc || "",
                sortNo: data.sortNo || data.sortNo === 0 ? Number(data.sortNo) : 0,
                // 文档：1正常 0停用；缺省按正常
                status: data.status === 0 || data.status === "0" ? "0" : String(data.status || "1")
            };
        },
        async fetchTableData() {
            this.loading = true;
            try {
                const res = await getDepositDeductReasonList(this.buildQueryParams());
                if (res.success) {
                    const rows = this.normalizeListRows(res.data);
                    this.allTableData = rows;
                    this.pagination.total = rows.length;
                    const maxPage = Math.max(1, Math.ceil(rows.length / this.pagination.pageSize) || 1);
                    if (this.pagination.pageNum > maxPage) {
                        this.pagination.pageNum = maxPage;
                    }
                    this.applyPageSlice();
                } else {
                    this.allTableData = [];
                    this.tableData = [];
                    this.pagination.total = 0;
                    this.$message.error(res.errorMessage || "获取保证金扣减配置失败");
                }
            } catch (error) {
                this.allTableData = [];
                this.tableData = [];
                this.pagination.total = 0;
                this.$message.error("获取保证金扣减配置失败");
            } finally {
                this.loading = false;
            }
        },
        handleSearch(formData) {
            this.filterForm = {
                reasonName: formData?.reasonName || ""
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleReset() {
            this.filterForm = {
                reasonName: ""
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleCurrentChange(pageNum) {
            this.pagination.pageNum = pageNum;
            this.applyPageSlice();
        },
        resetFormData() {
            this.formData = { ...EMPTY_FORM };
        },
        handleAdd() {
            this.dialogMode = "add";
            this.resetFormData();
            this.dialogVisible = true;
            this.$nextTick(() => {
                if (this.$refs.formRef) this.$refs.formRef.clearValidate();
            });
        },
        async handleEdit(row) {
            this.dialogMode = "edit";
            this.resetFormData();
            this.dialogVisible = true;
            this.detailLoading = true;
            this.$nextTick(() => {
                if (this.$refs.formRef) this.$refs.formRef.clearValidate();
            });
            try {
                const res = await getDepositDeductReasonDetail({ id: row.id });
                if (res.success) {
                    this.formData = this.normalizeDetailData(res.data);
                } else {
                    this.$message.error(res.errorMessage || "获取详情失败");
                    this.dialogVisible = false;
                }
            } catch (error) {
                this.$message.error("获取详情失败");
                this.dialogVisible = false;
            } finally {
                this.detailLoading = false;
            }
        },
        handleDialogClose() {
            this.resetFormData();
            this.submitLoading = false;
            this.detailLoading = false;
            this.$nextTick(() => {
                if (this.$refs.formRef) this.$refs.formRef.clearValidate();
            });
        },
        buildSubmitPayload() {
            const payload = {
                reasonName: String(this.formData.reasonName || "").trim(),
                personalAmount: this.formData.personalAmount,
                clubAmount: this.formData.clubAmount,
                reasonDesc: String(this.formData.reasonDesc || "").trim(),
                sortNo: this.formData.sortNo,
                status: this.formData.status || "1"
            };
            if (this.dialogMode === "edit") {
                payload.id = this.formData.id;
            }
            return payload;
        },
        handleSubmit() {
            this.$refs.formRef.validate(async valid => {
                if (!valid) return;
                this.submitLoading = true;
                try {
                    const api = this.dialogMode === "edit" ? editDepositDeductReason : addDepositDeductReason;
                    const res = await api(this.buildSubmitPayload());
                    if (res.success) {
                        this.$message.success(this.dialogMode === "edit" ? "编辑成功" : "新增成功");
                        this.dialogVisible = false;
                        this.fetchTableData();
                    } else {
                        this.$message.error(res.errorMessage || (this.dialogMode === "edit" ? "编辑失败" : "新增失败"));
                    }
                } catch (error) {
                    this.$message.error(this.dialogMode === "edit" ? "编辑失败" : "新增失败");
                } finally {
                    this.submitLoading = false;
                }
            });
        },
        handleDelete(row) {
            this.$confirm(`确定要删除“${row.reasonName || "该扣减原因"}”吗？`, "提示", {
                confirmButtonText: "确定",
                cancelButtonText: "取消",
                type: "warning"
            }).then(async () => {
                try {
                    const res = await deleteDepositDeductReason({ id: row.id });
                    if (res.success) {
                        this.$message.success("删除成功");
                        if (this.tableData.length === 1 && this.pagination.pageNum > 1) {
                            this.pagination.pageNum -= 1;
                        }
                        this.fetchTableData();
                    } else {
                        this.$message.error(res.errorMessage || "删除失败");
                    }
                } catch (error) {
                    this.$message.error("删除失败");
                }
            }).catch(() => { });
        }
    }
};
</script>

<style scoped lang="scss">
.deduction-config-wrapper {
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
    overflow: hidden;
    min-height: 0;
    border-radius: 24px;
}

.action-bar {
    flex-shrink: 0;
    margin-bottom: 20px;
}

::v-deep .el-card__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px 20px 0;
}

.table-wrapper {
    flex: 1;
    overflow-y: auto !important;
    min-height: 0;
    position: relative;
}

.pagination-fixed {
    flex-shrink: 0;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: flex-end;
}

.amount-text {
    color: #303133;
    font-weight: 600;
}

.action-buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.amount-field {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 8px;
}

.amount-field__unit {
    flex-shrink: 0;
    color: #606266;
    font-size: 14px;
}

.full-width-number {
    flex: 1;
    width: 100%;
}

::v-deep .full-width-number .el-input-number__decrease,
::v-deep .full-width-number .el-input-number__increase {
    z-index: 1;
}
</style>
