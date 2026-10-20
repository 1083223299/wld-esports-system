<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="0"
    label-position="top"
    class="announcement-form"
  >
    <div class="form-body">
    <div class="form-section form-section--base">
      <div class="form-section__head">
        <span class="form-section__title">基本信息</span>
        <span class="form-section__en">BASIC INFO</span>
      </div>
      <div class="form-section__body">
        <el-form-item prop="noticeType" class="form-field">
          <div slot="label" class="form-field__label">公告类型 <em class="req">*</em></div>
          <el-select v-model="form.noticeType" placeholder="请选择公告类型" class="field-control">
            <el-option
              v-for="item in noticeTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="title" class="form-field">
          <div slot="label" class="form-field__label">公告标题 <em class="req">*</em></div>
          <div class="field-count">
            <el-input
              v-model="form.title"
              placeholder="请输入，最多 15 字"
              maxlength="15"
              class="field-control"
            />
            <span class="field-count__num">{{ form.title.length }}<i>/15</i></span>
          </div>
        </el-form-item>

        <el-form-item prop="content" class="form-field">
          <div slot="label" class="form-field__label">公告内容 <em class="req">*</em></div>
          <div class="field-count">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="5"
              placeholder="请输入，最多 200 字，完整内容将直接推送到 IM 系统通知"
              maxlength="200"
              resize="none"
              class="field-control"
            />
            <span class="field-count__num field-count__num--area">{{ form.content.length }}<i>/200</i></span>
          </div>
        </el-form-item>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section__head">
        <span class="form-section__title">推送配置</span>
        <span class="form-section__en">PUSH CONFIG</span>
      </div>
      <div class="form-section__body">
        <el-form-item prop="pushScope" class="form-field">
          <div slot="label" class="form-field__label">推送范围 <em class="req">*</em></div>
          <div class="tag-group">
            <button
              v-for="item in scopeOptions"
              :key="item.value"
              type="button"
              class="tag-chip"
              :class="{ 'is-active': form.pushScope.includes(item.value) }"
              @click="toggleScope(item.value)"
            >
              <i v-if="form.pushScope.includes(item.value)" class="el-icon-check tag-chip__check" />
              {{ item.label }}
            </button>
          </div>
          <div class="tag-summary">
            <i class="el-icon-magic-stick" />
            已选范围：
            <template v-if="selectedScopeText">{{ selectedScopeText }}</template>
            <template v-else><span class="tag-summary__empty">尚未选择</span></template>
          </div>
        </el-form-item>

        <el-form-item v-if="showPushPerson" prop="pushPersons" class="form-field form-field--plain">
          <div slot="label" class="form-field__label">推送人 <em class="req">*</em></div>
          <div class="push-person">
            <div
              v-for="(person, index) in form.pushPersons"
              :key="index"
              class="push-person__row"
            >
              <div class="push-person__index">{{ index + 1 }}</div>
              <el-input
                v-model="person.userId"
                placeholder="请输入用户ID"
                clearable
                class="push-person__input"
              />
              <button
                type="button"
                class="push-person__btn push-person__btn--add"
                title="添加"
                @click="addPerson"
              >
                <i class="el-icon-plus" />
              </button>
              <button
                type="button"
                class="push-person__btn push-person__btn--del"
                title="删除"
                :disabled="form.pushPersons.length === 1"
                @click="removePerson(index)"
              >
                <i class="el-icon-minus" />
              </button>
            </div>
          </div>
          <div class="tag-summary">
            <i class="el-icon-info" />
            与推送范围相互独立，可补充精准接收人；留空行提交时自动忽略
          </div>
        </el-form-item>

        <el-form-item prop="sendTime" class="form-field">
          <div slot="label" class="form-field__label">发送时间 <em class="req">*</em></div>
          <el-date-picker
            v-model="form.sendTime"
            type="datetime"
            placeholder="选择发送时间"
            value-format="yyyy-MM-dd HH:mm:ss"
            format="yyyy-MM-dd HH:mm"
            class="field-control"
            :clearable="false"
            :picker-options="sendTimePickerOptions"
            @change="handleSendTimeChange"
          />
        </el-form-item>

        <!-- 发送渠道暂不使用，功能隐藏，默认全渠道发送 -->
        <!-- el-form-item prop="sendChannel" class="form-field" -->
        <!-- 已隐藏：发送渠道选择 -->
        <!-- /el-form-item -->
      </div>
    </div>

    <div class="form-section form-section--remark">
      <div class="form-section__head">
        <span class="form-section__title">备注</span>
        <span class="form-section__en">REMARK</span>
      </div>
      <div class="form-section__body">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          placeholder="选填，可补充说明"
          maxlength="200"
          resize="none"
        />
      </div>
    </div>
    </div>

    <div class="form-footer">
      <el-button class="form-footer__cancel" @click="handleCancel">取 消</el-button>
      <el-button class="form-footer__submit" :loading="submitting" @click="handleSubmit">
        <i class="el-icon-position" />
        {{ submitting ? "发布中..." : "提交发布" }}
      </el-button>
    </div>
  </el-form>
