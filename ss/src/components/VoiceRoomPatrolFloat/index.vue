<template>
  <div class="voice-room-patrol-float">
    <FloatPanel
      :value.sync="visible"
      title="语音房巡查"
      theme="dark"
      :width="900"
      :height="620"
      :auto-minimize-on-route-change="true"
      bounds-selector=".app-main"
      @close="closePanel"
    >
      <template #mini="{ restore }">
        <div class="patrol-mini" :class="{ live: isRoomLive }" :title="miniTitle" @click="restore">
          <span class="patrol-mini-avatar-wrap">
            <img class="patrol-mini-avatar" :src="ownerAvatar" alt="房主头像" />
          </span>
          <div class="patrol-mini-text">
            <div v-if="activeSpeakers.length" class="patrol-mini-speaker-row">
              <span class="patrol-mini-speaker">{{ speakerLabel }}</span>
              <span class="patrol-mini-waves"><i></i><i></i><i></i></span>
            </div>
            <div v-else class="patrol-mini-status">
              <span v-if="isRoomLive" class="patrol-mini-dot"></span>
              <span class="patrol-mini-status-text">
                {{ isRoomLive ? "房间进行中" : "巡查中" }}
              </span>
            </div>
            <div class="patrol-mini-room">{{ ownerNickname }} · 房间 {{ currentRoom.roomId || "—" }}</div>
          </div>
        </div>
      </template>

      <div v-loading="loading" class="patrol-body">
        <div class="patrol-header">
          <div class="patrol-owner">
            <span class="patrol-owner-avatar" :class="{ live: isRoomLive }">
              <img :src="ownerAvatar" alt="房主头像" />
              <i class="patrol-owner-badge">房主</i>
            </span>
            <span class="patrol-owner-info">
              <span class="patrol-owner-name">{{ ownerNickname }}</span>
              <span class="patrol-room-line">房间 <em>{{ currentRoom.roomId || "—" }}</em></span>
            </span>
          </div>
          <div class="patrol-live">
            <span class="patrol-live-dot" :class="{ live: isRoomLive }"></span>
            {{ isRoomLive ? "监听中" : "监听中" }}
          </div>
        </div>

        <TencentVoiceRoomViewer
          v-if="currentRoom.roomId"
          ref="viewer"
          :room-id="currentRoom.roomId"
          :trtc-room-id="patrolCredential.trtcRoomId"
          :user-id="patrolCredential.trtcUserId"
          :user-sig="patrolCredential.userSig"
          :sdk-app-id="patrolCredential.sdkAppId"
          :online-count="patrolCredential.onlineCount"
          :tip-message="patrolCredential.tipMessage"
          :can-ban="!!currentRoom.canBan"
          :members="patrolMembers"
          :owner-id="currentRoom.ownerUserId"
          :owner-name="currentRoom.ownerNickname"
          :owner-avatar="currentRoom.ownerAvatarUrl"
          @members-refresh-request="refreshPatrolMembers"
          @credential-refresh-request="handleCredentialRefresh"
          @ban-member="openBanDialog"
          @client-banned="handleClientBanned"
          @speakers-change="handleSpeakersChange"
        />

        <div v-else-if="!loading" class="patrol-empty">暂无可巡查的语音房</div>
      </div>
    </FloatPanel>

    <VoiceRoomBanDialog
      ref="banDialog"
      :visible.sync="banDialogVisible"
      @success="handleBanSuccess"
    />
  </div>
</template>

<script>
import FloatPanel from "@/components/FloatPanel/index.vue";
import TencentVoiceRoomViewer from "@/views/voiceRoomManagement/voiceRoom/components/TencentVoiceRoomViewer.vue";
import VoiceRoomBanDialog from "@/views/voiceRoomManagement/voiceRoom/components/VoiceRoomBanDialog.vue";
import { getVoiceRoomMemberList, getVoiceRoomPatrolCredential } from "@/api/voiceRoom";
import { onBeforeReload } from "@/utils/appEvents";

/**
 * TRTC client-banned 三种原因对应的提示。
 * room-disband 是业务上的正常收尾，只需知会；
 * banned / kick 都属于异常，尤其 kick 说明同一 userId 存在重复登录，
 * 通常是有多份巡查实例在抢同一个身份，需要人工排查。
 */
const BANNED_TIPS = {
  "room-disband": { type: "info", text: "房间已结束，巡查窗口已关闭" },
  banned: { type: "error", text: "巡查账号已被禁用，巡查已终止" },
  kick: {
    type: "error",
    text: "巡查账号被踢出：同一 userId 存在重复登录，请检查是否有多份巡查实例",
  },
  default: { type: "warning", text: "巡查连接已断开，巡查窗口已关闭" },
};
import { onVoiceRoomPatrol, notifyVoiceRoomRefresh } from "./bus";

