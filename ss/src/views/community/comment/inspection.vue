<template>
  <div class="comment-inspection-page">
    <div class="page-header" @click="handleBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">{{ pageTitle }}</div>
    </div>

    <el-card class="detail-card" shadow="never">
      <div class="detail-scroll">
        <!-- 关联帖子 -->
        <div class="post-section">
          <div class="section-title">关联帖子</div>

          <div class="post-images" v-if="postMediaList.length">
            <el-image
              v-for="(media, index) in postMediaList"
              :key="index"
              :src="media.url"
              :preview-src-list="postMediaList.map(m => m.url)"
              fit="cover"
              class="post-image"
            />
          </div>

          <div class="post-videos" v-if="postVideoList.length">
            <div v-for="(video, index) in postVideoList" :key="'post-video-' + index" class="video-item">
              <video :src="video.url" :poster="video.coverUrl" controls class="preview-video"></video>
            </div>
          </div>

          <div class="post-content">{{ postInfo.postContent }}</div>

          <div class="post-meta">
            <div class="post-author">
              <i class="el-icon-user"></i>
              <span>{{ postInfo.postUserNickname }}</span>
            </div>
            <div class="post-time">
              <i class="el-icon-time"></i>
              <span>{{ postInfo.publishTime }}</span>
            </div>
            <div class="post-stats">
              <i class="el-icon-thumb"></i>
              <span>{{ postInfo.postLikeCount }}</span>
              <i class="el-icon-chat-dot-round" style="margin-left: 8px;"></i>
              <span>{{ postInfo.postCommentCount }}</span>
              <i class="el-icon-share" style="margin-left: 8px;"></i>
              <span>{{ postInfo.postShareCount }}</span>
            </div>
          </div>

          <div class="post-tags">
            <span>话题：{{ postInfo.communityTopicName || '-' }}</span>
            <span>精选：{{ postInfo.featured ? '精选' : '未精选' }}</span>
          </div>
        </div>

        <!-- 评论内容 -->
        <div class="comment-section">
          <div class="section-title">评论内容</div>

          <div class="comment-header">
            <div class="comment-author">
              <i class="el-icon-user"></i>
              <span>{{ commentDetail.userNickname }}</span>
            </div>
            <div class="comment-time">
              <i class="el-icon-time"></i>
              <span>{{ commentDetail.publishTime }}</span>
            </div>
          </div>

          <div class="comment-images" v-if="commentMediaList.length">
            <el-image
              v-for="(media, index) in commentMediaList"
              :key="'comment-' + index"
              :src="media.url"
              :preview-src-list="commentMediaList.map(m => m.url)"
              fit="cover"
              class="comment-image"
            />
          </div>

          <div class="comment-videos" v-if="commentVideoList.length">
            <div v-for="(video, index) in commentVideoList" :key="'comment-video-' + index" class="video-item">
              <video :src="video.url" :poster="video.coverUrl" controls class="preview-video"></video>
            </div>
          </div>

          <div class="comment-content-box">
            {{ commentDetail.content }}
          </div>

          <div class="adjacent-comments" v-if="commentDetail.previousComment || commentDetail.nextComment">
            <div v-if="commentDetail.previousComment" class="adjacent-item">
              <span class="adjacent-label">↑ 上一楼（{{ commentDetail.previousComment.userNickname }}）：</span>
              <span class="adjacent-content">{{ commentDetail.previousComment.content }}</span>
            </div>
            <div v-if="commentDetail.nextComment" class="adjacent-item">
              <span class="adjacent-label">↓ 下一楼（{{ commentDetail.nextComment.userNickname }}）：</span>
              <span class="adjacent-content">{{ commentDetail.nextComment.content }}</span>
            </div>
          </div>
        </div>

        <!-- 巡检表单 -->
        <div v-if="isInspectionMode" class="operation-panel">
          <el-form
            ref="inspectionForm"
            :model="inspectionForm"
            :rules="inspectionRules"
            label-width="92px"
            label-position="left"
            class="operation-form"
          >
            <el-form-item label="巡检结果" prop="decision">
              <el-select v-model="inspectionForm.decision" placeholder="请选择" style="width: 100%">
                <el-option label="审核通过" value="PASS" />
                <el-option label="审核驳回" value="OFFLINE" />
              </el-select>
            </el-form-item>

            <el-form-item label="审核意见" prop="opinion">
              <el-input
                v-model="inspectionForm.opinion"
                type="textarea"
                :rows="4"
                maxlength="200"
                show-word-limit
                placeholder="请输入"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="footer-actions" :class="{ 'is-operation': isOperationMode }">
        <template v-if="isOperationMode">
          <el-button class="cancel-btn" @click="handleBack">取消</el-button>
          <el-button type="primary" class="submit-btn" :loading="submitting" @click="handleSubmit">提交</el-button>
        </template>
        <el-button v-else class="close-btn" @click="handleBack">关闭</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { getCommentManageDetail, patrolComment } from "@/api/community.js";

