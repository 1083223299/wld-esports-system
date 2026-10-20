<template>
  <div class="post-inspection-page">
    <div class="page-header" @click="handleBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">帖子详情</div>
    </div>

    <el-card class="detail-card" shadow="never">
      <div class="detail-card-body">
      <div class="post-info-panel">
        <div class="section-title">帖子信息</div>

        <div class="image-list" v-if="imageList.length">
          <el-image
            v-for="(image, index) in imageList"
            :key="index"
            :src="image.url"
            :preview-src-list="imageList.map(item => item.url)"
            fit="cover"
            class="post-image"
          />
        </div>

        <div class="post-videos" v-if="videoList.length">
          <div v-for="(video, index) in videoList" :key="'video-' + index" class="video-item">
            <video :src="video.url" :poster="video.coverUrl" controls class="preview-video"></video>
          </div>
        </div>

        <div class="content-text">{{ postDetail.content }}</div>

        <div class="meta-row">
          <div class="meta-item">
            <i class="el-icon-user-solid"></i>
            <span>{{ postDetail.userNickname }}</span>
          </div>
          <div class="meta-item">
            <i class="el-icon-time"></i>
            <span>{{ postDetail.publishTime }}</span>
          </div>
          <div class="meta-item">
            <i class="el-icon-star-on"></i>
            <span>{{ postDetail.likeCount }}</span>
          </div>
          <div class="meta-item">
            <i class="el-icon-chat-dot-round"></i>
            <span>{{ postDetail.commentCount }}</span>
          </div>
          <div class="meta-item">
            <i class="el-icon-collection-tag"></i>
            <span>{{ postDetail.collectCount }}</span>
          </div>
          <div class="meta-item">
            <i class="el-icon-share"></i>
            <span>{{ postDetail.shareCount }}</span>
          </div>
        </div>

        <div class="tag-row">
          <span>话题：{{ topicText }}</span>
          <span>精选：{{ postDetail.featured ? "精选" : "未精选" }}</span>
          <span>推荐：{{ postDetail.recommended ? "是" : "否" }}</span>
          <span>
            帖子状态：
            <em :class="['status-text', postDetail.postStatus === 'DELETED' ? 'is-danger' : 'is-primary']">
              {{ postStatusText }}
            </em>
          </span>
        </div>
      </div>

      <!-- 审核记录 -->
      <div v-if="FlowData.length > 0" class="review-timeline-panel">
        <div class="section-title">审核记录</div>
        <SnakeFlowchart
          ref="flowChart"
          :chartData="FlowData"
          :Index="4"
          @expand-change="handleFlowExpand"
        />

        <div v-if="expandedFlowDetail" class="flow-expand-panel">
          <div class="flow-expand-title">
            {{ expandedFlowDetail.versionNo ? `版本 ${expandedFlowDetail.versionNo} 帖子详情` : '帖子详情' }}
          </div>

          <div class="image-list" v-if="expandedFlowDetail.images && expandedFlowDetail.images.length">
            <el-image
              v-for="(url, index) in expandedFlowDetail.images"
              :key="'flow-img-' + index"
              :src="url"
              :preview-src-list="expandedFlowDetail.images"
              fit="cover"
              class="post-image"
            />
          </div>

          <div class="post-videos" v-if="expandedFlowDetail.videos && expandedFlowDetail.videos.length">
            <div v-for="(video, index) in expandedFlowDetail.videos" :key="'flow-video-' + index" class="video-item">
              <video :src="video.url" :poster="video.coverUrl" controls class="preview-video"></video>
            </div>
          </div>

          <div class="post-content-text" v-if="expandedFlowDetail.content">
            <p>{{ expandedFlowDetail.content }}</p>
          </div>

          <div class="flow-meta" v-if="expandedFlowDetail.userNickname || expandedFlowDetail.publishTime">
            <span v-if="expandedFlowDetail.userNickname">
              <i class="el-icon-user"></i>
              {{ expandedFlowDetail.userNickname }}
            </span>
            <span v-if="expandedFlowDetail.publishTime">
              <i class="el-icon-time"></i>
              {{ expandedFlowDetail.publishTime }}
            </span>
            <span v-if="expandedFlowDetail.likeCount">
              <i class="el-icon-star-on"></i>
              {{ expandedFlowDetail.likeCount }}
            </span>
            <span v-if="expandedFlowDetail.commentCount">
              <i class="el-icon-chat-dot-round"></i>
              {{ expandedFlowDetail.commentCount }}
            </span>
            <span v-if="expandedFlowDetail.collectCount">
              <i class="el-icon-collection-tag"></i>
              {{ expandedFlowDetail.collectCount }}
            </span>
            <span v-if="expandedFlowDetail.shareCount">
              <i class="el-icon-share"></i>
              {{ expandedFlowDetail.shareCount }}
            </span>
          </div>

          <div class="sensitive-words" v-if="expandedFlowDetail.riskWords">
            <span class="label">命中敏感词：</span>
            <span class="words">{{ expandedFlowDetail.riskWords }}</span>
          </div>

          <div class="flow-review-info" v-if="expandedFlowDetail.reviewerName || expandedFlowDetail.reviewOpinion">
            <div v-if="expandedFlowDetail.reviewerName" class="review-row">
              <span class="label">审核人：</span>
              <span>{{ expandedFlowDetail.reviewerName }}</span>
            </div>
            <div v-if="expandedFlowDetail.reviewOpinion" class="review-row">
              <span class="label">审核意见：</span>
              <span>{{ expandedFlowDetail.reviewOpinion }}</span>
            </div>
          </div>
          <div v-if="expandedFlowDetail.rejectReasonDescription" class="flow-review-info">
              <div v-if="expandedFlowDetail.rejectReasonDescription" class="review-row">
            <span class="label">拒绝原因：</span>
            <span>{{ expandedFlowDetail.rejectReasonDescription }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isInspectionMode" class="inspection-panel">
        <el-form
          ref="inspectionForm"
          :model="inspectionForm"
          :rules="inspectionRules"
          label-width="92px"
          label-position="left"
          class="inspection-form"
        >
          <el-form-item label="巡检审核" prop="decision">
            <el-radio-group v-model="inspectionForm.decision">
              <el-radio label="PASS">审核通过</el-radio>
              <el-radio label="OFFLINE">核实违规</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="审核意见" prop="opinion">
            <el-input
              v-model="inspectionForm.opinion"
              type="textarea"
              :rows="4"
              maxlength="1000"
              show-word-limit
              placeholder="请输入"
            />
          </el-form-item>

          <div class="reason-actions">
            <el-button
              v-for="reason in quickReasons"
              :key="reason"
              :class="{ 'is-selected': selectedReasonList.includes(reason) }"
              @click="handleReasonClick(reason)"
            >
              {{ reason }}
            </el-button>
          </div>
        </el-form>
      </div>

      <div class="footer-actions" :class="{ 'is-inspection': isInspectionMode }">
        <template v-if="isInspectionMode">
          <el-button class="cancel-btn" @click="handleBack">取消</el-button>
          <el-button type="primary" class="submit-btn" :loading="submitting" @click="handleSubmit">提交</el-button>
        </template>
        <el-button v-else class="close-btn" @click="handleBack">关闭</el-button>
      </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { getPostManageDetail, patrolPost } from "@/api/community";
import SnakeFlowchart from "@/components/snackStep.vue";

export default {
  name: "CommunityPostInspection",
  components: {
    SnakeFlowchart,
  },
  props: {
    mode: {
      type: String,
      default: "inspection",
    },
    postData: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      postDetail: {
        postId: "",
        userNickname: "",
        userId: "",
        identityLabel: "",
        content: "",
        topics: [],
        featured: false,
        recommended: false,
        likeCount: 0,
        commentCount: 0,
        collectCount: 0,
        shareCount: 0,
        dislikeCount: 0,
        postStatus: "",
        publishTime: "",
        images: [],
      },
      inspectionForm: {
        decision: "PASS",
        opinion: "",
      },
      inspectionRules: {
        decision: [{ required: true, message: "请选择巡检审核结果", trigger: "change" }],
      },
      quickReasons: ["涉及未成年违规", "包含违禁敏感词", "低俗情色内容", "广告营销导流"],
      submitting: false,
      FlowData: [],
      expandedFlowDetail: null,
    };
  },
  computed: {
    isInspectionMode() {
      return this.mode !== "view";
    },
    topicText() {
      return this.postDetail.topics && this.postDetail.topics.length ? this.postDetail.topics.join("、") : "-";
    },
    postStatusText() {
      const map = {
        NORMAL: "正常",
        OFFLINE: "已下架",
        DELETED: "已删除",
      };
      return map[this.postDetail.postStatus] || "-";
    },
    selectedReasonList() {
      return this.inspectionForm.opinion
        .split("、")
        .map((item) => item.trim())
        .filter(Boolean);
    },
    imageList() {
      if (!this.postDetail.mediaList || !this.postDetail.mediaList.length) {
        return [];
      }
      return this.postDetail.mediaList
        .filter(item => item.mediaType === "IMAGE")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(item => ({ url: item.url, coverUrl: item.coverUrl }));
    },
    videoList() {
      if (!this.postDetail.mediaList || !this.postDetail.mediaList.length) {
        return [];
      }
      return this.postDetail.mediaList
        .filter(item => item.mediaType === "VIDEO")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(item => ({ url: item.url, coverUrl: item.coverUrl }));
    },
  },
  watch: {
    "inspectionForm.decision"(val) {
      if (val === "PASS") {
        this.inspectionForm.opinion = "";
        this.$nextTick(() => {
          if (this.$refs.inspectionForm) {
            this.$refs.inspectionForm.clearValidate("opinion");
          }
        });
      }
    },
  },
  created() {
    this.initPostDetail();
  },
  methods: {
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
        publishTime: data.publishTime || data.originalPublishTime,
        riskWords: data.riskWords,
        mediaList: data.mediaList
      }
    },
    formatPostSnapshot(info) {
      if (!info) return null
      const { images, videos } = this.parseMediaList(info.mediaList)
      return {
        postId: info.postId,
        content: info.content || '',
        contentType: info.contentType || '',
        images,
        videos,
        userNickname: info.userNickname || '',
        userId: info.userId,
        publishTime: info.publishTime || info.originalPublishTime || '',
        riskWords: info.riskWords || '',
        communityTopicName: info.communityTopicName || '',
        postStatus: info.postStatus || '',
        postStatusName: info.postStatusName || '',
        likeCount: info.likeCount || 0,
        commentCount: info.commentCount || 0,
        collectCount: info.collectCount || 0,
        shareCount: info.shareCount || 0,
        featured: info.featured || false,
        recommended: info.recommended || false,
        versionNo: info.versionNo
      }
    },
    buildVersionMap(currentPost, versions) {
      const map = {};
      if (currentPost && currentPost.versionNo != null) {
        map[currentPost.versionNo] = currentPost;
      }
      (versions || []).forEach(item => {
        if (item.versionNo != null) {
          map[item.versionNo] = item
        }
      })
      return map
    },
    buildFlowExpandDetail(item, versionMap, fallbackInfo) {
      const versionInfo = (item.versionNo != null ? versionMap[item.versionNo] : null) || fallbackInfo || null
      const snapshot = this.formatPostSnapshot(versionInfo)
      return {
        versionNo: item.versionNo != null ? item.versionNo : (snapshot ? snapshot.versionNo : ''),
        postId: snapshot ? snapshot.postId : '',
        content: snapshot ? snapshot.content : '',
        contentType: snapshot ? snapshot.contentType : '',
        images: snapshot ? snapshot.images : [],
        videos: snapshot ? snapshot.videos : [],
        userNickname: snapshot ? snapshot.userNickname : '',
        userId: snapshot ? snapshot.userId : '',
        publishTime: snapshot ? snapshot.publishTime : '',
        communityTopicName: snapshot ? snapshot.communityTopicName : '',
        postStatus: snapshot ? snapshot.postStatus : '',
        postStatusName: snapshot ? snapshot.postStatusName : '',
        likeCount: snapshot ? snapshot.likeCount : 0,
        commentCount: snapshot ? snapshot.commentCount : 0,
        collectCount: snapshot ? snapshot.collectCount : 0,
        shareCount: snapshot ? snapshot.shareCount : 0,
        featured: snapshot ? snapshot.featured : false,
        recommended: snapshot ? snapshot.recommended : false,
        riskWords: item.riskWords || (snapshot ? snapshot.riskWords : ''),
        reviewerName: item.reviewerName || '',
        reviewOpinion: item.reviewOpinion || '',
        rejectReason: item.rejectReason || item.rejectReasonCode || '',
        rejectReasonDescription: item.rejectReasonDescription || item.rejectReasonDesc || item.rejectReason || '',
        nodeTypeName: item.nodeTypeName || ''
      }
    },
    isMachineAuditNode(detail, contentText) {
      if (!detail) return false
      const nodeText = String(contentText || detail.nodeTypeName || '')
      if (/机审|自动审核|系统审核|AUTO/i.test(nodeText)) return true
      if (detail.riskWords && !detail.reviewerName) return true
      if (detail.rejectReasonDescription && !detail.reviewerName && !detail.reviewOpinion) return true
      return false
    },
    getMachineRejectText(detail) {
      if (!detail) return ''
      return detail.rejectReasonDescription || detail.rejectReason || detail.reviewOpinion || ''
    },
    handleFlowNodeClick(item) {
      const ref = this.$refs.flowChart || (this.$children || []).find(c => c && c.$options && c.$options.name === 'SnakeFlowchart');
      if (ref && typeof ref.handleExpand === 'function') {
        ref.handleExpand(item)
      } else {
        this.handleFlowExpandLegacy(item)
      }
    },
    handleFlowExpandLegacy(item) {
      const next = !item.expanded
      this.FlowData.forEach(node => {
        this.$set(node, 'expanded', node === item ? next : false)
      })
      this.handleFlowExpand(item)
    },
    buildFlowData(reviewTimeline, versionMap, currentPost) {
      return (reviewTimeline || []).map((item, index) => {
        const fallbackInfo = index === 0 ? currentPost : null
        const expandDetail = this.buildFlowExpandDetail(item, versionMap, fallbackInfo)
        const hasDetail = !!(
          expandDetail.content ||
          expandDetail.images.length ||
          expandDetail.videos.length ||
          expandDetail.riskWords ||
          expandDetail.reviewerName ||
          expandDetail.reviewOpinion ||
          expandDetail.nodeTypeName
        )
        return {
          id: index + 1,
          content: item.nodeTypeName || '',
          createTime: item.eventTime || '',
          last: index === reviewTimeline.length - 1,
          reviewerName:item.reviewerName,
          reviewOpinion:item.reviewOpinion,
          riskWords:item.riskWords,
          rejectReasonDescription:item.rejectReasonDescription,
          expandable: hasDetail,
          expanded: false,
          expandDetail
        }
      })
    },
    async initPostDetail() {
      this.inspectionForm = { decision: "PASS", opinion: "" };
      const cachedPost = this.postData || this.getCachedPost();
      if (!cachedPost) {
        return;
      }

      // 填充基础信息
      this.postDetail = {
        ...this.postDetail,
        ...cachedPost,
        topics: cachedPost.communityTopicName ? [cachedPost.communityTopicName] : [],
        publishTime: cachedPost.originalPublishTime || "",
        identityLabel: cachedPost.userTypeName || "",
      };

      // 调用详情接口获取完整数据
      if (cachedPost.postId) {
        try {
          this.FlowData = []
          this.expandedFlowDetail = null
          const res = await getPostManageDetail({ postId: cachedPost.postId });
          if (res.success && res.data) {
            const data = res.data;
            const currentPost = this.extractPostInfo(data);
            this.postDetail = {
              ...this.postDetail,
              ...data,
              ...currentPost,
              topics: data.communityTopicName ? [data.communityTopicName] : [],
              publishTime: data.publishTime || data.originalPublishTime || "",
              identityLabel: data.userTypeName || "",
              mediaList: data.mediaList || [],
            };
            const versionMap = this.buildVersionMap(currentPost, data.versions);
            if (data.reviewTimeline && data.reviewTimeline.length) {
              this.FlowData = this.buildFlowData(data.reviewTimeline, versionMap, currentPost);
            }
          }
        } catch (error) {
          console.error("获取帖子详情失败:", error);
        }
      }
    },
    getCachedPost() {
      const rawDetail = sessionStorage.getItem("communityPostDetail");
      if (!rawDetail) {
        return null;
      }

      try {
        return JSON.parse(rawDetail);
      } catch (error) {
        return null;
      }
    },
    handleReasonClick(reason) {
      const currentReasons = this.selectedReasonList;
      const nextReasons = currentReasons.includes(reason)
        ? currentReasons.filter((item) => item !== reason)
        : currentReasons.concat(reason);

      this.inspectionForm.opinion = nextReasons.join("、");
      this.inspectionForm.decision = "OFFLINE";
      this.$nextTick(() => {
        if (this.$refs.inspectionForm) {
          this.$refs.inspectionForm.clearValidate("opinion");
        }
      });
    },
    handleFlowExpand(item) {
      this.expandedFlowDetail = item.expanded ? item.expandDetail : null
      if (item.expanded) {
        this.$nextTick(() => {
          const panel = this.$el.querySelector('.snake-expand-panel') || this.$el.querySelector('.flow-expand-panel')
          if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        })
      }
    },
    async handleSubmit() {
      this.$refs.inspectionForm.validate(async (valid) => {
        if (!valid) {
          return;
        }

        this.submitting = true;
        try {
          const params = {
            postId: this.postDetail.postId,
            decision: this.inspectionForm.decision,
          };
          if (this.inspectionForm.decision === "OFFLINE" && this.inspectionForm.opinion.trim()) {
            params.opinion = this.inspectionForm.opinion.trim();
          }
          const res = await patrolPost(params);
          if (res.success) {
            this.$message.success("巡检结果提交成功");
            this.handleBack();
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

      this.$router.push({ path: "/community/posts/list" });
    },
  },
};
</script>

<style scoped lang="scss">
.post-inspection-page {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  display: flex;
  flex-direction: column;
}

::v-deep .detail-card > .el-card__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.detail-card-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 32px 20px;
  box-sizing: border-box;
}

.post-info-panel {
  flex-shrink: 0;
  padding-bottom: 24px;
  border-bottom: 1px solid #E5E6EB;
}

.section-title {
  margin-bottom: 14px;
  color: #1D2129;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 10px;
  margin-bottom: 22px;
}

.post-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #F6F6FB;
}

