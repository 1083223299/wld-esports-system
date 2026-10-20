<template>
  <div class="list-wrapper">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule" class="search-module">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="queryForm" :gutter="20" @search="handleSearch"
        @reset="handleReset">
      </SearchForm>
    </div>

    <!-- 数据列表展示 -->
    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <el-table :data="tableData" stripe v-loading="loading" height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">

          <!-- 用户ID -->
          <el-table-column prop="userId" label="用户ID" width="120"></el-table-column>

          <!-- 用户名称 -->
          <el-table-column prop="nickName" label="用户名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.nickName || '-' }}
            </template>
          </el-table-column>

          <!-- 手机号 -->
          <el-table-column label="用户手机号" width="150">
            <template slot-scope="{ row }">
              <div class="phone-cell">
                <span>{{ formatPhone(row.phone, row.showPhone) }}</span>
                <!-- <i :class="row.showPhone ? 'el-icon-view' : 'el-icon-view'" class="phone-eye"
                  :style="{ color: row.showPhone ? '#409EFF' : '#C0C4CC' }" @click="togglePhoneShow(row)">
                </i> -->
              </div>
            </template>
          </el-table-column>

          <!-- 头像 -->
          <el-table-column label="头像" width="80">
            <template slot-scope="{ row }">
              <div class="avatar-cell" @click="previewAvatar(row)">
                <img v-if="row.avatarUrl" :src="row.avatarUrl" class="avatar-thumb" @error="handleImgError" />
                <img v-else src="@/assets/defaulIcon.png" class="avatar-thumb" />
              </div>
            </template>
          </el-table-column>

          <!-- 审核图片 -->
          <el-table-column label="审核图片" width="100">
            <template slot-scope="{ row }">
              <div class="audit-img-cell" v-if="row.url" @click="previewAuditImage(row)">
                <img :src="row.url" class="audit-img-thumb" @error="handleAuditImgError($event, row)" />
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 提交时间 -->
          <el-table-column prop="createTime" label="提交时间" width="170"></el-table-column>

          <!-- 状态 -->
          <el-table-column label="状态" width="100">
            <template slot-scope="{ row }">
              <el-tag :type="getStatusTag(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 原因 -->
          <el-table-column label="原因" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <span v-if="row.status === '4' || row.status === '5'" class="reject-reason">
                {{ row.reasonRejection || '-' }}
              </span>
              <span v-else-if="row.status === '3'" class="revoke-reason">
                用户已撤销审核
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="150" fixed="right">
            <template slot-scope="{ row }">
              <template v-if="row.status == '0'">
                <el-button type="text" style="color: #1BC286" @click="handleApprove(row)"
                  v-permission="'system:userAlbumAudit:approve'">
                  通过
                </el-button>
                <el-button type="text" style="color: #FF4D4F" @click="handleReject(row)"
                  v-permission="'system:userAlbumAudit:reject'">
                  驳回
                </el-button>
              </template>
              <template v-else-if="row.status == '1'">
                <el-button type="text" style="color: #FF4D4F" @click="handleDelete(row)"
                  v-permission="'system:userAlbumAudit:remove'">
                  删除
                </el-button>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-wrapper">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange">
        </PaginationSimple>
      </div>
    </el-card>

    <!-- 驳回弹窗 -->
    <el-dialog title="审核驳回" :visible.sync="rejectDialogVisible" width="450px" class="reject-dialog"
      :close-on-click-modal="false">
      <el-form :model="rejectForm" ref="rejectForm" :rules="rejectRules" label-width="80px">
        <el-form-item label="驳回原因" prop="reasonRejection">
          <el-input v-model="rejectForm.reasonRejection" type="textarea" :rows="4" :maxlength="50" show-word-limit
            placeholder="请输入驳回原因">
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReject" :loading="rejectLoading">确定</el-button>
      </div>
    </el-dialog>

    <!-- 删除弹窗 -->
    <el-dialog title="相册删除" :visible.sync="deleteDialogVisible" width="450px" class="reject-dialog"
      :close-on-click-modal="false">
      <el-form :model="deleteForm" ref="deleteForm" :rules="deleteRules" label-width="80px">
        <el-form-item label="删除原因" prop="deleteReason">
          <el-input v-model="deleteForm.deleteReason" type="textarea" :rows="4" :maxlength="50" show-word-limit
            placeholder="请输入删除原因">
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitDelete" :loading="deleteLoading">确定</el-button>
      </div>
    </el-dialog>

    <!-- 头像预览 -->
    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />

    <!-- 审核图片预览 -->
    <ImgZoom v-model="auditImgDialogVisible" :img-list="[previewAuditImgUrl]" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import checkPermission from "@/utils/checkPermission";
