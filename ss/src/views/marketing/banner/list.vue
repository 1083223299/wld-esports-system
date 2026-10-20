<template>
    <div class="list-wrapper">
        <!-- 筛选查询区 -->
        <div ref="responsiveModule" class="search-module">
            <SearchForm ref="searchForm" :fields="searchItems" :initial-values="queryForm" :gutter="20"
                @search="handleSearch" @reset="handleReset"></SearchForm>
        </div>

        <!-- 数据列表展示 -->
        <el-card class="list-card" shadow="never">
            <!-- 操作栏 -->
            <div class="action-bar">
                <el-button type="primary" icon="el-icon-plus" @click="handleAdd" v-permission="'system:banner:add'">新增Banner</el-button>
            </div>

            <!-- 表格区域 -->
            <div class="table-wrapper">
                <el-table :data="tableData" stripe v-loading="loading" height="100%"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }">

                    <el-table-column prop="bannerId" label="ID"></el-table-column>

                    <el-table-column prop="title" label="标题" show-overflow-tooltip></el-table-column>

                    <el-table-column prop="displayPositionDesc" label="展示位置"></el-table-column>

                    <el-table-column label="展示端口" min-width="150" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            {{ getDisplayPortText(row.displayPort) }}
                        </template>
                    </el-table-column>

                    <el-table-column label="入口图" align="center">
                        <template slot-scope="{ row }">
                            <el-image v-if="row.entranceImageUrl" :src="row.entranceImageUrl"
                                :preview-src-list="[row.entranceImageUrl]" fit="cover"
                                style="width: 40px; height: 40px; border-radius: 4px;">
                            </el-image>
                            <span v-else>-</span>
                        </template>
                    </el-table-column>

                    <el-table-column prop="sortValue" label="排序值"></el-table-column>

                    <el-table-column label="展示状态" align="center" v-if="checkPermission('system:banner:status')">
                        <template slot-scope="{ row }">
                            <el-switch v-model="row.displayStatus" :active-value="'1'" :inactive-value="'0'"
                                active-color="#8F03FF" :before-change="() => beforeDisplayStatusChange(row)"
                                @change="handleStatusChange(row)">
                            </el-switch>
                        </template>
                    </el-table-column>

                    <el-table-column label="展示周期" width="300">
                        <template slot-scope="{ row }">
                            <div style="display: flex;">
                                <span>{{ row.startTime || '-' }}</span>
                                <span>至</span>
                                <span>{{ row.endTime || '-' }}</span>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column prop="createTime" label="创建时间" width="160"></el-table-column>

                    <el-table-column label="操作" width="120" fixed="right" align="center">
                        <template slot-scope="{ row }">
                            <el-button type="text" style="color: #409EFF" @click="handleEdit(row)" v-permission="'system:banner:edit'">编辑</el-button>
                            <el-button type="text" style="color: #F56C6C" @click="handleDelete(row)" v-permission="'system:banner:remove'">删除</el-button>
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
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { listBanner, ChangeBanner, RemoveBanner } from "@/api/marketing";
import checkPermission from "@/utils/checkPermission";

