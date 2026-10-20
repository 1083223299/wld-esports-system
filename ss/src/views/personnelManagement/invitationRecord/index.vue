<template>
  <div class="list-wrapper">
    <div class="back-btn" @click="handleBack">
      <i class="el-icon-arrow-left"></i> 返回
    </div>

    <SearchForm
      ref="searchForm"
      :fields="searchItems"
      :initial-values="filterForm"
      :gutter="20"
      @search="handleSearch"
      @reset="handleReset"
    />

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
          <el-table-column label="陪陪手机号" min-width="200">
            <template slot-scope="scope">
              <PhoneDisplay :value="scope.row.phone" />
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="120">
            <template slot-scope="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="邀请时间" min-width="200" />
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
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import { invitationRecordList } from "@/api/invitationRecord";

export default {
  name: "InvitationRecord",
  components: { SearchForm, PaginationSimple, PhoneDisplay },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "phone",
          label: "陪陪手机号",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择",
          options: [
            { label: "全部", value: "" },
            { label: "邀请中", value: 0 },
            { label: "已同意", value: 1 },
            { label: "已拒绝", value: 2 },
            { label: "已失效", value: 3 },
            { label: "已过期", value: 4 },
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
        phone: "",
        status: "",
        dateRange: [],
      },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
    };
  },
  mounted() {
    this.fetchTableData();
  },
  methods: {
    statusText(status) {
      const map = {
        0: "邀请中",
        1: "已同意",
        2: "已拒绝",
        3: "已失效",
        4: "已过期",
      };
      return map[status] !== undefined ? map[status] : "-";
    },
    statusTagType(status) {
      const map = {
        0: "warning",
        1: "success",
        2: "danger",
        3: "info",
        4: "info",
      };
      return map[status] || "info";
    },
    buildQueryParams(fd) {
      const p = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      if (fd.phone) p.phone = fd.phone;
      if (fd.status !== "" && fd.status !== null && fd.status !== undefined) {
        p.status = fd.status;
      }
      if (fd.dateRange && fd.dateRange.length === 2) {
        p.createStartTime = fd.dateRange[0];
        p.createEndTime = fd.dateRange[1];
      }
      return p;
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const params = this.buildQueryParams(this.filterForm);
        const res = await invitationRecordList(params);
        if (res.success) {
          this.tableData = res.data.rows || [];
          this.pagination.total = res.data.total || 0;
        } else {
          this.$message.error(res.errorMessage || "查询失败");
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        console.error("获取邀请记录列表失败", error);
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    handleSearch(fd) {
      this.filterForm = {
        phone: fd?.phone || "",
        status: fd?.status ?? "",
        dateRange: fd?.dateRange || [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
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
    handleBack() {
      this.$emit("back");
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

.back-btn {
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  margin-bottom: 16px;
  flex-shrink: 0;
  &:hover {
    color: #409eff;
  }
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
