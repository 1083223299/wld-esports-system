<template>
  <el-drawer
    :visible="visible"
    :title="drawerTitle"
    size="560px"
    direction="rtl"
    class="skills-drawer"
    @close="handleClose"
  >
    <div class="drawer-content" v-loading="loading">
      <template v-if="totalSkills > 0">
        <div class="auth-summary">
          <div class="summary-main">
            <div class="summary-title">技能列表</div>
            <div class="summary-subtitle">查看当前陪玩的技能资料、认证材料与价格配置</div>
          </div>
          <div class="summary-tag">
            <span class="summary-tag-dot"></span>
            共 {{ totalSkills }} 项技能
          </div>
        </div>

        <div
          v-for="section in skillSections"
          v-show="section.items.length"
          :key="section.key"
          class="auth-section"
        >
          <div class="section-title">{{ section.title }}</div>

          <div
            v-for="(skill, index) in section.items"
            :key="skill.skillId || skill.productId || index"
            :class="['skill-panel', skill.panelClass]"
          >
            <div class="skill-head">
              <div class="skill-main">
                <div v-if="skill.cover" class="skill-cover">
                  <img :src="skill.cover" :alt="skill.productName">
                </div>
                <div class="skill-base">
                  <div class="skill-name-row">
                    <div class="skill-name">{{ skill.productName }}</div>
                    <div :class="['status-badge', skill.statusClass]">
                      <span class="status-icon-wrap">
                        <i :class="skill.statusIcon" class="status-icon"></i>
                      </span>
                      <span class="status-text">{{ skill.statusText }}</span>
                    </div>
                  </div>
                  <div class="skill-desc">价格单位：未来币/{{ skill.priceTypeName || "次" }}</div>
                </div>
              </div>
            </div>

            <div v-if="skill.isTechnicalCompanion" class="skill-module">
              <div class="section-title">技术搭档档案</div>
              <div class="info-grid">
                <div class="info-card">
                  <div class="info-label">真实姓名</div>
                  <div class="info-value">{{ skill.realName || '-' }}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">微信号</div>
                  <div class="info-value">{{ skill.wechatNo || '-' }}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">期望考核时间</div>
                  <div class="info-value">{{ skill.expectedAssessmentTime || '-' }}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">高光视频/图片</div>
                  <div v-if="skill.highlightMedia.length" class="skill-images">
                    <div
                      v-for="(item, mediaIndex) in skill.highlightMedia"
                      :key="'highlight-media-' + mediaIndex"
                      class="skill-image-card"
                      @click="openMediaPreview(skill.highlightMedia, mediaIndex)"
                    >
                      <img v-if="item.type === 'image'" :src="item.url" :alt="skill.productName" class="skill-image">
                      <template v-else>
                        <video :src="item.url" muted playsinline preload="metadata" class="skill-image"></video>
                        <span class="skill-video-play"></span>
                      </template>
                      <div class="image-mask">{{ item.type === 'video' ? '播放' : '预览' }}</div>
                    </div>
                  </div>
                  <div v-else class="empty-panel">暂无高光视频/图片</div>
                  <div v-if="skill.highlightOssIds.length" class="oss-chip-list">
                    <div v-for="(ossId, ossIndex) in skill.highlightOssIds" :key="'highlight-oss-' + ossId + ossIndex" class="oss-chip">
                      {{ ossId }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="skill-module">
              <div class="section-title">认证信息</div>
              <div v-if="skill.fieldEntries.length" class="info-grid">
                <div
                  v-for="field in skill.fieldEntries"
                  :key="field.key"
                  class="info-card"
                >
                  <div class="info-label">{{ field.label }}</div>
                  <div class="info-value">{{ field.value }}</div>
                </div>
              </div>

              <div class="material-block" v-if="skill.intro">
              <div class="material-title">技能介绍</div>
              <div class="text-block">{{ skill.intro }}</div>
            </div>

            <div class="material-block" v-if="skill.skillMedia.length || skill.skillOssIds.length">
              <div class="material-title">技能信息</div>
              <div v-if="skill.skillMedia.length" class="skill-images">
                <div
                  v-for="(item, mediaIndex) in skill.skillMedia"
                  :key="'skill-media-' + mediaIndex"
                  class="skill-image-card"
                  @click="openMediaPreview(skill.skillMedia, mediaIndex)"
                >
                  <img v-if="item.type === 'image'" :src="item.url" :alt="skill.productName" class="skill-image">
                  <template v-else>
                    <video :src="item.url" muted playsinline preload="metadata" class="skill-image"></video>
                    <span class="skill-video-play"></span>
                  </template>
                  <div class="image-mask">{{ item.type === 'video' ? '播放' : '预览' }}</div>
                </div>
              </div>
              <div v-else class="empty-panel">暂无技能信息</div>
              <div v-if="skill.skillOssIds.length" class="oss-chip-list">
                <div v-for="(ossId, ossIndex) in skill.skillOssIds" :key="'skill-oss-' + ossId + ossIndex" class="oss-chip">
                  {{ ossId }}
                </div>
              </div>
            </div>

            <div class="material-block" v-if="skill.voiceUrl">
              <div class="material-title">语音条</div>
              <audio :src="skill.voiceUrl" controls class="voice-player"></audio>
            </div>

            <div class="material-block">
              <div class="material-title">价格配置</div>
              <div v-if="skill.groups.length" class="field-values">
                <div
                  v-for="(group, groupIndex) in skill.groups"
                  :key="(group.groupName || 'group') + groupIndex"
                  class="field-item"
                >
                  <div class="field-header">
                    <div class="field-name">{{ group.groupName || ("分组" + (groupIndex + 1)) }}</div>
                    <div class="field-type">{{ skill.priceTypeName || "次" }}</div>
                  </div>
                  <div class="price-list">
                    <div
                      v-for="(priceItem, priceIndex) in group.price"
                      :key="priceItem.priceItemId || priceIndex"
                      class="price-row"
                    >
                      <div class="field-text price-label">{{ formatPriceLabel(group, priceItem) }}</div>
                      <div class="price-value">{{ formatAmount(priceItem.price) }}未来币/{{ skill.priceTypeName || "次" }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-panel">暂无价格配置</div>
            </div>
            </div>
          </div>
        </div>
      </template>
      <el-empty v-else-if="!loading" description="暂无技能数据"></el-empty>
    </div>

    <ImgZoom
      v-model="previewVisible"
      :img-list="previewImages"
      :init-index="previewIndex"
    />

    <el-dialog
      title="视频预览"
      :visible.sync="videoPreviewVisible"
      width="760px"
      append-to-body
      :close-on-click-modal="true"
      @closed="handleVideoPreviewClosed"
    >
      <video
        v-if="videoPreviewUrl"
        :key="videoPreviewUrl"
        :src="videoPreviewUrl"
        controls
        autoplay
        class="video-preview-player"
      ></video>
    </el-dialog>
  </el-drawer>
</template>

<script>
export default {
  name: "SkillsDrawer",
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    userName: {
      type: String,
      default: ""
    },
    mainSkill: {
      type: Array,
      default: function() {
        return [];
      }
    },
    secondarySkill: {
      type: Array,
      default: function() {
        return [];
      }
    }
  },
  data() {
    return {
      previewVisible: false,
      previewImages: [],
      previewIndex: 0,
      videoPreviewVisible: false,
      videoPreviewUrl: ""
    };
  },
  computed: {
    drawerTitle() {
      return this.userName ? this.userName + "的技能列表" : "技能列表";
    },
    totalSkills() {
      var mainCount = Array.isArray(this.mainSkill) ? this.mainSkill.length : 0;
      var secondaryCount = Array.isArray(this.secondarySkill) ? this.secondarySkill.length : 0;
      return mainCount + secondaryCount;
    },
    skillSections() {
      return [
        {
          key: "main",
          title: "主技能",
          items: (this.mainSkill || []).map(function(item) {
            return this.normalizeSkill(item);
          }, this)
        },
        {
          key: "secondary",
          title: "副技能",
          items: (this.secondarySkill || []).map(function(item) {
            return this.normalizeSkill(item);
          }, this)
        }
      ];
    }
  },
  methods: {
    handleClose() {
      this.previewVisible = false;
      this.previewImages = [];
      this.previewIndex = 0;
      this.videoPreviewVisible = false;
      this.videoPreviewUrl = "";
      this.$emit("close");
    },
    normalizeSkill(skill) {
      var skillDetail = (skill && skill.skillDetail) || {};
      var currentSkill = skillDetail.currentSkill || {};
      var fieldDefs = Array.isArray(skillDetail.fields) ? skillDetail.fields : [];
      var fieldEntriesMap = {};

      (Array.isArray(currentSkill.fieldValues) ? currentSkill.fieldValues : []).forEach(function(field, index) {
        var rawValue = field.fieldDisplayValue || field.fieldValue || "";
        var key;
        var existed;
        var order;

        if (!rawValue) {
          return;
        }

        key = field.relationId || field.fieldName || index;
        existed = fieldEntriesMap[key];
        order = this.resolveFieldOrder(fieldDefs, field, index);

        if (!existed) {
          fieldEntriesMap[key] = {
            key: key,
            label: field.fieldName || "字段",
            values: [rawValue],
            order: order
          };
          return;
        }

        if (existed.values.indexOf(rawValue) === -1) {
          existed.values.push(rawValue);
        }
      }, this);

      var fieldEntries = Object.values(fieldEntriesMap)
        .sort(function(a, b) {
          return a.order - b.order;
        })
        .map(function(item) {
          return {
            key: item.key,
            label: item.label,
            value: item.values.join("、")
          };
        });

      var groups = this.normalizeGroups(skill);
      var skillMedia = this.buildMediaList(currentSkill.skillInfoImage);
      var highlightMedia = this.buildMediaList(currentSkill.highlightVideo);
      var firstImage = skillMedia.find(function(item) {
        return item.type === "image";
      });
      var productName = skill.productName || skill.goodsName || "--";
      var statusNumber = Number(skill.status);
      var voiceInfo = skillDetail.userSkillVoiceItemVo || {};
      var applyType = String(currentSkill.applyType || skill.applyType || "");
      var isTechnicalCompanion = applyType === "2" || Number(skillDetail.isTechnicalWaiter) === 1;

      return {
        skillId: skill.skillId,
        productId: skill.productId,
        productName: productName,
        priceTypeName: skill.priceTypeName || "次",
        cover: skill.productImg || (firstImage && firstImage.url) || "",
        intro: currentSkill.introduce || (skillDetail.userSkillTextItemVo && skillDetail.userSkillTextItemVo.userText) || skill.introduce || "",
        skillMedia: skillMedia,
        skillOssIds: this.parseImageList(currentSkill.skillInfoImageOssId),
        highlightMedia: highlightMedia,
        highlightOssIds: this.parseImageList(currentSkill.highlightVideoOssId),
        isTechnicalCompanion: isTechnicalCompanion,
        realName: currentSkill.realName || "",
        wechatNo: currentSkill.wechatNo || "",
        expectedAssessmentTime: currentSkill.expectedAssessmentTime || "",
        voiceUrl: voiceInfo.voiceUrl || currentSkill.skillVoice || "",
        groups: groups,
        fieldEntries: fieldEntries,
        statusText: statusNumber === 1 ? "已开启" : "已关闭",
        statusType: statusNumber === 1 ? "success" : "info",
        statusClass: statusNumber === 1 ? "status-badge--open" : "status-badge--closed",
        statusIcon: statusNumber === 1 ? "el-icon-success" : "el-icon-close",
        panelClass: statusNumber === 1 ? "skill-panel--open" : "skill-panel--closed"
      };
    },
    normalizeGroups(skill) {
      if (skill && Array.isArray(skill.groups) && skill.groups.length) {
        return skill.groups.map(function(group) {
          return {
            groupName: group.groupName || "",
            price: Array.isArray(group.price)
              ? group.price.slice().sort(function(a, b) {
                return Number(a.weight || 0) - Number(b.weight || 0);
              })
              : []
          };
        });
      }

      if (skill && skill.price) {
        return [{
          groupName: "默认价格",
          price: [{
            priceItemId: skill.priceId || skill.skillId,
            label: "",
            price: skill.price
          }]
        }];
      }

      return [];
    },
    resolveFieldOrder(fieldDefs, field, fallbackIndex) {
      var matched = fieldDefs.find(function(item) {
        return String(item.id) === String(field.relationId) || item.fieldName === field.fieldName;
      });
      var orderNum;

      if (!matched) {
        return fallbackIndex;
      }

      orderNum = Number(matched.orderNum);
      return Number.isNaN(orderNum) ? fallbackIndex : orderNum;
    },
    parseImageList(value) {
      if (!value) {
        return [];
      }

      if (Array.isArray(value)) {
        return value.filter(Boolean);
      }

      if (typeof value !== "string") {
        return [];
      }

      return value
        .split(/[\n,]/)
        .map(function(item) {
          return item.trim();
        })
        .filter(Boolean);
    },
    buildMediaList(value) {
      return this.parseImageList(value).map(function(url) {
        return {
          url: url,
          type: this.getMediaType(url)
        };
      }, this);
    },
    getMediaType(url) {
      var normalizedUrl = String(url || "").split("?")[0].toLowerCase();
      if (/\.(mp4|mov|m4v|webm|ogg|ogv|avi|wmv|flv|mkv|m3u8)$/.test(normalizedUrl)) {
        return "video";
      }
      return "image";
    },
    openMediaPreview(mediaList, index) {
      var list = Array.isArray(mediaList) ? mediaList : [];
      var current = list[index] || {};
      var images;
      var imageIndex;

      if (current.type === "video") {
        this.openVideoPreview(current.url);
        return;
      }

      images = list.filter(function(item) {
        return item.type === "image";
      }).map(function(item) {
        return item.url;
      });
      imageIndex = images.indexOf(current.url);
      this.previewImages = images;
      this.previewIndex = imageIndex >= 0 ? imageIndex : 0;
      this.previewVisible = true;
    },
    openVideoPreview(url) {
      if (!url) return;
      this.videoPreviewUrl = url;
      this.videoPreviewVisible = true;
    },
    handleVideoPreviewClosed() {
      this.videoPreviewUrl = "";
    },
    formatAmount(value) {
      var normalized;

      if (value === null || value === undefined || value === "") {
        return "--";
      }

      normalized = String(value).trim();
      if (!normalized) {
        return "--";
      }

      return normalized.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
    },
    formatPriceLabel(group, priceItem) {
      if (priceItem && priceItem.label) {
        return priceItem.label;
      }

      if (group && group.groupName) {
        return group.groupName + "陪";
      }

      return "价格项";
    }
  }
};
</script>

<style scoped lang="scss">
.skills-drawer {
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
  line-height: 32px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.summary-tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.14);
  flex-shrink: 0;
}

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
}

