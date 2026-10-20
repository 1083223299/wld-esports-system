<template>
  <div class="audit-container">
    <div class="page-header" @click="handleCancel">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">审核详情</div>
    </div>

    <!-- 帖子信息 -->
    <el-card shadow="never" class="section-card">
      <div class="card-header">
        <span class="card-title">帖子信息</span>
      </div>

      <div class="post-images" v-if="postInfo.images && postInfo.images.length">
        <div v-for="(img, index) in postInfo.images" :key="'img-' + index" class="image-item">
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
          {{ postInfo.userNickname }}
        </span>
        <span class="time">
          <i class="el-icon-time"></i>
          {{ postInfo.publishTime }}
        </span>
        <span v-if="postInfo.communityTopicName" class="topic">
          <i class="el-icon-collection-tag"></i>
          {{ postInfo.communityTopicName }}
        </span>
        <span v-if="postInfo.postStatusName" class="status">
          {{ postInfo.postStatusName }}
        </span>
      </div>

      <div class="sensitive-words" v-if="postInfo.riskWords">
        <span class="label">命中敏感词：</span>
        <span class="words">{{ postInfo.riskWords }}</span>
      </div>
    </el-card>

    <!-- 审核记录 -->
    <el-card shadow="never" class="section-card">
      <div class="card-header">
        <span class="card-title">审核记录</span>
      </div>
      <SnakeFlowchart
        v-if="FlowData.length > 0"
        :chartData="FlowData"
        :Index="4"
        @expand-change="handleFlowExpand"
      />

      <div v-if="expandedFlowDetail" class="flow-expand-panel">
        <div class="flow-expand-title">
          {{ expandedFlowDetail.versionNo ? `版本 ${expandedFlowDetail.versionNo} 帖子详情` : '帖子详情' }}
        </div>

        <div class="machine-review-info" v-if="isMachineExpandDetail(expandedFlowDetail)">
          <div class="flow-expand-subtitle">机审信息</div>
          <div class="review-row" v-if="expandedFlowDetail.riskWords">
            <span class="label">命中敏感词：</span>
            <span class="words">{{ expandedFlowDetail.riskWords }}</span>
          </div>
          <div class="review-row" v-if="getRejectReasonText(expandedFlowDetail)">
            <span class="label">拒绝原因：</span>
            <span>{{ getRejectReasonText(expandedFlowDetail) }}</span>
          </div>
        </div>

        <div class="post-images" v-if="expandedFlowDetail.images && expandedFlowDetail.images.length">
          <div v-for="(img, index) in expandedFlowDetail.images" :key="'flow-img-' + index" class="image-item">
            <el-image
              :src="img"
              fit="cover"
              :preview-src-list="expandedFlowDetail.images"
              :initial-index="index"
              class="preview-image"
            />
          </div>
        </div>

        <div class="post-videos" v-if="expandedFlowDetail.videos && expandedFlowDetail.videos.length">
          <div v-for="(video, index) in expandedFlowDetail.videos" :key="'flow-video-' + index" class="video-item">
            <video :src="video.url" :poster="video.coverUrl" controls class="preview-video"></video>
          </div>
        </div>

        <div class="post-content" v-if="expandedFlowDetail.content">
          <p>{{ expandedFlowDetail.content }}</p>
        </div>

        <div class="post-meta" v-if="expandedFlowDetail.userNickname || expandedFlowDetail.publishTime">
          <span class="author" v-if="expandedFlowDetail.userNickname">
            <i class="el-icon-user"></i>
            {{ expandedFlowDetail.userNickname }}
          </span>
          <span class="time" v-if="expandedFlowDetail.publishTime">
            <i class="el-icon-time"></i>
            {{ expandedFlowDetail.publishTime }}
          </span>
          <span v-if="expandedFlowDetail.communityTopicName" class="topic">
            <i class="el-icon-collection-tag"></i>
            {{ expandedFlowDetail.communityTopicName }}
          </span>
        </div>

        <div class="sensitive-words" v-if="expandedFlowDetail.riskWords && !isMachineExpandDetail(expandedFlowDetail)">
          <span class="label">命中敏感词：</span>
          <span class="words">{{ expandedFlowDetail.riskWords }}</span>
        </div>

        <div class="review-info" v-if="expandedFlowDetail.reviewerName || expandedFlowDetail.reviewOpinion">
          <div v-if="expandedFlowDetail.reviewerName" class="review-row">
            <span class="label">审核人：</span>
            <span>{{ expandedFlowDetail.reviewerName }}</span>
          </div>
          <div v-if="expandedFlowDetail.reviewOpinion" class="review-row">
            <span class="label">审核意见：</span>
            <span>{{ expandedFlowDetail.reviewOpinion }}</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 历史帖子信息 -->
    <el-card shadow="never" class="section-card" v-if="historyVersions.length">
      <div class="card-header">
        <span class="card-title">历史帖子信息</span>
        <span class="collapsible" @click="historyCollapsed = !historyCollapsed">
          {{ historyCollapsed ? '展开' : '收起' }}
          <i :class="historyCollapsed ? 'el-icon-arrow-down' : 'el-icon-arrow-up'"></i>
        </span>
      </div>

      <div v-show="!historyCollapsed">
        <div
          v-for="(history, hIndex) in historyVersions"
          :key="'history-' + history.versionNo"
          class="history-version-block"
        >
          <div class="history-version-title">版本 {{ history.versionNo }}</div>

          <div class="post-images" v-if="history.images && history.images.length">
            <div v-for="(img, index) in history.images" :key="'history-img-' + hIndex + '-' + index" class="image-item">
              <el-image
                :src="img"
                fit="cover"
                :preview-src-list="history.images"
                :initial-index="index"
                class="preview-image"
              />
            </div>
          </div>

          <div class="post-videos" v-if="history.videos && history.videos.length">
            <div v-for="(video, index) in history.videos" :key="'history-video-' + hIndex + '-' + index" class="video-item">
              <video :src="video.url" :poster="video.coverUrl" controls class="preview-video"></video>
            </div>
          </div>

          <div class="post-content">
            <p>{{ history.content }}</p>
          </div>

          <div class="post-meta">
            <span class="author" v-if="history.userNickname">
              <i class="el-icon-user"></i>
              {{ history.userNickname }}
            </span>
            <span class="time" v-if="history.publishTime">
              <i class="el-icon-time"></i>
              {{ history.publishTime }}
            </span>
          </div>

          <div class="sensitive-words" v-if="history.riskWords">
            <span class="label">命中敏感词：</span>
            <span class="words">{{ history.riskWords }}</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 审核操作 -->
    <el-card shadow="never" class="section-card">
      <div class="card-header">
        <span class="card-title required">审核</span>
      </div>

      <el-form :model="auditForm" label-width="100px">
        <el-form-item label="审核：" class="required-item">
          <el-radio-group v-model="auditForm.decision">
            <el-radio label="PASS">审核通过</el-radio>
            <el-radio label="REJECT">审核不通过</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          label="审核意见："
          :class="{ 'required-item': auditForm.decision === 'REJECT' }"
        >
          <el-input
            v-model="auditForm.opinion"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            placeholder="审核驳回时必填。"
          ></el-input>
        </el-form-item>

        <div class="quick-actions">
          <el-button type="primary" plain size="small" @click="quickAction('minor')">
            涉及未成年/隐私
          </el-button>
          <el-button type="primary" plain size="small" @click="quickAction('sensitive')">
            包含违禁敏感词
          </el-button>
          <el-button type="primary" plain size="small" @click="quickAction('vulgar')">
            低俗色情内容
          </el-button>
          <el-button type="primary" plain size="small" @click="quickAction('ad')">
            广告营销导流
          </el-button>
        </div>
      </el-form>

      <div class="submit-actions">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">提交</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import SnakeFlowchart from "@/components/snackStep.vue";
