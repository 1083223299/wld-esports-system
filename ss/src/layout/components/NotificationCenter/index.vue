<template>
  <div class="notification-center" @click.stop>
    <button
      type="button"
      class="message-center-trigger"
      :class="{
        'is-charging': charging,
        'is-open': visible,
        'has-unread': effectiveUnread > 0,
      }"
      aria-label="打开消息中心"
      @mousedown="beginCharge"
      @click.stop="togglePanel"
    >
      <canvas ref="triggerCanvas" class="message-center-trigger__canvas"></canvas>
      <span class="message-center-trigger__halo"></span>
      <span class="message-center-trigger__orbit"></span>
      <i class="el-icon-bell"></i>
      <span v-if="effectiveUnread > 0" class="message-center-trigger__badge">
        {{ compactUnread }}
      </span>
    </button>

    <el-drawer
      :visible.sync="visible"
      direction="rtl"
      size="440px"
      custom-class="message-center-drawer"
      append-to-body
      :with-header="false"
      :wrapper-closable="true"
      :close-on-press-escape="true"
      @open="handlePanelOpening"
      @opened="handlePanelShown"
      @closed="handlePanelHidden"
    >
      <section
        ref="panel"
        class="message-center-panel"
        @mousemove="handlePanelPointer"
        @mouseleave="resetPanelPointer"
      >
        <canvas ref="panelCanvas" class="message-center-canvas" aria-hidden="true"></canvas>
        <button
          type="button"
          class="message-center-collapse"
          title="收起消息中心（也可按 Esc）"
          @click="visible = false"
        >
          <i class="el-icon-arrow-right"></i>
          <span>收起</span>
        </button>

        <header class="message-center-hero">
          <div class="message-center-hero__glow"></div>
          <div class="message-center-emblem">
            <span class="message-center-emblem__ring"></span>
            <span class="message-center-emblem__ring message-center-emblem__ring--inner"></span>
            <span class="message-center-emblem__core">
              <i class="el-icon-bell"></i>
            </span>
          </div>

          <div class="message-center-heading">
            <div class="message-center-eyebrow">
              <span class="message-center-live-dot"></span>
              REAL-TIME MESSAGE HUB
            </div>
            <div class="message-center-title-row">
              <h3>消息中心</h3>
              <span class="message-center-unread-chip">{{ unreadText }}</span>
            </div>
            <p>业务动态实时汇聚，重要待办即刻触达</p>
          </div>

          <button
            type="button"
            class="message-center-read-all"
            :disabled="effectiveUnread <= 0 || markingAll"
            @click.stop="markAllRead"
          >
            <i :class="markingAll ? 'el-icon-loading' : 'el-icon-check'"></i>
            {{ markingAll ? "处理中" : "全部已读" }}
          </button>
        </header>

        <div class="message-center-toolbar">
          <div class="message-center-tabs">
            <button
              type="button"
              :class="{ active: activeTab === 'all' }"
              @click.stop="switchTab('all')"
            >
              全部消息
            </button>
            <button
              type="button"
              :class="{ active: activeTab === 'unread' }"
              @click.stop="switchTab('unread')"
            >
              仅看未读
              <span v-if="effectiveUnread > 0">{{ compactUnread }}</span>
            </button>
          </div>
          <div class="message-center-sync">
            <i class="el-icon-refresh"></i>
            实时同步
          </div>
        </div>

        <div ref="messageList" class="message-center-list" @scroll="handleListScroll">
          <div v-if="initialLoading" class="message-center-skeletons">
            <div v-for="index in 4" :key="index" class="message-center-skeleton">
              <span></span>
              <div><i></i><i></i><i></i></div>
            </div>
          </div>

          <div v-else-if="!systemMessages.length" class="message-center-empty">
            <div class="message-center-empty__planet">
              <span></span>
              <i class="el-icon-bell"></i>
            </div>
            <strong>消息星域暂时安静</strong>
            <p>新的业务消息会实时出现在这里</p>
          </div>

          <article
            v-for="(message, index) in systemMessages"
            v-else
            :key="message.reminderId || message.messageId"
            class="message-center-card"
            :class="{ 'is-unread': !message.isRead, 'is-read': message.isRead }"
            :style="{ '--card-delay': `${Math.min(index, 8) * 42}ms` }"
            @click="openMessage(message)"
          >
            <span class="message-center-card__rail"></span>
            <div
              class="message-center-card__icon"
              :class="`is-${resolveTypeTheme(message.type)}`"
            >
              <i :class="resolveTypeIcon(message.type)"></i>
            </div>

            <div class="message-center-card__main">
              <div class="message-center-card__meta">
                <span>{{ resolveTypeLabel(message.type) }}</span>
                <span v-if="!message.isRead" class="message-center-card__unread">未读</span>
              </div>
              <h4>{{ message.title || "系统通知" }}</h4>
              <p v-if="message.titleInner" class="message-center-card__inner">
                {{ message.titleInner }}
              </p>
              <div
                v-if="formatMessageContent(message.content).length"
                class="message-center-card__content"
              >
                <p
                  v-for="(line, lineIndex) in formatMessageContent(message.content)"
                  :key="`${message.reminderId || message.messageId}-${lineIndex}`"
                >
                  {{ line }}
                </p>
              </div>
            </div>

            <button type="button" class="message-center-card__action">
              <i class="el-icon-right"></i>
            </button>
          </article>

          <div v-if="moreLoading" class="message-center-loading">
            <span></span><span></span><span></span>
          </div>
          <div
            v-else-if="!hasMore && systemMessages.length"
            class="message-center-end"
          >
            已抵达消息流尽头
          </div>
        </div>
      </section>
    </el-drawer>
  </div>
