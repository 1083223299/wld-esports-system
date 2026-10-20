<template>
  <div class="container">
    <keep-alive :include="['ProductCategoryList', 'ProductCategoryGoods']">
      <component :is="currentComponent" ref="dynamicComponent" @switch-to-list="handleSwitchToList"
        @switch-to-goods="handleSwitchToGoods" @refresh-list="handleRefreshList" />
    </keep-alive>
  </div>
</template>

<script>
import ProductCategoryList from './list.vue'
import ProductCategoryGoods from './goods.vue'

export default {
  name: 'ProductCategoryIndex',
  components: {
    ProductCategoryList,
    ProductCategoryGoods
  },
  data() {
    return {
      currentComponent: 'ProductCategoryList',
      sharedData: {
        categoryId: null,
        categoryName: null
      },
      needRefresh: false
    }
  },
  methods: {
    handleSwitchToList(needRefresh = false) {
      this.needRefresh = needRefresh
      this.currentComponent = 'ProductCategoryList'
      this.$nextTick(() => {
        if (this.needRefresh) {
          this.handleRefreshList()
        }
      })
    },
    handleSwitchToGoods(data = null) {
      if (data) {
        this.sharedData = {
          categoryId: data.id,
          categoryName: data.categoryName
        }
      }
      this.currentComponent = 'ProductCategoryGoods'
    },
    handleRefreshList() {
      const listComp = this.$refs.dynamicComponent
      if (listComp && listComp.fetchTableData) {
        listComp.fetchTableData()
      }
      this.needRefresh = false
    }
  },
  provide() {
    return {
      switchToList: this.handleSwitchToList,
      switchToGoods: this.handleSwitchToGoods,
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
