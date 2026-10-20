<template>
  <div class="container">
    <el-row :gutter="20" class="user-row">
      <!-- 左侧部门树 -->
      <el-col :xl="4" :lg="4" :md="4" :sm="4" :xs="4" class="dept-col">
        <el-card class="dept-card" shadow="never">
          <el-input v-model="deptName" placeholder="请输入部门名称" prefix-icon="el-icon-search" clearable size="small" />
          <div class="dept-tree-wrapper">
            <el-tree ref="deptTreeRef" class="dept-tree" node-key="id" :data="deptOptions"
              :props="{ label: 'label', children: 'children' }" :expand-on-click-node="false"
              :filter-node-method="filterNode" highlight-current default-expand-all @node-click="handleNodeClick">
              <span slot-scope="{ node, data }" class="custom-tree-node">
                <span>{{ node.label }}</span>
              </span>
            </el-tree>
          </div>
        </el-card>
      </el-col>
      <el-col :xl="20" :lg="20" :md="20" :sm="20" :xs="20" class="user-col">
        <!-- 筛选查询区 -->
        <div ref="responsiveModule">
          <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
            @search="handleSearch" @reset="handleReset">
          </SearchForm>
        </div>

        <el-card class="list-card" shadow="never">
          <div class="action-bar-fixed">
            <el-button type="primary" icon="el-icon-plus" @click="handleAdd" v-permission="'system:user:add'">
              新增
            </el-button>
            <el-button type="success" icon="el-icon-edit" :disabled="single" @click="handleEdit"
              v-permission="'system:user:edit'">
              修改
            </el-button>
            <el-button type="danger" icon="el-icon-delete" :disabled="multiple" @click="handleDelete"
              v-permission="'system:user:remove'">
              删除
            </el-button>
          </div>

          <div class="table-wrapper">
            <!-- 移除 :height 属性，让表格自动撑满 -->
            <el-table :data="tableData" stripe row-key="userId" v-loading="loading" :border="false"
              :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
              :header-cell-style="{ textAlign: 'center' }" @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="55"></el-table-column>
              <el-table-column prop="userName" label="用户名称" show-overflow-tooltip></el-table-column>
              <el-table-column prop="nickName" label="用户昵称" show-overflow-tooltip></el-table-column>
              <el-table-column prop="deptName" label="部门" show-overflow-tooltip>
                <template slot-scope="scope">
                  {{ scope.row.deptName || (scope.row.dept && scope.row.dept.deptName) || '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="phone" label="手机号码">
                <template slot-scope="scope">
                  <PhoneDisplay :value="scope.row.phone" />
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态">
                <template slot-scope="scope">
                  <el-switch v-model="scope.row.status" :disabled="scope.row.userName === 'wld-admin'"
                    active-color="#8F03FF" active-value="0" inactive-value="1" @change="statusChange(scope.row)">
                  </el-switch>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="创建时间"></el-table-column>
              <el-table-column label="操作" fixed="right" width="280">
                <template slot-scope="scope">
                  <div class="action-buttons" v-if="scope.row.userName !== 'wld-admin'">
                    <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8"
                      v-permission="'system:user:edit'">
                      编辑
                    </el-button>
                    <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c"
                      v-permission="'system:user:remove'">
                      删除
                    </el-button>
                    <el-button type="text" @click="handleResetPassword(scope.row)" style="color: #9047f8"
                      v-permission="'system:user:resetPwd'">
                      重置密码
                    </el-button>
                    <el-button type="text" @click="handleAuthRole(scope.row)" style="color: #9047f8"
                      v-permission="'system:user:allocate'">
                      分配角色
                    </el-button>
                  </div>
                  <div class="action-buttons" v-else>
                    <span>-</span>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="pagination-fixed">
            <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize"
              :total="pagination.total" @current-change="handleCurrentChange" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 弹窗部分保持不变 -->
    <el-dialog :title="drawerTitle" :visible.sync="drawerVisible" width="800px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="user-dialog" @close="closeDrawer">
      <AddForm ref="addFormRef" :edit-data="editFormData" :dept-options="deptOptions" :post-options="postOptions"
        :role-options="roleOptions" :submitting="submitting" @submit="handleFormSubmit" @cancel="closeDrawer" />
    </el-dialog>

    <el-dialog :title="authRoleTitle" :visible.sync="authRoleVisible" width="500px" :close-on-click-modal="false"
      :close-on-press-escape="false" @close="handleAuthRoleClose">
      <el-form ref="authRoleFormRef" :model="authRoleForm" :rules="authRoleRules" label-width="100px">
        <el-form-item label="用户昵称">
          <el-input v-model="authRoleNickName" disabled></el-input>
        </el-form-item>
        <el-form-item label="登录账号">
          <el-input v-model="authRoleUserName" disabled></el-input>
        </el-form-item>
        <el-form-item label="分配角色" prop="roleIds">
          <el-select v-model="authRoleForm.roleIds" multiple placeholder="请选择角色" style="width: 100%">
            <el-option v-for="role in roleOptions" :key="role.roleId" :label="role.roleName"
              :value="role.roleId"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div class="form-footer">
        <el-button @click="authRoleVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAuthRole">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import AddForm from "./components/Add-Form.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import {
  getUserList,
  getUser,
  postUserAdd,
  putUserEdit,
  deleteUser,
  putUserStatus,
  resetUserPassword,
  getDeptTree,
  getPostList,
  getRoleListForUser,
  getAuthRole,
  updateAuthRole,
} from "@/api/systemUser";

export default {
  name: "UserList",
  components: {
    SearchForm,
    AddForm,
    PaginationSimple,
    PhoneDisplay,
  },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "userName",
          label: "用户名称",
          placeholder: "请输入用户名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "phone",
          label: "手机号码",
          placeholder: "请输入手机号码",
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
          prop: "createTimeRange",
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

      filterForm: {
        userName: "",
        phone: "",
        status: "",
        createTimeRange: [],
      },

      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      tableData: [],
      loading: false,
      drawerVisible: false,
      drawerTitle: "新增用户",
      editFormData: {},
      submitting: false,
      currentRowId: null,
      selectedRows: [],
      single: true,
      multiple: true,
      deptName: "",
      deptOptions: [],
      postOptions: [],
      roleOptions: [],
      authRoleVisible: false,
      authRoleTitle: "",
      authRoleUserId: null,
      authRoleUserName: "",
      authRoleNickName: "",
      authRoleIds: [],
      authRoleForm: {
        roleIds: []
      },
      authRoleRules: {
        roleIds: [
          { required: true, message: '请至少选择一个角色', trigger: 'change' },
          { type: 'array', min: 1, message: '请至少选择一个角色', trigger: 'change' }
        ]
      },
    };
  },
  watch: {
    deptName(val) {
      this.$refs.deptTreeRef.filter(val);
    },
  },
  mounted() {
    this.fetchDeptTree();
    this.fetchTableData();
  },
  methods: {
    // 获取部门树请求
    async fetchDeptTree() {
      try {
        const res = await getDeptTree();
        if (res.code == 200) {
          const deptData = res.data;
          this.deptOptions = deptData;
        }
      } catch (error) {
        console.error("获取部门树失败:", error);
      }
    },

    // 获取岗位列表
    // async fetchPostList() {
    //   try {
    //     const res = await getPostList();
    //     if (res.data.code == 200) {
    //       const postData = res.data.rows;
    //       this.postOptions = postData;
    //     }
    //   } catch (error) {
    //     console.error("获取岗位列表失败:", error);
    //   }
    // },

    filterNode(value, data) {
      if (!value) return true;
      return data.label.indexOf(value) !== -1;
    },

    handleNodeClick(data) {
      this.filterForm.deptId = data.id;
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    // 搜索
    handleSearch(e) {
      if (e) {
        const formValues = { ...e };
        if (formValues.createTimeRange && formValues.createTimeRange.length === 2) {
          this.filterForm.startTime = formValues.createTimeRange[0];
          this.filterForm.endTime = formValues.createTimeRange[1];
        } else {
          this.filterForm.startTime = "";
          this.filterForm.endTime = "";
        }
        this.filterForm.userName = formValues.userName || "";
        this.filterForm.phone = formValues.phone || "";
        this.filterForm.status = formValues.status || "";
        this.pagination.pageNum = 1;
        this.fetchTableData();
      }
    },

    // 重置
    handleReset() {
      this.filterForm = {
        userName: "",
        phone: "",
        status: "",
        createTimeRange: [],
        startTime: "",
        endTime: "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    // 获取用户列表
    async fetchTableData() {
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          userName: this.filterForm.userName,
          phone: this.filterForm.phone,
          status: this.filterForm.status,
          deptId: this.filterForm.deptId,
        };

        if (this.filterForm.startTime && this.filterForm.endTime) {
          params['params[beginTime]'] = this.filterForm.startTime;
          params['params[endTime]'] = this.filterForm.endTime;
        }

        const res = await getUserList(params);
        if (res.data.code === 200) {
          this.tableData = res.data.rows;
          this.pagination.total = res.data.total || 0;
        }
      } catch (error) {
        console.error("获取用户列表失败:", error);
        this.$message.error("获取用户列表失败");
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

    async handleAdd() {
      const resData = await getUser('');
      const res = resData.data
      const allRoles = res.roles || [];
      const allPosts = res.posts || [];
      this.roleOptions = allRoles;
      this.postOptions = allPosts;

      this.drawerTitle = "新增用户";
      this.editFormData = {};
      this.currentRowId = null;
      this.drawerVisible = true;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
        }
      });
    },

    // 编辑按钮
    async handleEdit(row) {
      if (this.selectedRows.length == 1) {
        row = this.selectedRows[0];
      }
      if (!row) {
        this.$message.warning("请选择要修改的数据");
        return;
      }

      this.drawerTitle = "修改用户";
      this.currentRowId = row.userId;

      try {
        const resData = await getUser(row.userId);
        const res = resData.data

        if (res) {
          const allRoles = res.roles || [];
          const allPosts = res.posts || [];
          this.roleOptions = allRoles;
          this.postOptions = allPosts;

          const userData = res.user;

          const formData = {
            userId: userData.userId,
            deptId: userData.deptId,
            userName: userData.userName || "",
            nickName: userData.nickName || "",
            phone: userData.phone || "",
            email: userData.email || "",
            sex: userData.sex ? String(userData.sex) : "0",
            status: userData.status ? String(userData.status) : "0",
            remark: userData.remark || "",
            roleIds: res.roleIds || [],
            postIds: res.postIds || [],
          };
          this.editFormData = formData;
          this.drawerVisible = true;
          this.$nextTick(() => {
            if (this.$refs.addFormRef) {
              this.$refs.addFormRef.resetForm();
              this.$refs.addFormRef.fillFormData(formData);
            }
          });
        } else {
          this.$message.error("获取用户详情失败");
        }
      } catch (error) {
        console.error("获取用户详情失败:", error);
        this.$message.error("获取用户详情失败");
      }
    },

    // 删除按钮
    async handleDelete(row) {
      let ids;
      if (row && row.userId) {
        ids = [row.userId];
      } else {
        ids = this.selectedRows.map((item) => item.userId);
      }

      const validIds = ids.filter(id => id !== undefined && id !== null && id !== "");

      if (!validIds || validIds.length === 0) {
        this.$message.warning("请选择要删除的用户");
        return;
      }

      this.$confirm("确定要删除选中的用户吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            let res;
            if (validIds.length === 1) {
              res = await deleteUser(validIds[0]);
            } else {
              res = await deleteUser(validIds.join(","));
            }

            if (res.code === 200) {
              this.$message.success("删除成功");
              this.fetchTableData();
            } else {
              this.$message.error(res.msg || "删除失败");
            }
          } catch (error) {
            console.error("删除用户失败:", error);
            this.$message.error("删除失败");
          }
        })
        .catch(() => { });
    },

    // 重置密码
    async handleResetPassword(row) {
      this.$prompt("请输入新密码", "重置密码", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        inputPattern: /^.{5,20}$/,
        inputErrorMessage: "用户密码长度必须介于 5 和 20 之间",
      })
        .then(async ({ value }) => {
          try {
            const res = await resetUserPassword({
              userId: row.userId,
              password: value,
            });
            if (res.code === 200) {
              this.$message.success("重置密码成功，新密码为：" + value);
            } else {
              this.$message.error(res.msg || "重置密码失败");
            }
          } catch (error) {
            console.error("重置密码失败:", error);
            this.$message.error("重置密码失败");
          }
        })
        .catch(() => { });
    },

    // 分配角色按钮
    handleAuthRole(row) {
      this.authRoleTitle = "分配角色";
      this.authRoleUserId = row.userId;
      this.authRoleNickName = row.nickName;
      this.authRoleUserName = row.userName;
      this.fetchAuthRoleData();
      this.authRoleVisible = true;

      this.$nextTick(() => {
        if (this.$refs.authRoleFormRef) {
          this.$refs.authRoleFormRef.clearValidate();
        }
      });
    },

    // 获取用户角色
    async fetchAuthRoleData() {
      try {
        const resData = await getAuthRole(this.authRoleUserId);
        const res = resData.data

        const allRoles = res.roles || [];
        const allPosts = res.posts || [];
        this.roleOptions = allRoles;
        this.postOptions = allPosts;
        console.log('roleOptions', this.roleOptions);


        let roleIds = [];
        if (res.user && res.user.roles && res.user.roles.length > 0) {
          roleIds = res.user.roles.map(role => role.roleId);
        }

        this.authRoleIds = roleIds;
        this.authRoleForm.roleIds = [...roleIds];
      } catch (error) {
        console.error("获取用户角色失败:", error);
        this.$message.error("获取用户角色失败");
        this.authRoleIds = [];
        this.authRoleForm.roleIds = [];
      }
    },

    // 分配角色确定事件
    async submitAuthRole() {
      if (this.$refs.authRoleFormRef) {
        try {
          await this.$refs.authRoleFormRef.validate();
        } catch (error) {
          return;
        }
      }

      const roleIds = this.authRoleForm.roleIds;

      if (!roleIds || roleIds.length === 0) {
        this.$message.warning("请至少选择一个角色");
        return;
      }

      try {
        const userId = this.authRoleUserId;
        const roleIdsStr = roleIds.join(',');

        const params = {
          userId: userId,
          roleIds: roleIdsStr
        };

        const res = await updateAuthRole(params);

        if (res.code === 200 || (res.data && res.data.code === 200)) {
          this.$message.success("分配角色成功");
          this.handleAuthRoleClose();
          this.fetchTableData();
        } else {
          this.$message.error(res.msg || "分配角色失败");
        }
      } catch (error) {
        console.error("分配角色失败:", error);
        this.$message.error("分配角色失败");
      }
    },

    // 关闭分配角色弹窗
    handleAuthRoleClose() {
      this.authRoleVisible = false;
      this.authRoleForm.roleIds = [];
      this.authRoleIds = [];
      this.$nextTick(() => {
        if (this.$refs.authRoleFormRef) {
          this.$refs.authRoleFormRef.clearValidate();
          this.$refs.authRoleFormRef.resetFields();
        }
      });
    },

    // 切换用户状态
    async statusChange(row) {
      try {
        const res = await putUserStatus({
          userId: row.userId,
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

    // 弹窗关闭事件
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

    // 提交表单
    async handleFormSubmit(formData) {
      this.submitting = true;

      try {
        let res;
        if (this.currentRowId !== null) {
          formData.userId = this.currentRowId;
          const filtered = this.$filterEmpty(formData);
          res = await putUserEdit(filtered);

          if (res.code == 200) {
            this.$message.success("修改成功");
          } else {
            this.$message.error(res.data.errorMessage || "修改失败");
            return;
          }
        } else {
          const filtered = this.$filterEmpty(formData);
          res = await postUserAdd(filtered);
          if (res.code == 200) {
            this.$message.success("新增成功");
          } else {
            this.$message.error(res.data.errorMessage || "新增失败");
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

/* 左右两列布局 */
.user-row {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

/* 左侧部门树列 */
.dept-col {
  height: 100%;
  min-width: 220px;
  overflow: hidden;
}

.dept-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 14px;
}

.dept-tree-wrapper {
  flex: 1;
  overflow: auto;
  margin-top: 10px;
}

/* 右侧用户列 */
.user-col {
  flex: 1;
  min-height: 0;
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

/* 操作按钮栏 */
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

.form-footer {
  padding: 20px 0;
  display: flex;
  justify-content: center;
  gap: 20px;
}
</style>