</template>

<script>
import { mapGetters } from "vuex";

const OPEN_DELAY = 250;
const POLL_INTERVAL = 20000;
const PAGE_SIZE = 50;

export default {
  name: "NotificationCenter",
  data() {
    return {
      visible: false,
      charging: false,
      activeTab: "all",
      pageNum: 1,
      hasMore: true,
      initialLoading: false,
      moreLoading: false,
      markingAll: false,
      chargeTimer: null,
      pollTimer: null,
      triggerRaf: null,
      panelRaf: null,
      panelResizeHandler: null,
      panelParticles: [],
      panelPointer: { x: -1000, y: -1000, active: false },
      prefersReducedMotion: false,
    };
  },
  computed: {
    ...mapGetters(["unreadCount", "unreadTotal", "systemMessages"]),
    effectiveUnread() {
      return Number(this.unreadTotal || this.unreadCount || 0);
    },
    compactUnread() {
      return this.effectiveUnread > 99 ? "99+" : this.effectiveUnread;
    },
    unreadText() {
      return this.effectiveUnread > 0
        ? `${this.compactUnread} 条未读`
        : "已全部阅读";
    },
  },
  mounted() {
    this.prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.fetchUnreadCount();
    this.startPolling();
  },
  beforeDestroy() {
    this.clearChargeTimer();
    this.stopPolling();
    this.stopTriggerEffect();
    this.stopPanelParticles();
  },
  methods: {
    beginCharge() {
      if (this.visible) return;
      this.charging = true;
      this.startTriggerEffect();
    },
    togglePanel() {
      if (this.visible) {
        this.visible = false;
        this.charging = false;
        this.clearChargeTimer();
        return;
      }
      if (this.chargeTimer) return;
      this.charging = true;
      this.startTriggerEffect();
      this.chargeTimer = window.setTimeout(() => {
        this.visible = true;
        this.charging = false;
        this.chargeTimer = null;
      }, this.prefersReducedMotion ? 0 : OPEN_DELAY);
    },
    clearChargeTimer() {
      if (this.chargeTimer) {
        window.clearTimeout(this.chargeTimer);
        this.chargeTimer = null;
      }
    },
    handlePanelOpening() {
      this.loadMessages(this.activeTab);
    },
    handlePanelShown() {
      this.$nextTick(() => {
        this.startPanelParticles();
      });
    },
    handlePanelHidden() {
      this.stopPanelParticles();
      this.resetPanelPointer();
    },
    async loadMessages(filter = "all", preserveScroll = false) {
      const list = this.$refs.messageList;
      const previousScroll = list ? list.scrollTop : 0;
      this.initialLoading = !this.systemMessages.length;
      this.pageNum = 1;
      this.hasMore = true;
      try {
        const result = await this.$store.dispatch(
          "notification/loadSystemMessages",
          { filter, pageSize: PAGE_SIZE, pageNum: 1 }
        );
        this.activeTab = filter;
        if (result && result.total !== undefined) {
          this.hasMore = this.systemMessages.length < result.total;
        }
      } finally {
        this.initialLoading = false;
        this.$nextTick(() => {
          if (this.$refs.messageList) {
            this.$refs.messageList.scrollTop = preserveScroll
              ? previousScroll
              : 0;
          }
        });
      }
    },
    async loadMoreMessages() {
      if (this.moreLoading || !this.hasMore) return;
      this.moreLoading = true;
      this.pageNum += 1;
      try {
        const result = await this.$store.dispatch(
          "notification/loadMoreMessages",
          {
            filter: this.activeTab,
            pageSize: PAGE_SIZE,
            pageNum: this.pageNum,
          }
        );
        if (result && result.total !== undefined) {
          this.hasMore = this.systemMessages.length < result.total;
        }
      } finally {
        this.moreLoading = false;
      }
    },
    handleListScroll() {
      const list = this.$refs.messageList;
      if (!list) return;
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 18) {
        this.loadMoreMessages();
      }
    },
    switchTab(tab) {
      if (tab === this.activeTab || this.initialLoading) return;
      this.loadMessages(tab);
    },
    async fetchUnreadCount() {
      await this.$store.dispatch("notification/fetchUnreadCount");
    },
    async markAllRead() {
      if (this.markingAll || this.effectiveUnread <= 0) return;
      this.markingAll = true;
      try {
        await this.$store.dispatch("notification/markAllMessagesRead", {
          filter: this.activeTab,
          pageSize: PAGE_SIZE,
          pageNum: 1,
        });
      } finally {
        this.markingAll = false;
      }
    },
    resolveDynamicRoutePath(componentName) {
      const joinPath = (parentPath, routePath) => {
        if (String(routePath || "").startsWith("/")) return routePath;
        return `${String(parentPath || "").replace(/\/+$/, "")}/${String(
          routePath || ""
        ).replace(/^\/+/, "")}`.replace(/\/+/g, "/");
      };
      const walk = (routes, parentPath = "") => {
        for (const route of routes || []) {
          const fullPath = joinPath(parentPath, route.path);
          const component = route.component;
          const name =
            component &&
            (component.name || (component.options && component.options.name));
          if (name === componentName) return fullPath;
          const childPath = walk(route.children, fullPath);
          if (childPath) return childPath;
        }
        return "";
      };
      return walk(this.$store.getters.addRoutes || []);
    },
    isRegisteredRoute(path) {
      const matched = this.$router.match(path);
      return Boolean(
        matched &&
          matched.matched &&
          matched.matched.some((record) => record.path !== "*")
      );
    },
    async openMessage(message) {
      const routeMap = {
        skill: "/userManagement/userSkillAudit",
        "skill-technology": "/userManagement/userSkillAudit",
        "union-transaction": "/financialManagement/cashoutApproval",
        feedback: "/marketing/feedback",
        report: "/marketing/reportComplaint",
        photo: "/userManagement/userAlbumAudit",
        "join-peipei-success": "/unionManagement/unionSupport",
        "join-peipei-fail": "/unionManagement/unionSupport",
        "future-coin-deduction": "/marketing/DeductionApproval",
        union_exit: "/personnelManagement/exitReview",
        // 订单/个人侧保证金扣除审核
        deposit_deduction: "/marketing/DepositDeductAudit",
        // 俱乐部保证金查询页
        deposit_deduction_club: "/financialManagement/ClubDeposit",
        // 个人保证金提现：系统打款失败 / 待审核
        "deposit-withdraw-personal-pay-fail":
          "/financialManagement/DepositWithdrawAudit",
        "deposit-withdraw-personal-audit":
          "/financialManagement/DepositWithdrawAudit",
        // 俱乐部保证金提现
        "deposit-withdraw-club-audit":
          "/financialManagement/DepositWithdrawAudit",
        "deposit-withdraw-club-reject":
          "/financialManagement/DepositWithdrawAudit",
        "deposit-withdraw-club-pay-success":
          "/financialManagement/DepositWithdrawAudit",
        "deposit-withdraw-club-pay-fail":
          "/financialManagement/DepositWithdrawAudit",
        "club-exit-audit": "/unionManagement/TerminateCooperation",
        "merchant-companion-apply": "/merchant/merchantPlaymateAudit",
        "merchant-companion-approved": "/merchant/merchantPlaymateAudit",
        "merchant-companion-rejected": "/merchant/merchantPlaymateAudit",
      };
      const targetComponentMap = {
        skill: "UserSkillAudit",
        "skill-technology": "UserSkillAudit",
        "union-transaction": "CashoutApproval",
        feedback: "MarketingFeedback",
        report: "reportComplaint",
        photo: "UserAlbumAudit",
        "join-peipei-success": "UnionSupport",
        "join-peipei-fail": "UnionSupport",
        "future-coin-deduction": "DeductionApproval",
        union_exit: "ExitReview",
        deposit_deduction: "DepositDeductAudit",
        deposit_deduction_club: "ClubDeposit",
        "deposit-withdraw-personal-pay-fail": "DepositWithdrawAudit",
        "deposit-withdraw-personal-audit": "DepositWithdrawAudit",
        "deposit-withdraw-club-audit": "DepositWithdrawAudit",
        "deposit-withdraw-club-reject": "DepositWithdrawAudit",
        "deposit-withdraw-club-pay-success": "DepositWithdrawAudit",
        "deposit-withdraw-club-pay-fail": "DepositWithdrawAudit",
        "club-exit-audit": "TerminateCooperation",
        "merchant-companion-apply": "MerchantPlaymateAudit",
        "merchant-companion-approved": "MerchantPlaymateAudit",
        "merchant-companion-rejected": "MerchantPlaymateAudit",
      };
      const fallbackPath = routeMap[message.type];
      if (!fallbackPath) return;
      const path =
        this.resolveDynamicRoutePath(targetComponentMap[message.type]) ||
        fallbackPath;
      if (!this.isRegisteredRoute(path)) {
        this.$message.warning("当前账号无该页面权限，或后台菜单路由未配置");
        return;
      }

      await this.$store.dispatch("notification/markMessageRead", message);
      this.visible = false;

      const query = {};
      if (message.type === "skill-technology") {
        query.applyType = "2";
      } else if (message.type === "skill") {
        const title = String(message.title || "");
        if (title.includes("技术陪")) query.applyType = "2";
        else query.applyType = "1";
      } else if (
        message.type === "join-peipei-success" ||
        message.type === "join-peipei-fail"
      ) {
        query.page = "invitation";
      } else if (message.type === "deposit-withdraw-personal-pay-fail") {
        query.tab = "personal";
        query.status = "5";
      } else if (message.type === "deposit-withdraw-personal-audit") {
        query.tab = "personal";
        query.status = "0";
      } else if (message.type === "deposit-withdraw-club-audit") {
        query.tab = "club";
        query.status = "0";
      } else if (message.type === "deposit-withdraw-club-reject") {
        query.tab = "club";
        query.status = "2";
      } else if (message.type === "deposit-withdraw-club-pay-success") {
        query.tab = "club";
        query.status = "9";
      } else if (message.type === "deposit-withdraw-club-pay-fail") {
        query.tab = "club";
        query.status = "8";
      } else if (message.type === "club-exit-audit") {
        query.status = "0";
      } else if (message.type === "merchant-companion-apply") {
        query.merchantAuditStatus = "";
      } else if (message.type === "merchant-companion-approved") {
        query.merchantAuditStatus = "";
      } else if (message.type === "merchant-companion-rejected") {
        query.merchantAuditStatus = "";
      }
      const parenId = String(message.content || "").match(/（(\d{5,})）/);
      if (
        message.type === "deposit-withdraw-personal-pay-fail" ||
        message.type === "deposit-withdraw-personal-audit"
      ) {
        if (parenId) query.userId = parenId[1];
      }
      if (message.type === "deposit-withdraw-club-audit") {
        if (parenId) query.clubId = parenId[1];
      }
      if (message.type === "club-exit-audit") {
        const tradeIdMatch = String(message.content || "").match(/公会ID[：:]\s*(\d+)/);
        if (tradeIdMatch) query.tradeId = tradeIdMatch[1];
      }
      if (message.correlationId != null && message.correlationId !== "") {
        query.correlationId = String(message.correlationId);
        if (
          message.type === "merchant-companion-apply" ||
          message.type === "merchant-companion-approved" ||
          message.type === "merchant-companion-rejected"
        ) {
          query.applyId = String(message.correlationId);
        }
      }

      const currentQuery = this.$route.query || {};
      const samePath = this.$route.path === path;
      const sameQuery = Object.keys(query).every(
        (key) => String(currentQuery[key] || "") === String(query[key] || "")
      );
      if (samePath && sameQuery) return;

      this.$router.push({
        path,
        query: Object.keys(query).length ? query : undefined,
      });
    },
    resolveTypeLabel(type) {
      const labels = {
        skill: "技能审核",
        "skill-technology": "技能审核",
        feedback: "意见反馈",
        report: "举报查看",
        "union-transaction": "工会提现",
        photo: "相册审批",
        "join-peipei-success": "加入陪陪",
        "join-peipei-fail": "加入陪陪",
        "future-coin-deduction": "未来币扣除",
        union_exit: "工会退出",
        deposit_deduction: "保证金扣除",
        deposit_deduction_club: "俱乐部保证金",
        "deposit-withdraw-personal-pay-fail": "保证金打款失败",
        "deposit-withdraw-personal-audit": "保证金提现审核",
        "deposit-withdraw-club-audit": "保证金提现审核",
        "deposit-withdraw-club-reject": "保证金提现驳回",
        "deposit-withdraw-club-pay-success": "保证金提现打款",
        "deposit-withdraw-club-pay-fail": "保证金提现打款",
        "club-exit-audit": "终止合作审核",
        "merchant-companion-apply": "陪陪审核",
        "merchant-companion-approved": "陪陪审核",
        "merchant-companion-rejected": "陪陪审核",
      };
      return labels[type] || "系统通知";
    },
    resolveTypeIcon(type) {
      const icons = {
        skill: "el-icon-medal",
        "skill-technology": "el-icon-s-opportunity",
        feedback: "el-icon-chat-dot-round",
        report: "el-icon-warning-outline",
        "union-transaction": "el-icon-wallet",
        photo: "el-icon-picture-outline",
        "join-peipei-success": "el-icon-circle-check",
        "join-peipei-fail": "el-icon-circle-close",
        "future-coin-deduction": "el-icon-coin",
        union_exit: "el-icon-switch-button",
        deposit_deduction: "el-icon-wallet",
        deposit_deduction_club: "el-icon-wallet",
        "deposit-withdraw-personal-pay-fail": "el-icon-warning-outline",
        "deposit-withdraw-personal-audit": "el-icon-wallet",
        "deposit-withdraw-club-audit": "el-icon-wallet",
        "deposit-withdraw-club-reject": "el-icon-circle-close",
        "deposit-withdraw-club-pay-success": "el-icon-circle-check",
        "deposit-withdraw-club-pay-fail": "el-icon-warning-outline",
        "club-exit-audit": "el-icon-s-release",
        "merchant-companion-apply": "el-icon-user",
        "merchant-companion-approved": "el-icon-circle-check",
        "merchant-companion-rejected": "el-icon-circle-close",
      };
      return icons[type] || "el-icon-message";
    },
    resolveTypeTheme(type) {
      if (
        [
          "report",
          "join-peipei-fail",
          "union_exit",
          "deposit-withdraw-club-reject",
          "deposit-withdraw-club-pay-fail",
          "merchant-companion-rejected",
        ].includes(type)
      ) {
        return "rose";
      }
      if (
        [
          "union-transaction",
          "future-coin-deduction",
          "deposit_deduction",
          "deposit_deduction_club",
          "deposit-withdraw-personal-pay-fail",
          "deposit-withdraw-personal-audit",
          "deposit-withdraw-club-audit",
          "deposit-withdraw-club-pay-success",
          "club-exit-audit",
          "merchant-companion-apply",
        ].includes(type)
      ) {
        return "amber";
      }
      if (["feedback", "join-peipei-success", "merchant-companion-approved"].includes(type)) {
        return "cyan";
      }
      return "violet";
    },
    /** 将 content 按换行拆成多行展示，去掉行尾多余逗号 */
    formatMessageContent(content) {
      if (content === null || content === undefined || content === "") {
        return [];
      }
      return String(content)
        .replace(/\\n/g, "\n")
        .split(/\r?\n/)
        .map((line) => line.replace(/,\s*$/, "").trim())
        .filter(Boolean);
    },
    startPolling() {
      this.stopPolling();
      this.pollTimer = window.setInterval(() => {
        if (this.visible) {
          this.loadMessages(this.activeTab, true);
        }
        this.fetchUnreadCount();
      }, POLL_INTERVAL);
    },
    stopPolling() {
      if (this.pollTimer) {
        window.clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    startTriggerEffect() {
      if (this.prefersReducedMotion) return;
      this.stopTriggerEffect();
      const canvas = this.$refs.triggerCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = 76;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const center = size / 2;
      const start = performance.now();
      const sparks = Array.from({ length: 20 }).map((_, index) => ({
        angle: (Math.PI * 2 * index) / 20 + Math.random() * 0.18,
        distance: 29 + Math.random() * 9,
        radius: 1 + Math.random() * 1.2,
        color: index % 3 === 0 ? "#66dfff" : "#9164ff",
      }));

      const draw = (now) => {
        const progress = Math.min((now - start) / OPEN_DELAY, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        ctx.clearRect(0, 0, size, size);
        sparks.forEach((spark) => {
          const distance = spark.distance * (1 - eased);
          const angle = spark.angle + progress * 1.8;
          const x = center + Math.cos(angle) * distance;
          const y = center + Math.sin(angle) * distance;
          ctx.beginPath();
          ctx.fillStyle = spark.color;
          ctx.shadowColor = spark.color;
          ctx.shadowBlur = 8;
          ctx.globalAlpha = 0.25 + progress * 0.75;
          ctx.arc(x, y, spark.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        if (progress < 1) {
          this.triggerRaf = window.requestAnimationFrame(draw);
        } else {
          ctx.clearRect(0, 0, size, size);
          this.triggerRaf = null;
          if (!this.chargeTimer && !this.visible) {
            this.charging = false;
          }
        }
      };
      this.triggerRaf = window.requestAnimationFrame(draw);
    },
    stopTriggerEffect() {
      if (this.triggerRaf) {
        window.cancelAnimationFrame(this.triggerRaf);
        this.triggerRaf = null;
      }
    },
    startPanelParticles() {
      if (this.prefersReducedMotion) return;
      this.stopPanelParticles();
      const canvas = this.$refs.panelCanvas;
      const panel = this.$refs.panel;
      if (!canvas || !panel) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const resize = () => {
        const rect = panel.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.seedPanelParticles(rect.width, rect.height);
      };
      this.panelResizeHandler = resize;
      resize();
      window.addEventListener("resize", resize);

      const draw = () => {
        const width = panel.clientWidth;
        const height = panel.clientHeight;
        ctx.clearRect(0, 0, width, height);
        this.panelParticles.forEach((particle, index) => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.phase += particle.speed;
          if (particle.x < -8) particle.x = width + 8;
          if (particle.x > width + 8) particle.x = -8;
          if (particle.y < -8) particle.y = height + 8;
          if (particle.y > height + 8) particle.y = -8;

          if (this.panelPointer.active) {
            const dx = particle.x - this.panelPointer.x;
            const dy = particle.y - this.panelPointer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0 && distance < 82) {
              const force = (82 - distance) / 82;
              particle.x += (dx / distance) * force * 1.25;
              particle.y += (dy / distance) * force * 1.25;
            }
          }

          ctx.beginPath();
          ctx.globalAlpha = 0.34 + Math.sin(particle.phase) * 0.15;
          ctx.fillStyle = particle.color;
          ctx.shadowColor = particle.color;
          ctx.shadowBlur = 7;
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fill();

          for (
            let nextIndex = index + 1;
            nextIndex < this.panelParticles.length;
            nextIndex += 1
          ) {
            const next = this.panelParticles[nextIndex];
            const dx = particle.x - next.x;
            const dy = particle.y - next.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 64) {
              ctx.beginPath();
              ctx.globalAlpha = 0.045 * (1 - distance / 64);
              ctx.strokeStyle = "#7759db";
              ctx.lineWidth = 0.6;
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(next.x, next.y);
              ctx.stroke();
            }
          }
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        this.panelRaf = window.requestAnimationFrame(draw);
      };
      this.panelRaf = window.requestAnimationFrame(draw);
    },
    seedPanelParticles(width, height) {
      const palette = ["#8f5cff", "#65b9ff", "#d477ff"];
      const count = Math.min(
        42,
        Math.max(25, Math.floor((width * height) / 9000))
      );
      this.panelParticles = Array.from({ length: count }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.05 - Math.random() * 0.15,
        radius: 0.7 + Math.random() * 1.25,
        phase: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.025,
        color: palette[Math.floor(Math.random() * palette.length)],
      }));
    },
    handlePanelPointer(event) {
      const panel = this.$refs.panel;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      this.panelPointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
    },
    resetPanelPointer() {
      this.panelPointer.active = false;
    },
    stopPanelParticles() {
      if (this.panelRaf) {
        window.cancelAnimationFrame(this.panelRaf);
        this.panelRaf = null;
      }
      if (this.panelResizeHandler) {
        window.removeEventListener("resize", this.panelResizeHandler);
        this.panelResizeHandler = null;
      }
      this.panelParticles = [];
    },
  },
};
</script>

<style lang="scss">
.notification-center {
  display: inline-flex;
  align-items: center;
  height: 100%;
}

.message-center-trigger {
  position: relative;
  width: 40px;
  height: 40px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  overflow: visible;
  border: none;
  border-radius: 14px;
  color: #606273;
  font-size: 20px;
  cursor: pointer;
  background: transparent;
  transition: color 0.25s ease, background 0.25s ease, transform 0.25s ease;
}

.message-center-trigger:hover,
.message-center-trigger.is-open {
  color: #7851de;
  background: rgba(126, 87, 224, 0.08);
  transform: translateY(-1px);
}

.message-center-trigger__canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 76px;
  height: 76px;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.message-center-trigger > i {
  position: relative;
  z-index: 3;
}

.message-center-trigger__halo,
.message-center-trigger__orbit {
  position: absolute;
  inset: 4px;
  border-radius: 12px;
  pointer-events: none;
}

.message-center-trigger__halo {
  opacity: 0;
  background: radial-gradient(circle, rgba(130, 87, 232, 0.25), transparent 68%);
}

.message-center-trigger__orbit {
  inset: 1px;
  border: 1px solid transparent;
}

.message-center-trigger.has-unread .message-center-trigger__halo {
  opacity: 1;
  animation: message-trigger-breathe 2.2s ease-in-out infinite;
}

.message-center-trigger.is-charging .message-center-trigger__orbit {
  border-top-color: #8e5cff;
  border-right-color: #62c9ff;
  animation: message-trigger-spin 0.42s linear infinite;
}

.message-center-trigger.is-charging > i {
  animation: message-trigger-charge 0.25s ease-out both;
}

.message-center-trigger__badge {
  position: absolute;
  top: 1px;
  right: 0;
  z-index: 4;
  min-width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid #fff;
  border-radius: 9px;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 12px;
  background: linear-gradient(135deg, #ff728f, #f04673);
  box-shadow: 0 4px 9px rgba(240, 70, 115, 0.3);
}

.message-center-trigger.is-charging .message-center-trigger__badge {
  animation: message-badge-flash 0.25s ease-out both;
}

.message-center-drawer.el-drawer {
  overflow: visible;
  background: #fff;
  box-shadow:
    -30px 0 80px rgba(67, 51, 113, 0.2),
    -5px 0 18px rgba(64, 50, 105, 0.07);
  will-change: transform;
  transition: transform 0.46s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.message-center-drawer .el-drawer__body {
  height: 100%;
  overflow: visible;
}

.message-center-panel {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 8% 0%, rgba(141, 87, 235, 0.08), transparent 27%),
    radial-gradient(circle at 100% 30%, rgba(84, 190, 255, 0.07), transparent 24%),
    linear-gradient(180deg, #fbfaff 0%, #fff 38%, #fafbff 100%);
}

.message-center-canvas {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.55;
}

.message-center-collapse {
  position: absolute;
  top: 50%;
  left: 0;
  z-index: 20;
  width: 31px;
  min-height: 92px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 0;
  border: 1px solid rgba(126, 91, 232, 0.16);
  border-left: none;
  border-radius: 0 15px 15px 0;
  color: #7355ca;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    7px 0 20px rgba(77, 59, 128, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(14px);
  transform: translateY(-50%);
  transition: width 0.22s ease, color 0.22s ease, background 0.22s ease,
    box-shadow 0.22s ease;
}

.message-center-collapse span {
  font-size: 10px;
  letter-spacing: 2px;
  writing-mode: vertical-rl;
}

.message-center-collapse:hover {
  width: 36px;
  color: #fff;
  background: linear-gradient(180deg, #8f55ed, #6874e9);
  box-shadow: 8px 0 24px rgba(105, 75, 200, 0.24);
}

.message-center-hero {
  position: relative;
  flex: 0 0 auto;
  min-height: 152px;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 23px 20px 20px;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 88% 0%, rgba(97, 211, 255, 0.26), transparent 32%),
    linear-gradient(128deg, #35205f 0%, #6541bc 55%, #7867d8 100%);
}

.message-center-hero::after {
  content: "";
  position: absolute;
  right: -55px;
  bottom: -75px;
  width: 210px;
  height: 150px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  transform: rotate(-18deg);
}

.message-center-hero__glow {
  position: absolute;
  top: -70px;
  left: 28%;
  width: 190px;
  height: 170px;
  border-radius: 50%;
  background: rgba(177, 132, 255, 0.3);
  filter: blur(48px);
  animation: message-hero-glow 5s ease-in-out infinite alternate;
}

.message-center-emblem {
  position: relative;
  z-index: 2;
  flex: 0 0 68px;
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
}

.message-center-emblem__ring {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(155, 234, 255, 0.48);
  border-left-color: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  animation: message-emblem-spin 7s linear infinite;
}

.message-center-emblem__ring::before {
  content: "";
  position: absolute;
  top: 5px;
  left: 12px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #9deeff;
  box-shadow: 0 0 12px #9deeff;
}

.message-center-emblem__ring--inner {
  inset: 9px;
  border-style: dashed;
  opacity: 0.5;
  animation-direction: reverse;
  animation-duration: 10s;
}

.message-center-emblem__core {
  position: relative;
  z-index: 2;
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 13px;
  font-size: 18px;
  background: rgba(255, 255, 255, 0.15);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.24),
    0 0 25px rgba(184, 149, 255, 0.38);
  backdrop-filter: blur(8px);
}

.message-center-heading {
  position: relative;
  z-index: 2;
  flex: 1;
  min-width: 0;
}

.message-center-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  color: rgba(215, 240, 255, 0.67);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.3px;
}

.message-center-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5ff0bd;
  box-shadow: 0 0 9px #5ff0bd;
  animation: message-live-pulse 1.4s ease-in-out infinite;
}

.message-center-title-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.message-center-title-row h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.6px;
}

.message-center-unread-chip {
  padding: 2px 7px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.84);
  font-size: 10px;
  background: rgba(255, 255, 255, 0.09);
}

