<!--
  公告配置
  - GET  /business/notice/detail（不传参）
  - POST /business/notice/edit
-->
<template>
  <div class="notice-page" v-loading="pageLoading">
    <div class="notice-stage">
      <!-- 氛围顶栏 -->
      <header class="stage-hero">
        <div class="stage-hero__glow" />
        <div class="stage-hero__grid" />
        <div class="stage-hero__content">
          <div class="stage-hero__copy">
            <div class="stage-hero__eyebrow">
              <span class="dot" />
              HOME NOTICE STUDIO
            </div>
            <h1>公告配置</h1>
            <p>把首页滚动摘要、投放范围和详情正文，做成一条可发布的公告体验</p>
          </div>
          <div class="stage-hero__actions">
            <template v-if="!editing">
              <button type="button" class="btn-glow" @click="startEdit">
                <i class="el-icon-edit-outline" />
                编辑公告
              </button>
            </template>
            <template v-else>
              <button type="button" class="btn-ghost" :disabled="submitting" @click="cancelEdit">
                取消
              </button>
              <button type="button" class="btn-glow" :disabled="submitting" @click="handleSubmit">
                <i :class="submitting ? 'el-icon-loading' : 'el-icon-check'" />
                {{ submitting ? "保存中" : "发布保存" }}
              </button>
            </template>
          </div>
        </div>
      </header>

      <!-- 展示态：像产品预览 -->
      <div v-if="!editing" class="stage-body">
        <section class="preview-marquee">
          <div class="preview-marquee__badge">滚动栏</div>
          <div class="preview-marquee__track">
            <i class="el-icon-message-solid" />
            <div class="preview-marquee__text">
              {{ detail.title || "暂未配置滚动摘要，编辑后会出现在这里" }}
            </div>
          </div>
          <div class="preview-marquee__hint">首页顶部横向滚动预览</div>
        </section>

        <section class="scope-band">
          <div class="scope-item">
            <div class="scope-item__icon is-people"><i class="el-icon-user" /></div>
            <div class="scope-item__body">
              <div class="scope-item__label">适用人群</div>
              <div class="scope-item__tags">
                <template v-if="displayLabelNames.length">
                  <span v-for="name in displayLabelNames" :key="name">{{ name }}</span>
                </template>
                <em v-else>全量用户</em>
              </div>
            </div>
          </div>
          <div class="scope-divider" />
          <div class="scope-item">
            <div class="scope-item__icon is-port"><i class="el-icon-mobile-phone" /></div>
            <div class="scope-item__body">
              <div class="scope-item__label">展示端口</div>
              <div class="scope-item__tags">
                <template v-if="displayClientNames.length">
                  <span v-for="name in displayClientNames" :key="name">{{ name }}</span>
                </template>
                <em v-else>全端口</em>
              </div>
            </div>
          </div>
        </section>

        <section class="doc-panel">
          <div class="doc-panel__head">
            <div>
              <h2>公告正文</h2>
              <p>用户点击滚动栏后看到的详情内容</p>
            </div>
            <div class="doc-panel__time">
              <div>
                <span>生效</span>
                <strong>{{ detail.startTime || "立即" }}</strong>
              </div>
              <div>
                <span>失效</span>
                <strong>{{ detail.endTime || "长期" }}</strong>
              </div>
            </div>
          </div>
          <div v-if="detail.content" class="doc-panel__html" v-html="detail.content" />
          <div v-else class="doc-panel__empty">
            <div class="doc-panel__empty-orb" />
            <p>正文还是空白，点右上角开始编辑</p>
          </div>
        </section>
      </div>

      <!-- 编辑态：同舞台，表单分区 -->
      <el-form v-else ref="formRef" :model="form" :rules="rules" size="small" label-position="top" class="stage-form">
        <section class="form-block form-block--accent">
          <div class="form-block__head">
            <span>01</span>
            <div>
              <h3>滚动栏摘要</h3>
              <p>≤ 50 字，首页横向滚动展示</p>
            </div>
          </div>
          <el-form-item prop="title">
            <el-input v-model="form.title" maxlength="50" show-word-limit placeholder="例如：国庆期间下单享双倍积分…" />
          </el-form-item>
        </section>

        <section class="form-block">
          <div class="form-block__head">
            <span>02</span>
            <div>
              <h3>投放范围</h3>
              <p>人群与端口均可多选；不选则默认全量</p>
            </div>
          </div>
          <div class="form-block__grid">
            <el-form-item label="适用人群">
              <el-select v-model="form.userLabelIds" multiple filterable clearable collapse-tags placeholder="不选 = 全量展示"
                :loading="labelLoading" style="width: 100%">
                <el-option v-for="item in labelOptions" :key="item.id" :label="item.labelName"
                  :value="String(item.id)" />
              </el-select>
            </el-form-item>
            <el-form-item label="展示端口">
              <div class="port-pills">
                <label v-for="item in clientOptions" :key="item.value" class="port-pill"
                  :class="{ 'is-on': form.clientKeys.includes(item.value) }">
                  <input type="checkbox" :value="item.value" :checked="form.clientKeys.includes(item.value)"
                    @change="toggleClient(item.value)" />
                  <i class="el-icon-check" />
                  {{ item.label }}
                </label>
              </div>
            </el-form-item>
          </div>
        </section>

        <section class="form-block">
          <div class="form-block__head">
            <span>03</span>
            <div>
              <h3>公告正文</h3>
              <p>详情页富文本，支持图片与排版</p>
            </div>
          </div>
          <el-form-item prop="content">
            <div class="editor-wrap">
              <quill-editor ref="noticeEditor" v-model="form.content" :options="editorOptions" />
            </div>
          </el-form-item>
        </section>

        <section class="form-block">
          <div class="form-block__head">
            <span>04</span>
            <div>
              <h3>生效周期</h3>
              <p>生效空=立即，失效空=长期</p>
            </div>
          </div>
          <div class="form-block__grid">
            <el-form-item label="生效时间">
              <el-date-picker v-model="form.startTime" type="datetime" value-format="yyyy-MM-dd HH:mm"
                format="yyyy/MM/dd HH:mm" placeholder="立即生效" style="width: 100%" />
            </el-form-item>
            <el-form-item label="失效时间">
              <el-date-picker v-model="form.endTime" type="datetime" value-format="yyyy-MM-dd HH:mm"
                format="yyyy/MM/dd HH:mm" placeholder="长期有效" style="width: 100%" />
            </el-form-item>
          </div>
        </section>
      </el-form>
    </div>
  </div>
