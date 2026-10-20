<template>
  <div class="invite-code-badge">
    <span class="invite-code-label">邀请陪陪码：</span>
    <span class="invite-code-value">{{ inviteCode || '------' }}</span>
    <el-tooltip content="复制邀请码" placement="bottom" :open-delay="300">
      <span class="invite-code-action" @click="handleCopy">
        <i class="el-icon-document-copy"></i>
      </span>
    </el-tooltip>
    <el-tooltip content="刷新邀请码" placement="bottom" :open-delay="300">
      <span class="invite-code-action" @click="handleRefresh">
        <i class="el-icon-refresh"></i>
      </span>
    </el-tooltip>
  </div>
</template>

<script>
import { refreshInviteCode } from "@/api/inviteCode";
import { mapGetters } from "vuex";

export default {
  name: "InviteCodeBadge",
  computed: {
    ...mapGetters(["userData"]),
    inviteCode() {
      return this.userData?.inviteCode || "";
    },
  },
  methods: {
    async handleCopy() {
      if (!this.inviteCode) {
        this.$message.warning("暂无邀请码");
        return;
      }
      try {
        await navigator.clipboard.writeText(this.inviteCode);
        this.$message.success(`已复制邀请码：${this.inviteCode}`);
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = this.inviteCode;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          this.$message.success(`已复制邀请码：${this.inviteCode}`);
        } catch {
          this.$message.error("复制失败，请手动复制");
        }
        document.body.removeChild(textArea);
      }
    },
    handleRefresh() {
      this.$confirm(
        "刷新后旧邀请码将失效，已发出未使用的邀请将作废，是否继续？",
        "刷新邀请码",
        {
          confirmButtonText: "确定刷新",
          cancelButtonText: "取消",
          type: "warning",
        }
      ).then(async () => {
        try {
          const res = await refreshInviteCode();
          if (res && res.data) {
            this.$store.commit("user/SET_USERDATA", {
              ...this.userData,
              inviteCode: res.data.inviteCode,
            });
          }
          this.$message.success("邀请码已刷新");
        } catch (error) {
          console.error("刷新邀请码失败:", error);
        }
      }).catch(() => {});
    },
  },
};
</script>

<style lang="scss" scoped>
.invite-code-badge {
  display: inline-flex;
  align-items: center;
  background: #eeedfe;
  border: 1px solid #c4c0f7;
  border-radius: 18px;
  padding: 6px 12px;
  margin-right: 20px;
  user-select: none;
  flex-shrink: 0;
}
.invite-code-badge span {
  line-height: normal!important;
}
.invite-code-label {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
}

.invite-code-value {
  font-size: 14px;
  font-weight: 700;
  color: #534ab7;
  font-family: "Courier New", Courier, monospace;
  letter-spacing: 1px;
  margin: 0 4px;
}

.invite-code-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  color: #534ab7;
  transition: background 0.2s;
  margin-left: 2px;

  &:hover {
    background: rgba(83, 74, 183, 0.12);
  }

  i {
    font-size: 14px;
  }
}
</style>
