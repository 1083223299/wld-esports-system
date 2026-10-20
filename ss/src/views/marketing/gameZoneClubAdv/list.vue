<template>
    <div class="list-wrapper">
        <div ref="responsiveModule" class="search-module">
            <SearchForm
                ref="searchForm"
                :fields="searchItems"
                :initial-values="queryForm"
                :gutter="20"
                label-width="88px"
                :confirm-reset="false"
                @search="handleSearch"
                @reset="handleReset"
            />
        </div>

        <el-card class="list-card" shadow="never">
            <div class="action-bar">
                <el-button type="primary" class="batch-add-btn" @click="handleBatchConfig">
                    批量添加配置
                </el-button>
            </div>

            <div class="table-wrapper">
                <el-table
                    ref="tableRef"
                    :data="tableData"
                    stripe
                    v-loading="loading"
                    :row-key="getRowKey"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }"
                    :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }"
                    @selection-change="handleSelectionChange"
                >
                    <el-table-column
                        type="selection"
                        width="56"
                        align="center"
                        :selectable="canSelectRow"
                    />

                    <el-table-column prop="productId" label="游戏ID" min-width="160" show-overflow-tooltip />

                    <el-table-column prop="productName" label="游戏名称" min-width="160" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            {{ row.productName || "-" }}
                        </template>
                    </el-table-column>

                    <el-table-column prop="clubCount" label="关联俱乐部数量" width="160" />

                    <el-table-column label="状态" width="140">
                        <template slot-scope="{ row }">
                            <span v-if="isUnconfigured(row.status)" class="status-text status-unconfigured">
                                未配置
                            </span>
                            <el-switch
                                v-else
                                v-model="row.status"
                                :active-value="STATUS_MAP.ENABLED"
                                :inactive-value="STATUS_MAP.DISABLED"
                                active-color="#20D179"
                                inactive-color="#B7F0C7"
                                :disabled="Boolean(statusLoadingMap[getRowKey(row)])"
                                class="status-switch"
                                @change="handleStatusChange(row, $event)"
                            />
                        </template>
                    </el-table-column>

                    <el-table-column label="操作" width="120" fixed="right" align="center">
                        <template slot-scope="{ row }">
                            <el-button type="text" class="config-btn" @click="handleConfig(row)">
                                配置
                            </el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <div class="pagination-wrapper">
                <PaginationSimple
                    :current-page="pagination.pageNum"
                    :page-size="pagination.pageSize"
                    :total="pagination.total"
                    :show-batch-actions="false"
                    @current-change="handleCurrentChange"
                />
            </div>
        </el-card>
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { changeGameZoneClubAdSlotStatus, listGameZoneClubAdSlot } from "@/api/marketing";

const STATUS_MAP = {
    DISABLED: "0",
    ENABLED: "1",
    UNCONFIGURED: "2",
};

