<template>
  <div class="container">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
        @search="handleSearch" @reset="handleReset" />
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 操作按钮栏 -->
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
          v-permission="'system:dict:add'">
          新增
        </el-button>
        <el-button type="success" icon="el-icon-edit" class="add-btn" :disabled="single" @click="handleEdit"
          v-permission="'system:dict:edit'">
          修改
        </el-button>
        <el-button type="danger" icon="el-icon-delete" class="add-btn" :disabled="multiple" @click="handleDelete"
          v-permission="'system:dict:remove'">
          删除
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="dictId" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="dictName" label="字典名称" width="180"></el-table-column>
          <el-table-column prop="dictType" label="字典类型" width="180">
            <template slot-scope="scope">
              <el-link type="primary" @click="handleViewData(scope.row)">
                {{ scope.row.dictType }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" show-overflow-tooltip></el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180"></el-table-column>
          <el-table-column label="操作" fixed="right" width="120">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8"
                  v-permission="'system:dict:edit'">
                  编辑
                </el-button>
                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c"
                  v-permission="'system:dict:remove'">
                  删除
                </el-button>
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

    <!-- 弹窗组件 -->
    <el-dialog :title="drawerTitle" :visible.sync="drawerVisible" width="500px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="dict-dialog" @close="closeDrawer">
      <AddForm ref="addFormRef" :edit-data="editFormData" :submitting="submitting" @submit="handleFormSubmit"
        @cancel="closeDrawer" />
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import AddForm from "./components/AddForm.vue";
import { listDict, addDict, updateDict, delDict } from "@/api/dict";

export default {
  name: "DictList",
  components: {
    SearchForm,
    AddForm,
    PaginationSimple,
  },
  inject: ['switchToList', 'handleSwitchToData', 'getSharedData'],
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "dictName",
          label: "字典名称",
          placeholder: "请输入字典名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "dictType",
          label: "字典类型",
          placeholder: "请输入字典类型",
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
      filterForm: {
        dictName: "",
        dictType: "",
        dateRange: [],
      },
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      tableData: [],
      loading: false,
      drawerVisible: false,
      drawerTitle: "新增字典",
      editFormData: {},
      submitting: false,
      currentRowId: null,
      selectedRows: [],
      single: true,
      multiple: true,
    };
  },
  created() {
    this.fetchTableData();
  },
  mounted() {
  },
  methods: {

    handleSearch(e) {
      if (e) {
        this.filterForm.dictName = e.dictName || "";
        this.filterForm.dictType = e.dictType || "";
        this.filterForm.dateRange = e.dateRange || [];
        this.pagination.pageNum = 1;
        this.fetchTableData();
      }
    },

    handleReset() {
      this.filterForm = {
        dictName: "",
        dictType: "",
        dateRange: [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    async fetchTableData() {
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          dictName: this.filterForm.dictName,
          dictType: this.filterForm.dictType,
        };
        if (this.filterForm.dateRange && this.filterForm.dateRange.length === 2) {
          params['params[beginTime]'] = this.filterForm.dateRange[0];
          params['params[endTime]'] = this.filterForm.dateRange[1];
        }

        const resData = await listDict(params);
        const res = resData.data;

        if (res.code === 200) {
          this.tableData = res.rows || [];
          this.pagination.total = res.total || 0;
        } else {
          this.$message.error(res.msg || "获取字典列表失败");
        }
      } catch (error) {
        console.error("获取字典列表失败:", error);
        this.$message.error("获取字典列表失败");
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

    handleAdd() {
      this.drawerTitle = "新增字典";
      this.editFormData = {};
      this.currentRowId = null;
      this.drawerVisible = true;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
        }
      });
    },

    handleEdit(row) {
      if (!row.dictId && this.selectedRows.length === 1) {
        row = this.selectedRows[0];
      }
      if (!row || !row.dictId) {
        this.$message.warning("请选择要修改的数据");
        return;
      }
      this.drawerTitle = "编辑字典";
      this.currentRowId = row.dictId;
      this.editFormData = { ...row };
      this.drawerVisible = true;

      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.fillFormData(this.editFormData);
        }
      });
    },

    async handleDelete(row) {
      let ids = [];
      if (row && row.dictId) {
        ids = [row.dictId];
      } else if (this.selectedRows.length > 0) {
        ids = this.selectedRows.map((item) => item.dictId);
      }

      if (ids.length === 0) {
        this.$message.warning("请选择要删除的数据");
        return;
      }

      this.$confirm("确定要删除选中的字典吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          const idStr = ids.join(',');
          await delDict(idStr);
          this.$message.success("删除成功");
          this.fetchTableData();
        } catch (error) {
          console.error("删除失败:", error);
          this.$message.error("删除失败");
        }
      }).catch(() => { });
    },

    // 查看字典数据 - 跳转到数据页
    handleViewData(row) {
      // 传递 dictType 和 dictName 到数据页
      this.handleSwitchToData({
        dictType: row.dictType,
        dictName: row.dictName
      });
    },

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

    async handleFormSubmit(formData) {
      this.submitting = true;
      try {
        let res;
        if (this.currentRowId !== null) {
          formData.dictId = this.currentRowId;
          res = await updateDict(formData);
          if (res.code === 200) {
            this.$message.success("修改成功");
          } else {
            this.$message.error(res.msg || "修改失败");
            return;
          }
        } else {
          res = await addDict(formData);
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
