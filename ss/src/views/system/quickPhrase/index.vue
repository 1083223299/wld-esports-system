<template>
  <div class="container">
    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 固定顶部：操作按钮区域 -->
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
          v-permission="'system:quickPhrase:add'">
          新增
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">
          <el-table-column prop="fromUser" label="发送方" width="200">
            <template slot-scope="scope">
              <el-tag :type="getFromUserTag(scope.row.fromUser)">
                {{ getFromUserText(scope.row.fromUser) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="快捷语内容" min-width="200" show-overflow-tooltip></el-table-column>

          <el-table-column prop="sort" label="优先级" width="200"></el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="200"></el-table-column>
          <el-table-column label="操作" fixed="right" width="200">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8"
                  v-permission="'system:quickPhrase:edit'">
                  编辑
                </el-button>
                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c"
                  v-permission="'system:quickPhrase:remove'">
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
    <el-dialog :title="drawerTitle" :visible.sync="drawerVisible" width="500px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="quickPhrase-dialog" @close="closeDrawer">
      <AddForm ref="addFormRef" :edit-data="editFormData" :submitting="submitting" @submit="handleFormSubmit"
        @cancel="closeDrawer" />
    </el-dialog>
  </div>
</template>

<script>
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import AddForm from "./components/Add-Form.vue";
import { listQuickPhrase, getQuickPhrase, deleteQuickPhrase, addQuickPhrase, updateQuickPhrase } from '@/api/quickPhrase';

export default {
  name: "QuickPhraseList",
  components: {
    AddForm,
    PaginationSimple,
  },
  data() {
    return {
      // 分页参数
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      // 表格数据
      tableData: [],
      loading: false,

      // 弹窗控制
      drawerVisible: false,
      drawerTitle: "新增快捷语",

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

    // ========== 发送方处理 ==========
    getFromUserText(fromUser) {
      const map = { 0: "用户", 1: "搭档" };
      return map[fromUser] || fromUser;
    },

    getFromUserTag(fromUser) {
      const map = { 0: "info", 1: "warning" };
      return map[fromUser] || "";
    },

    // ========== 数据请求 ==========
    async fetchTableData() {
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize
        };

        const resData = await listQuickPhrase(params);
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
        console.error("获取快捷语列表失败:", error);
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

    // ========== 新增/编辑 ==========
    handleAdd() {
      this.drawerTitle = "新增快捷语";
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

      this.drawerTitle = "编辑快捷语";
      this.currentRowId = row.id;

      try {
        const resData = await getQuickPhrase(row.id);
        const res = resData.data;
        console.log('获取到的快捷语详情:', res);

        if (resData.code === 200) {
          // 直接传递 res 数据，因为 res 本身就包含快捷语信息
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
        console.error("获取快捷语详情失败:", error);
        this.$message.error("获取详情失败");
      }
    },

    // ========== 删除 ==========
    async handleDelete(row) {
      let ids = [];
      // 检查row是否为有效数据行（包含id）
      if (row && row.id) {
        // 单行删除
        ids = [row.id];
      } else {
        // 批量删除
        ids = this.selectedRows.filter(item => item.id).map(item => item.id);
      }

      if (!ids || ids.length === 0) {
        this.$message.warning("请选择要删除的数据");
        return;
      }

      this.$confirm("确定要删除选中的快捷语吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          // 遍历删除每个快捷语
          for (const id of ids) {
            const res = await deleteQuickPhrase(id);
            if (res.code !== 200) {
              throw new Error(res.msg || "删除失败");
            }
          }
          this.$message.success("删除成功");
          await this.fetchTableData();
        } catch (error) {
          console.error("删除失败:", error);
          this.$message.error(error.message || "删除失败");
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
          res = await updateQuickPhrase(formData);
          if (res.code === 200) {
            this.$message.success("编辑成功");
          } else {
            throw new Error(res.msg || "编辑失败");
          }
        } else {
          // 新增
          res = await addQuickPhrase(formData);
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