/**
 * 语音房巡查悬浮窗（全局单例）。
 *
 * 挂在 AppMain 而不是语音房列表页里，这样切换菜单/路由时浮窗和 TRTC 连接都不会断，
 * 巡查人员可以一边看房间一边去别的页面办事。
 */
export default {
  name: "VoiceRoomPatrolFloat",
  components: {
    FloatPanel,
    TencentVoiceRoomViewer,
    VoiceRoomBanDialog,
  },
  data() {
    return {
      visible: false,
      loading: false,
      currentRoom: {},
      patrolMembers: [],
      patrolCredential: {},
      banDialogVisible: false,
      // 当前在说话的成员（id + 昵称），由 viewer 的 audio-volume 实时上报，
      // 缩小版浮窗用它展示「谁在说话」和声波动画
      activeSpeakers: [],
      defaultAvatar: require("@/assets/defaulIcon.png"),
    };
  },
  computed: {
    ownerNickname() {
      return this.currentRoom.ownerNickname || "未知房主";
    },
    ownerAvatar() {
      return this.currentRoom.ownerAvatarUrl || this.defaultAvatar;
    },
    miniTitle() {
      return `${this.ownerNickname} · 房间 ${this.currentRoom.roomId || "—"}`;
    },
    /** 房间是否有「活」信号：在线人数大于 0，或正有人在说话 */
    isRoomLive() {
      if (!this.currentRoom.roomId) return false;
      const count = Number(this.patrolCredential.onlineCount);
      return count > 0 || this.activeSpeakers.length > 0;
    },
    /** 首个说话者的昵称，多人同时说话时带上总数 */
    speakerLabel() {
      const names = this.activeSpeakers.map((s) => s.name || s.id || "?");
      const first = names[0] || "";
      return names.length > 1 ? `${first} 等${names.length}人` : first;
    },
  },
  watch: {
    patrolMembers: {
      deep: true,
      handler() {
        this.checkAutoExitWhenEmpty();
      },
    },
    "patrolCredential.onlineCount": function () {
      this.checkAutoExitWhenEmpty();
    },
  },
  mounted() {
    this.unregisterOpen = onVoiceRoomPatrol(this.open);
    // 登录失效走的是整页重载，组件的 beforeDestroy 不会被执行，
    // 必须在这里显式退房，否则巡查账号会滞留在腾讯云房间里。
    this.unregisterReload = onBeforeReload(() => this.releaseRoom());
  },
  beforeDestroy() {
    // 主动登出等正常销毁路径由这里兜底，组件树销毁时组件会自行退房
    if (this.unregisterOpen) this.unregisterOpen();
    if (this.unregisterReload) this.unregisterReload();
  },
  methods: {
    handleSpeakersChange(list) {
      this.activeSpeakers = Array.isArray(list) ? list : [];
      this.checkAutoExitWhenEmpty();
    },
    async checkAutoExitWhenEmpty() {
      if (!this.currentRoom || !this.currentRoom.roomId) return;
      const viewer = this.$refs.viewer;
      const isConnected = !!(viewer && viewer.connected);
      const hasMembers = Array.isArray(this.patrolMembers) && this.patrolMembers.length > 0;
      const onlineCount = Number(this.patrolCredential && this.patrolCredential.onlineCount);
      const shouldExit = isConnected && !hasMembers && Number.isFinite(onlineCount) && onlineCount === 0;
      if (!shouldExit || !this.visible) return;
      this.$message.info("房间内已无人，巡查已自动结束");
      await this.closePanel();
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
    async open(row) {
      if (!row || !row.roomId) return;

      // 悬浮框一次只开一间，换房前先把上一间退掉，避免残留 TRTC 连接
      if (this.currentRoom.roomId && String(this.currentRoom.roomId) !== String(row.roomId)) {
        await this.releaseRoom();
      }

      this.currentRoom = row;
      this.patrolMembers = [];
      this.patrolCredential = {};
      this.visible = true;
      this.loading = true;
      try {
        const res = await getVoiceRoomPatrolCredential({ roomId: row.roomId });
        this.patrolCredential = this.getResponseData(res);
        this.patrolMembers = await this.fetchMembers(row.roomId);
      } catch (error) {
        console.error("领取巡查凭证失败:", error);
        this.$message.warning("请不要快速频繁点击房间，请再次尝试进入监听！");
      } finally {
        this.loading = false;
      }
    },
    async fetchMembers(roomId) {
      try {
        const res = await getVoiceRoomMemberList({ roomId });
        const data = this.getResponseData(res);
        return Array.isArray(data.members) ? data.members.slice(0, 8) : [];
      } catch (error) {
        console.error("获取语音房在线成员失败:", error);
        return [];
      }
    },
    /**
     * viewer 遇到不在底名单里的陌生进房者时请求补拉一次底名单，
     * 用来给合法迟到进房的人补头像/昵称并摘掉「非名单用户」标记。
     * 静默失败：member-list 拉不到就等下一次（进房事件 / 禁用成功）再触发。
     */
    async refreshPatrolMembers() {
      if (!this.currentRoom || !this.currentRoom.roomId) return;
      this.patrolMembers = await this.fetchMembers(this.currentRoom.roomId);
    },
    /**
     * viewer 请求补拉巡查凭证（点「重新监听」遇到凭证缺失/失效时）。
     * 重新领取凭证 + 底名单，再让 viewer 用新凭证重新进房。
     */
    async handleCredentialRefresh() {
      if (!this.currentRoom || !this.currentRoom.roomId) return;
      let ok = false;
      try {
        const res = await getVoiceRoomPatrolCredential({ roomId: this.currentRoom.roomId });
        this.patrolCredential = this.getResponseData(res);
        ok = !!(this.patrolCredential && this.patrolCredential.userSig);
      } catch (error) {
        console.error("重新领取巡查凭证失败:", error);
        this.$message.error("重新领取巡查凭证失败");
      }
      await this.refreshPatrolMembers();
      const viewer = this.$refs.viewer;
      if (viewer && typeof viewer.retryEnter === "function") {
        viewer.retryEnter(ok);
      }
    },
    /**
     * 释放当前巡查房间：退出腾讯云房间并清空状态。
     * 单独抽出来是因为「关闭悬浮框」和「换一间房巡查」都要走这一步。
     */
    async releaseRoom() {
      const viewer = this.$refs.viewer;
      if (viewer && typeof viewer.leaveRoom === "function") {
        await viewer.leaveRoom();
      }
      this.currentRoom = {};
      this.patrolMembers = [];
      this.patrolCredential = {};
      this.activeSpeakers = [];
    },
    /**
     * 关闭悬浮框 = 退出腾讯云房间。
     * 必须等 client.leave() 跑完再清空 currentRoom：v-if 一旦变成 false 组件就会立刻销毁，
     * 提前清空会让退房请求发不出去，房间里残留巡查连接。
     */
    async closePanel() {
      this.visible = false;
      await this.releaseRoom();
      notifyVoiceRoomRefresh();
    },
    /**
     * 巡查中途被踢出房间（房主结束房间 / 账号被禁用 / 同 userId 重复登录）。
     * 三种原因对巡查员意义不同，所以分开提示，不做静默处理。
     * 收尾统一走「关窗 + 退房」，和主动关闭是同一条路径。
     */
    async handleClientBanned(payload) {
      const reason = (payload && payload.reason) || "";
      const tip = BANNED_TIPS[reason] || BANNED_TIPS.default;

      this.visible = false;
      this.$message[tip.type](tip.text);
      await this.releaseRoom();
      notifyVoiceRoomRefresh();
    },
    openBanDialog(member) {
      if (!member) return;
      this.$refs.banDialog.open(this.currentRoom, this.resolveMemberPayload(member));
    },
    /**
     * 巡查画面里的成员结构与 member-list 返回结构不同，这里统一成禁用接口所需字段
     */
    resolveMemberPayload(member) {
      const source = (this.patrolMembers || []).find(
        (item) => String(item.userId) === String(member.id)
      );
      return {
        userId: source ? source.userId : member.id,
        nickname: source ? source.nickname : member.name,
        phone: source ? source.phone : "",
        avatarUrl: source ? source.avatarUrl : member.avatar,
        memberRole: source ? source.memberRole : "",
        memberRoleName: source ? source.memberRoleName : member.role,
      };
    },
    async handleBanSuccess({ data, member } = {}) {
      const userId = member?.userId;
      const viewer = this.$refs.viewer;
      if (viewer && typeof viewer.kickMember === "function") {
        await viewer.kickMember({ id: userId });
      }
      this.patrolMembers = this.patrolMembers.filter(
        (item) => String(item.userId) !== String(userId)
      );

      // 服务端已把成员踢出房间，以接口返回的在线人数为准
      const onlineCount = data && data.onlineCount !== undefined
        ? Number(data.onlineCount)
        : NaN;
      if (!Number.isNaN(onlineCount)) {
        this.$set(this.patrolCredential, "onlineCount", onlineCount);
        this.$set(this.patrolCredential, "tipMessage", onlineCount > 0 ? "" : "房内已无人，可结束本次巡查");
      }
      this.patrolMembers = await this.fetchMembers(this.currentRoom.roomId);
      // 禁用并踢出是后台动作，语音房列表页（可能正开着）需要同步刷新在线人数/状态
      notifyVoiceRoomRefresh();
    },
  },
};
</script>

<style scoped lang="scss">
::v-deep .el-loading-mask {
  background-color: #9f7dff7a;
}
/* 展开态：房主名片 + 房间状态 */
.patrol-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: linear-gradient(120deg, rgba(139, 92, 246, 0.16), rgba(217, 70, 239, 0.08) 60%, rgba(34, 211, 238, 0.06));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.patrol-owner {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.patrol-owner-avatar {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  padding: 3px;
  background: linear-gradient(135deg, #a78bfa, #f472b6 55%, #22d3ee);
  box-shadow: 0 0 18px rgba(139, 92, 246, 0.4);

  // 房间有活动：头像光环转成「进行中」的青绿色
  &.live {
    background: linear-gradient(135deg, #34d399, #22d3ee);
    box-shadow: 0 0 20px rgba(52, 211, 153, 0.45);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    background: #251c47;
  }
}

.patrol-owner-badge {
  position: absolute;
  right: -5px;
  bottom: -3px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, #8b5cf6, #d946ef);
  border: 2px solid #1a1438;
  box-shadow: 0 2px 8px rgba(8, 5, 28, 0.5);
}

.patrol-owner-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.patrol-owner-name {
  font-size: 15px;
  font-weight: 700;
  color: #f0eaff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patrol-room-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8f9ac6;

  em {
    font-style: normal;
    font-family: "Courier New", Courier, monospace;
    color: #cbbefb;
  }
}

/* 进行中/监听中 状态 */
.patrol-live {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #9aa6d8;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.patrol-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transition: background 0.3s, box-shadow 0.3s;

  &.live {
    background: #fb7185;
    box-shadow: 0 0 0 4px rgba(251, 113, 133, 0.2);
    animation: patrol-live-pulse 1.4s ease-in-out infinite;
  }
}

@keyframes patrol-live-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.25);
  }

  50% {
    box-shadow: 0 0 0 7px rgba(251, 113, 133, 0);
  }
}

.patrol-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 0;
  color: #7f8ab5;

  &::before {
    content: "\e76f";
    font-family: "element-icons";
    font-size: 40px;
    color: #5b6590;
  }
}