</template>

<script>
export default {
  name: "NoticeAnnouncementForm",
  props: {
    editData: {
      type: Object,
      default: () => ({}),
    },
    submitting: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      scopeOptions: [
        { label: "全量（所有用户）", value: "all" },
        { label: "全量陪陪", value: "all_waiter" },
        { label: "个人陪陪", value: "personal_waiter" },
        { label: "公会陪陪", value: "union_waiter" },
        { label: "商户公会陪陪", value: "merchant_union_waiter" },
        { label: "老板", value: "boss" },
        { label: "个人账号", value: "personal_account" },
      ],
      channelOptions: [
        { label: "全渠道", value: "all" },
        { label: "安卓", value: "android" },
        { label: "iOS", value: "ios" },
        { label: "商户小程序", value: "merchantMiniApp" },
        { label: "中心场小程序", value: "centerMiniApp" },
      ],
      noticeTypeOptions: [
        { label: "通知", value: "1" },
        { label: "公告", value: "2" },
        { label: "活动", value: "3" },
      ],
      form: {
        id: undefined,
        noticeType: "",
        title: "",
        content: "",
        pushScope: [],
        pushPersons: [{ userId: "" }],
        sendTime: "",
        sendChannel: ["all"],
        remark: "",
      },
      rules: {
        noticeType: [{ required: true, message: "请选择公告类型", trigger: "change" }],
        title: [{ required: true, message: "请输入公告标题", trigger: "blur" }],
        content: [{ required: true, message: "请输入公告内容", trigger: "blur" }],
        pushScope: [
          {
            required: true,
            validator: (rule, value, callback) => {
              if (!Array.isArray(value) || value.length === 0) {
                callback(new Error("请至少选择一个推送范围"));
              } else {
                callback();
              }
            },
            trigger: "change",
          },
        ],
        sendTime: [{ required: true, message: "请选择发送时间", trigger: "change" }],
        pushPersons: [
          {
            validator: (rule, value, callback) => {
              if (!this.form.pushScope.includes("personal_account")) {
                callback();
                return;
              }
              const ids = this.normalizePushUserIds();
              if (ids.length === 0) {
                callback(new Error("请至少填写一个有效推送人用户ID"));
              } else {
                callback();
              }
            },
            trigger: "change",
          },
        ],
      },
    };
  },
  computed: {
    sendTimePickerOptions() {
      const now = new Date();
      const startToday = new Date(now);
      startToday.setHours(0, 0, 0, 0);
      let selectableRange = [];
      const value = this.form.sendTime;
      if (value) {
        const chosen = new Date(value);
        const isToday =
          chosen.getFullYear() === now.getFullYear() &&
          chosen.getMonth() === now.getMonth() &&
          chosen.getDate() === now.getDate();
        if (isToday) {
          const hh = String(now.getHours()).padStart(2, "0");
          const mm = String(now.getMinutes()).padStart(2, "0");
          const ss = String(now.getSeconds()).padStart(2, "0");
          selectableRange = [`${hh}:${mm}:${ss} - 23:59:59`];
        }
      }
      return {
        disabledDate(time) {
          return time.getTime() < startToday.getTime();
        },
        selectableRange,
      };
    },
    showPushPerson() {
      return this.form.pushScope.includes("personal_account");
    },
    selectedScopeText() {
      return this.scopeOptions
        .filter((item) => this.form.pushScope.includes(item.value))
        .map((item) => item.label)
        .join("、");
    },
    selectedChannelText() {
      return this.channelOptions
        .filter((item) => this.form.sendChannel.includes(item.value))
        .map((item) => item.label)
        .join("、");
    },
  },
  watch: {
    editData: {
      handler(val) {
        if (val && Object.keys(val).length > 0 && val.id) {
          this.fillFormData(val);
        } else {
          this.resetForm();
        }
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    handleSendTimeChange(value) {
      if (!value) {
        this.form.sendTime = "";
        return;
      }
      const picked = new Date(value).getTime();
      if (picked <= Date.now()) {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        this.form.sendTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
    },
    toggleScope(value) {
      const idx = this.form.pushScope.indexOf(value);
      if (idx >= 0) {
        this.form.pushScope.splice(idx, 1);
      } else {
        this.form.pushScope.push(value);
      }
    },
    toggleChannel(value) {
      const idx = this.form.sendChannel.indexOf(value);
      if (idx >= 0) {
        this.form.sendChannel.splice(idx, 1);
      } else {
        this.form.sendChannel.push(value);
      }
    },
    addPerson() {
      this.form.pushPersons.push({ userId: "" });
    },
    removePerson(index) {
      if (this.form.pushPersons.length > 1) {
        this.form.pushPersons.splice(index, 1);
      }
    },
    normalizePushUserIds() {
      const list = Array.isArray(this.form.pushPersons) ? this.form.pushPersons : [];
      const ids = [];
      list.forEach((p) => {
        const raw = p && p.userId !== undefined && p.userId !== null ? String(p.userId).trim() : "";
        if (raw !== "") {
          const num = Number(raw);
          if (!Number.isNaN(num) && num > 0) ids.push(num);
        }
      });
      return ids;
    },
    handleCancel() {
      this.$emit("cancel");
    },
    handleSubmit() {
      this.$refs.formRef.validate((valid) => {
        if (!valid) {
          return false;
        }
        const hasPersonalAccount = this.form.pushScope.includes("personal_account");
        const pushUserIds = hasPersonalAccount ? this.normalizePushUserIds() : [];
        const pushScopes = this.form.pushScope.filter((s) => s !== "personal_account");
        const payload = {
          id: this.form.id,
          noticeType: this.form.noticeType,
          title: this.form.title,
          content: this.form.content,
          pushScopes,
          pushUserIds,
          sendTime: this.form.sendTime,
          channels: this.form.sendChannel.slice(),
          remark: this.form.remark,
        };
        this.$emit("submit", payload);
      });
    },
    resetForm() {
      this.form = {
        id: undefined,
        noticeType: "",
        title: "",
        content: "",
        pushScope: [],
        pushPersons: [{ userId: "" }],
        sendTime: "",
        sendChannel: ["all"],
        remark: "",
      };
      this.$nextTick(() => {
        if (this.$refs.formRef) {
          this.$refs.formRef.clearValidate();
        }
      });
    },
    fillFormData(data) {
      const pushScopes = Array.isArray(data.pushScopes)
        ? [...data.pushScopes]
        : data.pushScopes
          ? String(data.pushScopes).split(",").filter(Boolean)
          : [];
      const channels = Array.isArray(data.channels)
        ? [...data.channels]
        : data.channels
          ? String(data.channels).split(",").filter(Boolean)
          : [];
      const pushPersons = Array.isArray(data.pushUserIds) && data.pushUserIds.length
        ? data.pushUserIds.map((uid) => ({ userId: String(uid).trim() }))
        : [{ userId: "" }];

      const hasPushUsers = pushPersons.some((p) => p.userId !== "");
      if (hasPushUsers && !pushScopes.includes("personal_account")) {
        pushScopes.push("personal_account");
      }

      this.form = {
        id: data.id,
        noticeType: String(data.noticeType || ""),
        title: data.title || "",
        content: data.content || "",
        pushScope: pushScopes.length ? pushScopes : [],
        pushPersons,
        sendTime: data.sendTime || "",
        sendChannel: channels.length ? channels : ["all"],
        remark: data.remark || "",
      };
      this.$forceUpdate();
    },
  },
};
</script>

<style scoped>
.announcement-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 4px 0 0;
}

.form-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 20px 12px;
}