.section-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 3px;
  width: 4px;
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(180deg, #8f03ff 0%, #c25fff 100%);
}

.skill-panel + .skill-panel {
  margin-top: 14px;
}

.skill-panel {
  position: relative;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #edf0f5;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcff 100%);
  box-shadow: 0 10px 24px rgba(31, 35, 41, 0.04);
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  overflow: hidden;
}

.skill-panel:hover {
  transform: translateY(-1px);
}

.skill-panel::before {
  content: "";
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 4px;
  border-radius: 999px;
  background: #d7dce8;
}

.skill-panel--open {
  border-color: rgba(27, 194, 134, 0.12);
  box-shadow: 0 12px 28px rgba(27, 194, 134, 0.08);
}

.skill-panel--closed {
  border-color: rgba(255, 107, 111, 0.14);
  box-shadow: 0 12px 28px rgba(255, 107, 111, 0.08);
}

.skill-panel--open::before {
  background: linear-gradient(180deg, #15c48d 0%, #5be1b6 100%);
  box-shadow: 0 0 18px rgba(21, 196, 141, 0.3);
}

.skill-panel--closed::before {
  background: linear-gradient(180deg, #ff6f6b 0%, #ff9e7a 100%);
  box-shadow: 0 0 18px rgba(255, 111, 107, 0.28);
}

.skill-head {
  margin-bottom: 14px;
}

.skill-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skill-cover {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  background: #fafbff;
  flex-shrink: 0;
}

.skill-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.skill-base {
  min-width: 0;
  flex: 1;
}

.skill-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.status-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 6px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  backdrop-filter: blur(8px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 8px 18px rgba(31, 35, 41, 0.08);
}

.status-badge::after {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.7;
}

.status-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 6px 12px rgba(31, 35, 41, 0.12);
}

.status-icon {
  font-size: 12px;
  color: #fff;
}

.status-text {
  position: relative;
  z-index: 1;
  letter-spacing: 0.02em;
}

.status-badge--open {
  color: #0f8f61;
  background: linear-gradient(135deg, rgba(21, 196, 141, 0.18) 0%, rgba(91, 225, 182, 0.08) 100%);
  border-color: rgba(21, 196, 141, 0.24);
}

.status-badge--open::after {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
}

.status-badge--open .status-icon-wrap {
  background: linear-gradient(135deg, #15c48d 0%, #2fd3a0 100%);
}

.status-badge--closed {
  color: #d94745;
  background: linear-gradient(135deg, rgba(255, 111, 107, 0.18) 0%, rgba(255, 158, 122, 0.08) 100%);
  border-color: rgba(255, 111, 107, 0.24);
}

.status-badge--closed::after {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.26) 0%, transparent 70%);
}