.content-text {
  max-width: 900px;
  margin-bottom: 18px;
  color: #1D2129;
  font-size: 14px;
  line-height: 24px;
  word-break: break-word;
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 28px;
  margin-bottom: 16px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  color: #1D2129;
  font-size: 14px;
  line-height: 20px;

  i {
    margin-right: 8px;
    color: #000;
    font-size: 18px;
  }
}

.tag-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 42px;
  color: #1D2129;
  font-size: 14px;
  line-height: 22px;

  em {
    font-style: normal;
  }
}

.review-timeline-panel {
  flex-shrink: 0;
  padding-top: 22px;
  padding-bottom: 50px;
  border-bottom: 1px solid #E5E6EB;

  ::v-deep .node-content {
    width: 8vw;
    min-width: 96px;
    max-width: 140px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    text-align: left;
  }

  ::v-deep .node-line {
    display: flex;
    align-items: flex-start;
    margin-top: 6px;
    font-size: 12px;
    line-height: 18px;
    color: #606266;
  }

  ::v-deep .node-line-label {
    flex-shrink: 0;
    color: #909399;
  }

  ::v-deep .node-line-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  ::v-deep .node-line-expand {
    display: flex;
    align-items: center;
    margin-top: 6px;
    font-size: 12px;
    line-height: 18px;
    color: #606266;
    gap: 2px;
  }

  ::v-deep .node-line-expand-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  ::v-deep .node-expand-btn {
    flex-shrink: 0;
    padding: 0;
    font-size: 12px;
  }

  ::v-deep .node-line-time {
    margin-top: 6px;
    font-size: 12px;
    line-height: 18px;
    color: #909399;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  ::v-deep .timeContent {
    font-size: 12px;
    line-height: 18px;
    color: #303133;
    text-align: center;
    word-break: break-all;
  }
}

