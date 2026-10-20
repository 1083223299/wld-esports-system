<template>
  <div class="list-wrapper">
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
          <el-table-column prop="userId" label="陪陪ID" min-width="120" />
          <el-table-column prop="nickname" label="陪陪名称" min-width="150" />
          <el-table-column label="陪陪手机号" min-width="140">
            <template slot-scope="scope">
              <PhoneDisplay :value="scope.row.phone" />
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="退出时间" min-width="180" />
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
import { exitReviewList } from "@/api/exitReview";

export default {
  name: "UnionExitRecordSimple",
  components: { SearchForm, PaginationSimple, PhoneDisplay },
  data() {
    return {
      searchItems: [
        {
          prop: "userId",
          label: "陪陪ID",
          type: "input",
          placeholder: "请输入",
          clearable: true,
        },
        {
          prop: "nickname",
          label: "陪陪名称",
          type: "input",
          placeholder: "请输入",
          clearable: true,
        },
        {
          prop: "phone",
          label: "陪陪手机号",
          type: "input",
          placeholder: "请输入",
          clearable: true,
        },
        {
          prop: "dateRange",
          label: "退出时间",
          type: "daterange",
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
    buildQueryParams(fd) {
      const p = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        status: "1",
      };
      if (fd.userId) p.userId = fd.userId;
      if (fd.nickname) p.nickname = fd.nickname;
      if (fd.phone) p.phone = fd.phone;
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
        console.error("获取退出记录失败", error);
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
        dateRange: [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData();
    },
  },
};
</script>

<style lang="scss" scoped>
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