export default {
    name: "GameZoneClubAdvList",
    components: {
        SearchForm,
        PaginationSimple,
    },
    inject: ["switchToEdit"],
    data() {
        return {
            STATUS_MAP,
            queryForm: {
                productId: "",
                productName: "",
                status: "",
            },
            searchItems: [
                {
                    type: "input",
                    prop: "productId",
                    label: "游戏ID",
                    placeholder: "请输入",
                    inputType: "integer",
                    clearable: true,
                },
                {
                    type: "input",
                    prop: "productName",
                    label: "游戏名称",
                    placeholder: "请输入",
                    clearable: true,
                },
                {
                    type: "select",
                    prop: "status",
                    label: "状态",
                    placeholder: "请选择",
                    clearable: true,
                    options: [
                        { label: "全部", value: "" },
                        { label: "开启", value: STATUS_MAP.ENABLED },
                        { label: "关闭", value: STATUS_MAP.DISABLED },
                        { label: "未配置", value: STATUS_MAP.UNCONFIGURED },
                    ],
                },
            ],
            tableData: [],
            selectedRows: [],
            loading: false,
            statusLoadingMap: {},
            pagination: {
                pageNum: 1,
                pageSize: 10,
                total: 0,
            },
        };
    },
    mounted() {
        this.fetchTableData();
    },
    methods: {
        unwrapResponse(res) {
            if (res && res.config && Object.prototype.hasOwnProperty.call(res, "status")) {
                const responseData = res.data || {};
                return responseData.data !== undefined ? responseData.data : responseData;
            }
            return res || {};
        },
        isActionRequestSuccess(res) {
            const data = this.unwrapResponse(res);
            return res === true || data === true || data.success === true || String(data.code) === "200" || String(data.errorCode) === "0";
        },
        getResponseMessage(res, fallback) {
            const data = this.unwrapResponse(res);
            return data.errorMessage || data.msg || fallback;
        },
        normalizeId(value) {
            if (value === null || value === undefined || value === "") {
                return "";
            }
            return String(value).trim();
        },
        normalizeStatus(value) {
            if (value === null || value === undefined || value === "") {
                return STATUS_MAP.UNCONFIGURED;
            }
            return String(value);
        },
        normalizeRow(row) {
            return {
                ...row,
                productId: this.normalizeId(row.productId),
                slotId: this.normalizeId(row.slotId),
                productName: row.productName || "-",
                clubCount: Number(row.clubCount || 0),
                status: this.normalizeStatus(row.status),
                canBatchSelect: Number(row.canBatchSelect || 0),
            };
        },
        buildQueryParams() {
            const params = {
                pageNum: this.pagination.pageNum,
                pageSize: this.pagination.pageSize,
                productId: this.queryForm.productId || undefined,
                productName: this.queryForm.productName || undefined,
                status: this.queryForm.status || undefined,
            };

            Object.keys(params).forEach((key) => {
                if (params[key] === undefined || params[key] === "") {
                    delete params[key];
                }
            });

            return params;
        },
        getRowKey(row) {
            if (!row) {
                return `empty-${this.pagination.pageNum}`;
            }
            return row.productId || row.slotId || `row-${this.pagination.pageNum}`;
        },
        isUnconfigured(status) {
            return this.normalizeStatus(status) === STATUS_MAP.UNCONFIGURED;
        },
        canSelectRow(row) {
            return Number(row.canBatchSelect) === 1;
        },
        syncQueryForm(formData = {}) {
            this.queryForm = {
                productId: formData.productId || "",
                productName: formData.productName || "",
                status: formData.status || "",
            };
        },
        async fetchTableData() {
            this.loading = true;
            try {
                const res = await listGameZoneClubAdSlot(this.buildQueryParams());
                if (String(res.code) === "200") {
                    this.tableData = Array.isArray(res.data.rows) ? res.data.rows.map((row) => this.normalizeRow(row)) : [];
                    this.pagination.total = Number(res.data.total || 0);
                } else {
                    this.tableData = [];
                    this.pagination.total = 0;
                    this.$message.error(res.errorMessage || res.msg || "查询失败");
                }
            } catch (error) {
                console.error("获取俱乐部广告位列表失败:", error);
                this.tableData = [];
                this.pagination.total = 0;
                this.$message.error("获取列表数据失败，请稍后重试");
            } finally {
                this.selectedRows = [];
                this.loading = false;
                this.$nextTick(() => {
                    if (this.$refs.tableRef) {
                        this.$refs.tableRef.clearSelection();
                        this.$refs.tableRef.doLayout();
                    }
                });
            }
        },
        handleSearch(formData) {
            this.syncQueryForm(formData);
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleReset(formData) {
            this.syncQueryForm(formData);
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleCurrentChange(page) {
            this.pagination.pageNum = page;
            this.fetchTableData();
        },
        handleSelectionChange(rows) {
            this.selectedRows = Array.isArray(rows) ? rows : [];
        },
        handleBatchConfig() {
            if (!this.selectedRows.length) {
                this.$message.warning("请先选择可批量配置的游戏");
                return;
            }
            this.switchToEdit({
                mode: "batch",
                selectedRows: this.selectedRows.map((row) => ({ ...row })),
            });
        },
        handleConfig(row) {
            this.switchToEdit({
                mode: "single",
                editRow: { ...row },
            });
        },
        async handleStatusChange(row, value) {
            const oldStatus = value === STATUS_MAP.ENABLED ? STATUS_MAP.DISABLED : STATUS_MAP.ENABLED;
            const rowKey = this.getRowKey(row);
            this.$set(this.statusLoadingMap, rowKey, true);
            try {
                const res = await changeGameZoneClubAdSlotStatus({
                    productId: row.productId,
                    status: value,
                });
                if (!this.isActionRequestSuccess(res)) {
                    row.status = oldStatus;
                    this.$message.error(this.getResponseMessage(res, "状态修改失败"));
                    return;
                }
                this.$message.success(value === STATUS_MAP.ENABLED ? "已开启" : "已关闭");
            } catch (error) {
                console.error("修改俱乐部广告位状态失败:", error);
                row.status = oldStatus;
                this.$message.error("状态修改失败，请稍后重试");
            } finally {
                this.$delete(this.statusLoadingMap, rowKey);
            }
        },
    },
};
</script>

<style scoped lang="scss">
.list-wrapper {
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.search-module {
    flex-shrink: 0;
}

.list-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;

    ::v-deep .el-card__body {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 20px 20px 0 20px;
    }
}

.action-bar {
    flex-shrink: 0;
    margin-bottom: 16px;
}

.batch-add-btn {
    min-width: 112px;
    height: 36px;
    border-radius: 8px;
    background: #6a35ff;
    border-color: #6a35ff;

    &:hover,
    &:focus {
        background: #5b2ce3;
        border-color: #5b2ce3;
    }
}

.table-wrapper {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.pagination-wrapper {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
}

.config-btn {
    color: #409eff;
}

.status-text {
    font-size: 14px;
    font-weight: 500;
}

.status-unconfigured {
    color: #1d2129;
}

::v-deep .status-switch .el-switch__core {
    border: none;
}
</style>
