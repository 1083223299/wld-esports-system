<template>
    <el-card class="dept-card" shadow="never" v-loading="mergedTreeLoading" element-loading-text="加载中..."
        element-loading-spinner="el-icon-loading" element-loading-background="rgba(255, 255, 255, 0.7)">
        <!-- 搜索框 -->
        <div class="search-container">
            <el-input v-model="searchKeyword" placeholder="搜索菜单..." prefix-icon="el-icon-search" clearable size="small"
                @input="handleSearch" class="search-input" />
        </div>

        <div class="dept-tree-wrapper">
            <el-tree ref="tree" :key="treeRenderKey" :data="filteredTreeData" :empty-text="mergedTreeLoading ? ' ' : '暂无数据'" :props="{ label: 'label', children: 'children' }" node-key="id"
                :current-node-key="currentNodeKey" :default-expanded-keys="expandedKeys" :highlight-current="true"
                :expand-on-click-node="true" @node-click="handleNodeClick" :default-expand-all="Boolean(searchKeyword)"
                :indent="12" :accordion="!searchKeyword" class="custom-tree">
                <span slot-scope="{ node, data }" class="custom-tree-node" :class="{
                    'level-1': node.level === 1,
                    'level-2': node.level === 2,
                    'level-3': node.level === 3,
                    'is-selected': isNodeSelected(node)
                }">
                    <span class="node-label">
                        <i :class="getNodeIcon(data)" class="node-icon"></i>
                        <span>{{ node.label }}</span>
                    </span>
                </span>
            </el-tree>
        </div>
    </el-card>
</template>

