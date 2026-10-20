<template>
    <div class="list-wrapper">
        <el-card class="list-card" shadow="never">
            <div class="table-wrapper">
                <el-table :data="tableData" stripe v-loading="loading"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }">

                    <el-table-column prop="factorName" label="影响因素" show-overflow-tooltip></el-table-column>


                    <el-table-column prop="scoreRule" label="得分上限">
                        <template slot-scope="{ row }">
                            {{ row.scoreRule }}
                        </template>
                    </el-table-column>


                    <el-table-column label="操作" width="100" fixed="right" align="center" v-if="checkPermission('system:club:edit')">
                        <template slot-scope="{ row }">
                            <el-button type="text" style="color: #409EFF" @click="handleEdit(row)" v-permission="'system:club:edit'">编辑</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </el-card>
    </div>
</template>

<script>
import { ClubList } from "@/api/club";
import checkPermission from "@/utils/checkPermission";

export default {
    name: 'ClubList',
    inject: ["switchToEdit"],
    data() {
        return {
            tableData: [],
            loading: false,
        }
    },
    mounted() {
        this.fetchTableData();
    },
    methods: {
        checkPermission,
        async fetchTableData() {
            this.loading = true;
            try {
                const res = await ClubList();
                if (res.success) {
                    this.tableData = res.data || [];
                } else {
                    this.$message.error(res.errorMessage || '查询失败');
                    this.tableData = [];
                }
            } catch (error) {
                console.error("获取列表失败:", error);
                this.tableData = [];
                this.$message.error("获取数据失败，请稍后重试");
            } finally {
                this.loading = false;
            }
        },
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
        padding: 20px;
    }
}

.table-wrapper {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}
</style>