</template>

<script>
import { quillEditor } from "vue-quill-editor";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "quill/dist/quill.bubble.css";
import { fileUpload } from "@/api/user";
import { queryUserLabel } from "@/api/label";
import { getFrontendNoticeDetail, editFrontendNotice } from "@/api/notice";

const CLIENT_OPTIONS = [
  { label: "安卓", value: "android" },
  { label: "iOS", value: "ios" },
  { label: "淘宝小程序", value: "tb_xcx" },
];

function createEmptyForm() {
  return {
    id: null,
    title: "",
    userLabelIds: [],
    clientKeys: [],
    startTime: "",
    endTime: "",
    content: "",
  };
}

export default {
  name: "NoticeConfig",
  components: {
    quillEditor,
  },
  data() {
    const validateTitle = (rule, value, callback) => {
      const text = String(value || "").trim();
      if (!text) {
        callback(new Error("请填写滚动栏摘要"));
        return;
      }
      if (text.length > 50) {
        callback(new Error("滚动栏摘要不能超过50字"));
        return;
      }
      callback();
    };
    return {
      pageLoading: false,
      submitting: false,
      editing: false,
      labelLoading: false,
      labelOptions: [],
      clientOptions: CLIENT_OPTIONS,
      detail: createEmptyForm(),
      form: createEmptyForm(),
      rules: {
        title: [{ required: true, validator: validateTitle, trigger: "blur" }],
      },
      editorOptions: {
        theme: "snow",
        placeholder: "写下活动说明、规则与温馨提示…",
        modules: {
          toolbar: {
            container: [
              ["bold", "italic", "underline"],
              [{ header: 1 }, { header: 2 }],
              [{ list: "ordered" }, { list: "bullet" }],
              [{ color: [] }, { background: [] }],
              ["link", "image"],
              ["clean"],
            ],
            handlers: {},
          },
        },
      },
    };
  },
  computed: {
    labelNameMap() {
      const map = {};
      (this.labelOptions || []).forEach((item) => {
        map[String(item.id)] = item.labelName || String(item.id);
      });
      return map;
    },
    clientNameMap() {
      const map = {};
      CLIENT_OPTIONS.forEach((item) => {
        map[item.value] = item.label;
      });
      return map;
    },
    displayLabelNames() {
      return (this.detail.userLabelIds || [])
        .map((id) => this.labelNameMap[String(id)] || String(id))
        .filter(Boolean);
    },
    displayClientNames() {
      return (this.detail.clientKeys || [])
        .map((key) => this.clientNameMap[key] || key)
        .filter(Boolean);
    },
  },
  created() {
    this.editorOptions.modules.toolbar.handlers.image = this.handleEditorImageSelect;
    this.initPage();
  },
  methods: {
    async initPage() {
      this.pageLoading = true;
      try {
        await Promise.all([this.fetchLabelOptions(), this.fetchDetail()]);
      } finally {
        this.pageLoading = false;
      }
    },
    splitCsv(value) {
      if (Array.isArray(value)) {
        return value
          .map((item) => String(item).trim())
          .filter((item) => item !== "");
      }
      if (value === null || value === undefined || value === "") return [];
      return String(value)
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    },
    joinCsv(list) {
      if (!Array.isArray(list) || !list.length) return "";
      return list.map((item) => String(item).trim()).filter(Boolean).join(",");
    },
    // 后端可能带秒，提交/展示统一到分钟：2026-08-22 00:00
    formatTimeToMinute(value) {
      if (value === null || value === undefined || value === "") return "";
      const text = String(value).trim();
      const matched = text.match(
        /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?$/
      );
      if (matched) return `${matched[1]} ${matched[2]}`;
      return text;
    },
    normalizeDetail(data = {}) {
      return {
        id: data.id || null,
        title: data.title || "",
        userLabelIds: this.splitCsv(data.userLabelId),
        clientKeys: this.splitCsv(data.clientKey),
        startTime: this.formatTimeToMinute(data.startTime),
        endTime: this.formatTimeToMinute(data.endTime),
        content: data.content || "",
      };
    },
    async fetchLabelOptions() {
      this.labelLoading = true;
      try {
        const res = await queryUserLabel({});
        if (res && res.success) {
          this.labelOptions = Array.isArray(res.data) ? res.data : [];
        } else {
          this.labelOptions = [];
        }
      } catch (error) {
        this.labelOptions = [];
      } finally {
        this.labelLoading = false;
      }
    },
    async fetchDetail() {
      try {
        const res = await getFrontendNoticeDetail();
        if (res && res.success) {
          this.detail = this.normalizeDetail(res.data || {});
          return;
        }
        this.$message.error((res && res.errorMessage) || "获取公告详情失败");
      } catch (error) {
        // 拦截器已提示
      }
    },
    startEdit() {
      this.form = {
        ...this.detail,
        userLabelIds: [...(this.detail.userLabelIds || [])],
        clientKeys: [...(this.detail.clientKeys || [])],
      };
      this.editing = true;
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },
    cancelEdit() {
      this.editing = false;
      this.form = createEmptyForm();
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },
    toggleClient(value) {
      const list = [...(this.form.clientKeys || [])];
      const index = list.indexOf(value);
      if (index >= 0) list.splice(index, 1);
      else list.push(value);
      this.form.clientKeys = list;
    },
    getQuillInstance() {
      return (this.$refs.noticeEditor && this.$refs.noticeEditor.quill) || null;
    },
    handleEditorImageSelect() {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fileUpload(formData);
          const uploadUrl =
            (res && res.data && (res.data.url || res.data.ossUrl || res.data)) ||
            "";
          if (!uploadUrl) {
            this.$message.error("图片上传失败");
            return;
          }
          const quill = this.getQuillInstance();
          if (!quill) return;
          const range = quill.getSelection(true) || { index: quill.getLength() };
          quill.insertEmbed(range.index, "image", uploadUrl);
          quill.setSelection(range.index + 1, 0);
        } catch (error) {
          this.$message.error("图片上传失败");
        }
      };
    },
    handleSubmit() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return;

        if (
          this.form.startTime &&
          this.form.endTime &&
          new Date(this.form.endTime).getTime() < new Date(this.form.startTime).getTime()
        ) {
          this.$message.warning("失效时间不能早于生效时间");
          return;
        }

        this.submitting = true;
        try {
          const payload = {
            id: this.form.id || undefined,
            title: String(this.form.title || "").trim(),
            userLabelId: this.joinCsv(this.form.userLabelIds),
            clientKey: this.joinCsv(this.form.clientKeys),
            startTime: this.formatTimeToMinute(this.form.startTime),
            endTime: this.formatTimeToMinute(this.form.endTime),
            content: this.form.content || "",
          };
          const res = await editFrontendNotice(payload);
          if (res && res.success) {
            this.$message.success("公告保存成功");
            this.editing = false;
            await this.fetchDetail();
            return;
          }
          if (!(res && res.errorMessage)) {
            this.$message.error("公告保存失败");
          }
        } catch (error) {
          // 拦截器已提示
        } finally {
          this.submitting = false;
        }
      });
    },
  },
};
</script>