.message-center-heading p {
  margin: 5px 0 0;
  color: rgba(240, 239, 255, 0.66);
  font-size: 11px;
}

.message-center-read-all {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.message-center-read-all:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}

.message-center-read-all:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.message-center-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 16px 10px;
}

.message-center-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(119, 101, 177, 0.09);
  border-radius: 13px;
  background: #f4f3f8;
}

.message-center-tabs button {
  height: 30px;
  padding: 0 13px;
  border: none;
  border-radius: 9px;
  color: #777386;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  transition: all 0.22s ease;
}

.message-center-tabs button.active {
  color: #704ed2;
  background: #fff;
  box-shadow:
    0 5px 13px rgba(84, 70, 133, 0.1),
    inset 0 0 0 1px rgba(126, 91, 232, 0.05);
}

.message-center-tabs button span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  margin-left: 4px;
  padding: 0 4px;
  border-radius: 8px;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  background: linear-gradient(135deg, #9964f4, #6f6de8);
}

.message-center-sync {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #a099b2;
  font-size: 10px;
}

.message-center-sync i {
  animation: message-sync-spin 4s linear infinite;
}

.message-center-list {
  flex: 1;
  min-height: 0;
  padding: 3px 12px 14px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(126, 91, 232, 0.24) transparent;
}

