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
          <el-table-column prop="topicId" label="话题ID" width="120"></el-table-column>
          <el-table-column prop="topicName" label="话题名称" min-width="150" show-overflow-tooltip></el-table-column>
          <el-table-column prop="coverUrl" label="话题banner" width="100">
            <template slot-scope="scope">
              <el-image v-if="scope.row.coverUrl" :src="scope.row.coverUrl" style="width: 40px; height: 40px"
                fit="cover" :preview-src-list="[scope.row.coverUrl]" />
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="话题简介" min-width="200" show-overflow-tooltip></el-table-column>
          <el-table-column prop="postCount" label="帖子数" width="100"></el-table-column>
          <el-table-column prop="participantCount" label="参与人数" width="100"></el-table-column>
          <el-table-column prop="viewCount" label="浏览量" width="100"></el-table-column>
          <el-table-column prop="isHot" label="热门" width="80">
            <template slot-scope="scope">
              <el-tag :type="scope.row.isHot === '1' ? 'danger' : 'info'" size="small">
                {{ scope.row.isHot === '1' ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template slot-scope="scope">
              <el-switch v-model="scope.row.status" active-color="#8F03FF" active-value="0" inactive-value="1"
                @change="handleStatusChange(scope.row)">
              </el-switch>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180"></el-table-column>
          <el-table-column prop="creatorName" label="创建人" width="120"></el-table-column>
          <el-table-column label="操作" fixed="right" width="150">
            <template slot-scope="scope">
              <div class="action-buttons">
                <!-- <el-button type="text" @click="handleView(scope.row)" style="color: #9047f8">
                  查看
                </el-button> -->
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8">
                  编辑
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
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="600px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="topic-dialog" @close="handleDialogClose">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="120px" label-position="right">
        <el-form-item label="话题名称：" prop="topicName">
          <el-input v-model="form.topicName" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="话题banner：" prop="coverUrl">
          <el-upload class="banner-uploader" action="#" :show-file-list="false"
            :before-upload="beforeBannerUpload"
            :http-request="handleBannerUpload"
            :disabled="uploading"
            accept=".png,.jpg,.jpeg">
            <div class="banner-upload-wrapper" v-loading="uploading" element-loading-text="上传中...">
              <img v-if="form.coverUrl" :src="form.coverUrl" class="banner-image" />
              <i v-else class="el-icon-plus banner-uploader-icon"></i>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="话题简介：" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入"
            maxlength="200" show-word-limit />
        </el-form-item>
        <!-- <el-form-item label="状态：">
          <el-switch v-model="form.status" active-color="#8F03FF" active-value="0" inactive-value="1" />
        </el-form-item> -->
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit"
          style="background-color: #6A35FF; border-color: #6A35FF;">
          提交
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { getTopics, addTopic, editTopic, updateTopicStatus, deleteTopic, batchDeleteTopics } from "@/api/community";
import { assignSearchId } from "@/utils/index";
import { fileUpload } from '@/api/user'
export default {
  name: 'TopicList',
  components: {
    SearchForm,
    PaginationSimple
  },
  data() {
    return {
      searchItems: [
        {
          type: 'input',
          prop: 'topicId',
          label: '话题ID',
          placeholder: '请输入',
          clearable: true
        },
        {
          type: 'input',
          prop: 'topicName',
          label: '话题名称',
          placeholder: '请输入',
          clearable: true
        },
        {
          type: 'select',
          prop: 'isHot',
          label: '是否热门',
          placeholder: '请选择',
          clearable: true,
          options: [
            { label: '是', value: '1' },
            { label: '否', value: '0' }
          ]
        },
        {
          type: 'select',
          prop: 'status',
          label: '状态',
          placeholder: '请选择',
          clearable: true,
          options: [
            { label: '启用', value: '0' },
            { label: '停用', value: '1' }
          ]
        },
        {
          type: 'daterange',
          prop: 'dateRange',
          label: '创建时间',
          valueFormat: 'yyyy-MM-dd HH:mm:ss',
          startPlaceholder: '开始日期',
          endPlaceholder: '结束日期',
          clearable: true
        }
      ],
      filterForm: {
        topicId: '',
        topicName: '',
        isHot: '',
        status: '',
        dateRange: []
      },
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      tableData: [],
      loading: false,
      selectedRows: [],
      dialogVisible: false,
      dialogTitle: '新增',
      isEdit: false,
      editId: null,
      form: {
        topicName: '',
        coverUrl: '',
        description: '',
        status: '0'
      },
      coverOssId: '',
      uploading: false,
      formRules: {
        topicName: [{ required: true, message: '请输入话题名称', trigger: 'blur' }],
        coverUrl: [{ required: true, message: '请上传话题banner', trigger: 'change' }],
        description: [{ required: true, message: '请输入话题简介', trigger: 'blur' }]
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
        topicId: '',
        topicName: '',
        isHot: '',
        status: '',
        dateRange: []
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
      this.dialogTitle = '新增'
      this.coverOssId = ''
      this.form = {
        topicName: '',
        coverUrl: '',
        description: '',
        status: '0'
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.formRef && this.$refs.formRef.clearValidate()
      })
    },
    handleEdit(row) {
      this.isEdit = true
      this.editId = row.topicId
      this.dialogTitle = '编辑'
      this.coverOssId = row.coverOssId || ''
      this.form = {
        topicName: row.topicName,
        coverUrl: row.coverUrl,
        description: row.description,
        status: row.status
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.formRef && this.$refs.formRef.clearValidate()
      })
    },
    // handleView(row) {
    //   this.$message.info('查看功能待实现')
    // },
    async handleDelete(row) {
      try {
        await this.$confirm('确定要删除该话题吗？', '提示', { type: 'warning' })
        const res = await deleteTopic({ topicId: row.topicId })
        if (res.success) {
          this.$message.success('删除成功')
          this.fetchTableData()
        } else {
          this.$message.error(res.errorMessage || '删除失败')
        }
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('删除失败')
        }
      }
    },
    async handleBatchDelete() {
      if (this.selectedRows.length === 0) {
        this.$message.warning('请选择要删除的数据')
        return
      }
      try {
        await this.$confirm(`确定要删除选中的 ${this.selectedRows.length} 条数据吗？`, '提示', { type: 'warning' })
        const ids = this.selectedRows.map(row => row.topicId)
        const res = await batchDeleteTopics({ topicIds: ids })
        if (res.success) {
          this.$message.success('删除成功')
          this.fetchTableData()
        } else {
          this.$message.error(res.errorMessage || '删除失败')
        }
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('删除失败')
        }
      }
    },
    async handleStatusChange(row) {
      try {
        const res = await updateTopicStatus({ topicId: row.topicId, status: row.status })
        if (res.success) {
          this.$message.success(row.status === '0' ? '已启用' : '已停用')
        } else {
          this.$message.error(res.errorMessage || '状态切换失败')
          row.status = row.status === '0' ? '1' : '0'
        }
      } catch (e) {
        row.status = row.status === '0' ? '1' : '0'
        this.$message.error('状态切换失败')
      }
    },
    // 图片上传前校验
    beforeBannerUpload(file) {
      const isValidType = ['image/png', 'image/jpg', 'image/jpeg'].includes(file.type)
      const isLt2M = file.size / 1024 / 1024 < 2
      if (!isValidType) {
        this.$message.error('仅支持上传png、jpg格式图片')
      }
      if (!isLt2M) {
        this.$message.error('图片大小不能超过 2MB')
      }
      return isValidType && isLt2M
    },
    // 上传banner图片
    async handleBannerUpload({ file, onSuccess }) {
      try {
        this.uploading = true
        const formData = new FormData()
        formData.append('file', file)
        const response = await fileUpload(formData)
        if (response.code === 200 || response.success) {
          this.coverOssId = response.data.ossId
          this.form.coverUrl = URL.createObjectURL(file)
          this.$refs.formRef && this.$refs.formRef.validateField('coverUrl')
          onSuccess('success')
          this.$message.success('图片上传成功')
        } else {
          throw new Error(response.message || '上传失败')
        }
      } catch (error) {
        this.$message.error(error.message || '上传失败')
      } finally {
        this.uploading = false
      }
    },
    handleDialogClose() {
      this.$refs.formRef && this.$refs.formRef.resetFields()
    },
    async handleSubmit() {
      try {
        const valid = await this.$refs.formRef.validate().catch(() => false)
        if (!valid) return
        const submitData = {
          topicName: this.form.topicName,
          coverOssId: this.coverOssId,
          description: this.form.description,
          status: this.form.status
        }
        let res
        if (this.isEdit) {
          submitData.topicId = this.editId
          res = await editTopic(submitData)
        } else {
          res = await addTopic(submitData)
        }
        if (res.success) {
          this.$message.success(this.isEdit ? '更新成功' : '添加成功')
          this.dialogVisible = false
          this.fetchTableData()
        } else {
          this.$message.error(res.errorMessage || (this.isEdit ? '更新失败' : '添加失败'))
        }
      } catch (error) {
        this.$message.error('操作失败')
      }
    },
    async fetchTableData() {
      this.loading = true
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize
        }
        if (!assignSearchId(params, 'topicId', this.filterForm.topicId)) {
          this.$message.warning('话题ID格式不正确，请输入纯数字')
          return
        }
        if (this.filterForm.topicName) {
          params.topicName = this.filterForm.topicName
        }
        if (this.filterForm.isHot) {
          params.isHot = this.filterForm.isHot
        }
        if (this.filterForm.status) {
          params.status = this.filterForm.status
        }
        if (this.filterForm.dateRange && this.filterForm.dateRange.length === 2) {
          params.createStartTime = this.filterForm.dateRange[0]
          params.createEndTime = this.filterForm.dateRange[1]
        }
        const res = await getTopics(params)
        if (res.success && res.data) {
          this.tableData = res.data.rows || []
          this.pagination.total = res.data.total || 0
        } else {
          this.tableData = []
          this.pagination.total = 0
        }
      } catch (error) {
        console.error('获取话题列表失败:', error)
        this.$message.error('获取话题列表失败')
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

.banner-uploader {
  display: inline-block;
}

.banner-upload-wrapper {
  position: relative;
  display: inline-block;
}

.banner-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 120px;
  height: 120px;
  line-height: 120px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
}

.banner-image {
  width: 120px;
  height: 120px;
  display: block;
  border-radius: 6px;
  object-fit: contain;
}

::v-deep .topic-dialog .el-dialog__header {
  padding-bottom: 10px;
  border-bottom: 1px solid #e8e8e8;
}

::v-deep .topic-dialog .el-form-item__label {
  font-weight: 500;
}

::v-deep .topic-dialog .el-form-item__label::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

::v-deep .topic-dialog .el-form-item:not(.is-required) .el-form-item__label::before {
  content: '';
  margin-right: 0;
}
</style>
