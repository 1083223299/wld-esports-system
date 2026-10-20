<template>
  <div class="pagination-container">
    <!-- 批量操作区域 -->
    <div class="batch-actions" v-if="showBatchActions && selectedRows.length > 0">
      <span class="selected-count">已选择 {{ selectedRows.length }} 项</span>
      <el-button type="text" @click="batchEnable" size="small">批量启用</el-button>
      <el-button type="text" @click="batchDisable" size="small">批量禁用</el-button>
      <el-button type="text" @click="clearSelection" size="small">清空</el-button>
    </div>
    
    <!-- 简化版分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        class="pagination"
      >
      </el-pagination>
      
      <!-- 自定义跳转 -->
      <div class="page-jumper">
        <span>跳至</span>
        <el-input 
          v-model.number="jumpPage" 
          size="mini" 
          style="width: 60px; margin: 0 5px;"
          @keyup.enter.native="handleJump"
          @blur="handleJumpBlur"
        ></el-input>
        <span>页</span>
        <!-- <el-button size="mini" @click="handleJump" type="primary">确定</el-button> -->
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaginationSimple',
  props: {
    // 当前页码
    currentPage: {
      type: Number,
      required: true,
      default: 1
    },
    // 总条数
    total: {
      type: Number,
      required: true,
      default: 0
    },
    // 每页条数（固定为10）
    pageSize: {
      type: Number,
      required: true,
      default: 10
    },
    // 选中的行数据
    selectedRows: {
      type: Array,
      default: () => []
    },
    // 是否显示批量操作
    showBatchActions: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      jumpPage: this.currentPage
    }
  },
  watch: {
    currentPage(val) {
      this.jumpPage = val
    }
  },
  methods: {
    // 页码改变
    handleCurrentChange(val) {
      this.$emit('current-change', val)
      this.jumpPage = val
    },
    
    // 跳转页码
    handleJump() {
      if (!this.jumpPage || isNaN(this.jumpPage)) {
        this.$message.error('请输入有效的页码')
        this.jumpPage = this.currentPage
        return
      }
      
      const maxPage = Math.ceil(this.total / this.pageSize)
      const pageNum = parseInt(this.jumpPage)
      
      if (pageNum < 1 || pageNum > maxPage) {
        this.$message.error(`请输入1-${maxPage}之间的页码`)
        this.jumpPage = this.currentPage
        return
      }
      
      this.$emit('current-change', pageNum)
    },
    
    // 输入框失去焦点
    handleJumpBlur() {
      if (this.jumpPage && !isNaN(this.jumpPage)) {
        const pageNum = parseInt(this.jumpPage)
        if (pageNum < 1) {
          this.jumpPage = 1
        } else {
          const maxPage = Math.ceil(this.total / this.pageSize)
          if (pageNum > maxPage) {
            this.jumpPage = maxPage
          }
        }
      }
    },
    
    // 批量启用
    batchEnable() {
      this.$emit('batch-enable')
    },
    
    // 批量禁用
    batchDisable() {
      this.$emit('batch-disable')
    },
    
    // 清空选择
    clearSelection() {
      this.$emit('clear-selection')
    }
  }
}
</script>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* margin-top: 20px; */
  flex-wrap: wrap;
  position: relative;
}

.batch-actions {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f0f9ff;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid #9047F8;
}

.selected-count {
  font-size: 14px;
  color: #9047F8;
  font-weight: 500;
}

.pagination-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 20px;
  margin: 10px 0;
  justify-content: flex-end;
}

.pagination {
  justify-content: center;
}

.page-jumper {
  display: flex;
  align-items: center;
}

.page-jumper span {
  font-size: 12px;
  color: #1D2129;
}

/* 响应式适配 */
@media (max-width: 992px) {
  .pagination-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .batch-actions {
    position: static;
    transform: none;
    margin-bottom: 15px;
    justify-content: center;
  }
  
  .pagination-wrapper {
    flex-direction: column;
    gap: 10px;
  }
}
</style>