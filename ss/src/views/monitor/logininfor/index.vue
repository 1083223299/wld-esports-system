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
        <el-button type="danger" icon="el-icon-delete" class="add-btn" :disabled="multiple" @click="handleDelete"
          v-permission="'monitor:logininfor:remove'">
          删除
        </el-button>
        <el-button type="danger" icon="el-icon-delete" class="add-btn" @click="handleClean"
          v-permission="'monitor:logininfor:remove'">
          清空
        </el-button>
        <el-button type="primary" icon="el-icon-unlock" class="add-btn" :disabled="single" @click="handleUnlock"
          v-permission="'monitor:logininfor:unlock'">
          解锁
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="infoId" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" @selection-change="handleSelectionChange"
          :default-sort="defaultSort" @sort-change="handleSortChange">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="infoId" label="访问编号" width="80"></el-table-column>
          <el-table-column prop="userName" label="用户名称" width="120" sortable="custom"
            show-overflow-tooltip></el-table-column>
          <el-table-column prop="clientKey" label="客户端" width="120" show-overflow-tooltip></el-table-column>
          <el-table-column prop="deviceType" label="设备类型" width="100">
            <template slot-scope="scope">
              <el-tag :type="getDeviceTypeTag(scope.row.deviceType)" size="small">
                {{ getDeviceTypeText(scope.row.deviceType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ipaddr" label="地址" width="130" show-overflow-tooltip></el-table-column>
          <el-table-column prop="loginLocation" label="登录地点" width="150" show-overflow-tooltip></el-table-column>
          <el-table-column prop="os" label="操作系统" width="120" show-overflow-tooltip></el-table-column>
          <el-table-column prop="browser" label="浏览器" width="100" show-overflow-tooltip></el-table-column>
          <el-table-column prop="status" label="登录状态" width="80">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === '0' ? 'success' : 'danger'" size="small">
                {{ scope.row.status === '0' ? '正常' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="msg" label="描述" show-overflow-tooltip></el-table-column>
          <el-table-column prop="loginTime" label="访问时间" width="180" sortable="custom">
            <template slot-scope="scope">
              <span>{{ formatDate(scope.row.loginTime) }}</span>
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
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { listLogininfor, delLogininfor, unlockLogininfor, cleanLogininfor } from '@/api/logininfor';

export default {
  name: "LogininforList",
  components: {
    SearchForm,
    PaginationSimple,
  },
  data() {
    return {
      // ========== 搜索表单配置 ==========
      searchItems: [
        {
          type: "input",
          prop: "ipaddr",
          label: "登录地址",
          placeholder: "请输入登录地址",
          clearable: true,
        },
        {
          type: "input",
          prop: "userName",
          label: "用户名称",
          placeholder: "请输入用户名称",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择登录状态",
          options: [
            { label: "全部", value: "" },
            { label: "正常", value: "0" },
            { label: "失败", value: "1" },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "loginTime",
          label: "登录时间",
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
        ipaddr: "",
        userName: "",
        status: "",
        startTime: "",
        endTime: "",
      },

      // 分页参数
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      // 表格数据
      tableData: [],
      loading: false,

      // 选中行
      selectedRows: [],
      single: true,
      multiple: true,
      selectNames: [],

      // 排序
      defaultSort: { prop: 'loginTime', order: 'descending' },
      sortParams: {
        orderByColumn: 'loginTime',
        isAsc: 'descending'
      },
    };
  },

  mounted() {
    this.fetchTableData();
  },


  methods: {
    // ========== 设备类型映射 ==========
    getDeviceTypeText(deviceType) {
      const map = {
        '1': '移动端',
        '2': 'PC端',
        '3': '小程序',
        '4': '其他'
      };
      return map[deviceType] || deviceType || '-';
    },

    getDeviceTypeTag(deviceType) {
      const map = {
        '1': 'warning',
        '2': 'primary',
        '3': 'success',
        '4': 'info'
      };
      return map[deviceType] || 'info';
    },

    // ========== 格式化日期 ==========
    formatDate(time) {
      if (!time) return '';
      const date = new Date(time);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    // ========== 搜索/重置 ==========
    handleSearch(e) {
      if (e) {
        this.filterForm.ipaddr = e.ipaddr || "";
        this.filterForm.userName = e.userName || "";
        this.filterForm.status = e.status || "";

        if (e.loginTime && e.loginTime.length === 2) {
          this.filterForm.startTime = e.loginTime[0];
          this.filterForm.endTime = e.loginTime[1];
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
        ipaddr: "",
        userName: "",
        status: "",
        startTime: "",
        endTime: "",
      };
      this.sortParams = {
        orderByColumn: 'loginTime',
        isAsc: 'descending'
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
          ipaddr: this.filterForm.ipaddr,
          userName: this.filterForm.userName,
          status: this.filterForm.status,
          orderByColumn: this.sortParams.orderByColumn,
          isAsc: this.sortParams.isAsc,
        };

        if (this.filterForm.startTime && this.filterForm.endTime) {
          params['params[beginTime]'] = this.filterForm.startTime;
          params['params[endTime]'] = this.filterForm.endTime;
        }

        const resData = await listLogininfor(params);
        const res = resData.data

        if (res.code === 200) {
          this.tableData = res.rows || [];
          this.pagination.total = res.total || 0;
        } else {
          this.$message.error(res.msg || "查询失败");
        }
      } catch (error) {
        console.error("获取登录日志失败:", error);
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
      this.selectedRows = selection;
      this.single = selection.length !== 1;
      this.multiple = !selection.length;
      this.selectNames = selection.map(item => item.userName);
    },

    // ========== 排序 ==========
    handleSortChange(column) {
      this.sortParams.orderByColumn = column.prop;
      this.sortParams.isAsc = column.order === 'ascending' ? 'ascending' : 'descending';
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    // ========== 删除 ==========
    async handleDelete() {
      const ids = this.selectedRows.map(item => item.infoId);
      if (ids.length === 0) {
        this.$message.warning("请选择要删除的数据");
        return;
      }

      this.$confirm(`确定要删除选中的${ids.length}条登录日志吗？`, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          const idStr = ids.join(',');
          const res = await delLogininfor(idStr);
          if (res.code === 200) {
            this.$message.success("删除成功");
            this.fetchTableData();
          } else {
            this.$message.error(res.msg || "删除失败");
          }
        } catch (error) {
          console.error("删除失败:", error);
          this.$message.error("删除失败");
        }
      }).catch(() => { });
    },

    // ========== 清空 ==========
    async handleClean() {
      this.$confirm("确定要清空所有登录日志吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          const res = await cleanLogininfor();
          if (res.code === 200) {
            this.$message.success("清空成功");
            this.fetchTableData();
          } else {
            this.$message.error(res.msg || "清空失败");
          }
        } catch (error) {
          console.error("清空失败:", error);
          this.$message.error("清空失败");
        }
      }).catch(() => { });
    },

    // ========== 解锁 ==========
    async handleUnlock() {
      if (this.selectNames.length === 0) {
        this.$message.warning("请选择要解锁的用户");
        return;
      }

      const userName = this.selectNames.join(',');
      this.$confirm(`确定要解锁用户 "${userName}" 吗？`, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          const res = await unlockLogininfor(this.selectNames);
          if (res.code === 200) {
            this.$message.success(`用户 ${userName} 解锁成功`);
            this.fetchTableData();
          } else {
            this.$message.error(res.msg || "解锁失败");
          }
        } catch (error) {
          console.error("解锁失败:", error);
          this.$message.error("解锁失败");
        }
      }).catch(() => { });
    },

    // ========== 导出 ==========
    handleExport() {
      this.$message.info("导出功能开发中");
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
