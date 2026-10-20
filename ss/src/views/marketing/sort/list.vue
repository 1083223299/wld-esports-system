<template>
    <div class="list-wrapper">

        <!-- 数据列表展示 -->
        <el-card class="list-card" shadow="never">

            <!-- 表格区域 -->
            <div class="table-wrapper">
                <el-table :data="tableData" stripe v-loading="loading"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }">

                    <el-table-column prop="factorName" label="影响因素" show-overflow-tooltip></el-table-column>

                    <el-table-column prop="defaultScore" label="得分">
                        <template slot-scope="{ row }">
                            {{ row.score == null ? row.defaultScore : row.score }}
                        </template>
                    </el-table-column>

                    <el-table-column label="操作" width="120" fixed="right" align="center"
                        v-permission="'system:sort:edit'">
                        <template slot-scope="{ row }">
                            <el-button type="text" style="color: #409EFF" @click="handleEdit(row)"
                                v-permission="'system:sort:edit'">编辑</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </el-card>
    </div>
</template>

<script>
import { listRecommendFactor } from "@/api/sort";

export default {
    name: 'SortList',
    inject: ["switchToEdit"],
    data() {
        return {

            tableData: [],
            loading: false,
        }
    },

    mounted() {
        this.fetchTableData()
    },

    methods: {
        // 加载表格数据
        async fetchTableData() {
            this.loading = true;
            try {
                const res = await listRecommendFactor();

                if (res.success) {
                    const data = res.data;
                    this.tableData = data.rows || [];
                } else {
                    this.$message.error(res.errorMessage || '查询失败');
                    this.tableData = [];
                }
            } catch (error) {
                console.error("获取排序列表失败:", error);
                this.tableData = [];
                this.$message.error("获取数据失败，请稍后重试");
            } finally {
                this.loading = false;
            }
        },
        // 编辑
        handleEdit(row) {
            this.switchToEdit(row);
        },
    }
}
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
}

::v-deep .el-card__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px 20px 0 20px;
}

.action-bar {
    flex-shrink: 0;
    margin-bottom: 16px;
}

.table-wrapper {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

.pagination-wrapper {
    flex-shrink: 0;
    border-top: 1px solid #EBEEF5;
    display: flex;
    justify-content: flex-end;
}
</style>