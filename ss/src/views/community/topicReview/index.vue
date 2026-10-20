<template>
  <div class="container-body">
    <div ref="responsiveModule" :key="activeTab">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        :confirm-reset="true"
        confirm-reset-message="确定要重置所有筛选条件吗？"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <el-card class="list-card" shadow="never">
      <div class="action-bar-fixed">
        <div class="tab-bar-wrap">
          <el-tabs v-model="activeTab" @tab-click="handleTabChange">
            <el-tab-pane name="audit">
              <span slot="label" class="tab-label">全部</span>
            </el-tab-pane>
            <el-tab-pane name="review">
              <span slot="label" class="tab-label">人工复审
                <el-tag size="mini" class="tab-badge" type="warning">{{ pendingCount }}</el-tag>
              </span>
            </el-tab-pane>
            <el-tab-pane name="handled">
              <span slot="label" class="tab-label">已处理</span>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <div class="table-wrapper">
        <el-table
          :key="activeTab"
          :data="tableData"
          stripe
          row-key="topicId"
          v-loading="loading"
          :border="false"
          height="100%"
          :empty-text="emptyText"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
          @row-click="handleRowClick"
        >
          <el-table-column prop="topicId" label="话题 ID" width="100" />
          <el-table-column prop="topicName" label="话题名" min-width="190" show-overflow-tooltip />
          <el-table-column label="创建者" min-width="150">
            <template slot-scope="scope">
              <span>{{ scope.row.creatorNickname || '-' }}</span>
              <span class="muted">（{{ scope.row.createBy || '-' }}）</span>
            </template>
          </el-table-column>
          <el-table-column prop="machineAuditTime" label="提交时间" width="180" />
          <el-table-column label="机审结果" width="110">
            <template slot-scope="scope">
              <el-tag :type="scope.row.machineResult === 'PASS' ? 'success' : 'danger'">
                {{ scope.row.machineResult === 'PASS' ? '通过' : '不通过' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="machineHitRules" label="命中规则" min-width="180" show-overflow-tooltip>
            <template slot-scope="scope">
              <span>{{ scope.row.machineHitRules || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="activeTab === 'audit'" label="复审时间" width="180">
            <template slot-scope="scope">
              <span>{{ scope.row.auditTime || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="activeTab === 'audit'" label="操作人" width="130">
            <template slot-scope="scope">
              <span>{{ scope.row.auditorName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="activeTab === 'handled'" prop="auditTime" label="复审时间" width="180" />
          <el-table-column v-if="activeTab === 'handled'" prop="auditorName" label="操作人" width="130">
            <template slot-scope="scope">
              <span>{{ scope.row.auditorName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="人工审核结果" width="110">
            <template slot-scope="scope">
              <span v-if="!scope.row.manualAuditResult">-</span>
              <span v-else-if="scope.row.manualAuditResult === 'PASS'" class="status-text status-pass">已通过</span>
              <span v-else-if="scope.row.manualAuditResult === 'REJECT'" class="status-text status-reject">已拒绝</span>
              <span v-else-if="scope.row.manualAuditResult === 'NONE'" class="status-text status-pending">待复审</span>
            </template>
          </el-table-column>
          <el-table-column v-if="activeTab === 'audit'" label="操作" width="130" fixed="right">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button
                  v-if="!scope.row.manualAuditResult || scope.row.manualAuditResult === 'NONE'"
                  class="review-btn"
                  @click="openReview(scope.row)"
                >复审</el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="activeTab === 'review'" label="操作" width="130" fixed="right">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button
                  v-if="!scope.row.manualAuditResult || scope.row.manualAuditResult === 'NONE'"
                  class="review-btn"
                  @click="openReview(scope.row)"
                >复审</el-button>
              </div>
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

    <el-drawer
      :title="drawerTitle"
      :visible.sync="drawerVisible"
      direction="rtl"
      size="500px"
      custom-class="review-drawer"
      :before-close="closeDrawer"
    >
      <div class="drawer-main" v-loading="detailLoading">
        <div class="drawer-section">
          <div class="drawer-row"><span class="label">话题名</span><span class="value">{{ detailRow.topicName || '-' }}</span></div>
          <div class="drawer-row">
            <span class="label">创建者</span>
            <span class="value">{{ detailRow.creatorNickname || '-' }}（{{ detailRow.createBy || '-' }}）</span>
          </div>
          <div class="drawer-row"><span class="label">提交时间</span><span class="value">{{ detailRow.machineAuditTime || '-' }}</span></div>
          <div class="drawer-row">
            <span class="label">机审结果</span>
            <span class="value">
              <el-tag :type="detailRow.machineResult === 'PASS' ? 'success' : 'danger'">
                {{ detailRow.machineResult === 'PASS' ? '通过' : '不通过' }}
              </el-tag>
            </span>
          </div>
          <div class="drawer-row"><span class="label">命中规则</span><span class="value">{{ detailRow.machineHitRules || '-' }}</span></div>
          <div v-if="detailRow.description" class="drawer-row"><span class="label">话题简介</span><span class="value summary">{{ detailRow.description }}</span></div>
          <div v-if="detailRow.coverUrl" class="drawer-row">
            <span class="label">话题封面</span>
            <span class="value">
              <el-image :src="detailRow.coverUrl" class="cover-preview" fit="cover" :preview-src-list="[detailRow.coverUrl]" />
            </span>
          </div>
          <div v-if="detailRow.auditTime" class="drawer-row"><span class="label">复审时间</span><span class="value">{{ detailRow.auditTime }}</span></div>
          <div v-if="detailRow.auditorName" class="drawer-row"><span class="label">复审人</span><span class="value">{{ detailRow.auditorName }}（{{ detailRow.auditBy || '-' }}）</span></div>
          <div v-if="detailRow.rejectReason" class="drawer-row"><span class="label">复审理由</span><span class="value summary">{{ detailRow.rejectReason }}</span></div>
          <div class="drawer-row">
            <span class="label">关联内容</span>
            <div class="value">
              <div v-if="detailRow.relatedPosts && detailRow.relatedPosts.length" class="related-list">
                <div v-for="(post, idx) in detailRow.relatedPosts" :key="idx" class="related-post">
                  <span class="related-title">{{ post.creatorNickname || post.nickname || '用户' }}：</span>
                  <span class="related-content">{{ post.summary || post.content || post.postContent || '-' }}</span>
                </div>
              </div>
              <span v-else class="summary">暂无内容摘要</span>
            </div>
          </div>
        </div>

        <div v-if="drawerMode === 'review'" class="drawer-section review-box">
          <div class="field-label">复审理由</div>
          <el-input
            v-model="reviewReason"
            type="textarea"
            :rows="4"
            placeholder="请输入复审理由，拒绝时必填"
            maxlength="200"
            show-word-limit
          />
        </div>

        <div v-if="drawerMode === 'review'" class="drawer-actions">
          <el-button plain @click="closeDrawer">取消</el-button>
          <el-button type="primary" @click="handleAudit('PASS')" :loading="submitLoading">复审通过</el-button>
          <el-button type="danger" @click="handleAudit('REJECT')" :loading="submitLoading">复审拒绝</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import SearchForm from '@/components/SearchComponent/index.vue';
import PaginationSimple from '@/components/PaginationSimple/index.vue';
import {
  getTopicReviewMachinePage,
  getTopicReviewManualPage,
  getTopicReviewProcessedPage,
  getTopicReviewPendingCount,
  getTopicReviewDetail,
  auditTopicReview,
} from '@/api/community';

export default {
  name: 'TopicReviewList',
  components: {
    SearchForm,
    PaginationSimple,
  },
  data() {
    return {
      searchConfigs: {
        audit: [
          {
            type: 'input',
            prop: 'topicName',
            label: '话题名',
            placeholder: '请输入话题名称',
            clearable: true,
          },
          {
            type: 'input',
            prop: 'creator',
            label: '创建者',
            placeholder: '请输入创建者昵称/ID',
            clearable: true,
          },
          {
            type: 'select',
            prop: 'machineResult',
            label: '机审结果',
            placeholder: '全部',
            clearable: true,
            options: [
              { label: '通过', value: 'PASS' },
              { label: '不通过', value: 'FAIL' },
            ],
          },
        ],
        review: [
          {
            type: 'input',
            prop: 'topicName',
            label: '话题名',
            placeholder: '请输入话题名称',
            clearable: true,
          },
          {
            type: 'input',
            prop: 'creator',
            label: '创建者',
            placeholder: '请输入创建者昵称/ID',
            clearable: true,
          },
        ],
        handled: [
          {
            type: 'input',
            prop: 'topicName',
            label: '话题名',
            placeholder: '请输入话题名称',
            clearable: true,
          },
          {
            type: 'input',
            prop: 'creator',
            label: '创建者',
            placeholder: '请输入创建者昵称/ID',
            clearable: true,
          },
          {
            type: 'select',
            prop: 'auditStatus',
            label: '审核结果',
            placeholder: '全部',
            clearable: true,
            options: [
              { label: '复审通过', value: 'APPROVED' },
              { label: '复审拒绝', value: 'REJECTED' },
              { label: '待复审', value: 'PENDING_REVIEW' },
            ],
          },
        ],
      },
      filterForm: {},
      activeTab: 'audit',
      pendingCount: 0,
      loading: false,
      drawerVisible: false,
      drawerTitle: '查看详情',
      drawerMode: 'detail',
      detailRow: {},
      detailLoading: false,
      reviewReason: '',
      submitLoading: false,
      pagination: {
        pageNum: 1,
        pageSize: 20,
        total: 0,
      },
      tableData: [],
    };
  },
  computed: {
    searchItems() {
      return this.searchConfigs[this.activeTab] || [];
    },
    emptyText() {
      return this.activeTab === 'review' ? '当前没有需要复审的话题 🎉' : '暂无数据';
    },
  },
  created() {
    this.filterForm = this.buildEmptyFilter();
    this.fetchTableData();
    this.fetchPendingCount();
    this.$store.dispatch('app/fetchMenuBadges');
  },
  methods: {
    buildEmptyFilter() {
      const base = {};
      (this.searchConfigs[this.activeTab] || []).forEach((item) => {
        base[item.prop] = '';
      });
      return base;
    },
    buildParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      const f = this.filterForm;
      if (f.topicName && f.topicName.trim()) {
        params.topicName = f.topicName.trim();
      }
      const creator = (f.creator || '').trim();
      if (creator) {
        if (/^\d+$/.test(creator)) {
          params.createBy = Number(creator);
        }
        params.creatorKeyword = creator;
      }
      if (this.activeTab === 'audit' && f.machineResult) {
        params.machineResult = f.machineResult;
      }
      if (this.activeTab === 'handled' && f.auditStatus) {
        params.auditStatus = f.auditStatus;
      }
      return params;
    },
    async fetchPendingCount() {
      try {
        const res = await getTopicReviewPendingCount({});
        if (res && res.success !== false && res.data) {
          this.pendingCount = res.data.pendingCount || 0;
        }
      } catch (e) {
        console.error('获取待复审数量失败:', e);
      }
    },
    handleTabChange() {
      this.pagination.pageNum = 1;
      this.filterForm = this.buildEmptyFilter();
      this.fetchTableData();
      if (this.activeTab === 'review') {
        this.fetchPendingCount();
      }
    },
    handleSearch(e) {
      if (e) {
        this.filterForm = e;
      }
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset(e) {
      if (e) {
        this.filterForm = e;
      }
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },
    handleRowClick(row, column, event) {
      if (event && event.target && event.target.closest && event.target.closest('.el-button')) {
        return;
      }
      // this.openDetail(row);
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const fetchers = {
          audit: getTopicReviewMachinePage,
          review: getTopicReviewManualPage,
          handled: getTopicReviewProcessedPage,
        };
        const res = await fetchers[this.activeTab](this.buildParams());
        if (res && res.success !== false && res.data) {
          this.tableData = res.data.rows || [];
          this.pagination.total = res.data.total || 0;
        } else {
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (e) {
        console.error('获取话题审核列表失败:', e);
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    async loadDetail(row, mode) {
      this.detailRow = { topicId: row.topicId };
      this.reviewReason = '';
      this.drawerMode = mode;
      this.drawerTitle = mode === 'review' ? '人工复审' : '话题详情';
      this.drawerVisible = true;
      this.detailLoading = true;
      try {
        const res = await getTopicReviewDetail({ topicId: row.topicId });
        if (res && res.success !== false && res.data) {
          this.detailRow = res.data;
          this.reviewReason = res.data.rejectReason || '';
        } else {
          this.$message.error((res && res.errorMessage) || '获取详情失败');
        }
      } catch (e) {
        this.$message.error('获取详情失败');
      } finally {
        this.detailLoading = false;
      }
    },
    openDetail(row) {
      this.loadDetail(row, 'detail');
    },
    openReview(row) {
      this.loadDetail(row, 'review');
    },
    closeDrawer() {
      this.drawerVisible = false;
      this.reviewReason = '';
      this.submitLoading = false;
    },
    async handleAudit(decision) {
      if (!this.detailRow || !this.detailRow.topicId) return;
      if (decision === 'REJECT' && !(this.reviewReason && this.reviewReason.trim())) {
        this.$message.warning('复审拒绝时必须填写理由');
        return;
      }
      if (decision === 'REJECT') {
        try {
          await this.$confirm('确认标记该话题不可用？拒绝后用户侧不可见，且不可撤销。', '是否拒绝', {
            confirmButtonText: '确认拒绝',
            cancelButtonText: '取消',
            type: 'warning',
          });
        } catch (err) {
          return;
        }
      }
      this.submitLoading = true;
      try {
        const res = await auditTopicReview({
          topicId: this.detailRow.topicId,
          decision,
          rejectReason: decision === 'REJECT' ? this.reviewReason.trim() : (this.reviewReason || '').trim(),
        });
        if (res && res.success !== false) {
          this.$message.success(decision === 'PASS' ? '复审通过' : '复审拒绝');
          this.drawerVisible = false;
          this.reviewReason = '';
          this.fetchTableData();
          this.fetchPendingCount();
          this.$store.dispatch('app/fetchMenuBadges');
        } else {
          this.$message.error((res && res.errorMessage) || (decision === 'PASS' ? '复审通过失败' : '复审拒绝失败'));
        }
      } catch (e) {
        this.$message.error(decision === 'PASS' ? '复审通过失败' : '复审拒绝失败');
      } finally {
        this.submitLoading = false;
      }
    },
  },
};
</script>

<style scoped lang="scss">
.container-body {
  height: 100%;
  background: #f4f6fb;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-card {
  background: #fff;
  border: 1px solid #eef0f6;
  border-radius: 12px;
  box-shadow: none;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

::v-deep .list-card .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.action-bar-fixed {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 10px;
}

.tab-bar-wrap {
  width: 100%;
  background: linear-gradient(180deg, #f8f6ff 0%, #f4f7fb 100%);
  border: 1px solid #efeafc;
  border-radius: 14px;
  padding: 8px 10px 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}

::v-deep .el-tabs__header {
  margin: 0;
  border-bottom: none;
}

::v-deep .el-tabs__nav-wrap {
  background: transparent;
}

::v-deep .el-tabs__nav {
  display: flex;
  gap: 8px;
  padding: 2px 0 4px;
}

::v-deep .el-tabs__item {
  height: 44px;
  line-height: 44px;
  font-size: 15px;
  font-weight: 700;
  color: #5d6575;
  padding: 0 18px!important;
  border-radius: 10px;
  transition: all 0.2s ease;
  position: relative;
}

::v-deep .el-tabs__item:hover {
  color: #4a3bc8;
  background: rgba(106, 53, 255, 0.04);
}

::v-deep .el-tabs__item.is-active {
  color: #ffffff;
  background: linear-gradient(135deg, #7a4dff 0%, #5d36e8 100%);
  box-shadow: 0 8px 18px rgba(106, 53, 255, 0.24);
}

::v-deep .el-tabs__active-bar {
  display: none;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

::v-deep .tab-badge {
  margin-left: 2px;
  transform: translateY(-1px);
}

::v-deep .el-tabs__item.is-active .tab-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.25);
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  position: relative;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.pagination-fixed {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  flex-shrink: 0;
}

.muted {
  color: #9aa3b2;
  font-size: 12px;
}

.status-text {
  font-size: 14px;
  font-weight: 600;
}

.status-pass {
  color: #67c23a;
}

.status-reject {
  color: #f56c6c;
}

.status-pending {
  color: #e6a23c;
}

.review-btn {
  height: 28px;
  padding: 0 16px;
  font-size: 12px;
  color: #7a4dff;
  background: linear-gradient(180deg, #ffffff 0%, #f3edff 100%);
  border: 1px solid #cbb2ff;
  border-radius: 999px;
  transition: all 0.2s ease;
}

::v-deep .review-btn:hover,
::v-deep .review-btn:focus {
  color: #ffffff;
  background: linear-gradient(135deg, #7a4dff 0%, #5d36e8 100%);
  border-color: #7a4dff;
  box-shadow: 0 6px 14px rgba(106, 53, 255, 0.28);
}

::v-deep .review-btn:active {
  transform: scale(0.96);
}

.review-drawer {
  .el-drawer__header {
    padding: 18px 24px 16px;
    margin-bottom: 0;
    border-bottom: 1px solid #edeef5;
    background: linear-gradient(180deg, #ffffff 0%, #faf7ff 100%);
  }

  .el-drawer__title {
    font-size: 18px;
    font-weight: 700;
    color: #1f2430;
  }
}

.drawer-main {
  padding: 22px 20px 24px;
}

.drawer-section {
  border: 1px solid #ececf5;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  padding: 18px 18px 12px;
  margin-bottom: 20px;
  box-shadow: 0 6px 18px rgba(92, 86, 118, 0.04);
}

.drawer-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px dashed #edf0f5;

  &:last-child {
    border-bottom: none;
  }
}

.label {
  width: 92px;
  color: #6a7185;
  flex-shrink: 0;
  font-weight: 600;
}

.value {
  color: #2a2f3a;
  line-height: 1.8;
  flex: 1;
}

.summary {
  white-space: normal;
  word-break: break-all;
}

.cover-preview {
  width: 120px;
  height: 72px;
  border-radius: 8px;
  display: block;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.related-post {
  padding: 8px 10px;
  background: #f6f7fb;
  border-radius: 8px;
  line-height: 1.6;
}

.related-title {
  color: #6a35ff;
  font-weight: 600;
}

.related-content {
  color: #3a4150;
}

.field-label {
  font-size: 15px;
  color: #2b2f3a;
  margin-bottom: 12px;
  font-weight: 700;
}

.review-box {
  padding-top: 18px;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
}

::v-deep .el-tag {
  border-radius: 999px;
}
</style>