<template>
  <div class="ban-user-dialog-root">
    <el-dialog :visible.sync="dialogVisible" width="560px" custom-class="user-ban-dialog" append-to-body
      :close-on-click-modal="false" :show-close="false" @close="handleDialogClose">
      <div class="ban-dialog__panel" v-loading="banDialogLoading">
        <div class="ban-dialog__header">
          <div>
            <div class="ban-dialog__title">禁用</div>
            <div class="ban-dialog__subtitle">请填写禁用信息，提交后将按规则限制账号使用</div>
          </div>
          <div class="ban-dialog__user">用户ID {{ banTargetUser.userId || '--' }}</div>
        </div>

        <div v-if="banClubInfo.visible" class="ban-dialog__club">
          <div class="ban-dialog__club-label">所属俱乐部</div>
          <div class="ban-dialog__club-value">{{ banClubInfo.text }}</div>
        </div>

        <div v-if="userBanStr" class="ban-dialog__ban-tip">{{ userBanStr }}</div>

        <el-form ref="banFormRef" :model="banForm" :rules="banRules" label-width="96px" class="ban-dialog__form">
          <div class="ban-dialog__form-card">
            <el-form-item label="禁用" prop="banType">
              <el-radio-group v-model="banForm.banType" class="ban-dialog__radios" @change="handleBanTypeChange">
                <el-radio label="temporary" class="ban-dialog__radio">临时禁用</el-radio>
                <el-radio label="permanent" class="ban-dialog__radio">永久禁用</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="banForm.banType === 'temporary'" label="禁用天数" prop="banDays" required>
              <div class="ban-dialog__days" :class="{ 'is-focus': banDaysFocused }">
                <el-input v-model="banForm.banDays" class="ban-dialog__days-input" placeholder="请输入禁用天数"
                  maxlength="5" @input="handleBanDaysInput" @focus="banDaysFocused = true"
                  @blur="banDaysFocused = false" />
                <span class="ban-dialog__days-unit">天</span>
              </div>
            </el-form-item>
            <el-form-item label="禁用账号" prop="banScope">
              <el-radio-group v-model="banForm.banScope" class="ban-dialog__radios">
                <el-radio label="current" class="ban-dialog__radio">仅当前账号</el-radio>
                <el-radio label="allIdCard" class="ban-dialog__radio">同身份证下所有账号</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="禁用原因" prop="banReason">
              <el-input v-model="banForm.banReason" type="textarea" :rows="4" maxlength="50" show-word-limit
                placeholder="请输入禁用原因（用户端可见）" />
            </el-form-item>
            <el-form-item label="备注" prop="remark">
              <el-input v-model="banForm.remark" type="textarea" :rows="3" maxlength="50" show-word-limit
                placeholder="请输入备注（选填）" />
            </el-form-item>
          </div>

          <div class="ban-dialog__upload-card">
            <div class="ban-dialog__upload-card-header">
              <div class="ban-dialog__upload-card-title">上传附件</div>
              <div class="ban-dialog__upload-card-desc">支持图片、录音、视频，最多上传 5 组，支持点击预览</div>
            </div>
            <el-form-item label-width="0" class="ban-dialog__upload-card-form-item">
              <div class="ban-upload">
                <div class="ban-upload__list">
                  <div v-for="(item, index) in banAttachments" :key="`${item.ossId}-${index}`" class="ban-upload__item">
                    <img v-if="item.type === 'image'" :src="item.url" class="ban-upload__img"
                      @click="handleBanPreviewImage(index)" />
                    <template v-else-if="item.type === 'video'">
                      <video :src="item.url" class="ban-upload__img" preload="metadata"
                        @click="handleBanPreviewMedia(item.url, 'video')" />
                      <div class="ban-upload__media-icon"><i class="el-icon-video-play" /></div>
                    </template>
                    <template v-else>
                      <div class="ban-upload__img ban-upload__audio" @click="handleBanPreviewMedia(item.url, 'audio')">
                        <i class="el-icon-headset"></i>
                        <span>录音</span>
                      </div>
                      <div class="ban-upload__media-icon"><i class="el-icon-headset" /></div>
                    </template>
                    <button type="button" class="ban-upload__remove" @click="handleBanDeleteAttachment(index)">
                      <i class="el-icon-close"></i>
                    </button>
                  </div>

                  <el-upload v-if="banAttachments.length < 5" action="#" :show-file-list="false"
                    :before-upload="beforeBanUpload" :http-request="handleBanUpload" class="ban-upload__uploader"
                    accept=".png,.jpg,.jpeg,.gif,.mp3,.wav,.mp4,.m4a,.avi" :disabled="banUploading">
                    <div class="ban-upload__trigger">
                      <div v-if="banUploading" class="ban-upload__loading">
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
              </div>
            </el-form-item>
          </div>
        </el-form>

        <div class="ban-dialog__footer">
          <el-button class="ban-dialog__btn ban-dialog__btn--ghost" @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" class="ban-dialog__btn ban-dialog__btn--primary" :loading="banSubmitting"
            @click="submitBanForm">提交</el-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog :visible.sync="banMediaDialogVisible" width="640px" :close-on-click-modal="true"
      custom-class="ban-media-dialog" append-to-body @close="handleBanMediaDialogClose">
      <video v-if="banMediaType === 'video'" :src="banMediaUrl" controls autoplay class="ban-media-player" />
      <audio v-else-if="banMediaType === 'audio'" :src="banMediaUrl" controls autoplay
        class="ban-media-player ban-media-player--audio" />
    </el-dialog>

    <ImgZoom v-model="banPreviewVisible" :img-list="banPreviewList" :initial-index="banPreviewIndex" />
  </div>
