import { defineStore } from 'pinia';
import {
  createNotifySocket,
  NOTIFY_TYPE,
  NOTIFY_TYPE_ALL,
  formatTime,
  collectStuckOrders,
  buildStuckMessage,
  buildDemoMessages,
  makeMessage,
} from '../api/notifySocket';
import { notifyApi } from '../api/modules/notify';
import { config } from '../config/env';
import { resolveNotifyTarget } from '../utils/notifyJump';
import { playNotifySound } from '../utils/notifySound';
import { showBrowserNotify } from '../utils/browserNotify';
import { setFaviconBadge } from '../utils/faviconBadge';

/**
 * 系统通知 Store
 * ---------------------------------------------------------------
 * - items    通知列表（新在前，持久化，最多保留 MAX_ITEMS 条）
 * - unread   未读数（getter：后端 unread 接口优先，未拉取时回退 items 推导）
 * - badge    后端角标字符串（超 99 为 '99+'），铃铛角标直接展示
 * - bubbles  实时消息气泡（不持久化，WS 收到消息自动弹出）
 * - 收到消息时：入列 → 弹页面气泡 → 播提示音 → 弹浏览器系统通知 → 更新 favicon 角标
 * - WS 推送协议（2026-10-23）：type=NOTIFICATION 新通知入列并同步 unread/badge；
 *   type=UNREAD 仅更新未读角标（标记已读后由后端推送）
 * ---------------------------------------------------------------
 */

const MAX_ITEMS = 200;
const BUBBLE_MAX = 3;
const BUBBLE_DURATION = 8000;
/** 本地 mock 演示通知的注入标记（首次启动注入一次，避免刷新重复堆积） */
const DEMO_SEED_KEY = 'futurecave-notify-demo-seeded';
/** 未读角标轮询定时器（模块级单例，应用生命周期内常驻） */
let unreadPollTimer = null;
/** 断连期间未读角标轮询间隔（毫秒；读 env.js 各环境 notifyUnreadPollMs，0/未配置 = 不轮询） */
const UNREAD_POLL_MS = Number(config.notifyUnreadPollMs) > 0 ? Number(config.notifyUnreadPollMs) : 0;

/**
 * 登录失效 / 恢复 联动（模块顶层注册一次，HMR 防重）：
 * - auth:expired（request.js 401 时 dispatch）：停掉未读轮询 + 关闭 ws（含重连链），
 *   并放开 initialized，允许重新登录后再次 init —— 避免登录失效后 60s 轮询 + ws 无限重连持续空转刷 401；
 * - auth:restored（LoginView 登录成功 dispatch）：重新 init 通知通道（重建 ws，重新连上后正常收推送）。
 */
if (!window.__notifyAuthBound) {
  window.__notifyAuthBound = true;
  window.addEventListener('auth:expired', () => {
    const store = useNotifyStore();
    store.stopUnreadPolling();
    if (store._close) {
      try {
        store._close();
      } catch {
        /* 忽略 */
      }
    }
    store.initialized = false; // 允许重新登录后重新初始化
  });
  window.addEventListener('auth:restored', () => {
    const store = useNotifyStore();
    if (!store.initialized) store.init();
  });
}

/** 判断请求失败是否登录失效（request.js 已把 code/bizCode/status 挂到 Error 上） */
function isAuthExpired(err) {
  return !!err && (err.status === 401 || err.code === 401 || err.bizCode === 'UNAUTHORIZED');
}

