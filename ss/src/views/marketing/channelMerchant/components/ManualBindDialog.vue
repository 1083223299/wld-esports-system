<template>
  <el-dialog
    :title="dialogTitle"
    :visible.sync="dialogVisible"
    width="720px"
    append-to-body
    :close-on-click-modal="false"
    custom-class="manual-bind-dialog"
    @open="handleOpen"
    @close="handleClose"
  >
    <div class="search-block">
      <div class="search-block__label">搜索公会（ID / 名称）</div>
      <div class="search-block__row">
        <el-input
          v-model="keyword"
          class="search-block__input"
          clearable
          placeholder="请输入公会ID或名称"
          prefix-icon="el-icon-search"
          @keyup.enter.native="handleSearch"
          @clear="handleSearch"
        />
        <el-button type="primary" class="search-block__btn" @click="handleSearch">
          搜索
        </el-button>
      </div>
    </div>

    <div class="result-panel" v-loading="loading">
      <div v-if="resultList.length" class="result-list">
        <div
          v-for="item in resultList"
          :key="item.tradeId"
          class="result-item"
          :class="{ 'is-selected': isSelected(item) }"
        >
          <div class="result-item__main">
            <div class="result-item__name">{{ item.tradeName || "-" }}</div>
            <div class="result-item__meta">
              <span>{{ item.tradeId != null ? item.tradeId : "-" }}</span>
              <span>负责人 {{ item.leaderName || "-" }}</span>
              <span>陪玩师 {{ formatCount(item.waiterCount) }}</span>
              <span>保证金 {{ formatMoney(item.depositAmount) }}</span>
            </div>
          </div>
          <el-button
            type="text"
            class="result-item__action"
            @click="handleSelect(item)"
          >
            {{ isSelected(item) ? "已选 √" : "选择" }}
          </el-button>
        </div>
      </div>
      <el-empty v-else description="暂无可绑定公会" :image-size="88" />
    </div>

    <div v-if="selectedGuild" class="selected-card">
      <div class="selected-card__header">
        <div class="selected-card__name">{{ selectedGuild.tradeName || "-" }}</div>
        <div class="selected-card__id">
          {{ selectedGuild.tradeId != null ? selectedGuild.tradeId : "-" }}
        </div>
      </div>
      <div class="selected-card__grid">
        <div class="selected-card__item">
          <span class="label">负责人</span>
          <span class="value">
            {{ selectedGuild.leaderName || "-" }}
            <em v-if="selectedGuild.leaderPhone">{{ selectedGuild.leaderPhone }}</em>
          </span>
        </div>
        <div class="selected-card__item">
          <span class="label">陪玩师</span>
          <span class="value">{{ formatCount(selectedGuild.waiterCount) }}</span>
        </div>
        <div class="selected-card__item">
          <span class="label">保证金</span>
          <span class="value">{{ formatMoney(selectedGuild.depositAmount) }}</span>
        </div>
        <div class="selected-card__item">
          <span class="label">累计贡献</span>
          <span class="value">{{ formatMoney(selectedGuild.contributeProfitAmount) }}</span>
        </div>
      </div>
    </div>

    <div v-if="resultList.length" class="dialog-pagination">
      <PaginationSimple
        :current-page="pagination.pageNum"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :selected-rows="[]"
        @current-change="handleCurrentChange"
      />
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button
        type="primary"
        :disabled="!selectedGuild"
        :loading="submitting"
        @click="handleConfirm"
      >
        确认绑定
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { searchBindableGuild, addBindGuild } from "@/api/channelMerchant";

