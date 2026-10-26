import { request } from '../request';

/**
 * 系统通知（09-通知，俱乐部 / 消息通知）
 * 对应 OpenAPI：未来洞电竞/俱乐部后台/消息通知
 * - GET  /api/club/notifications            我的通知（俱乐部）列表（page 从 1 开始；pageSize 默认 20 最大 100）
 * - GET  /api/club/notifications/unread     未读角标 { unread, badge }，badge 超过 99 为 '99+'
 * - POST /api/club/notifications/{id}/read  标记通知已读
 * - 实时推送：/ws/notify?token={token}&client=CLUB（notifySocket.js 连接）
 *   新通知 type=NOTIFICATION（含 id/scene/sceneLabel/title/content/orderId/jumpTarget/timeText/unread/badge）；
 *   已读后 type=UNREAD（只含 unread 和 badge）。后台弹框仍走 /ws/admin（纯文本，ADMIN 端，俱乐部不用）。
 * 鉴权：Header Authorization: Bearer {token}（request.js 自动携带）
 */
export const notifyApi = {
  /**
   * 我的通知（俱乐部）列表
   * @param {{page?:number, pageSize?:number}} params page 从 1 开始；pageSize 默认 20 最大 100
   * @returns {{total:number, page:number, pageSize:number, list:Array, unread:number, badge:string}}
   *   列表项：id / scene / sceneLabel / title / content / bizKey / readFlag(0/1) / createdAt /
   *           orderId / jumpTarget(有订单时为 ORDER) / orderNo / timeText(刚刚、N分钟前、N小时前、N天前)
   */
  list: (params = {}) => {
    const qs = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');
    return request.get(`/api/club/notifications${qs ? `?${qs}` : ''}`);
  },

  /**
   * 未读角标（页面初次进入先调这个接口，之后靠 WS 实时推送，不要只靠轮询）
   * @returns {{unread:number, badge:string}} badge：超过 99 条未读时为 '99+'，否则是未读数字字符串
   */
  unread: () => request.get('/api/club/notifications/unread'),

  /** 标记通知已读（俱乐部和打手已读后，WebSocket 会再推一条 type=UNREAD，带最新 unread 和 badge） */
  markRead: (id) => request.post(`/api/club/notifications/${id}/read`),
};
