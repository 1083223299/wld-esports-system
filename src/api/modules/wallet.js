import { request } from '../request';

/**
 * 俱乐部侧钱包接口（真实后端）
 * 对应 OpenAPI：08-钱包 / 我的钱包（俱乐部）
 * - GET  /api/club/wallets/me           我的钱包（俱乐部）
 * - POST /api/club/wallets/withdraw     提现（俱乐部）
 * - GET  /api/club/wallets/withdrawals  提现单状态（俱乐部）
 * - GET  /api/club/wallets/txns         本人钱包流水
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
   * 提现（俱乐部）
   * @param {{walletType?:string, amount:number, alipayAccount:string, alipayName:string, requestId:string}} data
   */
  withdraw: (data) => request.post('/api/club/wallets/withdraw', data),

  /** 提现单状态（按幂等单号查询） */
  withdrawalStatus: (requestId) =>
    request.get(`/api/club/wallets/withdrawals${buildQuery({ requestId })}`),

  /**
   * 本人钱包流水（服务端分页）
   * @param {{walletType?:'INCOME'|'DEPOSIT'|'', page?:number, pageSize?:number}} params
   */
  txns: ({ walletType = '', page = 1, pageSize = 10 } = {}) =>
    request.get(`/api/club/wallets/txns${buildQuery({ walletType, page, pageSize })}`),
};
