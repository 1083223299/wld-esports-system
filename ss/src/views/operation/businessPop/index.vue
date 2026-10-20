<template>
  <div class="list-wrapper">
    <div>
      <SearchForm :fields="searchItems" :initial-values="filterForm" @search="handleSearch" @reset="handleReset" />
    </div>

    <el-card class="list-card" shadow="never">
      <!-- <div class="action-bar">
        <el-button type="primary" icon="el-icon-plus" @click="handleAdd">新增弹窗</el-button>
      </div> -->

      <div class="table-wrapper">
        <el-table :data="tableData" v-loading="loading" stripe :cell-style="{ textAlign: 'center' }"
          :header-row-style="{ backgroundColor: '#F6F6FB' }">
          <el-table-column prop="popId" label="ID" width="200" />
          <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
          <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
          <el-table-column label="内容" min-width="120">
            <template slot-scope="{ row }">
              <el-button type="text" @click="handleView(row)" style="color:#409EFF">查看</el-button>
            </template>
          </el-table-column>
          <!-- <el-table-column prop="status" label="状态" width="120">
            <template slot-scope="{ row }">
              <el-tag :type="row.status === '0' ? 'success' : 'info'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
            </template>
          </el-table-column> -->
          <el-table-column label="操作" width="160" fixed="right" align="center">
            <template slot-scope="{ row }">
              <el-button type="text" @click="handleEdit(row)" style="color:#409EFF">编辑</el-button>
              <!-- <el-button type="text" @click="handleDelete(row)" style="color:#F56C6C">删除</el-button> -->
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 查看弹窗 -->
    <el-dialog title="查看" :visible.sync="viewDialogVisible" width="640px">
      <div v-html="currentViewContent" style="min-height:200px; white-space:pre-wrap;"></div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="viewDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="720px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" label-width="100px">
        <el-form-item label="名称">
          <el-input v-model="form.name" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="15" show-word-limit />
        </el-form-item>
        <el-form-item label="内容">
          <QuillEditor v-model="form.content" :options="editorOptions" />
        </el-form-item>
        <!-- <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="0">正常</el-radio>
            <el-radio label="1">停用</el-radio>
          </el-radio-group>
        </el-form-item> -->
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">提交</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { quillEditor } from "vue-quill-editor";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "quill/dist/quill.bubble.css";
import { 
  businessPopList, 
  businessPopAdd, 
  businessPopEdit, 
  // businessPopDelete 
} from "@/api/businessPop";

export default {
  name: "BusinessPop",
  components: { SearchForm, PaginationSimple, QuillEditor: quillEditor },
  data() {
    return {
      searchItems: [
        { type: "input", prop: "name", label: "名称", placeholder: "请输入名称", clearable: true },
        { type: "input", prop: "title", label: "标题", placeholder: "请输入标题", clearable: true },
      ],
      filterForm: { name: "", title: "" },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      viewDialogVisible: false,
      currentViewContent: "",

      dialogVisible: false,
      dialogTitle: "新增弹窗",
      isEdit: false,
      submitLoading: false,
      form: { popId: null, name: "", title: "", content: "", status: "0" },
      editorOptions: { theme: "snow" },
    };
  },
  mounted() {
    this.fetchTableData();
  },
  methods: {
    buildQueryParams() {
      const p = { pageNum: this.pagination.pageNum, pageSize: this.pagination.pageSize };
      if (this.filterForm.name) p.name = this.filterForm.name;
      if (this.filterForm.title) p.title = this.filterForm.title;
      return p;
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const res = await businessPopList(this.buildQueryParams());
        if (res.success) {
          this.tableData = res.data?.rows || [];
          this.pagination.total = res.data?.total || 0;
        } else {
          this.$message.error(res.errorMessage || "获取列表失败");
        }
      } catch (e) {
        this.$message.error("获取列表失败");
      } finally {
        this.loading = false;
      }
    },
    handleSearch(fd) {
      this.filterForm = { name: fd?.name || "", title: fd?.title || "" };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = { name: "", title: "" };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(n) { this.pagination.pageNum = n; this.fetchTableData(); },
    // handleAdd() {
    //   this.isEdit = false;
    //   this.dialogTitle = "新增弹窗";
    //   this.form = { popId: null, name: "", title: "", content: "", status: "0" };
    //   this.dialogVisible = true;
    // },
    handleView(row) {
      this.currentViewContent = row.content || "";
      this.viewDialogVisible = true;
    },
    handleEdit(row) {
      this.isEdit = true;
      this.dialogTitle = "编辑弹窗";
      this.form = { popId: row.popId, name: row.name || "", title: row.title || "", content: row.content || "", status: row.status || "0" };
      this.dialogVisible = true;
    },
    async submitForm() {
      this.submitLoading = true;
      try {
        const payload = {
          popId: this.form.popId,
          name: this.form.name,
          title: this.form.title,
          content: this.form.content,
          status: this.form.status,
        };
        const res = this.isEdit ? await businessPopEdit(payload) : await businessPopAdd(payload);
        if (res.success) {
          this.$message.success(this.isEdit ? "编辑成功" : "新增成功");
          this.dialogVisible = false;
          this.fetchTableData();
        } else {
          this.$message.error(res.errorMessage || "操作失败");
        }
      } catch (e) {
        this.$message.error("操作失败");
      } finally { this.submitLoading = false; }
    },
    // handleDelete(row) {
    //   this.$confirm(`确定删除「${row.name || row.title}」吗？`, "提示", { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" })
    //     .then(async () => {
    //       try {
    //         const res = await businessPopDelete({ popId: row.popId });
    //         if (res.success) {
    //           this.$message.success("删除成功");
    //           if (this.tableData.length === 1 && this.pagination.pageNum > 1) this.pagination.pageNum -= 1;
    //           this.fetchTableData();
    //         } else {
    //           this.$message.error(res.errorMessage || "删除失败");
    //         }
    //       } catch (e) { this.$message.error("删除失败"); }
    //     }).catch(() => {});
    // },
  },
};
</script>

<style scoped>
.list-wrapper { padding: 20px; display:flex; flex-direction:column; height:100%; box-sizing:border-box }
.list-card { flex:1; display:flex; flex-direction:column; overflow:hidden; border-radius:12px }
.action-bar { margin-bottom:16px }
.table-wrapper { flex:1; overflow-y:auto }
.pagination-fixed { border-top:1px solid #ebeef5; display:flex; justify-content:flex-end; padding-top:12px }
::v-deep .ql-editor { min-height:180px }
::v-deep .el-table th.el-table__cell>.cell {
  text-align: center;
}
</style>