<style scoped lang="scss">
.notice-page {
  /* AppMain: height 100vh + padding-top 80 + overflow hidden，本页自行纵向滚动 */
  height: calc(100vh - 80px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 12% 0%, rgba(56, 189, 248, 0.08), transparent 24%),
    radial-gradient(circle at 88% 8%, rgba(124, 58, 237, 0.1), transparent 26%),
    linear-gradient(180deg, #f3f5fb 0%, #eef1f7 100%);
}

.notice-stage {
  width: 100%;
  max-width: none;
  margin: 0;
}

.stage-hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 14px;
  padding: 22px 22px 20px;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(135deg, #171a29 0%, #2a2150 48%, #1d2a4a 100%);
  box-shadow: 0 18px 40px rgba(23, 26, 41, 0.22);
}

.stage-hero__glow {
  position: absolute;
  right: -40px;
  top: -60px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.45), transparent 68%);
  pointer-events: none;
}

.stage-hero__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(90deg, transparent, #000 30%, #000 80%, transparent);
  pointer-events: none;
}

.stage-hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.stage-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.62);

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.18);
    animation: pulse 1.8s ease-in-out infinite;
  }
}

.stage-hero__copy {
  h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.15;
    font-weight: 760;
    letter-spacing: -0.03em;
  }

  p {
    margin: 8px 0 0;
    max-width: 420px;
    font-size: 13px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.68);
  }
}

