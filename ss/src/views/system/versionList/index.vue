<template>
  <div class="container_index">
    <!-- keep-alive 缓存指定组件，include 对应子组件 name -->
    <keep-alive :include="['VersionTable', 'ActivityForm']">
      <component :is="currentComponent" ref="dynamicComponent" @switch-to-list="handleSwitchToList"
        @switch-to-add="handleSwitchToAdd" @refresh-list="handleRefreshList" @getSharedData="handleSwitchToAdd">
      </component>
    </keep-alive>
  </div>
</template>

<script>
// 导入子组件
import VersionTable from './list.vue'
import ActivityForm from './add.vue'

export default {
  name: 'VersionList',
  components: {
    VersionTable,
    ActivityForm
  },
  data() {
    return {
      // 当前显示的组件
      currentComponent: 'VersionTable',
      // 父子组件共享数据（用于编辑传参）
      sharedData: {
        editId: null,
        editRow: null
      },
      isAddBack: false
    }
  },
  methods: {
    // 切换到列表页
    handleSwitchToList(e) {
      this.isAddBack = e
      this.currentComponent = 'VersionTable'
    },
    // 切换到新增/编辑页
    handleSwitchToAdd(row = null) {
      if (row) {
        this.sharedData.editId = row.id

        this.sharedData.editRow = row
      } else {
        this.sharedData.editId = null
        this.sharedData.editRow = null
      }
      this.currentComponent = 'ActivityForm'
    },
    // 刷新列表数据
    handleRefreshList() {
      const listComp = this.$refs.dynamicComponent
      if (listComp && listComp.fetchTableData) {
        listComp.fetchTableData()
      }
    }
  },
  // 向子组件注入方法和数据
  provide() {
    return {
      switchToList: this.handleSwitchToList,
      switchToAdd: this.handleSwitchToAdd,
      getSharedData: () => this.sharedData,
      getSharedRefresh: () => this.isAddBack // 是否刷新列表数据
    }
  }
}
</script>

<style scoped>
.container_index {
  padding: 20px;
  height: 100%;
}
</style>
