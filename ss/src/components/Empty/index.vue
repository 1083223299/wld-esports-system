<!-- 
统一空状态组件
无数据
<Empty v-if="tableData.length === 0" />
加载失败 
<Empty type="error" showButton @refresh="getTableData" />
无权限 
<Empty type="noAuth" height="400" /> 
-->
<template>
  <div class="empty-container" :style="{ height: height + 'px' }">
    <div class="empty-content">
      <img src="../../assets/noTransactionHistory.png" v-show="type === 'empty'" alt="暂无数据" class="empty-img">
      <img src="../../assets/lightNoNetwork.png" v-show="type === 'error'" alt="加载失败" class="empty-img">
      <img src="../../assets/noSearchResult.png" v-show="type === 'error'" alt="无权限" class="empty-img">
      <p class="empty-text">{{ text }}</p>
      <el-button type="primary" @click="handleRefresh" v-if="showButton">
        {{ buttonText }}
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Empty',
  props: {
    // 空状态类型：empty(无数据) / error(加载失败) / noAuth(无权限)
    type: {
      type: String,
      default: 'empty',
      validator: val => ['empty', 'error', 'noAuth'].includes(val)
    },
    // 自定义文字
    text: {
      type: String,
      default: ''
    },
    // 自定义高度
    height: {
      type: Number,
      default: 300
    },
    // 是否显示按钮
    showButton: {
      type: Boolean,
      default: false
    },
    // 按钮文字
    buttonText: {
      type: String,
      default: '刷新'
    }
  },
  computed: {
    // 图标类名
    iconClass() {
      const iconMap = {
        empty: 'el-icon-empty',
        error: 'el-icon-warning-outline',
        noAuth: 'el-icon-lock'
      }
      return iconMap[this.type]
    },
    // 默认文字
    defaultText() {
      const textMap = {
        empty: '暂无数据',
        error: '加载失败，请稍后重试',
        noAuth: '暂无权限访问'
      }
      return textMap[this.type]
    }
  },
  methods: {
    // 按钮点击事件
    handleRefresh() {
      this.$emit('refresh')
    }
  }
}
</script>

<style scoped lang="scss">
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #fff;
  .empty-content {
    text-align: center;
    .el-icon {
      font-size: 60px;
      color: #c0c4cc;
      margin-bottom: 20px;
    }
    .empty-text {
      font-size: 14px;
      color: #909399;
      margin: 0;
    }
    .el-button {
      margin-top: 20px;
    }
  }
}
</style>
