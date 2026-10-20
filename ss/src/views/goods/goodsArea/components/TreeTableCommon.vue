<template>
    <div class="list-wrapper">
        <div class="module-header">
            <h2>{{ gameName }} - {{ config.title }}</h2>
        </div>

        <div ref="responsiveModule" class="search-module">
            <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" @search="handleSearch"
                @reset="handleReset" />
        </div>

        <el-card class="list-card" shadow="never">
            <div class="action-bar">
                <el-button type="primary" icon="el-icon-plus" @click="handleAdd"
                    v-permission="'goodsArea:<module>:add'">新增</el-button>
            </div>

            <div class="table-wrapper">
                <el-table ref="treeTableRef" :data="filteredData" row-key="id" v-loading="loading" stripe height="100%"
                    :tree-props="{ children: 'children' }">
                    <el-table-column prop="fieldName" label="字段名称" show-overflow-tooltip></el-table-column>
                    <el-table-column prop="isShow" label="是否外显" align="center"
                        v-permission="'goodsArea:<module>:explicit'">
                        <template slot-scope="{ row }">
                            <el-switch v-model="row.isShow" active-color="#8F03FF" :active-value="1" :inactive-value="0"
                                @change="toggleShow(row)" validate-event>
                            </el-switch>
                        </template>
                    </el-table-column>
                    <el-table-column prop="fieldType" label="类型" align="center">
                        <template slot-scope="{ row }">
                            <el-tag :type="getTagType(row.fieldType)" size="small">
                                {{ getFieldTypeText(row.fieldType) }}
                                {{ row.selectType == 1 ? '(单选)' : row.selectType == 2 ? '(多选)' : '' }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column v-if="config.module === 'partnerPrice'" prop="isTechPlay" label="是否技术陪"
                        align="center" v-permission="'goodsArea:<module>:isTechPlay'">
                        <template slot-scope="{ row }">
                            <el-switch v-if="row.parentId === 0" v-model="row.isTechPlay" active-color="#8F03FF"
                                :active-value="1" :inactive-value="0" @change="toggleIsTechPlay(row)" validate-event>
                            </el-switch>
                        </template>
                    </el-table-column>
                    <el-table-column v-if="config.module === 'partnerPrice'" prop="showUnit" label="是否展示单位"
                        align="center" v-permission="'goodsArea:<module>:showUnit'">
                        <template slot-scope="{ row }">
                            <el-switch v-if="canToggleShowUnit(row)" v-model="row.showUnit" active-color="#8F03FF"
                                :active-value="1" :inactive-value="0" @change="handleToggleShowUnit(row)"
                                validate-event>
                            </el-switch>
                        </template>
                    </el-table-column>
                    <el-table-column prop="orderNum" label="排序值" align="center"></el-table-column>
                    <el-table-column label="操作" width="250" fixed="right" align="center">
                        <template slot-scope="{ row }">
                            <el-button type="text" @click="handleAddChild(row)" style="color:#9047f8"
                                v-if="canAddChild(row)" v-permission="'goodsArea:<module>:addChild'">
                                新增子级</el-button>
                            <el-button type="text" @click="handleEdit(row)" style="color:#9047f8"
                                v-permission="'goodsArea:<module>:edit'">编辑</el-button>
                            <el-button type="text" @click="handleDelete(row)" style="color:#f56c6c"
                                v-permission="'goodsArea:<module>:remove'">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </el-card>

        <RelationFormDialog ref="dialog" :title="dialogTitle" :fields="fieldList" :module-type="moduleType"
            @confirm="handleConfirm" />
    </div>
</template>

<script>
import SearchForm from '@/components/SearchComponent/index.vue';
import RelationFormDialog from './RelationFormDialog.vue';
import {
    productFieldRelationList,
    batchAddProductFieldRelation,
    editProductFieldRelation,
    removeProductFieldRelation,
    toggleProductFieldRelationShow,
    toggleIsTechPlay,
    toggleShowUnit
} from '@/api/goodsAreaRelation';
import { productFieldList } from '@/api/goodsArea';

export default {
    name: 'TreeTableCommon',
    components: { SearchForm, RelationFormDialog },
    props: {
        gameName: { type: String, default: '' },
        config: { type: Object, required: true },
        productId: { type: [String, Number], default: '' },
        businessType: { type: String, default: '' },
        moduleType: { type: String, default: '' }
    },
    data() {
        return {
            searchItems: [
                { type: 'input', prop: 'fieldName', label: '字段名称', placeholder: '请输入字段名称', clearable: true }
            ],
            filterForm: { fieldName: '' },
            loading: false,
            dialogTitle: '',
            currentRow: null,
            currentParentId: null,
            tableData: [],      // 本地表格数据
            fieldList: [],       // 可选字段列表
            lastScopeKey: '',
            requestSerial: 0,
            // 业务场景对应的支持字段类型映射
            businessTypeMap: {
                partnerAuth: {  // 陪陪认证
                    supportedTypes: ['2', '3', '4', '6', '7'],  // 输入项(仅数字)、输入项(无限制)、筛选项、图片、选项值
                    unsupportedTypes: ['1', '8', '9']  // 标题、自定义商品、选项值(价格)
                },
                partnerPrice: {  // 价格配置
                    supportedTypes: ['1', '2', '8'],  // 标题、输入项(仅数字)、输入项(无限制)、筛选项、选项值、自定义商品
                    unsupportedTypes: ['3', '4', '6', '7', '9']  // 图片
                },
                partnerGameZone: {  // 游戏专区
                    supportedTypes: ['4', '7', '9'],  // 筛选项、选项值
                    unsupportedTypes: ['1', '2', '3', '6', '8'],  // 标题、输入项(仅数字)、输入项(无限制)、图片、自定义商品
                    maxDepth: 2  // 最多两层
                },
                partnerOneClick: {  // 一键安排
                    supportedTypes: ['4', '7', '9'],  // 输入项(仅数字)、输入项(无限制)、筛选项、选项值
                    unsupportedTypes: ['1', '2', '3', '6', '8']  // 标题、图片、自定义商品
                },



                driverAuth: {  // 大神认证（同陪陪认证）
                    supportedTypes: ['2', '3', '4', '6', '7'],
                    unsupportedTypes: ['1', '8']
                },
                driverOrderField: {  // 订单字段（同价格配置）
                    supportedTypes: ['1', '2', '3', '4', '7', '8'],
                    unsupportedTypes: ['6']
                },
                driverSpec: {  // 商品规格（同价格配置）
                    supportedTypes: ['1', '2', '3', '4', '7', '8'],
                    unsupportedTypes: ['6']
                }
            }
        };
    },
    mounted() {
        window.addEventListener('resize', this.syncTableLayout);
        this.syncTableLayout();
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.syncTableLayout);
    },
    computed: {
        filteredData() {
            if (!this.filterForm.fieldName) {
                return this.tableData;
            }
            return this.filterTree(this.tableData, this.filterForm.fieldName);
        },
    },
    watch: {
        // 监听必要参数变化时重新加载数据，并在切换模块/游戏时清空搜索条件
        productId: {
            handler() {
                this.handleScopeChange();
            },
            immediate: true
        },
        businessType() {
            this.handleScopeChange();
        },
        moduleType() {
            this.handleScopeChange();
        }
    },
    methods: {
        handleScopeChange() {
            if (!this.productId || !this.businessType || !this.moduleType) {
                this.tableData = [];
                this.lastScopeKey = '';
                return;
            }
            const scopeKey = `${this.productId}-${this.businessType}-${this.moduleType}`;
            if (this.lastScopeKey && this.lastScopeKey !== scopeKey) {
                this.resetSearchState();
            }
            this.lastScopeKey = scopeKey;
            this.fetchData();
        },
        resetSearchState() {
            this.filterForm = { fieldName: '' };
            if (this.$refs.searchForm && this.$refs.searchForm.setFormData) {
                this.$refs.searchForm.setFormData({ fieldName: '' });
            }
            if (this.$refs.searchForm && this.$refs.searchForm.clearValidate) {
                this.$refs.searchForm.clearValidate(['fieldName']);
            }
        },
        syncTableLayout() {
            this.$nextTick(() => {
                if (this.$refs.treeTableRef) {
                    this.$refs.treeTableRef.doLayout();
                }
            });
        },

        // 添加方法：获取当前业务场景的配置
        getBusinessTypeConfig() {
            return this.businessTypeMap[this.config.module] || {
                supportedTypes: ['1', '2', '3', '4', '6', '7', '8'],
                unsupportedTypes: []
            };
        },

        // 添加方法：判断字段类型是否支持
        isFieldTypeSupported(fieldType) {
            const config = this.getBusinessTypeConfig();
            return config.supportedTypes.includes(String(fieldType));
        },

        canToggleShowUnit(row) {
            return this.config.module === 'partnerPrice' && (String(row.fieldType) === '2' || String(row.fieldType) === '8');
        },

        canAddChild(row) {
            const allowByType = row.fieldType == 1 || row.fieldType == 4 || row.fieldType == 7;
            if (!allowByType) return false;
            const businessConfig = this.getBusinessTypeConfig();
            if (businessConfig.maxDepth && this.getNodeDepth(row) >= businessConfig.maxDepth) {
                return false;
            }
            return true;
        },

        // 获取标签类型
        getTagType(value) {
            const typeMap = {
                '1': 'primary',
                '2': 'success',
                '3': 'success',
                '4': 'warning',
                '6': 'info',
                '7': 'danger',
                '8': 'primary',
                '9': 'warning'
            };
            return typeMap[value] || 'default';
        },

        // 修改获取字段类型文本的方法，同时传递业务场景信息
        getFieldTypeText(value) {
            const typeMap = {
                '1': '标题',
                '2': '输入项(仅数字)',
                '3': '输入项(无限制)',
                '4': '筛选项',
                '6': '图片',
                '7': '选项值',
                '8': '自定义商品',
                '9': '选项值(价格)'
            };
            return typeMap[value] || value;
        },

        // 递归过滤树形数据
        filterTree(data, keyword) {
            const normalizedKeyword = (keyword || '').trim();
            if (!normalizedKeyword) {
                return data;
            }
            return data.filter(item => {
                const match = item.fieldName ? item.fieldName.includes(normalizedKeyword) : false;
                if (item.children && item.children.length) {
                    const filteredChildren = this.filterTree(item.children, normalizedKeyword);
                    if (filteredChildren.length) return true;
                }
                return match;
            }).map(item => ({
                ...item,
                children: item.children ? this.filterTree(item.children, normalizedKeyword) : []
            }));
        },

        // 搜索
        handleSearch(e) {
            this.filterForm.fieldName = e?.fieldName ? e.fieldName.trim() : '';
            this.syncTableLayout();
        },

        // 重置
        handleReset() {
            this.filterForm.fieldName = '';
            this.syncTableLayout();
        },

        // 获取数据
        async fetchData() {
            if (!this.productId || !this.businessType || !this.moduleType) return;

            const requestId = ++this.requestSerial;
            this.loading = true;
            try {
                const params = {
                    productId: this.productId,
                    businessType: this.businessType,
                    moduleType: this.moduleType
                };

                const res = await productFieldRelationList(params);
                if (requestId !== this.requestSerial) {
                    return;
                }
                if (res.success && res.data) {
                    this.tableData = res.data || [];
                    this.syncTableLayout();
                }
            } catch (error) {
                if (requestId !== this.requestSerial) {
                    return;
                }
                console.error('获取字段关联列表失败:', error);
                this.$message.error('获取数据失败');
            } finally {
                if (requestId === this.requestSerial) {
                    this.loading = false;
                    this.syncTableLayout();
                }
            }
        },

        // 刷新数据（供外部调用）
        refresh() {
            this.fetchData();
        },

        // 获取字段列表（用于新增时选择）
        async fetchFieldList() {
            if (!this.productId) return [];

            try {
                const params = { productId: this.productId, pageSize: 999 };
                const res = await productFieldList(params);
                if (res.success && res.data && res.data.rows) {
                    return res.data.rows;
                }
                return [];
            } catch (error) {
                console.error('获取字段列表失败:', error);
                return [];
            }
        },

        // 修改 handleAdd 方法，传递业务场景配置
        async handleAdd() {
            this.dialogTitle = `新增${this.config.title}`;
            this.currentRow = null;
            this.currentParentId = 0;
            this.fieldList = await this.fetchFieldList();

            const businessConfig = this.getBusinessTypeConfig();

            this.$refs.dialog.openAdd(businessConfig);
        },
        // 新增子级时，根据父级类型配置子级可用的类型
        async handleAddChild(row) {
            this.dialogTitle = `新增子${this.config.title}`;
            this.currentRow = null;
            this.currentParentId = row.id;
            this.fieldList = await this.fetchFieldList();

            // 获取当前业务场景配置
            const businessConfig = this.getBusinessTypeConfig();

            // 根据父级类型配置子级可用的类型
            const childConfig = this.getChildTypeConfig(row.fieldType, businessConfig);

            this.$refs.dialog.openAddChild({
                Type: row.fieldType,
                businessConfig: childConfig,  // 传递子级类型配置
                currentDepth: this.getNodeDepth(row)
            });
        },

        // 新增方法：根据父级类型获取子级可用的类型配置
        getChildTypeConfig(parentFieldType, businessConfig) {
            // 筛选项(4)、标题(1)、选项值(7)的子级支持类型
            const childSupportedTypes = ['4', '2', '7', '9'];  // 筛选项、输入项(仅数字)、选项值、选项值(价格)

            return {
                supportedTypes: childSupportedTypes.filter(type =>
                    businessConfig.supportedTypes.includes(type)
                ),
                unsupportedTypes: [],
                maxDepth: businessConfig.maxDepth || null
            };
        },
        // 添加方法：获取节点深度
        getNodeDepth(node, currentDepth = 1) {
            if (!node.parentId && node.parentId !== 0) return currentDepth;
            // 递归查找父节点深度
            const findParent = (data, targetId, depth) => {
                for (const item of data) {
                    if (item.id === targetId) {
                        return depth;
                    }
                    if (item.children && item.children.length) {
                        const result = findParent(item.children, targetId, depth + 1);
                        if (result) return result;
                    }
                }
                return null;
            };
            const depth = findParent(this.tableData, node.id, 1);
            return depth || currentDepth;
        },
        // 修改 handleEdit 方法，传递业务场景配置
        async handleEdit(row) {
            this.dialogTitle = `编辑${this.config.title}`;
            this.currentRow = row;
            this.currentParentId = row.parentId || 0;
            this.fieldList = await this.fetchFieldList();

            const businessConfig = this.getBusinessTypeConfig();

            this.$refs.dialog.openEdit({
                id: row.id,
                fieldName: row.fieldName,
                fieldType: row.fieldType,
                orderNum: row.orderNum,
                businessConfig: businessConfig  // 传递业务场景配置
            });
        },
        // 删除
        async handleDelete(row) {
            this.$confirm('确定删除吗？删除后不可恢复', '提示', { type: 'warning' })
                .then(async () => {
                    try {
                        await removeProductFieldRelation(row.id);
                        this.$message.success('删除成功');
                        await this.fetchData();  // 重新加载数据
                    } catch (error) {
                        console.error('删除失败:', error);
                        this.$message.error('删除失败');
                    }
                })
                .catch(() => { });
        },

        // 切换是否外显状态
        async toggleShow(row) {
            try {
                await toggleProductFieldRelationShow(row.id, row.isShow);
                this.$message.success('状态更新成功');
            } catch (error) {
                console.error('切换状态失败:', error);
                // 恢复原状态
                row.isShow = row.isShow === '1' ? '0' : '1';
                this.$message.error('状态更新失败');
            }
        },

        // 切换是否技术陪
        async toggleIsTechPlay(row) {
            try {
                await toggleIsTechPlay(row.id, row.isTechPlay);
                this.$message.success('状态更新成功');
            } catch (error) {
                console.error('切换状态失败:', error);
                // 恢复原状态
                row.isTechPlay = row.isTechPlay === '1' ? '0' : '1';
                this.$message.error('状态更新失败');
            }
        },
        async handleToggleShowUnit(row) {
            try {
                await toggleShowUnit(row.id, row.showUnit);
                this.$message.success('状态更新成功');
            } catch (error) {
                console.error('切换展示单位失败:', error);
                row.showUnit = row.showUnit === '1' ? '0' : '1';
                this.$message.error('状态更新失败');
            }
        },
        // 弹窗确认提交
        async handleConfirm(formData) {
            try {
                if (formData.mode === 'batch') {
                    // 批量添加模式
                    const items = formData.items.map(item => ({
                        productId: this.productId,
                        businessType: this.businessType,
                        moduleType: this.moduleType,
                        productFieldId: item.productFieldId,
                        fieldType: item.fieldType,
                        orderNum: item.orderNum,
                        isRequired: item.isRequired,
                        selectType: item.fieldType == '4' ? (item.selectType || '1') : undefined,
                        // ✅ 修复：使用字符串比较
                        filterShowMode: item.fieldType == '4' ? item.showMode : undefined,
                        inputShowMode: (item.fieldType == '2' || item.fieldType == '3') ? item.showMode : undefined,
                        priceRangeMin: item.fieldType == '9' ? item.priceRangeMin : undefined,  // 新增
                        priceRangeMax: item.fieldType == '9' ? item.priceRangeMax : undefined,  // 新增
                        parentId: this.currentParentId
                    }));
                    await batchAddProductFieldRelation(items);
                    this.$message.success(`成功添加 ${items.length} 项`);
                } else {
                    // 普通模式
                    const submitData = {
                        id: formData.id,
                        productId: this.productId,
                        businessType: this.businessType,
                        moduleType: this.moduleType,
                        productFieldId: formData.productFieldId,
                        fieldType: formData.fieldType,
                        orderNum: formData.orderNum,
                        isRequired: formData.isRequired,
                        selectType: formData.fieldType == '4' ? (formData.selectType || '1') : undefined,
                        // ✅ 修复：使用字符串比较
                        filterShowMode: formData.fieldType == '4' ? formData.showMode : undefined,
                        inputShowMode: (formData.fieldType == '2' || formData.fieldType == '3') ? formData.showMode : undefined,
                        priceRangeMin: formData.fieldType == '9' ? formData.priceRangeMin : undefined,  // 新增
                        priceRangeMax: formData.fieldType == '9' ? formData.priceRangeMax : undefined,  // 新增
                        parentId: this.currentParentId || 0
                    };

                    // 根据字段类型添加额外字段
                    if (formData.fieldType == '2') {
                        submitData.minNum = formData.minNum;
                        submitData.maxNum = formData.maxNum;
                        submitData.placeholder = formData.placeholder;
                    } else if (formData.fieldType == '3') {
                        submitData.charMin = formData.charMin;
                        submitData.charMax = formData.charMax;
                        submitData.placeholder = formData.placeholder;
                    } else if (formData.fieldType == '6') {
                        submitData.imageLimitNum = formData.imageLimitNum;
                        submitData.demoImage = formData.demoImage;
                    } else if (formData.fieldType == '8') {
                        submitData.productLimitNum = formData.productLimitNum;
                        submitData.priceMin = formData.priceMin;
                        submitData.priceMax = formData.priceMax;
                    }

                    if (this.currentRow) {
                        // 编辑
                        await editProductFieldRelation(submitData);
                        this.$message.success('编辑成功');
                    } else {
                        // 新增
                        await batchAddProductFieldRelation([submitData]);
                        this.$message.success('新增成功');
                    }
                }

                await this.fetchData();
            } catch (error) {
                console.error('提交失败:', error);
                this.$message.error(error.message || '操作失败');
            }
        },
    }
};
</script>

<style scoped>
.module-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
}

.module-header {
    flex-shrink: 0;
}

.search-module {
    flex-shrink: 0;
}

.module-header h2 {
    font-size: 18px;
    font-weight: 600;
}

.list-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}

.list-card :deep(.el-card__body) {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px;
    min-height: 0;
}

.action-bar {
    margin-bottom: 20px;
    flex-shrink: 0;
}

.table-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    position: relative;
}

.table-wrapper :deep(.el-table) {
    width: 100%;
    height: 100%;
}
</style>

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
    padding: 20px 20px 20px 20px;
}

.action-bar {
    flex-shrink: 0;
    margin-bottom: 16px;
}

.table-wrapper {
    flex: 1;
    overflow: hidden;
    min-height: 0;
}

.pagination-wrapper {
    flex-shrink: 0;
    border-top: 1px solid #EBEEF5;
    display: flex;
    justify-content: flex-end;
}
</style>
