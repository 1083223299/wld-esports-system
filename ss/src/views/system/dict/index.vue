<template>
  <!-- keep-alive 缓存指定组件，include 对应子组件 name -->
  <keep-alive :include="['DictList', 'DictData']">
    <component :is="currentComponent" ref="dynamicComponent" @switch-to-list="handleSwitchToList"
      @switch-to-data="handleSwitchToData" @refresh-list="handleRefreshList" />
  </keep-alive>
</template>

<script>
// 导入子组件
import DictList from './list.vue'
import DictData from './data.vue'

export default {
  name: 'DictIndex',
  components: {
    DictList,
    DictData
  },
  data() {
    return {
      // 当前显示的组件
      currentComponent: 'DictList',
      // 父子组件共享数据（用于编辑传参）
      sharedData: {
        dictType: null,
        dictName: null
      },
      // 是否需要刷新列表
      needRefresh: false
    }
  },
  methods: {
    // 切换到列表页
    handleSwitchToList(needRefresh = false) {
      this.needRefresh = needRefresh
      this.currentComponent = 'DictList'
      // 切换后刷新列表
      this.$nextTick(() => {
        if (this.needRefresh) {
          this.handleRefreshList()
        }
      })
    },

    // 切换到数据页
    handleSwitchToData(data = null) {
      if (data) {
        this.sharedData = {
          dictType: data.dictType,
          dictName: data.dictName
        }
      } else {
        this.sharedData = {
          dictType: null,
          dictName: null
        }
      }
      this.currentComponent = 'DictData'
    },

    // 刷新列表数据
    handleRefreshList() {
      const listComp = this.$refs.dynamicComponent
      if (listComp && listComp.fetchTableData) {
        listComp.fetchTableData()
      }
      this.needRefresh = false
    }
  },
  // 向子组件注入方法和数据
  provide() {
    return {
      switchToList: this.handleSwitchToList,
      handleSwitchToData: this.handleSwitchToData,
      getSharedData: () => this.sharedData
    }
  }
}
</script>

<style scoped>
/* 确保组件容器占满高度 */
</style>