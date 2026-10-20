<template>
  <div class="audit-container">
    <!-- 帖子信息 -->
    <el-card shadow="never" class="section-card">
      <div class="card-header">
        <span class="card-title">帖子信息</span>
      </div>

      <div class="post-images" v-if="postInfo.images && postInfo.images.length">
        <div v-for="(img, index) in postInfo.images" :key="index" class="image-item">
          <el-image
            :src="img"
            fit="cover"
            :preview-src-list="postInfo.images"
            :initial-index="index"
            class="preview-image"
          />
        </div>
      </div>

      <div class="post-videos" v-if="postInfo.videos && postInfo.videos.length">
        <div v-for="(video, index) in postInfo.videos" :key="'video-' + index" class="video-item">
          <video :src="video.url" :poster="video.coverUrl" controls class="preview-video"></video>
        </div>
      </div>

      <div class="post-content">
        <p>{{ postInfo.content }}</p>
      </div>

      <div class="post-meta">
        <span class="author">
          <i class="el-icon-user"></i>
          {{ postInfo.author }}
        </span>
        <span class="time">
          <i class="el-icon-time"></i>
          {{ postInfo.createTime }}
        </span>
        <span class="likes">
          <i class="el-icon-thumb"></i>
          {{ postInfo.likes }}
        </span>
        <span class="comments">
          <i class="el-icon-chat-dot-round"></i>
          {{ postInfo.comments }}
        </span>
        <span class="shares">
          <i class="el-icon-share"></i>
          {{ postInfo.shares }}
        </span>
      </div>

      <div class="post-tags" v-if="postInfo.topicName || postInfo.featured || postInfo.postStatus">
        <span v-if="postInfo.topicName" class="tag-item">
          <i class="el-icon-collection-tag"></i>
          话题：{{ postInfo.topicName }}
        </span>
        <span v-if="postInfo.featured" class="tag-item">
          精选：精选普通
        </span>
        <span v-if="postInfo.postStatus" class="tag-item">
          帖子状态：{{ postInfo.postStatus }}
        </span>
      </div>
    </el-card>

    <!-- 评论内容（举报评论时显示） -->
    <el-card shadow="never" class="section-card" v-if="commentInfo">
      <div class="card-header">
        <span class="card-title">评论内容</span>
      </div>

      <div class="post-images" v-if="commentInfo.images && commentInfo.images.length">
        <div v-for="(img, index) in commentInfo.images" :key="'comment-img-' + index" class="image-item">
          <el-image
            :src="img"
            fit="cover"
            :preview-src-list="commentInfo.images"
            :initial-index="index"
            class="preview-image"
          />
        </div>
      </div>

      <div class="comment-meta">
        <span class="comment-author">
          <i class="el-icon-user"></i>
          {{ commentInfo.author }}
        </span>
        <span class="comment-time">
          <i class="el-icon-time"></i>
          {{ commentInfo.createTime }}
        </span>
        <span class="comment-likes">
          <i class="el-icon-thumb"></i>
          {{ commentInfo.likeCount }}
        </span>
        <span class="comment-replies-count">
          <i class="el-icon-chat-dot-round"></i>
          {{ commentInfo.replyCount }}
        </span>
      </div>

      <div class="comment-content">
        <p>{{ commentInfo.content }}</p>
      </div>

      <div class="comment-replies" v-if="commentInfo.previousComment || commentInfo.nextComment">
        <div v-if="commentInfo.previousComment" class="reply-item">
          <span class="reply-arrow up">↑</span>
          <span class="reply-label">上一楼</span>
          <span class="reply-author">（{{ commentInfo.previousComment.userNickname }}）：</span>
          <span class="reply-text">{{ commentInfo.previousComment.content }}</span>
        </div>
        <div v-if="commentInfo.nextComment" class="reply-item">
          <span class="reply-arrow down">↓</span>
          <span class="reply-label">下一楼</span>
          <span class="reply-author">（{{ commentInfo.nextComment.userNickname }}）：</span>
          <span class="reply-text">{{ commentInfo.nextComment.content }}</span>
        </div>
      </div>
    </el-card>

    <!-- 举报信息 -->
    <el-card shadow="never" class="section-card">
      <div class="card-header">
        <span class="card-title">举报信息</span>
      </div>

      <div class="report-list">
        <div v-for="(report, index) in reportList" :key="index" class="report-item">
          <div class="report-header">
            <span class="reporter">举报人：{{ report.reporter }}</span>
            <span class="report-time">举报时间：{{ report.reportTime }}</span>
            <el-tag :type="getReportTypeColor(report.reportType)" size="small">
              举报类型：{{ report.reportType }}
            </el-tag>
            <el-tag v-if="report.statusName" :type="getStatusTagType(report.status)" size="small">
              {{ report.statusName }}
            </el-tag>
          </div>
          <div class="report-desc">
            <span class="label">举报说明：</span>
            <span>{{ report.description }}</span>
          </div>
          <div class="report-images" v-if="report.images && report.images.length > 0">
            <div v-for="(img, imgIndex) in report.images" :key="imgIndex" class="image-item-small">
              <el-image
                :src="img"
                fit="cover"
                :preview-src-list="report.images"
                :initial-index="imgIndex"
                class="preview-image"
              />
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 处理记录 -->
    <el-card shadow="never" class="section-card" v-if="handleInfo">
      <div class="card-header">
        <span class="card-title">处理记录</span>
      </div>

      <div class="handle-info">
        <div class="handle-row">
          <span class="label">处理人：</span>
          <span>{{ handleInfo.reviewerName }}</span>
        </div>
        <div class="handle-row">
          <span class="label">处理意见：</span>
          <span>{{ handleInfo.reviewOpinion }}</span>
        </div>
        <div class="handle-row">
          <span class="label">处理时间：</span>
          <span>{{ handleInfo.reviewTime }}</span>
        </div>
      </div>
    </el-card>

    <!-- 处理操作 -->
    <el-card shadow="never" class="section-card">
      <div class="card-header">
        <span class="card-title required">处理操作</span>
      </div>

      <el-form :model="auditForm" label-width="120px">
        <el-form-item label="处理结果：" class="required-item">
          <el-radio-group v-model="auditForm.result">
            <el-radio label="CONFIRM_VIOLATION">核实违规</el-radio>
            <el-radio label="REJECT_REPORT">驳回举报</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="处理意见：" class="required-item">
          <el-input
            v-model="auditForm.opinion"
            type="textarea"
            :rows="4"
            placeholder="请输入"
          ></el-input>
        </el-form-item>
      </el-form>

      <div class="submit-actions">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确认处理</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { getPostReportDetail, auditPostReport } from "@/api/community.js";

