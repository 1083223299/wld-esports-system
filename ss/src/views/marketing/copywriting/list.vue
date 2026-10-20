<template>
    <div class="list-wrapper">
        <!-- 数据列表展示 -->
        <el-card class="list-card" shadow="never">
            <!-- 操作栏 -->
            <div class="action-bar">
                <el-button type="primary" icon="el-icon-plus" @click="handleAdd" v-permission="'system:copywriting:add'">新增文案</el-button>
            </div>

            <!-- 表格区域 -->
            <div class="table-wrapper">
                <el-table :data="tableData" stripe v-loading="loading"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }">

                    <el-table-column prop="configId" label="ID" width="80"></el-table-column>

                    <el-table-column prop="displayArea" label="展示区域" width="150">
                        <template slot-scope="{ row }">
                            {{ getDisplayAreaText(row.displayArea) }}
                        </template>
                    </el-table-column>

                    <el-table-column label="商品图片" width="100">
                        <template slot-scope="{ row }">
                            <div class="avatar-cell" @click="previewImage(row)">
                                <img v-if="row.productImageUrl" :src="row.productImageUrl" class="product-image"
                                    @error="handleImgError" />
                                <img v-else src="@/assets/defaulIcon.png" class="product-image" />
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column prop="productName" label="商品名称" min-width="150" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            {{ row.productName || '-' }}
                        </template>
                    </el-table-column>

                    <el-table-column prop="updateTime" label="修改时间" width="180"></el-table-column>

                    <el-table-column label="操作" width="120" fixed="right" align="center">
                        <template slot-scope="{ row }">
                            <el-button type="text" style="color: #409EFF" @click="handleEdit(row)" v-permission="'system:copywriting:edit'">编辑</el-button>
                            <el-button type="text" style="color: #F56C6C" @click="handleDelete(row)" v-permission="'system:copywriting:remove'">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <!-- 分页组件 -->
            <div class="pagination-wrapper">
                <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize"
                    :total="pagination.total" @current-change="handleCurrentChange">
                </PaginationSimple>
            </div>
        </el-card>

        <!-- 图片预览 -->
        <ImgZoom v-model="imageDialogVisible" :img-list="[previewImageUrl]" />
    </div>
</template>

<script>
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import { listCopywriting, deleteCopywriting } from "@/api/copywriting";

export default {
    name: 'CopywritingList',
    components: {
        PaginationSimple,
        ImgZoom,
    },
    inject: ["switchToEdit", "refreshList"],
    data() {
        return {
            tableData: [],
            loading: false,
            pagination: { pageNum: 1, pageSize: 10, total: 0 },
            imageDialogVisible: false,
            previewImageUrl: '',
        }
    },

    mounted() {
        this.fetchTableData();
    },

    methods: {
        // 获取展示区域文本
        getDisplayAreaText(area) {
            const map = {
                'partner_win_rule': '陪陪包赢规则'
            };
            return map[area] || area || '-';
        },

        // 加载表格数据
        async fetchTableData() {
            this.loading = true;
            try {
                const params = {
                    pageNum: this.pagination.pageNum,
                    pageSize: this.pagination.pageSize
                };

                const res = await listCopywriting(params);

                if (res.success) {
                    const data = res.data;
                    this.tableData = data.rows || [];
                    this.pagination.total = data.total || 0;
                } else {
                    this.$message.error(res.errorMessage || '查询失败');
                    this.tableData = [];
                    this.pagination.total = 0;
                }
            } catch (error) {
                console.error("获取文案列表失败:", error);
                this.tableData = [];
                this.pagination.total = 0;
                this.$message.error("获取数据失败，请稍后重试");
            } finally {
                this.loading = false;
            }
        },

        // 当前页改变
        handleCurrentChange(val) {
            this.pagination.pageNum = val;
            this.fetchTableData();
        },

        // 预览图片
        previewImage(row) {
            if (row.productImageUrl) {
                this.previewImageUrl = row.productImageUrl;
                this.imageDialogVisible = true;
            } else {
                this.$message.warning('图片不存在');
            }
        },

        // 图片加载失败
        handleImgError(e) {
            e.target.src = require('@/assets/defaulIcon.png');
            e.target.onerror = null;
        },

        // 新增
        handleAdd() {
            this.switchToEdit(null);
        },

        // 编辑
        handleEdit(row) {
            this.switchToEdit(row);
        },

        // 删除
        handleDelete(row) {
            this.$confirm(`确定要删除该文案配置吗？`, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                try {
                    const res = await deleteCopywriting(row.configId);
                    if (res.success) {
                        this.$message.success('删除成功');
                        if (this.tableData.length === 1 && this.pagination.pageNum > 1) {
                            this.pagination.pageNum--;
                        }
                        this.fetchTableData();
                    } else {
                        this.$message.error(res.errorMessage || '删除失败');
                    }
                } catch (error) {
                    console.error("删除失败:", error);
                    this.$message.error('删除失败');
                }
            }).catch(() => { });
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
        padding: 20px 20px 0 20px;
    }
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
    display: flex;
    justify-content: flex-end;
}

.avatar-cell {
    display: flex;
    justify-content: center;
    cursor: pointer;

    .product-image {
        width: 50px;
        height: 50px;
        border-radius: 6px;
        object-fit: cover;
        border: 1px solid #EBEEF5;
    }
}
</style>