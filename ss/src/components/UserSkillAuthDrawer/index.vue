<template>
  <div class="user-skill-auth-drawer">
    <el-drawer
      title="认证信息"
      :visible.sync="drawerVisible"
      direction="rtl"
      size="500px"
      class="auth-drawer"
      @closed="handleDrawerClosed"
    >
      <div class="drawer-content" v-loading="loading">
        <template v-if="authData">
          <div class="auth-summary">
            <div class="summary-main">
              <div class="summary-title">技能认证详情</div>
              <div class="summary-subtitle">
                {{ authData.productName || "-" }} · 技能ID {{ authData.skillId || "-" }}
              </div>
              <div v-if="authData.remark || authData.rejectReason" class="summary-note">
                {{ authData.remark || authData.rejectReason }}
              </div>
            </div>
            <el-tag
              :type="getAuthStatusTag(String(authData.applyStatus))"
              effect="dark"
              size="small"
              class="summary-tag"
              :class="`summary-tag-${String(authData.applyStatus)}`"
            >
              <span class="summary-tag-dot"></span>
              {{ getAuthStatusText(String(authData.applyStatus)) }}
            </el-tag>
          </div>

          <div class="auth-section">
            <div class="section-title">基础信息</div>
            <div class="info-grid">
              <div class="info-card">
                <div class="info-label">陪玩ID</div>
                <div class="info-value">{{ authData.userId || "-" }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">技能ID</div>
                <div class="info-value">{{ authData.skillId || "-" }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">商品名称</div>
                <div class="info-value">{{ authData.productName || "-" }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">商品ID</div>
                <div class="info-value">{{ authData.productId || "-" }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">语音时长</div>
                <div class="info-value">{{ formatVoiceLength(authData.skillVoiceLength) }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">审核备注</div>
                <div class="info-value">{{ authData.remark || authData.rejectReason || "-" }}</div>
              </div>
            </div>
          </div>

          <div v-if="showTechnicalCompanionProfile" class="auth-section">
            <div class="section-title">技术搭档档案</div>
            <div class="info-grid">
              <div class="info-card">
                <div class="info-label">真实姓名</div>
                <div class="info-value">{{ authData.realName || "-" }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">微信号</div>
                <div class="info-value">{{ authData.wechatNo || "-" }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">期望考核时间</div>
                <div class="info-value">{{ authData.expectedAssessmentTime || "-" }}</div>
              </div>
              <div class="info-card info-card--full">
                <div class="info-label">高光视频/图片</div>
                <div v-if="highlightMediaList.length" class="skill-images">
                  <template v-for="(item, index) in highlightMediaList">
                    <el-image
                      v-if="item.type === 'image'"
                      :key="`highlight-image-${index}`"
                      :src="item.url"
                      :preview-src-list="highlightImagePreviewList"
                      fit="cover"
                      class="skill-media"
                    />
                    <button
                      v-else
                      :key="`highlight-video-${index}`"
                      type="button"
                      class="skill-media skill-video-thumb"
                      @click="openVideoPreview(item.url)"
                    >
                      <video
                        :src="item.url"
                        muted
                        playsinline
                        preload="metadata"
                        class="skill-video-thumb__video"
                      ></video>
                      <span class="skill-video-thumb__mask"></span>
                      <span class="skill-video-thumb__play"></span>
                    </button>
                  </template>
                </div>
                <div v-else class="empty-value">暂无高光视频/图片</div>
                <div class="meta-list">
                  <div class="meta-title">高光 OSS ID</div>
                  <div v-if="highlightVideoOssIds.length" class="meta-chip-list meta-chip-list--compact">
                    <div
                      v-for="(ossId, index) in highlightVideoOssIds"
                      :key="`highlight-oss-${ossId}-${index}`"
                      class="meta-chip meta-chip--plain"
                    >
                      {{ ossId }}
                    </div>
                  </div>
                  <div v-else class="meta-empty">-</div>
                </div>
              </div>
            </div>
          </div>

          <div class="auth-section">
            <div class="section-title">认证材料</div>
            <div class="material-block">
              <div class="material-title">图片认证</div>
              <div class="material-subtitle">示例素材</div>
              <div v-if="authDemoMediaList.length" class="skill-images">
                <template v-for="(item, index) in authDemoMediaList">
                  <el-image
                    v-if="item.type === 'image'"
                    :key="`demo-image-${index}`"
                    :src="item.url"
                    :preview-src-list="authDemoImagePreviewList"
                    fit="cover"
                    class="skill-media"
                  />
                  <button
                    v-else
                    :key="`demo-video-${index}`"
                    type="button"
                    class="skill-media skill-video-thumb"
                    @click="openVideoPreview(item.url)"
                  >
                    <video
                      :src="item.url"
                      muted
                      playsinline
                      preload="metadata"
                      class="skill-video-thumb__video"
                    ></video>
                    <span class="skill-video-thumb__mask"></span>
                    <span class="skill-video-thumb__play"></span>
                  </button>
                </template>
              </div>
              <div v-else class="empty-value">暂无示例素材</div>
              <div class="material-subtitle material-subtitle--spaced">技能信息</div>
              <div v-if="authMediaList.length" class="skill-images">
                <template v-for="(item, index) in authMediaList">
                  <el-image
                    v-if="item.type === 'image'"
                    :key="`auth-image-${index}`"
                    :src="item.url"
                    :preview-src-list="authImagePreviewList"
                    fit="cover"
                    class="skill-media"
                  />
                  <button
                    v-else
                    :key="`auth-video-${index}`"
                    type="button"
                    class="skill-media skill-video-thumb"
                    @click="openVideoPreview(item.url)"
                  >
                    <video
                      :src="item.url"
                      muted
                      playsinline
                      preload="metadata"
                      class="skill-video-thumb__video"
                    ></video>
                    <span class="skill-video-thumb__mask"></span>
                    <span class="skill-video-thumb__play"></span>
                  </button>
                </template>
              </div>
              <div v-else class="empty-value">暂无技能信息</div>
              <div class="meta-list">
                <div class="meta-title">图片OSS ID</div>
                <div v-if="authPicOssIds.length" class="meta-chip-list meta-chip-list--compact">
                  <div
                    v-for="(ossId, index) in authPicOssIds"
                    :key="`${ossId}-${index}`"
                    class="meta-chip meta-chip--plain"
                  >
                    {{ ossId }}
                  </div>
                </div>
                <div v-else class="meta-empty">-</div>
              </div>
            </div>
            <div class="material-block">
              <div class="material-title">语音认证</div>
              <audio v-if="authData.skillVoice" :src="authData.skillVoice" controls class="voice-player"></audio>
              <div v-else class="empty-value">暂无语音条</div>
              <div class="meta-chip-list">
                <div class="meta-chip">时长 {{ formatVoiceLength(authData.skillVoiceLength) }}</div>
                <div class="meta-chip">语音OSS ID {{ authData.voiceOssId || "-" }}</div>
              </div>
            </div>
            <div class="material-block">
              <div class="material-title">{{ authData.textFieldName || "技能介绍" }}</div>
              <div class="text-block">{{ authData.introduce || "-" }}</div>
            </div>
          </div>

          <div class="auth-section">
            <div class="section-title">认证字段</div>
            <div v-if="formattedFieldValues.length" class="field-values">
              <div
                v-for="item in formattedFieldValues"
                :key="item.key"
                :class="['field-item', { 'field-item--missing': !item.hasValue }]"
              >
                <div class="field-header">
                  <div class="field-name">{{ item.fieldName || "-" }}</div>
                  <div class="field-meta">
                    <div :class="['field-badge', item.isRequired ? 'field-badge--required' : 'field-badge--optional']">
                      {{ item.isRequired ? "必填" : "选填" }}
                    </div>
                    <div class="field-type">{{ fieldTypeText(item.fieldType) }}</div>
                  </div>
                </div>
                <div class="field-content">
                  <div v-if="item.imageList.length" class="field-images">
                    <el-image
                      v-for="(img, index) in item.imageList"
                      :key="`${item.key}-${index}`"
                      :src="img"
                      :preview-src-list="item.imageList"
                      fit="cover"
                      class="field-image"
                    />
                  </div>
                  <div v-else class="field-text">{{ item.displayText }}</div>
                </div>
              </div>
            </div>
            <div v-else class="empty-panel">暂无认证字段信息</div>
          </div>
        </template>
        <el-empty v-else-if="!loading" description="暂无认证信息" />
      </div>
    </el-drawer>

    <el-dialog
      title="视频预览"
      :visible.sync="videoPreviewVisible"
      width="760px"
      class="video-preview-dialog"
      :close-on-click-modal="true"
      append-to-body
      @closed="handleVideoPreviewClosed"
    >
      <div class="video-preview-body">
        <video
          v-if="videoPreviewUrl"
          :key="videoPreviewUrl"
          :src="videoPreviewUrl"
          controls
          autoplay
          class="video-preview-player"
        ></video>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { detailUserSkillAudit } from "@/api/userSkillAudit";
import {
  buildDetailParams,
  buildMediaList,
  cleanWrappedString,
  extractAuthPayload,
  fieldTypeText,
  formatAuthFieldValues,
  formatVoiceLength,
  getAuthStatusTag,
  getAuthStatusText,
  normalizeAuthData,
  parseJsonArray,
  uniqueList,
} from "@/utils/userSkillAuthDrawer";

export default {
  name: "UserSkillAuthDrawer",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    sourceRow: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      loading: false,
      authData: null,
      videoPreviewVisible: false,
      videoPreviewUrl: "",
    };
  },
  computed: {
    drawerVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit("update:visible", val);
      },
    },
    showTechnicalCompanionProfile() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const applyTypeValue =
        (currentSkill && currentSkill.applyType) ||
        (this.authData && this.authData.applyType) ||
        (this.sourceRow && this.sourceRow.applyType) ||
        "";
      return String(applyTypeValue) === "2";
    },
    highlightVideoList() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const value =
        (currentSkill && currentSkill.highlightVideo) || (this.authData && this.authData.highlightVideo);
      return uniqueList(parseJsonArray(value));
    },
    highlightVideoOssIds() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const value =
        (currentSkill && currentSkill.highlightVideoOssId) ||
        (this.authData && this.authData.highlightVideoOssId);
      return uniqueList(parseJsonArray(value));
    },
    highlightMediaList() {
      return buildMediaList(this.highlightVideoList);
    },
    highlightImagePreviewList() {
      return this.highlightMediaList.filter((item) => item.type === "image").map((item) => item.url);
    },
    authImages() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const value =
        (currentSkill && currentSkill.skillInfoImage) || (this.authData && this.authData.skillImageList);
      return uniqueList(parseJsonArray(value));
    },
    authMediaList() {
      return buildMediaList(this.authImages);
    },
    authImagePreviewList() {
      return this.authMediaList.filter((item) => item.type === "image").map((item) => item.url);
    },
    authDemoImages() {
      return uniqueList(this.authData && this.authData.demoImageList);
    },
    authDemoMediaList() {
      return buildMediaList(this.authDemoImages);
    },
    authDemoImagePreviewList() {
      return this.authDemoMediaList.filter((item) => item.type === "image").map((item) => item.url);
    },
    authPicOssIds() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const value =
        (currentSkill && currentSkill.skillInfoImageOssId) || (this.authData && this.authData.picOssId);
      return uniqueList(parseJsonArray(value));
    },
    formattedFieldValues() {
      const fieldValues =
        this.authData && Array.isArray(this.authData.fieldValues) ? this.authData.fieldValues : [];
      return formatAuthFieldValues(fieldValues);
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.loadAuthDetail();
      }
    },
    sourceRow() {
      if (this.visible) {
        this.loadAuthDetail();
      }
    },
  },
  methods: {
    getAuthStatusText,
    getAuthStatusTag,
    formatVoiceLength,
    fieldTypeText,
    async loadAuthDetail() {
      const row = this.sourceRow;
      const params = buildDetailParams(row || {});
      if (!params) {
        this.$message.warning("缺少申请ID，无法查看认证信息");
        this.drawerVisible = false;
        return;
      }
      this.loading = true;
      this.authData = null;
      try {
        const res = await detailUserSkillAudit(params);
        const authPayload = extractAuthPayload(res);
        if (authPayload) {
          this.authData = normalizeAuthData(authPayload, row || {});
        } else {
          this.$message.error((res && (res.errorMessage || res.msg)) || "获取认证详情失败");
        }
      } catch (error) {
        console.error("获取认证详情失败:", error);
        this.$message.error("获取认证详情失败");
      } finally {
        this.loading = false;
      }
    },
    openVideoPreview(url) {
      const normalizedUrl = cleanWrappedString(url);
      if (!normalizedUrl) return;
      this.videoPreviewUrl = normalizedUrl;
      this.videoPreviewVisible = true;
    },
    handleVideoPreviewClosed() {
      this.videoPreviewUrl = "";
    },
    handleDrawerClosed() {
      this.authData = null;
    },
  },
};
</script>

