<template>
  <PostInspection
    v-if="currentView !== 'list'"
    :mode="currentView"
    :post-data="currentPost"
    @back="handleInspectionBack"
  />
  <div v-else class="posts-list-page">
    <div ref="responsiveModule" class="search-module">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        :confirm-reset="false"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <el-card class="list-card" shadow="never">
      <div class="table-toolbar">
        <div class="table-title">全量帖子列表</div>
        <div class="table-summary">共 {{ pagination.total }} 条帖子</div>
      </div>

      <div class="table-wrapper">
        <el-table
          ref="postsTable"
          v-loading="loading"
          :data="tableData"
          stripe
          row-key="postId"
          :border="false"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          style="width: 100%"
        >
          <el-table-column prop="postId" label="帖子ID" width="130" fixed="left" />
          <el-table-column prop="userNickname" label="用户昵称" width="130" show-overflow-tooltip />
          <el-table-column prop="userId" label="用户ID" width="130" />
          <el-table-column label="用户身份" width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <span class="identity-text">{{ row.identityLabel }}</span>
            </template>
          </el-table-column>
          <el-table-column label="文案内容" min-width="260">
            <template slot-scope="{ row }">
              <el-tooltip
                :content="row.content || '-'"
                placement="top"
                effect="dark"
                popper-class="post-content-tooltip"
                :disabled="!row.content"
              >
                <div class="content-preview">{{ getContentPreview(row.content) }}</div>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="话题" width="150">
            <template slot-scope="{ row }">
              <div class="topic-list">
                <span v-for="topic in row.topics" :key="topic" class="topic-item">#{{ topic }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="精选" width="90">
            <template slot-scope="{ row }">
              <el-switch
                :loading="featuredLoadingMap[row.postId]"
                :disabled="featuredLoadingMap[row.postId]"
                :value="row.featured"
                active-color="#8F03FF"
                inactive-color="#E5E6EB"
                @change="(val) => handleFeaturedChange(val, row)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="likeCount" label="点赞数" width="90" />
          <el-table-column prop="commentCount" label="评论数" width="90" />
          <el-table-column prop="collectCount" label="收藏" width="80" />
          <el-table-column prop="shareCount" label="分享" width="80" />
          <el-table-column prop="dislikeCount" label="踩" width="70" />
          <el-table-column label="推荐" width="80">
            <template slot-scope="{ row }">
              <span :class="['plain-status', row.recommended ? 'is-success' : 'is-muted']">
                {{ row.recommended ? '是' : '否' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="审核状态" width="110">
            <template slot-scope="{ row }">
              <span :class="['plain-status', getAuditStatusClass(row.auditStatus)]">
                {{ getAuditStatusText(row.auditStatus) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="帖子状态" width="100">
            <template slot-scope="{ row }">
              <span :class="['plain-status', getPostStatusClass(row.postStatus)]">
                {{ getPostStatusText(row.postStatus) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="publishTime" label="发帖时间" width="170" />
          <el-table-column label="操作" width="130" fixed="right">
            <template slot-scope="{ row }">
              <div class="action-buttons">
                <el-button type="text" class="inspect-btn" @click="handleInspection(row)">巡检</el-button>
                <el-button type="text" class="detail-btn" @click="handleViewDetail(row)">查看</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <el-pagination
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="prev, pager, next, sizes, jumper"
          @current-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PostInspection from "./inspection.vue";
import {
  getPostManages,
  setFeaturedPost,
  cancelFeaturedPost,
} from "@/api/community";
import { assignSearchId } from "@/utils/index";
const IDENTITY_OPTIONS = [
  { label: "全部", value: "" },
  { label: "娱乐搭挡", value: "ENTERTAINMENT" },
  { label: "技术搭挡", value: "TECHNICAL" },
  { label: "俱乐部负责人", value: "CLUB_LEADER" },
  { label: "普通老板", value: "NORMAL_BOSS" },
];

const POST_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "正常", value: "NORMAL" },
  { label: "已下架", value: "OFFLINE" },
  { label: "已删除", value: "DELETED" },
];

const AUDIT_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "审核通过", value: "PASS" },
  { label: "审核中", value: "REVIEWING" },
  { label: "审核驳回", value: "REJECTED" },
];

const RECOMMEND_OPTIONS = [
  { label: "全部", value: "" },
  { label: "是", value: "true" },
  { label: "否", value: "false" },
];

export default {
  name: "CommunityPostsList",
  components: {
    SearchForm,
    PostInspection,
  },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "postId",
          label: "帖子ID",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "input",
          prop: "userId",
          label: "用户ID",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "input",
          prop: "userNickname",
          label: "用户昵称",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "select",
          prop: "userType",
          label: "用户身份",
          placeholder: "全部",
          options: IDENTITY_OPTIONS,
          clearable: true,
        },
        {
          type: "select",
          prop: "auditStatus",
          label: "审核状态",
          placeholder: "全部",
          options: AUDIT_STATUS_OPTIONS,
          clearable: true,
        },
        {
          type: "select",
          prop: "postStatus",
          label: "帖子状态",
          placeholder: "全部",
          options: POST_STATUS_OPTIONS,
          clearable: true,
        },
        {
          type: "daterange",
          prop: "publishTimeRange",
          label: "发帖时间",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          maxRangeDays: 31,
          clearable: true,
        },
        {
          type: "select",
          prop: "recommended",
          label: "是否推荐",
          placeholder: "全部",
          options: RECOMMEND_OPTIONS,
          clearable: true,
        },
      ],
      filterForm: {
        postId: "",
        userId: "",
        userNickname: "",
        userType: "",
        auditStatus: "",
        postStatus: "",
        publishTimeRange: [],
        recommended: "",
      },
      tableData: [],
      loading: false,
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      currentView: "list",
      currentPost: null,
      featuredLoadingMap: {},
    };
  },
  mounted() {
    this.fetchTableData();
  },
  methods: {
    handleSearch(formValues) {
      this.filterForm = {
        ...this.filterForm,
        ...formValues,
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
        postId: "",
        userId: "",
        userNickname: "",
        userType: "",
        auditStatus: "",
        postStatus: "",
        publishTimeRange: [],
        recommended: "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
        };
        if (this.filterForm.userNickname) {
          params.userNickname = this.filterForm.userNickname;
        }
        const idFields = [
          ["postId", this.filterForm.postId, "帖子ID"],
          ["userId", this.filterForm.userId, "用户ID"],
        ];
        for (const [key, value, label] of idFields) {
          if (!assignSearchId(params, key, value)) {
            this.$message.warning(`${label}格式不正确，请输入纯数字`);
            return;
          }
        }
        if (this.filterForm.userType) {
          params.userType = this.filterForm.userType;
        }
        if (this.filterForm.postStatus) {
          params.postStatus = this.filterForm.postStatus;
        }
        if (this.filterForm.auditStatus) {
          params.auditStatus = this.filterForm.auditStatus;
        }
        if (this.filterForm.recommended !== "") {
          params.recommended = this.filterForm.recommended === "true";
        }
        if (Array.isArray(this.filterForm.publishTimeRange) && this.filterForm.publishTimeRange.length === 2) {
          params.publishStartTime = this.filterForm.publishTimeRange[0];
          params.publishEndTime = this.filterForm.publishTimeRange[1];
        }
        const res = await getPostManages(params);
        if (res.success && res.data) {
          this.tableData = (res.data.rows || []).map(row => ({
            ...row,
            identityLabel: row.userTypeName || "",
            topics: row.communityTopicName ? [row.communityTopicName] : [],
            publishTime: row.originalPublishTime || "",
          }));
          this.pagination.total = res.data.total || 0;
        } else {
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        console.error("获取帖子列表失败:", error);
        this.$message.error("获取列表失败");
      } finally {
        this.loading = false;
      }
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },
    handleSizeChange(size) {
      this.pagination.pageSize = size;
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    async handleFeaturedChange(val, row) {
      if (row == null) {
        row = val;
        val = row.featured;
      }
      const postId = row.postId;
      const shouldFeatured = Boolean(val);
      const isCurrentlyFeatured = !shouldFeatured;
      const actionText = isCurrentlyFeatured ? "取消精选" : "设为精选";
      const api = shouldFeatured ? setFeaturedPost : cancelFeaturedPost;

      this.$set(this.featuredLoadingMap, postId, true);
      try {
        const res = await api({ postId });
        if (!res || !res.success) {
          throw new Error(res && res.message ? res.message : `${actionText}失败`);
        }
        this.$message.success(`${actionText}成功`);
        await this.fetchTableData();
      } catch (error) {
        const idx = this.tableData.indexOf(row);
        if (idx > -1) {
          this.$set(this.tableData, idx, { ...row, featured: isCurrentlyFeatured });
        } else {
          row.featured = isCurrentlyFeatured;
        }
        this.$message.error(error && error.message ? error.message : `${actionText}失败`);
      } finally {
        this.$delete(this.featuredLoadingMap, postId);
      }
    },
    handleInspection(row) {
      this.openInspectionPage(row, "inspection");
    },
    handleViewDetail(row) {
      this.openInspectionPage(row, "view");
    },
    openInspectionPage(row, mode) {
      this.currentPost = { ...row };
      this.currentView = mode;
    },
    handleInspectionBack() {
      this.currentView = "list";
      this.currentPost = null;
    },
    getContentPreview(content) {
      if (!content) {
        return "-";
      }
      return content.length > 30 ? `${content.slice(0, 30)}...` : content;
    },
    isLongContent(content) {
      return Boolean(content && content.length > 30);
    },
    getAuditStatusText(status) {
      const map = {
        REVIEWING: "审核中",
        PASS: "审核通过",
        REJECTED: "审核驳回",
      };
      return map[status] || "-";
    },
    getAuditStatusClass(status) {
      const map = {
        REVIEWING: "is-warning",
        PASS: "is-success",
        REJECTED: "is-danger",
      };
      return map[status] || "is-muted";
    },
    getPostStatusText(status) {
      const map = {
        NORMAL: "正常",
        OFFLINE: "已下架",
        DELETED: "已删除",
      };
      return map[status] || "-";
    },
    getPostStatusClass(status) {
      const map = {
        NORMAL: "is-primary",
        OFFLINE: "is-warning",
        DELETED: "is-danger",
      };
      return map[status] || "is-muted";
    },
  },
};
</script>

