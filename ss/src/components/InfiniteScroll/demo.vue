<template>
  <div class="demo-page">
    <h2>触底加载示例</h2>
    
    <infinite-scroll
      container-height="300px"
      :loading="loading"
      :no-more="noMore"
      :load-failed="loadFailed"
      @loadMore="handleLoadMore"
      @reload="handleReload"
    >
      <!-- 列表内容 -->
      <el-card v-for="(item, index) in list" :key="index" class="list-item">
        <div>{{ item }}</div>
      </el-card>
    </infinite-scroll>
  </div>
</template>

<script>

export default {
  data() {
    return {
      list: [], // 列表数据
      page: 1, // 当前页码
      pageSize: 10, // 每页条数
      loading: false, // 加载状态
      noMore: false, // 无更多数据
      loadFailed: false // 加载失败
    }
  },
  mounted() {
    // 初始化加载第一页
    this.fetchData()
  },
  methods: {
    // 模拟请求数据
    async fetchData() {
      try {
        this.loading = true
        this.loadFailed = false
        
        // 模拟接口请求
        const res = await new Promise((resolve) => {
          setTimeout(() => {
            // 模拟数据：前3页有数据，第4页无数据
            if (this.page <= 3) {
              const newData = Array.from({ length: this.pageSize }, (_, i) => `列表项 ${(this.page-1)*this.pageSize + i + 1}`)
              resolve({ data: newData, total: 30 })
            } else {
              resolve({ data: [], total: 30 })
            }
          }, 800)
        })
        
        if (res.data.length) {
          this.list = [...this.list, ...res.data]
          this.page += 1
        } else {
          // 无更多数据
          this.noMore = true
        }
      } catch (error) {
        console.error('加载失败：', error)
        this.loadFailed = true
      } finally {
        this.loading = false
      }
    },
    
    // 加载更多
    handleLoadMore() {
      this.fetchData()
    },
    
    // 重新加载
    handleReload() {
      this.fetchData()
    }
  }
}
</script>

<style scoped>
.demo-page {
  padding: 20px;
}

.list-item {
  margin-bottom: 10px;
}
</style>