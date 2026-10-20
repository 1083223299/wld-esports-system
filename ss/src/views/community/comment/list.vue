<template>
  <CommentInspection
    v-if="currentView !== 'list'"
    :mode="currentView"
    :comment-data="currentComment"
    @back="handleInspectionBack"
    @submit="handleInspectionSubmit"
  />
  <div v-else class="comment-list-page">
    <div ref="responsiveModule" class="search-module">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        :confirm-reset="false"
        label-width="88px"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <el-card class="list-card" shadow="never">
      <div class="table-toolbar">
        <div class="table-title">全量评论列表</div>
        <div class="table-summary">共 {{ pagination.total }} 条评论</div>
      </div>

      <div class="table-wrapper">
        <el-table
          ref="commentsTable"
          v-loading="loading"
          :data="tableData"
          stripe
          row-key="commentId"
          :border="false"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          style="width: 100%"
        >
          <el-table-column prop="commentId" label="评论ID" width="130" fixed="left" />
          <el-table-column prop="userNickname" label="用户昵称" width="130" show-overflow-tooltip />
          <el-table-column prop="userId" label="用户ID" width="130" />
          <el-table-column label="评论内容" min-width="260">
            <template slot-scope="{ row }">
              <el-tooltip
                :content="row.contentPreview || '-'"
                placement="top"
                effect="dark"
                popper-class="comment-content-tooltip"
                :disabled="!row.contentPreview"
              >
                <div class="content-preview">{{ row.contentPreview || '-' }}</div>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="postId" label="所属帖子ID" width="130" />
          <el-table-column label="所属帖子状态" width="120">
            <template slot-scope="{ row }">
              <span>{{ row.postStatusName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="神评" width="80">
            <template slot-scope="{ row }">
              <span :class="['plain-status', row.godComment ? 'is-warning' : 'is-muted']">
                {{ row.godComment ? "是" : "否" }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="likeCount" label="点赞数" width="90" />
          <el-table-column prop="replyCount" label="回复数" width="90" />
          <el-table-column label="审核状态" width="110">
            <template slot-scope="{ row }">
              <span :class="['plain-status', getAuditStatusClass(row.auditStatus)]">
                {{ getAuditStatusText(row.auditStatus) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="评论状态" width="100">
            <template slot-scope="{ row }">
              <span :class="['plain-status', getCommentStatusClass(row.commentStatus)]">
                {{ getCommentStatusText(row.commentStatus) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="publishTime" label="发布时间" width="170" />
          <el-table-column label="操作" width="190" fixed="right">
            <template slot-scope="{ row }">
              <div class="action-buttons">
                <el-button type="text" class="inspect-btn" @click="handleInspection(row)">巡检</el-button>
                <el-button type="text" class="detail-btn" @click="handleViewDetail(row)">查看</el-button>
                <el-button
                  v-if="row.godComment"
                  type="text"
                  class="danger-btn"
                  @click="handleHotTakedown(row)"
                >
                  神评下架
                </el-button>
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

    <el-dialog
      :visible.sync="hotTakedownDialogVisible"
      width="440px"
      append-to-body
      custom-class="comment-confirm-dialog"
      :close-on-click-modal="false"
      @closed="handleHotTakedownClosed"
    >
      <div slot="title" class="comment-confirm-header">
        <div class="comment-confirm-icon">
          <i class="el-icon-warning-outline"></i>
        </div>
        <div class="comment-confirm-title-wrap">
          <div class="comment-confirm-title">神评下架</div>
          <div class="comment-confirm-subtitle">确认后将立即更新该评论的神评状态</div>
        </div>
      </div>
      <div class="comment-confirm-content">
        <div class="comment-confirm-notice">
          <div class="comment-confirm-notice-title">温馨提示</div>
          <p>确定要下架该神评吗？</p>
          <p>下架后将去除神评标识，内容不会删除。</p>
          <p>神评占位释放，其他评论可自动递补。</p>
        </div>
      </div>
      <span slot="footer" class="comment-confirm-footer">
        <el-button class="comment-cancel-btn" @click="handleCancelHotTakedown">取消</el-button>
        <el-button
          type="primary"
          class="comment-submit-btn"
          :loading="hotTakedownLoading"
          @click="handleConfirmHotTakedown"
        >
          确认下架
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import CommentInspection from "./inspection.vue";
import { getCommentManages, getCommentManageDetail, cancelCommentFeatured } from "@/api/community.js";
import { assignSearchId } from "@/utils/index";

const IDENTITY_OPTIONS = [
  { label: "全部", value: "" },
  { label: "娱乐搭挡", value: "entertainment_partner" },
  { label: "技术搭挡", value: "technical_partner" },
  { label: "俱乐部负责人", value: "club_owner" },
];

const COMMENT_TYPE_OPTIONS = [
  { label: "全部", value: "" },
  { label: "评论", value: "comment" },
  { label: "回复", value: "reply" },
];

const AUDIT_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "正常", value: "NORMAL" },
  { label: "违规下架", value: "OFFLINE" },
];

const COMMENT_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "正常", value: "NORMAL" },
  { label: "用户删除", value: "DELETED" },
];

const MOCK_COMMENTS = [
  {
    commentId: "C20260722001",
    postId: "P20260722001",
    userNickname: "会飞的蝴蝶",
    userId: "ID9527",
    identity: "entertainment_partner",
    identityLabel: "娱乐搭挡",
    commentType: "comment",
    content: "这个配合思路很实用，尤其是前期沟通资源点的部分，晚上车队复盘可以直接拿来用。",
    replyToNickname: "",
    parentContent: "",
    postContent: "今天上分节奏很顺，整理了一套适合新手的开黑沟通话术，队友执行起来会更稳定。",
    godComment: true,
    likeCount: 526,
    replyCount: 28,
    dislikeCount: 0,
    auditStatus: "approved",
    commentStatus: "normal",
    commentTime: "2026-07-22 12:10:00",
  },
  {
    commentId: "C20260722002",
    postId: "P20260722001",
    userNickname: "小白不白",
    userId: "ID9318",
    identity: "technical_partner",
    identityLabel: "技术搭挡",
    commentType: "reply",
    content: "我补充一点，沟通里最好明确谁开团谁反打，不然新人很容易同时交技能。",
    replyToNickname: "会飞的蝴蝶",
    parentContent: "这个配合思路很实用，尤其是前期沟通资源点的部分，晚上车队复盘可以直接拿来用。",
    postContent: "今天上分节奏很顺，整理了一套适合新手的开黑沟通话术，队友执行起来会更稳定。",
    godComment: false,
    likeCount: 88,
    replyCount: 11,
    dislikeCount: 2,
    auditStatus: "approved",
    commentStatus: "normal",
    commentTime: "2026-07-22 12:36:00",
  },
  {
    commentId: "C20260721009",
    postId: "P20260721018",
    userNickname: "星河俱乐部",
    userId: "ID8801",
    identity: "club_owner",
    identityLabel: "俱乐部负责人",
    commentType: "comment",
    content: "版本节奏确实变快了，我们训练赛最近也把资源点集合时间提前了半分钟。",
    replyToNickname: "",
    parentContent: "",
    postContent: "英雄池更新后建议优先练两个稳定位置，别一次性切太多阵容。",
    godComment: true,
    likeCount: 208,
    replyCount: 46,
    dislikeCount: 1,
    auditStatus: "approved",
    commentStatus: "normal",
    commentTime: "2026-07-21 19:50:00",
  },
  {
    commentId: "C20260720016",
    postId: "P20260720007",
    userNickname: "蓝色耳机",
    userId: "ID7720",
    identity: "entertainment_partner",
    identityLabel: "娱乐搭挡",
    commentType: "comment",
    content: "报名规则写得很清楚，不过建议再加一个候补名单，临时缺人时能快速补位。",
    replyToNickname: "",
    parentContent: "",
    postContent: "本周俱乐部训练赛报名已开启，优先安排活跃成员，请备注常用位置。",
    godComment: false,
    likeCount: 55,
    replyCount: 5,
    dislikeCount: 0,
    auditStatus: "approved",
    commentStatus: "normal",
    commentTime: "2026-07-20 09:34:00",
  },
  {
    commentId: "C20260719021",
    postId: "P20260719004",
    userNickname: "峡谷观察员",
    userId: "ID7015",
    identity: "technical_partner",
    identityLabel: "技术搭挡",
    commentType: "reply",
    content: "这条回复里包含明显广告引流内容，建议管理员巡检后处理。",
    replyToNickname: "蓝色耳机",
    parentContent: "报名规则写得很清楚，不过建议再加一个候补名单，临时缺人时能快速补位。",
    postContent: "分享一组辅助位开局视野路线，适合五排训练时统一执行。",
    godComment: false,
    likeCount: 22,
    replyCount: 6,
    dislikeCount: 8,
    auditStatus: "pending",
    commentStatus: "normal",
    commentTime: "2026-07-19 22:18:00",
  },
  {
    commentId: "C20260718013",
    postId: "P20260718011",
    userNickname: "北城夜话",
    userId: "ID6521",
    identity: "entertainment_partner",
    identityLabel: "娱乐搭挡",
    commentType: "comment",
    content: "内容有点攻击其他玩家，已经被用户删除，但后台仍然需要保留巡检记录。",
    replyToNickname: "",
    parentContent: "",
    postContent: "周末娱乐赛复盘：配合比单点操作更影响整体胜率。",
    godComment: false,
    likeCount: 12,
    replyCount: 2,
    dislikeCount: 14,
    auditStatus: "rejected",
    commentStatus: "deleted",
    commentTime: "2026-07-18 18:02:00",
  },
  {
    commentId: "C20260717032",
    postId: "P20260717019",
    userNickname: "甜橙汽水",
    userId: "ID6188",
    identity: "entertainment_partner",
    identityLabel: "娱乐搭挡",
    commentType: "comment",
    content: "这个神评已经偏离原帖主题，互动量虽然高，但继续挂在前排容易误导讨论方向。",
    replyToNickname: "",
    parentContent: "",
    postContent: "今晚开黑车队缺一位辅助，要求能语音沟通，心态稳定。",
    godComment: true,
    likeCount: 865,
    replyCount: 45,
    dislikeCount: 12,
    auditStatus: "approved",
    commentStatus: "normal",
    commentTime: "2026-07-17 20:12:00",
  },
  {
    commentId: "C20260716018",
    postId: "P20260716008",
    userNickname: "青柠复盘",
    userId: "ID5901",
    identity: "technical_partner",
    identityLabel: "技术搭挡",
    commentType: "comment",
    content: "建议把数据面板补充到图二，单看文字不太容易判断阵容强弱。",
    replyToNickname: "",
    parentContent: "",
    postContent: "整理了近期高胜率阵容的适配场景，欢迎大家补充样本。",
    godComment: false,
    likeCount: 66,
    replyCount: 16,
    dislikeCount: 0,
    auditStatus: "approved",
    commentStatus: "normal",
    commentTime: "2026-07-16 14:22:00",
  },
  {
    commentId: "C20260715026",
    postId: "P20260715003",
    userNickname: "老友战队",
    userId: "ID5216",
    identity: "club_owner",
    identityLabel: "俱乐部负责人",
    commentType: "reply",
    content: "这条回复已被运营手动下架，原因是包含低俗辱骂内容。",
    replyToNickname: "青柠复盘",
    parentContent: "建议把数据面板补充到图二，单看文字不太容易判断阵容强弱。",
    postContent: "训练赛招募说明，报名后请按管理员排班准时上线。",
    godComment: false,
    likeCount: 6,
    replyCount: 0,
    dislikeCount: 18,
    auditStatus: "rejected",
    commentStatus: "offline",
    commentTime: "2026-07-15 11:45:00",
  },
  {
    commentId: "C20260714007",
    postId: "P20260714002",
    userNickname: "上分笔记",
    userId: "ID4698",
    identity: "technical_partner",
    identityLabel: "技术搭挡",
    commentType: "comment",
    content: "这段拆解很完整，建议作为示例评论保留在前排，能帮助新人理解复盘维度。",
    replyToNickname: "",
    parentContent: "",
    postContent: "如何判断一次团战失败是站位问题还是技能顺序问题。",
    godComment: true,
    likeCount: 456,
    replyCount: 88,
    dislikeCount: 3,
    auditStatus: "approved",
    commentStatus: "normal",
    commentTime: "2026-07-14 16:08:00",
  },
  {
    commentId: "C20260713012",
    postId: "P20260713005",
    userNickname: "半糖攻略",
    userId: "ID4026",
    identity: "entertainment_partner",
    identityLabel: "娱乐搭挡",
    commentType: "comment",
    content: "如果排位连败，建议先暂停半小时复盘，不要带情绪继续排。",
    replyToNickname: "",
    parentContent: "",
    postContent: "连败后的心态调整和复盘节奏，适合晚间车队使用。",
    godComment: false,
    likeCount: 102,
    replyCount: 19,
    dislikeCount: 1,
    auditStatus: "approved",
    commentStatus: "normal",
    commentTime: "2026-07-13 21:20:00",
  },
  {
    commentId: "C20260712004",
    postId: "P20260712001",
    userNickname: "不熬夜玩家",
    userId: "ID3760",
    identity: "entertainment_partner",
    identityLabel: "娱乐搭挡",
    commentType: "reply",
    content: "收到，今晚我按这个节奏来报点，先试两局看看队友反馈。",
    replyToNickname: "半糖攻略",
    parentContent: "如果排位连败，建议先暂停半小时复盘，不要带情绪继续排。",
    postContent: "五排沟通模板和复盘记录，适合固定队共享。",
    godComment: false,
    likeCount: 18,
    replyCount: 1,
    dislikeCount: 0,
    auditStatus: "approved",
    commentStatus: "normal",
    commentTime: "2026-07-12 10:16:00",
  },
];

export default {
  name: "CommunityCommentList",
  components: {
    SearchForm,
    CommentInspection,
  },
  data() {
    return {
      searchItems: [
        { prop: "postId", label: "帖子ID", type: "input", placeholder: "请输入" },
        { prop: "userNickname", label: "评论人昵称", type: "input", placeholder: "请输入" },
        { prop: "userId", label: "评论人ID", type: "input", placeholder: "请输入" },
        { prop: "auditStatus", label: "状态", type: "select", options: AUDIT_STATUS_OPTIONS },
        {
          prop: "commentTimeRange",
          label: "发布时间",
          type: "daterange",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          maxRangeDays: 90,
        },
      ],
      filterForm: this.getDefaultFilterForm(),
      tableData: [],
      loading: false,
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      currentView: "list",
      currentComment: null,
      hotTakedownDialogVisible: false,
      hotTakedownLoading: false,
      currentHotComment: null,
    };
  },
  mounted() {
    this.fetchTableData();
  },
  methods: {
    getDefaultFilterForm() {
      return {
        userNickname: "",
        userId: "",
        postId: "",
        auditStatus: "",
        commentTimeRange: [],
      };
    },
    handleSearch(formValues) {
      this.filterForm = {
        ...this.filterForm,
        ...formValues,
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset(formValues) {
      this.filterForm = formValues
        ? { ...this.getDefaultFilterForm(), ...formValues }
        : this.getDefaultFilterForm();
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
          ["userId", this.filterForm.userId, "评论人ID"],
          ["postId", this.filterForm.postId, "帖子ID"],
        ];
        for (const [key, value, label] of idFields) {
          if (!assignSearchId(params, key, value)) {
            this.$message.warning(`${label}格式不正确，请输入纯数字`);
            return;
          }
        }
        if (this.filterForm.auditStatus) {
          params.auditStatus = this.filterForm.auditStatus;
        }
        if (Array.isArray(this.filterForm.commentTimeRange) && this.filterForm.commentTimeRange.length === 2) {
          params.publishStartTime = this.filterForm.commentTimeRange[0];
          params.publishEndTime = this.filterForm.commentTimeRange[1];
        }
        const res = await getCommentManages(params);
        if (res.success && res.data) {
          this.tableData = (res.data.rows || []).map(row => ({
            ...row,
            commentId: row.commentId || '',
            postId: row.postId || '',
            postStatusName: row.postStatusName || '',
            userNickname: row.userNickname || '',
            userId: row.userId || '',
            contentPreview: row.contentPreview || '',
            hasMedia: row.hasMedia || false,
            godComment: row.godComment || false,
            gooComment: row.gooComment || false,
            likeCount: row.likeCount || 0,
            replyCount: row.replyCount || 0,
            auditStatus: row.auditStatus || '',
            auditStatusName: row.auditStatusName || '',
            commentStatus: row.commentStatus || '',
            commentStatusName: row.commentStatusName || '',
            publishTime: row.publishTime || '',
          }));
          this.pagination.total = res.data.total || 0;
        } else {
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        console.error("获取评论列表失败:", error);
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
    handleInspection(row) {
      this.openInspectionPage(row, "inspection");
    },
    handleViewDetail(row) {
      this.openInspectionPage(row, "view");
    },
    handleHotTakedown(row) {
      this.currentHotComment = { ...row };
      this.hotTakedownDialogVisible = true;
    },
    handleCancelHotTakedown() {
      this.hotTakedownDialogVisible = false;
    },
    handleHotTakedownClosed() {
      this.hotTakedownLoading = false;
      this.currentHotComment = null;
    },
    async handleConfirmHotTakedown() {
      if (!this.currentHotComment) {
        this.hotTakedownDialogVisible = false;
        return;
      }

      this.hotTakedownLoading = true;
      try {
        const res = await cancelCommentFeatured({ commentId: this.currentHotComment.commentId });
        if (res.success) {
          this.hotTakedownLoading = false;
          this.hotTakedownDialogVisible = false;
          this.$message.success("神评下架成功");
          this.fetchTableData();
        } else {
          this.$message.error(res.errorMessage || "下架失败");
        }
      } catch (error) {
        this.$message.error("下架失败");
      } finally {
        this.hotTakedownLoading = false;
      }
    },
    openInspectionPage(row, mode) {
      this.currentComment = { ...row };
      this.currentView = mode;
    },
    handleInspectionBack() {
      this.currentView = "list";
      this.currentComment = null;
    },
    handleInspectionSubmit() {
      this.handleInspectionBack();
      this.fetchTableData();
    },
    getContentPreview(content, limit = 30) {
      if (!content) {
        return "-";
      }

      return content.length > limit ? `${content.slice(0, limit)}...` : content;
    },
    getTimeValue(value) {
      return new Date(String(value).replace(/-/g, "/")).getTime();
    },
    getCommentTypeText(type) {
      const mapper = {
        comment: "评论",
        reply: "回复",
      };
      return mapper[type] || "-";
    },
    getAuditStatusText(status) {
      const mapper = {
        NORMAL: "正常",
        OFFLINE: "违规下架",
      };
      return mapper[status] || "-";
    },
    getAuditStatusClass(status) {
      const mapper = {
        NORMAL: "is-success",
        OFFLINE: "is-warning",
      };
      return mapper[status] || "is-muted";
    },
    getCommentStatusText(status) {
      const mapper = {
        NORMAL: "正常",
        DELETED: "用户删除",
      };
      return mapper[status] || "-";
    },
    getCommentStatusClass(status) {
      const mapper = {
        NORMAL: "is-primary",
        DELETED: "is-danger",
      };
      return mapper[status] || "is-muted";
    },
  },
};
</script>

<style scoped lang="scss">
.comment-list-page {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F5F7FA;
}

.search-module {
  flex-shrink: 0;
}

.list-card {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 24px;
}

::v-deep .list-card > .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px 20px 0;
  box-sizing: border-box;
}

.table-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
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
  min-height: 0;
  overflow-y: auto;
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

.danger-btn {
  color: #FF4D4F;
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
  .comment-list-page {
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
.comment-content-tooltip {
  max-width: 520px;
  line-height: 20px;
  white-space: normal;
  word-break: break-word;
}

.comment-confirm-title {
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}

.comment-confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.comment-confirm-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  color: #8F03FF;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(143, 3, 255, 0.12), rgba(144, 71, 248, 0.2));
}

.comment-confirm-title-wrap {
  min-width: 0;
}

.comment-confirm-subtitle {
  margin-top: 6px;
  color: #909399;
  font-size: 13px;
  line-height: 1.4;
}

.comment-confirm-content {
  padding: 4px 0 8px;
}

.comment-confirm-notice {
  padding: 16px;
  border: 1px solid rgba(143, 3, 255, 0.12);
  border-radius: 14px;
  background: linear-gradient(180deg, #FAF7FF 0%, #F5EFFF 100%);
}

.comment-confirm-notice-title {
  margin-bottom: 10px;
  color: #2F2F36;
  font-size: 18px;
  font-weight: 600;
}

.comment-confirm-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
}

.comment-confirm-content p + p {
  margin-top: 8px;
}

.comment-confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.comment-cancel-btn,
.comment-submit-btn {
  min-width: 88px;
  height: 36px;
  padding: 0;
  border-radius: 18px;
}

.comment-confirm-dialog {
  border-radius: 20px;
  overflow: hidden;
}

.comment-confirm-dialog .el-dialog__header {
  padding: 22px 24px 12px;
}

.comment-confirm-dialog .el-dialog__body {
  padding: 8px 24px 12px;
}

.comment-confirm-dialog .el-dialog__footer {
  padding: 8px 24px 24px;
}
</style>
