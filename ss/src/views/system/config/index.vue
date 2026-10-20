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
          v-permission="'system:config:add'">
          新增
        </el-button>
        <el-button type="success" icon="el-icon-edit" class="add-btn" :disabled="single" @click="handleEdit"
          v-permission="'system:config:edit'">
          修改
        </el-button>
        <el-button type="danger" icon="el-icon-delete" class="add-btn" :disabled="multiple" @click="handleDelete"
          v-permission="'system:config:remove'">
          删除
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="configId" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="configName" label="参数名称" width="180" :show-overflow-tooltip="true"></el-table-column>
          <el-table-column prop="configKey" label="参数键名" width="200" :show-overflow-tooltip="true"></el-table-column>
          <el-table-column prop="configValue" label="参数键值" width="200" show-overflow-tooltip></el-table-column>
          <el-table-column prop="configType" label="系统内置" width="100">
            <template slot-scope="scope">
              <el-tag :type="scope.row.configType === 'Y' ? 'success' : 'info'">
                {{ scope.row.configType === 'Y' ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" :show-overflow-tooltip="true"></el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180"></el-table-column>
          <el-table-column label="操作" fixed="right" width="120">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8"
                  v-permission="'system:config:edit'">
                  编辑
                </el-button>
                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c"
                  v-permission="'system:config:remove'">
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
      :close-on-press-escape="false" class="config-dialog" @close="closeDrawer">
      <AddForm ref="addFormRef" :edit-data="editFormData" :submitting="submitting" @submit="handleFormSubmit"
        @cancel="closeDrawer" />
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import AddForm from "./components/Add-Form.vue";
import { listConfig, getConfig, delConfig, addConfig, updateConfig } from '@/api/config';

export default {
  name: "ConfigList",
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
          prop: "configName",
          label: "参数名称",
          placeholder: "请输入参数名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "configKey",
          label: "参数键名",
          placeholder: "请输入参数键名",
          clearable: true,
        },
        {
          type: "select",
          prop: "configType",
          label: "系统内置",
          placeholder: "请选择系统内置",
          options: [
            { label: "全部", value: "" },
            { label: "是", value: "Y" },
            { label: "否", value: "N" },
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
        configName: "",
        configKey: "",
        configType: "",
        dateRange: [],
      },

      // 分页参数
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      // 表格数据
      tableData: [],
      loading: false,

      // 弹窗控制
      drawerVisible: false,
      drawerTitle: "新增参数",

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


    // ========== 构建请求参数 ==========
    buildQueryParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        configName: this.filterForm.configName,
        configKey: this.filterForm.configKey,
        configType: this.filterForm.configType,
      };

      if (this.filterForm.dateRange && this.filterForm.dateRange.length === 2) {
        params["params[beginTime]"] = this.filterForm.dateRange[0];
        params["params[endTime]"] = this.filterForm.dateRange[1];
      }

      return params;
    },

    // ========== 数据请求 ==========
    async fetchTableData() {
      this.loading = true;
      try {
        const params = this.buildQueryParams();
        const resData = await listConfig(params);
        const res = resData.data;

        if (res.code === 200) {
          this.tableData = res.rows || [];
          this.pagination.total = res.total || 0;
        } else {
          this.$message.error(res.msg || "查询失败");
        }
      } catch (error) {
        console.error("查询参数列表失败:", error);
        this.$message.error("查询失败，请稍后重试");
      } finally {
        this.loading = false;
      }
    },

    // ========== 搜索/重置 ==========
    handleSearch(e) {
      if (e) {
        const formValues = { ...e };
        this.filterForm.dateRange = formValues.dateRange || [];
        this.filterForm.configName = formValues.configName || "";
        this.filterForm.configKey = formValues.configKey || "";
        this.filterForm.configType = formValues.configType || "";
      }
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleReset() {
      this.filterForm = {
        configName: "",
        configKey: "",
        configType: "",
        dateRange: [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    // ========== 分页切换 ==========
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },

    // ========== 表格选择 ==========
    handleSelectionChange(selection) {
      this.selectedRows = selection;
      this.single = selection.length !== 1;
      this.multiple = !selection.length;
    },

    // ========== 新增/编辑 ==========
    handleAdd() {
      this.drawerTitle = "新增参数";
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
      console.log('row', this.selectedRows);
      if (this.selectedRows.length === 1) {
        row = this.selectedRows[0];
      }
      if (!row) {
        this.$message.warning("请选择要修改的数据");
        return;
      }

      try {
        const res = await getConfig(row.configId);

        if (res.code === 200) {
          this.drawerTitle = "编辑参数";
          this.currentRowId = row.configId;
          const formData = res.data;
          this.editFormData = formData;
          this.drawerVisible = true;
          this.$nextTick(() => {
            if (this.$refs.addFormRef) {
              this.$refs.addFormRef.resetForm();
              this.$refs.addFormRef.fillFormData(formData);
            }
          });
        } else {
          this.$message.error(res.msg || "获取详情失败");
        }
      } catch (error) {
        console.error("获取参数详情失败:", error);
        this.$message.error("获取详情失败，请稍后重试");
      }
    },

    // ========== 删除 ==========
    async handleDelete(row) {
      const ids = row ? [row.configId] : this.selectedRows.map((item) => item.configId);
      if (ids.length === 0) {
        this.$message.warning("请选择要删除的数据");
        return;
      }

      try {
        await this.$confirm("确定要删除选中的参数吗？", "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
        });

        const res = await delConfig(ids);
        if (res.code === 200) {
          this.$message.success("删除成功");
          this.fetchTableData();
        } else {
          this.$message.error(res.msg || "删除失败");
        }
      } catch (error) {
        if (error !== "cancel") {
          console.error("删除失败:", error);
          this.$message.error("删除失败，请稍后重试");
        }
      }
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
          formData.configId = this.currentRowId;
          res = await updateConfig(formData);
          if (res.code === 200) {
            this.$message.success("编辑成功");
          } else {
            throw new Error(res.msg || "编辑失败");
          }
        } else {
          // 新增
          res = await addConfig(formData);
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
