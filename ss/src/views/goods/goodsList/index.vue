<template>
  <div class="container">
    <keep-alive :include="['GoodsCompanionList', 'AddCompanion']">
      <component :is="currentComponent" ref="dynamicComponent" @switch-to-list="handleSwitchToList"
                 @switch-to-add="handleSwitchToAdd" @refresh-list="handleRefreshList"></component>
    </keep-alive>
  </div>
</template>

<script>
// 导入子组件
import GoodsCompanionList from './list.vue'
import AddCompanion from './add.vue'

export default {
  name: 'goodsList',
  components: {
    GoodsCompanionList,
    AddCompanion
  },
  data() {
    return {
      // 当前显示的组件
      currentComponent: 'GoodsCompanionList',
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
      this.currentComponent = 'GoodsCompanionList'
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
      this.currentComponent = 'AddCompanion'
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
.container {
  padding: 20px;
  height: 100%;
  /* background: #f5f5f5;
  min-height: 100vh; */
}
</style>
