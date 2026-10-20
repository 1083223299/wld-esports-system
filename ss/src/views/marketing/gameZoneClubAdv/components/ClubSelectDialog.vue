<template>
    <el-dialog
        title="选择俱乐部"
        :visible.sync="dialogVisible"
        width="680px"
        :close-on-click-modal="false"
        append-to-body
        class="club-select-dialog"
        @close="handleClose"
    >
        <div class="dialog-search">
            <el-input
                v-model="queryForm.keyword"
                clearable
                placeholder="搜索俱乐部名称或ID..."
                @keyup.enter.native="handleSearch"
            >
                <el-button slot="append" icon="el-icon-search" @click="handleSearch"></el-button>
            </el-input>
        </div>

        <div class="dialog-list" v-loading="loading">
            <div
                v-for="item in tableData"
                :key="item.tradeId"
                class="club-option"
                :class="{ 'is-selected': isSelected(item) }"
                @click="toggleSelect(item)"
            >
                <el-checkbox
                    :value="isSelected(item)"
                    @change="toggleSelect(item)"
                    @click.native.stop
                />

                <div class="club-option__content">
                    <div class="club-option__name">{{ item.tradeName || "-" }}</div>
                    <div class="club-option__id">{{ item.tradeNo || item.tradeId || "-" }}</div>
                </div>
            </div>

            <div v-if="!loading && !tableData.length" class="dialog-empty">
                暂无可选俱乐部
            </div>
        </div>

        <div v-if="total > queryForm.pageSize" class="dialog-pagination">
            <el-pagination
                small
                layout="prev, pager, next"
                :current-page="queryForm.pageNum"
                :page-size="queryForm.pageSize"
                :total="total"
                @current-change="handleCurrentChange"
            />
        </div>

        <span slot="footer" class="dialog-footer">
            <div class="selected-count">已选择{{ selectedCount }}家俱乐部</div>
            <div class="dialog-footer__actions">
                <el-button @click="handleClose">取消</el-button>
                <el-button type="primary" @click="handleConfirm">确认</el-button>
            </div>
        </span>
    </el-dialog>
</template>

<script>
import { clubAdSlotClubSelectPage } from "@/api/marketing";

export default {
    name: "ClubSelectDialog",
    props: {
        visible: {
            type: Boolean,
            default: false,
        },
        selectedClubs: {
            type: Array,
            default: () => [],
        },
    },
    data() {
        return {
            dialogVisible: false,
            loading: false,
            total: 0,
            tableData: [],
            queryForm: {
                pageNum: 1,
                pageSize: 10,
                keyword: "",
            },
            selectedClubMap: {},
        };
    },
    computed: {
        selectedCount() {
            return Object.keys(this.selectedClubMap).length;
        },
    },
    watch: {
        visible: {
            immediate: true,
            handler(val) {
                this.dialogVisible = val;
                if (val) {
                    this.resetDialogState();
                    this.fetchTableData();
                }
            },
        },
    },
    methods: {
        unwrapResponse(res) {
            if (res && res.config && Object.prototype.hasOwnProperty.call(res, "status")) {
                const responseData = res.data || {};
                return responseData.data !== undefined ? responseData.data : responseData;
            }
            return res || {};
        },
        isPageRequestSuccess(data) {
            return String(data.code) === "200" || Array.isArray(data.rows) || data.total !== undefined;
        },
        getResponseMessage(res, fallback) {
            const data = this.unwrapResponse(res);
            return data.errorMessage || data.msg || fallback;
        },
        resetDialogState() {
            this.queryForm.pageNum = 1;
            this.queryForm.keyword = "";
            this.syncSelectedClubs();
        },
        syncSelectedClubs() {
            const nextMap = {};
            (this.selectedClubs || []).forEach((item) => {
                const tradeId = this.normalizeId(item.tradeId);
                nextMap[tradeId] = this.normalizeRow(item);
            });
            this.selectedClubMap = nextMap;
        },
        normalizeId(value) {
            if (value === null || value === undefined || value === "") {
                return "";
            }
            return String(value).trim();
        },
        normalizeRow(item) {
            return {
                tradeId: this.normalizeId(item.tradeId),
                tradeNo: item.tradeNo || "",
                tradeName: item.tradeName || "",
                logo: this.normalizeId(item.logo),
                logoUrl: item.logoUrl || "",
            };
        },
        async fetchTableData() {
            this.loading = true;
            try {
                const params = {
                    pageNum: this.queryForm.pageNum,
                    pageSize: this.queryForm.pageSize,
                    keyword: this.queryForm.keyword || undefined,
                };
                const res = await clubAdSlotClubSelectPage(params);
                const data = this.unwrapResponse(res.data);
                if (!this.isPageRequestSuccess(data)) {
                    this.tableData = [];
                    this.total = 0;
                    this.$message.error(this.getResponseMessage(res, "获取俱乐部列表失败"));
                    return;
                }

                this.tableData = Array.isArray(data.rows) ? data.rows.map((item) => this.normalizeRow(item)) : [];
                this.total = Number(data.total || 0);
            } catch (error) {
                console.error("获取俱乐部选择列表失败:", error);
                this.tableData = [];
                this.total = 0;
                this.$message.error("获取俱乐部列表失败，请稍后重试");
            } finally {
                this.loading = false;
            }
        },
        handleSearch() {
            this.queryForm.pageNum = 1;
            this.fetchTableData();
        },
        handleCurrentChange(page) {
            this.queryForm.pageNum = page;
            this.fetchTableData();
        },
        isSelected(item) {
            return Boolean(this.selectedClubMap[this.normalizeId(item.tradeId)]);
        },
        // 选择状态单独放在 map 里，支持搜索和翻页后继续保留已选结果。
        toggleSelect(item) {
            const tradeId = this.normalizeId(item.tradeId);
            if (this.selectedClubMap[tradeId]) {
                this.$delete(this.selectedClubMap, tradeId);
                return;
            }
            this.$set(this.selectedClubMap, tradeId, this.normalizeRow(item));
        },
        handleClose() {
            this.dialogVisible = false;
            this.$emit("update:visible", false);
        },
        handleConfirm() {
            this.$emit("confirm", Object.values(this.selectedClubMap));
            this.handleClose();
        },
    },
};
</script>

<style scoped lang="scss">
.club-select-dialog {
    ::v-deep .el-dialog {
        border-radius: 12px;
        overflow: hidden;
    }

    ::v-deep .el-dialog__body {
        padding: 18px 20px 12px;
    }

    ::v-deep .el-dialog__footer {
        padding: 14px 20px 18px;
        border-top: 1px solid #e5e6eb;
    }
}

.dialog-search {
    margin-bottom: 16px;
}

.dialog-list {
    min-height: 280px;
    max-height: 420px;
    overflow-y: auto;
}

.club-option {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
        background: #f7f8fa;
    }

    &.is-selected {
        background: #eaf5ff;
    }
}

.club-option__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex: 1;
    min-width: 0;
}

.club-option__name,
.club-option__id {
    min-width: 0;
    font-size: 14px;
    line-height: 22px;
    word-break: break-all;
}

.club-option__name {
    color: #1d2129;
}

.club-option__id {
    color: #86909c;
    text-align: right;
}

.dialog-empty {
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #86909c;
    font-size: 14px;
}

.dialog-pagination {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
}

.dialog-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.selected-count {
    font-size: 14px;
    color: #4e5969;
}

.dialog-footer__actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

@media (max-width: 768px) {
    .dialog-footer {
        flex-direction: column;
        align-items: stretch;
    }

    .dialog-footer__actions {
        justify-content: flex-end;
    }
}
</style>
