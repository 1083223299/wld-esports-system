<template>
    <div class="container">
        <!-- 筛选查询区 -->
        <div ref="responsiveModule">
            <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
                @search="handleSearch" @reset="handleReset" />
        </div>

        <!-- 列表卡片 -->
        <el-card class="list-card" shadow="never">
            <!-- 操作按钮栏 -->
            <div class="action-bar-fixed">
                <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
                    v-permission="'system:innerPhone:add'">
                    新增手机号
                </el-button>
            </div>

            <!-- 表格区域 -->
            <div class="table-wrapper">
                <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" @selection-change="handleSelectionChange"
                    :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }">
                    <el-table-column prop="phone" label="手机号">
                        <template slot-scope="scope">
                            <PhoneDisplay :value="scope.row.phone" />
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" fixed="right" width="160">
                        <template slot-scope="scope">
                            <div class="action-buttons">
                                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c"
                                    v-permission="'system:innerPhone:remove'">
                                    删除
                                </el-button>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <!-- 分页组件 -->
            <div class="pagination-fixed">
                <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize"
                    :total="pagination.total" @current-change="handleCurrentChange" />
            </div>
        </el-card>

        <!-- 新增手机号弹窗 -->
        <el-dialog title="新增手机号" :visible.sync="drawerVisible" width="500px" :close-on-click-modal="false"
            :close-on-press-escape="false" @close="closeDrawer">
            <el-form ref="phoneForm" :model="formData" :rules="rules" label-width="100px">
                <el-form-item label="手机号" prop="phone">
                    <el-input v-model="formData.phone" placeholder="请输入手机号" maxlength="11" clearable />
                </el-form-item>
            </el-form>
            <span slot="footer">
                <el-button @click="closeDrawer">取消</el-button>
                <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import { InnerPhoneList, addInnerPhone, deleteInnerPhone } from "@/api/innerPhone";