/* 最小化态：只留房主头像、房间名和当前说话人，点击整块即可放大 */
.patrol-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
  padding: 0 16px;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  // 房间进行中：左侧一条活动标识
  &.live {
    box-shadow: inset 4px 0 0 0 #34d399;
  }
}

.patrol-mini-avatar-wrap {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg, #a78bfa, #f472b6 55%, #22d3ee);
  box-shadow: 0 0 14px rgba(139, 92, 246, 0.35);
}

.patrol-mini-avatar {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: #251c47;
}

.patrol-mini-text {
  min-width: 0;
  flex: 1;
}

/* 有人说话：昵称 + 声波动画 */
.patrol-mini-speaker-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.patrol-mini-speaker {
  flex-shrink: 0;
  max-width: 100%;
  font-size: 13px;
  font-weight: 700;
  color: #6ee7b7;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patrol-mini-waves {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;

  i {
    width: 3px;
    height: 5px;
    border-radius: 2px;
    background: linear-gradient(180deg, #a7f3d0, #34d399);
    animation: patrol-wave 0.9s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.18s;
    }

    &:nth-child(3) {
      animation-delay: 0.36s;
    }
  }
}

@keyframes patrol-wave {
  0%,
  100% {
    height: 5px;
  }

  50% {
    height: 14px;
  }
}

/* 房间进行中但没人说话：脉冲绿点作为活动标识
（关键帧写在 scoped 样式里，作用域限定在本组件） */
.patrol-mini-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #f0eaff;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patrol-mini-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  animation: patrol-dot 1.2s ease-in-out infinite;
}

@keyframes patrol-dot {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6);
  }

  50% {
    opacity: 0.55;
    box-shadow: 0 0 0 5px rgba(52, 211, 153, 0);
  }
}

.patrol-mini-status-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patrol-mini-room {
  font-size: 12px;
  color: #ced8ff;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
