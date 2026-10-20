<template>
  <div class="leader-list-page">
    <div class="search-module">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20" label-width="82px"
        :confirm-reset="false" @search="handleSearch" @reset="handleReset" />
    </div>

    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <el-table ref="leaderTable" v-loading="loading" :data="tableData" stripe :row-key="getRowKey" :border="false"
          height="100%" empty-text="暂无团长数据" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" :header-row-style="{ backgroundColor: '#F6F6FB' }">
          <el-table-column prop="leaderNo" label="团长ID" min-width="130" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.leaderNo || row.leaderId || "-" }}</template>
          </el-table-column>
          <el-table-column prop="nickname" label="团长名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.nickname || "-" }}</template>
          </el-table-column>
          <el-table-column v-if="!isGuildUser" label="所属公会" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ formatGuild(row) }}</template>
          </el-table-column>
          <el-table-column prop="boundShopCount" label="绑定陪陪数" width="120">
            <template slot-scope="{ row }">{{ formatCount(row.boundShopCount) }}</template>
          </el-table-column>
          <el-table-column prop="relatedOrderCount" label="关联订单数" width="120">
            <template slot-scope="{ row }">{{ formatCount(row.relatedOrderCount) }}</template>
          </el-table-column>
          <el-table-column prop="netSettleAmount" label="出账净额" width="130">
            <template slot-scope="{ row }">{{ formatAmount(row.netSettleAmount) }}</template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.createTime || "-" }}</template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template slot-scope="{ row }">
              <div class="action-buttons">
                <el-button v-permission="'system:tradeUnionLeader:boundCompanionList'" type="text" class="bind-btn"
                  @click="openBindManage(row)">
                  绑定管理
                </el-button>
                <el-button v-permission="'system:tradeUnionLeader:unbind'" type="text" class="unbind-btn"
                  @click="openUnbindLeader(row)">
                  解绑
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <el-drawer :visible.sync="bindDrawerVisible" direction="rtl" size="880px" :wrapper-closable="true"
      custom-class="bind-manage-drawer" @close="closeBindManage">
      <div slot="title" class="bind-drawer__header">
        <div class="bind-drawer__title">
          绑定管理·{{ currentLeader.nickname || "-" }} ({{ currentLeader.leaderNo || currentLeader.leaderId || "-" }})
        </div>
        <div class="bind-drawer__meta">
          状态: {{ currentLeader.statusDesc || "-" }} · 当前有效绑定{{ formatCount(currentLeader.boundShopCount) }}人
        </div>
      </div>

      <div class="bind-drawer__body">
        <div class="bind-drawer__toolbar">
          <el-button v-permission="'system:tradeUnionLeader:bindCompanion'" type="primary" class="primary-btn"
            icon="el-icon-plus" @click="openBindDialog">
            绑定陪陪
          </el-button>
        </div>

        <div class="bind-drawer__table">
          <el-table v-loading="bindLoading" :data="boundList" stripe row-key="bindId" :border="false" height="100%"
            empty-text="暂无绑定陪陪" :cell-style="{ textAlign: 'center' }"
            :header-cell-style="{ textAlign: 'center', backgroundColor: '#F6F6FB' }">
            <el-table-column prop="companionNo" label="陪陪ID" min-width="130">
              <template slot-scope="{ row }">{{ row.companionNo || row.companionUserId || "-" }}</template>
            </el-table-column>
            <el-table-column prop="companionNickname" label="陪陪名称" min-width="120">
              <template slot-scope="{ row }">{{ row.companionNickname || "-" }}</template>
            </el-table-column>
            <el-table-column prop="bindTime" label="绑定时间" width="180">
              <template slot-scope="{ row }">{{ row.bindTime || "-" }}</template>
            </el-table-column>
            <el-table-column prop="statusDesc" label="用户状态" width="110">
              <template slot-scope="{ row }">
                <span :class="['plain-status', Number(row.status) === 1 ? 'is-danger' : 'is-success']">
                  {{ row.statusDesc || "-" }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="orderCount" label="订单数" width="100">
              <template slot-scope="{ row }">{{ formatCount(row.orderCount) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template slot-scope="{ row }">
                <el-button v-permission="'system:tradeUnionLeader:unbindCompanion'" type="text" class="unbind-btn"
                  @click="openUnbindCompanion(row)">
                  解绑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="bind-drawer__pager">
          <PaginationSimple :current-page="bindPagination.pageNum" :page-size="bindPagination.pageSize"
            :total="bindPagination.total" @current-change="handleBindPageChange" />
        </div>
      </div>
    </el-drawer>

    <el-dialog :visible.sync="unbindLeaderVisible" :title="unbindLeaderTitle" width="520px" append-to-body>
      <div class="warn-box">
        解绑后，该团长将退出本俱乐部，名下陪陪将全部解除绑定、后续订单由俱乐部直接管理直至绑定新团长；解绑前的订单和收益记录均会保留，不受影响。操作立即生效，确认解绑？
      </div>
      <p class="unbind-count">
        当前有效绑定陪陪<strong>{{ formatCount(currentLeader.boundShopCount) }}</strong>人。
      </p>
      <span slot="footer">
        <el-button @click="unbindLeaderVisible = false">取消</el-button>
        <el-button type="primary" class="primary-btn" :loading="unbindLeaderLoading" @click="submitUnbindLeader">
          确认解绑
        </el-button>
      </span>
    </el-dialog>

    <el-dialog :visible.sync="unbindCompanionVisible" :title="unbindCompanionTitle" width="480px" append-to-body>
      <div class="warn-box">
        解绑后该陪陪新订单不再归属此团长，历史订单和分成不受影响。
      </div>
      <span slot="footer">
        <el-button @click="unbindCompanionVisible = false">取消</el-button>
        <el-button type="primary" class="primary-btn" :loading="unbindCompanionLoading" @click="submitUnbindCompanion">
          确认解绑
        </el-button>
      </span>
    </el-dialog>

    <el-dialog :visible.sync="bindDialogVisible" :title="bindDialogTitle" width="640px" append-to-body
      @close="resetBindDialog">
      <div class="bind-dialog">
        <el-input v-model="poolKeyword" clearable placeholder="搜索陪陪ID / 手机号 / 昵称" prefix-icon="el-icon-search"
          @keyup.enter.native="searchCompanionPool" @clear="searchCompanionPool" />
        <div class="bind-dialog__tools">
          <el-checkbox v-model="showAssigned" @change="searchCompanionPool">显示已归属</el-checkbox>
          <el-button type="text" :disabled="!selectedCompanions.length" @click="clearSelectedCompanions">
            清空已选择 ({{ selectedCompanions.length }})
          </el-button>
        </div>
        <div v-loading="poolLoading" class="pool-list">
          <div v-if="!poolList.length" class="pool-empty">暂无可选陪陪</div>
          <label v-for="item in poolList" :key="item.companionUserId" class="pool-item"
            :class="{ 'is-disabled': !canSelectCompanion(item) }">
            <el-checkbox :value="isCompanionSelected(item)" :disabled="!canSelectCompanion(item)"
              @change="(checked) => toggleCompanion(item, checked)" />
            <div class="pool-item__main">
              <div class="pool-item__name">{{ item.companionNickname || "-" }}</div>
              <div class="pool-item__id">{{ item.companionUserId || "-" }}</div>
            </div>
            <span class="pool-item__status" :class="item.selectable ? 'is-free' : 'is-bound'">
              {{ item.belongingDesc || (item.selectable ? "未绑定" : "已归属") }}
            </span>
          </label>
        </div>
        <div class="pool-pager">
          <el-pagination :current-page="poolPagination.pageNum" :page-size="poolPagination.pageSize"
            :total="poolPagination.total" layout="prev, pager, next" @current-change="handlePoolPageChange" />
        </div>
      </div>
      <span slot="footer">
        <el-button @click="bindDialogVisible = false">取消</el-button>
        <el-button type="primary" class="primary-btn" :loading="bindSubmitLoading"
          :disabled="!selectedCompanions.length" @click="submitBindCompanions">
          确认绑定
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { isGuildRole } from "@/utils/permission";
import {
  getLeaderList,
  getBoundCompanionList,
  getCompanionPool,
  bindCompanions,
  unbindLeader,
  unbindCompanion,
} from "@/api/regimentCommander";

const BIND_LIMIT = 50;

export default {
  name: "RegimentCommanderList",
  components: {
    SearchForm,
    PaginationSimple,
  },
  data() {
    return {
      filterForm: {
        leaderId: "",
        nickname: "",
        tradeId: "",
        tradeName: "",
        createTimeRange: [],
      },
      searchItems: [],
      tableData: [],
      loading: false,
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      currentLeader: {},
      bindDrawerVisible: false,
      bindLoading: false,
      boundList: [],
      bindPagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      unbindLeaderVisible: false,
      unbindLeaderLoading: false,
      currentCompanion: {},
      unbindCompanionVisible: false,
      unbindCompanionLoading: false,
      bindDialogVisible: false,
      poolLoading: false,
      bindSubmitLoading: false,
      poolKeyword: "",
      showAssigned: false,
      poolList: [],
      selectedCompanions: [],
      poolPagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
    };
  },
  computed: {
    isGuildUser() {
      return isGuildRole();
    },
    unbindLeaderTitle() {
      const name = this.currentLeader.nickname || "-";
      const no = this.currentLeader.leaderNo || this.currentLeader.leaderId || "-";
      return `解绑团长·${name} (${no})`;
    },
    bindDialogTitle() {
      const name = this.currentLeader.nickname || "-";
      const no = this.currentLeader.leaderNo || this.currentLeader.leaderId || "-";
      return `绑定至团长：${name} (${no})`;
    },
    unbindCompanionTitle() {
      const name = this.currentCompanion.companionNickname || "-";
      const no = this.currentCompanion.companionNo || this.currentCompanion.companionUserId || "-";
      return `解绑陪陪·${name} (${no})`;
    },
  },
  created() {
    this.searchItems = this.buildSearchItems();
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    buildSearchItems() {
      const items = [
        {
          type: "input",
          prop: "leaderId",
          label: "团长ID",
          placeholder: "请输入团长ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "nickname",
          label: "团长名称",
          placeholder: "请输入团长名称",
          clearable: true,
        },
      ];
      if (!this.isGuildUser) {
        items.push(
          {
            type: "input",
            prop: "tradeId",
            label: "公会ID",
            placeholder: "请输入公会ID",
            clearable: true,
          },
          {
            type: "input",
            prop: "tradeName",
            label: "公会名称",
            placeholder: "请输入公会名称",
            clearable: true,
          }
        );
      }
      items.push({
        type: "daterange",
        prop: "createTimeRange",
        label: "创建时间",
        startPlaceholder: "开始时间",
        endPlaceholder: "结束时间",
        valueFormat: "yyyy-MM-dd HH:mm:ss",
        maxRangeDays: 90,
        clearable: true,
      });
      return items;
    },
    getBusinessData(res) {
      if (!res) return {};
      if (res.data && typeof res.data === "object") return res.data;
      return res;
    },
    getRowKey(row) {
      return row.leaderId || row.leaderNo || `${this.pagination.pageNum}-${this.tableData.indexOf(row)}`;
    },
    formatCount(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    },
    formatAmount(value) {
      const number = Number(value);
      return `¥${(Number.isFinite(number) ? number : 0).toFixed(2)}`;
    },
    formatGuild(row) {
      if (!row) return "-";
      if (row.tradeName && row.tradeId) return `${row.tradeName} (ID${row.tradeId})`;
      if (row.tradeName) return row.tradeName;
      if (row.tradeId) return `ID${row.tradeId}`;
      return "-";
    },
    formatCompanionNo(item) {
      return item.companionNo || item.companionUserId || "-";
    },
    parseId(value) {
      const text = String(value || "").trim();
      if (!text) return { valid: true, value: undefined };
      if (!/^\d+$/.test(text)) return { valid: false, value: undefined };
      return { valid: true, value: text };
    },
    syncFilterForm(formData) {
      this.filterForm = {
        leaderId: formData.leaderId || "",
        nickname: formData.nickname || "",
        tradeId: formData.tradeId || "",
        tradeName: formData.tradeName || "",
        createTimeRange: Array.isArray(formData.createTimeRange) ? formData.createTimeRange : [],
      };
    },
    handleSearch(formData) {
      this.syncFilterForm(formData || {});
      this.pagination.pageNum = 1;
      this.fetchData();
    },
    handleReset(formData) {
      this.syncFilterForm(formData || {});
      this.pagination.pageNum = 1;
      this.fetchData();
    },
    handleCurrentChange(pageNum) {
      this.pagination.pageNum = pageNum;
      this.fetchData();
    },
    buildListQuery() {
      const query = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        nickname: this.filterForm.nickname || undefined,
      };
      const leaderId = String(this.filterForm.leaderId || "").trim();
      if (leaderId) query.leaderId = leaderId;
      if (!this.isGuildUser) {
        const tradeId = this.parseId(this.filterForm.tradeId);
        if (!tradeId.valid) {
          this.$message.warning("公会ID格式不正确");
          return null;
        }
        if (tradeId.value) query.tradeId = tradeId.value;
        if (this.filterForm.tradeName) query.tradeName = this.filterForm.tradeName;
      }
      if (this.filterForm.createTimeRange.length === 2) {
        query.startTime = this.filterForm.createTimeRange[0];
        query.endTime = this.filterForm.createTimeRange[1];
      }
      Object.keys(query).forEach((key) => {
        if (query[key] === undefined || query[key] === "") delete query[key];
      });
      return query;
    },
    async fetchData() {
      const query = this.buildListQuery();
      if (!query) return;
      this.loading = true;
      try {
        const res = await getLeaderList(query);
        const data = this.getBusinessData(res);
        this.tableData = Array.isArray(data.rows) ? data.rows : [];
        this.pagination.total = Number(data.total || 0);
      } catch (error) {
        console.error("查询团长列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    openBindManage(row) {
      this.currentLeader = { ...row };
      this.bindPagination.pageNum = 1;
      this.bindDrawerVisible = true;
      this.fetchBoundList();
    },
    closeBindManage() {
      this.boundList = [];
      this.bindDialogVisible = false;
    },
    handleBindPageChange(pageNum) {
      this.bindPagination.pageNum = pageNum;
      this.fetchBoundList();
    },
    async fetchBoundList() {
      if (!this.currentLeader.leaderId) return;
      this.bindLoading = true;
      try {
        const query = {
          leaderId: this.currentLeader.leaderId,
          pageNum: this.bindPagination.pageNum,
          pageSize: this.bindPagination.pageSize,
        };
        if (!this.isGuildUser && this.currentLeader.tradeId) {
          query.tradeId = this.currentLeader.tradeId;
        }
        const res = await getBoundCompanionList(query);
        const data = this.getBusinessData(res);
        this.boundList = Array.isArray(data.rows) ? data.rows : [];
        this.bindPagination.total = Number(data.total || 0);
        this.currentLeader.boundShopCount = this.bindPagination.total;
      } catch (error) {
        console.error("查询绑定陪陪失败:", error);
        this.boundList = [];
        this.bindPagination.total = 0;
      } finally {
        this.bindLoading = false;
      }
    },
    openUnbindLeader(row) {
      this.currentLeader = { ...row };
      this.unbindLeaderVisible = true;
    },
    async submitUnbindLeader() {
      this.unbindLeaderLoading = true;
      try {
        const payload = { leaderId: this.currentLeader.leaderId };
        if (!this.isGuildUser && this.currentLeader.tradeId) {
          payload.tradeId = this.currentLeader.tradeId;
        }
        await unbindLeader(payload);
        this.$message.success("解绑成功");
        this.unbindLeaderVisible = false;
        this.bindDrawerVisible = false;
        this.fetchData();
      } catch (error) {
        console.error("解绑团长失败:", error);
      } finally {
        this.unbindLeaderLoading = false;
      }
    },
    openUnbindCompanion(row) {
      this.currentCompanion = { ...row };
      this.unbindCompanionVisible = true;
    },
    async submitUnbindCompanion() {
      if (!this.currentLeader.leaderId || !this.currentCompanion.companionUserId) {
        this.$message.warning("缺少解绑参数");
        return;
      }
      this.unbindCompanionLoading = true;
      try {
        const payload = {
          leaderId: this.currentLeader.leaderId,
          companionUserId: this.currentCompanion.companionUserId,
        };
        if (!this.isGuildUser && this.currentLeader.tradeId) {
          payload.tradeId = this.currentLeader.tradeId;
        }
        await unbindCompanion(payload);
        this.$message.success("解绑成功");
        this.unbindCompanionVisible = false;
        this.currentCompanion = {};
        if (this.boundList.length <= 1 && this.bindPagination.pageNum > 1) {
          this.bindPagination.pageNum -= 1;
        }
        this.fetchBoundList();
        this.fetchData();
      } catch (error) {
        console.error("解绑陪陪失败:", error);
      } finally {
        this.unbindCompanionLoading = false;
      }
    },
    openBindDialog() {
      this.bindDialogVisible = true;
      this.poolKeyword = "";
      this.showAssigned = false;
      this.selectedCompanions = [];
      this.poolPagination.pageNum = 1;
      this.fetchCompanionPool();
    },
    resetBindDialog() {
      this.poolList = [];
      this.selectedCompanions = [];
      this.poolKeyword = "";
      this.showAssigned = false;
    },
    searchCompanionPool() {
      this.poolPagination.pageNum = 1;
      this.fetchCompanionPool();
    },
    handlePoolPageChange(pageNum) {
      this.poolPagination.pageNum = pageNum;
      this.fetchCompanionPool();
    },
    async fetchCompanionPool() {
      this.poolLoading = true;
      try {
        const query = {
          pageNum: this.poolPagination.pageNum,
          pageSize: this.poolPagination.pageSize,
          keyword: this.poolKeyword || undefined,
          showAssigned: this.showAssigned,
        };
        if (!this.isGuildUser && this.currentLeader.tradeId) {
          query.tradeId = this.currentLeader.tradeId;
        }
        const res = await getCompanionPool(query);
        const data = this.getBusinessData(res);
        this.poolList = Array.isArray(data.rows) ? data.rows : [];
        this.poolPagination.total = Number(data.total || 0);
      } catch (error) {
        console.error("查询陪陪池失败:", error);
        this.poolList = [];
        this.poolPagination.total = 0;
      } finally {
        this.poolLoading = false;
      }
    },
    isCompanionSelected(item) {
      return this.selectedCompanions.some(
        (row) => String(row.companionUserId) === String(item.companionUserId)
      );
    },
    canSelectCompanion(item) {
      if (!item || item.selectable === false) return false;
      if (this.isCompanionSelected(item)) return true;
      return this.selectedCompanions.length < BIND_LIMIT;
    },
    toggleCompanion(item, checked) {
      if (checked) {
        if (this.selectedCompanions.length >= BIND_LIMIT) {
          this.$message.warning("已达上限，单次最多绑定 50 人");
          return;
        }
        if (!this.isCompanionSelected(item)) {
          this.selectedCompanions.push(item);
        }
        return;
      }
      this.selectedCompanions = this.selectedCompanions.filter(
        (row) => String(row.companionUserId) !== String(item.companionUserId)
      );
    },
    clearSelectedCompanions() {
      this.selectedCompanions = [];
    },
    async submitBindCompanions() {
      if (!this.selectedCompanions.length) return;
      this.bindSubmitLoading = true;
      try {
        const payload = {
          leaderId: this.currentLeader.leaderId,
          companionUserIds: this.selectedCompanions.map((item) => item.companionUserId),
        };
        if (!this.isGuildUser && this.currentLeader.tradeId) {
          payload.tradeId = this.currentLeader.tradeId;
        }
        const res = await bindCompanions(payload);
        const data = this.getBusinessData(res);
        const successCount = Number(data.successCount || 0);
        const skipCount = Number(data.skipCount || 0);
        this.$message.success(`绑定完成，成功 ${successCount} 人，跳过 ${skipCount} 人`);
        this.bindDialogVisible = false;
        this.fetchBoundList();
        this.fetchData();
      } catch (error) {
        console.error("绑定陪陪失败:", error);
      } finally {
        this.bindSubmitLoading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.leader-list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

.search-module {
  flex-shrink: 0;
}

.list-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 24px;
}

::v-deep .list-card>.el-card__body {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 20px 0;
  box-sizing: border-box;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.action-buttons .el-button {
  padding: 0;
}

.bind-btn {
  color: #9047f8;
}

.unbind-btn {
  color: #ff4d4f;
}

.plain-status {
  font-size: 13px;
}

.is-success {
  color: #1bc286;
}

.is-danger {
  color: #ff4d4f;
}

.pagination-fixed {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 10px 0;
  border-top: 1px solid #ebeef5;
}

.primary-btn {
  background: #6a35ff;
  border-color: #6a35ff;
}

.bind-drawer__header {
  padding-right: 24px;
}

.bind-drawer__title {
  color: #1d2129;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.bind-drawer__meta {
  margin-top: 4px;
  color: #86909c;
  font-size: 13px;
  font-weight: 400;
}

.bind-drawer__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.bind-drawer__toolbar {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.bind-drawer__table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.bind-drawer__pager {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 10px 0 16px;
}

.warn-box {
  padding: 14px 16px;
  border-radius: 8px;
  background: #fff7e8;
  color: #d25f00;
  line-height: 24px;
}

.unbind-count {
  margin: 16px 0 0;
  color: #4e5969;

  strong {
    color: #1d2129;
    font-weight: 600;
  }
}

.bind-dialog__tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
}

.pool-list {
  min-height: 280px;
  max-height: 360px;
  overflow: auto;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.pool-empty {
  padding: 48px 0;
  color: #86909c;
  text-align: center;
}

.pool-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #f2f3f5;
  cursor: pointer;

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.pool-item__main {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.pool-item__name {
  color: #1d2129;
  font-size: 14px;
}

.pool-item__id {
  color: #86909c;
  font-size: 12px;
}

.pool-item__status {
  font-size: 12px;
}

.pool-item__status.is-free {
  color: #1bc286;
}

.pool-item__status.is-bound {
  color: #ff8107;
}

.pool-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

::v-deep .el-table {
  color: #4e5969;
}

::v-deep .el-button--text:hover {
  background-color: transparent !important;
  border-color: transparent !important;
}
</style>

<style lang="scss">
.bind-manage-drawer {
  display: flex;
  flex-direction: column;

  .el-drawer__header {
    margin-bottom: 0;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
    align-items: flex-start;
  }

  .el-drawer__close-btn {
    margin-top: 2px;
  }

  .el-drawer__body {
    flex: 1;
    min-height: 0;
    padding: 16px 20px 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}
</style>
