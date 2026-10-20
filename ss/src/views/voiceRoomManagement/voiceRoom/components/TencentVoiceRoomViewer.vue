<template>
  <div class="tencent-room-viewer">
    <div class="viewer-body">
      <div v-if="errorText" class="viewer-alert">{{ errorText }}</div>

      <!-- 标题行同时承载连接状态与操作按钮，不另起顶栏占面积 -->
      <div class="stage-header">
        <span>语音房实时成员</span>
        <div class="stage-actions">
          <!--
          <span class="stage-online">在线 {{ onlineCount }} 人</span>
          <span
            v-if="insecureContext"
            class="stage-insecure"
            title="浏览器把 HTTP 视为非安全源，禁止带声播放远端音频并隐藏 mediaDevices，任何客户端音量分析都恒为 0。请通过 HTTPS 或 http://localhost 访问本应用。"
          >非 HTTPS · 说话中不可用</span>
          -->
          <span class="viewer-state" :title="topbarTitle">
            <span class="state-dot" :class="{ active: connected }"></span>
            {{ stateText }}
          </span>
          <el-button size="mini" type="primary" plain :loading="joining" @click="reListen">
            {{ connected ? "重新监听" : "进入监听" }}
          </el-button>
        </div>
      </div>

      <div v-if="hasMembers" class="live-grid">
        <div
          v-for="member in seatMembers"
          :key="member.key"
          class="live-member"
          :class="{ speaking: member.speaking, placeholder: member.placeholder }"
        >
          <div v-if="member.placeholder" class="live-placeholder">
            <div class="placeholder-avatar">
              <i class="el-icon-microphone"></i>
            </div>
            <div class="placeholder-text">空位</div>
          </div>
          <template v-else>
            <div class="live-avatar" @click="previewAvatar(member.avatar)">
              <img :src="member.avatar || defaultAvatar" alt="" />
            </div>
            <div class="live-info">
              <div class="live-name">{{ member.name }}</div>
              <div class="live-meta">{{ member.id }}</div>
              <div v-if="member.unregistered" class="live-role unregistered">非名单用户</div>
              <div v-else-if="member.role" class="live-role">{{ member.role }}</div>
            </div>
            <div v-if="member.speaking" class="live-status">
              <span class="live-status-bars"><i></i><i></i><i></i></span>
              说话中
            </div>
            <el-button
              v-permission="'voice-room:room:ban'"
              v-if="canBan"
              type="text"
              size="mini"
              class="ban-btn"
              :disabled="member.banned"
              @click="handleBan(member)"
            >
              {{ member.banned ? "已封禁" : "封禁" }}
            </el-button>
          </template>
        </div>
      </div>

      <div v-else class="empty-room">{{ emptyText }}</div>
    </div>

    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />
  </div>
</template>

<script>
import TRTC from "trtc-js-sdk";
import ImgZoom from "@/components/ImgZoom/index.vue";

const MAX_SLOTS = 8;
/** 退房等待上限，leave() 挂死时不拖住关闭弹窗的流程 */
const LEAVE_TIMEOUT = 3000;
/** TRTC ErrorCode PLAY_NOT_ALLOWED：浏览器自动播放策略拦截远端语音 */
const PLAY_NOT_ALLOWED = 0x4043;

/**
 * 说话判定阈值：audio volume 是 0-100 的整数，超过它才算在说话。
 * 我们不再依赖 SDK 的 enableAudioVolumeEvaluation —— 那个音量要从 <audio>
 * 播放结果里采，操作员电脑没喇叭/浏览器拦自动播放时就恒为 0（巡查机常见）。
 * 改成自己对订阅到的音频轨做 WebAudio 波形分析，跟是否外放无关。
 */
const SPEAKING_THRESHOLD = 8;
/** 自建音量分析的采样周期，与 SDK 默认相近即可 */
const VOLUME_EVAL_INTERVAL = 300;

