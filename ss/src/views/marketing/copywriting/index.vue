<template>
    <div class="container">
        <keep-alive :include="['CopywritingList', 'CopywritingAdd']">
            <component :is="currentComponent" ref="dynamicComponent" @switch-to-list="handleSwitchToList"
                @switch-to-edit="handleSwitchToEdit" @refresh-list="handleRefreshList">
            </component>
        </keep-alive>
    </div>
</template>

<script>
import CopywritingList from './list.vue'
import CopywritingAdd from './add.vue'

export default {
    name: 'CopywritingManagement',
    components: {
        CopywritingList,
        CopywritingAdd
    },
    data() {
        return {
            currentComponent: 'CopywritingList',
            sharedData: {
                configId: null,
                editRow: null
            }
        }
    },
    methods: {
        handleSwitchToList() {
            this.currentComponent = 'CopywritingList'
            this.$nextTick(() => {
                this.handleRefreshList()
            })
        },
        handleSwitchToEdit(row = null) {
            if (row) {
                this.sharedData.configId = row.configId
                this.sharedData.editRow = row
            } else {
                this.sharedData.configId = null
                this.sharedData.editRow = null
            }
            this.currentComponent = 'CopywritingAdd'
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
            refreshList: this.handleRefreshList
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