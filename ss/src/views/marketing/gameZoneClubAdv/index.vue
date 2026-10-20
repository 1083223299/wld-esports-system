<template>
    <div class="container">
        <keep-alive :include="['GameZoneClubAdvList', 'GameZoneClubAdvConfig']">
            <component :is="currentComponent" ref="dynamicComponent" />
        </keep-alive>
    </div>
</template>

<script>
import GameZoneClubAdvList from "./list.vue";
import GameZoneClubAdvConfig from "./config.vue";

export default {
    name: "GameZoneClubAdvManagement",
    components: {
        GameZoneClubAdvList,
        GameZoneClubAdvConfig,
    },
    data() {
        return {
            currentComponent: "GameZoneClubAdvList",
            sharedData: {
                mode: "single",
                editRow: null,
                selectedRows: [],
            },
        };
    },
    methods: {
        handleSwitchToList() {
            this.currentComponent = "GameZoneClubAdvList";
            this.$nextTick(() => {
                this.handleRefreshList();
            });
        },
        handleSwitchToEdit(payload = {}) {
            this.sharedData = {
                mode: payload.mode || "single",
                editRow: payload.editRow || null,
                selectedRows: Array.isArray(payload.selectedRows) ? payload.selectedRows : [],
            };
            this.currentComponent = "GameZoneClubAdvConfig";
        },
        handleRefreshList() {
            const listComp = this.$refs.dynamicComponent;
            if (listComp && listComp.fetchTableData) {
                listComp.fetchTableData();
            }
        },
    },
    provide() {
        return {
            switchToList: this.handleSwitchToList,
            switchToEdit: this.handleSwitchToEdit,
            getSharedData: () => this.sharedData,
            refreshList: this.handleRefreshList,
        };
    },
};
</script>

<style scoped>
.container {
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
}
</style>
