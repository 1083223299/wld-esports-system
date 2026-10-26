import { request } from '../request';

/**
 * 俱乐部侧订单接口（真实后端）
 * 对应 OpenAPI：06-订单-俱乐部 / 抢单大厅 + 我的订单
 * - GET  /api/club/orders/grab-hall             俱乐部侧大厅/可接列表
 * - POST /api/club/orders/{id}/club-take        俱乐部整单接下
 * - GET  /api/club/orders/mine                  我的订单（俱乐部）列表
 * - GET  /api/club/orders/{id}                  订单详情（俱乐部）
 * - POST /api/club/orders/{orderId}/assignments 按名额指派打手（转单）
 * - POST /api/club/orders/{id}/club-adjust      俱乐部加减价
 * - POST /api/club/orders/{id}/submit           提交验收（俱乐部）
 * 鉴权：Header Authorization: Bearer {token}（request.js 自动携带）
 */
export const clubOrderApi = {
  /**
   * 抢单大厅 / 可接列表（服务端分页 + 关键字筛选）
   * @param {{keyword?:string, page?:number, pageSize?:number}} params
   *   keyword 匹配订单号或订单 ID（可选）；page 从 1 开始（可选）；pageSize 默认 20 最大 100（可选）
   * @returns {{total:number, list:Array}}
   */
  grabHall: (params = {}) => {
    const qs = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');
    return request.get(`/api/club/orders/grab-hall${qs ? `?${qs}` : ''}`);
  },

  /** 俱乐部整单接下 */
  clubTake: (id) => request.post(`/api/club/orders/${id}/club-take`),

  /**
   * 我的订单（俱乐部）列表（服务端分页 + tab/keyword/takenFrom/takenTo/sort 筛选）
   * @param {{tab?:string, keyword?:string, takenFrom?:string, takenTo?:string,
   *          sort?:string, order?:string, page?:number, pageSize?:number}} params
   *   tab: ALL 全部 | ONGOING 待接单和进行中（WAIT_TAKE、IN_PROGRESS）| DONE 已完成 | CLOSED 交易关闭
   *   keyword: 匹配订单号或订单 ID
   *   takenFrom/takenTo: 「俱乐部接单时间」范围（后端 2026-10-26 确认存在，对应原型该筛选项；非 createdFrom/createdTo）
   *   sort: createdAt(默认)/dispatchedAt/takenAt/completedAt；order: desc(默认)/asc
   *   说明：接口不会把「进行中且已驳回」排最前；页面如需该顺序由前端自己排。
   * @returns {{total:number, list:Array}}
   */
  myOrders: (params = {}) => {
    const qs = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');
    return request.get(`/api/club/orders/mine${qs ? `?${qs}` : ''}`);
  },

  /** 订单详情（俱乐部） */
  detail: (id) => request.get(`/api/club/orders/${id}`),

  /**
   * 按名额指派打手（转单）
   * @param {number} orderId 订单 ID
   * @param {Array<{slotNo:number, playerId:number}>} slots 名额指派列表
   */
  assign: (orderId, slots) => request.post(`/api/club/orders/${orderId}/assignments`, { slots }),

  /**
   * 俱乐部加减价
   * @param {number} id 订单 ID
   * @param {{direction:'INCREASE'|'DECREASE', amount:number}} payload 方向与金额（正数，最多两位小数）
   */
  clubAdjust: (id, { direction, amount }) =>
    request.post(`/api/club/orders/${id}/club-adjust`, { direction, amount }),

  /**
   * 提交验收（俱乐部）：先上传拿 url，再把 url 填进 coverUrl/endUrl/progressUrls（对应 POST /api/club/files/upload）
   * @param {number} id 订单 ID
   * @param {{coverUrl?:string, endUrl?:string, progressUrls?:string[], remark?:string}} payload
   */
  submit: (id, { coverUrl = '', endUrl = '', progressUrls = [], remark = '' } = {}) =>
    request.post(`/api/club/orders/${id}/submit`, {
      coverUrl,
      endUrl,
      progressUrls: Array.isArray(progressUrls) ? progressUrls : [],
      remark,
    }),
};
