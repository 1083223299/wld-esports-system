<template>
  <div
    class="infinite-scroll-container"
    ref="scrollContainer"
    :style="{ height: containerHeight }"
  >
    <!-- 列表内容插槽 -->
    <slot></slot>

    <!-- 加载状态提示 -->
    <div class="infinite-scroll-status">
      <!-- 加载中 -->
      <el-skeleton loading="loading" v-if="loading" row="1" :animated="true">
        <div class="loading-text">正在加载...</div>
      </el-skeleton>
      
      <!-- 无更多数据 -->
      <div class="no-more" v-else-if="noMore">
        <el-icon><circle-check /></el-icon> 没有更多数据了
      </div>
      
      <!-- 加载失败 -->
      <div class="load-fail" v-else-if="loadFailed">
        <el-icon><warning /></el-icon> 
        <span>加载失败</span>
        <el-button type="text" size="mini" @click="reload">重新加载</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { debounce } from 'lodash' // 也可以自己实现简单的防抖函数

export default {
  name: 'InfiniteScroll',
  props: {
    // 滚动容器高度，支持 px/%/vh 等单位
    containerHeight: {
      type: String,
      default: '100%'
    },
    // 触底阈值（距离底部多少像素触发加载）
    bottomThreshold: {
      type: Number,
      default: 50
    },
    // 是否正在加载（由父组件控制）
    loading: {
      type: Boolean,
      default: false
    },
    // 是否无更多数据（由父组件控制）
    noMore: {
      type: Boolean,
      default: false
    },
    // 是否加载失败（由父组件控制）
    loadFailed: {
      type: Boolean,
      default: false
    },
    // 是否禁用加载
    disabled: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    // 防抖处理滚动事件
    handleScroll: debounce(function() {
      // 禁用/加载中/无更多/加载失败时不触发
      if (this.disabled || this.loading || this.noMore || this.loadFailed) return
      
      const container = this.$refs.scrollContainer
      if (!container) return
      
      // 计算滚动位置：滚动高度 + 可视高度 >= 总高度 - 阈值
      const { scrollTop, clientHeight, scrollHeight } = container
      const isReachBottom = scrollTop + clientHeight >= scrollHeight - this.bottomThreshold
      
      if (isReachBottom) {
        // 触发加载更多事件
        this.$emit('loadMore')
      }
    }, 100),
    
    // 重新加载
    reload() {
      this.$emit('reload')
    }
  },
  mounted() {
    // 监听滚动事件
    const container = this.$refs.scrollContainer
    if (container) {
      container.addEventListener('scroll', this.handleScroll)
    }
  },
  beforeDestroy() {
    // 移除事件监听，防止内存泄漏
    const container = this.$refs.scrollContainer
    if (container) {
      container.removeEventListener('scroll', this.handleScroll)
    }
  }
}
</script>

<style scoped>
.infinite-scroll-container {
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
}

.infinite-scroll-status {
  padding: 15px 0;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.loading-text {
  height: 20px;
  line-height: 20px;
}

.no-more, .load-fail {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.load-fail span {
  color: #f56c6c;
}
</style>