.status-badge--closed .status-icon-wrap {
  background: linear-gradient(135deg, #ff6f6b 0%, #ff8f7a 100%);
}

.skill-name {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.skill-desc {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
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

.skill-module {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #edf0f5;
  border-radius: 14px;
  background: #fff;
}

.skill-module + .skill-module {
  margin-top: 12px;
}

.skill-module .section-title {
  margin-bottom: 14px;
}

.skill-module .info-grid {
  margin-bottom: 0;
  align-items: stretch;
}

.skill-module .info-grid + .material-block {
  margin-top: 12px;
}

.info-label {
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  font-weight: 600;
  word-break: break-all;
}

.material-block {
  padding: 14px;
  border-radius: 12px;
  background: #fafbff;
}

.material-block + .material-block {
  margin-top: 12px;
}

.material-title {
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}

.skill-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.info-card .skill-image-card {
  width: 72px;
  height: 72px;
}

.skill-image-card {
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #ebeef5;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.skill-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 6px 0;
  font-size: 12px;
  color: #fff;
  text-align: center;
  background: linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.65) 100%);
}

.skill-video-play {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28px;
  height: 28px;
  margin-left: -14px;
  margin-top: -18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
}

.skill-video-play::after {
  content: "";
  position: absolute;
  left: 11px;
  top: 8px;
  border-style: solid;
  border-width: 6px 0 6px 10px;
  border-color: transparent transparent transparent #303133;
}

.oss-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.oss-chip {
  max-width: 100%;
  padding: 4px 8px;
  border-radius: 8px;
  background: #f4f0ff;
  color: #6b3ce0;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}

.video-preview-player {
  display: block;
  width: 100%;
  max-height: 70vh;
  background: #000;
}

.voice-player {
  width: 100%;
  border-radius: 10px;
  background: #fff;
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
  text-align: left;
}

.field-type {
  color: #909399;
  font-size: 12px;
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f3ecff;
}

.price-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.price-label {
  flex: 1;
  min-width: 0;
}

.price-value {
  flex-shrink: 0;
  color: #8f03ff;
  font-weight: 600;
  white-space: nowrap;
}

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

@media (max-width: 768px) {
  .auth-summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-tag {
    margin-top: 12px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .price-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .price-value {
    white-space: normal;
  }
}
</style>