/** 把通道收到的任意消息规范化成标准通知项（含 2026-10-23 后端口径新字段） */
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw;
  return {
    id: src.id || `nt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    // 本地消息 type=stuck|system… 命中白名单直接用；
    // 后端实时推送 type=NOTIFICATION 不在白名单，改按 scene 映射（未命中回退系统通知）
    type: NOTIFY_TYPE_ALL.includes(src.type)
      ? src.type
      : sceneToType(String(src.scene || '')),
    title: src.title || '系统通知',
    content: src.content || '',
    orderNos: Array.isArray(src.orderNos)
      ? src.orderNos
      : src.orderNo
        ? [String(src.orderNo)]
        : [],
    mentions: Array.isArray(src.mentions) ? src.mentions : [],
    time: src.time || formatTime(),
    read: !!src.read,
    // —— 后端新字段（最新 OpenAPI /ws/notify 与 /api/club/notifications）——
    scene: src.scene || '', // 场景枚举，如 TAKE_TIMEOUT
    sceneLabel: src.sceneLabel || '', // 场景名称（如「订单超时提醒」）
    orderId: src.orderId ?? null, // 订单 ID（整数），配合 jumpTarget 使用
    jumpTarget: src.jumpTarget || '', // 有订单时为 ORDER：用 orderId 打开订单详情
    timeText: src.timeText || '', // 相对时间：刚刚、N分钟前、N小时前、N天前
  };
}

/* ================= 后端接口字段映射（09-通知 / 消息通知） ================= */

/** 仅后端返回的整数通知 id 才调用已读接口（本地 mock 演示 id 为字符串，跳过） */
function isBackendId(id) {
  return typeof id === 'number' || /^\d+$/.test(String(id));
}

/**
 * 后端 scene → 前端通知类型（TYPE_META 标签 / notifyJump 跳转规则共用）
 * 精确映射优先（TAKE_TIMEOUT 为接口文档示例，其余按需求图命名推断，后端补充后可在此扩展）；
 * 命名变体走关键词兜底；未知场景回退系统通知
 */
function sceneToType(scene) {
  const EXACT = {
    TAKE_TIMEOUT: NOTIFY_TYPE.ORDER_TIMEOUT, // 俱乐部抢单后超时
    DISPATCH: NOTIFY_TYPE.ORDER_DISPATCH, // 平台派单/转单
    ORDER_DISPATCH: NOTIFY_TYPE.ORDER_DISPATCH,
    ORDER_CLOSED: NOTIFY_TYPE.ORDER_CLOSED, // 订单交易关闭
    TRADE_CLOSED: NOTIFY_TYPE.ORDER_CLOSED,
    WALLET_DEDUCT: NOTIFY_TYPE.WALLET_DEDUCT, // 转单扣款
    TRANSFER_DEDUCT: NOTIFY_TYPE.WALLET_DEDUCT,
    WITHDRAW_FAIL: NOTIFY_TYPE.WITHDRAW_FAIL, // 收益提现失败
    DEPOSIT_WITHDRAW_FAIL: NOTIFY_TYPE.DEPOSIT_WITHDRAW_FAIL, // 押金提现失败
    STUCK: NOTIFY_TYPE.STUCK, // 卡单预警
  };
  if (EXACT[scene]) return EXACT[scene];

  const s = String(scene).toLowerCase();
  if (s.includes('stuck')) return NOTIFY_TYPE.STUCK;
  if (s.includes('timeout')) return NOTIFY_TYPE.ORDER_TIMEOUT;
  if (s.includes('dispatch') || s.includes('transfer')) return NOTIFY_TYPE.ORDER_DISPATCH;
  if (s.includes('close') || s.includes('cancel')) return NOTIFY_TYPE.ORDER_CLOSED;
  if (s.includes('deduct')) return NOTIFY_TYPE.WALLET_DEDUCT;
  if (s.includes('deposit')) return NOTIFY_TYPE.DEPOSIT_WITHDRAW_FAIL;
  if (s.includes('withdraw')) return NOTIFY_TYPE.WITHDRAW_FAIL;
  return NOTIFY_TYPE.SYSTEM;
}

/**
 * 后端通知字段 → 列表项
 * 后端（2026-10-23）：{ id, scene, sceneLabel, title, content, bizKey, readFlag(0/1),
 *                       createdAt, orderId, jumpTarget(ORDER), orderNo, timeText }
 * 列表：{ id, type, title, content, orderNos, mentions, time, read, scene, sceneLabel, orderId, jumpTarget, timeText }
 */
function mapApiItem(src) {
  if (!src || typeof src !== 'object' || src.id == null) return null;
  return {
    id: src.id,
    type: sceneToType(String(src.scene || '')),
    title: src.title || '系统通知',
    content: src.content || '',
    // 订单号优先取 orderNo（最新接口字段），兼容旧字段 bizKey
    orderNos: src.orderNo ? [String(src.orderNo)] : src.bizKey ? [String(src.bizKey)] : [],
    mentions: [],
    time: src.createdAt || formatTime(),
    read: Number(src.readFlag) === 1,
    scene: String(src.scene || ''),
    sceneLabel: src.sceneLabel || '',
    orderId: src.orderId ?? null,
    jumpTarget: src.jumpTarget || '',
    timeText: src.timeText || '',
  };
}

export const useNotifyStore = defineStore('notify', {
  state: () => ({
    /** 通知列表（新在前） */
    items: [],
    /** 实时消息气泡（不持久化） */
    bubbles: [],
    /** 通道是否已连接 */
    connected: false,
    /** 通道模式：'mock' 本地模拟 / 'ws' 真实 WebSocket */
    mode: '',
    /** 是否已初始化（避免重复连接） */
    initialized: false,
    /** 收到新消息的脉冲计数（每次非静默消息 +1，用于铃铛晃动等动画触发） */
    pulse: 0,
    /** 后端未读数（GET /api/club/notifications/unread；null=未拉取，回退本地 items 推导） */
    unreadFromApi: null,
    /** 后端角标字符串（unread 接口 / 列表接口 / WS 推送下发；超 99 为 '99+'，否则是数字字符串） */
    badge: '',
  }),

  getters: {
    unreadCount: (s) =>
      s.unreadFromApi !== null && s.unreadFromApi !== undefined
        ? s.unreadFromApi
        : s.items.filter((i) => !i.read).length,
  },

  actions: {
    /**
     * 初始化即时通讯通道（应用启动时调用一次）
     * 本地模拟模式：自动扫描卡单订单生成通知；真实模式：连接 WS 并自动重连
     * 断连兜底：ws 断连期间低频轮询未读角标 + 回到前台刷新列表（见 startUnreadPolling / visibility 监听）
     */
    init() {
      if (this.initialized) return;
      this.initialized = true;

      const client = createNotifySocket({
        onMessage: (msg, opts) => this.handleIncoming(msg, opts),
        onStatus: (status) => {
          this.connected = status === 'connected';
          // 连上后：停掉断连期轮询，并立即追一次未读数（补断连期间遗漏）
          if (status === 'connected') {
            this.stopUnreadPolling();
            this.refreshUnread();
          } else {
            // 断连/重连等待期间：低频轮询未读角标兜底
            this.startUnreadPolling();
          }
        },
      });

      this.mode = client.mode;
      this._close = client.close;

      // 回到前台（tab 可见）时刷新未读数+列表：覆盖「挂后台回来角标旧」的场景（轻量兜底）
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.loadFromApi();
      });

      // 本地模拟模式：首次启动静默入列一组按需求图构造的演示通知，便于直接查看列表效果
      // （真实 WS 模式不注入；接入真实后端后可删除本段）
      if (client.mode === 'mock' && !localStorage.getItem(DEMO_SEED_KEY)) {
        buildDemoMessages().forEach((msg) => this.handleIncoming(msg, { silent: true }));
        localStorage.setItem(DEMO_SEED_KEY, '1');
      }

      // 启动时同步一次标签页角标（持久化中可能有未读）
      this.syncBadge();

      // 从后端拉取未读数（俱乐部；超 99 显示 99+）
      this.refreshUnread();
    },

    /**
     * 启动未读角标轮询（断连期间兜底；仅 ws 模式且未在轮询时生效）
     * 每 notifyUnreadPollMs 调一次 GET /api/club/notifications/unread，connected 后由 onStatus 停止；
     * env.js 配置 notifyUnreadPollMs=0 / 未配置时不轮询
     */
    startUnreadPolling() {
      if (this.mode !== 'ws') return;
      if (!UNREAD_POLL_MS) return; // 配置为 0 = 关闭轮询
      if (unreadPollTimer) return; // 已在轮询，不重复起
      unreadPollTimer = setInterval(() => this.refreshUnread(), UNREAD_POLL_MS);
    },

    /** 停止未读角标轮询 */
    stopUnreadPolling() {
      if (unreadPollTimer) {
        clearInterval(unreadPollTimer);
        unreadPollTimer = null;
      }
    },

    /**
     * 收到一条新消息：入列 + 未读 + （非静默时）页面气泡 / 提示音 / 系统通知 / 角标
     * @param {Object} raw 通道原始消息
     * @param {{silent?: boolean}} opts silent=true 时不弹气泡不提醒（仅入列）
     */
    handleIncoming(raw, opts = {}) {
      // 后端已读回执：type=UNREAD，只带最新 unread 和 badge，不产生列表项（2026-10-23 后端口径）
      if (raw && raw.type === 'UNREAD') {
        this.applyUnreadPayload(raw);
        return;
      }

      const item = normalize(raw);
      if (!item) return;

      // 卡单预警按订单号去重：同一订单重复提醒时更新原记录
      const isStuck = item.type === NOTIFY_TYPE.STUCK && item.orderNos.length > 0;
      if (isStuck) {
        const prev = this.items.find(
          (i) => i.type === NOTIFY_TYPE.STUCK && i.orderNos[0] === item.orderNos[0]
        );
        if (prev) {
          prev.title = item.title;
          prev.content = item.content;
          prev.time = item.time;
          prev.read = false;
          if (!opts.silent) this.notifyUser(prev);
          this.syncBadge();
          return;
        }
      }

      this.items.unshift(item);
      if (this.items.length > MAX_ITEMS) this.items.splice(MAX_ITEMS);

      // 实时推送 type=NOTIFICATION 自带最新 unread/badge，一并同步（避免等轮询）
      if (raw && (raw.unread != null || raw.badge != null)) {
        this.applyUnreadPayload(raw);
      }

      if (!opts.silent) this.notifyUser(item);
      this.syncBadge();
    },

    /**
     * 应用后端下发的 unread/badge（unread 接口 / 列表接口 / WS NOTIFICATION+UNREAD 推送共用）
     * @param {{unread?:number, badge?:string}} payload
     */
    applyUnreadPayload(payload) {
      if (!payload || typeof payload !== 'object') return;
      const n = Number(payload.unread);
      if (Number.isFinite(n) && payload.unread != null) {
        this.unreadFromApi = Math.max(0, n);
      }
      if (payload.badge != null) {
        this.badge = String(payload.badge);
      }
      this.syncBadge();
    },

    /** 提醒用户：页面气泡 + 提示音 + 浏览器系统通知 + 标签页角标 */
    notifyUser(item) {
      const bubble = {
        id: `b-${item.id}`,
        type: item.type,
        title: item.title,
        content: item.content,
        orderNos: item.orderNos.slice(),
        mentions: item.mentions.slice(),
        time: item.time,
      };
      this.bubbles.push(bubble);
      if (this.bubbles.length > BUBBLE_MAX) {
        this.bubbles.splice(0, this.bubbles.length - BUBBLE_MAX);
      }
      setTimeout(() => this.dismissBubble(bubble.id), BUBBLE_DURATION);

      // 铃铛晃动动画触发信号（顶部栏监听）
      this.pulse += 1;

      // 微信式提示音
      playNotifySound();

      // 浏览器系统通知（未授权时静默跳过，页面内气泡不受影响）
      showBrowserNotify({
        title: item.title,
        body: item.content,
        tag: `notify-${item.type}-${item.id}`,
        onClick: () => {
          this.markRead(item.id);
          // 按需求图跳转规则跳转（无跳转的类型仅标记已读）
          const target = resolveNotifyTarget(item);
          if (target) {
            import('../router').then(({ default: router }) => router.push(target));
          }
        },
      });
    },

    /** 标记单条已读（本地立即生效；后端整数 id 同步调用已读接口，失败已由 request.js toast） */
    markRead(id) {
      const item = this.items.find((i) => i.id === id);
      if (item) item.read = true;
      this.syncBadge();
      if (isBackendId(id)) {
        notifyApi.markRead(id).then(() => this.refreshUnread()).catch(() => {});
      }
    },

    /** 全部标记已读，并清除标签页角标（逐个调用后端已读接口） */
    async markAllRead() {
      const ids = this.items
        .filter((i) => !i.read && isBackendId(i.id))
        .map((i) => i.id);
      this.items.forEach((i) => {
        i.read = true;
      });
      this.syncBadge();
      if (ids.length) {
        try {
          await Promise.all(ids.map((id) => notifyApi.markRead(id)));
          this.refreshUnread();
        } catch {
          /* request.js 已 toast，不重复提示 */
        }
      }
    },

    /** 关闭指定气泡 */
    dismissBubble(id) {
      const idx = this.bubbles.findIndex((b) => b.id === id);
      if (idx > -1) this.bubbles.splice(idx, 1);
    },

    /** 清空所有气泡（进入系统通知页时调用） */
    clearBubbles() {
      this.bubbles.splice(0);
    },

    /**
     * 从后端拉取未读数（GET /api/club/notifications/unread，返回 { unread, badge }，badge 超 99 为 '99+'）
     * 成功后覆盖本地推导值；失败保留现状（本地 items 推导兜底）
     */
    async refreshUnread() {
      try {
        const res = await notifyApi.unread();
        this.applyUnreadPayload(res);
      } catch (err) {
        // 登录失效（401）：停轮询 + 关 ws，避免持续空转刷 401（request.js 已 toast/跳登录）
        if (isAuthExpired(err)) {
          this.stopUnreadPolling();
          if (this._close) {
            try {
              this._close();
            } catch {
              /* 忽略 */
            }
          }
          this.initialized = false;
        }
        /* 保留现有未读计数 */
      }
    },

    /** 同步标签页 favicon 未读角标 */
    syncBadge() {
      setFaviconBadge(this.unreadCount);
    },

    /**
     * 从后端加载我的通知（俱乐部）列表（GET /api/club/notifications）
     * 分页结果：{ total, page, pageSize, list, unread, badge }；
     * 后端字段 scene/sceneLabel/bizKey/readFlag/createdAt/orderId/jumpTarget/orderNo/timeText
     * 在此映射为列表项并替换本地列表；失败时保留现有列表（本地演示/缓存数据），错误提示已由 request.js 统一 toast
     * 注：原型无分页 UI，本页一次性拉取最大页（pageSize=100）；若列表量级超 100 需补分页时再排任务
     */
    async loadFromApi() {
      try {
        const res = await notifyApi.list({ page: 1, pageSize: 100 });
        const list = Array.isArray(res && res.list) ? res.list : Array.isArray(res) ? res : [];
        this.items = list.map(mapApiItem).filter(Boolean);
        // 列表接口同时返回 unread/badge，直接同步
        this.applyUnreadPayload(res);
        this.syncBadge();
      } catch (err) {
        // 登录失效（401）：停轮询 + 关 ws，避免持续空转刷 401
        if (isAuthExpired(err)) {
          this.stopUnreadPolling();
          if (this._close) {
            try {
              this._close();
            } catch {
              /* 忽略 */
            }
          }
          this.initialized = false;
        }
        /* 保留现有列表，不打断页面 */
      }
      // 列表加载后刷新后端未读数（后端权威）
      this.refreshUnread();
      return this.items;
    },

    /**
     * 手动模拟推送一条卡单预警（本地模拟模式下的演示按钮）
     * 用于验证：消息冒泡 + 铃铛 + 标签页角标
     */
    pushDemo() {
      if (this.mode !== 'mock') return;
      const stuck = collectStuckOrders();
      if (stuck.length) {
        this.handleIncoming(buildStuckMessage(stuck[0]));
      } else {
        this.handleIncoming(
          makeMessage({
            type: NOTIFY_TYPE.SYSTEM,
            title: '系统公告',
            content: '订单数据已同步完成，当前暂无新增卡单订单。',
          })
        );
      }
    },
  },

  persist: {
    key: 'futurecave-notify',
    storage: localStorage,
    pick: ['items'],
  },
});
