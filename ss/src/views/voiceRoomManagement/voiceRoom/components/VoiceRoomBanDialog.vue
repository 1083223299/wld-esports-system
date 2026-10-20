<template>
  <div class="voice-room-ban-root">
    <el-drawer
      :visible.sync="dialogVisible"
      direction="rtl"
      size="520px"
      append-to-body
      modal-class="ban-drawer-mask"
      :wrapper-closable="true"
      :close-on-press-escape="true"
      custom-class="ban-drawer"
      @close="handleClose"
    >
      <span slot="title" class="ban-dialog-title">
        <span class="ban-dialog-title-icon">
          <i class="el-icon-warning-outline"></i>
        </span>
      <span class="ban-dialog-title-text">
        <span class="ban-dialog-title-main">禁用成员</span>
        <span class="ban-dialog-title-sub">踢出当前语音房并同步封禁其账号</span>
      </span>
    </span>

      <div class="ban-drawer-scroll">
      <div class="ban-target">
        <div class="ban-target-avatar" @click="previewAvatar(member.avatarUrl)">
          <img :src="member.avatarUrl || defaultAvatar" alt="头像" />
        </div>
        <div class="ban-target-info">
          <div class="ban-target-name">
            {{ member.nickname || "—" }}
            <span class="ban-target-role">
              {{ member.memberRoleName || member.memberRole || "—" }}
            </span>
          </div>
          <div class="ban-target-tags">
            <span class="ban-target-tag">用户ID {{ member.userId || "—" }}</span>
            <span v-if="member.phone" class="ban-target-tag">{{ member.phone }}</span>
            <span class="ban-target-tag">房间 {{ room.roomId || "—" }}</span>
          </div>
        </div>
      </div>

      <el-form
        ref="banForm"
        :model="banForm"
        :rules="banRules"
        label-position="top"
        class="ban-form"
      >
        <el-form-item label="禁用类型" prop="banType">
          <el-radio-group v-model="banForm.banType" class="ban-segment">
            <el-radio-button :label="0">临时禁用</el-radio-button>
            <el-radio-button :label="1">永久禁用</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="banForm.banType === 0" label="禁用天数" prop="banDays">
          <div class="ban-days-row">
            <el-input
              v-model="banForm.banDays"
              class="ban-days-input"
              placeholder="请输入天数"
              maxlength="5"
              @input="handleBanDaysInput"
            >
              <template slot="append">天</template>
            </el-input>
            <div class="ban-days-presets">
              <button
                v-for="preset in banDaysPresets"
                :key="preset"
                type="button"
                class="ban-chip"
                :class="{ active: String(banForm.banDays) === String(preset) }"
                @click="banForm.banDays = preset"
              >
                {{ preset }} 天
              </button>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="禁用账号范围" prop="banScope">
          <el-radio-group v-model="banForm.banScope" class="ban-segment">
            <el-radio-button :label="0">仅当前账号</el-radio-button>
            <el-radio-button :label="1">同身份证下所有账号</el-radio-button>
          </el-radio-group>
          <div class="ban-field-tip">
            {{
              banForm.banScope === 1
                ? "将同时封禁该身份证下注册的所有账号"
                : "只封禁当前登录的这一个账号"
            }}
          </div>
        </el-form-item>

        <el-form-item label="禁用原因" prop="banReason">
          <el-input
            v-model="banForm.banReason"
            type="textarea"
            :rows="3"
            maxlength="100"
            show-word-limit
            placeholder="请输入禁用原因，该内容对用户可见"
          />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="banForm.remark"
            type="textarea"
            :rows="2"
            maxlength="50"
            show-word-limit
            placeholder="选填，仅后台可见，最多 50 字"
          />
        </el-form-item>

        <el-form-item class="ban-upload-item">
          <div slot="label" class="ban-label-row">
            <span>上传附件</span>
            <span class="ban-label-extra">选填，支持图片 / 录音 / 视频，最多 5 组</span>
          </div>
          <div class="ban-upload-list">
            <div v-for="(item, index) in banAttachments" :key="`${item.ossId}-${index}`" class="ban-upload-item-box">
              <img
                v-if="item.type === 'image'"
                :src="item.url"
                class="ban-upload-thumb"
                alt="附件"
                @click="handlePreviewImage(index)"
              />
              <video
                v-else-if="item.type === 'video'"
                :src="item.url"
                class="ban-upload-thumb"
                preload="metadata"
                @click="handlePreviewMedia(item.url, 'video')"
              />
              <div v-else class="ban-upload-thumb ban-upload-audio" @click="handlePreviewMedia(item.url, 'audio')">
                <i class="el-icon-headset"></i>
                <span>录音</span>
              </div>
              <div v-if="item.type !== 'image'" class="ban-upload-media-icon">
                <i :class="item.type === 'video' ? 'el-icon-video-play' : 'el-icon-headset'"></i>
              </div>
              <button type="button" class="ban-upload-remove" @click="handleDeleteAttachment(index)">
                <i class="el-icon-close"></i>
              </button>
            </div>

            <el-upload
              v-if="banAttachments.length < 5"
              action="#"
              :show-file-list="false"
              :before-upload="beforeUpload"
              :http-request="handleUpload"
              class="ban-upload-uploader"
              accept=".png,.jpg,.jpeg,.gif,.mp3,.wav,.mp4,.m4a,.avi"
              :disabled="uploading"
            >
              <div class="ban-upload-trigger">
                <div v-if="uploading" class="ban-upload-loading">
                  <i class="el-icon-loading"></i>
                  <span>上传中...</span>
                </div>
                <template v-else>
                  <i class="el-icon-plus"></i>
                  <span>上传文件</span>
                </template>
              </div>
            </el-upload>
          </div>
        </el-form-item>
      </el-form>

      <div class="ban-warning">
        <i class="el-icon-warning-outline"></i>
        <span>提交后将把该成员踢出语音房并同步封禁其账号，房间状态与邀请码不受影响</span>
      </div>
      </div>

      <div class="ban-drawer-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="handleSubmit">确认禁用</el-button>
      </div>

    </el-drawer>

  <el-dialog
    :visible.sync="mediaDialogVisible"
    width="640px"
    :close-on-click-modal="true"
    custom-class="ban-media-dialog"
    append-to-body
    @close="handleMediaDialogClose"
  >
    <video v-if="mediaType === 'video'" :src="mediaUrl" controls autoplay class="ban-media-player" />
    <audio v-else-if="mediaType === 'audio'" :src="mediaUrl" controls autoplay class="ban-media-player" />
  </el-dialog>

  <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />
  <ImgZoom
    v-model="previewVisible"
    :img-list="previewList"
    :initial-index="previewIndex"
  />
  </div>