export default {
  name: "TencentVoiceRoomViewer",
  components: {
    ImgZoom,
  },
  props: {
    /** 业务房间ID，仅用于展示 */
    roomId: {
      type: [String, Number],
      default: "",
    },
    /** 腾讯云 TRTC 房间号 */
    trtcRoomId: {
      type: [String, Number],
      default: "",
    },
    /** 巡查账号 TRTC userId */
    userId: {
      type: [String, Number],
      default: "",
    },
    /** 巡查凭证 UserSig */
    userSig: {
      type: String,
      default: "",
    },
    /** 腾讯云 SDKAppID */
    sdkAppId: {
      type: [String, Number],
      default: "",
    },
    /** 当前在线人数 */
    onlineCount: {
      type: [String, Number],
      default: 0,
    },
    /** 无人时的引导文案 */
    tipMessage: {
      type: String,
      default: "",
    },
    /** 是否可禁用成员（房间处于进行中） */
    canBan: {
      type: Boolean,
      default: false,
    },
    members: {
      type: Array,
      default() {
        return [];
      },
    },
    /** 房主（老板）信息：房主中途进房永远算有效成员，且带真实头像，绝不标「非名单用户」 */
    ownerId: {
      type: [String, Number],
      default: "",
    },
    ownerName: {
      type: String,
      default: "",
    },
    ownerAvatar: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      defaultAvatar: require("@/assets/defaulIcon.png"),
      connected: false,
      joining: false,
      errorText: "",
      client: null,
      membersList: [],
      // 后端 member-list 打底时的 id 快照。与 membersList 分开存，
      // 因为 membersList 会被 peer-leave 清掉，需要留底才能判断
      // 某个 TRTC 用户到底是「正常成员离场后又回来」还是「根本不在业务名单里」。
      baselineIds: [],
      // 业务成员信息的补全表：新成员进房时，只拿到 userId，仍需要回查头像/昵称/角色
      memberMetaMap: {},
      destroyed: false,
      maxSlots: MAX_SLOTS,
      avatarDialogVisible: false,
      previewAvatarUrl: "",
      listeningRequested: false,
      // 页面协议是否为安全上下文（HTTPS/localhost）。HTTP 下浏览器禁播远端音频，
      // 「说话中」必然全 0，提前在界面上挂出来免得排查时误判成代码问题。
      insecureContext: false,
    };
  },
  computed: {
    hasMembers() {
      return this.membersList.length > 0;
    },
    stateText() {
      if (this.joining) return "正在进入";
      if (this.connected) return "已进入房间（仅监听）";
      return "未进入房间";
    },
    /** 顶栏 hover 提示：不占视觉空间，但保留房间号/TRTC 号的调试信息 */
    topbarTitle() {
      const parts = [];
      if (this.roomId) parts.push(`房间 ${this.roomId}`);
      if (this.trtcRoomId) parts.push(`TRTC ${this.trtcRoomId}`);
      return parts.join(" · ");
    },
    emptyText() {
      if (this.tipMessage) return this.tipMessage;
      return Number(this.onlineCount) > 0 ? "正在同步房间成员..." : "当前房间暂无成员";
    },
    seatMembers() {
      const list = this.membersList.slice(0, this.maxSlots);
      const placeholders = Array.from({ length: Math.max(0, this.maxSlots - list.length) }, (_, index) => ({
        key: `placeholder-${index}`,
        placeholder: true,
        speaking: false,
      }));
      return [...list, ...placeholders].map((item, index) => ({
        ...item,
        key: item.key || `${item.id || "seat"}-${index}`,
      }));
    },
  },
  watch: {
    members: {
      immediate: true,
      handler(value) {
        const list = Array.isArray(value) ? value : [];
        // 最新的底名单刚到：之前为陌生进房者发起的补全请求已轮完，复位去重标记
        this._pendingMetaRefresh = false;
        this.memberMetaMap = this.buildMemberMetaMap(list);
        const baseline = this.normalizeMembers(list);
        this.baselineIds = baseline.map((item) => String(item.id));
        // 增量合拢而不是整表覆盖：TRTC 实时进房的人可能还没进最新底名单（如合法迟到者），
        // 不能用快照把它们冲掉；同时用新底名单给旧成员补全头像/昵称/角色、纠正名单判定。
        this.mergeMembersWithBaseline(baseline);
      },
    },
    userSig: {
      immediate: true,
      handler(value) {
        if (value) {
          this.listeningRequested = true;
        }
        this.ensureListening();
      },
    },
    userId() {
      // 巡查身份是 createClient 的必填项，后到也要能补进监听
      this.ensureListening();
    },
    roomId: {
      immediate: true,
      handler() {
        if (this.roomId) {
          this.initClient();
        }
        this.ensureListening();
      },
    },
    sdkAppId() {
      this.ensureListening();
    },
    trtcRoomId() {
      this.ensureListening();
    },
  },
  created() {
    // 退房流程的复用句柄，刻意不放进 data，避免被响应式系统观察到
    this.leavePromise = null;
    // 上次上报的说话人 id 签名，用于给音量采样做去重
    this._lastSpeakersSig = "";
    // 同一 TRTC client 重复 join 同一房间时，做最小幂等保护，避免 INVALID_OPERATION 0x1001
    this._joinedRoomId = "";
    // stream-subscribed 一次性诊断日志开关
    this._subscribedLogged = false;
    // 陌生进房者「只补一轮底名单」的去重标记：置位后在最新底名单回来前不再重复发请求
    this._pendingMetaRefresh = false;
    // 「重新监听」时向父组件补拉凭证的在途标记，避免重复点击触发多次拉取
    this._pendingCredentialRefresh = false;
    // 自建音量分析：ctx 全局复用，entries 按 userId 记录 analyser，timer 是采样轮询
    this._audioAnalysis = { ctx: null, entries: {}, timer: null };
    // 远端音频播放节点：必须挂到 DOM 才能真正出声，统一管理生命周期
    this._playbackRefs = {};
    // 一次性诊断开关
    this._ctxSelfTested = false;
    this._deviceLogged = false;
    this._insecureLogged = false;
    this.checkInsecureContext();
  },
  beforeDestroy() {
    this.destroyed = true;
    this.leaveRoom();
  },
  methods: {
    /**
     * 巡查进入房间即进入监听态。
     * 凭证、sdkAppId、trtcRoomId、trtcUserId 是分批异步返回的，任意一个后到都要能补进监听，
     * 因此不依赖单次 userSig 变化，而是把监听态做成可重入的目标状态。
     */
    ensureListening() {
      if (this.destroyed) return;
      if (!this.listeningRequested) return;
      if (this.connected || this.joining) return;
      // userId 参与 createClient，缺失就拿不到后端的巡查身份，
      // 不能退化成自己生成一个随机 id 顶替。
      if (!this.userSig || !this.userId || !this.roomId) return;
      this.enterRoom();
    },
    previewAvatar(url) {
      if (!url) {
        this.$message.warning("头像不存在");
        return;
      }
      this.previewAvatarUrl = url;
      this.avatarDialogVisible = true;
    },
    buildMemberMetaMap(list) {
      const safeList = Array.isArray(list) ? list : [];
      return safeList.reduce((map, member) => {
        const userId = String(member?.userId ?? member?.id ?? "");
        if (!userId) return map;
        map[userId] = {
          id: userId,
          name: member?.nickname || member?.name || member?.userName || userId || "匿名用户",
          avatar: member?.avatarUrl || member?.avatar || "",
          role: member?.memberRoleName || member?.memberRole || "",
        };
        return map;
      }, {});
    },
    normalizeMembers(list) {
      const safeList = Array.isArray(list) ? list : [];
      // 巡查员不能占位。后端文档承诺「巡查账号不计入房间在线人数」，
      // 但不该只依赖这个承诺：一旦后端把自己也塞进成员列表，
      // 巡查员就会白占掉 8 个麦位格之一。这里显式把自己剔掉。
      const selfId = String(this.userId || "");
      return safeList
        .map((member) => ({
          id: String(member.userId ?? member.id ?? ""),
          name: member.nickname || member.name || member.userName || member.userId || "匿名用户",
          avatar: member.avatarUrl || member.avatar || "",
          role: member.memberRoleName || member.memberRole || "",
          // 刻意不取后端的 speaking：那是快照不是实时值，
          // 「说话中」由我们自行对订阅音频轨做波形分析，见 startAudioAnalysis
          speaking: false,
          banned: Boolean(member.banned),
        }))
        .filter((member) => member.id !== selfId);
    },
    /**
     * 后端房间号是 19 位雪花 ID（2.1e18 量级），远超整数房间号上限 4294967294，
     * 所以必须用字符串房间号：createClient 开了 useStringRoomId: true，join() 的
     * roomId 传字符串。这里只做非空校验和去空白，返回原字符串。
     */
    resolveTrtcRoomId(raw) {
      const value = String(raw ?? "").trim();
      return value || null;
    },
    getSdkAppId() {
      const appId = Number(this.sdkAppId);
      if (!this.sdkAppId || Number.isNaN(appId) || appId <= 0) {
        return 0;
      }
      return appId;
    },
    initClient() {
      if (this.client) return;

      const appId = this.getSdkAppId();
      if (!TRTC || !TRTC.createClient || !appId) {
        // 凭证未返回时 sdkAppId 必然为空，属于加载中而不是故障，等凭证到达后由 ensureListening 补建
        this.errorText = this.userSig
          ? "未获取到有效的腾讯云 sdkAppId，当前仅展示在线成员列表"
          : "";
        return;
      }

      try {
        this.client = TRTC.createClient({
          // 语音房是直播场景（房主为主播，听众只收不发），必须用 live 模式。
          // 之前用 rtc 模式能进房、能列出发声者，但收不到音频流解码，
          // 音量恒为 0，「说话中」不亮。live + audience 同时还从结构上禁止推流，
          // 正好满足巡查「不能讲话、不能占麦位」。
          mode: "live",
          sdkAppId: appId,
          // userId / userSig 是 createClient 的必填项，join() 不接受这两个字段。
          // 之前把它们塞进 join()，后端下发的凭证实际没被使用，巡查账号是空身份进房的。
          // 身份必须用后端下发的 trtcUserId，不能自己生成：后端靠它识别巡查账号，
          // 也就才能实现「巡查账号不计入房间在线人数」。
          userId: String(this.userId || ""),
          userSig: String(this.userSig || ""),
          // 后端房间号是 19 位雪花 ID，必须开字符串房间号，否则 join() 会报
          // roomId must be an integer between [1, 4294967294]。
          // 与腾讯云控制台上该 SDKAppID 的「字符串房间号」开关一一对应。
          useStringRoomId: true,
          // 巡查必须能听见房间里在说什么，但浮窗里没有 audio 元素，
          // 声音全靠 SDK 内部播放，会被浏览器自动播放策略拦下。
          // 打开这个开关让 SDK 自己在被拦时弹提示，避免巡查员对着无声的房间值守。
          enableAutoPlayDialog: true,
        });
        this.bindClientEvents();
        this.errorText = "";
      } catch (error) {
        console.error("TRTC 客户端初始化失败:", error);
        this.client = null;
        this.errorText = "腾讯云语音客户端初始化失败，当前仅展示在线成员列表";
      }
    },
    bindClientEvents() {
      if (!this.client) return;

      /**
       * 在场状态走 TRTC 事件做增量维护，不做任何轮询：
       * 进房时用后端 member-list 打一次底，之后有人进/走由这两个事件实时增删。
       * 巡查员是中途进房的，收不到自己进场前的历史事件，所以底名单那一次省不掉。
       */
      this.client.on("peer-join", (user) => this.handlePeerJoin(user));
      this.client.on("peer-leave", (user) => this.handlePeerLeave(user));

      /**
       * 有人进房 publish 了一条流。live + audience 下 SDK 一般会自动订阅主播流，
       * 这里再显式 subscribe 一次兜底（对同一流重复 subscribe 是幂等的），
       * 并且只收音频不收视频。订阅不上时不会静默失败，会留一条可排查的日志。
       */
      this.client.on("stream-added", (event) => {
        const stream = event && event.stream;
        if (!stream || !this.client || typeof this.client.subscribe !== "function") return;
        this.client
          .subscribe(stream, { audio: true, video: false })
          .catch((error) => {
            console.warn("[voice-room] 订阅远端音频失败:", error && error.message);
          });
      });

      // 确认收到订阅成功事件（每次新流只打一条，用于排查），
      // 并把这条流接到我们的音量分析器上（见 startAudioAnalysis）
      this.client.on("stream-subscribed", (event) => {
        const stream = event && event.stream;
        if (stream && typeof stream.getUserId === "function") {
          const userId = String(stream.getUserId());
          this.bindRemoteStreamPlayback(stream);
          if (!this._subscribedLogged) {
            this._subscribedLogged = true;
            console.warn(
              "[voice-room] 远端流订阅成功: userId =",
              userId,
              "，含音频轨道 =",
              typeof stream.hasAudio === "function" ? stream.hasAudio() : true
            );
          }
          this.logAudioDevices();
          this.attachAnalyser(userId, stream);
        }
      });

      // 轨道被替换（如对方换设备/升级码率）时重建分析器，保持说话人检测连续
      this.client.on("stream-updated", (event) => {
        const stream = event && event.stream;
        if (stream && typeof stream.getUserId === "function") {
          this.attachAnalyser(stream.getUserId(), stream);
        }
      });

      // 远端流被移除时释放对应分析器
      this.client.on("stream-removed", (event) => {
        const stream = event && event.stream;
        if (stream && typeof stream.getUserId === "function") {
          const userId = String(stream.getUserId());
          this.detachAnalyser(userId);
          this.removeRemoteStreamPlayback(userId);
        }
      });

      // 进出房连接状态，一条状态切一次日志，用来确认「真的连上了」
      this.client.on("connection-state-changed", (event) => {
        console.warn("[voice-room] 连接状态:", event && event.prevState, "→", event && event.state);
      });

      // 远端音频被对方静音/取消静音（排查音量恒 0 的另一可能：压根没推有声音的流）
      this.client.on("mute-audio", (event) => {
        console.warn("[voice-room] 远端静音:", event && event.userId);
      });
      this.client.on("unmute-audio", (event) => {
        console.warn("[voice-room] 远端取消静音:", event && event.userId);
      });

      /**
       * 说话人检测不监听 SDK 的 audio-volume：那个音量从 <audio> 播放结果里采样，
       * 操作员没外放设备或播放被浏览器拦时恒为 0，巡查机完全可能无声值守。
       * 改由 startAudioAnalysis 对每个订阅流做 WebAudio 波形分析，见本组件下方。
       */
      this.client.on("error", (event) => {
        // 0x4043 = PLAY_NOT_ALLOWED，浏览器自动播放策略把远端语音拦了。
        // 会听不到房间说话声（但「说话中」不受影响——那是我们自己的波形分析）。
        // 点页面/面板上的「重新监听」重新触发一次进房即可恢复发声。
        if (event && event.code === PLAY_NOT_ALLOWED) {
          this.errorText =
            "浏览器拦截了语音播放：请点击上方「重新监听」按钮，并在浏览器弹出的提示中允许，才能听到房间语音";
        }
        console.error("TRTC error:", event);
      });

      /**
       * 被踢出房间。这是「巡查中途结束」的唯一信号：
       * 房主结束房间(room-disband)、账号被禁用(banned)、
       * 同一 userId 已被别的实例登录(kick)都会走这里。
       * 必须显式处理，否则 SDK 已经把我们踢出房间、前端却仍以为还在巡查，
       * 会留下一个空壳浮窗和一段没人监听的假巡查。
       */
      this.client.on("client-banned", (event) => {
        const reason = (event && event.reason) || "";
        const message = (event && event.message) || "";
        console.warn("TRTC client-banned:", reason, message);
        this.handleBanned(reason, message);
      });
    },
    /**
     * 被踢出后的本地收尾。真正的退房动作交由父组件统一走 releaseRoom，
     * 这里只负责把「还连着」的状态和成员列表立刻清掉，
     * 避免在等待父组件处理期间继续展示已经失效的成员信息。
     */
    handleBanned(reason, message) {
      this.connected = false;
      this.stopAudioAnalysis();
      this.membersList = [];
      this.emitCurrentSpeakers();
      this.$emit("client-banned", { reason, message });
    },
    /**
     * 有人进了 TRTC 房间。
     * TRTC 只给 userId，拿不到昵称头像。判定分三层：
     * 1. 房主（老板）中途进房：永远算有效成员，用 owner 真实头像昵称，绝不标「非名单用户」；
     * 2. 在最新底名单（members prop）里的合法成员：底名单第二次拉取也能追上、补头像；
     * 3. 底名单和房主都说不上的陌生进房者：先按 userId 占个位，同时请求父组件补拉一次
     *    底名单复核——补上就摘掉标记，仍补不上才说明是绕过业务直接连房的异常，保留红色标记。
     */
    handlePeerJoin(user) {
      const key = String((user && user.userId) || "");
      if (!key) return;
      if (this.membersList.some((item) => String(item.id) === key)) return;

      const isOwner = String(this.ownerId || "") === key;
      const userMeta = this.memberMetaMap[key] || {};
      const isKnown = isOwner || !!userMeta.id || this.baselineIds.includes(key);
      const meta = isOwner
        ? {
            name: this.ownerName || this.ownerId || key,
            avatar: this.ownerAvatar || "",
            role: "房主",
          }
        : { name: userMeta.name || key, avatar: userMeta.avatar || "", role: userMeta.role || "" };

      this.membersList = [
        ...this.membersList,
        {
          id: key,
          name: meta.name,
          avatar: meta.avatar,
          role: meta.role,
          speaking: false,
          banned: false,
          unregistered: !isKnown,
        },
      ];
      // 资料/名单状态未知时，让父组件拉一次最新底名单来补全和复核
      if (!isKnown) this.requestMemberRefresh();
    },
    /**
     * 陌生进房者触发一轮底名单补拉。用 _pendingMetaRefresh 去重：
     * 同一轮底名单回来前，多个陌生进房者只发一次请求（一次就能覆盖全部）。
     */
    requestMemberRefresh() {
      if (this._pendingMetaRefresh) return;
      this._pendingMetaRefresh = true;
      this.$emit("members-refresh-request");
    },
    /**
     * 把最新底名单（members prop）增量合拢进实时成员列表：
     * - 底名单里有的成员：补全头像/昵称/角色，并清除「非名单用户」标记；
     * - 底名单里没有但 TRTC 里还在的人：保留原样（含说话状态），不能被快照冲掉；
     * - 实时进房、经后端底名单确认的成员：一并并入展示位。
     */
    mergeMembersWithBaseline(baseline) {
      const byId = {};
      this.membersList.forEach((member) => {
        byId[String(member.id)] = member;
      });
      baseline.forEach((item) => {
        const id = String(item.id);
        const existing = byId[id];
        byId[id] = existing
          ? {
              ...existing,
              name: item.name,
              avatar: item.avatar,
              role: item.role,
              banned: item.banned,
              unregistered: false,
            }
          : {
              ...item,
              id,
              speaking: false,
              banned: item.banned,
              unregistered: false,
            };
      });
      this.membersList = Object.values(byId);
    },
    /** 有人离开了 TRTC 房间。 */
    handlePeerLeave(user) {
      const key = String((user && user.userId) || "");
      if (!key) return;
      this.detachAnalyser(key);
      this.membersList = this.membersList.filter((item) => String(item.id) !== key);
    },

    /**
     * 自建说话人检测：对每个订阅到的远端音频轨做 WebAudio 波形分析。
     *
     * 为什么不用 SDK 的 enableAudioVolumeEvaluation：那个音量是从 <audio>
     * 播放结果里采的，操作员没外放设备或播放被拦时恒为 0。巡查机完全可能
     * 无声值守，识别谁在说话不能依赖机器有没有喇叭。
     *
     * 做法：把订阅流的 getAudioTrack() 喂给 AudioContext 的 AnalyserNode
     * （只连分析器不连 destination，不会出声），300ms 采样一次 RMS 电平，
     * 换算成 0-100 音量打到 membersList.speaking 上，跟外放完全无关。
     */
    bindRemoteStreamPlayback(stream) {
      if (!stream || typeof stream.getUserId !== "function") return;
      const userId = String(stream.getUserId());
      if (!userId) return;

      let container = this._playbackRefs[userId];
      if (!container) {
        const elementId = `trtc-remote-audio-${userId}`;
        container = document.getElementById(elementId);
        if (!container) {
          container = document.createElement("div");
          container.id = elementId;
          container.style.display = "none";
          document.body.appendChild(container);
        }
        this._playbackRefs[userId] = container;
      }

      try {
        if (typeof stream.play === "function") {
          stream.play(container);
        }
        if (typeof stream.resume === "function") {
          stream.resume();
        }
      } catch (error) {
        console.warn("[voice-room] 远端流播放失败:", error && error.message, error);
      }
    },
    removeRemoteStreamPlayback(userId) {
      const container = this._playbackRefs[String(userId)];
      if (!container) return;
      try {
        if (typeof container.pause === "function") container.pause();
      } catch (error) {
        // 忽略清理过程的异常
      }
      try {
        if (container.parentNode) container.parentNode.removeChild(container);
      } catch (error) {
        // 忽略清理过程的异常
      }
      delete this._playbackRefs[String(userId)];
    },
    ensureAudioContext() {
      if (this._audioAnalysis.ctx && this._audioAnalysis.ctx.state !== "closed") {
        return this._audioAnalysis.ctx;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        console.warn("[voice-room] 当前浏览器不支持 WebAudio，无法检测说话人");
        return null;
      }
      const ctx = new Ctx();
      // 用户点开巡查面板本身就算一次交互，Chrome 的 sticky activation 已满足，
      // 这里顺手 resume 兜底，避免个别浏览器起步就是 suspended。
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {
          console.warn("[voice-room] AudioContext resume 失败，说话人检测可能不工作");
        });
      }
      this._audioAnalysis.ctx = ctx;
      return ctx;
    },
    /** 建一个 userId 的分析器；已存在则重建（轨道被替换时也走这里）。 */
    attachAnalyser(userId, stream) {
      const key = String(userId || "");
      if (!key) return;
      const track = stream && stream.getAudioTrack ? stream.getAudioTrack() : null;
      if (!track) {
        console.warn("[voice-room] 订阅流没有音频轨道: userId =", key, "已跳过分析");
        this.detachAnalyser(key);
        return;
      }
      const ctx = this.ensureAudioContext();
      if (!ctx) return;
      this.detachAnalyser(key);
      try {
        const source = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser);
        this._audioAnalysis.entries[key] = {
          analyser,
          source,
          stream,
          data: new Float32Array(analyser.fftSize),
        };
        console.warn(
          "[voice-room] 说话人分析器就绪: userId =",
          key,
          ", trackId =",
          track.id,
          ", readyState =",
          track.readyState,
          ", enabled =",
          track.enabled,
          ", ctx.state =",
          ctx.state
        );
      } catch (error) {
        console.warn("[voice-room] 音频分析器创建失败:", error);
      }
    },
    detachAnalyser(userId) {
      const entry = this._audioAnalysis.entries[String(userId)];
      if (!entry) return;
      try {
        entry.source.disconnect();
      } catch (error) {
        // 忽略：source 可能已经被 SDK/浏览器释放
      }
      delete this._audioAnalysis.entries[String(userId)];
    },
    /** 采样一次所有分析器，把 RMS 换算成 0-100 电平写回成员说话状态。 */
    tickAudioAnalysis() {
      const entries = this._audioAnalysis.entries;
      const levels = {};
      Object.keys(entries).forEach((key) => {
        try {
          const entry = entries[key];
          entry.analyser.getFloatTimeDomainData(entry.data);
          let sum = 0;
          for (let i = 0; i < entry.data.length; i += 1) {
            const sample = entry.data[i];
            sum += sample * sample;
          }
          levels[key] = Math.min(100, Math.round(Math.sqrt(sum / entry.data.length) * 220));
        } catch (error) {
          // 单条流分析失败不影响其他人
        }
      });
      this.membersList = this.membersList.map((member) => ({
        ...member,
        speaking: (levels[String(member.id)] || 0) > SPEAKING_THRESHOLD,
      }));
      this.emitCurrentSpeakers();
    },
    /** 在进房成功后启动。stream-subscribed 会先把各流的分析器建好。 */
    startAudioAnalysis() {
      this.stopAudioAnalysis();
      if (this._audioAnalysis.timer) return;
      this._audioAnalysis.timer = setInterval(() => this.tickAudioAnalysis(), VOLUME_EVAL_INTERVAL);
      this.logAudioDevices();
      this.runAudioContextSelfTest();
    },
    /** 退房/被踢/换房时彻底释放，避免跨房间残留分析器和采样定时器。 */
    stopAudioAnalysis() {
      Object.keys(this._audioAnalysis.entries).forEach((key) => this.detachAnalyser(key));
      if (this._audioAnalysis.timer) {
        clearInterval(this._audioAnalysis.timer);
        this._audioAnalysis.timer = null;
      }
      if (this._audioAnalysis.ctx) {
        try {
          this._audioAnalysis.ctx.close();
        } catch (error) {
          // 忽略：可能已被重复关闭
        }
        this._audioAnalysis.ctx = null;
      }
      Object.keys(this._playbackRefs || {}).forEach((key) => this.removeRemoteStreamPlayback(key));
    },
    /** 安全上下文检查：HTTP 非安全源下浏览器禁播远端音频且隐藏 mediaDevices。 */
    checkInsecureContext() {
      const insecure = typeof window !== "undefined" && window.isSecureContext === false;
      this.insecureContext = insecure;
      if (insecure && !this._insecureLogged) {
        this._insecureLogged = true;
        console.warn(
          "[voice-room] 当前页面是非安全上下文（" + location.protocol + "）：",
          "浏览器禁止带声播放远端音频并隐藏 navigator.mediaDevices，",
          "任何客户端音量分析都将恒为 0，无法判断「说话中」。",
          "请改走 HTTPS 或 http://localhost（localhost 算数）再验证。"
        );
      }
    },
    /** 诊断：机器到底有没有音频输出设备（Chromium 没设备时整个音频图是哑的）。 */
    logAudioDevices() {
      if (this._deviceLogged) return;
      this._deviceLogged = true;
      try {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== "function") {
          console.warn(
            "[voice-room] 浏览器不支持设备枚举" +
              (window.isSecureContext
                ? "（安全上下文下 mediaDevices 却不可用，属极端受限环境）"
                : "（非安全上下文 HTTP 下 navigator.mediaDevices 本身不存在）")
          );
          return;
        }
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            const outputs = (devices || []).filter((device) => device && device.kind === "audiooutput");
            console.warn(
              "[voice-room] 音频输出设备:",
              outputs.length,
              outputs.map((device) => device.label || "(无标签 deviceId=" + (device.deviceId || "?") + ")")
            );
          })
          .catch((error) => {
            console.warn("[voice-room] 设备枚举失败:", error && error.message);
          });
      } catch (error) {
        console.warn("[voice-room] 设备枚举异常:", error);
      }
    },
    /** 自检：用振荡器喂我们自己的分析器，证明波形分析链路本身是通的。 */
    runAudioContextSelfTest() {
      const ctx = this.ensureAudioContext();
      if (!ctx || this._ctxSelfTested) return;
      this._ctxSelfTested = true;
      try {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        gain.gain.value = 0.3;
        oscillator.connect(gain).connect(analyser);
        oscillator.start();
        const data = new Float32Array(analyser.fftSize);
        setTimeout(() => {
          try {
            analyser.getFloatTimeDomainData(data);
          } catch (error) {
            console.warn("[voice-room] 音频自检读取异常:", error);
            return;
          }
          let peak = 0;
          for (let i = 0; i < data.length; i += 1) {
            peak = Math.max(peak, Math.abs(data[i]));
          }
          console.warn(
            "[voice-room] 音频自检:",
            peak > 0.001 ? "通过（峰值 " + peak.toFixed(3) + "）" : "失败（峰值 0）"
          );
          try {
            oscillator.stop();
          } catch (error) {
            // 忽略：振荡器可能已自行停止
          }
          oscillator.disconnect();
          gain.disconnect();
          analyser.disconnect();
        }, 300);
      } catch (error) {
        console.warn("[voice-room] 音频自检异常:", error);
      }
    },
    async enterRoom() {
      if (this.joining || this.connected) return;

      // trtcRoomId 是后端下发的 TRTC 房间号（19 位字符串雪花 ID）。
      // 取不到时退回业务 roomId（两者同源，都是雪花 ID）。
      const rawRoomId = this.trtcRoomId == null || this.trtcRoomId === ""
        ? this.roomId
        : this.trtcRoomId;
      const trtcRoomId = this.resolveTrtcRoomId(rawRoomId);
      if (!trtcRoomId) {
        console.warn(
          "巡查进房：TRTC 房间ID无法作为整数使用。收到的 trtcRoomId =",
          this.trtcRoomId,
          "，业务 roomId =",
          this.roomId,
          "，后端 credential =",
          this.userSig ? "（有此凭证）" : "（无凭证）"
        );
        this.$message.warning(
          this.trtcRoomId == null || this.trtcRoomId === ""
            ? "未获取到腾讯云房间ID，无法进入房间"
            : `腾讯云房间ID不是合法整数（${this.trtcRoomId}），无法进入房间`
        );
        return;
      }
      if (!this.userSig) {
        this.errorText = "未获取到巡查凭证，无法进入房间";
        return;
      }

      if (this.client && typeof this.client.isJoined === "function" && this.client.isJoined()) {
        const joinedRoomId = String(this._joinedRoomId || "");
        if (joinedRoomId && joinedRoomId === String(trtcRoomId)) {
          this.connected = true;
          this.errorText = "";
          return;
        }
      }

      if (!this.client) {
        this.initClient();
      }
      if (!this.client) return;

      this.joining = true;
      const targetRoomId = String(trtcRoomId);
      this._joinedRoomId = targetRoomId;
      try {
        await this.client.join({
          roomId: trtcRoomId,
          // 观众角色：只听不发。后端据此不把巡查账号算进房间在线人数。
          role: "audience",
        });

        /**
         * 静默巡查靠的是「不推流」，不是「推了再静音」。
         * 下面刻意不创建本地流、不调用 publish()，巡查账号全程不推音视频，
         * 所以天然不占麦位、不出声。关闭浮窗时 client.leave() 也只退自己，
         * 不会影响房间里其他人。
         *
         * 不要再补 setLocalAudioMuted / setDefaultMuteRemoteAudioStream 这类调用：
         * trtc-js-sdk 4.x 根本没有这些方法，写了也只是被 if 静默跳过的死代码，
         * 反而会让人误以为静音已经生效。真要推流只能靠 publish / unpublish 控制。
         */

        // 「说话中」不用 SDK 的 enableAudioVolumeEvaluation：它的音量要从 <audio>
        // 播出来的结果里采，操作员没外放设备/浏览器拦自动播放时恒为 0（巡查机常见）。
        // 改成对订阅到的音频轨自行做 WebAudio 波形分析（见 startAudioAnalysis），
        // 脱离播放，有没有喇叭都能识别谁在说话。
        this.startAudioAnalysis();

        this.connected = true;
        this.errorText = "";
      } catch (error) {
        const message = error && (error.message || String(error));
        if (/already joined room|calling client.join api|is calling client.join api/i.test(message)) {
          this.connected = true;
          this.errorText = "";
          this._joinedRoomId = targetRoomId;
          return;
        }
        console.error("进入语音房失败:", error);
        this.connected = false;
        this.errorText = "进入语音房失败，请稍后重试";
        this.$message.error("进入语音房失败");
      } finally {
        this.joining = false;
        if (this.destroyed) {
          this.leaveRoom();
        }
      }
    },
    /**
     * 「重新监听」：面向恢复场景。
     * - 没在监听：直接进房；若发现凭证缺失，不再干等，请父组件补拉一份新的。
     * - 正在监听：完整退房后重新进房（重新订阅音频，能再次触发 enableAutoPlayDialog
     *   的放行提示，这是恢复被拦语音的入口）；如果凭证缺失或已失效，同样先补拉再重进。
     * leaveRoom() 会把 listeningRequested 清掉，这里要把它还回去，避免后续 ensureListening 失效。
     */
    async reListen() {
      if (this.joining) return;

      if (!this.connected) {
        if (!this.userSig) return this.requestCredentialRefresh();
        return this.enterRoom();
      }

      this.joining = true;
      try {
        await this.leaveRoom();
        this.listeningRequested = true;
      } finally {
        this.joining = false;
      }

      if (!this.userSig) return this.requestCredentialRefresh();
      return this.enterRoom();
    },
    /** 凭证缺失/失效时请父组件重新领取，新凭证回来前不重复发请求 */
    requestCredentialRefresh() {
      if (this._pendingCredentialRefresh) return;
      this._pendingCredentialRefresh = true;
      this.$emit("credential-refresh-request");
    },
    /**
     * 父组件补拉完凭证后调用，把凭证相关的提示清掉并重新进入监听。
     * @param {boolean} hasCredential 是否真的领到了新凭证
     */
    retryEnter(hasCredential) {
      this._pendingCredentialRefresh = false;
      if (!hasCredential) return;
      this.errorText = "";
      this.listeningRequested = true;
      this.ensureListening();
    },
    handleBan(member) {
      if (!member || member.banned) return;
      this.$emit("ban-member", member);
    },
    /**
     * 禁用成功后把成员移出巡查画面。
     * 这里不做任何客户端踢人动作：TRTC Web SDK 4.x 没有 kickRemoteUser，
     * 浏览器也没有权限踢人。真实踢出由后端禁用接口在服务端调
     * RemoveUser / RemoveUserByStrRoomId 完成，被踢的人会收到 client-banned。
     * 所以这里只负责把画面同步过来，等 member-list 回来后自然消失。
     */
    async kickMember(member) {
      const key = String((member && member.id) || "");
      if (!key) return;

      this.membersList = this.membersList.filter((item) => String(item.id) !== key);
      this.$emit("member-kicked", member);
    },
    /**
     * 退房。关闭弹窗会显式调一次，组件销毁时 beforeDestroy 又会调一次，
     * 这里用 leavePromise 复用同一个流程，避免并发 leave() 把 SDK 状态搞乱。
     */
    async leaveRoom() {
      this.listeningRequested = false;
      if (this.leavePromise) return this.leavePromise;

      this.leavePromise = this.doLeave();
      try {
        return await this.leavePromise;
      } finally {
        this.leavePromise = null;
      }
    },
    async doLeave() {
      const client = this.client;
      if (!client || !client.leave) {
        this.resetRoomState();
        return;
      }

      try {
        await Promise.race([
          client.leave(),
          new Promise((resolve) => setTimeout(resolve, LEAVE_TIMEOUT)),
        ]);
      } catch (error) {
        console.warn("leave room error:", error);
      } finally {
        // leave() 只退房，不释放实例。反复开关巡查会不断累积 AudioContext 和
        // WebSocket，必须显式 destroy，否则长时间值守后浏览器会明显变卡。
        try {
          if (client && typeof client.destroy === "function") client.destroy();
        } catch (error) {
          console.warn("destroy trtc client error:", error);
        }
        this.resetRoomState();
      }
    },
    resetRoomState() {
      this.connected = false;
      this._joinedRoomId = "";
      this.client = null;
      this.stopAudioAnalysis();
      this.membersList = this.normalizeMembers(this.members || []);
      this.emitCurrentSpeakers();
    },
    /**
     * 把当前在说话的人收窄成 id + 昵称上报给父组件（用于缩小版浮窗的实时展示）。
     * 音量分析 300ms 采一次，父组件没必要跟着这么高频重渲染，
     * 所以只在「说话人集合」发生变化（有人开始/停止说话）时才 emit。
     */
    emitCurrentSpeakers() {
      const speakers = this.membersList
        .filter((member) => member.speaking)
        .map((member) => ({ id: String(member.id), name: member.name }));
      const signature = speakers.map((item) => item.id).join(",");
      if (signature === this._lastSpeakersSig) return;
      this._lastSpeakersSig = signature;
      this.$emit("speakers-change", speakers);
    },
  },
};
</script>

