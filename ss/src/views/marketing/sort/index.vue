<template>
    <div class="container">
        <keep-alive :include="['SortList', 'SortAdd']">
            <component :is="currentComponent" ref="dynamicComponent" @switch-to-list="handleSwitchToList"
                @switch-to-edit="handleSwitchToEdit" @refresh-list="handleRefreshList">
            </component>
        </keep-alive>
    </div>
</template>

<script>
import SortList from './list.vue'
import SortAdd from './add.vue'

export default {
    name: 'FactorManagement',
    components: {
        SortList,
        SortAdd
    },
    data() {
        return {
            currentComponent: 'SortList',
            sharedData: {
                configId: null,
            }
        }
    },
    methods: {
        handleSwitchToList() {
            this.currentComponent = 'SortList'
            // 切换到列表时也刷新一下
            this.$nextTick(() => {
                this.handleRefreshList()
            })
        },
        handleSwitchToEdit(row = null) {
            if (row) {
                this.sharedData.configId = row.configId
            }
            this.currentComponent = 'SortAdd'
        },
        handleRefreshList() {
            const listComp = this.$refs.dynamicComponent
            if (listComp && listComp.fetchTableData) {
                listComp.fetchTableData()
            }
        }
    },
    provide() {
        return {
            switchToList: this.handleSwitchToList,
            switchToEdit: this.handleSwitchToEdit,
            getSharedData: () => this.sharedData,
            refreshList: this.handleRefreshList  // 注入刷新方法
        }
    }
}
</script>
<style scoped>
.container {
    height: 100%;
    padding: 20px;
}
</style>