.stage-hero__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-glow,
.btn-ghost {
  height: 38px;
  min-width: 96px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.18s ease, opacity 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }
}

.btn-glow {
  color: #1b1533;
  background: linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%);
  box-shadow: 0 10px 24px rgba(167, 139, 250, 0.28);
}

.btn-ghost {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.stage-body,
.stage-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: rise 0.35s ease;
}

.preview-marquee {
  padding: 14px 16px 12px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.1);
  box-shadow: 0 12px 28px rgba(49, 56, 84, 0.06);
}

.preview-marquee__badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  margin-bottom: 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #6d28d9;
  background: rgba(109, 40, 217, 0.1);
}

.preview-marquee__track {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  padding: 12px 14px;
  border-radius: 14px;
  background:
    linear-gradient(90deg, rgba(109, 40, 217, 0.08), rgba(14, 165, 233, 0.08)),
    #f8f7ff;
  border: 1px solid rgba(109, 40, 217, 0.12);

  >i {
    color: #7c3aed;
    font-size: 18px;
  }
}

.preview-marquee__text {
  font-size: 15px;
  font-weight: 700;
  color: #1f2437;
  line-height: 1.45;
  word-break: break-word;
}

.preview-marquee__hint {
  margin-top: 8px;
  font-size: 11px;
  color: #94a0b8;
}

.scope-band {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
  padding: 4px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.08);
  box-shadow: 0 10px 24px rgba(49, 56, 84, 0.05);
}

.scope-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
}