<style scoped lang="scss">
.tencent-room-viewer {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(90% 70% at 12% 0%, rgba(124, 58, 237, 0.16), transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015));
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 12px 30px rgba(8, 5, 28, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.viewer-state {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #b9c0e8;
  font-size: 13px;
  font-weight: 500;
  cursor: default;
}

.state-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);

  &.active {
    background: #34d399;
    box-shadow:
      0 0 0 4px rgba(52, 211, 153, 0.22),
      0 0 12px rgba(52, 211, 153, 0.6);
  }
}

.viewer-body {
  padding: 10px 16px;
}

.viewer-alert {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.35);
  color: #fcd978;
  font-size: 13px;
  line-height: 1.6;
}

.stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  font-weight: 700;
  color: #efe9ff;
}

.stage-actions {
  display: flex;
  align-items: center;
  gap: 12px;

  ::v-deep .el-button--primary.is-plain {
    background: rgba(139, 92, 246, 0.16);
    border-color: rgba(167, 139, 250, 0.5);
    color: #d9ccff;

    &:hover {
      background: rgba(139, 92, 246, 0.28);
      border-color: rgba(167, 139, 250, 0.85);
      color: #ffffff;
    }

    &.is-disabled,
    &[disabled] {
      background: rgba(139, 92, 246, 0.08);
      border-color: rgba(139, 92, 246, 0.25);
      color: rgba(217, 204, 255, 0.45);
    }
  }
}