</template>

<script>
import ImgZoom from "@/components/ImgZoom/index.vue";
import { fileUpload } from "@/api/user";
import { updateUserStatus } from "@/api/personalSupport";
import { getUserPriceClass } from "@/api/reportComplaint";

export default {
  name: "BanUserDialog",
  components: {
    ImgZoom
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    /** 公会陪列表可强制展示俱乐部信息 */
    forceGuild: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      banDialogLoading: false,
      banSubmitting: false,
      banUploading: false,
      banDaysFocused: false,
      openForceGuild: false,
      extraPayload: {},
      banTargetUser: { userId: "", nickName: "" },
      banClubInfo: { visible: false, text: "" },
      userBanStr: "",
      banForm: {
        banType: "temporary",
        banScope: "current",
        banDays: "",
        banReason: "",
        remark: ""
      },
      banAttachments: [],
      banPreviewVisible: false,
      banPreviewList: [],
      banPreviewIndex: 0,
      banMediaDialogVisible: false,
      banMediaUrl: "",
      banMediaType: ""
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit("update:visible", val);
      }
    },
    banRules() {
      return {
        banType: [{ required: true, message: "请选择禁用类型", trigger: "change" }],
        banScope: [{ required: true, message: "请选择禁用账号范围", trigger: "change" }],
        banDays: [{
          required: true,
          validator: (rule, value, callback) => {
            if (this.banForm.banType !== "temporary") {
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
          trigger: "blur"
        }],
        banReason: [
          { required: true, message: "请输入禁用原因", trigger: "blur" },
          { max: 50, message: "禁用原因不能超过50字", trigger: "blur" }
        ],
        remark: [{ max: 50, message: "备注不能超过50字", trigger: "blur" }]
      };
    }
  },
  methods: {
    open(row = {}, options = {}) {
      this.banTargetUser = {
        userId: row.userId || row.reportedId || "",
        nickName: row.nickName || row.userName || row.reportedName || ""
      };
      this.extraPayload = {
        businessType: options.businessType || "MANUAL",
        businessNo: options.businessNo,
        reportId: options.reportId
      };
      this.openForceGuild = !!options.forceGuild;
      this.userBanStr = String(row.userBanStr || options.userBanStr || "").trim();
      this.resetBanForm();
      this.dialogVisible = true;
      this.banClubInfo = { visible: false, text: "" };

      const inlineClub = this.resolveClubText(null, row);
      if (inlineClub) {
        this.banClubInfo = { visible: true, text: inlineClub };
      }
      this.loadClubInfo(row);
    },
    isGuildCompanion(row) {
      if (this.forceGuild || this.openForceGuild) {
        return true;
      }
      const member = String(row.isMember ?? "");
      if (["1", "2"].includes(member)) {
        return true;
      }
      return !!(row.tradeName || row.tradeNo || row.tradeId);
    },
    resolveClubText(tradeUnionIntroduction, row = {}) {
      const intro = tradeUnionIntroduction || {};
      const name = intro.tradeName || row.tradeName || "";
      const id = intro.tradeNo || row.tradeNo || row.tradeId || "";
      if (!name && !id) {
        return "";
      }
      return `${name || "--"}（${id || "--"}）`;
    },
    async loadClubInfo(row) {
      if (!this.isGuildCompanion(row)) {
        return;
      }
      this.banDialogLoading = true;
      try {
        const res = await getUserPriceClass({ userId: row.userId });
        const tradeUnionIntroduction =
          (res && res.tradeUnionIntroduction) ||
          (res && res.data && res.data.tradeUnionIntroduction) ||
          null;
        const clubText = this.resolveClubText(tradeUnionIntroduction, row);
        this.banClubInfo = {
          visible: true,
          text: clubText || "暂无俱乐部信息"
        };
      } catch (error) {
        console.error("获取俱乐部信息失败:", error);
        const fallback = this.resolveClubText(null, row);
        this.banClubInfo = {
          visible: true,
          text: fallback || "暂无俱乐部信息"
        };
      } finally {
        this.banDialogLoading = false;
      }
    },
    resetBanForm() {
      this.banForm = {
        banType: "temporary",
        banScope: "current",
        banDays: "",
        banReason: "",
        remark: ""
      };
      this.banAttachments = [];
      this.banUploading = false;
      this.banDaysFocused = false;
      this.$nextTick(() => {
        if (this.$refs.banFormRef) {
          this.$refs.banFormRef.clearValidate();
        }
      });
    },
    handleDialogClose() {
      this.userBanStr = "";
      this.banClubInfo = { visible: false, text: "" };
      this.resetBanForm();
    },
    handleBanDaysInput(val) {
      this.banForm.banDays = String(val || "").replace(/[^\d]/g, "");
    },
    handleBanTypeChange(val) {
      if (val === "permanent") {
        this.banForm.banDays = "";
      }
      this.$nextTick(() => {
        if (this.$refs.banFormRef) {
          this.$refs.banFormRef.clearValidate(["banDays"]);
        }
      });
    },
    getBanFileType(file) {
      if (!file || !file.type) {
        return "audio";
      }
      if (file.type.startsWith("image/")) {
        return "image";
      }
      if (file.type.startsWith("video/")) {
        return "video";
      }
      return "audio";
    },
    beforeBanUpload(file) {
      const allowedTypes = [
        "image/png", "image/jpg", "image/jpeg", "image/gif",
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a",
        "video/mp4", "video/avi", "video/x-msvideo"
      ];
      const name = String(file.name || "").toLowerCase();
      const extAllowed = /\.(png|jpe?g|gif|mp3|wav|mp4|m4a|avi)$/.test(name);
      const typeAllowed = allowedTypes.includes(file.type) || extAllowed;
      const isLt100M = file.size / 1024 / 1024 < 100;
      if (!typeAllowed) {
        this.$message.error("仅支持图片、录音、视频格式");
        return false;
      }
      if (!isLt100M) {
        this.$message.error("文件大小不能超过 100MB");
        return false;
      }
      if (this.banAttachments.length >= 5) {
        this.$message.error("最多上传5组文件");
        return false;
      }
      return true;
    },
    async handleBanUpload({ file, onSuccess }) {
      try {
        this.banUploading = true;
        const formData = new FormData();
        formData.append("file", file);
        const response = await fileUpload(formData);
        if (response.code === 200 && response.data && response.data.ossId) {
          this.banAttachments.push({
            url: URL.createObjectURL(file),
            ossId: response.data.ossId,
            type: this.getBanFileType(file)
          });
          onSuccess && onSuccess("success");
          this.$message.success("上传成功");
          return;
        }
        throw new Error(response.message || "上传失败");
      } catch (error) {
        this.$message.error((error && error.message) || "上传失败");
      } finally {
        this.banUploading = false;
      }
    },
    handleBanDeleteAttachment(index) {
      this.banAttachments.splice(index, 1);
    },
    handleBanPreviewImage(index) {
      const imageList = this.banAttachments.filter(item => item.type === "image").map(item => item.url);
      const imageIndex = imageList.indexOf(this.banAttachments[index].url);
      this.banPreviewList = imageList;
      this.banPreviewIndex = imageIndex >= 0 ? imageIndex : 0;
      this.banPreviewVisible = true;
    },
    handleBanPreviewMedia(url, type) {
      this.banMediaUrl = url;
      this.banMediaType = type;
      this.banMediaDialogVisible = true;
    },
    handleBanMediaDialogClose() {
      this.banMediaUrl = "";
      this.banMediaType = "";
    },
    async submitBanForm() {
      if (!this.$refs.banFormRef) {
        return;
      }
      const valid = await this.$refs.banFormRef.validate().catch(() => false);
      if (!valid) {
        return;
      }
      const isTemporary = this.banForm.banType === "temporary";
      const payload = {
        userId: Number(this.banTargetUser.userId),
        status: "1",
        banType: isTemporary ? 0 : 1,
        banScope: this.banForm.banScope === "current" ? 0 : 1,
        banDays: isTemporary ? Number(this.banForm.banDays) : 36500,
        businessType: (this.extraPayload && this.extraPayload.businessType) || "MANUAL",
        banReason: this.banForm.banReason,
        remark: this.banForm.remark || undefined,
        businessFile: this.banAttachments.map(item => item.ossId).filter(Boolean).join(",") || undefined
      };
      if (this.extraPayload && this.extraPayload.businessNo !== undefined && this.extraPayload.businessNo !== null && this.extraPayload.businessNo !== "") {
        payload.businessNo = this.extraPayload.businessNo;
      }
      if (this.extraPayload && this.extraPayload.reportId !== undefined && this.extraPayload.reportId !== null && this.extraPayload.reportId !== "") {
        payload.reportId = this.extraPayload.reportId;
      }
      this.banSubmitting = true;
      try {
        const res = await updateUserStatus(payload);
        if (res && res.success === false) {
          this.$message.error((res && res.errorMessage) || "禁用失败");
          return;
        }
        this.$message.success("禁用成功");
        this.dialogVisible = false;
        this.$emit("success");
      } catch (error) {
        console.error("禁用用户失败:", error);
        this.$message.error("禁用失败");
      } finally {
        this.banSubmitting = false;
      }
    }
  }
};
</script>

