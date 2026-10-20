<template>
  <div>
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
        @search="handleSearch" @reset="handleReset">
      </SearchForm>
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">
          <el-table-column prop="postId" label="帖子ID" width="120"></el-table-column>
          <el-table-column prop="userNickname" label="用户昵称" width="120" show-overflow-tooltip></el-table-column>
          <el-table-column prop="userId" label="用户ID" width="120"></el-table-column>
          <el-table-column prop="originalPublishTime" label="发帖时间" width="180"></el-table-column>
          <el-table-column prop="content" label="文案内容" min-width="200" align="center" header-align="center">
            <template slot-scope="scope">
              <div class="content-cell" :class="{ 'is-expanded': scope.row._contentExpanded }">
                <span
                  class="content-text"
                  :class="scope.row._contentExpanded ? 'content-expanded' : 'content-ellipsis'"
                >{{ scope.row.content }}</span>
                <a
                  v-if="scope.row.content && (scope.row._contentOverflow || scope.row._contentExpanded)"
                  href="#"
                  class="view-more"
                  @click.prevent="toggleContent(scope.row)"
                >
                  {{ scope.row._contentExpanded ? '收起' : '展开' }}
                </a>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="riskWords" label="命中敏感词" width="150" show-overflow-tooltip></el-table-column>
          <el-table-column prop="statusName" label="复审状态" width="120">
            <template slot-scope="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ scope.row.statusName }}
              </el-tag>
            </template>
          </el-table-column>
        <el-table-column label="操作" fixed="right" width="100">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleAudit(scope.row)" style="color: #9047f8">
                  审核
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { getPostReviews } from "@/api/community";
import { assignSearchId } from "@/utils/index";
export default {
  name: 'IllegalPostsListContent',
  components: {
    SearchForm,
    PaginationSimple
  },
  data() {
    return {
      searchItems: [
        {
          type: 'input',
          prop: 'postId',
          label: '帖子ID',
          placeholder: '请输入',
          clearable: true
        },
        {
          type: 'input',
          prop: 'userId',
          label: '用户ID',
          placeholder: '请输入',
          clearable: true
        },
        {
          type: 'input',
          prop: 'userNickName',
          label: '用户昵称',
          placeholder: '请输入',
          clearable: true
        },
        {
          type: 'select',
          prop: 'status',
          label: '状态',
          placeholder: '全部',
          options: [
          
            { label: '待审核', value: '0' },
        
          ],
          clearable: true
        },
        {
          type: 'daterange',
          prop: 'dateRange',
          label: '发帖时间',
          valueFormat: 'yyyy-MM-dd HH:mm:ss',
          startPlaceholder: '开始日期',
          endPlaceholder: '结束日期',
          clearable: true
        },
        {
          type: 'input',
          prop: 'reviewerName',
          label: '处理人',
          placeholder: '请输入',
          clearable: true
        },
        {
          type: 'input',
          prop: 'reviewerId',
          label: '处理人ID',
          placeholder: '请输入',
          clearable: true
        }
      ],
      filterForm: {
        postId: '',
        userId: '',
        userNickName: '',
        status: '',
        dateRange: [],
        reviewerName: '',
        reviewerId: ''
      },
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      tableData: [],
      loading: false
    }
  },
  mounted() {
    this.fetchTableData()
  },
  methods: {
    getStatusType(status) {
      const types = {
        '0': 'warning',
        '1': 'success',
        '2': 'danger'
      }
      return types[status] || 'info'
    },
    handleSearch(e) {
      if (e) {
        this.filterForm = { ...e }
        this.pagination.pageNum = 1
        this.fetchTableData()
      }
    },
    handleReset() {
      this.filterForm = {
        postId: '',
        userId: '',
        userNickName: '',
        status: '',
        dateRange: [],
        reviewerName: '',
        reviewerId: ''
      }
      this.pagination.pageNum = 1
      this.fetchTableData()
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page
      this.fetchTableData()
    },
    handleAudit(row) {
      this.$emit('switch-to-audit', row)
    },
    toggleContent(row) {
      this.$set(row, '_contentExpanded', !row._contentExpanded)
      if (!row._contentExpanded) {
        this.updateContentOverflow()
      }
    },
    updateContentOverflow() {
      this.$nextTick(() => {
        const spans = this.$el.querySelectorAll('.content-text')
        spans.forEach((el, index) => {
          const row = this.tableData[index]
          if (!row || !row.content) return
          const overflow = el.scrollWidth > el.clientWidth + 1
          this.$set(row, '_contentOverflow', overflow)
        })
      })
    },
    async fetchTableData() {
      this.loading = true
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize
        }
        const idFields = [
          ['postId', this.filterForm.postId, '帖子ID'],
          ['userId', this.filterForm.userId, '用户ID'],
          ['reviewerId', this.filterForm.reviewerId, '处理人ID']
        ]
        for (const [key, value, label] of idFields) {
          if (!assignSearchId(params, key, value)) {
            this.$message.warning(`${label}格式不正确，请输入纯数字`)
            return
          }
        }
        if (this.filterForm.userNickName) {
          params.userNickName = this.filterForm.userNickName
        }
        if (this.filterForm.status) {
          params.status = this.filterForm.status
        }
        if (this.filterForm.reviewerName) {
          params.reviewerName = this.filterForm.reviewerName
        }
        if (this.filterForm.dateRange && this.filterForm.dateRange.length === 2) {
          params.startTime = this.filterForm.dateRange[0]
          params.endTime = this.filterForm.dateRange[1]
        }
        const res = await getPostReviews(params)
        if (res.success && res.data) {
          this.tableData = (res.data.rows || []).map(row => ({
            ...row,
            _contentExpanded: false,
            _contentOverflow: false
          }))
          this.pagination.total = res.data.total || 0
        } else {
          this.tableData = []
          this.pagination.total = 0
        }
      } catch (error) {
        console.error('获取违规帖子列表失败:', error)
        this.$message.error('获取列表失败')
      } finally {
        this.loading = false
        this.updateContentOverflow()
      }
    }
  }
}
</script>

<style scoped>
.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
  position: relative;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.content-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  gap: 4px;
}

.content-cell.is-expanded {
  flex-direction: column;
  align-items: center;
}

.content-text {
  min-width: 0;
  text-align: center;
}

.content-ellipsis {
  flex: 1;
  max-width: calc(100% - 36px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-expanded {
  white-space: pre-wrap;
  word-break: break-word;
  overflow: visible;
  line-height: 1.5;
  width: 100%;
  text-align: center;
}

.content-cell.is-expanded .view-more {
  align-self: center;
  margin-top: 2px;
}

.view-more {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

::v-deep .reviewer-id-column {
  text-align: left !important;
}

::v-deep .reviewer-id-column .cell {
  text-align: left !important;
}
</style>