export default {
  name: "CommunityCommentInspection",
  props: {
    mode: {
      type: String,
      default: "inspection",
    },
    commentData: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      postInfo: {
        postId: "",
        postUserId: "",
        postUserNickname: "",
        postContent: "",
        mediaList: [],
        publishTime: "",
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        communityTopicName: "",
        featured: false,
        postStatus: "",
        postStatusName: "",
      },
      commentDetail: {
        commentId: "",
        postId: "",
        userNickname: "",
        userId: "",
        content: "",
        mediaList: [],
        publishTime: "",
        likeCount: 0,
        replyCount: 0,
        hotComment: false,
        godComment: false,
        auditStatus: "",
        auditStatusName: "",
        commentStatus: "",
        commentStatusName: "",
        previousComment: null,
        nextComment: null,
      },
      inspectionForm: {
        decision: "",
        opinion: "",
      },
      inspectionRules: {
        decision: [{ required: true, message: "请选择巡检结果", trigger: "change" }],
        opinion: [{ required: true, message: "请输入审核意见", trigger: "blur" }],
      },
      submitting: false,
    };
  },
  computed: {
    pageTitle() {
      const mapper = {
        view: "评论详情",
        inspection: "巡检",
      };
      return mapper[this.mode] || "评论详情";
    },
    isInspectionMode() {
      return this.mode === "inspection";
    },
    isOperationMode() {
      return this.isInspectionMode;
    },
    postMediaList() {
      if (!this.postInfo.mediaList || !this.postInfo.mediaList.length) {
        return [];
      }
      return this.postInfo.mediaList
        .filter(item => item.mediaType === "IMAGE")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },
    postVideoList() {
      if (!this.postInfo.mediaList || !this.postInfo.mediaList.length) {
        return [];
      }
      return this.postInfo.mediaList
        .filter(item => item.mediaType === "VIDEO")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },
    commentMediaList() {
      if (!this.commentDetail.mediaList || !this.commentDetail.mediaList.length) {
        return [];
      }
      return this.commentDetail.mediaList
        .filter(item => item.mediaType === "IMAGE")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },
    commentVideoList() {
      if (!this.commentDetail.mediaList || !this.commentDetail.mediaList.length) {
        return [];
      }
      return this.commentDetail.mediaList
        .filter(item => item.mediaType === "VIDEO")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },
  },
  created() {
    this.initCommentDetail();
  },
  methods: {
    async initCommentDetail() {
      if (!this.commentData) {
        return;
      }

      // 填充评论基础信息
      this.commentDetail = {
        ...this.commentDetail,
        ...this.commentData,
      };

      if (this.commentData.commentId) {
        try {
          const res = await getCommentManageDetail({ commentId: this.commentData.commentId });
          if (res.success && res.data) {
            const data = res.data;
            // 帖子信息
            this.postInfo = {
              postId: data.postId || "",
              postUserId: data.postUserId || "",
              postUserNickname: data.postUserNickname || "",
              postContent: data.postContent || "",
              mediaList: data.postMediaList || [],
              publishTime: data.publishTime || "",
              likeCount: data.likeCount || 0,
              commentCount: data.replyCount || 0,
              shareCount: 0,
              communityTopicName: data.communityTopicName || "",
              featured: data.featured || false,
              postStatus: data.postStatus || "",
              postStatusName: data.postStatusName || "",
              postShareCount:data.postShareCount,
              postLikeCount:data.postLikeCount,
              postCommentCount:data.postCommentCount
            };
            // 评论信息（mediaList 是评论的图片）
            this.commentDetail = {
              ...this.commentDetail,
              commentId: data.commentId || "",
              userNickname: data.userNickname || "",
              userId: data.userId || "",
              content: data.content || "",
              mediaList: data.mediaList || [],
              publishTime: data.publishTime || "",
              likeCount: data.likeCount || 0,
              replyCount: data.replyCount || 0,
              hotComment: data.hotComment || false,
              godComment: data.godComment || false,
              auditStatus: data.auditStatus || "",
              auditStatusName: data.auditStatusName || "",
              commentStatus: data.commentStatus || "",
              commentStatusName: data.commentStatusName || "",
              previousComment: data.previousComment || null,
              nextComment: data.nextComment || null,
            };
          }
        } catch (error) {
          console.error("获取评论详情失败:", error);
        }
      }
    },
    handleSubmit() {
      if (this.isInspectionMode) {
        this.submitInspection();
      }
    },
    async submitInspection() {
      if (this.submitting) {
        return;
      }
      this.$refs.inspectionForm.validate(async (valid) => {
        if (!valid) {
          return;
        }

        this.submitting = true;
        try {
          const res = await patrolComment({
            commentId: this.commentDetail.commentId,
            decision: this.inspectionForm.decision,
            opinion: this.inspectionForm.opinion,
          });
          if (res.success) {
            this.$message.success("巡检结果提交成功");
            this.$emit("submit", {
              mode: "inspection",
              commentId: this.commentDetail.commentId,
              decision: this.inspectionForm.decision,
              opinion: this.inspectionForm.opinion,
            });
          } else {
            this.$message.error(res.errorMessage || "提交失败");
          }
        } catch (error) {
          this.$message.error("提交失败");
        } finally {
          this.submitting = false;
        }
      });
    },
    handleBack() {
      if (this.$listeners.back) {
        this.$emit("back");
        return;
      }

      if (window.history.length > 1) {
        this.$router.back();
        return;
      }

      this.$router.push({ path: "/community/comment/list" });
    },
  },
};
</script>

