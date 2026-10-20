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
          v-permission="'monitor:operlog:remove'">
          删除
        </el-button>
        <el-button type="danger" icon="el-icon-warning" class="add-btn" @click="handleClean"
          v-permission="'monitor:operlog:remove'">
          清空
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="operId" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" @selection-change="handleSelectionChange"
          :default-sort="defaultSort" @sort-change="handleSortChange">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="operId" label="日志编号"></el-table-column>
          <el-table-column prop="title" label="系统模块" show-overflow-tooltip></el-table-column>
          <el-table-column prop="businessType" label="操作类型" width="100">
            <template slot-scope="scope">
              <el-tag :type="getBusinessTypeTag(scope.row.businessType)" size="small">
                {{ getBusinessTypeText(scope.row.businessType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="operName" label="操作人员" width="120" sortable="custom"></el-table-column>
          <el-table-column prop="deptName" label="部门" width="120" show-overflow-tooltip></el-table-column>
          <el-table-column prop="operIp" label="操作地址" width="130" show-overflow-tooltip></el-table-column>
          <el-table-column prop="status" label="操作状态" width="80">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === '0' ? 'success' : 'danger'" size="small">
                {{ scope.row.status === '0' ? '正常' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="operTime" label="操作日期" width="180" sortable="custom">
            <template slot-scope="scope">
              <span>{{ formatDate(scope.row.operTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="costTime" label="消耗时间" width="100" sortable="custom">
            <template slot-scope="scope">
              <span>{{ scope.row.costTime }}毫秒</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="80" align="center">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-tooltip content="详细" placement="top">
                  <el-button type="text" @click="handleView(scope.row)" style="color: #9047f8"
                    v-permission="'monitor:operlog:query'">
                    详细
                  </el-button>
                </el-tooltip>
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

    <!-- 操作日志详细弹窗 -->
    <el-dialog title="操作日志详细" :visible.sync="dialogVisible" width="700px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="operlog-dialog" @close="dialogVisible = false">
      <el-form :model="form" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="登录信息：">{{ form.operName }} / {{ form.deptName }} / {{ form.operIp }} / {{
              form.operLocation
            }}</el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="请求信息：">{{ form.requestMethod }} {{ form.operUrl }}</el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="操作模块：">{{ form.title }} / {{ getBusinessTypeText(form.businessType) }}</el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="操作方法：">{{ form.method }}</el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="请求参数：">{{ form.operParam }}</el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="返回参数：">{{ form.jsonResult }}</el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="操作状态：">
              <el-tag :type="form.status === '0' ? 'success' : 'danger'" size="small">
                {{ form.status === '0' ? '正常' : '失败' }}
              </el-tag>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="消耗时间：">{{ form.costTime }}毫秒</el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="操作时间：">{{ formatDate(form.operTime) }}</el-form-item>
          </el-col>
          <el-col :span="24" v-if="form.status === '1'">
            <el-form-item label="异常信息：">{{ form.errorMsg }}</el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { listOperlog, delOperlog, cleanOperlog } from '@/api/operlog';

export default {
  name: "OperlogList",
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
          prop: "operIp",
          label: "操作地址",
          placeholder: "请输入操作地址",
          clearable: true,
        },
        {
          type: "input",
          prop: "title",
          label: "系统模块",
          placeholder: "请输入系统模块",
          clearable: true,
        },
        {
          type: "input",
          prop: "operName",
          label: "操作人员",
          placeholder: "请输入操作人员",
          clearable: true,
        },
        {
          type: "select",
          prop: "businessType",
          label: "类型",
          placeholder: "请选择操作类型",
          options: this.getBusinessTypeOptions(),
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择操作状态",
          options: [
            { label: "全部", value: "" },
            { label: "正常", value: "0" },
            { label: "失败", value: "1" },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "operTime",
          label: "操作时间",
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
        operIp: "",
        title: "",
        operName: "",
        businessType: "",
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
      multiple: true,

      // 排序
      defaultSort: { prop: 'operTime', order: 'descending' },
      sortParams: {
        orderByColumn: 'operTime',
        isAsc: 'descending'
      },

      // 详细弹窗
      dialogVisible: false,
      form: {},
    };
  },

  mounted() {
    this.fetchTableData();
  },
  methods: {

    // ========== 操作类型映射 ==========
    getBusinessTypeOptions() {
      return [
        { label: "全部", value: "" },
        { label: "新增", value: "1" },
        { label: "修改", value: "2" },
        { label: "删除", value: "3" },
        { label: "导入", value: "4" },
        { label: "导出", value: "5" },
        { label: "查询", value: "6" },
        { label: "清空", value: "7" },
        { label: "登录", value: "8" },
        { label: "注销", value: "9" },
        { label: "授权", value: "10" },
      ];
    },

    getBusinessTypeText(type) {
      const map = {
        '1': '新增',
        '2': '修改',
        '3': '删除',
        '4': '导入',
        '5': '导出',
        '6': '查询',
        '7': '清空',
        '8': '登录',
        '9': '注销',
        '10': '授权'
      };
      return map[type] || type;
    },

    getBusinessTypeTag(type) {
      const map = {
        '1': 'success',
        '2': 'primary',
        '3': 'danger',
        '4': 'warning',
        '5': 'warning',
        '6': 'info',
        '7': 'danger',
        '8': 'success',
        '9': 'info',
        '10': 'primary'
      };
      return map[type] || 'info';
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
        this.filterForm.operIp = e.operIp || "";
        this.filterForm.title = e.title || "";
        this.filterForm.operName = e.operName || "";
        this.filterForm.businessType = e.businessType || "";
        this.filterForm.status = e.status || "";

        if (e.operTime && e.operTime.length === 2) {
          this.filterForm.startTime = e.operTime[0];
          this.filterForm.endTime = e.operTime[1];
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
        operIp: "",
        title: "",
        operName: "",
        businessType: "",
        status: "",
        startTime: "",
        endTime: "",
      };
      this.sortParams = {
        orderByColumn: 'operTime',
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
          operIp: this.filterForm.operIp,
          title: this.filterForm.title,
          operName: this.filterForm.operName,
          businessType: this.filterForm.businessType,
          status: this.filterForm.status,
          orderByColumn: this.sortParams.orderByColumn,
          isAsc: this.sortParams.isAsc,
        };

        if (this.filterForm.startTime && this.filterForm.endTime) {
          params['params[beginTime]'] = this.filterForm.startTime;
          params['params[endTime]'] = this.filterForm.endTime;
        }

        const resData = await listOperlog(params);
        const res = resData.data

        if (res.code == 200) {
          this.tableData = res.rows || [];
          this.pagination.total = res.total || 0;
        } else {
          this.$message.error(res.msg || "查询失败");
        }
      } catch (error) {
        console.error("获取操作日志失败:", error);
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
      this.multiple = !selection.length;
    },

    // ========== 排序 ==========
    handleSortChange(column) {
      this.sortParams.orderByColumn = column.prop;
      this.sortParams.isAsc = column.order === 'ascending' ? 'ascending' : 'descending';
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    // ========== 查看详情 ==========
    handleView(row) {
      this.form = { ...row };
      this.dialogVisible = true;
    },

    // ========== 删除 ==========
    async handleDelete() {
      const ids = this.selectedRows.map(item => item.operId);
      if (ids.length === 0) {
        this.$message.warning("请选择要删除的数据");
        return;
      }

      this.$confirm(`确定要删除选中的${ids.length}条操作日志吗？`, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          const idStr = ids.join(',');
          const res = await delOperlog(idStr);
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
      this.$confirm("确定要清空所有操作日志吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          const res = await cleanOperlog();
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