.stage-online {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #34d399;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.25);

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2);
  }
}

.stage-insecure {
  font-size: 12px;
  font-weight: 400;
  color: #fcd978;
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.1);
  padding: 3px 12px;
}

.live-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px;
}

.live-member {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  padding: 16px 10px 12px;
  min-height: 176px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow:
    0 10px 26px rgba(8, 5, 28, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  transition: box-shadow 0.25s, transform 0.25s, border-color 0.25s;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    left: 12px;
    right: 12px;
    top: 0;
    height: 3px;
    border-radius: 0 0 6px 6px;
    background: linear-gradient(90deg, #a78bfa, #f472b6, #22d3ee);
    opacity: 0;
    transition: opacity 0.25s;
  }

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(167, 139, 250, 0.55);
    box-shadow:
      0 16px 34px rgba(8, 5, 28, 0.4),
      0 0 22px rgba(139, 92, 246, 0.22);

    &::before {
      opacity: 1;
    }
  }

  &.speaking {
    border-color: rgba(52, 211, 153, 0.55);
    box-shadow:
      0 0 0 1px rgba(52, 211, 153, 0.18),
      0 16px 34px rgba(8, 5, 28, 0.4),
      0 0 24px rgba(52, 211, 153, 0.18);

    &::before {
      opacity: 1;
      background: linear-gradient(90deg, #34d399, #22d3ee);
    }
  }

  &.placeholder {
    border-style: dashed;
    border-color: rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.02);
    color: #7f8ab5;
    justify-content: center;
    align-items: center;

    &:hover {
      border-color: rgba(167, 139, 250, 0.45);
      transform: none;
      box-shadow: none;
    }
  }
}