export default {
  name: 'ReportCenterAudit',
  inject: {
    switchToList: { default: () => {} },
    getSharedData: { default: () => () => ({}) }
  },
  data() {
    return {
      submitLoading: false,
      handledBatchId: null,
      batchCutoffTime: '',
      targetType: '',
      targetId: null,
      postInfo: {
        images: [],
        videos: [],
        content: '',
        author: '',
        createTime: '',
        likes: 0,
        comments: 0,
        shares: 0,
        topicName: '',
        featured: false,
        postStatus: ''
      },
      reportList: [],
      handleInfo: null,
      commentInfo: null,
      auditForm: {
        result: '',
        opinion: ''
      }
    }
  },
  activated() {
    this.loadDetail()
  },
  methods: {
    async loadDetail() {
      const sharedData = this.getSharedData()
      if (sharedData && sharedData.editRow) {
        const row = sharedData.editRow
        this.handledBatchId = row.handledBatchId
        this.targetType = row.targetType
        this.targetId = row.postId
        try {
          const params = {
            targetType: row.targetType,
            targetId: row.postId
          }
          if (this.handledBatchId) {
            params.handleBatchId = this.handledBatchId
          }
          const res = await getPostReportDetail(params)
          if (res.success && res.data) {
            const data = res.data
            // 帖子信息
            if (data.postInfo) {
              const postInfo = data.postInfo
              this.postInfo = {
                images: (postInfo.mediaList || []).filter(m => m.mediaType === 'IMAGE').map(m => m.url),
                videos: (postInfo.mediaList || []).filter(m => m.mediaType === 'VIDEO').map(m => ({ url: m.url, coverUrl: m.coverUrl })),
                content: postInfo.content || '',
                author: postInfo.userNickname || '',
                createTime: postInfo.publishTime || '',
                likes: postInfo.likeCount || 0,
                comments: postInfo.commentCount || 0,
                shares: postInfo.shareCount || 0,
                topicName: postInfo.communityTopicName || '',
                featured: postInfo.featured || false,
                postStatus: postInfo.postStatusName || ''
              }
            }
            // 评论信息（举报评论时）
            if (data.targetType === 'COMMENT' && data.commentInfo) {
              const commentInfo = data.commentInfo
              this.commentInfo = {
                author: commentInfo.userNickname || '',
                createTime: commentInfo.publishTime || '',
                content: commentInfo.content || '',
                images: (commentInfo.mediaList || []).filter(m => m.mediaType === 'IMAGE').map(m => m.url),
                likeCount: commentInfo.likeCount || 0,
                replyCount: commentInfo.replyCount || 0,
                previousComment: commentInfo.previousComment || null,
                nextComment: commentInfo.nextComment || null
              }
            } else {
              this.commentInfo = null
            }
            // 举报列表
            this.reportList = (data.reportList || []).map(item => ({
              reporter: item.reportUserNickname || '',
              reportTime: item.reportTime || '',
              reportType: item.reportTypeName || '',
              description: item.reportDescription || '',
              images: (item.evidenceList || []).map(e => e.url).filter(Boolean),
              status: item.status,
              statusName: item.statusName || ''
            }))
            // 处理记录
            if (data.handleInfo) {
              this.handleInfo = {
                reviewerName: data.handleInfo.reviewerName || '',
                reviewOpinion: data.handleInfo.reviewOpinion || '',
                reviewTime: data.handleInfo.reviewTime || ''
              }
            } else {
              this.handleInfo = null
            }
            // 保存批次截止时间
            this.batchCutoffTime = data.batchCutoffTime || ''
          }
        } catch (error) {
          console.error('获取举报详情失败:', error)
        }
      }
    },
    getReportTypeColor(name) {
      const colors = { '色情低俗': 'danger', '暴力恐怖': 'danger', '政治敏感': 'danger', '诈骗信息': 'warning', '广告营销': 'info', '侵权内容': 'warning', '其他': 'info' }
      return colors[name] || 'info'
    },
    getStatusTagType(status) {
      const types = { '1': 'warning', '2': 'info', '3': 'danger', '4': 'info' }
      return types[status] || 'info'
    },
    handleCancel() {
      this.auditForm = { result: '', opinion: '' }
      this.switchToList()
    },
    async handleSubmit() {
      if (!this.auditForm.result) {
        this.$message.warning('请选择处理结果')
        return
      }
      if (!this.auditForm.opinion) {
        this.$message.warning('请填写处理意见')
        return
      }
      this.submitLoading = true
      try {
        const res = await auditPostReport({
          targetType: this.targetType,
          targetId: this.targetId,
          batchCutoffTime: this.batchCutoffTime,
          decision: this.auditForm.result,
          opinion: this.auditForm.opinion
        })
        if (res.success) {
          this.$message.success('处理成功')
          this.switchToList()
        } else {
          this.$message.error(res.errorMessage || '处理失败')
        }
      } catch (error) {
        this.$message.error('处理失败')
      } finally {
        this.submitLoading = false
      }
    }
  }
}
</script>

