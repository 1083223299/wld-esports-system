<template>
  <div class="container">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        :confirm-reset="true"
        confirm-reset-message="确定要重置所有筛选条件吗？"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <div class="action-bar-fixed">
        <el-button
          type="primary"
          icon="el-icon-plus"
          class="add-btn"
          @click="handleAdd"
          v-permission="'system:noticeAnnouncement:add'"
        >
          新增公告
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          row-key="id"
          v-loading="loading"
          :border="false"
          height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column label="序号" width="80">
            <template slot-scope="scope">
              {{ getIndex(scope.$index) }}
            </template>
          </el-table-column>
          <el-table-column prop="title" label="公告标题" min-width="180" show-overflow-tooltip />
          <el-table-column label="公告类型" width="110">
            <template slot-scope="scope">
              <el-tag :type="getNoticeTypeTag(scope.row.noticeType)">
                {{ getNoticeTypeText(scope.row.noticeType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="operatorName" label="操作人员" width="140" />
          <el-table-column label="发布属性及时间" min-width="200">
            <template slot-scope="scope">
              <div class="publish-cell">
                <el-tag :type="getPublishTag(scope.row)" size="small">
                  {{ getPublishText(scope.row) }}
                </el-tag>
                <span class="publish-time">{{ scope.row.sendTime || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="140">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button
                  type="text"
                  style="color: #9047f8"
                  @click="handleEdit(scope.row)"
                  v-permission="'system:noticeAnnouncement:edit'"
                >
                  编辑
                </el-button>
                <el-button
                  type="text"
                  style="color: #f56c6c"
                  @click="handleDelete(scope.row)"
                  v-permission="'system:noticeAnnouncement:remove'"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页区域 -->
      <div class="pagination-fixed">
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-drawer
      :title="drawerTitle"
      :visible.sync="drawerVisible"
      direction="rtl"
      size="720px"
      custom-class="announcement-dialog"
      :before-close="closeDrawer"
    >
    
      <div class="announcement-dialog__panel">
        <AddForm
          ref="addFormRef"
          :edit-data="editFormData"
          :submitting="submitting"
          @submit="handleFormSubmit"
          @cancel="closeDrawer"
        />
      </div>
    </el-drawer>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import AddForm from "./components/Add-Form.vue";
import {
  listNoticeAnnouncement,
  getNoticeAnnouncement,
  addNoticeAnnouncement,
  updateNoticeAnnouncement,
  delNoticeAnnouncement,
} from "@/api/noticeAnnouncement";

export default {
  name: "NoticeAnnouncementList",
  components: {
    SearchForm,
    PaginationSimple,
    AddForm,
  },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "title",
          label: "公告标题",
          placeholder: "请输入公告标题",
          clearable: true,
        },
        {
          type: "input",
          prop: "operatorName",
          label: "操作人员",
          placeholder: "请输入操作人/昵称",
          clearable: true,
        },
        {
          type: "select",
          prop: "noticeType",
          label: "公告类型",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "通知", value: "1" },
            { label: "公告", value: "2" },
            { label: "活动", value: "3" },
          ],
          clearable: true,
        },
        {
          type: "daterange-no-time",
          prop: "sendTime",
          label: "发布时间",
          valueFormat: "yyyy-MM-dd",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          allowFutureDate: true,
        },
      ],
      filterForm: {
        title: "",
        operatorName: "",
        noticeType: "",
        sendTime: [],
      },
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      tableData: [],
      loading: false,
      drawerVisible: false,
      drawerTitle: "新增公告",
      editFormData: {},
      submitting: false,
      currentRowId: null,
      noticeTypeMap: {
        "1": { text: "通知", tag: "info" },
        "2": { text: "公告", tag: "warning" },
        "3": { text: "活动", tag: "success" },
      },
    };
  },
  created() {
    this.fetchTableData();
  },
  methods: {
    getIndex(index) {
      return (this.pagination.pageNum - 1) * this.pagination.pageSize + index + 1;
    },
    getNoticeTypeText(type) {
      return (this.noticeTypeMap[type] && this.noticeTypeMap[type].text) || type || "-";
    },
    getNoticeTypeTag(type) {
      return (this.noticeTypeMap[type] && this.noticeTypeMap[type].tag) || "info";
    },
    getPublishText(row) {
      const map = { 0: "待发送", 1: "已发布", 2: "推送中" };
      return map[row.publishStatus] || "待发送";
    },
    getPublishTag(row) {
      const map = { 0: "info", 1: "success", 2: "warning" };
      return map[row.publishStatus] || "info";
    },
    normalizeListRes(res) {
      const data = res && res.data !== undefined ? res.data : res;
      if (Array.isArray(data)) return { rows: data, total: data.length };
      const rows = data && (data.rows || data.list || data.records);
      if (Array.isArray(rows)) return { rows, total: data.total || data.count || rows.length };
      return { rows: [], total: 0 };
    },
    handleSearch(e) {
      if (!e) return;
      const formValues = { ...e };
      this.filterForm.title = formValues.title || "";
      this.filterForm.operatorName = formValues.operatorName || "";
      this.filterForm.noticeType = formValues.noticeType || "";
      if (formValues.sendTime && formValues.sendTime.length === 2) {
        this.filterForm.sendTimeStart = formValues.sendTime[0];
        this.filterForm.sendTimeEnd = formValues.sendTime[1];
      } else {
        this.filterForm.sendTimeStart = "";
        this.filterForm.sendTimeEnd = "";
      }
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
        title: "",
        operatorName: "",
        noticeType: "",
        sendTimeStart: "",
        sendTimeEnd: "",
        sendTime: [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          title: this.filterForm.title,
          operatorName: this.filterForm.operatorName,
          noticeType: this.filterForm.noticeType,
        };
        if (this.filterForm.sendTimeStart && this.filterForm.sendTimeEnd) {
          params.sendTimeStart = this.filterForm.sendTimeStart;
          params.sendTimeEnd = this.filterForm.sendTimeEnd;
        }
        const res = await listNoticeAnnouncement(params);
        const { rows, total } = this.normalizeListRes(res);
        this.tableData = rows;
        this.pagination.total = total;
      } catch (error) {
        console.error("获取通知公告列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },
    handleAdd() {
      this.drawerTitle = "新增公告";
      this.editFormData = {};
      this.currentRowId = null;
      this.drawerVisible = true;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) this.$refs.addFormRef.resetForm();
      });
    },
    async handleEdit(row) {
      this.drawerTitle = "编辑公告";
      this.currentRowId = row.id;
      this.editFormData = {};
      try {
        const data = await getNoticeAnnouncement(row.id);
        const detail = data && data.data !== undefined ? data.data : data;
        this.editFormData = { id: row.id, ...(detail || {}) };
        this.drawerVisible = true;
        this.$nextTick(() => {
          if (this.$refs.addFormRef) this.$refs.addFormRef.fillFormData(this.editFormData);
        });
      } catch (error) {
        console.error("获取通知公告详情失败:", error);
        this.$message.error("获取详情失败");
      }
    },
    handleDelete(row) {
      this.$confirm("确定要删除该公告吗？删除后 IM 列表将移除该通知。", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            await delNoticeAnnouncement(row.id);
            this.$message.success("删除成功");
            this.fetchTableData();
          } catch (error) {
            console.error("删除失败:", error);
            this.$message.error("删除失败");
          }
        })
        .catch(() => {});
    },
    closeDrawer() {
      this.drawerVisible = false;
      this.editFormData = {};
      this.currentRowId = null;
      this.submitting = false;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) this.$refs.addFormRef.resetForm();
      });
    },
    async handleFormSubmit(formData) {
      this.submitting = true;
      try {
        const payload = { ...formData };
        if (this.currentRowId) {
          payload.id = this.currentRowId;
          await updateNoticeAnnouncement(payload);
          this.$message.success("编辑成功");
        } else {
          await addNoticeAnnouncement(payload);
          this.$message.success("新增成功，保存并推送 IM 系统通知");
        }
        this.closeDrawer();
        this.fetchTableData();
      } catch (error) {
        console.error("提交失败:", error);
        this.$message.error(error.message || "操作失败，请稍后重试");
      } finally {
        this.submitting = false;
      }
    },
  },
};
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
::v-deep .el-form-item.is-required > .el-form-item__label::before,
::v-deep .el-form-item.is-required > .el-form-item__label-wrap .el-form-item__label::before {
  display: none !important;
}
::v-deep .el-form--label-top .el-form-item__label {
    padding: 0;
}
.action-bar-fixed {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 20px;
}

