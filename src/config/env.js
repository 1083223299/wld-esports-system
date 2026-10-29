/**
 * 多环境配置（精简版，只保留 API 相关配置）
 * ---------------------------------------------------------------
 * - CLIENT_VERSION：版本号统一从 package.json 的 version 读取
 *   （由 vite.config.js 的 define 在编译期注入 __APP_VERSION__）
 * - 每个环境：
 *   apibaseURL           接口 API 地址（request.js 的 BASE_URL）
 *   uplobaseURL          文件上传 API 地址（已废弃，仅平台后台旧地址；
 *                        俱乐部端上传一律用 POST /api/club/files/upload，见 src/api/modules/file.js）
 *   websocketURL          WS 通知通道连接地址（notifySocket.js 用；只写地址，
 *                        token/client 由连接时自动注入；留占位则按 apibaseURL 同域推导）
 *   timeout              请求超时（request.js 用）
 *   useMock              通知 mock 开关（notifySocket.js 用）
 *   notifyUnreadPollMs   通知未读角标轮询间隔（毫秒；stores/notify.js 断连兜底用，
 *                        0 或未配置 = 不轮询）
 *   wsReconnect          ws 断连重连配置（notifySocket.js 用，各环境可覆盖，缺省用公共默认）：
 *                        enabled   是否重连（默认 true）
 *                        baseDelayMs  重连初始间隔（默认 3000，指数退避 2^n）
 *                        maxDelayMs   重连最大间隔（默认 30000）
 *                        maxRetries   最大重试次数（默认 0 = 无限重试）
 *   wsSilentDeadMs       ws 静默假死阈值（毫秒，默认 45000；超时无下行消息则主动 close 触发重连）
 *   wsHeartbeatPingMs    前端主动上行心跳间隔（毫秒，默认 0=关闭；开启后按间隔发送 {type:'PING'}）
 * ---------------------------------------------------------------
 */
export const ENV_NAMES = {
  LOCAL: 'local',
  DEV: 'dev',
  TEST: 'test',
  STAGING: 'staging',
  PROD: 'prod',
};
/* ================= 公共配置（所有环境一致） ================= */
/** 客户端版本号：编译期从 package.json 注入 */
export const CLIENT_VERSION = __APP_VERSION__;
/** IM 客户端 ID */
export const CLIENT_ID = 'fe098735c5db7c5724d9ec077396c776';
/** ws 断连重连公共默认值（各环境可用 wsReconnect 字段覆盖） */
const DEFAULT_WS_RECONNECT = {
  enabled: true, // 断连后自动重连
  baseDelayMs: 3000, // 初始间隔 3s（指数退避 2^n）
  maxDelayMs: 30000, // 最大间隔 30s
  maxRetries: 0, // 0 = 无限重试
};
export const environments = {
  [ENV_NAMES.LOCAL]: {
    name: '本地',
    apibaseURL: 'http://192.168.5.15:7500',
    uplobaseURL: 'http://192.168.5.15:7500/common/file/upload',
    websocketURL: 'ws://localhost:3001',
    timeout: 50000,
    useMock: true,
    notifyUnreadPollMs: 60000,
  },
  [ENV_NAMES.DEV]: {
    name: '开发',
    apibaseURL: 'https://api.weilaidong.com/devapi',
    uplobaseURL: 'https://api.weilaidong.com/devapi/common/file/upload',
    websocketURL: 'wss://dev-ws.myapp.com',
    timeout: 50000,
    useMock: false,
    notifyUnreadPollMs: 60000,
  },
  [ENV_NAMES.TEST]: {
    name: '测试',
    apibaseURL: 'http://sys.test.weilaidong.com/wld-dj',
    uplobaseURL: 'http://sys.test.weilaidong.com/wld-dj//api/club/files/upload',
    // 实时通知连接地址（网关原样转发）；token/client 由 notifySocket.js 在连接时自动注入，配置里只写地址
    websocketURL: 'ws://sys.test.weilaidong.com/wld-dj/ws/notify',
    timeout: 50000,
    useMock: false,
    notifyUnreadPollMs: 60000,
  },
  [ENV_NAMES.STAGING]: {
    name: '预发布',
    apibaseURL: 'https://api.weilaidong.com/uatapi',
    uplobaseURL: 'https://api.weilaidong.com/uatapi/common/file/upload',
    websocketURL: 'wss://stage-ws.myapp.com',
    timeout: 50000,
    useMock: false,
    notifyUnreadPollMs: 60000,
  },
  [ENV_NAMES.PROD]: {
    name: '生产',
    apibaseURL: 'https://api.weilaidong.com/v2',
    uplobaseURL: 'https://api.weilaidong.com/v2/common/file/upload',
    websocketURL: 'wss://ws.myapp.com',
    timeout: 50000,
    useMock: false,
    notifyUnreadPollMs: 60000,
  },
};
function resolveEnv() {
  const fromVite = import.meta.env && import.meta.env.VITE_APP_ENV;
  if (fromVite && environments[fromVite]) return fromVite;
  if (import.meta.env && import.meta.env.DEV) return ENV_NAMES.LOCAL;
  return ENV_NAMES.PROD;
}
export const CURRENT_ENV = resolveEnv();
export const config = {
  ...environments[CURRENT_ENV],
  // 环境未配置 wsReconnect 时使用公共默认
  wsReconnect: { ...DEFAULT_WS_RECONNECT, ...(environments[CURRENT_ENV].wsReconnect || {}) },
};
export default config;