.message-center-list::-webkit-scrollbar {
  width: 4px;
}

.message-center-list::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background: rgba(126, 91, 232, 0.24);
}

.message-center-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 8px 2px;
  padding: 13px 12px;
  overflow: hidden;
  border: 1px solid #eceaf3;
  border-radius: 16px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 18px rgba(57, 48, 86, 0.045);
  transition: all 0.24s ease;
  animation: message-card-enter 0.42s both;
  animation-delay: var(--card-delay);
}

.message-center-card::after {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(
    110deg,
    transparent 18%,
    rgba(142, 94, 255, 0.06) 48%,
    transparent 74%
  );
  transform: translateX(-100%);
}

.message-center-card:hover {
  border-color: rgba(126, 91, 232, 0.23);
  box-shadow: 0 12px 25px rgba(80, 63, 133, 0.095);
  transform: translateY(-2px);
}

.message-center-card:hover::after {
  opacity: 1;
  animation: message-card-shine 1s ease;
}

.message-center-card.is-read {
  opacity: 0.62;
  background: rgba(248, 248, 251, 0.92);
}

.message-center-card.is-unread {
  border-color: rgba(128, 87, 224, 0.3);
  background:
    linear-gradient(90deg, rgba(134, 91, 232, 0.11), transparent 48%),
    rgba(255, 255, 255, 0.98);
  box-shadow:
    0 10px 24px rgba(96, 66, 176, 0.11),
    inset 0 0 0 1px rgba(142, 101, 234, 0.035);
}