<style scoped>
.ban-dialog__panel {
  padding: 26px 28px 24px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.1), transparent 24%),
    radial-gradient(circle at top right, rgba(12, 167, 255, 0.08), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
}

.ban-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.ban-dialog__title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2533;
}

.ban-dialog__subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #7b8496;
}

.ban-dialog__user {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(143, 3, 255, 0.08);
  font-size: 12px;
  font-weight: 600;
  color: #6a4ce0;
}

.ban-dialog__club {
  position: relative;
  margin-bottom: 16px;
  padding: 18px 22px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1f2433 0%, #34435f 100%);
  box-shadow: 0 14px 28px rgba(44, 58, 88, 0.2);
  overflow: hidden;
}

.ban-dialog__club::after {
  content: "";
  position: absolute;
  right: -18px;
  top: -18px;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.ban-dialog__club-label,
.ban-dialog__club-value {
  position: relative;
  z-index: 1;
}

.ban-dialog__club-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.ban-dialog__club-value {
  margin-top: 10px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  color: #fff;
}

.ban-dialog__ban-tip {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 153, 0, 0.08);
  font-size: 13px;
  line-height: 1.7;
  color: #ff9900;
  white-space: pre-line;
}

.ban-dialog__form ::v-deep .el-form-item {
  margin-bottom: 20px;
}

