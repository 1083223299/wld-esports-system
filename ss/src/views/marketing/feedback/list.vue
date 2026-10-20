<template>
    <div class="feedback-list-page">
        <div ref="responsiveModule" class="search-module">
            <SearchForm
                ref="searchForm"
                :fields="searchItems"
                :initial-values="queryForm"
                :gutter="20"
                label-width="92px"
                :confirm-reset="false"
                @search="handleSearch"
                @reset="handleReset"
            />
        </div>

        <el-card class="list-card" shadow="never">
            <div class="table-wrapper">
                <el-table
                    :data="tableData"
                    stripe
                    v-loading="loading"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }"
                    :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }"
                >
                    <el-table-column
                        prop="description"
                        label="问题描述"
                        min-width="240"
                        show-overflow-tooltip
                    >
                        <template slot-scope="{ row }">
                            <span>{{ row.description || "-" }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column label="问题图片" min-width="180">
                        <template slot-scope="{ row }">
                            <div v-if="row.imageList.length" class="image-list">
                                <el-image
                                    v-for="(image, index) in row.imageList"
                                    :key="`${row.feedbackId || row.userId || 'feedback'}-${index}`"
                                    :src="image"
                                    :preview-src-list="row.imageList"
                                    fit="cover"
                                    class="feedback-image"
                                />
                            </div>
                            <span v-else>-</span>
                        </template>
                    </el-table-column>

                    <el-table-column label="用户账号信息" min-width="220" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            <div class="user-info">
                                <div class="user-name">{{ row.name || "-" }}</div>
                                <div class="user-id">ID：{{ row.userId || "-" }}</div>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column prop="createTime" label="提交时间" width="180">
                        <template slot-scope="{ row }">
                            {{ row.createTime || "-" }}
                        </template>
                    </el-table-column>

                    <el-table-column label="状态" width="100">
                        <template slot-scope="{ row }">
                            <span :class="['status-text', getStatusClass(row.status)]">
                                {{ getStatusText(row.status) }}
                            </span>
                        </template>
                    </el-table-column>

                    <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            {{ row.remark || "-" }}
                        </template>
                    </el-table-column>

                    <el-table-column label="操作" width="100" fixed="right" align="center">
                        <template slot-scope="{ row }">
                            <el-button type="text" class="remark-btn" @click="handleOpenRemark(row)">
                                备注
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
import { listUserFeedback } from "@/api/marketing";

const STATUS_TEXT_MAP = {
    "0": "未采纳",
    "1": "已采纳",
};

export default {
    name: "MarketingFeedbackList",
    components: {
        SearchForm,
        PaginationSimple,
    },
    inject: ["switchToFeedbackRemark"],
    data() {
        return {
            queryForm: {
                userId: "",
                name: "",
                submitTime: [],
            },
            searchItems: [
                {
                    type: "input",
                    prop: "userId",
                    label: "用户ID",
                    placeholder: "请输入",
                    inputType: "integer",
                    clearable: true,
                },
                {
                    type: "input",
                    prop: "name",
                    label: "用户昵称",
                    placeholder: "请输入",
                    clearable: true,
                },
                {
                    type: "daterange-no-time",
                    prop: "submitTime",
                    label: "提交时间",
                    startPlaceholder: "开始日期",
                    endPlaceholder: "结束日期",
                    valueFormat: "yyyy-MM-dd",
                    clearable: true,
                    maxRangeDays: 31,
                },
            ],
            tableData: [],
            loading: false,
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
        // 后端当前固定返回逗号分隔的图片字符串。
        parseImageList(value) {
            if (typeof value !== "string" || !value.trim()) {
                return [];
            }

            return value
                .split(",")
                .map((item) => item.trim())
                .filter((item) => !!item);
        },

        normalizeRow(row = {}) {
            return {
                ...row,
                feedbackId: row.feedbackId ? String(row.feedbackId) : "",
                userId: row.userId ? String(row.userId) : "",
                name: row.name || "",
                description: row.description || "",
                createTime: row.createTime || row.updateTime || "",
                status: row.status === null || row.status === undefined ? "" : String(row.status),
                remark: row.remark || "",
                imageList: this.parseImageList(row.img),
            };
        },

        buildQueryParams() {
            const [startTime, endTime] = Array.isArray(this.queryForm.submitTime)
                ? this.queryForm.submitTime
                : [];

            const params = {
                pageNum: this.pagination.pageNum,
                pageSize: this.pagination.pageSize,
                userId: this.queryForm.userId || undefined,
                name: this.queryForm.name || undefined,
                startTime: startTime || undefined,
                endTime: endTime || undefined,
            };

            Object.keys(params).forEach((key) => {
                if (params[key] === undefined || params[key] === "") {
                    delete params[key];
                }
            });

            return params;
        },

        async fetchTableData() {
            this.loading = true;
            try {
                const res = await listUserFeedback(this.buildQueryParams());
                this.tableData = Array.isArray(res.data.rows)
                    ? res.data.rows.map((row) => this.normalizeRow(row))
                    : [];
                this.pagination.total = Number(res.data.total || 0);
            } catch (error) {
                console.error("获取意见反馈列表失败:", error);
                this.tableData = [];
                this.pagination.total = 0;
                this.$message.error("获取列表数据失败，请稍后重试");
            } finally {
                this.loading = false;
            }
        },

        handleSearch(formData = {}) {
            this.queryForm = {
                userId: formData.userId || "",
                name: formData.name || "",
                submitTime: Array.isArray(formData.submitTime) ? formData.submitTime : [],
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },

        handleReset(formData = {}) {
            this.queryForm = {
                userId: formData.userId || "",
                name: formData.name || "",
                submitTime: Array.isArray(formData.submitTime) ? formData.submitTime : [],
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },

        handleCurrentChange(page) {
            this.pagination.pageNum = page;
            this.fetchTableData();
        },

        getStatusText(status) {
            if (status === null || status === undefined || status === "") {
                return "-";
            }

            return STATUS_TEXT_MAP[status] || "-";
        },

        getStatusClass(status) {
            const statusText = this.getStatusText(status);
            if (statusText === "已采纳") {
                return "status-success";
            }
            if (statusText === "未采纳") {
                return "status-danger";
            }
            return "";
        },

        handleOpenRemark(row) {
            this.switchToFeedbackRemark({
                currentRow: row,
            });
        },
    },
};
</script>

<style scoped lang="scss">
.feedback-list-page {
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
        padding: 20px 20px 0;
    }
}

.table-wrapper {
    flex: 1;
    min-height: 0;
    overflow: auto;
}

.pagination-wrapper {
    flex-shrink: 0;
    padding-top: 16px;
}

.image-list {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 0;
}

.feedback-image {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    background: #f7f8fa;
    border: 1px solid #e5e6eb;
    flex-shrink: 0;
}

.user-info {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    line-height: 1.4;
}

.user-name {
    color: #1d2129;
}

.user-id {
    color: #86909c;
    font-size: 12px;
}

.status-text {
    font-size: 14px;
    font-weight: 500;
}

.status-success {
    color: #00b42a;
}

.status-danger {
    color: #f53f3f;
}

.remark-btn {
    color: #409eff;
    padding: 0;
}
</style>
