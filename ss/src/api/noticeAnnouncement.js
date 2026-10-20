import request from "@/utils/request";

/**
 * 分页查询运营通知公告列表，支持按标题、操作人、类型、发送时间筛选
 * @param {Object} data - { pageNum, pageSize, title, operatorName, noticeType, sendTimeStart, sendTimeEnd }
 */
export function listNoticeAnnouncement(data) {
  return request({
    url: "/business/operation-notice/page",
    method: "post",
    data,
  });
}

/**
 * 查询运营通知公告详情，用于编辑前回显
 * @param {string|number} id - 公告ID
 */
export function getNoticeAnnouncement(id) {
  return request({
    url: "/business/operation-notice/detail",
    method: "post",
    data: { id },
  });
}

/**
 * 新增运营通知公告，保存为待发送状态，到点后由定时任务推送
 * @param {Object} data - 公告数据
 */
export function addNoticeAnnouncement(data) {
  return request({
    url: "/business/operation-notice/add",
    method: "post",
    data,
  });
}

/**
 * 编辑运营通知公告；待发送可改全部字段，已发布仅更新后台展示字段且不重新推送
 * @param {Object} data - 公告数据
 */
export function updateNoticeAnnouncement(data) {
  return request({
    url: "/business/operation-notice/edit",
    method: "post",
    data,
  });
}

/**
 * 删除运营通知公告；若已推送则同步删除用户系统通知消息
 * @param {string|number|Array} ids - 公告ID（或ID数组）
 */
export function delNoticeAnnouncement(ids) {
  const idList = Array.isArray(ids) ? ids : [ids];
  return request({
    url: "/business/operation-notice/delete",
    method: "post",
    data: { ids: idList },
  });
}