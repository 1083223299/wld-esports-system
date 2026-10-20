// src/api/notice.js
import request from "@/utils/request";

/**
 * 查询公告列表
 * @param {Object} params - 查询参数
 */
export function listNotice(params) {
  return request({
    url: "/system-v1/notice/list",
    method: "get",
    params: params,
  });
}

/**
 * 查询公告详情
 * @param {string|number} noticeId - 公告ID
 */
export function getNotice(noticeId) {
  return request({
    url: "/system-v1/notice/" + noticeId,
    method: "get",
  });
}
// 获取系统消息列表
export function listSystemMessages(params) {
  return request({
    url: "/business/sys-message-reminder/list",
    method: "get",
    params: params,
  });
}
/**
 * 标记系统消息为已读
 * @param {Object} data - { reminderId }
 */
export function markSystemMessageRead(data) {
  return request({
    url: "/business/sys-message-reminder/read",
    method: "post",
    data,
  });
}
/**
 * 标记所有系统消息为已读
 */
export function markAllSystemMessagesRead() {
  return request({
    url: "/business/sys-message-reminder/read-all",
    method: "post",
  });
}
/**
 * 新增公告
 * @param {Object} data - 公告数据
 */
export function addNotice(data) {
  return request({
    url: "/system-v1/notice",
    method: "post",
    data: data,
  });
}

/**
 * 修改公告
 * @param {Object} data - 公告数据
 */
export function updateNotice(data) {
  return request({
    url: "/system-v1/notice",
    method: "put",
    data: data,
  });
}

/**
 * 删除公告
 * @param {string|number|Array} noticeId - 公告ID
 */
export function delNotice(noticeId) {
  return request({
    url: "/system-v1/notice/" + noticeId,
    method: "delete",
  });
}

/**
 * 查询前端公告详情（运营后台编辑回显）
 * GET /business/notice/detail
 * 不传参数
 */
export function getFrontendNoticeDetail() {
  return request({
    url: "/business/notice/detail",
    method: "get",
  });
}

/**
 * 修改前端公告
 * POST /business/notice/edit
 * @param {{
 *   id?: number|string,
 *   title: string,
 *   userLabelId?: string,
 *   clientKey?: string,
 *   startTime?: string,
 *   endTime?: string,
 *   content: string
 * }} data
 */
export function editFrontendNotice(data) {
  return request({
    url: "/business/notice/edit",
    method: "post",
    data,
  });
}
