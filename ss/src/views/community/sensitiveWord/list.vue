<template>
  <div class="container">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
        @search="handleSearch" @reset="handleReset">
      </SearchForm>
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 操作按钮栏 -->
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
          style="background-color: #6A35FF; border-color: #6A35FF;">
          添加
        </el-button>
        <!-- <el-button type="primary" icon="el-icon-upload2" class="add-btn" @click="handleImport">
          导入
        </el-button> -->
        <el-button type="danger" icon="el-icon-delete" class="add-btn" :disabled="selectedRows.length === 0"
          @click="handleBatchDelete">
          删除
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="sensitiveWordId" label="ID" width="120"></el-table-column>
          <el-table-column prop="word" label="敏感词文本" min-width="150" show-overflow-tooltip></el-table-column>
          <el-table-column prop="communityReportTypeName" label="分类" width="120"></el-table-column>
          <el-table-column prop="riskLevelName" label="风险等级" width="120">
            <template slot-scope="scope">
              <el-tag :type="getLevelType(scope.row.riskLevel)" size="small">
                {{ scope.row.riskLevelName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="启用状态" width="120">
            <template slot-scope="scope">
              <el-switch v-model="scope.row.status" active-color="#8F03FF" active-value="0" inactive-value="1"
                @change="handleStatusChange(scope.row)">
              </el-switch>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" width="120" show-overflow-tooltip></el-table-column>
          <el-table-column prop="creatorName" label="创建人" width="120"></el-table-column>
          <el-table-column prop="createTime" label="添加时间" width="180"></el-table-column>
          <el-table-column label="操作" fixed="right" width="160">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8">
                  更新
                </el-button>
                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c">
                  删除
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="500px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="sensitive-word-dialog" @close="handleDialogClose">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="120px" label-position="right">
        <el-form-item label="敏感词文本：" prop="word">
          <el-input v-model="form.word" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="分类：" prop="communityReportTypeId">
          <el-select v-model="form.communityReportTypeId" placeholder="请选择" style="width: 100%">
            <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险等级：" prop="riskLevel">
          <el-select v-model="form.riskLevel" placeholder="请选择" style="width: 100%">
            <el-option label="高" value="HIGH" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="低" value="LOW" />
          </el-select>
        </el-form-item>
        <!-- <el-form-item label="状态：">
          <el-switch v-model="form.status" active-color="#8F03FF" active-value="0" inactive-value="1" />
        </el-form-item> -->
        <el-form-item label="排序：">
          <el-input v-model.number="form.sortOrder" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="备注：">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="handleSubmit"
          style="background-color: #6A35FF; border-color: #6A35FF;">
          提交
        </el-button>
        <el-button @click="dialogVisible = false">取消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { getReportTypes, getSensitiveWords, addSensitiveWord, editSensitiveWord, deleteSensitiveWord, updateSensitiveWordStatus, batchDeleteSensitiveWords } from "@/api/community";

export default {
  name: 'SensitiveWordList',
  components: {
    SearchForm,
    PaginationSimple
  },
  data() {
    return {
      searchItems: [
        {
          type: 'input',
          prop: 'keyword',
          label: '敏感词文本',
          placeholder: '请输入',
          clearable: true
        },
        {
          type: 'select',
          prop: 'status',
          label: '状态',
          placeholder: '请选择',
          options: [
            { label: '全部', value: '' },
            { label: '启用', value: '0' },
            { label: '关闭', value: '1' }
          ],
          clearable: true
        },
        {
          type: 'select',
          prop: 'communityReportTypeId',
          label: '分类',
          placeholder: '请选择',
          options: [],
          clearable: true
        },
        {
          type: 'select',
          prop: 'riskLevel',
          label: '风险等级',
          placeholder: '请选择',
          options: [
            { label: '全部', value: '' },
            { label: '高', value: 'HIGH' },
            { label: '中', value: 'MEDIUM' },
            { label: '低', value: 'LOW' }
          ],
          clearable: true
        }
      ],
      filterForm: {
        keyword: '',
        status: '',
        communityReportTypeId: '',
        riskLevel: ''
      },
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      tableData: [],
      loading: false,
      selectedRows: [],
      dialogVisible: false,
      dialogTitle: '新增类型',
      isEdit: false,
      editId: null,
      categoryOptions: [],
      form: {
        word: '',
        communityReportTypeId: '',
        riskLevel: 'HIGH',
        status: '0',
        sortOrder: 0,
        remark: ''
      },
      formRules: {
        word: [{ required: true, message: '请输入敏感词文本', trigger: 'blur' }],
        communityReportTypeId: [{ required: true, message: '请选择分类', trigger: 'change' }],
        riskLevel: [{ required: true, message: '请选择风险等级', trigger: 'change' }]
      }
    }
  },
  mounted() {
    this.fetchCategoryOptions()
    this.fetchTableData()
  },
  methods: {
    async fetchCategoryOptions() {
      try {
        const res = await getReportTypes({ pageNum: 1, pageSize: 100, status: '0' })
        if (res && res.data && res.data.rows) {
          const options = res.data.rows.map(item => ({
            label: item.typeName,
            value: item.reportTypeId
          }))
          this.categoryOptions = options
          // 同步更新搜索表单的分类选项
          const searchItem = this.searchItems.find(item => item.prop === 'communityReportTypeId')
          if (searchItem) {
            searchItem.options = [{ label: '全部', value: '' }, ...options]
          }
        }
      } catch (e) {
        console.error('获取分类列表失败:', e)
      }
    },
    getLevelType(level) {
      const types = { 'HIGH': 'danger', 'MEDIUM': 'warning', 'LOW': 'success' }
      return types[level] || 'info'
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
        keyword: '',
        status: '',
        communityReportTypeId: '',
        riskLevel: ''
      }
      this.pagination.pageNum = 1
      this.fetchTableData()
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page
      this.fetchTableData()
    },
    handleSelectionChange(selection) {
      this.selectedRows = selection
    },
    handleAdd() {
      this.isEdit = false
      this.editId = null
      this.dialogTitle = '新增敏感词'
      this.form = {
        word: '',
        communityReportTypeId: '',
        riskLevel: 'HIGH',
        status: '0',
        sortOrder: 0,
        remark: ''
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.formRef && this.$refs.formRef.clearValidate()
      })
    },
    handleEdit(row) {
      this.isEdit = true
      this.editId = row.sensitiveWordId
      this.dialogTitle = '编辑敏感词'
      this.form = {
        word: row.word,
        communityReportTypeId: row.communityReportTypeId,
        riskLevel: row.riskLevel,
        status: row.status,
        sortOrder: row.sortOrder || 0,
        remark: row.remark || ''
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.formRef && this.$refs.formRef.clearValidate()
      })
    },
    handleDelete(row) {
      this.$confirm('确定要删除该敏感词吗？', '提示', {
        type: 'warning'
      }).then(async () => {
        await deleteSensitiveWord({ sensitiveWordId: row.sensitiveWordId })
        this.$message.success('删除成功')
        this.fetchTableData()
      }).catch(() => {})
    },
    handleBatchDelete() {
      if (this.selectedRows.length === 0) {
        this.$message.warning('请选择要删除的数据')
        return
      }
      this.$confirm(`确定要删除选中的 ${this.selectedRows.length} 条数据吗？`, '提示', {
        type: 'warning'
      }).then(async () => {
        const ids = this.selectedRows.map(row => row.sensitiveWordId)
        await batchDeleteSensitiveWords({ sensitiveWordIds: ids })
        this.$message.success('删除成功')
        this.fetchTableData()
      }).catch(() => {})
    },
    async handleStatusChange(row) {
      try {
        await updateSensitiveWordStatus({
          sensitiveWordId: row.sensitiveWordId,
          status: row.status
        })
        this.$message.success(row.status === '0' ? '已启用' : '已停用')
      } catch (e) {
        row.status = row.status === '0' ? '1' : '0'
      }
    },
    handleImport() {
      this.$message.info('导入功能待实现')
    },
    handleDialogClose() {
      this.$refs.formRef && this.$refs.formRef.resetFields()
    },
    handleSubmit() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return
        const params = {
          word: this.form.word,
          communityReportTypeId: this.form.communityReportTypeId,
          riskLevel: this.form.riskLevel,
          status: this.form.status,
          sortOrder: this.form.sortOrder,
          remark: this.form.remark
        }
        if (this.isEdit) {
          params.sensitiveWordId = this.editId
          await editSensitiveWord(params)
          this.$message.success('更新成功')
        } else {
          await addSensitiveWord(params)
          this.$message.success('添加成功')
        }
        this.dialogVisible = false
        this.fetchTableData()
      })
    },
    async fetchTableData() {
      this.loading = true
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          keyword: this.filterForm.keyword || undefined,
          status: this.filterForm.status || undefined,
          communityReportTypeId: this.filterForm.communityReportTypeId || undefined,
          riskLevel: this.filterForm.riskLevel || undefined
        }
        const res = await getSensitiveWords(params)
        if (res && res.data) {
          this.tableData = res.data.rows || []
          this.pagination.total = res.data.total || 0
        }
      } catch (error) {
        console.error('获取敏感词列表失败:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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

.action-bar-fixed {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

::v-deep .sensitive-word-dialog .el-dialog__header {
  padding-bottom: 10px;
  border-bottom: 1px solid #e8e8e8;
}

::v-deep .sensitive-word-dialog .el-form-item__label {
  font-weight: 500;
}

::v-deep .sensitive-word-dialog .el-form-item__label::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

::v-deep .sensitive-word-dialog .el-form-item:not(.is-required) .el-form-item__label::before {
  content: '';
  margin-right: 0;
}
</style>
