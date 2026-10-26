import { request } from '../request';

/**
 * 派单消息（06-订单-俱乐部）
 * 鉴权：Header Authorization: Bearer {token}（request.js 自动附加，无需手动传）
 * 说明：accept / reject 成功均返回订单对象，可用于刷新卡片展示；
 *   status 枚举：PENDING/ACCEPTED/REJECTED（业务状态），NORMAL=正常 / DISABLED=停用
 */
export const dispatchApi = {
  /**
   * 待处理派单消息列表
   * @param {{createdAt?:string}} params createdAt 创建时间（可选）
   * @returns {Promise<Array<{id:number, orderId:number, clubId:number, status:string, createdAt:string}>>}
   */
  list: (params = {}) => {
    const qs = params.createdAt
      ? `?createdAt=${encodeURIComponent(params.createdAt)}`
      : '';
    return request.get(`/api/club/dispatch-messages${qs}`);
  },

  /** 接受派单 */
  accept: (id) => request.post(`/api/club/dispatch-messages/${id}/accept`),

  /** 拒绝派单 */
  reject: (id, reason = '') =>
    request.post(`/api/club/dispatch-messages/${id}/reject`, { reason }),
};