<style scoped lang="scss">
.auth-drawer {
  ::v-deep .el-drawer__header {
    padding: 18px 24px;
    border-bottom: 1px solid #f0f2f5;
    margin-bottom: 0;
    background: linear-gradient(135deg, #f7f2ff 0%, #fbfaff 100%);
    color: #303133;
    font-weight: 600;
  }

  ::v-deep .el-drawer__body {
    padding: 0;
    overflow: hidden;
    background: #f7f8fc;
  }
}

.drawer-content {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

.auth-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  margin-bottom: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #7f38ff 0%, #a667ff 100%);
  color: #fff;
  box-shadow: 0 10px 24px rgba(143, 3, 255, 0.18);
}

.summary-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}

.summary-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.82);
}

.summary-note {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.92);
}

.summary-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.summary-tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
}

.summary-tag-0 { background: linear-gradient(135deg, #ffb347 0%, #ff8a00 100%); }
.summary-tag-1 { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); }
.summary-tag-2 { background: linear-gradient(135deg, #fb7185 0%, #ef4444 100%); }
.summary-tag-3 { background: linear-gradient(135deg, #34d399 0%, #10b981 100%); }

.auth-section {
  margin-bottom: 16px;
  padding: 18px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(31, 35, 41, 0.05);
}

.section-title {
  position: relative;
  padding-left: 12px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 3px;
    width: 4px;
    height: 16px;
    border-radius: 999px;
    background: linear-gradient(180deg, #8f03ff 0%, #c25fff 100%);
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-card {
  padding: 14px;
  border: 1px solid #f0f2f5;
  border-radius: 12px;
  background: #fafbff;
}

.info-card--full {
  grid-column: 1 / -1;
}

.info-label {
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  line-height: 1.5;
  color: #303133;
  font-weight: 600;
  word-break: break-all;
}

.material-block {
  padding: 14px;
  border-radius: 12px;
  background: #fafbff;

  & + & {
    margin-top: 12px;
  }
}

.material-title {
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}

.material-subtitle {
  margin-bottom: 10px;
  font-size: 12px;
  color: #909399;

  &--spaced {
    margin-top: 14px;
  }
}

.skill-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.skill-media {
  width: 92px;
  height: 92px;
  border-radius: 10px;
  object-fit: cover;
  cursor: pointer;
  border: 1px solid #ebeef5;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  background: #fff;
}

.skill-video-thumb {
  padding: 0;
  background: transparent;
  border: none;
  outline: none;
  position: relative;
}

.skill-video-thumb__video {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
  display: block;
}

.skill-video-thumb__mask {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: radial-gradient(240px 180px at 50% 45%, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.28) 100%);
  pointer-events: none;
}

.skill-video-thumb__play {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 42px;
  height: 42px;
  margin-left: -21px;
  margin-top: -21px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    left: 16px;
    top: 13px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-left: 12px solid rgba(143, 3, 255, 0.92);
  }
}

.voice-player {
  width: 100%;
  border-radius: 10px;
  background: #fff;
}

.meta-list {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff;
}

.meta-title {
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
}

.meta-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;

  &--compact {
    margin-top: 0;
  }
}

.meta-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff;
  color: #606266;
  font-size: 12px;
  border: 1px solid #ebeef5;
}

.meta-chip--plain {
  max-width: 100%;
  border-radius: 10px;
  white-space: normal;
  word-break: break-all;
}

.meta-empty,
.empty-value,
.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  border-radius: 12px;
  background: #fafbff;
  color: #909399;
  font-size: 13px;
}

.field-values {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-item {
  padding: 14px;
  border: 1px solid #f0f2f5;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);

  &--missing {
    border-style: dashed;
    border-color: #dcdfe6;
  }
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.field-name {
  color: #303133;
  font-weight: 600;
}

.field-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.field-badge {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;

  &--required {
    background: rgba(255, 77, 79, 0.1);
    color: #ff4d4f;
  }

  &--optional {
    background: rgba(144, 147, 153, 0.12);
    color: #909399;
  }
}

.field-type {
  color: #909399;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f3ecff;
}

.field-content {
  color: #606266;
  text-align: left;
  word-break: break-all;
  line-height: 1.7;
}

.field-text,
.text-block {
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff;
  color: #606266;
  line-height: 1.7;
  word-break: break-all;
}

.field-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-image {
  width: 76px;
  height: 76px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.video-preview-dialog {
  ::v-deep .el-dialog__body {
    padding: 16px 18px 18px;
  }
}

.video-preview-body {
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-preview-player {
  width: 100%;
  max-height: 70vh;
  border-radius: 14px;
  background: #000;
}
</style>