<style scoped lang="scss">
.comment-inspection-page {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F5F7FA;
}

.page-header {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  margin-bottom: 16px;
  color: #1D2129;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  i {
    margin-right: 8px;
    font-size: 18px;
    color: #1D2129;
  }
}

.detail-card {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 24px;
}

::v-deep .detail-card > .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 32px 20px;
  box-sizing: border-box;
}

.detail-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.post-section,
.comment-section {
  padding-bottom: 24px;
  margin-bottom: 22px;
  border-bottom: 1px solid #E5E6EB;
}

.section-title {
  margin-bottom: 14px;
  color: #1D2129;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}

.post-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #F6F6FB;
}

.post-videos,
.comment-videos {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.video-item {
  width: 240px;
  border-radius: 6px;
  overflow: hidden;
  background: #000;
}

.preview-video {
  width: 100%;
  display: block;
}

.post-content {
  max-width: 920px;
  margin-bottom: 18px;
  color: #1D2129;
  font-size: 14px;
  line-height: 24px;
  word-break: break-word;
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 28px;
  margin-bottom: 16px;
  color: #1D2129;
  font-size: 14px;
  line-height: 20px;

  i {
    margin-right: 8px;
    color: #000;
    font-size: 18px;
  }
}

.post-author,
.post-time,
.post-stats {
  display: inline-flex;
  align-items: center;
}

.post-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 42px;
  color: #1D2129;
  font-size: 14px;
  line-height: 22px;
}

.comment-section {
  border: 2px solid #409EFF;
  border-radius: 8px;
  padding: 20px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 18px;
  color: #1D2129;
  font-size: 14px;
  line-height: 20px;

  i {
    margin-right: 8px;
    color: #000;
    font-size: 18px;
  }
}

.comment-author,
.comment-time {
  display: inline-flex;
  align-items: center;
}

.comment-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.comment-image {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  overflow: hidden;
  background: #F6F6FB;
}

.comment-content-box {
  max-width: 920px;
  padding: 14px 18px;
  background: #F6F6FB;
  border-radius: 8px;
  color: #1D2129;
  font-size: 14px;
  line-height: 24px;
  word-break: break-word;
  margin-bottom: 18px;
}

.adjacent-comments {
  max-width: 920px;
  padding: 14px 18px;
  background: #F0F0F0;
  border-radius: 8px;
}

.adjacent-item {
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 22px;
  color: #4E5969;

  &:last-child {
    margin-bottom: 0;
  }
}

.adjacent-label {
  color: #1D2129;
  font-weight: 500;
}

.adjacent-content {
  color: #4E5969;
}

.operation-panel {
  max-width: 720px;
  padding-bottom: 10px;
}

::v-deep .operation-form .el-form-item__label {
  color: #1D2129 !important;
  font-weight: normal;
}

::v-deep .operation-form .el-textarea__inner {
  border-radius: 8px;
}

.footer-actions {
  flex-shrink: 0;
  min-height: 64px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-top: 14px;

  &.is-operation {
    justify-content: flex-end;
    gap: 16px;
  }
}

.close-btn,
.cancel-btn,
.submit-btn {
  width: 100px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
}

.close-btn,
.cancel-btn {
  color: #2F6BFF;
  border-color: #2F6BFF;
}

.submit-btn {
  background: #6A35FF;
  border-color: #6A35FF;
}

@media screen and (max-width: 1200px) {
  .post-images {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .comment-inspection-page {
    padding: 12px;
  }

  ::v-deep .detail-card > .el-card__body {
    padding: 18px 16px;
  }

  .post-images {
    grid-template-columns: repeat(3, 1fr);
  }

  .operation-panel {
    max-width: 100%;
  }

  .footer-actions,
  .footer-actions.is-operation {
    justify-content: center;
  }
}
</style>
