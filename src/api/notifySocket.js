import { watch } from 'vue';
import { config } from '../config/env';
import { getToken } from '../utils/auth';
import { orderConfigApi } from './modules/orderConfig';

/**
 * 系统通知 · 即时通讯通道
 * ---------------------------------------------------------------
 * 职责：向「系统通知」模块提供 WebSocket 实时消息通道。
 *
 * 两种通道模式（由环境配置 config.useMock 决定）：
 *  1. 本地模拟模式（useMock = true，默认 local 环境）
 *     - 不真实连网，由内置「推送引擎」模拟服务端：
 *       · 启动即扫描订单列表，所有带「卡单」标签的订单自动生成
 *         卡单预警，并 @全量客服 @管理员
 *       · 监听订单列表变化，订单被标记卡单时立即推送
 *       · 每 60 秒轮询推送一条示例消息（卡单/公告轮换）
 *     - 接入真实后端后删除本分支即可。
 *  2. 真实 WebSocket 模式（useMock = false，dev/test/staging/prod）
 *     - 连接后端实时推送地址：{API 同域、保留基础路径前缀}/ws/notify?token={token}&client=CLUB
 *       （例：API 为 http://sys.test.weilaidong.com/wld-dj → ws://sys.test.weilaidong.com/wld-dj/ws/notify；
 *        token 需要 URL 编码，client 必须和 token 同一端；config.websocketURL 若配置了非占位地址则优先使用）
 *     - 自动断线重连（指数退避；参数由 env.js config.wsReconnect 配置：
 *       enabled 开关 / baseDelayMs 初始间隔 / maxDelayMs 最大间隔 / maxRetries 最大重试次数，默认无限重试）
 *     - 保活策略（2026-10-28）：
 *       · 应用层心跳消息 { type:'PING' } / { type:'PONG' } 只用于刷新连接存活，不进入业务分发
 *       · 收到 PING 自动回 PONG
 *       · 保留约 45s 静默假死检测：超时无任何下行消息则主动 close 触发重连
 *     - 服务端推送协议（2026-10-23 后端口径，type 为大写枚举，由 stores/notify.js 按 type 分发）：
 *       新通知：{ type: 'NOTIFICATION', id, scene, sceneLabel, title, content,
 *                 orderId, jumpTarget, timeText, unread, badge }
 *       标记已读后：{ type: 'UNREAD', unread, badge }（只有 unread 和 badge，badge 超 99 为 '99+'）
 *       （平台后台的弹框通知走 /ws/admin，内容是「标题：内容」纯文本，不是这套 JSON，俱乐部端不连）
 *     - 历史兼容：仍容忍本地 mock 时代的 { type:'stuck'|'system'|'notify'(payload) } 与数组推送
 * ---------------------------------------------------------------
 */

/* ================= 通知类型 ================= */
export const NOTIFY_TYPE = {
  // —— 原有类型 ——
  STUCK: 'stuck', // 卡单预警（@全量客服 @管理员）
  SYSTEM: 'system', // 系统公告
  // —— 订单相关（按消息通知列表需求图） ——
  ORDER_TIMEOUT: 'order_timeout', // 俱乐部抢单后超时，订单回到抢单大厅
  ORDER_DISPATCH: 'order_dispatch', // 平台给俱乐部派单、转单
  ORDER_CLOSED: 'order_closed', // 订单交易关闭
  // —— 钱包相关（按消息通知列表需求图） ——
  WALLET_DEDUCT: 'wallet_deduct', // 收益-转单触发扣款
  WITHDRAW_FAIL: 'withdraw_fail', // 收益提现失败
  DEPOSIT_WITHDRAW_FAIL: 'deposit_withdraw_fail', // 押金提现失败（需求图文案与收益一致，如有笔误可在构建处调整）
};

/** 全部通知类型（normalize 白名单用） */
export const NOTIFY_TYPE_ALL = Object.values(NOTIFY_TYPE);

