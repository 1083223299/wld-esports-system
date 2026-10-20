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
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          v-loading="loading"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="userId" label="陪陪ID" width="150" />
          <el-table-column
            prop="nickname"
            label="陪陪名称"
            min-width="100"
            show-overflow-tooltip
          />
          <el-table-column label="陪陪手机号" width="160">
            <template slot-scope="{ row }">
              <PhoneDisplay :value="row.phone" />
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="申请时间" width="200" />
          <el-table-column label="状态" width="100">
            <template slot-scope="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="原因" min-width="150" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.rejectionReason || row.exitReason || "-" }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="140"
            fixed="right"
            align="center"
          >
            <template slot-scope="{ row }">
              <template v-if="row.status === '0'">
                <el-button
                  type="text"
                  style="color: #409eff"
                  @click="handleApprove(row)"
                  v-permission="'exitReview: system:review:update'"
                  >通过</el-button
                >
                <el-button
                  type="text"
                  style="color: #f56c6c"
                  @click="handleReject(row)"
                  v-permission="'exitReview: system:review:update'"
                  >驳回</el-button
                >
              </template>
              <template v-else>
                <span style="color: #c0c4cc">-</span>
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

    <!-- 驳回弹窗 -->
    <el-dialog
      title="驳回"
      :visible.sync="rejectDialogVisible"
      width="500px"
      :close-on-click-modal="false"
      @closed="resetRejectForm"
    >
      <el-form
        ref="rejectForm"
        :model="rejectForm"
        :rules="rejectRules"
        label-width="80px"
      >
        <el-form-item label="原因" prop="rejectionReason">
          <el-input
            v-model="rejectForm.rejectionReason"
            type="textarea"
            :rows="4"
            maxlength="50"
            show-word-limit
            placeholder="请输入驳回原因"
          />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="rejectLoading" @click="submitReject"
          >提交</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import { exitReviewList, exitReviewAction } from "@/api/exitReview";

export default {
  name: "ExitReview",
  components: { SearchForm, PaginationSimple, PhoneDisplay },
  data() {
    return {
      searchItems: [
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
          prop: "nickname",
          label: "陪陪名称",
          placeholder: "请输入陪陪名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "phone",
          label: "陪陪手机号",
          placeholder: "请输入陪陪手机号",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择状态",
          options: [
            { label: "全部", value: "" },
            { label: "待审核", value: "0" },
            { label: "通过", value: "1" },
            { label: "驳回", value: "2" },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "dateRange",
          label: "申请时间",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          clearable: true,
          allowFutureDate: true,
        },
      ],
      filterForm: {
        userId: "",
        nickname: "",
        phone: "",
        status: "",
        dateRange: [],
      },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      rejectDialogVisible: false,
      rejectForm: { exitId: "", rejectionReason: "" },
      rejectLoading: false,
      rejectRules: {
        rejectionReason: [
          { required: true, message: "请输入驳回原因", trigger: "blur" },
          { max: 50, message: "不能超过50个字符", trigger: "blur" },
        ],
      },
    };
  },
  mounted() {
    this.fetchTableData();
  },
  methods: {
    statusText(status) {
      const map = { 0: "待审核", 1: "通过", 2: "驳回" };
      return map[status] || "-";
    },
    statusTagType(status) {
      const map = { 0: "warning", 1: "success", 2: "danger" };
      return map[status] || "info";
    },
    buildQueryParams(fd) {
      const p = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      if (fd.userId) p.userId = fd.userId;
      if (fd.nickname) p.nickname = fd.nickname;
      if (fd.phone) p.phone = fd.phone;
      if (fd.status !== "" && fd.status !== null && fd.status !== undefined) {
        p.status = fd.status;
      }
      if (fd.dateRange && fd.dateRange.length === 2) {
        p.startTime = fd.dateRange[0];
        p.endTime = fd.dateRange[1];
      }
      return p;
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const params = this.buildQueryParams(this.filterForm);
        const res = await exitReviewList(params);
        if (res.success) {
          this.tableData = res.data.rows || [];
          this.pagination.total = res.data.total || 0;
        } else {
          this.$message.error(res.errorMessage || "查询失败");
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        console.error("获取退出审核列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    handleSearch(fd) {
      this.filterForm = {
        userId: fd?.userId || "",
        nickname: fd?.nickname || "",
        phone: fd?.phone || "",
        status: fd?.status ?? "",
        dateRange: fd?.dateRange || [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
        userId: "",
        nickname: "",
        phone: "",
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
    handleApprove(row) {
      this.$confirm("确定要通过该陪陪的退出申请吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            await exitReviewAction({
              exitId: row.exitId,
              status: "1",
            });
            this.$message.success("已通过");
            this.fetchTableData();
          } catch (error) {
            console.error("通过失败:", error);
          }
        })
        .catch(() => {});
    },
    handleReject(row) {
      this.rejectForm.exitId = row.exitId;
      this.rejectForm.rejectionReason = "";
      this.rejectDialogVisible = true;
    },
    resetRejectForm() {
      this.$refs.rejectForm && this.$refs.rejectForm.resetFields();
      this.rejectForm = { exitId: "", rejectionReason: "" };
    },
    submitReject() {
      this.$refs.rejectForm.validate(async (valid) => {
        if (!valid) return;
        this.rejectLoading = true;
        try {
          await exitReviewAction({
            exitId: this.rejectForm.exitId,
            status: "2",
            rejectionReason: this.rejectForm.rejectionReason,
          });
          this.$message.success("已驳回");
          this.rejectDialogVisible = false;
          this.fetchTableData();
        } catch (error) {
          console.error("驳回失败:", error);
        } finally {
          this.rejectLoading = false;
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
