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
          <el-table-column prop="reportTypeId" label="ID" width="120"></el-table-column>
          <el-table-column prop="typeName" label="类型名称" min-width="150" show-overflow-tooltip></el-table-column>
          <el-table-column prop="sortOrder" label="排序" width="100"></el-table-column>
          <el-table-column prop="status" label="启用状态" width="120">
            <template slot-scope="scope">
              <el-switch v-model="scope.row.status" active-color="#8F03FF" active-value="0" inactive-value="1"
                @change="handleStatusChange(scope.row)">
              </el-switch>
            </template>
          </el-table-column>
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
      :close-on-press-escape="false" class="report-type-dialog" @close="handleDialogClose">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px" label-position="right">
        <el-form-item label="类型名称：" prop="typeName">
          <el-input v-model="form.typeName" placeholder="请输入" />
        </el-form-item>
      
        <el-form-item label="排序：">
          <el-input v-model.number="form.sortOrder" placeholder="请输入" />
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
import { getReportTypes, addReportType, editReportType, updateReportTypeStatus, deleteReportType, batchDeleteReportTypes } from "@/api/community";

export default {
  name: 'ReportTypeList',
  components: {
    SearchForm,
    PaginationSimple
  },
  data() {
    return {
      searchItems: [
        {
          type: 'input',
          prop: 'typeName',
          label: '类型名称',
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
        }
      ],
      filterForm: {
        typeName: '',
        status: ''
      },
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      tableData: [],
      loading: false,
      selectedRows: [],
      dialogVisible: false,
      dialogTitle: '新增类型',
      isEdit: false,
      editId: null,
      form: {
        typeName: '',
        status: '0',
        sortOrder: 0
      },
      formRules: {
        typeName: [{ required: true, message: '请输入类型名称', trigger: 'blur' }]
      }
    }
  },
  mounted() {
    this.fetchTableData()
  },
  methods: {
    handleSearch(e) {
      if (e) {
        this.filterForm = { ...e }
        this.pagination.pageNum = 1
        this.fetchTableData()
      }
    },
    handleReset() {
      this.filterForm = {
        typeName: '',
        status: ''
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
      this.dialogTitle = '新增类型'
      this.form = {
        typeName: '',
        status: '0',
        sortOrder: 0
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.formRef && this.$refs.formRef.clearValidate()
      })
    },
    handleEdit(row) {
      this.isEdit = true
      this.editId = row.reportTypeId
      this.dialogTitle = '编辑类型'
      this.form = {
        typeName: row.typeName,
        status: row.status,
        sortOrder: row.sortOrder || 0
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.formRef && this.$refs.formRef.clearValidate()
      })
    },
    async handleDelete(row) {
      this.$confirm('确定要删除该类型吗？', '提示', {
        type: 'warning'
      }).then(async () => {
        try {
          await deleteReportType({ reportTypeId: row.reportTypeId })
          this.$message.success('删除成功')
          this.fetchTableData()
        } catch (e) {
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },
    async handleBatchDelete() {
      if (this.selectedRows.length === 0) {
        this.$message.warning('请选择要删除的数据')
        return
      }
      this.$confirm(`确定要删除选中的 ${this.selectedRows.length} 条数据吗？`, '提示', {
        type: 'warning'
      }).then(async () => {
        try {
          const ids = this.selectedRows.map(row => row.reportTypeId)
          await batchDeleteReportTypes({ reportTypeIds: ids })
          this.$message.success('删除成功')
          this.fetchTableData()
        } catch (e) {
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },
    async handleStatusChange(row) {
      try {
        await updateReportTypeStatus({ reportTypeId: row.reportTypeId, status: row.status })
        this.$message.success(row.status === '0' ? '已启用' : '已停用')
      } catch (e) {
        row.status = row.status === '0' ? '1' : '0'
        this.$message.error('状态切换失败')
      }
    },
    handleDialogClose() {
      this.$refs.formRef && this.$refs.formRef.resetFields()
    },
    async handleSubmit() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return
        try {
          if (this.isEdit) {
            await editReportType({
              reportTypeId: this.editId,
              typeName: this.form.typeName,
              status: this.form.status,
              sortOrder: this.form.sortOrder
            })
            this.$message.success('更新成功')
          } else {
            await addReportType({
              typeName: this.form.typeName,
              status: this.form.status,
              sortOrder: this.form.sortOrder
            })
            this.$message.success('添加成功')
          }
          this.dialogVisible = false
          this.fetchTableData()
        } catch (e) {
          this.$message.error(this.isEdit ? '更新失败' : '添加失败')
        }
      })
    },
    async fetchTableData() {
      this.loading = true
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          typeName: this.filterForm.typeName || undefined,
          status: this.filterForm.status !== '' ? this.filterForm.status : undefined
        }
        const res = await getReportTypes(params)
        if (res.success && res.data) {
          this.tableData = res.data.rows || []
          this.pagination.total = res.data.total || 0
        }
      } catch (error) {
        console.error('获取举报类型列表失败:', error)
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

::v-deep .report-type-dialog .el-dialog__header {
  padding-bottom: 10px;
  border-bottom: 1px solid #e8e8e8;
}

::v-deep .report-type-dialog .el-form-item__label {
  font-weight: 500;
}

::v-deep .report-type-dialog .el-form-item__label::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

::v-deep .report-type-dialog .el-form-item:not(.is-required) .el-form-item__label::before {
  content: '';
  margin-right: 0;
}
</style>
