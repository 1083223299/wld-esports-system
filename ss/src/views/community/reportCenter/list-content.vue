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
          <el-table-column prop="targetUserNickname" label="发帖人昵称" width="120" show-overflow-tooltip></el-table-column>
          <el-table-column prop="targetUserId" label="发帖人ID" width="120"></el-table-column>
          <el-table-column prop="contentPreview" label="举报文案内容" min-width="200">
            <template slot-scope="scope">
              <span :class="{ 'text-ellipsis': !scope.row._contentExpanded }">{{ scope.row.contentPreview }}</span>
              <a v-if="scope.row.contentPreview && scope.row.contentPreview.length > 30" href="#" class="view-more" @click.prevent="toggleContent(scope.row)">
                {{ scope.row._contentExpanded ? '收起' : '展开' }}
              </a>
            </template>
          </el-table-column>
          <el-table-column prop="targetType" label="内容类型" width="100">
            <template slot-scope="scope">
              {{ scope.row.targetType === 'POST' ? '帖子' : '评论回复' }}
            </template>
          </el-table-column>
          <el-table-column prop="reportUserCount" label="举报人数" width="90"></el-table-column>
          <el-table-column label="举报标签" width="200">
            <template slot-scope="scope">
              <el-tag v-for="(item, idx) in scope.row.reportTypeList" :key="idx" :type="getReportTypeColor(item.reportTypeName)" size="small" style="margin: 2px">
                {{ item.reportTypeName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="statusName" label="状态" width="120">
            <template slot-scope="scope">
              <el-tag :type="getStatusType(scope.row.status)" size="small">
                {{ scope.row.statusName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reviewerName" label="处理人" width="120" show-overflow-tooltip></el-table-column>
          <el-table-column prop="reviewTime" label="处理时间" width="180"></el-table-column>
          <el-table-column prop="rejectReason" label="驳回原因" width="150" show-overflow-tooltip></el-table-column>
          <el-table-column label="操作" fixed="right" width="100">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button v-if="scope.row.status === '1'" type="text" @click="handleAudit(scope.row)" style="color: #9047f8">
                  审核
                </el-button>
                <el-button v-else type="text" @click="handleView(scope.row)" style="color: #9047f8">
                  查看
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
import { getPostReports, auditPostReport } from "@/api/community.js";
import { assignSearchId } from "@/utils/index";

export default {
  name: 'ReportCenterListContent',
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
          prop: 'targetUserNickname',
          label: '发帖人昵称',
          placeholder: '请输入',
          clearable: true
        },
        {
          type: 'input',
          prop: 'targetUserId',
          label: '发帖人ID',
          placeholder: '请输入',
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
        },
        {
          type: 'select',
          prop: 'targetType',
          label: '举报类型',
          placeholder: '请选择',
          options: [
            { label: '帖子', value: 'POST' },
            { label: '评论回复', value: 'COMMENT' }
          ],
          clearable: true
        },
        {
          type: 'select',
          prop: 'status',
          label: '处理结果',
          placeholder: '全部',
          options: [
            { label: '全部', value: '' },
            { label: '待审核', value: '1' },
            { label: '驳回举报', value: '2' },
            { label: '核实违规', value: '3' },
            { label: '内容已失效', value: '4' }
          ],
          clearable: true
        }
      ],
      filterForm: {
        postId: '',
        targetUserNickname: '',
        targetUserId: '',
        dateRange: [],
        reviewerName: '',
        reviewerId: '',
        targetType: '',
        status: ''
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
      const types = { '1': 'warning', '2': 'danger', '3': 'success', '4': 'info' }
      return types[status] || 'info'
    },
    getReportTypeColor(name) {
      const colors = { '色情低俗': 'danger', '暴力恐怖': 'danger', '政治敏感': 'danger', '诈骗信息': 'warning', '广告营销': 'info', '侵权内容': 'warning', '其他': 'info' }
      return colors[name] || 'info'
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
        targetUserNickname: '',
        targetUserId: '',
        dateRange: [],
        reviewerName: '',
        reviewerId: '',
        targetType: '',
        status: ''
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
    handleView(row) {
      this.$emit('switch-to-audit', row)
    },
    toggleContent(row) {
      this.$set(row, '_contentExpanded', !row._contentExpanded)
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
          ['targetUserId', this.filterForm.targetUserId, '发帖人ID']
        ]
        for (const [key, value, label] of idFields) {
          if (!assignSearchId(params, key, value)) {
            this.$message.warning(`${label}格式不正确，请输入纯数字`)
            return
          }
        }
        if (this.filterForm.targetUserNickname) {
          params.targetUserNickname = this.filterForm.targetUserNickname
        }
        if (this.filterForm.targetType) {
          params.targetType = this.filterForm.targetType
        }
        if (this.filterForm.status) {
          params.status = this.filterForm.status
        }
        if (this.filterForm.reviewerName) {
          params.reviewerName = this.filterForm.reviewerName
        }
        if (this.filterForm.dateRange && this.filterForm.dateRange.length === 2) {
          params.publishStartTime = this.filterForm.dateRange[0]
          params.publishEndTime = this.filterForm.dateRange[1]
        }
        const res = await getPostReports(params)
        if (res.success && res.data) {
          this.tableData = res.data.rows || []
          this.pagination.total = res.data.total || 0
        } else {
          this.tableData = []
          this.pagination.total = 0
        }
      } catch (error) {
        console.error('获取举报列表失败:', error)
        this.$message.error('获取列表失败')
      } finally {
        this.loading = false
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

.view-more {
  color: #409eff;
  text-decoration: none;
  margin-left: 4px;
}

.text-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>