.message-center-card__rail {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: transparent;
}

.message-center-card.is-unread .message-center-card__rail {
  top: 8px;
  bottom: 8px;
  width: 4px;
  background: linear-gradient(#9565ea, #6ba7f0);
  box-shadow: 2px 0 10px rgba(126, 91, 232, 0.24);
}

.message-center-card__icon {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-size: 17px;
}

.message-center-card.is-unread .message-center-card__icon {
  box-shadow:
    0 7px 16px rgba(105, 76, 191, 0.12),
    inset 0 0 0 1px rgba(126, 91, 232, 0.08);
}

.message-center-card__icon.is-violet {
  color: #7855d7;
  background: #f0ebff;
}

.message-center-card__icon.is-cyan {
  color: #3699b5;
  background: #e8f8fc;
}

.message-center-card__icon.is-rose {
  color: #df6687;
  background: #fff0f4;
}

.message-center-card__icon.is-amber {
  color: #d39335;
  background: #fff7e7;
}

.message-center-card__main {
  position: relative;
  z-index: 2;
  flex: 1;
  min-width: 0;
}

.message-center-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
  color: #8065ce;
  font-size: 9px;
}

.message-center-card__unread {
  display: inline-flex;
  align-items: center;
  height: 17px;
  padding: 0 6px;
  border: 1px solid rgba(236, 87, 128, 0.18);
  border-radius: 999px;
  color: #df557d;
  font-size: 9px;
  font-weight: 700;
  background: rgba(255, 235, 241, 0.9);
  box-shadow: 0 3px 8px rgba(223, 85, 125, 0.08);
}

