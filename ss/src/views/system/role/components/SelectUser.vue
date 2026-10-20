<template>
  <el-row>
    <el-dialog :visible.sync="visible" title="选择用户" width="800px" top="5vh" append-to-body @close="handleClose">
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
      <el-row>
        <el-table ref="tableRef" :data="userList" height="260px" @row-click="clickRow"
          @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55"></el-table-column>
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
        </el-table>
        <PaginationSimple v-if="total > 0" :total="total" :current-page="queryParams.pageNum"
          :page-size="queryParams.pageSize" @pagination="handlePageChange" />
      </el-row>
      <div slot="footer">
        <div class="dialog-footer">
          <el-button type="primary" @click="handleSelectUser">确 定</el-button>
          <el-button @click="visible = false">取 消</el-button>
        </div>
      </div>
    </el-dialog>
  </el-row>
</template>

<script>
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import { authUserSelectAll, unallocatedUserList } from "@/api/role";

export default {
  name: "SelectUser",
  components: {
    PaginationSimple,
    PhoneDisplay,
  },
  props: {
    roleId: {
      type: [Number, String],
      required: true,
    },
  },
  data() {
    return {
      userList: [],
      visible: false,
      total: 0,
      userIds: [],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        roleId: undefined,
        userName: "",
        phonenumber: "",
      },
      tableRef: null,
      queryFormRef: null,
    };
  },
  methods: {
    show() {
      this.queryParams.roleId = this.roleId;
      this.getList();
      this.visible = true;
    },
    handleClose() {
      this.visible = false;
      this.userIds = [];
      this.queryParams = {
        pageNum: 1,
        pageSize: 10,
        roleId: undefined,
        userName: "",
        phonenumber: "",
      };
    },
    clickRow(row) {
      this.$refs.tableRef.toggleRowSelection(row, false);
    },
    handleSelectionChange(selection) {
      this.userIds = selection.map((item) => item.userId);
    },
    async getList() {
      try {
        const resData = await unallocatedUserList(this.queryParams);
        const res = resData.data
        this.userList = res.rows || [];
        this.total = res.total || 0;
      } catch (error) {
        console.error("获取用户列表失败:", error);
        this.$message.error("获取用户列表失败");
      }
    },
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    resetQuery() {
      if (this.queryFormRef) {
        this.queryFormRef.resetFields();
      }
      this.getList();
    },
    handlePageChange(page) {
      this.queryParams.pageNum = page;
      this.getList();
    },
    async handleSelectUser() {
      const roleId = this.queryParams.roleId;
      const ids = this.userIds.join(",");
      if (ids === "") {
        this.$message.error("请选择要分配的用户");
        return;
      }
      try {
        await authUserSelectAll({
          roleId,
          userIds: ids,
        });
        this.$message.success("分配成功");
        this.$emit("ok");
        this.visible = false;
      } catch (error) {
        console.error("分配失败:", error);
        this.$message.error("分配失败");
      }
    },
  },
};
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>