export default {
    name: 'BannerList',
    components: {
        SearchForm,
        PaginationSimple,
    },
    inject: ["switchToEdit"],
    data() {
        return {
            // 筛选表单
            queryForm: {
                bannerId: '',
                title: '',
                displayPosition: '',
                displayStatus: ''
            },

            // 搜索表单配置项
            searchItems: [
                {
                    type: "input",
                    prop: "bannerId",
                    label: "Banner ID",
                    placeholder: "请输入ID",
                    clearable: true,
                },
                {
                    type: "input",
                    prop: "title",
                    label: "标题",
                    placeholder: "请输入标题",
                    clearable: true,
                },
                {
                    type: "select",
                    prop: "displayPosition",
                    label: "展示位置",
                    placeholder: "全部",
                    options: [
                        { label: "全部", value: "" },
                        { label: "首页Banner", value: "home_banner" },
                        { label: "首页防诈提醒", value: "fraud_reminder" },
                        { label: "首页活动悬浮窗", value: "home_floating_window" },
                        { label: "首页活动弹窗", value: "home_popup" },
                        { label: "游戏专区", value: "game_zone" },
                    ],
                    clearable: true,
                },
                {
                    type: "select",
                    prop: "displayStatus",
                    label: "展示状态",
                    placeholder: "全部",
                    options: [
                        { label: "全部", value: "" },
                        { label: "关闭", value: "0" },
                        { label: "开启", value: "1" },
                    ],
                    clearable: true,
                },
            ],

            tableData: [],
            loading: false,
            pagination: { pageNum: 1, pageSize: 10, total: 0 },
        }
    },

    mounted() {
        this.fetchTableData()
    },

    methods: {
        checkPermission,
        // 加载表格数据
        async fetchTableData() {
            this.loading = true;
            try {
                const params = {
                    pageNum: this.pagination.pageNum,
                    pageSize: this.pagination.pageSize,
                    bannerId: this.queryForm.bannerId || undefined,
                    title: this.queryForm.title || undefined,
                    displayPosition: this.queryForm.displayPosition || undefined,
                    displayStatus: this.queryForm.displayStatus || undefined
                };

                // 过滤空值
                Object.keys(params).forEach(key => {
                    if (params[key] === undefined || params[key] === '') {
                        delete params[key];
                    }
                });

                const res = await listBanner(params);

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
                console.error("获取Banner列表失败:", error);
                this.tableData = [];
                this.pagination.total = 0;
                this.$message.error("获取数据失败，请稍后重试");
            } finally {
                this.loading = false;
            }
        },

        // 搜索
        handleSearch(e) {
            if (e) {
                this.queryForm.bannerId = e.bannerId || '';
                this.queryForm.title = e.title || '';
                this.queryForm.displayPosition = e.displayPosition || '';
                this.queryForm.displayStatus = e.displayStatus || '';
            }
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },

        // 重置
        handleReset() {
            this.queryForm = {
                bannerId: '',
                title: '',
                displayPosition: '',
                displayStatus: ''
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },

        // 当前页改变
        handleCurrentChange(val) {
            this.pagination.pageNum = val;
            this.fetchTableData();
        },

        // 切换展示状态
        beforeDisplayStatusChange(row) {
            const nextStatus = row.displayStatus === '1' ? '0' : '1';
            const actionText = nextStatus === '1' ? '开启' : '关闭';
            return this.$confirm(
                `请再次确认，是否${actionText} Banner "${row.title}"？`,
                '二次确认',
                {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }
            ).then(() => true).catch(() => false);
        },

        handleStatusChange(row) {
            this.$confirm(`确定要${row.displayStatus === '1' ? '开启' : '关闭'}Banner "${row.title}" 吗？`, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                try {
                    const params = {
                        bannerId: row.bannerId,
                        displayStatus: row.displayStatus
                    };
                    const res = await ChangeBanner(params);
                    if (res.success) {
                        this.$message.success('状态更新成功');
                    } else {
                        // 恢复原状态
                        row.displayStatus = row.displayStatus === '1' ? '0' : '1';
                        this.$message.error(res.errorMessage || '状态更新失败');
                    }
                } catch (error) {
                    console.error("切换状态失败:", error);
                    // 恢复原状态
                    row.displayStatus = row.displayStatus === '1' ? '0' : '1';
                    this.$message.error('状态更新失败');
                }
            }).catch(() => {
                row.displayStatus = row.displayStatus === '1' ? '0' : '1';
            });
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
            this.$confirm(`确定要删除Banner "${row.title}" 吗？`, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                try {
                    const params = {
                        bannerId: row.bannerId
                    };
                    const res = await RemoveBanner(params);
                    if (res.success) {
                        this.$message.success('删除成功');
                        // 如果当前页只有一条数据且不是第一页，则回到上一页
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
        // 获取展示端口文本
        getDisplayPortText(displayPort) {
            if (!displayPort) return '-';
            const portMap = {
                'android': '安卓',
                'ios': 'IOS',
                'tb_xcx': '未来洞小程序',
                'sh_xcx': '商户小程序'
            };
            return displayPort.split(',').map(port => portMap[port] || port).join('、');
        }
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