export default {
    name: "InnerPhone",
    components: {
        SearchForm,
        PaginationSimple,
        PhoneDisplay,
    },
    data() {
        // 手机号验证规则
        const validatePhone = (rule, value, callback) => {
            if (!value) {
                callback(new Error("请输入手机号"));
            } else if (!/^1[3-9]\d{9}$/.test(value)) {
                callback(new Error("请输入正确的11位手机号码"));
            } else {
                callback();
            }
        };

        return {
            // 搜索表单配置
            searchItems: [
                {
                    type: "input",
                    prop: "phone",
                    label: "手机号",
                    placeholder: "请输入手机号",
                    clearable: true,
                },
            ],

            // 筛选表单数据
            filterForm: {
                phone: "",
            },

            // 分页参数
            pagination: { pageNum: 1, pageSize: 10, total: 0 },

            // 表格数据
            tableData: [],
            loading: false,

            // 弹窗控制
            drawerVisible: false,
            formData: { phone: "" },
            submitting: false,

            // 选中行
            selectedRows: [],
            single: true,
            multiple: true,

            // 表单验证规则
            rules: {
                phone: [
                    { required: true, message: "请输入手机号", trigger: "blur" },
                    { validator: validatePhone, trigger: "blur" }
                ],
            },
        };
    },
    created() {
        this.fetchTableData();
    },
    methods: {
        // 手机号脱敏
        maskPhone(phone) {
            if (!phone) return "";
            const phoneText = String(phone);
            if (phoneText.length < 7) return phoneText;
            return `${phoneText.slice(0, 3)}****${phoneText.slice(-4)}`;
        },

        // 切换手机号显示/隐藏
        togglePhoneVisible(row) {
            this.$set(row, "showFullPhone", !row.showFullPhone);
        },

        // 搜索
        handleSearch(e) {
            if (e) {
                this.filterForm.phone = e.phone || "";
                this.pagination.pageNum = 1;
                this.fetchTableData();
            }
        },

        // 重置
        handleReset() {
            this.filterForm = { phone: "" };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },

        // 分页切换
        handleCurrentChange(page) {
            this.pagination.pageNum = page;
            this.fetchTableData();
        },

        // 选中行变化
        handleSelectionChange(selection) {
            this.selectedRows = selection;
            this.single = selection.length !== 1;
            this.multiple = !selection.length;
        },

        // 获取列表数据
        async fetchTableData() {
            this.loading = true;
            try {
                let retried = false;
                while (true) {
                    const currentPage = this.pagination.pageNum;
                    const params = {
                        pageNum: currentPage,
                        pageSize: this.pagination.pageSize,
                        phone: this.filterForm.phone || undefined,
                    };

                    const res = await InnerPhoneList(params);
                    const rows = res.code === 200 && res.data && Array.isArray(res.data.rows)
                        ? res.data.rows
                        : [];
                    const total = res.code === 200 && res.data
                        ? Number(res.data.total) || 0
                        : 0;

                    this.tableData = rows.map((item) => ({
                        ...item,
                        showFullPhone: false,
                    }));
                    this.pagination.total = total;

                    const maxPage = Math.max(1, Math.ceil(total / this.pagination.pageSize));
                    const shouldRetryWithPreviousPage =
                        !retried &&
                        currentPage > 1 &&
                        (currentPage > maxPage || rows.length === 0);

                    if (shouldRetryWithPreviousPage) {
                        this.pagination.pageNum = Math.min(maxPage, currentPage - 1);
                        retried = true;
                        continue;
                    }
                    break;
                }
            } catch (error) {
                console.error("获取手机号列表失败:", error);
                this.$message.error("获取数据失败，请稍后重试");
                this.tableData = [];
                this.pagination.total = 0;
            } finally {
                this.loading = false;
            }
        },

        // 新增
        handleAdd() {
            this.formData = { phone: "" };
            this.drawerVisible = true;
            this.$nextTick(() => {
                if (this.$refs.phoneForm) {
                    this.$refs.phoneForm.clearValidate();
                }
            });
        },

        // 删除
        handleDelete(row) {
            let ids = [];
            if (row && row.id) {
                ids = [row.id];
            } else if (this.selectedRows.length > 0) {
                ids = this.selectedRows.map((item) => item.id);
            }

            if (ids.length === 0) {
                this.$message.warning("请选择要删除的数据");
                return;
            }

            const message = ids.length === 1 ? "确定要删除该手机号吗？" : `确定要删除选中的${ids.length}个手机号吗？`;

            this.$confirm(message, "提示", {
                confirmButtonText: "确定",
                cancelButtonText: "取消",
                type: "warning",
            })
                .then(async () => {
                    try {
                        // 批量删除
                        for (const id of ids) {
                            await deleteInnerPhone(id);
                        }
                        this.$message.success("删除成功");
                        await this.fetchTableData();
                    } catch (error) {
                        console.error("删除失败:", error);
                        this.$message.error("删除失败");
                    }
                })
                .catch(() => { });
        },

        // 关闭弹窗
        closeDrawer() {
            this.drawerVisible = false;
            this.formData = { phone: "" };
            this.submitting = false;
            this.$nextTick(() => {
                if (this.$refs.phoneForm) {
                    this.$refs.phoneForm.clearValidate();
                }
            });
        },

        // 提交新增
        async handleSubmit() {
            this.$refs.phoneForm.validate(async (valid) => {
                if (!valid) return;

                this.submitting = true;
                try {
                    const res = await addInnerPhone({ phone: this.formData.phone });
                    if (res.code === 200) {
                        this.$message.success("新增成功");
                        this.closeDrawer();
                        this.fetchTableData();
                    } else {
                        this.$message.error(res.msg || "新增失败");
                    }
                } catch (error) {
                    console.error("新增失败:", error);
                    this.$message.error("新增失败，请稍后重试");
                } finally {
                    this.submitting = false;
                }
            });
        },
    },
};
</script>

<style scoped>
/* 页面容器 */
.container {
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* 列表卡片 */
.list-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

::v-deep .el-card__body {
    height: 100%;
    display: flex;
    flex-direction: column;
}

/* 操作栏 */
.action-bar-fixed {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
    margin-bottom: 20px;
}

/* 表格包裹层 - 核心滚动区域 */
.table-wrapper {
    flex: 1;
    overflow-y: auto !important;
    min-height: 0;
    position: relative;
}

/* 分页区域 */
.pagination-fixed {
    flex-shrink: 0;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: flex-end;
    padding-top: 16px;
}

/* 操作按钮组 */
.action-buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
}

/* 手机号脱敏显示 */
.phone-cell {
    display: flex;
    align-items: center;
    justify-content: center;
}

.phone-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-left: 6px;
    font-size: 11px;
    color: #999;
    cursor: pointer;
    line-height: 1;
}

.phone-icon .svg-icon {
    width: 14px;
    height: 14px;
}

.phone-icon:hover {
    color: #606266;
}

/* 新增按钮样式 */
.add-btn {
    background: #6a35ff;
    border: none;
    width: 191px;
}

.add-btn:hover {
    background: #7b38d9;
}

/* 弹窗底部按钮 */
.form-footer {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;
}
</style>
