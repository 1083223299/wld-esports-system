import { request } from '../request';

/**
 * 派单消息（06-订单-俱乐部）
 * 鉴权：Header Authorization: Bearer {token}（request.js 自动附加，无需手动传）
 * 说明：accept / reject 成功均返回订单对象，可用于刷新卡片展示
 */
export const dispatchApi = {
  /** 待处理派单消息列表（无 Query 参数，一次返回全量，前端分页） */
  list: () => request.get('/api/club/dispatch-messages'),

  /** 接受派单 */
  accept: (id) => request.post(`/api/club/dispatch-messages/${id}/accept`),

  /** 拒绝派单 */
  reject: (id, reason = '') =>
    request.post(`/api/club/dispatch-messages/${id}/reject`, { reason }),
};