<script>
export default {
    name: 'LeftTree',
    props: {
        treeData: {
            type: Array,
            default: () => []
        },
        loading: {
            type: Boolean,
            default: false
        },
        currentNodeKey: {
            type: [String, Number],
            default: null
        },
        expandedKeys: {
            type: Array,
            default: () => []
        },
        selectedKeys: {
            type: Array,
            default: () => []
        }
    },
    data() {
        return {
            searchKeyword: '',
            originalTreeData: [],
            displayTreeData: [],
            treeLoading: true,
            applyTimer: null
        };
    },
    computed: {
        mergedTreeLoading() {
            return this.loading || this.treeLoading;
        },
        treeRenderKey() {
            return `${this.searchKeyword}-${this.displayTreeData.length}`;
        },
        filteredTreeData() {
            let result;
            if (!this.searchKeyword) {
                result = this.displayTreeData;
            } else {
                const keyword = this.searchKeyword.toLowerCase();

                const filterTree = (tree) => {
                    return tree
                        .map(node => {
                            const newNode = { ...node };
                            const matchesKeyword = newNode.label.toLowerCase().includes(keyword);

                            // 父节点命中时，保留完整子树，确保一级命中后仍能看到所有子级模块
                            if (!matchesKeyword && newNode.children) {
                                newNode.children = filterTree(newNode.children);
                            }

                            const hasMatchingChildren = newNode.children && newNode.children.length > 0;

                            if (matchesKeyword || hasMatchingChildren) {
                                return newNode;
                            }

                            return null;
                        })
                        .filter(Boolean);
                };

                result = filterTree(this.displayTreeData);
            }

            return result;
        }
    },
    watch: {
        treeData: {
            handler(newData) {
                this.treeLoading = true;
                const clonedData = JSON.parse(JSON.stringify(newData || []));
                this.originalTreeData = clonedData;
                if (this.applyTimer) {
                    clearTimeout(this.applyTimer);
                    this.applyTimer = null;
                }
                this.applyTimer = setTimeout(() => {
                    this.displayTreeData = clonedData;
                    this.$nextTick(() => {
                        window.requestAnimationFrame(() => {
                            this.applyTreeState();
                            this.treeLoading = false;
                        });
                    });
                }, 0);
            },
            immediate: true
        },
        currentNodeKey() {
            this.$nextTick(() => {
                this.applyTreeState();
            });
        },
        expandedKeys() {
            this.$nextTick(() => {
                this.applyTreeState();
            });
        },
        selectedKeys() {
            this.$nextTick(() => {
                this.applyTreeState();
            });
        }
    },
    beforeDestroy() {
        if (this.applyTimer) {
            clearTimeout(this.applyTimer);
            this.applyTimer = null;
        }
    },
    methods: {
        applyTreeState() {
            if (!this.$refs.tree) {
                return;
            }
            if (this.currentNodeKey !== null && this.currentNodeKey !== undefined) {
                this.$refs.tree.setCurrentKey(this.currentNodeKey);
            }
            this.applyExpandedKeys(this.expandedKeys);
        },
        applyExpandedKeys(keys = []) {
            if (!this.$refs.tree || !this.$refs.tree.store) {
                return;
            }
            Object.values(this.$refs.tree.store.nodesMap || {}).forEach(node => {
                if (node.level > 0) {
                    node.expanded = keys.includes(node.key);
                }
            });
        },
        handleNodeClick(data, node) {
            // 处理一级目录点击
            if (data.level === 1) {
                // 触发点击事件
                this.$emit('node-click', data);
            }
            // 点击搭档和代练目录时，只展开/折叠目录，不触发页面跳转
            if (data.level === 2 && (data.label === '搭档' || data.label === '代练')) {
                return;
            }
            // 其他情况触发点击事件
            if (data.level > 1) {
                this.$emit('node-click', data);
            }
        },
        handleSearch() {
            // 搜索逻辑已在computed中处理
        },
        getNodeIcon(data) {
            if (data.level === 1) {
                return 'el-icon-folder-opened';
            }
            if (data.level === 2) {
                return 'el-icon-menu';
            }
            return 'el-icon-document';
        },
        renderContent(h, { node, data, store }) {
            return h('span', {
                class: ['custom-tree-node', `level-${node.level}`]
            }, [
                h('span', {
                    class: 'node-label'
                }, [
                    h('i', {
                        class: ['node-icon', this.getNodeIcon(data)]
                    }),
                    h('span', node.label)
                ])
            ]);
        },
        // 设置选中状态，包括父节点
        setSelectedKeys(keys) {
            if (this.$refs.tree) {
                // 清空所有选中状态
                this.$refs.tree.setCurrentKey(null);
                // 设置当前选中的节点
                if (keys && keys.length > 0) {
                    this.$refs.tree.setCurrentKey(keys[keys.length - 1]);
                }
            }
        },
        // 设置选中状态并自动展开父节点
        setSelectedAndExpand(keys) {
            if (!this.$refs.tree) {
                setTimeout(() => {
                    this.setSelectedAndExpand(keys);
                }, 50);
                return;
            }

            if (keys && keys.length > 0) {
                const targetKey = keys[keys.length - 1];

                // 清空并设置当前选中的节点
                this.$refs.tree.setCurrentKey(null);
                this.$refs.tree.setCurrentKey(targetKey);

                // 获取节点并展开所有祖先节点
                const node = this.$refs.tree.getNode(targetKey);
                if (node) {
                    // 递归展开所有父节点
                    let parent = node.parent;
                    while (parent && parent.level >= 0) {
                        if (!parent.expanded && parent.expanded !== undefined) {
                            parent.expanded = true;
                        }
                        parent = parent.parent;
                    }
                    // 展开当前节点本身
                    if (node.expanded !== undefined) {
                        node.expanded = true;
                    }
                }
            }
        },
        // 判断节点是否被选中
        isNodeSelected(node) {
            return this.selectedKeys.map(key => String(key)).includes(String(node.data.id));
        }
    }
};
</script>

<style scoped>
.dept-card {
    height: 100%;
    border-radius: 24px;
    border: 1px solid #f0f0f0;
    overflow: hidden;
    transition: all 0.3s ease;
}