<style scoped>
.audit-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  margin-bottom: 0;
}

::v-deep .section-card .el-card__body {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e8e8e8;
}

.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.card-title.required::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.post-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.post-videos {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.video-item {
  width: 240px;
  border-radius: 4px;
  overflow: hidden;
}

.preview-video {
  width: 100%;
  height: 160px;
  display: block;
  background: #000;
}

.image-item {
  width: calc(10% - 9px);
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 4px;
}

.image-item-small {
  width: 80px;
  height: 80px;
  overflow: hidden;
  border-radius: 4px;
}

.preview-image {
  width: 100%;
  height: 100%;
  display: block;
}

.post-content {
  margin-bottom: 20px;
}

.post-content p {
  font-size: 14px;
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
}

.post-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #606266;
}

.post-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.post-tags {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 14px;
  color: #1D2129;
  line-height: 22px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tag-item i {
  font-size: 16px;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.report-item {
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}

.reporter {
  color: #303133;
}

.report-time {
  color: #909399;
}

.report-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
}

.report-desc .label {
  color: #909399;
}

.report-images {
  display: flex;
  gap: 10px;
}

.handle-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.handle-row {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
}

.handle-row .label {
  color: #909399;
}

.comment-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #606266;
}

.comment-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.comment-content {
  margin-bottom: 16px;
}

.comment-content p {
  font-size: 14px;
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
}

.comment-replies {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 12px 16px;
}

.reply-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.reply-item:last-child {
  margin-bottom: 0;
}

.reply-arrow {
  font-size: 16px;
  font-weight: bold;
}

.reply-arrow.up {
  color: #409eff;
}

.reply-arrow.down {
  color: #909399;
}

.reply-label {
  font-weight: 500;
  color: #303133;
}

.reply-author {
  color: #409eff;
}

.reply-text {
  color: #606266;
}

.required-item ::v-deep .el-form-item__label::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.submit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}
</style>