.ban-dialog__form ::v-deep .el-form-item__label {
  font-weight: 600;
  color: #303645;
}

.ban-dialog__form-card,
.ban-dialog__upload-card {
  padding: 18px 18px 4px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(225, 230, 239, 0.88);
  box-shadow: 0 10px 28px rgba(83, 97, 123, 0.08);
}

.ban-dialog__upload-card {
  margin-top: 14px;
  padding-bottom: 16px;
}

.ban-dialog__radios {
  height: auto;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  width: 100%;
}

.ban-dialog__radio {
  margin-right: 0;
}

.ban-dialog__radios ::v-deep .el-radio__label {
  font-size: 14px;
  color: #4b5565;
}

.ban-dialog__radios ::v-deep .el-radio__input.is-checked+.el-radio__label {
  color: #5b46d6;
  font-weight: 600;
}

.ban-dialog__radios ::v-deep .el-radio__inner {
  width: 16px;
  height: 16px;
  border-color: #c9d2e3;
}

.ban-dialog__radios ::v-deep .el-radio__input.is-checked .el-radio__inner {
  border-color: #8f03ff;
  background: #8f03ff;
}

.ban-dialog__radios ::v-deep .el-radio__inner::after {
  width: 6px;
  height: 6px;
}

.ban-dialog__days {
  display: flex;
  align-items: stretch;
  max-width: 240px;
  height: 42px;
  overflow: hidden;
  border: 1px solid #e2e8f2;
  border-radius: 14px;
  background: #fbfcff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ban-dialog__days.is-focus {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.ban-dialog__days-input {
  flex: 1;
  min-width: 0;
}