.flow-expand-panel {
  margin-top: 32px;
  padding: 16px;
  background: #F6F6FB;
  border-radius: 8px;
}

.flow-expand-title {
  font-size: 14px;
  font-weight: 600;
  color: #1D2129;
  margin-bottom: 12px;
}

.post-content-text {
  margin: 12px 0;
  font-size: 14px;
  line-height: 1.8;
  color: #303133;

  p {
    margin: 0;
  }
}

.flow-meta {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #606266;
  margin-top: 8px;

  i {
    margin-right: 4px;
  }
}

.flow-tag-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 42px;
  color: #1D2129;
  font-size: 14px;
  line-height: 22px;
  margin-top: 8px;

  em {
    font-style: normal;
  }
}

.post-videos {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
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

.sensitive-words {
  margin-top: 12px;
  padding: 10px 14px;
  background: #fef0f0;
  border-radius: 6px;
  font-size: 14px;

  .label {
    color: #606266;
  }

  .words {
    color: #f56c6c;
    font-weight: 600;
  }
}

.flow-review-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E5E6EB;

  .review-row {
    font-size: 14px;
    color: #303133;
    margin-bottom: 6px;

    .label {
      color: #606266;
    }
  }
}

.post-info-inline {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.inline-label {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: #4E5969;
  line-height: 18px;
  padding-left: 8px;
  border-left: 3px solid #8F5EFF;
  margin-bottom: 8px;
}

.media-block {
  display: flex;
  flex-direction: column;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.flow-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #F6F6FB;
  display: block;
}

.flow-video-item {
  width: 220px;
}

.content-block {
  padding: 10px 12px;
  background: #FAFBFC;
  border-radius: 8px;
}

.post-content-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: #1D2129;
  word-break: break-word;
}

