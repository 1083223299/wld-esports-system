<template>
  <div class="list-wrapper">
    <el-card class="config-card" shadow="never">
      <div class="page-head global-head">
        <div class="section-title">全局参数</div>
        <el-button
          type="primary"
          :loading="saveLoading"
          :disabled="!globalDirty"
          @click="handleSaveGlobal"
        >
          保存全局参数
        </el-button>
      </div>

      <div class="global-grid">
        <div class="global-item">
          <div class="global-label">当前启用群体配额之和</div>
          <div class="global-value">{{ pageSizeSum }} 人 / 页</div>
        </div>
        <div class="global-item">
          <div class="global-label">陪陪池固定刷新周期</div>
          <div class="global-control">
            <el-input
              :value="globalConfig.poolRefreshDays"
              class="number-input"
              maxlength="3"
              @input="handleRefreshDaysInput"
            />
            <span>天</span>
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="list-card group-card" shadow="never">
      <div class="section-head">
        <div class="section-title">群体标签配额</div>
      </div>

      <div class="table-wrapper">
        <el-table
          ref="quotaTable"
          v-loading="tableLoading"
          :data="groupList"
          row-key="id"
          stripe
          class="quota-table"
          :row-class-name="getQuotaRowClassName"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column label="优先级" width="120" align="center">
            <template slot-scope="{ row, $index }">
              <div class="priority-cell">
                <i v-if="!row.fixedLast" class="el-icon-rank drag-icon" />
                <span>{{ getPriorityLabel(row, $index) }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="群体标签" min-width="220" align="center">
            <template slot-scope="{ row }">
              <div class="group-cell">
                <span class="group-badge" :class="row.badgeClass">{{
                  row.groupName
                }}</span>
                <span v-if="row.fixedLast" class="fixed-note">系统内置</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="每页展示人数" width="170" align="center">
            <template slot-scope="{ row }">
              <div class="quota-display">
                <span class="quota-display__value">{{ row.quota }}</span>
                <span class="quota-display__unit">人</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="排序因素数" width="130" align="center">
            <template slot-scope="{ row }"
              >{{ row.factorCount || 0 }} 项</template
            >
          </el-table-column>

          <el-table-column label="状态" width="120" align="center">
            <template slot-scope="{ row }">
              <el-switch
                v-model="row.status"
                active-color="#8F03FF"
                active-value="1"
                inactive-value="0"
                :disabled="row.fixedLast || row.statusLoading"
                @change="handleChangeStatus(row)"
              />
            </template>
          </el-table-column>

          <el-table-column label="最近更新时间" min-width="220" align="center">
            <template slot-scope="{ row }">
              <div class="updated-cell">{{ row.updateTime || "-" }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="170" align="center">
            <template slot-scope="{ row }">
              <div class="operation-actions">
                <el-button
                  type="text"
                  class="edit-button"
                  @click="openSortDialog(row)"
                  >排序配置</el-button
                >
                <el-button
                  type="text"
                  class="edit-button"
                  @click="openQuotaEdit(row)"
                  >编辑</el-button
                >
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog
      :visible.sync="sortDialogVisible"
      width="920px"
      :close-on-click-modal="false"
      title="排序优先级配置"
      @close="resetSortDraft"
    >
      <div class="dialog-summary">
        <span class="dialog-group-name">{{ sortDraft.groupName || "-" }}</span>
        <span>每页展示 {{ sortDraft.quota || 0 }} 人</span>
        <span>优先级 {{ sortDraft.priority || "-" }}</span>
      </div>

      <el-table
        v-loading="factorLoading"
        :data="sortDraft.factors"
        stripe
        class="factor-table"
        :header-row-style="{ backgroundColor: '#F6F6FB' }"
        :cell-style="{ textAlign: 'left' }"
        :header-cell-style="{ textAlign: 'left' }"
      >
        <el-table-column label="因素名称" min-width="480">
          <template slot-scope="{ row }">{{
            row.factorName || row.factorCode
          }}</template>
        </el-table-column>
        <el-table-column label="分值（0-100）" width="220">
          <template slot-scope="{ row }">
            <el-input
              :value="row.score"
              class="number-input number-input--small"
              maxlength="3"
              @input="handleFactorScoreInput(row, $event)"
            />
          </template>
        </el-table-column>
        <el-table-column label="启用" width="120" align="center">
          <template slot-scope="{ row }">
            <el-switch v-model="row.enabledBoolean" active-color="#5d5fef" />
          </template>
        </el-table-column>
      </el-table>

      <div slot="footer">
        <el-button @click="sortDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="factorSaveLoading"
          @click="submitSortConfig"
        >
          保存配置
        </el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="编辑每页展示人数"
      :visible.sync="quotaDialogVisible"
      width="420px"
      :close-on-click-modal="false"
      @close="resetQuotaDialog"
    >
      <el-form label-width="110px">
        <el-form-item label="群体标签">
          <span>{{ quotaEditRow ? quotaEditRow.groupName : "-" }}</span>
        </el-form-item>
        <el-form-item label="每页展示人数">
          <el-input
            :value="quotaEditValue"
            class="number-input"
            maxlength="3"
            @input="handleQuotaDialogInput"
            @keyup.enter.native="saveGroupConfig"
          />
          <span class="form-unit">人</span>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="quotaDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="quotaSaveLoading"
          @click="saveGroupConfig"
        >
          确定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  changeCompanionRankGroupStatus,
  getCompanionRankFactorDetail,
  getCompanionRankGlobalDetail,
  getCompanionRankMetaOptions,
  listCompanionRankGroups,
  saveCompanionRankFactors,
  saveCompanionRankGlobal,
  saveCompanionRankGroup,
  sortCompanionRankGroups,
} from "@/api/companionRankConfig";

export default {
  name: "MarketingCompanionSortConfig",
  data() {
    return {
      tableLoading: false,
      factorLoading: false,
      saveLoading: false,
      factorSaveLoading: false,
      globalDirty: false,
      globalConfig: {
        id: null,
        poolRefreshDays: 3,
      },
      pageSizeSum: 0,
      groupList: [],
      metaOptions: {
        ruleOptions: [],
        factorOptions: [],
      },
      sortDialogVisible: false,
      quotaDialogVisible: false,
      quotaEditRow: null,
      quotaEditValue: 0,
      quotaSaveLoading: false,
      sortDraft: {
        groupId: null,
        groupName: "",
        quota: 0,
        priority: null,
        factors: [],
      },
      dragState: {
        draggingId: null,
      },
    };
  },
  async mounted() {
    await this.loadPage();
  },
  updated() {
    this.$nextTick(() => this.bindQuotaRowDrag());
  },
  methods: {
    getApiData(response) {
      if (!response || response.success !== true) {
        throw new Error((response && response.errorMessage) || "接口返回失败");
      }
      return response.data || {};
    },
    async loadPage() {
      this.tableLoading = true;
      try {
        const [globalResponse, groupResponse, metaResponse] = await Promise.all(
          [
            getCompanionRankGlobalDetail({}),
            listCompanionRankGroups({}),
            getCompanionRankMetaOptions({}),
          ]
        );
        const globalData = this.getApiData(globalResponse);
        const groupData = this.getApiData(groupResponse);
        const metaData = this.getApiData(metaResponse);
        this.globalConfig = {
          id: globalData.id || null,
          poolRefreshDays: Number(globalData.poolRefreshDays || 3),
        };
        this.pageSizeSum = Number(
          groupData.pageSizeSum || globalData.pageSizeSum || 0
        );
        this.metaOptions = {
          ruleOptions: metaData.ruleOptions || [],
          factorOptions: metaData.factorOptions || [],
        };
        this.groupList = (groupData.rows || []).map((row) =>
          this.normalizeGroup(row)
        );
        if (!this.pageSizeSum) {
          this.pageSizeSum = this.groupList
            .filter((row) => row.status === "1")
            .reduce((sum, row) => sum + row.quota, 0);
        }
      } catch (error) {
        this.groupList = [];

        this.$message.error(error.message || "加载排序配置失败");
      } finally {
        this.tableLoading = false;
      }
    },
    normalizeGroup(row) {
      const fixedLast =
        Number(row.builtinFlag) === 1 || row.groupCode === "other_companion";
      return {
        ...row,
        id: Number(row.id),
        quota: Number(row.quota || 0),
        editQuota: Number(row.quota || 0),

        quotaPopoverVisible: false,
        priority: Number(row.priority || 999),
        status: String(row.status),
        factorCount: Number(row.factorCount || 0),
        fixedLast,
        statusLoading: false,
        badgeClass: fixedLast
          ? "is-other"
          : row.groupCode === "new_companion"
          ? "is-new"
          : "is-quality",
      };
    },
    getPriorityLabel(row, index) {
      return row.fixedLast ? "末位" : row.priority || index + 1;
    },
    getStatusText(row) {
      return row.status === "1" ? "启用" : "停用";
    },
    getStatusClass(row) {
      return row.status === "1" ? "is-enabled" : "is-disabled";
    },
    normalizeNumberInput(value, min, max) {
      const digits = String(value == null ? "" : value).replace(/\D/g, "");
      if (!digits) return "";
      return String(Math.min(max, Math.max(min, Number(digits))));
    },
    handleRefreshDaysInput(value) {
      const normalized = this.normalizeNumberInput(value, 1, 365);
      this.globalConfig.poolRefreshDays =
        normalized === "" ? "" : Number(normalized);
      this.globalDirty = true;
    },

    // 保存全局参数
    async handleSaveGlobal() {
      this.saveLoading = true;
      try {
        const response = await saveCompanionRankGlobal({
          poolRefreshDays: Number(this.globalConfig.poolRefreshDays || 1),
        });
        this.getApiData(response);
        this.globalDirty = false;
        await this.loadPage();
        this.$message.success("全局参数保存成功");
      } catch (error) {
        this.$message.error(error.message || "保存全局参数失败");
      } finally {
        this.saveLoading = false;
      }
    },
    openQuotaEdit(row) {
      this.quotaEditRow = row;
      this.quotaEditValue = Number(row.quota || 0);
      this.quotaDialogVisible = true;
    },
    handleQuotaDialogInput(value) {
      const normalized = this.normalizeNumberInput(value, 0, 999);
      this.quotaEditValue = normalized === "" ? 0 : Number(normalized);
    },
    resetQuotaDialog() {
      this.quotaEditRow = null;
      this.quotaEditValue = 0;
    },

    // 群体配额保存
    async saveGroupConfig() {
      const row = this.quotaEditRow;
      if (!row) return;
      this.quotaSaveLoading = true;
      try {
        const response = await saveCompanionRankGroup({
          id: row.id,
          groupCode: row.groupCode,
          groupName: row.groupName,
          quota: Number(this.quotaEditValue || 0),
          ruleCodes: row.ruleCodes || [],
          status: String(row.status),
        });
        this.getApiData(response);
        this.quotaDialogVisible = false;
        await this.loadPage();
        this.$message.success("群体配额保存成功");
      } catch (error) {
        this.$message.error(error.message || "保存群体失败");
        await this.loadPage();
      } finally {
        this.quotaSaveLoading = false;
      }
    },

    // 状态修改
    async handleChangeStatus(row) {
      if (row.fixedLast) return;
      const nextStatus = String(row.status);
      const previousStatus = nextStatus === "1" ? "0" : "1";
      try {
        await this.$confirm(
          `确定要${nextStatus === "1" ? "启用" : "停用"}${row.groupName}吗？`,
          "提示",
          {
            type: "warning",
          }
        );
        row.statusLoading = true;
        const response = await changeCompanionRankGroupStatus({
          id: row.id,
          status: nextStatus,
        });
        this.getApiData(response);
        await this.loadPage();
        this.$message.success("状态修改成功");
      } catch (error) {
        row.status = previousStatus;
        if (error !== "cancel" && error !== "close") {
          this.$message.error(error.message || "修改状态失败");
        }
      } finally {
        row.statusLoading = false;
      }
    },
    getQuotaRowClassName({ row }) {
      const classes = [`quota-row-${row.id}`];
      if (row.fixedLast) classes.push("is-fixed");
      if (this.dragState.draggingId === row.id) classes.push("is-dragging");
      return classes.join(" ");
    },
    bindQuotaRowDrag() {
      const bodyWrapper =
        this.$refs.quotaTable && this.$refs.quotaTable.bodyWrapper;
      if (!bodyWrapper) return;
      this.groupList.forEach((row) => {
        const element = bodyWrapper.querySelector(`.quota-row-${row.id}`);
        if (!element) return;
        element.draggable = !row.fixedLast;
        element.ondragstart = row.fixedLast
          ? null
          : (event) => this.handleDragStart(row, event);
        element.ondragover = (event) => {
          event.preventDefault();
          if (!row.fixedLast) this.dragState.overId = row.id;
        };
        element.ondrop = (event) => {
          event.preventDefault();
          this.handleDrop(row);
        };
        element.ondragend = () => this.handleDragEnd();
      });
    },
    handleDragStart(row, event) {
      if (row.fixedLast) return;
      this.dragState.draggingId = row.id;
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    },
    handleDrop(row) {
      const draggingId = this.dragState.draggingId;
      if (!draggingId || row.fixedLast || draggingId === row.id) {
        this.handleDragEnd();
        return;
      }
      const movableRows = this.groupList.filter((item) => !item.fixedLast);
      const fixedRows = this.groupList.filter((item) => item.fixedLast);
      const fromIndex = movableRows.findIndex((item) => item.id === draggingId);
      const toIndex = movableRows.findIndex((item) => item.id === row.id);
      if (fromIndex < 0 || toIndex < 0) {
        this.handleDragEnd();
        return;
      }
      const moved = movableRows.splice(fromIndex, 1)[0];
      movableRows.splice(toIndex, 0, moved);
      this.groupList = movableRows.concat(fixedRows).map((item, index) => ({
        ...item,
        priority: item.fixedLast ? 999 : index + 1,
      }));
      this.handleDragEnd();
      this.saveGroupSort();
    },
    handleDragEnd() {
      this.dragState.draggingId = null;
      this.dragState.overId = null;
    },
    async saveGroupSort() {
      try {
        const response = await sortCompanionRankGroups({
          items: this.groupList.map((row, index) => ({
            id: row.id,
            priority: row.fixedLast ? 999 : index + 1,
          })),
        });
        this.getApiData(response);
        this.$message.success("群体优先级保存成功");
      } catch (error) {
        this.$message.error(error.message || "保存群体优先级失败");
        await this.loadPage();
      }
    },

    // 排序配置
    async openSortDialog(row) {
      this.sortDialogVisible = true;
      this.factorLoading = true;
      this.sortDraft = {
        groupId: row.id,
        groupName: row.groupName,
        quota: row.quota,
        priority: row.fixedLast ? "末位" : row.priority,
        factors: [],
      };
      try {
        const response = await getCompanionRankFactorDetail({
          groupId: row.id,
        });
        const data = this.getApiData(response);
        this.sortDraft = {
          ...this.sortDraft,
          groupName: data.groupName || row.groupName,
          quota: Number(data.quota || row.quota || 0),
          priority: data.priority || this.sortDraft.priority,
          factors: (data.factors || []).map((factor) => ({
            ...factor,
            score: Number(factor.score || 0),
            enabledBoolean: Number(factor.enabled) === 1,
          })),
        };
      } catch (error) {
        this.sortDialogVisible = false;
        this.$message.error(error.message || "加载因子配置失败");
      } finally {
        this.factorLoading = false;
      }
    },
    handleFactorScoreInput(row, value) {
      const normalized = this.normalizeNumberInput(value, 0, 100);
      row.score = normalized === "" ? 0 : Number(normalized);
    },
    resetSortDraft() {
      this.sortDraft = {
        groupId: null,
        groupName: "",
        quota: 0,
        priority: null,
        factors: [],
      };
    },

    // 因子配置保存
    async submitSortConfig() {
      this.factorSaveLoading = true;
      try {
        const response = await saveCompanionRankFactors({
          groupId: this.sortDraft.groupId,
          factors: this.sortDraft.factors.map((factor, index) => ({
            factorCode: factor.factorCode,
            score: Number(factor.score || 0),
            enabled: factor.enabledBoolean ? 1 : 0,
            sortOrder: Number(factor.sortOrder || index + 1),
          })),
        });
        this.getApiData(response);
        this.sortDialogVisible = false;
        await this.loadPage();
        this.$message.success("因子配置保存成功");
      } catch (error) {
        this.$message.error(error.message || "保存因子配置失败");
      } finally {
        this.factorSaveLoading = false;
      }
    },
  },
};
</script>

<style scoped lang="scss">
.list-wrapper {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  background: #f5f6fa;
}

.list-card {
  flex: 1;
  overflow: hidden;
}

.config-card {
  flex-shrink: 0;
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}

.config-card ::v-deep .el-card__body {
  padding: 20px;
}

::v-deep .list-card .el-card__body {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  box-sizing: border-box;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.global-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.global-item {
  padding: 16px;
  background: #fafbff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.global-label {
  margin-bottom: 10px;
  color: #606266;
  font-size: 14px;
}

.global-value,
.global-control {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.global-value {
  display: inline-flex;
  width: fit-content;
  padding: 0 10px;
  background: #fafbff;
  border: 1px solid #dfe3ef;
  border-radius: 8px;
}

.global-control ::v-deep .el-input__inner {
  border-radius: 8px;
}

.global-tip {
  color: #909399;
  font-size: 12px;
}

.global-tip {
  margin-top: 8px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title {
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.table-wrapper {
  overflow-x: auto;
}

.quota-table,
.factor-table {
  width: 100%;
}

.priority-cell,
.group-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.drag-icon {
  color: #909399;
  cursor: move;
}

.quota-display {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.quota-display__value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 28px;
  color: #606266;
  font-size: 13px;
}

.quota-display__unit {
  color: #909399;
  font-size: 13px;
}

.operation-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.updated-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  text-align: center;
}

.group-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
}

.group-badge.is-new {
  color: #5d5fef;
  background: #eff0ff;
}
.group-badge.is-quality {
  color: #e78b18;
  background: #fff2df;
}
.group-badge.is-other {
  color: #6b7283;
  background: #f0f2f7;
}
.fixed-note,
.updated-cell {
  color: #909399;
  font-size: 12px;
}

.number-input {
  width: 90px;
}
.number-input--small {
  width: 76px;
}

.edit-button {
  color: #9047f8 !important;
}

.form-unit {
  margin-left: 8px;
  color: #909399;
}

.status-button {
  padding: 0;
}
.status-button.is-enabled {
  color: #13ce66;
}
.status-button.is-disabled {
  color: #909399;
}

.dialog-summary {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
  color: #909399;
}

.dialog-group-name {
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.factor-desc {
  color: #606266;
  line-height: 1.5;
}
.factor-score-cell {
  display: flex;
  align-items: center;
}

.quota-popover__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

@media (max-width: 960px) {
  .list-wrapper {
    padding: 14px;
  }

  .page-head,
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }
  .global-grid {
    grid-template-columns: 1fr;
  }
}
</style>