</template>

<script>
import { banVoiceRoom } from "@/api/voiceRoom";
import { fileUpload } from "@/api/user";
import ImgZoom from "@/components/ImgZoom/index.vue";

export default {
  name: "VoiceRoomBanDialog",
  components: {
    ImgZoom,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      defaultAvatar: require("@/assets/defaulIcon.png"),
      submitting: false,
      room: {},
      member: {},
      avatarDialogVisible: false,
      previewAvatarUrl: "",
      uploading: false,
      banAttachments: [],
      previewVisible: false,
      previewList: [],
      previewIndex: 0,
      mediaDialogVisible: false,
      mediaUrl: "",
      mediaType: "",
      banDaysPresets: [1, 3, 7, 30],
      banForm: {
        banType: 1,
        banDays: "",
        banScope: 0,
        banReason: "",
        remark: "",
      },
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit("update:visible", val);
      },
    },
    banRules() {
      return {
        banType: [{ required: true, message: "请选择禁用类型", trigger: "change" }],
        banScope: [{ required: true, message: "请选择禁用账号范围", trigger: "change" }],
        banDays: [
          {
            required: true,
            validator: (rule, value, callback) => {
              if (this.banForm.banType !== 0) {
                callback();
                return;
              }
              const days = String(value || "").trim();
              if (!days) {
                callback(new Error("请输入禁用天数"));
                return;
              }
              if (!/^[1-9]\d*$/.test(days)) {
                callback(new Error("禁用天数只能为正整数"));
                return;
              }
              callback();
            },
            trigger: "blur",
          },
        ],
        banReason: [
          { required: true, message: "请输入禁用原因", trigger: "blur" },
          { max: 100, message: "禁用原因不能超过100字", trigger: "blur" },
        ],
        remark: [{ max: 50, message: "备注不能超过50字", trigger: "blur" }],
      };
    },
  },
  methods: {
    previewAvatar(url) {
      if (!url) {
        this.$message.warning("头像不存在");
        return;
      }
      this.previewAvatarUrl = url;
      this.avatarDialogVisible = true;
    },
    open(room = {}, member = {}) {
      this.room = room || {};
      this.member = member || {};
      this.resetBanForm();
      this.dialogVisible = true;
    },
    resetBanForm() {
      this.banForm = {
        banType: 1,
        banDays: "",
        banScope: 0,
        banReason: "",
        remark: "",
      };
      this.banAttachments = [];
      this.uploading = false;
      this.$nextTick(() => {
        if (this.$refs.banForm) {
          this.$refs.banForm.clearValidate();
        }
      });
    },
    getFileType(file) {
      if (!file || !file.type) return "audio";
      if (file.type.startsWith("image/")) return "image";
      if (file.type.startsWith("video/")) return "video";
      return "audio";
    },
    beforeUpload(file) {
      const allowedTypes = [
        "image/png",
        "image/jpg",
        "image/jpeg",
        "image/gif",
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/mp4",
        "audio/x-m4a",
        "video/mp4",
        "video/avi",
        "video/x-msvideo",
      ];
      const name = String(file.name || "").toLowerCase();
      const extAllowed = /\.(png|jpe?g|gif|mp3|wav|mp4|m4a|avi)$/.test(name);
      const typeAllowed = allowedTypes.includes(file.type) || extAllowed;
      if (!typeAllowed) {
        this.$message.error("仅支持图片、录音、视频格式");
        return false;
      }
      if (file.size / 1024 / 1024 >= 100) {
        this.$message.error("文件大小不能超过 100MB");
        return false;
      }
      if (this.banAttachments.length >= 5) {
        this.$message.error("最多上传5组文件");
        return false;
      }
      return true;
    },
    async handleUpload({ file, onSuccess }) {
      try {
        this.uploading = true;
        const formData = new FormData();
        formData.append("file", file);
        const response = await fileUpload(formData);
        if (response.code === 200 && response.data && response.data.ossId) {
          this.banAttachments.push({
            url: URL.createObjectURL(file),
            ossId: response.data.ossId,
            type: this.getFileType(file),
          });
          onSuccess && onSuccess("success");
          this.$message.success("上传成功");
          return;
        }
        throw new Error(response.message || "上传失败");
      } catch (error) {
        this.$message.error((error && error.message) || "上传失败");
      } finally {
        this.uploading = false;
      }
    },
    handleDeleteAttachment(index) {
      this.banAttachments.splice(index, 1);
    },
    handlePreviewImage(index) {
      const imageList = this.banAttachments
        .filter((item) => item.type === "image")
        .map((item) => item.url);
      const imageIndex = imageList.indexOf(this.banAttachments[index].url);
      this.previewList = imageList;
      this.previewIndex = imageIndex >= 0 ? imageIndex : 0;
      this.previewVisible = true;
    },
    handlePreviewMedia(url, type) {
      this.mediaUrl = url;
      this.mediaType = type;
      this.mediaDialogVisible = true;
    },
    handleMediaDialogClose() {
      this.mediaUrl = "";
      this.mediaType = "";
    },
    getResponseData(res) {
      if (res && typeof res === "object") {
        if (res.data && typeof res.data === "object") {
          return res.data;
        }
        return res;
      }
      return {};
    },
    handleBanDaysInput(val) {
      this.banForm.banDays = String(val || "").replace(/[^\d]/g, "");
    },
    async handleSubmit() {
      if (!this.$refs.banForm) return;
      const valid = await this.$refs.banForm.validate().catch(() => false);
      if (!valid) return;

      const userId = this.member.userId;
      if (!this.room.roomId || !userId) {
        this.$message.warning("房间或成员信息缺失，无法禁用");
        return;
      }

      const isTemporary = this.banForm.banType === 0;
      const payload = {
        roomId: this.room.roomId,
        userIds: [userId],
        banType: isTemporary ? 0 : 1,
        banDays: isTemporary ? Number(this.banForm.banDays) : undefined,
        banScope: this.banForm.banScope,
        banReason: this.banForm.banReason,
        remark: this.banForm.remark || undefined,
        businessFile:
          this.banAttachments
            .map((item) => item.ossId)
            .filter(Boolean)
            .join(",") || undefined,
      };

      this.submitting = true;
      try {
        const res = await banVoiceRoom(payload);
        if (res && res.success === false) {
          this.$message.error(res.errorMessage || "禁用失败");
          return;
        }
        const data = this.getResponseData(res);
        this.$message.success("禁用成功，已踢出语音房");
        this.dialogVisible = false;
        this.$emit("success", { data, member: this.member });
      } catch (error) {
        console.error("禁用语音房成员失败:", error);
        this.$message.error("禁用失败");
      } finally {
        this.submitting = false;
      }
    },
    handleClose() {
      this.dialogVisible = false;
    },
  },
};
</script>

