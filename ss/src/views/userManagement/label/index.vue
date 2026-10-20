<template>
    <div class="label-wrapper">
        <!-- 筛选查询区 -->
        <div ref="responsiveModule">
            <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
                show-search show-reset @search="handleSearch" @reset="handleReset">
            </SearchForm>
        </div>

        <!-- 列表卡片 -->
        <el-card class="list-card" shadow="never">
            <!-- 提示 -->
            <el-alert type="warning" :closable="false" show-icon class="alert-tip">
                <template slot="title">
                    注：以下数据不统计商家端
                </template>
            </el-alert>

            <!-- 表格区域 -->
            <div class="table-wrapper">
                <el-table :data="tableData" stripe v-loading="loading" :border="false"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }">

                    <el-table-column prop="labelName" label="标签名称" min-width="200" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            {{ row.labelName || '-' }}
                        </template>
                    </el-table-column>

                    <el-table-column prop="labelDefinition" label="定义" min-width="400" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            {{ row.labelDefinition || '-' }}
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <el-empty v-if="!loading && tableData.length === 0" description="暂无数据" />
        </el-card>
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import { queryUserLabel } from "@/api/label";

export default {
    name: 'UserLabel',
    components: { SearchForm },
    data() {
        return {
            searchItems: [
                {
                    type: "input",
                    prop: "labelName",
                    label: "标签名称",
                    placeholder: "请输入标签名称",
                    clearable: true,
                },
            ],
            filterForm: { labelName: "" },
            tableData: [],
            loading: false,
        };
    },

    mounted() {
        this.fetchTableData();
    },

    methods: {
        async fetchTableData() {
            this.loading = true;
            try {
                const res = await queryUserLabel({
                    labelName: this.filterForm.labelName || undefined,
                });

                if (res.success) {
                    this.tableData = Array.isArray(res.data) ? res.data : [];
                } else {
                    this.$message.error(res.errorMessage || "查询失败");
                    this.tableData = [];
                }
            } catch {
                this.tableData = [];
                this.$message.error("获取标签列表失败");
            } finally {
                this.loading = false;
            }
        },

        handleSearch(formData) {
            this.filterForm.labelName = formData?.labelName || "";
            this.fetchTableData();
        },

        handleReset() {
            this.filterForm.labelName = "";
            this.fetchTableData();
        },
    },
};
</script>

<style scoped lang="scss">
.label-wrapper {
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

::v-deep .el-card__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px 20px 0;
}

.alert-tip {
    flex-shrink: 0;
    margin-bottom: 16px;
    border-radius: 8px;

    ::v-deep .el-alert__title {
        font-size: 13px;
        color: #E6A23C;
    }
}

.table-wrapper {
    flex: 1;
    overflow-y: auto !important;
    min-height: 0;
    position: relative;
}
</style>