import { listUserPhotoAlbum, updateUserPhotoAlbumStatus, deleteUserPhotoAlbum } from "@/api/userAlbumAudit";

export default {
  name: 'UserAlbumAuditList',
  components: {
    SearchForm,
    PaginationSimple,
    ImgZoom,
  },
  data() {
    return {
      // 筛选表单
      queryForm: {
        userId: '',
        nickName: '',
        phone: '',
        status: '',
        createTime: []
      },

      // 搜索表单配置项
      searchItems: [
        {
          type: "input",
          prop: "userId",
          label: "用户ID",
          placeholder: "请输入用户ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "nickName",
          label: "用户名称",
          placeholder: "请输入用户名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "phone",
          label: "用户手机号",
          placeholder: "请输入用户手机号",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "待审核", value: "0" },
            { label: "已通过", value: "1" },
            { label: "驳回", value: "4" },
            { label: "已撤销", value: "3" },
            { label: "已删除", value: "5" },
          ],
          clearable: true,
        },
        {
          type: "daterange-no-time",
          prop: "createTime",
          label: "提交时间",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          valueFormat: "yyyy-MM-dd",
          clearable: true,
        },
      ],

      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      // 驳回弹窗
      rejectDialogVisible: false,
      rejectLoading: false,
      currentRow: null,
      rejectForm: {
        reasonRejection: ''
      },
      rejectRules: {
        reasonRejection: [
          { required: true, message: '请输入驳回原因', trigger: 'blur' },
          { max: 50, message: '驳回原因不能超过50个字符', trigger: 'blur' }
        ]
      },

      // 删除弹窗
      deleteDialogVisible: false,
      deleteLoading: false,
      deleteForm: {
        deleteReason: ''
      },
      deleteRules: {
        deleteReason: [
          { required: true, message: '请输入删除原因', trigger: 'blur' },
          { max: 50, message: '删除原因不能超过50个字符', trigger: 'blur' }
        ]
      },

      // 头像预览
      avatarDialogVisible: false,
      previewAvatarUrl: '',

      // 审核图片预览
      auditImgDialogVisible: false,
      previewAuditImgUrl: '',
    }
  },

  mounted() {
    this.fetchTableData();
  },

  methods: {
    checkPermission,

    // ==================== 数据获取 ====================
    async fetchTableData() {
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          userId: this.queryForm.userId || undefined,
          nickName: this.queryForm.nickName || undefined,
          phone: this.queryForm.phone || undefined,
          status: this.queryForm.status || undefined,
          createTime: this.queryForm.createTime ? this.queryForm.createTime[0] : '',
          endTime: this.queryForm.createTime ? this.queryForm.createTime[1] : ''
        };

        // 处理日期范围
        // if (this.queryForm.createTime && this.queryForm.createTime.length === 2) {
        //   params.createTime = this.queryForm.createTime;
        // }

        Object.keys(params).forEach(key => {
          if (params[key] === undefined || params[key] === '') {
            delete params[key];
          }
        });

        const res = await listUserPhotoAlbum(params);

        if (res.success) {
          const data = res.data;
          this.tableData = (data.rows || []).map(item => ({
            ...item,
            showPhone: false
          }));
          this.pagination.total = data.total || 0;
        } else {
          this.$message.error(res.errorMessage || '查询失败');
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        console.error("获取列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
        this.$message.error("获取数据失败，请稍后重试");
      } finally {
        this.loading = false;
      }
    },

    // ==================== 搜索/重置 ====================
    handleSearch(e) {
      if (e) {
        this.queryForm = { ...this.queryForm, ...e };
      }
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleReset() {
      this.queryForm = {
        userId: '',
        nickName: '',
        phone: '',
        status: '',
        createTime: []
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData();
    },

    // ==================== 手机号处理 ====================
    togglePhoneShow(row) {
      row.showPhone = !row.showPhone;
    },

    formatPhone(phone, show) {
      if (!phone) return '-';
      if (show) return phone;
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    },

    // ==================== 头像处理 ====================
    previewAvatar(row) {
      if (row.avatarUrl) {
        this.previewAvatarUrl = row.avatarUrl;
        this.avatarDialogVisible = true;
      } else {
        this.$message.warning('头像不存在');
      }
    },

    handleImgError(e) {
      e.target.src = require('@/assets/defaulIcon.png');
      e.target.onerror = null;
    },

    // ==================== 审核图片处理 ====================
    previewAuditImage(row) {
      if (row.url) {
        this.previewAuditImgUrl = row.url;
        this.auditImgDialogVisible = true;
      }
    },

    handleAuditImgError(e) {
      e.target.src = require('@/assets/defaulIcon.png');
      e.target.onerror = null;
    },

    // ==================== 状态处理 ====================
    getStatusText(status) {
      const map = {
        '0': '待审核',
        '1': '已通过',
        '2': '机审核存疑',
        '3': '已撤销',
        '4': '驳回',
        '5': '已删除'
      };
      return map[status] || status;
    },

    getStatusTag(status) {
      const map = {
        '0': 'warning',
        '1': 'success',
        '2': 'info',
        '3': 'info',
        '4': 'danger'
      };
      return map[status] || 'info';
    },

    // ==================== 审核操作 ====================
    handleApprove(row) {
      this.$confirm('确定要通过该用户相册审核吗？', '审核通过', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }).then(async () => {
        try {
          const res = await updateUserPhotoAlbumStatus({
            photoId: row.photoId,
            status: '1'
          });
          if (res.success) {
            this.$message.success('审核通过');
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || '操作失败');
          }
        } catch (error) {
          console.error("审核通过失败:", error);
          this.$message.error("操作失败，请稍后重试");
        }
      }).catch(() => { });
    },

    handleReject(row) {
      this.currentRow = row;
      this.rejectForm.reasonRejection = '';
      this.rejectDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.rejectForm) {
          this.$refs.rejectForm.clearValidate();
        }
      });
    },

    submitReject() {
      this.$refs.rejectForm.validate(async (valid) => {
        if (!valid) return;

        this.rejectLoading = true;
        try {
          const res = await updateUserPhotoAlbumStatus({
            photoId: this.currentRow.photoId,
            status: '4',
            reasonRejection: this.rejectForm.reasonRejection
          });
          if (res.success) {
            this.$message.success('已驳回');
            this.rejectDialogVisible = false;
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || '操作失败');
          }
        } catch (error) {
          console.error("驳回失败:", error);
          this.$message.error("操作失败，请稍后重试");
        } finally {
          this.rejectLoading = false;
        }
      });
    },

    // ==================== 删除操作 ====================
    handleDelete(row) {
      this.currentRow = row;
      this.deleteForm.deleteReason = '';
      this.deleteDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.deleteForm) {
          this.$refs.deleteForm.clearValidate();
        }
      });
    },

    submitDelete() {
      this.$refs.deleteForm.validate(async (valid) => {
        if (!valid) return;

        this.deleteLoading = true;
        try {
          const res = await deleteUserPhotoAlbum({
            photoId: this.currentRow.photoId,
            deleteReason: this.deleteForm.deleteReason
          });
          if (res.success) {
            this.$message.success('删除成功');
            this.deleteDialogVisible = false;
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || '删除失败');
          }
        } catch (error) {
          console.error("删除失败:", error);
          this.$message.error("删除失败，请稍后重试");
        } finally {
          this.deleteLoading = false;
        }
      });
    }
  }
}
</script>