.live-avatar {
  position: relative;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  padding: 3px;
  margin: 0 auto 12px;
  background: linear-gradient(135deg, #a78bfa, #f472b6 55%, #22d3ee);
  box-shadow:
    0 0 18px rgba(139, 92, 246, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: box-shadow 0.3s, transform 0.3s;

  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    background: #251c47;
  }

  &:hover {
    box-shadow: 0 0 26px rgba(191, 148, 255, 0.55);
    transform: scale(1.05);
  }
}

/* 说话中：头像呼吸光环 */
.live-member.speaking .live-avatar {
  animation: speak-ring 1.6s ease-in-out infinite;
}

@keyframes speak-ring {
  0%,
  100% {
    box-shadow:
      0 0 0 0 rgba(52, 211, 153, 0.5),
      0 0 16px rgba(52, 211, 153, 0.4);
  }

  50% {
    box-shadow:
      0 0 0 7px rgba(52, 211, 153, 0),
      0 0 26px rgba(52, 211, 153, 0.65);
  }
}

.live-info {
  text-align: center;
}

.live-name {
  font-weight: 700;
  color: #f0eaff;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-meta {
  font-size: 12px;
  color: #8590bd;
  word-break: break-all;
}

.live-role {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #d8ccff;
  background: rgba(167, 139, 250, 0.16);
  border: 1px solid rgba(167, 139, 250, 0.3);
}

/* 不在业务名单里却出现在 TRTC 房间，需要一眼看出来 */
.live-role.unregistered {
  color: #fda4af;
  background: rgba(244, 63, 94, 0.14);
  border: 1px solid rgba(244, 63, 94, 0.35);
  font-weight: 700;
}

.live-status {
  position: absolute;
  right: 10px;
  top: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.14);
  border: 1px solid rgba(52, 211, 153, 0.3);
  color: #6ee7b7;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 说话中：均衡器小动画代替固定圆点 */
.live-status-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;

  i {
    width: 2.5px;
    border-radius: 2px;
    background: #34d399;
    animation: live-speak-bar 0.9s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.18s;
    }

    &:nth-child(3) {
      animation-delay: 0.36s;
    }
  }
}

@keyframes live-speak-bar {
  0%,
  100% {
    height: 4px;
  }

  50% {
    height: 12px;
  }
}

.ban-btn {
  display: block;
  margin: 10px auto 0;
  height: 26px;
  line-height: 24px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(244, 63, 94, 0.45);
  background: rgba(244, 63, 94, 0.12);
  color: #fda4af;

  &:hover {
    background: rgba(244, 63, 94, 0.26);
    border-color: rgba(244, 63, 94, 0.75);
    color: #fff;
  }

  &.is-disabled {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.14);
    color: rgba(144, 154, 190, 0.55);
  }
}

.live-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.placeholder-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.03);
  color: #7e8ab8;
  font-size: 22px;
  box-sizing: border-box;
}

.placeholder-text {
  font-size: 12px;
  font-weight: 600;
  color: #7f8ab5;
  letter-spacing: 0.5px;
}

.empty-room {
  padding: 40px 0;
  text-align: center;
  color: #7f8ab5;
}
</style>
