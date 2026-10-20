<template>
    <div class="container">
        <keep-alive :include="['BannerList', 'BannerAdd']">
            <component :is="currentComponent" ref="dynamicComponent" @switch-to-list="handleSwitchToList"
                @switch-to-edit="handleSwitchToEdit" @refresh-list="handleRefreshList">
            </component>
        </keep-alive>
    </div>
</template>

<script>
import BannerList from './list.vue'
import BannerAdd from './add.vue'

export default {
    name: 'BannerManagement',
    components: {
        BannerList,
        BannerAdd
    },
    data() {
        return {
            currentComponent: 'BannerList',
            sharedData: {
                bannerId: null,
                editRow: null
            }
        }
    },
    methods: {
        handleSwitchToList() {
            this.currentComponent = 'BannerList'
            // 切换回列表时刷新数据
            this.$nextTick(() => {
                this.handleRefreshList()
            })
        },
        handleSwitchToEdit(row = null) {
            if (row) {
                this.sharedData.bannerId = row.bannerId
                this.sharedData.editRow = row
            } else {
                this.sharedData.bannerId = null
                this.sharedData.editRow = null
            }
            this.currentComponent = 'BannerAdd'
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
            getSharedData: () => this.sharedData
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