.ban-dialog__days-input ::v-deep .el-input__inner {
  height: 40px;
  line-height: 40px;
  border: none !important;
  border-radius: 0 !important;
  background: transparent;
  box-shadow: none !important;
}

.ban-dialog__days-input ::v-deep .el-input__inner:focus {
  border: none !important;
  box-shadow: none !important;
}

.ban-dialog__days-unit {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 0 14px;
  border-left: 1px solid #e2e8f2;
  background: #f5f7fb;
  color: #5d6678;
  font-size: 14px;
  font-weight: 600;
}

.ban-dialog__form ::v-deep .el-input__inner,
.ban-dialog__form ::v-deep .el-textarea__inner {
  border-radius: 14px;
  border-color: #e2e8f2;
  background: #fbfcff;
}

.ban-dialog__form ::v-deep .el-input__inner {
  height: 42px;
  line-height: 42px;
}

.ban-dialog__form ::v-deep .el-input__inner:focus,
.ban-dialog__form ::v-deep .el-textarea__inner:focus {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.ban-dialog__upload-card-header {
  margin-bottom: 14px;
}

.ban-dialog__upload-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2533;
}

.ban-dialog__upload-card-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #8a94a6;
}

.ban-dialog__upload-card-form-item {
  margin-bottom: 0 !important;
}

.ban-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
}

.ban-dialog__btn {
  min-width: 92px;
  height: 38px;
  border-radius: 999px;
}

.ban-dialog__btn--ghost {
  border-color: #dbe1ec;
  background: #fff;
  color: #566174;
}

.ban-dialog__btn--ghost:hover,
.ban-dialog__btn--ghost:focus {
  color: #566174;
  border-color: #c8d1e0;
  background: #f8faff;
}

.ban-dialog__btn--primary {
  border: none;
  background: linear-gradient(135deg, #8f03ff 0%, #5c67ff 100%);
  box-shadow: 0 10px 22px rgba(108, 95, 255, 0.22);
}

.ban-dialog__btn--primary:hover,
.ban-dialog__btn--primary:focus {
  background: linear-gradient(135deg, #7b00df 0%, #4f58eb 100%);
}

.ban-upload__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.ban-upload__item,
.ban-upload__trigger {
  width: 92px;
  height: 92px;
  border-radius: 18px;
}

.ban-upload__item {
  position: relative;
  overflow: hidden;
  border: 1px solid #e6eaf2;
  background: #fff;
  box-shadow: 0 8px 20px rgba(90, 105, 132, 0.08);
}

.ban-upload__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.ban-upload__audio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #6d7890;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
  font-size: 12px;
}

.ban-upload__audio i {
  font-size: 22px;
}

.ban-upload__media-icon {
  position: absolute;
  left: 8px;
  bottom: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(31, 37, 51, 0.72);
  color: #fff;
  pointer-events: none;
}

.ban-upload__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
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

.ban-upload__uploader {
  display: inline-flex;
}

.ban-upload__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  border: 1px dashed #cad3e4;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
  color: #6d7890;
  transition: all 0.2s ease;
}

.ban-upload__trigger:hover {
  border-color: #8f03ff;
  color: #6a4ce0;
  box-shadow: 0 10px 22px rgba(143, 3, 255, 0.08);
}

.ban-upload__loading {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.ban-media-player {
  width: 100%;
  max-height: 70vh;
  outline: none;
}

.ban-media-player--audio {
  margin-top: 12px;
}
</style>

<style>
.user-ban-dialog {
  border-radius: 24px;
  overflow: hidden;
  margin-top: 8vh !important;
}

.user-ban-dialog .el-dialog__header {
  display: none;
}

.user-ban-dialog .el-dialog__body {
  padding: 0 !important;
}

.user-ban-dialog .el-dialog__footer {
  padding: 0 !important;
}

.user-ban-dialog .el-form-item__error {
  padding-top: 4px;
}
</style>