.scope-item__icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;

  &.is-people {
    color: #7c3aed;
    background: rgba(124, 58, 237, 0.1);
  }

  &.is-port {
    color: #0284c7;
    background: rgba(2, 132, 199, 0.1);
  }
}

.scope-item__label {
  margin-bottom: 6px;
  font-size: 12px;
  color: #8b95ab;
}

.scope-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 650;
    color: #4338ca;
    background: #eef2ff;
  }

  em {
    font-style: normal;
    font-size: 13px;
    font-weight: 650;
    color: #334155;
  }
}

.scope-divider {
  width: 1px;
  margin: 14px 0;
  background: #eef0f5;
}

.doc-panel {
  padding: 16px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.08);
  box-shadow: 0 12px 28px rgba(49, 56, 84, 0.05);
}

.doc-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    margin: 0;
    font-size: 16px;
    color: #1f2437;
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: #8b95ab;
  }
}

.doc-panel__time {
  display: flex;
  gap: 14px;

  >div {
    min-width: 108px;
    padding: 8px 10px;
    border-radius: 12px;
    background: #f8fafc;
  }

  span {
    display: block;
    font-size: 11px;
    color: #94a3b8;
  }

  strong {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    color: #334155;
    word-break: break-all;
  }
}

.doc-panel__html {
  max-height: 280px;
  overflow: auto;
  padding: 14px 16px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, #fcfcff 0%, #f7f8fc 100%);
  border: 1px solid #e8ebf4;
  font-size: 13px;
  line-height: 1.7;
  color: #334155;
  word-break: break-word;

  ::v-deep img {
    max-width: 100%;
  }
}

.doc-panel__empty {
  position: relative;
  overflow: hidden;
  min-height: 140px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px dashed #d5dbe8;

  p {
    position: relative;
    z-index: 1;
    margin: 0;
    color: #94a3b8;
    font-size: 13px;
  }
}

.doc-panel__empty-orb {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.12), transparent 70%);
}

.form-block {
  padding: 16px 16px 6px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(99, 102, 241, 0.08);
  box-shadow: 0 10px 24px rgba(49, 56, 84, 0.04);
  backdrop-filter: blur(8px);

  &--accent {
    background:
      linear-gradient(135deg, rgba(124, 58, 237, 0.06), rgba(14, 165, 233, 0.05)),
      rgba(255, 255, 255, 0.94);
  }
}

.form-block__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;

  >span {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 800;
    color: #6d28d9;
    background: rgba(109, 40, 217, 0.1);
  }

  h3 {
    margin: 0;
    font-size: 15px;
    color: #1f2437;
  }

  p {
    margin: 3px 0 0;
    font-size: 12px;
    color: #8b95ab;
  }
}

.form-block__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stage-form {
  ::v-deep .el-form-item {
    margin-bottom: 12px;
  }

  ::v-deep .el-form-item__label {
    padding-bottom: 4px;
    line-height: 1.2;
    color: #64748b;
  }

  ::v-deep .el-input__inner,
  ::v-deep .el-range-editor.el-input__inner {
    border-radius: 10px;
  }
}

.port-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.port-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px 0 10px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  user-select: none;
  transition: all 0.18s ease;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  >i {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 10px;
    color: transparent;
    background: #e2e8f0;
  }

  &.is-on {
    color: #6d28d9;
    border-color: rgba(109, 40, 217, 0.35);
    background: rgba(109, 40, 217, 0.08);

    >i {
      color: #fff;
      background: #7c3aed;
    }
  }
}

.editor-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;

  ::v-deep .ql-toolbar.ql-snow {
    border: none;
    border-bottom: 1px solid #eef2f7;
    background: #f8fafc;
    padding: 8px 10px;
  }

  ::v-deep .ql-container.ql-snow {
    border: none;
    min-height: 170px;
  }

  ::v-deep .ql-editor {
    min-height: 170px;
    max-height: 280px;
    overflow-y: auto;
    font-size: 13px;
  }
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(0.85);
    opacity: 0.7;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 800px) {

  .stage-hero__content,
  .doc-panel__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .scope-band,
  .form-block__grid {
    grid-template-columns: 1fr;
  }

  .scope-divider {
    width: auto;
    height: 1px;
    margin: 0 14px;
  }
}
</style>
