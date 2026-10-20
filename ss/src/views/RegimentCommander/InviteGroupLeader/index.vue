<template>
  <div class="invite-page">
    <el-card class="invite-card" shadow="never" v-loading="loading">
      <div class="invite-card__title">邀请团长</div>
      <p class="invite-card__desc">
        复制链接发送给好友，对方通过链接注册后将自动成为本俱乐部旗下团长。
      </p>
      <div class="invite-link">{{ inviteUrl || "暂无邀请链接" }}</div>
      <el-button
        type="primary"
        class="copy-btn"
        :class="{ 'is-copied': copied }"
        :disabled="!inviteUrl"
        @click="copyInviteUrl"
      >
        {{ copied ? "√ 已复制" : "复制链接" }}
      </el-button>
    </el-card>
  </div>
</template>

<script>
import { getLeaderInviteStatus } from "@/api/regimentCommander";

export default {
  name: "InviteGroupLeader",
  data() {
    return {
      loading: false,
      copied: false,
      inviteUrl: "",
      copyTimer: null,
    };
  },
  mounted() {
    this.fetchInviteStatus();
  },
  beforeDestroy() {
    clearTimeout(this.copyTimer);
  },
  methods: {
    getBusinessData(res) {
      if (!res) return {};
      if (res.data && typeof res.data === "object") return res.data;
      return res;
    },
    async fetchInviteStatus() {
      this.loading = true;
      try {
        const res = await getLeaderInviteStatus({});
        const data = this.getBusinessData(res);
        this.inviteUrl = data.inviteUrl || "";
      } catch (error) {
        console.error("查询邀请链接失败:", error);
        this.inviteUrl = "";
      } finally {
        this.loading = false;
      }
    },
    async copyInviteUrl() {
      const text = String(this.inviteUrl || "");
      if (!text) return;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          const copied = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (!copied) throw new Error("copy failed");
        }
        this.copied = true;
        this.$message.success("√ 链接已复制到剪贴板");
        clearTimeout(this.copyTimer);
        this.copyTimer = setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (error) {
        this.$message.error("复制失败，请手动复制");
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.invite-page {
  padding: 20px;
  box-sizing: border-box;
}

.invite-card {
  max-width: 760px;
  padding: 24px 8px 12px;
  border-radius: 24px;
}

.invite-card__title {
  color: #1d2129;
  font-size: 20px;
  font-weight: 600;
}

.invite-card__desc {
  margin: 10px 0 20px;
  color: #86909c;
  font-size: 14px;
  line-height: 22px;
}

.invite-link {
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #f7f8fa;
  color: #4e5969;
  word-break: break-all;
}

.copy-btn {
  margin-top: 20px;
  min-width: 132px;
  background: #6a35ff;
  border-color: #6a35ff;
}

.copy-btn.is-copied,
.copy-btn.is-copied:hover,
.copy-btn.is-copied:focus {
  background: #1bc286;
  border-color: #1bc286;
}
</style>
