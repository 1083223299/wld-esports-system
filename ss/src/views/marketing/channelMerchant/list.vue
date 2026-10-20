<!--
  渠道商列表（运营管理）
  - POST /business/channel-merchant/page
  - POST /business/channel-merchant/add
  - POST /business/channel-merchant/check-phone
-->
<template>
  <div class="channel-merchant-page">
    <SearchForm
      ref="searchForm"
      :fields="searchItems"
      :initial-values="filterForm"
      :gutter="20"
      @search="handleSearch"
      @reset="handleReset"
    />

    <el-card class="list-card" shadow="never">
      <div class="action-bar-fixed">
        <el-button
          type="primary"
          icon="el-icon-plus"
          class="add-btn"
          @click="openAddDialog"
        >
          新增渠道商
        </el-button>
      </div>

      <div class="table-wrapper">
        <el-table
          :data="tableData"
          v-loading="loading"
          stripe
          height="100%"
          row-key="id"
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :header-cell-style="{ textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
        >
          <el-table-column
            prop="channelNo"
            label="渠道商ID"
            min-width="130"
            show-overflow-tooltip
          />
          <el-table-column label="渠道商名称" min-width="140" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <span class="name-link">{{ row.name || "-" }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="contactName"
            label="联系人"
            min-width="100"
            show-overflow-tooltip
          />
          <el-table-column label="联系电话" min-width="140">
            <template slot-scope="{ row }">
              <PhoneDisplay :value="row.phone" />
            </template>
          </el-table-column>
          <el-table-column label="绑定公会数" min-width="110">
            <template slot-scope="{ row }">
              <span class="bind-count">{{ formatCount(row.bindGuildCount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="累计分润金额" min-width="150">
            <template slot-scope="{ row }">
              {{ formatMoney(row.totalProfitAmount) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="90">
            <template slot-scope="{ row }">
              <span class="status-dot" :class="isEnabled(row.status) ? 'is-on' : 'is-off'">
                {{ isEnabled(row.status) ? "启用" : "停用" }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            prop="createTime"
            label="创建时间"
            min-width="170"
            show-overflow-tooltip
          />
          <el-table-column label="操作" fixed="right" width="100">
            <template slot-scope="{ row }">
              <el-button type="text" class="bind-btn" @click="handleBind(row)">
                绑定
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <div class="total-text">共 {{ pagination.total }} 条</div>
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :selected-rows="[]"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <AddDialog :visible.sync="addVisible" @success="handleAddSuccess" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import AddDialog from "./components/AddDialog.vue";
import { getChannelMerchantPage } from "@/api/channelMerchant";

function createFilterForm() {
  return {
    name: "",
    channelNo: "",
    contactName: "",
    status: "",
    timeRange: [],
  };
}

export default {
  name: "ChannelMerchantList",
  components: {
    SearchForm,
    PaginationSimple,
    PhoneDisplay,
    AddDialog,
  },
  data() {
    return {
      loading: false,
      tableData: [],
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      filterForm: createFilterForm(),
      addVisible: false,
      searchItems: [
        {
          type: "input",
          prop: "name",
          label: "渠道商名称",
          placeholder: "请输入渠道商名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "channelNo",
          label: "渠道商ID",
          placeholder: "请输入渠道商ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "contactName",
          label: "联系人",
          placeholder: "请输入联系人",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择状态",
          clearable: true,
          options: [
            { label: "全部", value: "" },
            { label: "启用", value: 0 },
            { label: "停用", value: 1 },
          ],
        },
        {
          type: "daterange",
          prop: "timeRange",
          label: "创建时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "起始日期",
          endPlaceholder: "结束日期",
        },
      ],
    };
  },
  created() {
    this.fetchList();
  },
  methods: {
    isEnabled(status) {
      return Number(status) === 0;
    },
    formatCount(val) {
      if (val === null || val === undefined || val === "") return 0;
      return Number(val) || 0;
    },
    formatMoney(val) {
      if (val === null || val === undefined || val === "") {
        return "¥0.00";
      }
      const num = Number(val);
      if (!Number.isFinite(num)) return String(val);
      return `¥${num.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    handleSearch(form) {
      if (form) this.filterForm = { ...this.filterForm, ...form };
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleReset() {
      this.filterForm = createFilterForm();
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchList();
    },
    buildParams() {
      const form = this.filterForm || {};
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      if (form.name) params.name = String(form.name).trim();
      if (form.channelNo) params.channelNo = String(form.channelNo).trim();
      if (form.contactName) params.contactName = String(form.contactName).trim();
      if (form.status !== "" && form.status !== null && form.status !== undefined) {
        params.status = Number(form.status);
      }
      if (Array.isArray(form.timeRange) && form.timeRange.length === 2) {
        params.startTime = form.timeRange[0];
        params.endTime = form.timeRange[1];
      }
      return params;
    },
    normalizeListRes(res) {
      const payload = res && res.data != null ? res.data : res;
      if (payload && Array.isArray(payload.rows)) {
        return {
          rows: payload.rows,
          total: Number(payload.total) || 0,
        };
      }
      if (Array.isArray(payload)) {
        return { rows: payload, total: payload.length };
      }
      return { rows: [], total: 0 };
    },
    async fetchList() {
      this.loading = true;
      try {
        const res = await getChannelMerchantPage(this.buildParams());
        const { rows, total } = this.normalizeListRes(res);
        this.tableData = rows;
        this.pagination.total = total;
      } catch (e) {
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    openAddDialog() {
      this.addVisible = true;
    },
    handleAddSuccess() {
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleBind(row) {
      this.$emit("bind", row);
    },
  },
};
</script>

<style scoped lang="scss">
.channel-merchant-page {
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

::v-deep .list-card .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 24px 8px;
  min-height: 0;
}

.action-bar-fixed {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.add-btn {
  background: #6a35ff;
  border-color: #6a35ff;
  border-radius: 8px;
  padding-left: 28px;
  padding-right: 28px;
}

.add-btn:hover,
.add-btn:focus {
  background: #8f5eff;
  border-color: #8f5eff;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
}

.total-text {
  font-size: 14px;
  color: #606266;
}

.name-link {
  color: #6a35ff;
  cursor: pointer;
}

.bind-count {
  color: #6a35ff;
  font-weight: 500;
}

.bind-btn {
  color: #6a35ff !important;
  padding: 0;
}

.status-dot {
  display: inline-flex;
  align-items: center;
  color: #4e5969;
  font-size: 13px;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    background: #c9cdd4;
  }

  &.is-on::before {
    background: #00b42a;
  }

  &.is-off::before {
    background: #c9cdd4;
  }
}
</style>