.empty-tip {
  color: #86909C;
  font-size: 13px;
}

.meta-block {
  background: #fff;
  border: 1px solid #F2F3F5;
  border-radius: 8px;
  padding: 10px 12px;
}

.inline-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  row-gap: 8px;
  column-gap: 18px;
}

.meta-cell {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  color: #1D2129;
  line-height: 20px;

  i {
    margin-right: 6px;
    color: #4E5969;
    font-size: 15px;
  }

  .m-label {
    color: #86909C;
    margin-right: 4px;
  }
}

.inline-tag-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  row-gap: 8px;
  column-gap: 20px;
}

.tag-cell {
  font-size: 13px;
  color: #1D2129;
  line-height: 20px;

  .t-label {
    color: #86909C;
    margin-right: 4px;
  }
}

.sensitive-words-inline {
  font-size: 13px;
  color: #F53F3F;
  padding: 8px 12px;
  background: #FFECE8;
  border-radius: 6px;
}

.review-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #303133;
}

.review-row-inline {
  .r-label {
    color: #86909C;
    margin-right: 6px;
  }
}

.status-text {
  font-style: normal;
}

.is-primary {
  color: #409EFF;
}

.is-danger {
  color: #FF4D4F;
}

.inspection-panel {
  flex-shrink: 0;
  max-width: 720px;
  padding-top: 22px;
}

::v-deep .inspection-form .el-form-item__label {
  color: #1D2129 !important;
  font-weight: normal;
}

::v-deep .inspection-form .el-textarea__inner {
  border-radius: 8px;
}

.reason-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-left: 92px;

  .el-button {
    min-width: 116px;
    height: 34px;
    padding: 0 16px;
    border-radius: 6px;
    color: #1D2129;
    border-color: #DCDDE0;
    background: #fff;
  }

  .el-button.is-selected {
    color: #6A35FF;
    border-color: #8F5EFF;
    background: #F4EFFF;
  }
}

.footer-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0 10px;
  margin-top: 8px;

  &.is-inspection {
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
  .image-list {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .post-inspection-page {
    padding: 12px;
  }

  ::v-deep .detail-card > .el-card__body {
    padding: 0;
  }

  .detail-card-body {
    padding: 18px 16px;
  }

  .image-list {
    grid-template-columns: repeat(3, 1fr);
  }

  .inspection-panel {
    max-width: 100%;
  }

  .reason-actions {
    padding-left: 0;
  }

  .footer-actions,
  .footer-actions.is-inspection {
    justify-content: center;
  }
}
</style>
