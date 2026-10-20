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
          v-permission="'system:role:add'">
          新增
        </el-button>
        <el-button type="success" icon="el-icon-edit" class="add-btn" :disabled="single" @click="handleEdit"
          v-permission="'system:role:edit'">
          修改
        </el-button>
        <el-button type="danger" icon="el-icon-delete" class="add-btn" :disabled="multiple" @click="handleDelete"
          v-permission="'system:role:remove'">
          删除
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="roleId" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" @selection-change="handleSelectionChange">
          <!-- 多选框 -->
          <el-table-column type="selection" width="55"></el-table-column>
          <!-- 角色编号 -->
          <el-table-column prop="roleId" label="角色编号"></el-table-column>
          <!-- 角色名称 -->
          <el-table-column prop="roleName" label="角色名称" show-overflow-tooltip></el-table-column>
          <!-- 权限字符 -->
          <el-table-column prop="roleKey" label="权限字符" show-overflow-tooltip></el-table-column>
          <!-- 显示顺序 -->
          <el-table-column prop="roleSort" label="显示顺序"></el-table-column>
          <!-- 状态 -->
          <el-table-column prop="status" label="状态">
            <template slot-scope="scope">
              <el-switch v-model="scope.row.status" active-color="#8F03FF" active-value="0" inactive-value="1"
                @change="statusChange(scope.row)">
              </el-switch>
            </template>
          </el-table-column>
          <!-- 创建时间 -->
          <el-table-column prop="createTime" label="创建时间"></el-table-column>
          <!-- 操作按钮 -->
          <el-table-column label="操作" fixed="right" width="280">
            <template slot-scope="scope">
              <div class="action-buttons" v-if="scope.row.roleKey !== 'superadmin'">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8"
                  v-permission="'system:role:edit'">
                  编辑
                </el-button>
                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c"
                  v-permission="'system:role:remove'">
                  删除
                </el-button>
                <el-button type="text" @click="handleDataScope(scope.row)" style="color: #9047f8"
                  v-permission="'system:role:dataScope'">
                  数据权限
                </el-button>
                <el-button type="text" @click="handleAuthUser(scope.row)" style="color: #9047f8"
                  v-permission="'system:role:authUser'">
                  分配用户
                </el-button>
              </div>
              <div class="action-buttons" v-else>
                <span>-</span>
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

    <!-- 新增/编辑角色弹窗 -->
    <el-dialog :title="drawerTitle" :visible.sync="drawerVisible" width="600px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="role-dialog" @close="closeDrawer">
      <AddForm ref="addFormRef" :edit-data="editFormData" :menu-options="menuOptions" :checked-keys="checkedKeys"
        :submitting="submitting" @submit="handleFormSubmit" @cancel="closeDrawer" />
    </el-dialog>

    <!-- 数据权限弹窗 -->
    <el-dialog :title="dataScopeTitle" :visible.sync="dataScopeVisible" width="600px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="data-scope-dialog" @close="closeDataScopeDrawer">
      <DataScopeForm ref="dataScopeFormRef" :edit-data="dataScopeFormData" :submitting="submitting"
        @submit="handleDataScopeSubmit" @cancel="closeDataScopeDrawer" />
    </el-dialog>

    <!-- 分配用户弹窗 -->
    <el-dialog :title="authUserTitle" :visible.sync="authUserVisible" width="900px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="auth-user-dialog" @close="closeAuthUserDrawer">
      <AuthUserForm ref="authUserFormRef" :role-id="authUserRoleId" @close="closeAuthUserDrawer" />
    </el-dialog>
  </div>
</template>

<script>
// 组件导入
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import AddForm from "./components/Add-Form.vue";
import DataScopeForm from "./components/DataScope-Form.vue";
import AuthUserForm from "./components/AuthUser-Form.vue";

// API 导入
import {
  getRoleList,      // 获取角色列表
  getRole,          // 获取角色详情
  deleteRole,       // 删除角色
  putRoleEdit,      // 编辑角色
  postRoleAdd,      // 新增角色
  putRoleStatus,    // 修改角色状态
  dataScope,        // 数据权限分配
} from "@/api/role";
import { getMenuTree as getMenuTreeFromMenu, getTreeselect } from "@/api/menu";