import { auditPostReview, getPostReviewDetail } from "@/api/community";

export default {
  name: 'IllegalPostsAudit',
  components: {
    SnakeFlowchart
  },
  inject: {
    switchToList: { default: () => {} },
    getSharedData: { default: () => () => ({}) }
  },
  data() {
    return {
      submitLoading: false,
      reviewId: null,
      historyCollapsed: false,
      expandedFlowDetail: null,
      postInfo: {
        images: [],
        videos: [],
        content: '',
        userNickname: '',
        publishTime: '',
        riskWords: '',
        postStatusName: '',
        communityTopicName: ''
      },
      historyVersions: [],
      FlowData: [],
      auditForm: {
        decision: '',
        opinion: ''
      }
    }
  },
  activated() {
    this.loadDetail()
  },
  watch: {
    'auditForm.decision'(val) {
      if (val === 'PASS') {
        this.auditForm.opinion = ''
      }
    }
  },
  methods: {
    extractPostInfo(data) {
      if (!data) return null
      if (data.postInfo) return data.postInfo
      return {
        postId: data.postId,
        versionNo: data.versionNo,
        userId: data.userId,
        userNickname: data.userNickname,
        postStatus: data.postStatus,
        postStatusName: data.postStatusName,
        content: data.content,
        contentType: data.contentType,
        communityTopicId: data.communityTopicId,
        communityTopicName: data.communityTopicName,
        publishTime: data.publishTime,
        riskWords: data.riskWords,
        mediaList: data.mediaList
      }
    },
    parseMediaList(mediaList) {
      const images = []
      const videos = []
      ;(mediaList || []).forEach(item => {
        if (item.mediaType === 'VIDEO') {
          videos.push({
            url: item.url,
            coverUrl: item.coverUrl
          })
        } else if (item.url) {
          images.push(item.url)
        }
      })
      return { images, videos }
    },
    formatPostSnapshot(info) {
      if (!info) return null
      const { images, videos } = this.parseMediaList(info.mediaList)
      return {
        content: info.content || '',
        images,
        videos,
        userNickname: info.userNickname || '',
        publishTime: info.publishTime || '',
        riskWords: info.riskWords || '',
        communityTopicName: info.communityTopicName || '',
        versionNo: info.versionNo
      }
    },
    buildVersionMap(postInfo, versions) {
      const map = {}
      if (postInfo && postInfo.versionNo != null) {
        map[postInfo.versionNo] = postInfo
      }
      ;(versions || []).forEach(item => {
        if (item.versionNo != null) {
          map[item.versionNo] = item
        }
      })
      return map
    },
    buildFlowExpandDetail(item, versionMap) {
      const versionInfo = item.versionNo != null ? versionMap[item.versionNo] : null
      const snapshot = this.formatPostSnapshot(versionInfo)
      return {
        versionNo: item.versionNo,
        content: snapshot ? snapshot.content : '',
        images: snapshot ? snapshot.images : [],
        videos: snapshot ? snapshot.videos : [],
        userNickname: snapshot ? snapshot.userNickname : '',
        publishTime: snapshot ? snapshot.publishTime : '',
        communityTopicName: snapshot ? snapshot.communityTopicName : '',
        riskWords: item.riskWords || (snapshot ? snapshot.riskWords : ''),
        rejectReasonDescription: item.rejectReasonDescription || item.rejectReasonDesc || item.rejectReason || '',
        reviewerName: item.reviewerName || '',
        reviewOpinion: item.reviewOpinion || '',
        nodeTypeName: item.nodeTypeName || '',
        nodeType: item.nodeType || ''
      }
    },
    isMachineExpandDetail(detail) {
      if (!detail) return false
      const nodeText = String(detail.nodeTypeName || detail.content || '')
      if (/机审|自动审核|系统审核|MACHINE/i.test(nodeText)) return true
      if (detail.nodeType === 'MACHINE_REJECTED') return true
      if ((detail.rejectReasonDescription || detail.riskWords) && !detail.reviewerName && !detail.reviewOpinion) {
        return true
      }
      return false
    },
    getRejectReasonText(detail) {
      if (!detail) return ''
      return detail.rejectReasonDescription || detail.rejectReason || detail.reviewOpinion || ''
    },
    handleFlowExpand(item) {
      this.expandedFlowDetail = item.expanded ? item.expandDetail : null
    },
    async loadDetail() {
      const sharedData = this.getSharedData()
      if (!sharedData || !sharedData.editRow) return

      const row = sharedData.editRow
      this.reviewId = row.reviewId
      this.expandedFlowDetail = null
      this.historyVersions = []
      this.FlowData = []
      this.auditForm = { decision: '', opinion: '' }

      try {
        const res = await getPostReviewDetail({ reviewId: this.reviewId })
        if (!res.success || !res.data) return

        const data = res.data
        const currentPost = this.extractPostInfo(data)

        if (currentPost) {
          const snapshot = this.formatPostSnapshot(currentPost)
          this.postInfo = {
            ...snapshot,
            postStatusName: currentPost.postStatusName || ''
          }
        }

        const versionMap = this.buildVersionMap(currentPost, data.versions)

        if (data.reviewTimeline && data.reviewTimeline.length) {
          this.FlowData = data.reviewTimeline.map((item, index) => {
            const expandDetail = this.buildFlowExpandDetail(item, versionMap)
            const hasDetail = !!(
              expandDetail.content ||
              expandDetail.images.length ||
              expandDetail.videos.length ||
              expandDetail.riskWords ||
              expandDetail.rejectReasonDescription ||
              expandDetail.reviewerName ||
              expandDetail.reviewOpinion
            )
            return {
              id: index + 1,
              content: item.nodeTypeName || '',
              createTime: item.eventTime || '',
              last: index === data.reviewTimeline.length - 1,
              expandable: hasDetail,
              expanded: false,
              expandDetail,
              reviewerName: item.reviewerName,
              reviewOpinion: item.reviewOpinion,
              riskWords: item.riskWords,
              rejectReasonDescription: item.rejectReasonDescription || item.rejectReasonDesc || item.rejectReason || ''
            }
          })
        }

        this.historyVersions = (data.versions || [])
          .map(item => this.formatPostSnapshot(item))
          .filter(Boolean)
      } catch (error) {
        console.error('获取审核详情失败:', error)
      }
    },
    quickAction(action) {
      const actions = {
        minor: { decision: 'REJECT', opinion: '内容涉及未成年人隐私信息，违反社区规范。' },
        sensitive: { decision: 'REJECT', opinion: '包含违禁敏感词，违反社区规范。' },
        vulgar: { decision: 'REJECT', opinion: '包含低俗色情内容，违反社区规范。' },
        ad: { decision: 'REJECT', opinion: '涉及广告营销导流，违反社区规范。' }
      }
      const item = actions[action]
      if (item) {
        this.auditForm.decision = item.decision
        this.auditForm.opinion = item.opinion
      }
    },
    handleCancel() {
      this.auditForm = { decision: '', opinion: '' }
      this.switchToList()
    },
    async handleSubmit() {
      if (!this.auditForm.decision) {
        this.$message.warning('请选择审核结果')
        return
      }
      if (this.auditForm.decision === 'REJECT' && !this.auditForm.opinion.trim()) {
        this.$message.warning('审核驳回时请填写审核意见')
        return
      }
      this.submitLoading = true
      try {
        const params = {
          reviewId: this.reviewId,
          decision: this.auditForm.decision
        }
        if (this.auditForm.decision === 'REJECT' && this.auditForm.opinion.trim()) {
          params.opinion = this.auditForm.opinion.trim()
        }
        const res = await auditPostReview(params)
        if (res.success) {
          this.$message.success('审核成功')
          this.switchToList()
        } else {
          this.$message.error(res.errorMessage || '审核失败')
        }
      } catch (error) {
        this.$message.error('审核失败')
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

.page-header {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  color: #1d2129;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.page-header i {
  margin-right: 8px;
  font-size: 18px;
}

.page-title {
  line-height: 24px;
}

.section-card {
  margin-bottom: 0;
  padding-bottom: 50px;

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

.collapsible {
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
}

.post-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.image-item {
  width: calc(10% - 9px);
  aspect-ratio: 1;
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

.post-meta .author,
.post-meta .time {
  display: flex;
  align-items: center;
  gap: 5px;
}

.sensitive-words {
  padding: 12px 16px;
  background-color: #fef0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sensitive-words .label {
  font-size: 14px;
  color: #606266;
}

.sensitive-words .words {
  font-size: 14px;
  color: #f56c6c;
  font-weight: bold;
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
  background: #000;
}

.preview-video {
  width: 100%;
  display: block;
}

.flow-expand-panel {
  margin-top: 32px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.flow-expand-title,
.history-version-title {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 16px;
}

.flow-expand-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.machine-review-info {
  margin-bottom: 16px;
  padding: 12px 16px;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #fde2e2;
}

.machine-review-info .review-row .words {
  color: #f56c6c;
  font-weight: 600;
}

.history-version-block + .history-version-block {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px dashed #e8e8e8;
}

.review-info {
  margin-top: 12px;
  padding: 12px 16px;
  background-color: #fff;
  border-radius: 4px;
}

.review-row {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
}

.review-row .label {
  color: #909399;
}

.required-item ::v-deep .el-form-item__label::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.submit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}
</style>
