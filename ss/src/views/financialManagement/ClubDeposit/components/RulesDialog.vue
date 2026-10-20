<!--
  俱乐部保证金规则弹窗
  ---------------------------------------------------------------------------
  仅展示 overview.depositClubConfig.configDesc（富文本 HTML）
-->
<template>
  <el-dialog
    title="保证金规则"
    :visible.sync="dialogVisible"
    width="640px"
    append-to-body
    :close-on-click-modal="false"
    custom-class="club-deposit-rules-dialog"
    @close="handleClose"
  >
    <div class="rules-dialog">
      <div
        v-if="hasRichDesc"
        class="rules-dialog__desc rich-display"
        v-html="configDesc"
      />
      <div v-else class="rules-dialog__empty">暂未配置规则说明</div>
    </div>
    <div slot="footer">
      <el-button @click="dialogVisible = false">关闭</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: "ClubDepositRulesDialog",
  props: {
    visible: { type: Boolean, default: false },
    /** 后台富文本规则说明（HTML 字符串） */
    configDesc: { type: String, default: "" },
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
    /** 富文本是否有有效内容（过滤空标签 / 纯空白） */
    hasRichDesc() {
      const html = String(this.configDesc || "");
      if (!html.trim()) return false;
      const text = html
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, "")
        .trim();
      return Boolean(text);
    },
  },
  methods: {
    handleClose() {
      this.$emit("update:visible", false);
    },
  },
};
</script>

<style scoped lang="scss">
.rules-dialog__desc {
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
  word-break: break-word;
}

.rich-display {
  max-height: 480px;
  overflow: auto;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fafbff;
  border: 1px solid #eef0f5;
}

.rules-dialog__empty {
  padding: 32px 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

::v-deep .rich-display p {
  margin: 0 0 10px;
}

::v-deep .rich-display p:last-child {
  margin-bottom: 0;
}

::v-deep .rich-display ul,
::v-deep .rich-display ol {
  padding-left: 20px;
  margin: 0 0 10px;
}

::v-deep .rich-display li {
  margin-bottom: 4px;
}

::v-deep .rich-display li:last-child {
  margin-bottom: 0;
}
</style>