<style scoped lang="scss">
/* ---------- 标题 ---------- */
.ban-dialog-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ban-dialog-title-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  color: #e6a23c;
  background: linear-gradient(135deg, #fff5e6 0%, #ffeed6 100%);
  box-shadow: inset 0 0 0 1px rgba(230, 162, 60, 0.22);
}

.ban-dialog-title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.3;
}

.ban-dialog-title-main {
  font-size: 16px;
  font-weight: 700;
  color: #1f2430;
}

.ban-dialog-title-sub {
  font-size: 12px;
  font-weight: 400;
  color: #9aa0ad;
}

/* ---------- 目标成员卡片 ---------- */
.ban-target {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid #ece7ff;
  background: linear-gradient(135deg, #f8f6ff 0%, #fcfbff 60%, #f7f9ff 100%);
}

.ban-target-avatar {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #fff;
  background: #f5f7fa;
  box-shadow: 0 4px 12px rgba(106, 53, 255, 0.16);
  cursor: pointer;
  transition: transform 0.25s ease;

  &:hover {
    transform: scale(1.06);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.ban-target-info {
  flex: 1;
  min-width: 0;
}

.ban-target-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2430;
  line-height: 1.4;
}

.ban-target-role {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  color: #6a35ff;
  background: #f0eaff;
}

.ban-target-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.ban-target-tag {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 18px;
  color: #6b7382;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid #eae7f5;
}

/* ---------- 表单 ---------- */
.ban-form {
  margin-top: 22px;
}

.ban-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.ban-label-extra {
  font-size: 12px;
  font-weight: 400;
  color: #a3a9b6;
}

.ban-field-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #9aa0ad;
}

/* ---------- 禁用天数 ---------- */
.ban-days-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ban-days-input {
  width: 150px;
}

.ban-days-presets {
  display: flex;
  gap: 8px;
}

.ban-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #e4e7ee;
  background: #fff;
  color: #6b7382;
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #c9b8ff;
    color: #6a35ff;
  }

  &.active {
    border-color: #6a35ff;
    background: #f4f0ff;
    color: #6a35ff;
    font-weight: 600;
  }
}

