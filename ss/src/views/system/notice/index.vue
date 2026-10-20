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
      <!-- 固定顶部：操作按钮区域 -->
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
          v-permission="'system:notice:add'">
          新增
        </el-button>
        <el-button type="success" icon="el-icon-edit" class="add-btn" :disabled="single" @click="handleEdit"
          v-permission="'system:notice:edit'">
          修改
        </el-button>
        <el-button type="danger" icon="el-icon-delete" class="add-btn" :disabled="selectedRows.length === 0"
          @click="handleDelete()" v-permission="'system:notice:remove'">
          删除
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="noticeId" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="noticeTitle" label="公告标题" min-width="180" show-overflow-tooltip></el-table-column>
          <el-table-column prop="noticeType" label="公告类型" width="100">
            <template slot-scope="scope">
              <el-tag :type="getNoticeTypeTag(scope.row.noticeType)">
                {{ getNoticeTypeText(scope.row.noticeType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template slot-scope="scope">
              <el-switch v-model="scope.row.status" active-color="#8F03FF" active-value="0" inactive-value="1"
                @change="statusChange(scope.row)">
              </el-switch>
            </template>
          </el-table-column>
          <el-table-column prop="createByName" label="创建者" width="120"></el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180"></el-table-column>
          <el-table-column label="操作" fixed="right" width="120">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8"
                  v-permission="'system:notice:edit'">
                  编辑
                </el-button>
                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c"
                  v-permission="'system:notice:remove'">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 固定底部：分页区域 -->
      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 弹窗组件 -->
    <el-dialog :title="drawerTitle" :visible.sync="drawerVisible" width="780px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="notice-dialog" @close="closeDrawer">
      <AddForm ref="addFormRef" :edit-data="editFormData" :submitting="submitting" @submit="handleFormSubmit"
        @cancel="closeDrawer" />
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import AddForm from "./components/Add-Form.vue";
import { listNotice, getNotice, delNotice, addNotice, updateNotice } from '@/api/notice';

export default {
  name: "NoticeList",
  components: {
    SearchForm,
    AddForm,
    PaginationSimple,
  },
  data() {
    return {
      // ========== 搜索表单配置 ==========
      searchItems: [
        {
          type: "input",
          prop: "noticeTitle",
          label: "公告标题",
          placeholder: "请输入公告标题",
          clearable: true,
        },
        {
          type: "input",
          prop: "createByName",
          label: "操作人员",
          placeholder: "请输入操作人员",
          clearable: true,
        },
        {
          type: "select",
          prop: "noticeType",
          label: "类型",
          placeholder: "公告类型",
          options: [
            { label: "全部", value: "" },
            { label: "通知", value: "1" },
            { label: "公告", value: "2" },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "createTime",
          label: "创建时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          pickerOptions: {
            shortcuts: [
              {
                text: "最近一周",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 7);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
              {
                text: "最近一个月",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 30);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
            ],
          },
        },
      ],

      // 筛选表单数据
      filterForm: {
        noticeTitle: "",
        createByName: "",
        noticeType: "",
        startTime: "",
        endTime: "",
      },

      // 分页参数
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      // 表格数据
      tableData: [],
      loading: false,

      // 弹窗控制
      drawerVisible: false,
      drawerTitle: "新增公告",

      // 编辑数据
      editFormData: {},
      submitting: false,
      currentRowId: null,

      // 选中行
      selectedRows: [],
      single: true,
      multiple: true,
    };
  },

  mounted() {
    this.fetchTableData();
  },


  methods: {

    // ========== 公告类型处理 ==========
    getNoticeTypeText(type) {
      const map = { 1: "通知", 2: "公告" };
      return map[type] || type;
    },

    getNoticeTypeTag(type) {
      const map = { 1: "info", 2: "warning" };
      return map[type] || "";
    },

    // ========== 搜索/重置 ==========
    handleSearch(e) {
      if (e) {
        const formValues = { ...e };
        this.filterForm.noticeTitle = formValues.noticeTitle || "";
        this.filterForm.createByName = formValues.createByName || "";
        this.filterForm.noticeType = formValues.noticeType || "";

        if (formValues.createTime && formValues.createTime.length === 2) {
          this.filterForm.startTime = formValues.createTime[0];
          this.filterForm.endTime = formValues.createTime[1];
        } else {
          this.filterForm.startTime = "";
          this.filterForm.endTime = "";
        }
        this.pagination.pageNum = 1;
        this.fetchTableData();
      }
    },

    handleReset() {
      this.filterForm = {
        noticeTitle: "",
        createByName: "",
        noticeType: "",
        startTime: "",
        endTime: "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    // ========== 数据请求 ==========
    async fetchTableData() {
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          noticeTitle: this.filterForm.noticeTitle,
          createByName: this.filterForm.createByName,
          noticeType: this.filterForm.noticeType,
        };

        if (this.filterForm.startTime && this.filterForm.endTime) {
          params['params[beginTime]'] = this.filterForm.startTime;
          params['params[endTime]'] = this.filterForm.endTime;
        }

        const resData = await listNotice(params);
        const res = resData.data;

        if (res.code === 200) {
          this.tableData = res.rows || [];
          this.pagination.total = res.total || 0;
          if (res.rows && res.rows.length > 0) {
            console.log('表格数据结构:', res.rows[0]);
          }
        } else {
          this.$message.error(res.msg || "查询失败");
        }
      } catch (error) {
        console.error("获取公告列表失败:", error);
        this.$message.error("获取数据失败");
      } finally {
        this.loading = false;
      }
    },

    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },

    handleSelectionChange(selection) {
      console.log('选择事件触发，选中行数:', selection.length);
      this.selectedRows = selection;
      this.single = selection.length !== 1;
      this.multiple = !selection.length;
      console.log('更新后状态 - single:', this.single, 'multiple:', this.multiple);
      if (selection.length > 0) {
        console.log('选中行数据结构:', selection[0]);
      }
    },

    // ========== 状态切换 ==========
    async statusChange(row) {
      try {
        const res = await updateNotice({ noticeId: row.noticeId, status: row.status });
        if (res.code === 200) {
          this.$message.success(row.status === "0" ? "启用成功" : "禁用成功");
        } else {
          row.status = row.status === "0" ? "1" : "0";
          this.$message.error(res.msg || "状态修改失败");
        }
      } catch (error) {
        console.error("状态修改失败:", error);
        row.status = row.status === "0" ? "1" : "0";
        this.$message.error("状态修改失败");
      }
    },

    // ========== 新增/编辑 ==========
    handleAdd() {
      this.drawerTitle = "新增公告";
      this.editFormData = {};
      this.currentRowId = null;
      this.drawerVisible = true;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
        }
      });
    },

    async handleEdit(row) {
      if (this.selectedRows.length === 1) {
        row = this.selectedRows[0];
      }
      if (!row) {
        this.$message.warning("请选择要修改的数据");
        return;
      }

      this.drawerTitle = "编辑公告";
      this.currentRowId = row.noticeId;

      try {
        const resData = await getNotice(row.noticeId);
        const res = resData.data;
        console.log('获取到的公告详情:', res);

        if (resData.code === 200) {
          // 直接传递 res 数据，因为 res 本身就包含公告信息
          this.editFormData = res;
          console.log('设置到 editFormData:', this.editFormData);

          this.drawerVisible = true;

          // 等待弹窗打开后再填充表单
          this.$nextTick(() => {
            if (this.$refs.addFormRef) {
              // 确保表单组件有 fillFormData 方法
              this.$refs.addFormRef.fillFormData(res);
            }
          });
        } else {
          this.$message.error(res.msg || "获取详情失败");
        }
      } catch (error) {
        console.error("获取公告详情失败:", error);
        this.$message.error("获取详情失败");
      }
    },

    // ========== 删除 ==========
    async handleDelete(row) {
      let ids = [];
      // 检查row是否为有效数据行（包含noticeId）
      if (row && row.noticeId) {
        // 单行删除
        ids = [row.noticeId];
      } else {
        // 批量删除
        ids = this.selectedRows.filter(item => item.noticeId).map(item => item.noticeId);
      }

      if (!ids || ids.length === 0) {
        this.$message.warning("请选择要删除的数据");
        return;
      }

      this.$confirm("确定要删除选中的公告吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          const res = await delNotice(ids);
          if (res.code === 200) {
            this.$message.success("删除成功");
            await this.fetchTableData();
          } else {
            this.$message.error(res.msg || "删除失败");
          }
        } catch (error) {
          console.error("删除失败:", error);
          this.$message.error("删除失败");
        }
      }).catch(() => { });
    },

    // ========== 弹窗关闭 ==========
    closeDrawer() {
      this.drawerVisible = false;
      this.editFormData = {};
      this.currentRowId = null;
      this.submitting = false;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
        }
      });
    },

    // ========== 提交表单 ==========
    async handleFormSubmit(formData) {
      this.submitting = true;

      try {
        let res;
        if (this.currentRowId) {
          // 编辑
          res = await updateNotice(formData);
          if (res.code === 200) {
            this.$message.success("编辑成功");
          } else {
            throw new Error(res.msg || "编辑失败");
          }
        } else {
          // 新增
          res = await addNotice(formData);
          if (res.code === 200) {
            this.$message.success("新增成功");
          } else {
            throw new Error(res.msg || "新增失败");
          }
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
/* 页面容器 */
.container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 列表卡片 */
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

/* 操作栏 */
.action-bar-fixed {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 20px;
}

/* 表格包裹层 - 核心滚动区域 */
.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
  position: relative;
}

/* 分页区域 */
.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>
