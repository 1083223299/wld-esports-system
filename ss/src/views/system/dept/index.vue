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
          v-permission="'system:dept:add'">
          新增
        </el-button>
        <el-button type="info" icon="el-icon-sort" class="add-btn" @click="handleToggleExpandAll">
          展开/折叠
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe ref="tableRef" row-key="deptId" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }" :default-expand-all="isExpandAll">
          <el-table-column prop="deptName" label="部门名称" show-overflow-tooltip width="300"></el-table-column>
          <el-table-column prop="deptCategory" label="类别编码" align="center"></el-table-column>
          <el-table-column prop="orderNum" label="排序" align="center"></el-table-column>
          <el-table-column prop="status" label="状态" align="center">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === '0' ? 'success' : 'warning'" size="small">
                {{ scope.row.status === '0' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" align="center"></el-table-column>
          <el-table-column label="操作" fixed="right" width="200" align="center">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8"
                  v-permission="'system:dept:edit'">
                  编辑
                </el-button>
                <el-button type="text" @click="handleAddChild(scope.row)" style="color: #9047f8"
                  v-permission="'system:dept:add'">
                  新增
                </el-button>
                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c"
                  v-permission="'system:dept:remove'">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 弹窗组件 -->
    <el-dialog :title="drawerTitle" :visible.sync="drawerVisible" width="700px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="dept-dialog" @close="closeDrawer">
      <AddForm ref="addFormRef" :edit-data="editFormData" :submitting="submitting" @submit="handleFormSubmit"
        :dept-options="deptOptions" :dept-user-list="deptUserList" @cancel="closeDrawer" />
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import AddForm from "./components/Add-Form.vue";
import {
  listDept,              // 【查询】获取部门列表（支持分页和条件筛选）
  listUserByDeptId,      // 【查询】根据部门ID查询该部门下的所有用户（用于删除前校验）
  addDept,               // 【新增】添加新部门
  delDept,               // 【删除】根据部门ID删除部门（会级联删除子部门）
  getDept,               // 【查询】获取单个部门详情（用于编辑时回显数据）
  listDeptExcludeChild,  // 【查询】获取排除当前部门及其子部门后的部门树（用于上级部门选择，避免循环引用）
  updateDept             // 【修改】更新部门信息
} from '@/api/dept'
import { handleTree } from "@/utils";

export default {
  name: "DeptList",
  components: {
    SearchForm,
    AddForm,
  },
  data() {
    return {
      // ========== 搜索表单配置 ==========
      searchItems: [
        {
          type: "input",
          prop: "deptName",
          label: "部门名称",
          placeholder: "请输入部门名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "deptCategory",
          label: "类别编码",
          placeholder: "请输入类别编码",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择状态",
          options: [
            { label: "全部", value: "" },
            { label: "启用", value: "0" },
            { label: "禁用", value: "1" },
          ],
          clearable: true,
        },
      ],

      // 筛选表单数据
      filterForm: {
        deptName: "",
        deptCategory: "",
        status: "",
      },

      // 表格数据
      tableData: [],
      loading: false,

      // 弹窗控制
      drawerVisible: false,
      drawerTitle: "新增部门",

      // 编辑数据
      editFormData: {},
      submitting: false,
      currentRowId: null,

      // 展开/折叠
      isExpandAll: false,

      // 部门选项（用于上级选择）
      deptOptions: [],

      // 部门用户列表
      deptUserList: [],
    };
  },

  mounted() {
    this.getListDept();
  },


  methods: {

    // ========== 数据请求 ==========
    async getListDept() {
      this.loading = true;
      try {
        const params = {
          ...this.filterForm
        };
        const resData = await listDept(params);
        const res = resData.data
        if (res) {
          const data = handleTree(res, 'deptId');
          this.tableData = data || [];
          this.deptOptions = data || [];
        }
      } catch (error) {
        console.error("获取列表失败:", error);
        this.$message.error("获取列表失败");
      } finally {
        this.loading = false;
      }
    },

    // ========== 搜索/重置 ==========
    handleSearch(e) {
      if (e) {
        const formValues = { ...e };
        this.filterForm = {
          deptName: formValues.deptName || "",
          deptCategory: formValues.deptCategory || "",
          status: formValues.status || "",
        };
        this.getListDept();
      }
    },

    handleReset() {
      this.filterForm = {
        deptName: "",
        deptCategory: "",
        status: "",
      };
      this.getListDept();
    },

    // ========== 展开/折叠 ==========
    handleToggleExpandAll() {
      this.isExpandAll = !this.isExpandAll;
      this.toggleExpand(this.tableData, this.isExpandAll);
    },

    toggleExpand(data, expand) {
      data.forEach(item => {
        this.$refs.tableRef.toggleRowExpansion(item, expand);
        if (item.children && item.children.length > 0) {
          this.toggleExpand(item.children, expand);
        }
      });
    },

    // ========== 新增/编辑 ==========
    // 新增顶级部门
    handleAdd() {
      this.drawerTitle = "新增部门";
      this.editFormData = {
        parentId: null,  // 改为 null，让用户必须选择
        parentName: ''
      };
      this.currentRowId = null;
      this.drawerVisible = true;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
          this.$refs.addFormRef.fillFormData({
            parentId: null,
            parentName: ''
          });
        }
      });
    },

    // 新增子部门
    handleAddChild(row) {
      this.drawerTitle = "新增子部门";
      this.editFormData = {
        parentId: row.deptId,
        parentName: row.deptName
      };
      this.currentRowId = null;
      this.drawerVisible = true;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
          this.$refs.addFormRef.fillFormData({
            parentId: row.deptId,
            parentName: row.deptName
          });
        }
      });
    },
    async handleEdit(row) {
      this.drawerTitle = "编辑部门";
      this.currentRowId = row.deptId;

      try {
        const deptData = await getDept(row.deptId);
        const data = deptData.data;

        // 确保 parentId 有值
        this.editFormData = {
          ...data,
          parentId: data.parentId !== undefined && data.parentId !== null ? data.parentId : null,
        };

        // 获取部门用户列表
        await this.getDeptAllUser(row.deptId);

        // 获取排除当前部门及其子部门的部门树
        const responseData = await listDeptExcludeChild(row.deptId);
        const response = responseData.data
        if (response && response.length > 0) {
          this.deptOptions = handleTree(response, 'deptId');
        } else {
          this.deptOptions = [];
        }

        this.drawerVisible = true;
        this.$nextTick(() => {
          if (this.$refs.addFormRef) {
            this.$refs.addFormRef.resetForm();
            this.$refs.addFormRef.fillFormData(this.editFormData);
          }
        });
      } catch (error) {
        console.error("获取部门详情失败:", error);
        this.$message.error("获取部门详情失败");
      }
    },

    /** 查询当前部门的所有用户 */
    async getDeptAllUser(deptId) {
      if (deptId) {
        try {
          const res = await listUserByDeptId(deptId);
          this.deptUserList = res.data || [];
        } catch (error) {
          console.error("获取部门用户失败:", error);
          this.deptUserList = [];
        }
      }
    },

    // ========== 删除 ==========
    async handleDelete(row) {
      this.$confirm("确定要删除该部门吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        const res = await delDept(row.deptId);
        if (res.code === 200) {
          this.$message.success("删除成功");
          this.getListDept();
        } else {
          this.$message.error(res.msg || "删除失败");
        }
      }).catch(() => { });
    },

    // ========== 弹窗关闭 ==========
    closeDrawer() {
      this.drawerVisible = false;
      this.editFormData = {};
      this.currentRowId = null;
      this.submitting = false;
      this.deptUserList = [];
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
        }
      });
    },

    // ========== 表单提交 ==========
    async handleFormSubmit(formData) {
      this.submitting = true;
      try {
        if (this.currentRowId) {
          // 编辑模式
          formData.deptId = this.currentRowId;
          // 过滤后
          const filtered = this.$filterEmpty(formData);
          const res = await updateDept(filtered);
          if (res.code === 200) {
            this.$message.success("编辑成功");
          } else {
            this.$message.error(res.msg || "编辑失败");
            return;
          }
        } else {
          // 新增模式
          const filtered = this.$filterEmpty(formData);
          const res = await addDept(filtered);
          if (res.code === 200) {
            this.$message.success("新增成功");
          } else {
            this.$message.error(res.msg || "新增失败");
            return;
          }
        }
        this.closeDrawer();
        this.getListDept();
      } catch (error) {
        console.error("提交失败:", error);
        this.$message.error("提交失败");
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
  margin-top: 20px;
}

/* 卡片内容区域 */
.list-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
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