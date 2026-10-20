<template>
  <div class="list-wrapper">
    <!-- 筛选查询区 -->
    <SearchForm
      ref="searchForm"
      :fields="searchItems"
      :initial-values="filterForm"
      :gutter="20"
      label-width="100px"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 数据列表 -->
    <el-card class="list-card" shadow="never">
      <div class="action-bar">
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="handleAdd"
          v-permission="'system:greeting:exit'"
          >新增</el-button
        >
      </div>
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          v-loading="loading"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column label="来源" width="80">
            <template slot-scope="{ row }">
              {{ row.sourceType === 0 ? "系统" : "陪陪" }}
            </template>
          </el-table-column>
          <el-table-column label="陪陪信息" min-width="100">
            <template slot-scope="{ row }">
              <template v-if="row.sourceType === 1">
                <div>
                  {{ row.userName || "-" }} (ID: {{ row.userId || "-" }})
                </div>
              </template>
              <span v-else style="color: #909399">-</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="content"
            label="快捷语"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column prop="createTime" label="创建时间" width="180" />
          <el-table-column label="状态" width="100">
            <template slot-scope="{ row }">
              <el-tag
                :type="row.status === 0 ? 'success' : 'danger'"
                size="small"
              >
                {{ row.status === 0 ? "使用中" : "已禁用" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="原因" min-width="150" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <span v-if="row.status === 1">{{ row.reason || "-" }}</span>
              <span v-else style="color: #909399">-</span>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="150"
            fixed="right"
            align="center"
          >
            <template slot-scope="{ row }">
              <template v-if="row.sourceType === 0">
                <el-button
                  type="text"
                  style="color: #409eff"
                  @click="handleEdit(row)"
                  v-permission="'system:greeting:exit'"
                  >编辑</el-button
                >
                <el-button
                  type="text"
                  style="color: #f56c6c"
                  @click="handleDelete(row)"
                  v-permission="'system:greeting:remove'"
                  >删除</el-button
                >
              </template>
              <template v-else>
                <el-button
                  type="text"
                  :style="{ color: row.status === 1 ? '#C0C4CC' : '#E6A23C' }"
                  :disabled="row.status === 1"
                  @click="handleDisable(row)"
                  v-permission="'system:greeting:disable'"
                  >禁用</el-button
                >
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-fixed">
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      :title="dialogType === 'add' ? '新增快捷语' : '编辑快捷语'"
      :visible.sync="editDialogVisible"
      width="500px"
      :close-on-click-modal="false"
      @closed="resetEditForm"
    >
      <el-form
        ref="editForm"
        :model="editForm"
        :rules="editRules"
        label-width="80px"
      >
        <el-form-item label="快捷语" prop="content">
          <el-input
            v-model="editForm.content"
            type="textarea"
            :rows="4"
            maxlength="100"
            show-word-limit
            placeholder="请输入快捷语内容"
          />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEditForm"
          >确定</el-button
        >
      </div>
    </el-dialog>

    <!-- 禁用弹窗 -->
    <el-dialog
      title="禁用原因"
      :visible.sync="disableDialogVisible"
      width="500px"
      :close-on-click-modal="false"
      @closed="resetDisableForm"
    >
      <el-form
        ref="disableForm"
        :model="disableForm"
        :rules="disableRules"
        label-width="80px"
      >
        <el-form-item label="原因" prop="reason">
          <el-input
            v-model="disableForm.reason"
            type="textarea"
            :rows="4"
            maxlength="50"
            show-word-limit
            placeholder="请输入禁用原因"
          />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="disableDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="disableLoading"
          @click="submitDisableForm"
          >确定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import {
  greetingList,
  greetingSave,
  greetingDelete,
  greetingDisable,
} from "@/api/greetingConfig";

export default {
  name: "GreetingConfig",
  components: { SearchForm, PaginationSimple },
  data() {
    return {
      searchItems: [
        {
          type: "select",
          prop: "sourceType",
          label: "来源",
          placeholder: "请选择来源",
          options: [
            { label: "全部", value: "" },
            { label: "系统", value: 0 },
            { label: "陪陪", value: 1 },
          ],
          clearable: true,
        },
        {
          type: "input",
          prop: "userId",
          label: "陪陪ID",
          inputType: "integer",
          placeholder: "请输入陪陪ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "userName",
          label: "陪陪名称",
          placeholder: "请输入陪陪名称",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择状态",
          options: [
            { label: "全部", value: "" },
            { label: "使用中", value: 0 },
            { label: "已禁用", value: 1 },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "dateRange",
          label: "创建时间",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          clearable: true,
          allowFutureDate: true,
        },
      ],
      filterForm: {
        sourceType: "",
        userId: "",
        userName: "",
        status: "",
        dateRange: [],
      },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      editDialogVisible: false,
      dialogType: "add",
      editForm: { id: null, content: "", sourceType: 0 },
      editLoading: false,
      editRules: {
        content: [
          { required: true, message: "请输入快捷语内容", trigger: "blur" },
          { max: 100, message: "不能超过100个字符", trigger: "blur" },
        ],
      },
      disableDialogVisible: false,
      disableForm: { id: null, reason: "" },
      disableLoading: false,
      disableRules: {
        reason: [
          { required: true, message: "请输入禁用原因", trigger: "blur" },
          { max: 50, message: "不能超过50个字符", trigger: "blur" },
        ],
      },
    };
  },
  mounted() {
    this.fetchTableData();
  },
  methods: {
    buildQueryParams(fd) {
      const p = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      if (
        fd.sourceType !== "" &&
        fd.sourceType !== null &&
        fd.sourceType !== undefined
      ) {
        p.sourceType = fd.sourceType;
      }
      if (fd.userId) p.userId = fd.userId;
      if (fd.userName) p.userName = fd.userName;
      if (fd.status !== "" && fd.status !== null && fd.status !== undefined) {
        p.status = fd.status;
      }
      if (fd.dateRange && fd.dateRange.length === 2) {
        p.createTimeBegin = fd.dateRange[0];
        p.createTimeEnd = fd.dateRange[1];
      }
      return p;
    },

    async fetchTableData() {
      this.loading = true;
      try {
        const params = this.buildQueryParams(this.filterForm);
        const res = await greetingList(params);
        if (res.success) {
          this.tableData = res.data.rows || [];
          this.pagination.total = res.data.total || 0;
        } else {
          this.$message.error(res.errorMessage || "查询失败");
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        // console.error("获取列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },

    handleSearch(fd) {
      this.filterForm = {
        sourceType: fd?.sourceType ?? "",
        userId: fd?.userId || "",
        userName: fd?.userName || "",
        status: fd?.status ?? "",
        dateRange: fd?.dateRange || [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleReset(fd) {
      this.filterForm = {
        sourceType: "",
        userId: "",
        userName: "",
        status: "",
        dateRange: [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData();
    },

    handleAdd() {
      this.dialogType = "add";
      this.editForm = { id: null, content: "", sourceType: 0 };
      this.editDialogVisible = true;
    },

    handleEdit(row) {
      this.dialogType = "edit";
      this.editForm = {
        id: row.id,
        content: row.content,
        sourceType: row.sourceType,
      };
      this.editDialogVisible = true;
    },

    resetEditForm() {
      this.$refs.editForm && this.$refs.editForm.resetFields();
      this.editForm = { id: null, content: "", sourceType: 0 };
    },

    submitEditForm() {
      this.$refs.editForm.validate(async (valid) => {
        if (!valid) return;
        this.editLoading = true;
        try {
          const data = {
            content: this.editForm.content,
            sourceType: this.editForm.sourceType,
          };
          if (this.dialogType === "edit") {
            data.id = this.editForm.id;
          }
          await greetingSave(data);
          this.$message.success(
            this.dialogType === "add" ? "新增成功" : "编辑成功"
          );
          this.editDialogVisible = false;
          this.fetchTableData();
        } catch (error) {
          //   console.error("提交失败:", error);
        } finally {
          this.editLoading = false;
        }
      });
    },

    handleDelete(row) {
      this.$confirm("确定要删除该条打招呼配置吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            await greetingDelete({ id: row.id, sourceType: row.sourceType });
            this.$message.success("删除成功");
            if (this.tableData.length === 1 && this.pagination.pageNum > 1) {
              this.pagination.pageNum--;
            }
            this.fetchTableData();
          } catch (error) {
            // console.error("删除失败:", error);
          }
        })
        .catch(() => {});
    },

    handleDisable(row) {
      this.disableForm.id = row.id;
      this.disableDialogVisible = true;
    },

    resetDisableForm() {
      this.$refs.disableForm && this.$refs.disableForm.resetFields();
      this.disableForm = { id: null, reason: "" };
    },

    submitDisableForm() {
      this.$refs.disableForm.validate(async (valid) => {
        if (!valid) return;
        this.disableLoading = true;
        try {
          await greetingDisable({
            id: this.disableForm.id,
            content: this.disableForm.reason,
          });
          this.$message.success("禁用成功");
          this.disableDialogVisible = false;
          this.fetchTableData();
        } catch (error) {
          //   console.error("禁用失败:", error);
        } finally {
          this.disableLoading = false;
        }
      });
    },
  },
};
</script>

<style scoped lang="scss">
.list-wrapper {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border-radius: 24px;
}

.action-bar {
  margin-bottom: 20px;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 0;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
  position: relative;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}
</style>
