<template>
    <div class="container">
        <keep-alive :include="['ClubList', 'ClubAdd']">
            <component :is="currentComponent" ref="dynamicComponent" 
                @switch-to-list="handleSwitchToList"
                @switch-to-edit="handleSwitchToEdit" 
                @refresh-list="handleRefreshList">
            </component>
        </keep-alive>
    </div>
</template>

<script>
import ClubList from './list.vue'
import ClubAdd from './add.vue'

export default {
    name: 'ClubManagement',
    components: {
        ClubList,
        ClubAdd
    },
    data() {
        return {
            currentComponent: 'ClubList',
            sharedData: {
                factorId: null,
                editRow: null
            }
        }
    },
    methods: {
        handleSwitchToList() {
            this.currentComponent = 'ClubList'
            this.$nextTick(() => {
                this.handleRefreshList()
            })
        },
        handleSwitchToEdit(row = null) {
            if (row) {
                this.sharedData.factorId = row.id
                this.sharedData.editRow = row
            }
            this.currentComponent = 'ClubAdd'
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