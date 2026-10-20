<template>
  <div class="auth-user-container">
    <div v-show="showSearch" class="search">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="用户名称" prop="userName">
          <el-input v-model="queryParams.userName" placeholder="请输入用户名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="手机号码" prop="phonenumber">
          <el-input v-model="queryParams.phonenumber" placeholder="请输入手机号码" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-card shadow="never">
      <div slot="header">
        <el-row :gutter="10">
          <el-col :span="1.5">
            <el-button type="primary" icon="el-icon-plus" @click="openSelectUser">添加用户</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" icon="el-icon-finished" :disabled="multiple" @click="cancelAuthUserAll">
              批量取消授权
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button icon="el-icon-close" @click="handleClose">关闭</el-button>
          </el-col>
          <el-col :span="1.5" style="float: right">
            <el-button icon="el-icon-search" circle @click="showSearch = !showSearch" />
          </el-col>
        </el-row>
      </div>
      <el-table v-loading="loading" :data="userList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="用户名称" prop="userName" :show-overflow-tooltip="true" />
        <el-table-column label="用户昵称" prop="nickName" :show-overflow-tooltip="true" />
        <el-table-column label="邮箱" prop="email" :show-overflow-tooltip="true" />
        <el-table-column label="手机" prop="phonenumber" :show-overflow-tooltip="true">
          <template slot-scope="scope">
            <PhoneDisplay :value="scope.row.phonenumber" />
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center" prop="status">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '0' ? 'success' : 'danger'">
              {{ scope.row.status === '0' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180">
          <template slot-scope="scope">
            <span>{{ scope.row.createTime }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="cancelAuthUser(scope.row)">取消授权</el-button>
          </template>
        </el-table-column>
      </el-table>

      <PaginationSimple v-show="total > 0" :total="total" :current-page="queryParams.pageNum"
        :page-size="queryParams.pageSize" @current-change="handlePageChange" />

      <SelectUser ref="selectRef" :role-id="queryParams.roleId" @ok="handleQuery" />
    </el-card>
  </div>
</template>

<script>
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import SelectUser from "./SelectUser.vue";
import {
  allocatedUserList,
  authUserCancel,
  authUserCancelAll,
} from "@/api/role";

export default {
  name: "AuthUser",
  components: {
    PaginationSimple,
    PhoneDisplay,
    SelectUser,
  },
  props: {
    roleId: {
      required: true,
    },
  },
  watch: {
    // // 监听 roleId 变化，重新请求数据
    roleId: {
      handler(newVal) {
        if (newVal) {
          this.queryParams.roleId = newVal
          this.getList();
        }
      },
      immediate: true, // 立即执行
    },
  },
  data() {
    return {
      userList: [],
      loading: true,
      showSearch: true,
      multiple: true,
      total: 0,
      userIds: [],
      queryFormRef: null,
      selectRef: null,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        roleId: this.roleId,
        userName: "",
        phonenumber: "",
      },
    };
  },
  mounted() {
    this.getList();
  },
  methods: {
    async getList() {
      this.loading = true;
      try {
        console.log(this.queryParams);

        const resData = await allocatedUserList(this.queryParams);
        const res = resData.data

        this.userList = res.rows || [];
        this.total = res.total || 0;
        this.loading = false;
      } catch (error) {
        console.error("获取用户列表失败:", error);
        this.loading = false;
        this.$message.error("获取用户列表失败");
      }
    },
    handleClose() {
      this.$emit("close");
    },
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    resetQuery() {
      if (this.$refs.queryFormRef) {
        this.$refs.queryFormRef.resetFields();
      }
      this.handleQuery();
    },
    handleSelectionChange(selection) {
      this.userIds = selection.map((item) => item.userId);
      this.multiple = !selection.length;
    },
    handlePageChange(page) {
      this.queryParams.pageNum = page;
      this.getList();
    },
    openSelectUser() {
      this.$refs.selectRef.show();
    },
    async cancelAuthUser(row) {
      this.$confirm("确认要取消该用户\"" + row.userName + "\"角色吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            await authUserCancel({
              userId: row.userId,
              roleId: this.queryParams.roleId,
            });
            this.$message.success("取消授权成功");
            this.getList();
          } catch (error) {
            console.error("取消授权失败:", error);
            this.$message.error("取消授权失败");
          }
        })
        .catch(() => { });
    },
    async cancelAuthUserAll() {
      const roleId = this.queryParams.roleId;
      const uIds = this.userIds.join(",");
      this.$confirm("是否取消选中用户授权数据项?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            await authUserCancelAll({
              roleId: roleId,
              userIds: uIds,
            });
            this.$message.success("取消授权成功");
            this.getList();
          } catch (error) {
            console.error("取消授权失败:", error);
            this.$message.error("取消授权失败");
          }
        })
        .catch(() => { });
    },
  },
};
</script>

<style scoped>
.auth-user-container {
  padding: 8px;
}

.search {
  padding: 18px 18px 0;
  background-color: #fff;
  margin-bottom: 10px;
}
</style>