/** 类型展示元信息（页面图标/标签用） */
export const TYPE_META = {
  [NOTIFY_TYPE.STUCK]: { label: '卡单预警', className: 'is-stuck' },
  [NOTIFY_TYPE.SYSTEM]: { label: '系统公告', className: 'is-system' },
  [NOTIFY_TYPE.ORDER_TIMEOUT]: { label: '订单超时', className: 'is-order-timeout' },
  [NOTIFY_TYPE.ORDER_DISPATCH]: { label: '订单消息', className: 'is-order-dispatch' },
  [NOTIFY_TYPE.ORDER_CLOSED]: { label: '订单状态变更', className: 'is-order-closed' },
  [NOTIFY_TYPE.WALLET_DEDUCT]: { label: '转单扣款', className: 'is-wallet-deduct' },
  [NOTIFY_TYPE.WITHDRAW_FAIL]: { label: '提现失败', className: 'is-withdraw-fail' },
  [NOTIFY_TYPE.DEPOSIT_WITHDRAW_FAIL]: { label: '提现失败', className: 'is-withdraw-fail' },
};

/* ================= 时间工具 ================= */
function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatTime(d = new Date()) {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/* ================= 消息构造 ================= */
let seq = 0;

/**
 * 生成一条标准通知消息
 * @param {Object} partial 部分字段，缺省字段自动补全
 */
export function makeMessage(partial = {}) {
  seq += 1;
  return {
    id: partial.id || `nt-${Date.now()}-${seq}`,
    type: NOTIFY_TYPE.SYSTEM,
    title: '',
    content: '',
    orderNos: [],
    mentions: [],
    time: formatTime(),
    read: false,
    ...partial,
  };
}

/* ================= 卡单订单（本地模拟数据源） ================= */

/** 卡单订单重复提醒的最小间隔（毫秒），避免 60s 轮询重复轰炸同一订单 */
const RE_ALERT_MS = 5 * 60 * 1000;

/** 从订单列表取出所有带「卡单」标签的订单（订单管理功能已下线，返回空） */
export function collectStuckOrders() {
  return [];
}

/** 生成一条卡单预警消息（@全量客服 @管理员） */
export function buildStuckMessage(order, minutes = 10) {
  return makeMessage({
    type: NOTIFY_TYPE.STUCK,
    title: '卡单预警',
    content: `订单 ${order.orderNo} 已超过 ${minutes} 分钟未流转，请全量客服与管理员及时处理，避免影响客户体验。`,
    orderNos: [order.orderNo],
    mentions: ['全量客服', '管理员'],
  });
}

/* ================= 按需求图：订单相关通知 ================= */

/** 俱乐部抢单后超时，订单回到抢单大厅（标题/正文按需求图，图未标注跳转） */
export function buildOrderTimeoutMessage(orderNo) {
  return makeMessage({
    type: NOTIFY_TYPE.ORDER_TIMEOUT,
    title: '订单已超时',
    content: `订单号${orderNo}接单超时`,
    orderNos: [orderNo],
  });
}

/** 平台给俱乐部派单、转单（跳转：订单列表并搜索该订单，查不到报订单不存在） */
export function buildDispatchMessage(orderNo) {
  return makeMessage({
    type: NOTIFY_TYPE.ORDER_DISPATCH,
    title: '订单消息',
    content: `您有一笔新订单，请及时查看，订单号：${orderNo}`,
    orderNos: [orderNo],
  });
}

/** 订单交易关闭（跳转：订单列表并搜索该订单，查不到报订单不存在） */
export function buildOrderClosedMessage(orderNo) {
  return makeMessage({
    type: NOTIFY_TYPE.ORDER_CLOSED,
    title: '订单状态变更',
    content: `订单${orderNo}已被取消`,
    orderNos: [orderNo],
  });
}

/* ================= 按需求图：钱包相关通知 ================= */

/** 收益-转单触发扣款（图未标注标题，默认取类型名「转单扣款」，可按需调整） */
export function buildWalletDeductMessage(amount) {
  return makeMessage({
    type: NOTIFY_TYPE.WALLET_DEDUCT,
    title: '转单扣款',
    content: `您触发了一笔转单，转单服务费${amount}元，如有疑问，请联系客服`,
  });
}

/** 收益提现失败 */
export function buildWithdrawFailMessage(reason) {
  return makeMessage({
    type: NOTIFY_TYPE.WITHDRAW_FAIL,
    title: '收益提现失败',
    content: `您有一笔收益，提现失败，失败原因：${reason}`,
  });
}

/** 押金提现失败（需求图与收益提现失败文案一致；若确认为笔误，可在此改为押金文案） */
export function buildDepositWithdrawFailMessage(reason) {
  return makeMessage({
    type: NOTIFY_TYPE.DEPOSIT_WITHDRAW_FAIL,
    title: '收益提现失败',
    content: `您有一笔收益，提现失败，失败原因：${reason}`,
  });
}

/**
 * 按需求图生成一组演示通知（本地 mock 模式首次启动时静默入列，便于直接查看列表效果）
 * - 订单交易关闭示例使用不存在的订单号，用于演示「查询不到时报订单不存在」特殊场景
 */
export function buildDemoMessages() {
  return [
    buildOrderTimeoutMessage('2455415'),
    buildDispatchMessage('2455415'),
    buildOrderClosedMessage('9999999'), // 演示特殊场景：跳转后查不到订单
    buildWalletDeductMessage('10.00'),
    buildWithdrawFailMessage('银行卡信息有误，请重新绑定'),
    buildDepositWithdrawFailMessage('押金余额不足，请及时充值'),
  ];
}

/* ================= 本地模拟推送引擎 ================= */

/**
 * 启动本地模拟通道：
 * - 初始扫描：把所有卡单订单静默写入通知列表（不弹气泡）
 * - 监听订单变化：订单被标记卡单时立即推送（弹气泡 + 闪托盘）
 * - 每 60s 轮询：推送一条示例消息，模拟服务端实时推送
 * @param {(msg: Object, opts: {silent?: boolean}) => void} emit 消息回调
 */
function startMockEngine(emit) {
  // 卡单提醒去重记录：orderNo -> { last, times }
  const alerted = new Map();
  let timer = null;
  let stopWatch = null;
  let stuckMinutes = 10;

  // 读取卡单时长配置（用于文案展示超时分钟数）
  orderConfigApi.get().then((res) => {
    stuckMinutes = Number(res?.pendingAcceptMinutes) || 10;
  });

  const scan = (opts = {}) => {
    const stuck = collectStuckOrders();
    const now = Date.now();
    const alive = new Set(stuck.map((o) => o.orderNo));

    // 已解决的卡单订单（标签移除）清除提醒记录，重新卡单时可再次提醒
    for (const key of [...alerted.keys()]) {
      if (!alive.has(key)) alerted.delete(key);
    }

    for (const order of stuck) {
      const rec = alerted.get(order.orderNo);
      if (!rec || now - rec.last >= RE_ALERT_MS) {
        alerted.set(order.orderNo, { last: now, times: (rec ? rec.times : 0) + 1 });
        emit(buildStuckMessage(order, stuckMinutes), opts);
      }
    }
  };

  // 1) 初始扫描：静默入列（避免每次启动都弹一堆气泡）
  scan({ silent: true });

  // 2) 每 60s 推送一条示例消息（模拟服务端实时推送）
  const templates = [
    // 系统公告
    () =>
      makeMessage({
        type: NOTIFY_TYPE.SYSTEM,
        title: '系统公告',
        content: '系统将于今晚 23:00 - 24:00 进行例行维护，期间消息推送可能出现延迟，请提前处理卡单订单。',
      }),
    // 卡单预警（从未提醒过的卡单订单里轮换，全部提醒过则发公告）
    () => {
      const now = Date.now();
      const candidates = collectStuckOrders().filter(
        (o) => !alerted.has(o.orderNo) || now - alerted.get(o.orderNo).last >= RE_ALERT_MS
      );
      if (candidates.length) {
        const order = candidates[0];
        alerted.set(order.orderNo, { last: now, times: (alerted.get(order.orderNo)?.times || 0) + 1 });
        return buildStuckMessage(order, stuckMinutes);
      }
      return makeMessage({
        type: NOTIFY_TYPE.SYSTEM,
        title: '系统公告',
        content: '订单数据已同步完成，当前暂无新增卡单订单。',
      });
    },
  ];

  let templateIdx = 0;
  const pushOne = () => {
    const template = templates[templateIdx % templates.length];
    templateIdx += 1;
    emit(template(), {});
  };
  // 每 60s 轮询推送一条
  // timer = setInterval(pushOne, 60 * 1000);
  // 启动后 8 秒先推一条，方便立即看到 冒泡/铃铛/托盘闪烁/角标 的效果（不必等满 60s）
  // const firstPushTimer = setTimeout(pushOne, 8000);

  return () => {
    if (timer) clearInterval(timer);
    if (firstPushTimer) clearTimeout(firstPushTimer);
    if (stopWatch) stopWatch();
  };
}

/* ================= 真实 WebSocket 客户端 ================= */

/**
 * 启动真实 WS 通道（含断线自动重连）
 * 地址：优先取 config.websocketURL（非占位）；占位时按 apibaseURL 同域推导。
 * 无论哪种来源，连接时都自动注入 token（URL 编码）+ client=CLUB，配置里只写连接地址。
 * @param {(msg: Object) => void} emit
 * @param {(status: 'connected'|'disconnected') => void} onStatus
 */
function startRealSocket(emit, onStatus) {
  let ws = null;
  let closed = false;
  let retry = 0;
  let retryTimer = null;
  let staleTimer = null;
  let pingTimer = null;

  // 断连重连配置（env.js wsReconnect；默认启用、3s 起指数退避、30s 封顶、无限重试）
  const rc = config.wsReconnect || {};
  const reconnectEnabled = rc.enabled !== false;
  const baseDelayMs = Number(rc.baseDelayMs) > 0 ? Number(rc.baseDelayMs) : 3000;
  const maxDelayMs = Number(rc.maxDelayMs) > 0 ? Number(rc.maxDelayMs) : 30000;
  const maxRetries = Number(rc.maxRetries) >= 0 ? Number(rc.maxRetries) : 0; // 0 = 无限重试
  // 静默假死阈值：建议 ≈ 服务端心跳间隔(15s) * 3
  const silentDeadMs = Number(config.wsSilentDeadMs) > 0 ? Number(config.wsSilentDeadMs) : 45000;
  // 主动上行心跳（可选）：默认关闭；如需开启可在 env.js 配 wsHeartbeatPingMs（建议 15000）
  const heartbeatPingMs =
    Number(config.wsHeartbeatPingMs) > 0 ? Number(config.wsHeartbeatPingMs) : 0;

  const clearTimers = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (staleTimer) {
      clearTimeout(staleTimer);
      staleTimer = null;
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  const scheduleRetry = () => {
    if (closed) return;
    if (!reconnectEnabled) return; // 配置关闭重连：断连后保持 disconnected，不再连
    if (maxRetries > 0 && retry >= maxRetries) return; // 达到最大重试次数：停止
    const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** retry);
    retry += 1;
    retryTimer = setTimeout(connect, delay);
  };

  // 每次连接（含重连）都重新解析地址并注入最新 token，避免启动早于登录态导致空 token
  const resolveUrl = () => {
    const base = isPlaceholderWs(config.websocketURL)
      ? deriveNotifyWsBase()
      : config.websocketURL;
    return withAuthQuery(base);
  };

  const sendHeartbeat = (type) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type }));
    } catch {
      /* 忽略 */
    }
  };

  const resetStaleTimer = () => {
    if (!silentDeadMs) return;
    if (staleTimer) clearTimeout(staleTimer);
    staleTimer = setTimeout(() => {
      if (closed || !ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.close();
      } catch {
        /* 忽略 */
      }
    }, silentDeadMs);
  };

  const onAlive = () => {
    resetStaleTimer();
  };

  const startPingLoop = () => {
    if (!heartbeatPingMs || pingTimer) return;
    pingTimer = setInterval(() => sendHeartbeat('PING'), heartbeatPingMs);
  };

  const parseHeartbeatType = (raw) => {
    if (raw && typeof raw === 'object') {
      return String(raw.type || '').toUpperCase();
    }
    if (typeof raw === 'string') return raw.trim().toUpperCase();
    return '';
  };

  const connect = () => {
    if (closed) return;
    // 未登录（无 token）时不发起连接也不排重试：避免登录失效后 ws 持续空转打握手请求；
    // 重新登录后由 auth:restored 触发 notify store 重新 init（重新 createNotifySocket）
    if (!getToken()) return;
    const url = resolveUrl();
    if (!url) {
      scheduleRetry();
      return;
    }
    try {
      ws = new WebSocket(url);
    } catch (e) {
      scheduleRetry();
      return;
    }
    ws.onopen = () => {
      retry = 0;
      onAlive();
      startPingLoop();
      onStatus('connected');
    };
    ws.onmessage = (ev) => {
      onAlive();
      let data = null;
      try {
        data = JSON.parse(ev.data);
      } catch {
        const textType = parseHeartbeatType(ev.data);
        if (textType === 'PING') sendHeartbeat('PONG');
        return;
      }
      const rawList = Array.isArray(data) ? data : [data];
      rawList.forEach((raw) => {
        if (!raw || typeof raw !== 'object') return;
        const heartbeatType = parseHeartbeatType(raw);
        if (heartbeatType === 'PING') {
          sendHeartbeat('PONG');
          return;
        }
        if (heartbeatType === 'PONG') return;
        // 包装格式 { type:'notify', payload } → 解包
        const msg = raw.type === 'notify' && raw.payload ? raw.payload : raw;
        if (!msg || typeof msg !== 'object') return;
        emit(msg);
      });
    };
    ws.onclose = () => {
      clearTimers();
      onStatus('disconnected');
      scheduleRetry();
    };
    ws.onerror = () => {
      try {
        ws && ws.close();
      } catch {
        /* 忽略 */
      }
    };
  };

  connect();

  return () => {
    closed = true;
    clearTimers();
    try {
      ws && ws.close();
    } catch {
      /* 忽略 */
    }
  };
}