<style scoped lang="scss">
.list-wrapper {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-module {
  flex-shrink: 0;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: 20px;

  ::v-deep .el-card__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px;
  }
}

.table-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.pagination-wrapper {
  flex-shrink: 0;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #EBEEF5;
  display: flex;
  justify-content: flex-end;
}

// 手机号单元格
.phone-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  .phone-eye {
    font-size: 16px;
    cursor: pointer;
    transition: color 0.3s;

    &:hover {
      color: #409EFF !important;
    }
  }
}

// 头像单元格
.avatar-cell {
  display: flex;
  justify-content: center;
  cursor: pointer;

  .avatar-thumb {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}

// 审核图片单元格
.audit-img-cell {
  display: flex;
  justify-content: center;
  cursor: pointer;

  .audit-img-thumb {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    object-fit: cover;
    border: 1px solid #EBEEF5;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  }
}

// 驳回原因
.reject-reason {
  color: #FF4D4F;
}

// 撤销原因
.revoke-reason {
  color: #909399;
}

// 标签样式
.el-tag {
  border-width: 0;
}

.el-tag--success {
  background-color: rgba(27, 194, 134, 0.1);
  color: #1BC286;
}

.el-tag--warning {
  background-color: rgba(255, 129, 7, 0.1);
  color: #FF8107;
}

.el-tag--danger {
  background-color: rgba(255, 77, 79, 0.1);
  color: #FF4D4F;
}

.el-tag--info {
  background-color: rgba(144, 147, 153, 0.1);
  color: #909399;
}

// 驳回弹窗
.reject-dialog {
  ::v-deep .el-dialog__body {
    padding: 20px 24px;
  }
}

.dialog-footer {
  text-align: right;

  .el-button {
    min-width: 80px;
  }
}
</style>
