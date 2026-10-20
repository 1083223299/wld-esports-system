<template>
    <div class="feedback-container">
        <keep-alive :include="['MarketingFeedbackList', 'MarketingFeedbackRemark']">
            <component :is="currentComponent" ref="dynamicComponent" />
        </keep-alive>
    </div>
</template>

<script>
import MarketingFeedbackList from "./list.vue";
import MarketingFeedbackRemark from "./remark.vue";

export default {
    name: "MarketingFeedback",
    components: {
        MarketingFeedbackList,
        MarketingFeedbackRemark,
    },
    data() {
        return {
            currentComponent: "MarketingFeedbackList",
            sharedData: {
                currentRow: null,
            },
        };
    },
    methods: {
        handleSwitchToList(needRefresh = false) {
            this.currentComponent = "MarketingFeedbackList";
            this.$nextTick(() => {
                if (needRefresh) {
                    this.handleRefreshList();
                }
            });
        },
        handleSwitchToRemark(payload = {}) {
            this.sharedData = {
                currentRow: payload.currentRow || null,
            };
            this.currentComponent = "MarketingFeedbackRemark";
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
            switchToFeedbackList: this.handleSwitchToList,
            switchToFeedbackRemark: this.handleSwitchToRemark,
            getFeedbackSharedData: () => this.sharedData,
        };
    },
};
</script>

<style scoped>
.feedback-container {
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
}
</style>