::v-deep .el-card__body {
    padding: 16px 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* 搜索框样式 */
.search-container {
    margin-bottom: 16px;
}

.search-input {
    border-radius: 12px;
    border: 1px solid #e4e7ed;
    transition: all 0.3s ease;
}

.search-input:focus {
    border-color: #6A35FF;
    box-shadow: 0 0 0 2px rgba(106, 53, 255, 0.1);
}

.dept-tree-wrapper {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
}

/* 滚动条样式 */
.dept-tree-wrapper::-webkit-scrollbar {
    width: 6px;
}

.dept-tree-wrapper::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.dept-tree-wrapper::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.dept-tree-wrapper::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

/* 树节点样式 */
::v-deep .el-tree {
    background: transparent;
    position: relative;
}

::v-deep .el-tree-node__content {
    height: 44px;
    border-radius: 10px;
    margin: 4px 0;
    transition: all 0.3s ease;
    padding: 0 12px;
}

::v-deep .el-tree-node__content:hover {
    background-color: #f5f7fa;
}

/* 一级目录选中样式 */
::v-deep .el-tree-node.level-1.is-current>.el-tree-node__content {
    background: linear-gradient(90deg, #6A35FF 0%, #8F18EE 100%);
    border-left: none;
}

::v-deep .el-tree-node.level-1.is-current>.el-tree-node__content .custom-tree-node {
    color: #ffffff;
    font-weight: 600;
}

::v-deep .el-tree-node.level-1.is-current>.el-tree-node__content .node-icon {
    color: #ffffff;
}

/* 二级和三级目录选中样式 */
::v-deep .el-tree-node.level-2.is-current>.el-tree-node__content,
::v-deep .el-tree-node.level-3.is-current>.el-tree-node__content {
    background: rgba(106, 53, 255, 0.1);
    border-left: none;
}

::v-deep .el-tree-node.level-2.is-current>.el-tree-node__content .custom-tree-node,
::v-deep .el-tree-node.level-3.is-current>.el-tree-node__content .custom-tree-node {
    color: #6A35FF;
    font-weight: 500;
}

::v-deep .el-tree-node.level-2.is-current>.el-tree-node__content .node-icon,
::v-deep .el-tree-node.level-3.is-current>.el-tree-node__content .node-icon {
    color: #6A35FF;
}

/* 选中样式 */
::v-deep .el-tree-node__content .custom-tree-node.is-selected {
    border-left: none;
    color: #6A35FF;
    font-weight: 500;
}

::v-deep .el-tree-node__content .custom-tree-node.is-selected .node-icon {
    color: #6A35FF;
}

/* 一级目录选中样式 */
::v-deep .el-tree-node__content .custom-tree-node.level-1.is-selected {
    color: #6A35FF;
    font-weight: 600;
}

::v-deep .el-tree-node__content .custom-tree-node.level-1.is-selected .node-icon {
    color: #6A35FF;
}

/* 二级和三级目录选中样式 */
::v-deep .el-tree-node__content .custom-tree-node.level-2.is-selected,
::v-deep .el-tree-node__content .custom-tree-node.level-3.is-selected {
    background: transparent;
    color: #6A35FF;
    font-weight: 500;
}

::v-deep .el-tree-node__content .custom-tree-node.level-2.is-selected .node-icon,
::v-deep .el-tree-node__content .custom-tree-node.level-3.is-selected .node-icon {
    color: #6A35FF;
}

.custom-tree-node {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 14px;
    color: #333;
}

.node-label {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
}

.node-icon {
    font-size: 18px;
    color: #999;
    transition: color 0.3s;
    width: 20px;
    text-align: center;
}

/* 模块计数样式 */
.module-count {
    background: #f0f0f0;
    color: #666;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
}

::v-deep .el-tree-node.is-current>.el-tree-node__content .module-count {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
}

/* 展开箭头样式 */
::v-deep .el-tree-node__expand-icon {
    color: #bbb;
    font-size: 14px;
    transition: all 0.3s ease;
}

::v-deep .el-tree-node__expand-icon.expanded {
    transform: rotate(90deg);
    color: #6A35FF;
}

::v-deep .el-tree-node__expand-icon:hover {
    color: #6A35FF;
}

::v-deep .el-tree-node__expand-icon.is-leaf {
    color: transparent;
}

/* 缩进 - 减少二级和三级的左内边距 */
::v-deep .el-tree-node__children {
    padding-left: 12px !important;
}

::v-deep .el-tree-node .el-tree-node__children {
    padding-left: 12px;
}

/* 确保树内容不超出容器 */
::v-deep .el-tree-node__content {
    width: 100%;
    box-sizing: border-box;
}

::v-deep .custom-tree-node {
    word-break: keep-all;
    white-space: nowrap;
}
</style>