.add-btn {
  background: #6a35ff;
  border: none;
}

.add-btn:hover {
  background: #7b38d9;
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

.publish-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.publish-time {
  font-size: 12px;
  color: #909399;
}
</style>

<style>
/* 弹窗精美样式（el-dialog 渲染在最外层，需非 scoped） */
.announcement-dialog {
  /* border-radius: 24px; */
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(52, 38, 91, 0.28) !important;
  display: flex;
  flex-direction: column;
  height: 74vh;
}

.announcement-dialog .el-dialog__header {
  position: relative;
  margin: 0;
  padding: 22px 28px;
  background:
    radial-gradient(circle at top right, rgba(161, 92, 255, 0.16), transparent 42%),
    radial-gradient(circle at top left, rgba(111, 61, 255, 0.1), transparent 38%),
    linear-gradient(135deg, #f8f3ff 0%, #fdfbff 100%);
  border-bottom: 1px solid #ece5fb;
}

.announcement-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: #34265b;
  letter-spacing: 0.5px;
}

.announcement-dialog .el-dialog__headerbtn {
  top: 18px;
  right: 22px;
}

.announcement-dialog .el-dialog__headerbtn .el-dialog__close {
  color: #8b79b5;
  font-size: 20px;
}

.announcement-dialog .el-dialog__headerbtn:hover .el-dialog__close {
  color: #9047f8;
}

.announcement-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #fcfaff 0%, #ffffff 100%);
}

.announcement-dialog .announcement-dialog__panel {
  height: 100%;
  padding: 8px 0 22px;
  box-sizing: border-box;
}
</style>