/* ================= 对外入口 ================= */

/** 判断 WS 地址是否为占位（未配置真实后端地址） */
function isPlaceholderWs(url = '') {
  return !url || /myapp\.com/.test(url) || url.startsWith('ws://localhost:3001');
}

/**
 * 按后端口径推导实时推送地址的基础路径（不含 Query）：
 * {API 同域 ws 协议 + 保留基础路径前缀}/ws/notify
 * 例：API 为 http://sys.test.weilaidong.com/wld-dj → ws://sys.test.weilaidong.com/wld-dj/ws/notify
 * （网关原样转发，必须保留 /wld-dj 这类上下文前缀，不能只拼根路径 /ws/notify）
 */
function deriveNotifyWsBase() {
  const base = config.apibaseURL || '';
  try {
    const u = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    // 保留 apibaseURL 的路径前缀（如 /wld-dj），再拼接 /ws/notify
    u.pathname = `${u.pathname.replace(/\/+$/, '')}/ws/notify`;
    u.search = '';
    return u.toString();
  } catch {
    // 无法解析时返回空，触发重试等待登录态就绪
    return '';
  }
}

/**
 * 给 WS 连接地址注入鉴权 Query：token（URL 编码）+ client=CLUB
 * 配置里只写地址，token 随登录态在连接时注入，不写死；每次连接刷新一次
 * @param {string} baseUrl WS 连接地址（可含已有 Query，会被 token/client 覆盖）
 * @returns {string} 完整 WS URL；失败返回空串
 */
function withAuthQuery(baseUrl) {
  if (!baseUrl) return '';
  const token = getToken() || '';
  try {
    const u = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    u.search = `token=${encodeURIComponent(token)}&client=CLUB`;
    return u.toString();
  } catch {
    return '';
  }
}

/**
 * 创建系统通知即时通讯通道
 * @param {(msg: Object, opts?: {silent?: boolean}) => void} onMessage 收到消息回调
 * @param {(status: 'connected'|'disconnected') => void} onStatus 通道状态回调
 * @returns {{ mode: 'mock'|'ws', close: Function }}
 */
export function createNotifySocket({ onMessage, onStatus }) {
  // 仅本地模拟模式（useMock=true，local 环境）回落 mock；
  // dev/test/staging/prod 一律走真实 WS（地址未配置时按 /ws/notify?token=&client=CLUB 推导）
  const useMock = config.useMock === true;

  if (useMock) {
    onStatus && onStatus('connected');
    return { mode: 'mock', close: startMockEngine(onMessage) };
  }

  return { mode: 'ws', close: startRealSocket(onMessage, onStatus) };
}
