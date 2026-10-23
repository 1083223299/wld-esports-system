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
  /** 抢单大厅 / 可接列表（无 Query 参数，返回订单数组） */
  grabHall: () => request.get('/api/club/orders/grab-hall'),

  /** 俱乐部整单接下 */
  clubTake: (id) => request.post(`/api/club/orders/${id}/club-take`),

  /** 我的订单（俱乐部）列表：无 Query 参数，返回订单数组，前端筛选分页 */
  myOrders: () => request.get('/api/club/orders/mine'),

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

  /** 提交验收（俱乐部）：remark 可选备注 */
  submit: (id, remark) => request.post(`/api/club/orders/${id}/submit`, { remark }),
};
