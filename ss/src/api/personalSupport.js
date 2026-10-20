import request from "@/utils/request";

export function getPersonalUserList(data) {
  return request({
    url: "/admin/personal-companion/list", // 请求的API地址
    method: "post", // 请求方法为
    data // 请求体数据
  });
}
// 禁用/启用陪玩账号
export function personalStatus(data) {
  return request({
    url: "/business/businessUser/updateUserStatus", // 请求的API地址
    method: "post", // 请求方法为
    data // 请求体数据
  });
}

// 管理用户技能置顶
export function manageUserSkillTop(data) {
  return request({
    url: "/business/UserSkillManagement/manageUserSkillTop",
    method: "put",
    data
  });
}

// 更新用户置顶排序值
export function updateTopSortValue(data) {
  return request({
    url: "/business/UserSkillManagement/updateTopSortValue",
    method: "put",
    data
  });
}

// 查询用户所有技能，供技术陪管理弹窗选择
export function getUserAllSkills(userId) {
  return request({
    url: `/business/UserSkillManagement/skills/${userId}`,
    method: "get"
  });
}

// 批量设置或取消技能的技术陪状态
export function batchManageTechnicalWaiter(data) {
  return request({
    url: "/business/UserSkillManagement/batchManageTechnicalWaiter",
    method: "put",
    data
  });
}

// 技术陪管理回显
export function getTechnicalCompanionManageInfo(data) {
  return request({
    url: "/admin/personal-companion/technical-companion-manage-info",
    method: "post",
    data
  });
}

// 批量保存技术陪管理
export function batchSaveTechnicalCompanion(data) {
  return request({
    url: "/admin/personal-companion/batch-save-technical-companion",
    method: "post",
    data
  });
}


// 用户列表
export function userList(data) {
  return request({
    url: "/business/businessUser/userList", // 请求的API地址
    method: "post", // 请求方法为
    data // 请求体数据
  });
}
// 用户列表--启用/禁用
export function updateUserStatus(data) {
  return request({
    url: "/business/businessUser/updateUserStatus", // 请求的API地址
    method: "post", // 请求方法为
    data // 请求体数据
  });
}

// 用户资产查询
export function getUserAccountDetail(userId) {
  return request({
    url: `/business/businessUser/account/${userId}`,
    method: "get"
  });
}

// 新增未来币扣减申请
export function addAccountApproval(data) {
  return request({
    url: "/system/accountApproval/add",
    method: "post",
    data
  });
}

// 未来币扣减日志列表
export function listAccountApproval(params) {
  return request({
    url: "/system/accountApproval/list",
    method: "get",
    params
  });
}

// 未来币扣减开放日志列表
export function openListAccountApproval(params) {
  return request({
    url: "/system/accountApproval/openList",
    method: "get",
    params
  });
}

// 审核未来币扣减申请
export function editAccountApproval(data) {
  return request({
    url: "/system/accountApproval/edit",
    method: "post",
    data
  });
}