export default {
  name: "RoleList",
  components: {
    SearchForm,
    AddForm,
    DataScopeForm,
    AuthUserForm,
    PaginationSimple,
  },
  data() {
    return {
      // ========== 搜索表单配置 ==========
      searchItems: [
        {
          type: "input",
          prop: "roleName",
          label: "角色名称",
          placeholder: "请输入角色名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "roleKey",
          label: "权限字符",
          placeholder: "请输入权限字符",
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
        {
          type: "daterange",
          prop: "dateRange",
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
          clearable: true,
        },
      ],

      // 筛选表单数据
      filterForm: {
        roleName: "",
        roleKey: "",
        status: "",
        dateRange: [],
      },

      // 分页参数
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      // 表格数据
      tableData: [],
      loading: false,


      // 弹窗控制
      drawerVisible: false,
      drawerTitle: "新增角色",

      // 编辑数据
      editFormData: {},
      submitting: false,
      currentRowId: null,

      // 选中行
      selectedRows: [],
      single: true,
      multiple: true,

      // 菜单权限相关
      menuOptions: [],
      checkedKeys: [],

      // 数据权限弹窗
      dataScopeVisible: false,
      dataScopeTitle: "分配数据权限",
      dataScopeFormData: {},

      // 分配用户弹窗
      authUserVisible: false,
      authUserTitle: "分配用户",
      authUserRoleId: null,
    };
  },

  mounted() {
    this.fetchTableData();
  },


  methods: {

    // ========== 菜单树相关 ==========
    async fetchMenuTree(roleId) {
      try {
        const resData = await getMenuTreeFromMenu(roleId);
        const res = resData.data
        if (res.menus && res.menus.length > 0) {
          this.menuOptions = res.menus || [];
        }
        if (res.checkedKeys) {
          this.checkedKeys = res.checkedKeys || [];
        }
      } catch (error) {
        console.error("获取菜单树失败:", error);
      }
    },

    async fetchMenuTreeForAdd() {
      try {
        const resData = await getTreeselect();
        const res = resData.data
        if (res && res.length > 0) {
          this.menuOptions = res || [];
        }
        this.checkedKeys = [];
      } catch (error) {
        console.error("获取菜单树失败:", error);
      }
    },

    filterNode(value, data) {
      if (!value) return true;
      return data.label.indexOf(value) !== -1;
    },

    handleNodeClick(data) {
      this.filterForm.deptId = data.id;
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    // ========== 搜索/重置 ==========
    handleSearch(e) {
      if (e) {
        const formValues = { ...e };
        this.filterForm.roleName = formValues.roleName || "";
        this.filterForm.roleKey = formValues.roleKey || "";
        this.filterForm.status = formValues.status || "";
        this.filterForm.dateRange = formValues.dateRange || [];
        this.pagination.pageNum = 1;
        this.fetchTableData();
      }
    },

    handleReset() {
      this.filterForm = {
        roleName: "",
        roleKey: "",
        status: "",
        dateRange: [],
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
          roleName: this.filterForm.roleName,
          roleKey: this.filterForm.roleKey,
          status: this.filterForm.status,
        };

        if (this.filterForm.dateRange && this.filterForm.dateRange.length === 2) {
          params["params[beginTime]"] = this.filterForm.dateRange[0];
          params["params[endTime]"] = this.filterForm.dateRange[1];
        }

        const resData = await getRoleList(params);
        const res = resData.data;

        if (res.code === 200) {
          this.tableData = res.rows || res.data || [];
          this.pagination.total = res.total || 0;
        }
      } catch (error) {
        console.error("获取角色列表失败:", error);
        this.$message.error("获取角色列表失败");
      } finally {
        this.loading = false;
      }
    },

    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },

    handleSelectionChange(selection) {
      this.selectedRows = selection;
      this.single = selection.length !== 1;
      this.multiple = !selection.length;
    },

    // ========== 新增/编辑 ==========
    handleAdd() {
      this.drawerTitle = "新增角色";
      this.editFormData = {};
      this.currentRowId = null;
      this.drawerVisible = true;
      this.fetchMenuTreeForAdd();
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
        }
      });
    },

    handleEdit(row) {
      if (!row.roleId && this.selectedRows.length === 1) {
        row = this.selectedRows[0];
      }
      if (!row.roleId) {
        this.$message.warning("请选择要修改的数据");
        return;
      }

      this.drawerTitle = "修改角色";
      this.currentRowId = row.roleId;
      this.fetchMenuTree(row.roleId);

      const formData = { ...row };
      this.editFormData = formData;
      this.drawerVisible = true;

      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
          this.$refs.addFormRef.fillFormData(formData);
        }
      });
    },

    closeDrawer() {
      this.drawerVisible = false;
      this.editFormData = {};
      this.currentRowId = null;
      this.submitting = false;
      this.menuOptions = [];
      this.checkedKeys = [];
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
        }
      });
    },

    async handleFormSubmit(formData) {
      this.submitting = true;

      try {
        let res;
        if (this.currentRowId) {
          formData.roleId = this.currentRowId;

          // 过滤后
          // const filtered = this.$filterEmpty(formData);
          res = await putRoleEdit(formData);
          if (res.code === 200) {
            this.$message.success("修改成功");
          } else {
            this.$message.error(res.msg || "修改失败");
            return;
          }
        } else {

          // 过滤后
          const filtered = this.$filterEmpty(formData);
          res = await postRoleAdd(formData);
          if (res.code === 200) {
            this.$message.success("新增成功");
          } else {
            this.$message.error(res.msg || "新增失败");
            return;
          }
        }

        this.closeDrawer();
        this.fetchTableData();
      } catch (error) {
        console.error("提交失败:", error);
        this.$message.error("提交失败");
      } finally {
        this.submitting = false;
      }
    },

    // ========== 删除 ==========
    async handleDelete(row) {
      let ids;
      if (row && row.roleId) {
        ids = [row.roleId];
      } else {
        ids = this.selectedRows.map((item) => item.roleId);
      }

      const validIds = ids.filter(id => id !== undefined && id !== null && id !== "");

      if (!validIds || validIds.length === 0) {
        this.$message.warning("请选择要删除的数据");
        return;
      }

      this.$confirm("确定要删除选中的角色吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          let res;
          if (validIds.length === 1) {
            res = await deleteRole(validIds[0]);
          } else {
            res = await deleteRole(validIds.join(","));
          }

          if (res.code === 200) {
            this.$message.success("删除成功");
            this.fetchTableData();
          } else {
            this.$message.error(res.msg || "删除失败");
          }
        } catch (error) {
          console.error("删除角色失败:", error);
          this.$message.error("删除失败");
        }
      }).catch(() => { });
    },

    // ========== 状态切换 ==========
    async statusChange(row) {
      try {
        const res = await putRoleStatus({
          roleId: row.roleId,
          status: row.status,
        });
        if (res.code === 200) {
          this.$message.success(row.status == "1" ? "禁用成功" : "启用成功");
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

    // ========== 数据权限 ==========
    async handleDataScope(row) {
      if (!row.roleId && this.selectedRows.length === 1) {
        row = this.selectedRows[0];
      }
      if (!row.roleId) {
        this.$message.warning("请选择要修改的数据");
        return;
      }

      this.dataScopeTitle = "分配数据权限";
      try {
        const resData = await getRole(row.roleId);
        const res = resData.data;
        if (res && res.roleId) {

          const formData = { ...res };
          this.dataScopeFormData = formData;
          this.dataScopeVisible = true;
          this.$nextTick(() => {
            if (this.$refs.dataScopeFormRef) {
              this.$refs.dataScopeFormRef.resetForm();
              this.$refs.dataScopeFormRef.fillFormData(formData);
            }
          });
        }
      } catch (error) {
        console.error("获取角色详情失败:", error);
        this.$message.error("获取角色详情失败");
      }
    },

    closeDataScopeDrawer() {
      this.dataScopeVisible = false;
      this.dataScopeFormData = {};
      this.$nextTick(() => {
        if (this.$refs.dataScopeFormRef) {
          this.$refs.dataScopeFormRef.resetForm();
        }
      });
    },

    async handleDataScopeSubmit(formData) {
      this.submitting = true;
      try {
        const res = await dataScope(formData);
        if (res.code === 200) {
          this.$message.success("数据权限分配成功");
          this.closeDataScopeDrawer();
          this.fetchTableData();
        } else {
          this.$message.error(res.msg || "数据权限分配失败");
        }
      } catch (error) {
        console.error("数据权限分配失败:", error);
        this.$message.error("数据权限分配失败");
      } finally {
        this.submitting = false;
      }
    },

    // ========== 分配用户 ==========
    handleAuthUser(row) {
      if (!row.roleId && this.selectedRows.length === 1) {
        row = this.selectedRows[0];
      }
      if (!row.roleId) {
        this.$message.warning("请选择要修改的数据");
        return;
      }

      this.authUserTitle = "分配用户";
      this.authUserRoleId = row.roleId;
      this.authUserVisible = true;
    },

    closeAuthUserDrawer() {
      this.authUserVisible = false;
      this.authUserRoleId = null;
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