export default {
  name: "ManualBindDialog",
  components: { PaginationSimple },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    channelMerchantId: {
      type: [Number, String],
      default: null,
    },
    merchantName: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      keyword: "",
      loading: false,
      submitting: false,
      resultList: [],
      selectedGuild: null,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit("update:visible", val);
      },
    },
    dialogTitle() {
      const name = this.merchantName || "-";
      return `手动绑定公会 · ${name}`;
    },
  },
  methods: {
    formatCount(val) {
      if (val === null || val === undefined || val === "") return 0;
      return Number(val) || 0;
    },
    formatMoney(val) {
      if (val === null || val === undefined || val === "") return "¥0";
      const num = Number(val);
      if (!Number.isFinite(num)) return String(val);
      return `¥${num.toLocaleString("zh-CN")}`;
    },
    isSelected(item) {
      return (
        this.selectedGuild &&
        String(this.selectedGuild.tradeId) === String(item.tradeId)
      );
    },
    handleOpen() {
      this.resetState();
      this.fetchList();
    },
    handleClose() {
      this.resetState();
    },
    resetState() {
      this.keyword = "";
      this.loading = false;
      this.submitting = false;
      this.resultList = [];
      this.selectedGuild = null;
      this.pagination = { pageNum: 1, pageSize: 10, total: 0 };
    },
    handleSearch() {
      this.pagination.pageNum = 1;
      this.selectedGuild = null;
      this.fetchList();
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchList();
    },
    handleSelect(item) {
      this.selectedGuild = item;
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
      if (this.channelMerchantId == null || this.channelMerchantId === "") {
        this.resultList = [];
        this.pagination.total = 0;
        return;
      }
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          channelMerchantId: this.channelMerchantId,
        };
        const keyword = String(this.keyword || "").trim();
        if (keyword) params.keyword = keyword;
        const res = await searchBindableGuild(params);
        const { rows, total } = this.normalizeListRes(res);
        this.resultList = rows;
        this.pagination.total = total;
        if (
          this.selectedGuild &&
          !rows.some(
            (item) => String(item.tradeId) === String(this.selectedGuild.tradeId)
          )
        ) {
          this.selectedGuild = null;
        }
      } catch (e) {
        this.resultList = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    async handleConfirm() {
      if (!this.selectedGuild) {
        this.$message.warning("请先选择公会");
        return;
      }
      this.submitting = true;
      try {
        const res = await addBindGuild({
          channelMerchantId: this.channelMerchantId,
          tradeId: this.selectedGuild.tradeId,
        });
        if (res && res.success === false) {
          this.$message.error(res.errorMessage || "绑定失败");
          return;
        }
        const payload = res && res.data != null ? res.data : res;
        if (payload && payload.success === false) {
          this.$message.error("绑定失败");
          return;
        }
        this.$message.success("绑定成功");
        this.dialogVisible = false;
        this.$emit("success");
      } catch (e) {
        // 业务错误已由 request 拦截器提示
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style lang="scss">
.manual-bind-dialog {
  border-radius: 12px;
  overflow: hidden;

  .el-dialog__header {
    padding: 20px 24px 8px;
  }

  .el-dialog__title {
    font-size: 18px;
    font-weight: 600;
    color: #1d2129;
  }

  .el-dialog__body {
    padding: 8px 24px 0;
  }

  .el-dialog__footer {
    padding: 12px 24px 24px;
  }
}
</style>

<style scoped lang="scss">
.search-block {
  margin-bottom: 16px;
}

.search-block__label {
  margin-bottom: 8px;
  color: #4e5969;
  font-size: 13px;
  font-weight: 500;
}

.search-block__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-block__input {
  width: 360px;
  max-width: 100%;
}

.search-block__btn {
  background: #6a35ff;
  border-color: #6a35ff;
  border-radius: 8px;
}

.search-block__btn:hover,
.search-block__btn:focus {
  background: #8f5eff;
  border-color: #8f5eff;
}

.result-panel {
  min-height: 220px;
  max-height: 280px;
  overflow: auto;
  border: 1px solid #eef0f4;
  border-radius: 10px;
}

.result-list {
  padding: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: #f7f8fa;
  }

  &.is-selected {
    background: #f3edff;
  }
}

.result-item__name {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

.result-item__meta {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #86909c;
  font-size: 12px;
}

.result-item__action {
  flex-shrink: 0;
  color: #6a35ff !important;
  padding: 0;
}

.selected-card {
  margin-top: 16px;
  padding: 16px;
  border-radius: 10px;
  background: #f8f5ff;
  border: 1px solid #e8deff;
}

.selected-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.selected-card__name {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.selected-card__id {
  color: #86909c;
  font-size: 13px;
}

.selected-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.selected-card__item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  .label {
    color: #86909c;
    flex-shrink: 0;
  }

  .value {
    color: #1d2129;

    em {
      margin-left: 6px;
      font-style: normal;
      color: #86909c;
    }
  }
}

.dialog-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.dialog-footer .el-button--primary {
  background: #6a35ff;
  border-color: #6a35ff;
}

.dialog-footer .el-button--primary:hover,
.dialog-footer .el-button--primary:focus {
  background: #8f5eff;
  border-color: #8f5eff;
}

.dialog-footer .el-button--primary.is-disabled {
  background: #c9b6ff;
  border-color: #c9b6ff;
}
</style>