.form-body::-webkit-scrollbar {
  width: 6px;
}

.form-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #c9a8ff, #a05fff);
  border-radius: 6px;
}

.form-body::-webkit-scrollbar-track {
  background: #f6f4fc;
  border-radius: 6px;
}

/* ===== 分区块 ===== */
.form-section {
  margin-bottom: 20px;
  padding: 18px 20px 4px;
  border: 1px solid #ece5fb;
  border-radius: 16px;
  background: linear-gradient(180deg, #fff 0%, #fcfaff 100%);
  box-shadow: 0 10px 24px rgba(144, 71, 248, 0.06);
}

.form-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #e9e2fa;
}

.form-section__title {
  position: relative;
  padding-left: 14px;
  font-size: 15px;
  font-weight: 700;
  color: #34265b;
  letter-spacing: 0.5px;
}

.form-section__title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 2px;
  width: 5px;
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(180deg, #a15cff 0%, #6f3dff 100%);
}

.form-section__en {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #c7b8f0;
}

/* ===== 字段 ===== */
.form-field {
  margin-bottom: 2px;
}

.form-field--plain {
  margin-bottom: 18px;
}

.form-field__label {
  font-size: 13px;
  font-weight: 600;
  color: #42356b;
}

::v-deep .announcement-form .el-form-item {
  margin-bottom: 16px;
}