<style scoped lang="scss">
.posts-list-page {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-module {
  flex-shrink: 0;
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

.table-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.table-title {
  color: #1D2129;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.table-summary {
  color: #86909C;
  font-size: 13px;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.identity-text {
  display: inline-block;
  max-width: 20em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.content-preview {
  max-width: 100%;
  color: #4E5969;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
}

.topic-list {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
}

.topic-item {
  color: #4E5969;
  font-size: 12px;
  line-height: 18px;
}

.plain-status {
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
}

.is-primary {
  color: #409EFF;
}

.is-success {
  color: #1BC286;
}

.is-warning {
  color: #FF8107;
}

.is-danger {
  color: #FF4D4F;
}

.is-muted {
  color: #86909C;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.action-buttons .el-button {
  padding: 0;
}

.inspect-btn {
  color: #9047F8;
}

.detail-btn {
  color: #409EFF;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #EBEEF5;
  display: flex;
  justify-content: flex-end;
  padding: 10px 0;
}

::v-deep .el-table {
  color: #4E5969;
  font-size: 14px;
}

::v-deep .el-table thead {
  color: #1D2129;
}

::v-deep .el-button--text:hover {
  background-color: transparent !important;
  border-color: transparent !important;
}

::v-deep .el-pagination {
  padding: 0;
}

@media screen and (max-width: 768px) {
  .posts-list-page {
    padding: 12px;
  }

  .table-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .pagination-fixed {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>

<style lang="scss">
.post-content-tooltip {
  max-width: 520px;
  line-height: 20px;
  white-space: normal;
  word-break: break-word;
}
</style>
