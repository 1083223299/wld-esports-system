import { request } from '../request';

/**
 * 系统通知（09-通知，俱乐部 / 消息通知）
 * 对应 OpenAPI：未来洞电竞/俱乐部后台/消息通知
 * - GET  /api/club/notifications            我的通知（俱乐部）列表（无 Query 参数）
 * - POST /api/club/notifications/{id}/read  标记通知已读
 * 鉴权：Header Authorization: Bearer {token}（request.js 自动携带）
 */
export const notifyApi = {
  /** 我的通知（俱乐部）：返回通知数组 */
  list: () => request.get('/api/club/notifications'),

  /** 标记通知已读 */
  markRead: (id) => request.post(`/api/club/notifications/${id}/read`),
};