/* ---------- 附件 ---------- */
.ban-upload-item {
  margin-bottom: 20px;
}

.ban-upload-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.ban-upload-item-box,
.ban-upload-trigger {
  width: 88px;
  height: 88px;
  border-radius: 12px;
}

.ban-upload-item-box {
  position: relative;
  overflow: hidden;
  border: 1px solid #e6eaf2;
  background: #fff;
  box-shadow: 0 6px 16px rgba(90, 105, 132, 0.08);
}

.ban-upload-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.ban-upload-audio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #6d7890;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
  font-size: 12px;
}

.ban-upload-audio i {
  font-size: 22px;
}

.ban-upload-media-icon {
  position: absolute;
  left: 6px;
  bottom: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(31, 37, 51, 0.72);
  color: #fff;
  pointer-events: none;
}

.ban-upload-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(31, 37, 51, 0.72);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.ban-upload-uploader {
  display: inline-flex;
}

.ban-upload-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  border: 1px dashed #cad3e4;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
  color: #6d7890;
  transition: all 0.2s ease;
  cursor: pointer;
}

.ban-upload-trigger:hover {
  border-color: #8f03ff;
  color: #6a4ce0;
}

.ban-upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.ban-media-player {
  width: 100%;
  max-height: 70vh;
  outline: none;
}

.ban-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 10px;
  background: linear-gradient(90deg, #fff8ec 0%, #fffdf8 100%);
  border: 1px solid #f7dfb4;
  color: #b7791f;
  font-size: 12.5px;
  line-height: 1.7;

  i {
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 14px;
  }
}

/* 中间滚动区：头部和底部按钮固定，只有这一段滚动 */
.ban-drawer-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px 4px;
  /* element-ui 默认 word-break: break-all，附件名容易被截断 */
  word-break: break-word;
  -webkit-overflow-scrolling: touch;
}

/* 固定底栏 */
.ban-drawer-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding: 14px 22px 18px;
  border-top: 1px solid #f0f2f7;
  background: #fff;
}
</style>

<style lang="scss">
/* ==========================================================
   以下样式必须写在非 scoped 块里：
   el-drawer 用了 append-to-body，抽屉和遮罩都挂到了 body 上，
   scoped 的 data-v 属性作用不到它们。
   ========================================================== */

/* 抽屉本体：el-drawer 本身已是 position:absolute + 高度 100%，
   右侧滑出的动画也是 element-ui 原生的，这里只做外观 */
