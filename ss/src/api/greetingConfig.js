import request from "@/utils/request";

/**
 * 陪陪自动回复配置 - 列表查询
 */
export function greetingList(data) {
  return request({
    url: "/business/greeting/system/list",
    method: "post",
    data,
  });
}

/**
 * 陪陪自动回复配置 - 新增/编辑
 * @param {Object} data - { id?, content, sourceType? }
 */
export function greetingSave(data) {
  return request({
    url: "/business/greeting/save",
    method: "post",
    data,
  });
}

/**
 * 陪陪自动回复配置 - 删除
 * @param {Object} params - { id, sourceType }
 */
export function greetingDelete(data) {
  return request({
    url: "/business/greeting/delete",
    method: "post",
    data,
  });
}

/**
 * 陪陪自动回复配置 - 禁用
 */
export function greetingDisable(data) {
  return request({
    url: "/business/greeting/disable",
    method: "post",
    data,
  });
}
