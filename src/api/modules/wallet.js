import { request } from '../request';

/**
 * 俱乐部侧钱包接口（真实后端）
 * 对应 OpenAPI：08-钱包 / 我的钱包（俱乐部）
 * - GET  /api/club/wallets/me             我的钱包（俱乐部）
 * - GET  /api/club/wallets/withdraw-rules 提现规则（?walletType=INCOME|DEPOSIT；DEPOSIT 含 showWithdraw）
 * - POST /api/club/wallets/withdraw       提现（俱乐部）
 * - GET  /api/club/wallets/withdrawals    提现单状态（俱乐部）
 * - GET  /api/club/wallets/txns           本人钱包流水
 * 鉴权：Header Authorization: Bearer {token}（request.js 自动携带）
 */

/** 拼接 Query 参数（空值跳过） */
function buildQuery(params = {}) {
  const qs = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export const walletApi = {
  /** 我的钱包：income 可提现收益 / deposit 押金 / walletFrozen 是否冻结 */
  me: () => request.get('/api/club/wallets/me'),

  /**
   * 提现规则（后端下发，前端不再写死）
   * @param {string} walletType INCOME=收益 / DEPOSIT=押金
   * @returns {Promise<{walletType, dailyLimit, usedToday, remainToday, windowStart, windowEnd,
   *                    inWindow, minAmount, realNameVerified, inStore, quitAt, depositReadyAt,
   *                    depositReady, walletFrozen, channelReady, serverTime, balance, showWithdraw}>}
   *   收益与押金同一结构；收益 minAmount=90、showWithdraw=true；押金 minAmount 为空、
   *   showWithdraw 需退店满14天且钱包未冻结才为 true
   */
  withdrawRules: (walletType = '') =>
    request.get(`/api/club/wallets/withdraw-rules${buildQuery({ walletType })}`),

  /**
   * 提现（俱乐部）
   * @param {{walletType?:string, amount:number, alipayAccount:string, alipayName:string, requestId:string}} data
   */
  withdraw: (data) => request.post('/api/club/wallets/withdraw', data),

  /** 提现单状态（按幂等单号查询） */
  withdrawalStatus: (requestId) =>
    request.get(`/api/club/wallets/withdrawals${buildQuery({ requestId })}`),

  /**
   * 本人钱包流水（服务端分页 + 筛选）
   * @param {{walletType?:'INCOME'|'DEPOSIT'|'', bizType?:string, createdFrom?:string, createdTo?:string,
   *          page?:number, pageSize?:number}} params
   *   walletType: 钱包类型（收益 INCOME / 押金 DEPOSIT）
   *   bizType: 明细类型筛选，后端校验允许值为中文枚举：
   *      订单收入/提现成功/提现失败/平台扣除/转单扣除/余额抵扣/平台充值/充值（2026-10-26 接口校验提示确认）
   *   createdFrom/createdTo：原型「时间」筛选（开始/结束，YYYY-MM-DD）；后端已确认将补此参数
   */
  txns: ({ walletType = '', bizType = '', createdFrom = '', createdTo = '', page = 1, pageSize = 10 } = {}) =>
    request.get(
      `/api/club/wallets/txns${buildQuery({ walletType, bizType, createdFrom, createdTo, page, pageSize })}`
    ),
};