.ban-drawer.el-drawer {
  max-width: 100vw;
  border-radius: 16px 0 0 16px;
  box-shadow: -8px 0 40px rgba(24, 30, 45, 0.16);
}

/* 三段式：头部固定 / 中间滚动 / 底栏固定。
   element-ui 默认 .el-drawer__body{overflow:auto} 会把底栏一起滚走，
   所以这里改成 overflow:hidden，滚动交给 slot 里的 .ban-drawer-scroll */
.ban-drawer.el-drawer .el-drawer__header {
  flex-shrink: 0;
  margin-bottom: 0;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #f0f2f7;
}

.ban-drawer.el-drawer .el-drawer__title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2430;
  line-height: 1.4;
}

.ban-drawer.el-drawer .el-drawer__close-btn {
  position: static;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin-left: 8px;
  border-radius: 8px;
  font-size: 17px;
  color: #9aa0ad;
  transition: all 0.2s ease;
}

.ban-drawer.el-drawer .el-drawer__close-btn:hover {
  background: #f4f5f9;
  color: #1f2430;
}

.ban-drawer.el-drawer .el-drawer__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* 点击空白关闭由 wrapper-closable 提供，遮罩用 modal-class 直接定位。
   element-ui 的 el-dialog 没有 modal-class、当年才被迫用 :has() 反查，
   换成 el-drawer 之后不再需要 :has()，老浏览器也能正确变透明 */
.v-modal.ban-drawer-mask {
  background: #1f2739;
  opacity: 0.2;
}

.ban-drawer {
  .el-dialog__header {
    flex-shrink: 0;
    padding: 18px 22px 14px;
    border-bottom: 1px solid #f0f2f7;
  }

  .el-dialog__title {
    font-size: 16px;
    font-weight: 700;
    color: #1f2430;
  }

  .el-form-item {
    margin-bottom: 20px;
  }

  /* label-position="top"：标签在上、控件在下，
     这样字段名长短不影响对齐，不会出现参差不齐的左列 */
  .el-form-item__label {
    padding: 0 0 8px;
    color: #4a5160;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
  }

  /* 分段选择器：把 element-ui 默认的方块按钮改成胶囊分段控件 */
  .ban-segment {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border-radius: 12px;
    background: #f4f5f9;
  }

  .ban-segment .el-radio-button {
    margin-right: 0;
  }

  .ban-segment .el-radio-button__inner {
    border: none !important;
    margin-left: 0 !important;
    box-shadow: none !important;
    padding: 8px 20px;
    border-radius: 9px;
    background: transparent;
    color: #6b7382;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .ban-segment .el-radio-button__orig-radio:checked + .el-radio-button__inner {
    background: #fff;
    color: #6a35ff;
    box-shadow: 0 2px 8px rgba(106, 53, 255, 0.18) !important;
  }

  /* 输入类控件统一圆角与聚焦色 */
  .el-input__inner,
  .el-textarea__inner {
    border-radius: 10px;
    border-color: #e4e7ee;
    color: #1f2430;
  }

  .el-input__inner:focus,
  .el-textarea__inner:focus {
    border-color: #6a35ff;
  }

  .el-input__inner::placeholder,
  .el-textarea__inner::placeholder {
    color: #b4bac6;
  }

  .el-input-group--append .el-input__inner {
    border-radius: 10px 0 0 10px;
  }

  .el-input-group__append {
    border-radius: 0 10px 10px 0;
    border-color: #e4e7ee;
    background: #fafbfc;
    color: #8a91a0;
  }

  .el-textarea__inner {
    padding: 10px 12px;
    line-height: 1.7;
  }

  /* 必填星号跟着标签的紫色，和聚焦态一致 */
  .el-form-item.is-required .el-form-item__label::before {
    color: #f56c6c;
  }
}

/* 附件预览弹窗跟着一起居中，保持一致的观感 */
.ban-media-dialog.el-dialog {
  top: 50%;
  margin: 0 auto;
  transform: translateY(-50%);
  max-width: calc(100vw - 32px);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(24, 30, 45, 0.18);
}

body .ban-media-dialog.el-dialog {
  animation: voice-room-ban-media-in 0.24s ease;
}

@keyframes voice-room-ban-media-in {
  from {
    opacity: 0;
    transform: translateY(calc(-50% - 14px));
  }
  to {
    opacity: 1;
    transform: translateY(-50%);
  }
}

.ban-media-dialog .el-dialog__header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f2f7;
}

.ban-media-dialog .el-dialog__body {
  padding: 16px 20px 20px;
  background: #f7f8fa;
}
</style>