.message-center-card h4 {
  margin: 0 0 4px;
  overflow: hidden;
  color: #353342;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-center-card p {
  margin: 0;
  overflow: hidden;
  color: #777180;
  font-size: 11px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-center-card p.message-center-card__inner {
  margin-top: 2px;
  overflow: visible;
  color: #777180;
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
  text-overflow: clip;
}

.message-center-card__content {
  margin-top: 4px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(122, 92, 214, 0.05);
  border: 1px solid rgba(122, 92, 214, 0.08);

  p {
    color: #6f6878;
    white-space: normal;
    text-overflow: clip;
    word-break: break-all;

    & + p {
      margin-top: 2px;
    }
  }
}

.message-center-card__action {
  position: relative;
  z-index: 2;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(126, 91, 232, 0.12);
  border-radius: 10px;
  color: #7d62d0;
  cursor: pointer;
  background: rgba(126, 91, 232, 0.06);
  transition: all 0.2s ease;
}

.message-center-card__action:hover {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #8f4dff, #6874ec);
  box-shadow: 0 7px 16px rgba(113, 79, 216, 0.22);
  transform: translateX(2px);
}

.message-center-empty {
  min-height: 350px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #aaa4b8;
}

.message-center-empty__planet {
  position: relative;
  width: 92px;
  height: 92px;
  display: grid;
  place-items: center;
  margin-bottom: 22px;
  border: 1px solid rgba(126, 91, 232, 0.16);
  border-radius: 50%;
  color: #8665e1;
  font-size: 26px;
  background: radial-gradient(
    circle at 35% 30%,
    rgba(111, 192, 255, 0.14),
    rgba(126, 91, 232, 0.08) 60%,
    transparent
  );
  box-shadow: 0 15px 38px rgba(106, 76, 196, 0.1);
  animation: message-empty-float 3.5s ease-in-out infinite;
}

.message-center-empty__planet span {
  position: absolute;
  inset: -13px -31px;
  border: 1px solid rgba(126, 91, 232, 0.15);
  border-radius: 50%;
  transform: rotate(-18deg);
}

.message-center-empty strong {
  margin-bottom: 6px;
  color: #5d586b;
  font-size: 14px;
}

.message-center-empty p {
  margin: 0;
  font-size: 11px;
}

.message-center-skeleton {
  display: flex;
  gap: 11px;
  margin: 8px 2px;
  padding: 13px 12px;
  border: 1px solid #efedf4;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.74);
}

.message-center-skeleton > span {
  flex: 0 0 38px;
  height: 38px;
  border-radius: 12px;
  background: #f0edf6;
}

.message-center-skeleton div {
  flex: 1;
}

.message-center-skeleton i {
  display: block;
  height: 7px;
  margin: 3px 0 7px;
  border-radius: 5px;
  background: linear-gradient(90deg, #f1eef6, #faf9fc, #f1eef6);
  background-size: 200% 100%;
  animation: message-skeleton 1.2s linear infinite;
}

.message-center-skeleton i:nth-child(1) {
  width: 28%;
}

.message-center-skeleton i:nth-child(2) {
  width: 64%;
}

.message-center-skeleton i:nth-child(3) {
  width: 88%;
}

.message-center-loading {
  display: flex;
  justify-content: center;
  gap: 5px;
  padding: 17px 0;
}

.message-center-loading span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #8064df;
  animation: message-loading 0.8s ease-in-out infinite alternate;
}

.message-center-loading span:nth-child(2) {
  animation-delay: 0.2s;
}

.message-center-loading span:nth-child(3) {
  animation-delay: 0.4s;
}

.message-center-end {
  padding: 13px 0 3px;
  color: #b0abb9;
  font-size: 10px;
  text-align: center;
  letter-spacing: 0.8px;
}

@keyframes message-trigger-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes message-trigger-charge {
  50% {
    color: #8c5aef;
    transform: scale(0.76);
  }
  100% {
    color: #7551da;
    transform: scale(1.12);
  }
}

@keyframes message-trigger-breathe {
  50% {
    opacity: 0.55;
    transform: scale(1.12);
  }
}

@keyframes message-badge-flash {
  50% {
    filter: brightness(1.4);
    transform: scale(1.35);
  }
}

@keyframes message-emblem-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes message-live-pulse {
  50% {
    opacity: 0.35;
    transform: scale(0.72);
  }
}

@keyframes message-hero-glow {
  to {
    transform: translateX(55px) scale(1.18);
  }
}

@keyframes message-sync-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes message-card-enter {
  from {
    opacity: 0;
    transform: translateY(13px);
  }
}

@keyframes message-card-shine {
  to {
    transform: translateX(100%);
  }
}

@keyframes message-empty-float {
  50% {
    transform: translateY(-8px) rotate(2deg);
  }
}

@keyframes message-skeleton {
  to {
    background-position: -200% 0;
  }
}

@keyframes message-loading {
  to {
    opacity: 0.3;
    transform: translateY(-4px);
  }
}

@media (max-width: 520px) {
  .message-center-drawer.el-drawer {
    width: calc(100vw - 22px) !important;
  }

  .message-center-hero {
    padding-right: 16px;
    padding-left: 16px;
  }

  .message-center-emblem {
    flex-basis: 58px;
    width: 58px;
    height: 58px;
  }

  .message-center-sync {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .message-center-drawer *,
  .message-center-trigger * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