::v-deep .announcement-form .el-form-item__label {
  padding: 0;
  line-height: 1.4;
  color: inherit;
  height: auto;
  margin-bottom: 8px;
}

::v-deep .announcement-form .el-form-item.is-error .el-form-item__label {
  color: #f56c6c;
}

::v-deep .announcement-form .el-form-item__content {
  line-height: normal;
}

.req {
  color: #ff5d5d;
  font-style: normal;
  margin-left: 2px;
}

/* ===== 输入控件 ===== */
.field-control {
  width: 100%;
}

.field-count {
  position: relative;
}

.field-count__num {
  position: absolute;
  right: 12px;
  bottom: 8px;
  z-index: 1;
  font-size: 12px;
  color: #a79bd0;
  pointer-events: none;
}

.field-count__num i {
  font-style: normal;
  color: #ddd4f5;
}

.field-count__num--area {
  bottom: 12px;
}

.field-count ::v-deep .el-textarea__inner {
  padding-bottom: 28px;
}

::v-deep .announcement-form .el-input__inner,
::v-deep .announcement-form .el-textarea__inner {
  border-radius: 10px;
  border-color: #e3daF5;
  background: #fdfcff;
  font-size: 13px;
  transition: all 0.2s ease;
}

::v-deep .announcement-form .el-input__inner:hover,
::v-deep .announcement-form .el-textarea__inner:hover {
  border-color: #a678ff;
}

::v-deep .announcement-form .el-input__inner:focus,
::v-deep .announcement-form .el-textarea__inner:focus {
  border-color: #9047f8;
  box-shadow: 0 0 0 3px rgba(144, 71, 248, 0.12);
  background: #fff;
}

/* ===== 标签 chip ===== */
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-chip {
  position: relative;
  min-width: 92px;
  height: 36px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid #dfd7f4;
  background: #fff;
  color: #5a4b86;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.22s ease;
}

.tag-chip--sm {
  min-width: 76px;
  height: 32px;
  font-size: 12px;
}

.tag-chip:hover {
  border-color: #a678ff;
  color: #9047f8;
  box-shadow: 0 6px 14px rgba(144, 71, 248, 0.12);
  transform: translateY(-1px);
}

.tag-chip.is-active {
  border-color: transparent;
  background: linear-gradient(135deg, #a15cff 0%, #6f3dff 100%);
  color: #fff;
  box-shadow: 0 10px 18px rgba(144, 71, 248, 0.28);
}

.tag-chip__check {
  margin-right: 2px;
  font-size: 12px;
  font-weight: 700;
}

.tag-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f6f2ff;
  font-size: 12px;
  color: #7d6ca8;
  word-break: break-all;
}

.tag-summary i {
  color: #a678ff;
}

.tag-summary__empty {
  color: #c3b6e4;
}

/* ===== 推送人 ===== */
.push-person__row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.push-person__index {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #f0e6ff, #e6d6ff);
  color: #9047f8;
  font-size: 12px;
  font-weight: 700;
}

.push-person__input {
  flex: 1;
}

.push-person__btn {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.push-person__btn--add {
  background: linear-gradient(135deg, #a15cff, #6f3dff);
  box-shadow: 0 6px 12px rgba(144, 71, 248, 0.25);
}

.push-person__btn--add:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(144, 71, 248, 0.35);
}

.push-person__btn--del {
  background: linear-gradient(135deg, #ff8f8f, #ff5d6c);
  box-shadow: 0 6px 12px rgba(255, 93, 108, 0.2);
}

.push-person__btn--del:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(255, 93, 108, 0.3);
}

.push-person__btn--del:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ===== 底部按钮 ===== */
.form-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 8px 0 4px;
}

.form-footer__cancel,
.form-footer__submit {
  width: 140px;
  height: 42px;
  border-radius: 999px;
  font-size: 14px;
  letter-spacing: 1px;
}

.form-footer__cancel {
  border-color: #e0d9f4;
  background: #fff;
  color: #5a4b86;
}

.form-footer__cancel:hover {
  border-color: #a678ff;
  color: #9047f8;
  background: #faf6ff;
}

.form-footer__submit {
  border: none;
  background: linear-gradient(135deg, #a15cff 0%, #6f3dff 100%);
  color: #fff;
  box-shadow: 0 12px 24px rgba(144, 71, 248, 0.3);
}

.form-footer__submit:hover {
  background: linear-gradient(135deg, #9348f0 0%, #5f2ce8 100%);
  box-shadow: 0 14px 28px rgba(144, 71, 248, 0.38);
  transform: translateY(-1px);
}

.form-footer__submit.is-loading {
  background: linear-gradient(135deg, #b99ae8, #9c7ce0);
}
</style>