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
          v-loading="loading"
          stripe
          style="width: 100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column label="陪陪ID" prop="userId" min-width="140" />
          <el-table-column label="陪陪名称" prop="nickname" min-width="120" />
          <el-table-column label="陪陪手机号" min-width="180">
            <template slot-scope="scope">
              <PhoneDisplay :value="scope.row.phone" />
            </template>
          </el-table-column>
          <el-table-column label="俱乐部ID" prop="tradeId" min-width="140" />
          <el-table-column
            label="俱乐部名称"
            prop="tradeName"
            min-width="160"
          />
          <el-table-column label="发起方" min-width="160">
            <template slot-scope="{ row }">
              <el-tag :type="typeTagType(row.type)" size="small">
                {{ typeText(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="退出时间" prop="createTime" min-width="180" />
        </el-table>
      </div>
      <div class="pagination-fixed">
        <PaginationSimple
          :total="pagination.total"
          :page-size="pagination.pageSize"
          :current-page="pagination.pageNum"
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
  name: "UnionExitRecord",
  components: { SearchForm, PaginationSimple, PhoneDisplay },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "userId",
          label: "陪陪ID",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "input",
          prop: "nickname",
          label: "陪陪名称",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "input",
          prop: "phone",
          label: "陪陪手机号",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "input",
          prop: "tradeId",
          label: "俱乐部ID",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "input",
          prop: "tradeName",
          label: "俱乐部名称",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "select",
          prop: "type",
          label: "发起方",
          placeholder: "请选择",
          clearable: true,
          options: [
            { label: "全部", value: "" },
            { label: "陪陪", value: "proactive-application" },
            { label: "俱乐部", value: "union-out" },
            { label: "平台", value: "skill-empty" },
          ],
        },
        {
          type: "daterange",
          prop: "dateRange",
          label: "退出时间",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          valueFormat: "yyyy-MM-dd",
          clearable: true,
          allowFutureDate: true,
        },
      ],
      filterForm: {
        userId: "",
        nickname: "",
        phone: "",
        tradeId: "",
        tradeName: "",
        type: "",
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
    typeText(type) {
      const map = {
        "skill-empty": "平台",
        "proactive-application": "陪陪",
        "union-out": "俱乐部",
      };
      return map[type] || type || "-";
    },
    typeTagType(type) {
      const map = {
        "skill-empty": "info",
        "proactive-application": "warning",
        "union-out": "danger",
      };
      return map[type] || "info";
    },
    buildQueryParams(fd) {
      const p = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        status: "1",
      };
      if (fd.userId) p.userId = fd.userId;
      if (fd.nickname) p.nickname = fd.nickname;
      if (fd.phone) p.phone = fd.phone;
      if (fd.tradeId) p.tradeId = fd.tradeId;
      if (fd.tradeName) p.tradeName = fd.tradeName;
      if (fd.type) p.type = fd.type;
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
        console.error("获取退出记录列表失败", error);
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
        tradeId: fd?.tradeId || "",
        tradeName: fd?.tradeName || "",
        type: fd?.type || "",
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
        tradeId: "",
        tradeName: "",
        type: "",
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
