<template>
  <div class="container">
    <keep-alive :include="['ReportCenterListContent', 'ReportCenterAudit']">
      <component :is="currentComponent" ref="dynamicComponent"
        @switch-to-audit="handleSwitchToAudit"
        @switch-to-list="handleSwitchToList">
      </component>
    </keep-alive>
  </div>
</template>

<script>
import ReportCenterListContent from './list-content.vue'
import ReportCenterAudit from './audit.vue'

export default {
  name: 'ReportCenter',
  components: {
    ReportCenterListContent,
    ReportCenterAudit
  },
  data() {
    return {
      currentComponent: 'ReportCenterListContent',
      sharedData: {
        reportId: null,
        editRow: null
      }
    }
  },
  methods: {
    handleSwitchToList() {
      this.currentComponent = 'ReportCenterListContent'
      this.$nextTick(() => {
        this.handleRefreshList()
      })
    },
    handleSwitchToAudit(row) {
      if (row) {
        this.sharedData.reportId = row.reportId
        this.sharedData.editRow = row
      } else {
        this.sharedData.reportId = null
        this.sharedData.editRow = null
      }
      this.currentComponent = 'ReportCenterAudit'
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
      switchToAudit: this.handleSwitchToAudit,
      getSharedData: () => this.sharedData
    }
  }
}
</script>

<style scoped>
.container {
  height: 100%;
  padding: 20px;
  overflow: auto;
}
</style>
