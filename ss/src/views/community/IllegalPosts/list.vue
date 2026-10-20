<template>
  <div class="container">
    <keep-alive :include="['IllegalPostsListContent', 'IllegalPostsAudit']">
      <component :is="currentComponent" ref="dynamicComponent"
        @switch-to-audit="handleSwitchToAudit"
        @switch-to-list="handleSwitchToList">
      </component>
    </keep-alive>
  </div>
</template>

<script>
import IllegalPostsListContent from './list-content.vue'
import IllegalPostsAudit from './audit.vue'

export default {
  name: 'IllegalPosts',
  components: {
    IllegalPostsListContent,
    IllegalPostsAudit
  },
  data() {
    return {
      currentComponent: 'IllegalPostsListContent',
      sharedData: {
        postId: null,
        editRow: null
      }
    }
  },
  methods: {
    handleSwitchToList() {
      this.currentComponent = 'IllegalPostsListContent'
      this.$nextTick(() => {
        this.handleRefreshList()
      })
    },
    handleSwitchToAudit(row) {
      if (row) {
        this.sharedData.postId = row.postId
        this.sharedData.editRow = row
      } else {
        this.sharedData.postId = null
        this.sharedData.editRow = null
      }
      this.currentComponent = 'IllegalPostsAudit'
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
