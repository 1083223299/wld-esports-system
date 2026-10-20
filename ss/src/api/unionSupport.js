import request from "@/utils/request";

export function unionList(params) {
  return request({
    url: "/trade/union-user", // 请求的API地址
    method: "get", // 请求方法为
    params, // 请求体数据
  });
}

// 禁用/启用 公会陪陪
export function unionStatus(data) {
  return request({
    url: "/trade/union-user", // 请求的API地址
    method: "post", // 请求方法为
    data, // 请求体数据
  });
}

// 设置/取消公会客服
export function unionCustomerService(data) {
  return request({
    url: "/trade/union-user/cs",
    method: "post",
    data,
  });
}

// 设置或取消公会陪陪「推荐搭档」开关（俱乐部端可传本公会，平台运营端必传目标公会）
export function setRecommendPartner(data) {
  return request({
    url: "/trade/union-user/recommend-partner",
    method: "post",
    data,
  });
}

// 陪陪技能/价格信息
export function unionSkill(data) {
  return request({
    url: "/trade/union-user/price", // 请求的API地址
    method: "post", // 请求方法为
    data, // 请求体数据
  });
}

// 评论列表
export function unionComment(data) {
  return request({
    url: "/trade/union-user/post", // 请求的API地址
    method: "post", // 请求方法为
    data, // 请求体数据
  });
}

// 新增陪陪
export function unionAdd(data) {
  return request({
    url: "/trade/union-user/add/batch", // 请求的API地址
    method: "post", // 请求方法为
    data, // 请求体数据
  });
}

// 公会列表
export function unionListAll(params) {
  return request({
    url: "/trade/union/list", // 请求的API地址
    method: "get", // 请求方法为
    params, // 请求体数据
  });
}

// 根据手机号搜索陪陪信息
export function unionSearch(params) {
  return request({
    url: "/trade/union-user/check", // 请求的API地址
    method: "get", // 请求方法为
    params, // 请求体数据
  });
}

// 校验手机号是否能邀请
export function checkUserInvitationPhone(phone, tradeId, flag = true) {
  return request({
    url: `/system/userInvitation/check/${encodeURIComponent(phone)}`,
    method: "get",
    params: { tradeId, flag },
  });
}

// 批量新增工会邀请用户记录
export function batchAddUserInvitation(data) {
  return request({
    url: "/system/userInvitation/batchAdd",
    method: "post",
    data,
  });
}

// 切换运营状态
export function unionBusinessStatus(params) {
  return request({
    url: "/business/businessUser/offUser", // 请求的API地址
    method: "get", // 请求方法为
    params,
  });
}

// 管理用户主技能置顶
export function manageUserSkillTop(data) {
  return request({
    url: "/business/UserSkillManagement/manageUserSkillTop",
    method: "put",
    data,
  });
}

// 更新用户置顶排序值
export function updateTopSortValue(data) {
  return request({
    url: "/business/UserSkillManagement/updateTopSortValue",
    method: "put",
    data,
  });
}

// 查询用户所有技能，供技术陪管理弹窗选择
export function getUserAllSkills(userId) {
  return request({
    url: `/business/UserSkillManagement/skills/${userId}`,
    method: "get",
  });
}

// 批量设置或取消技能的技术陪状态
export function batchManageTechnicalWaiter(data) {
  return request({
    url: "/business/UserSkillManagement/batchManageTechnicalWaiter",
    method: "put",
    data,
  });
}

// 移出俱乐部
export function executeExit(data) {
  return request({
    url: "/business/trade/exit/executeExit",
    method: "post",
    data,
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

// 陪玩技能下拉列表
export function getCompanionSkillList(data) {
  return request({
    url: "/admin/personal-companion/companion-skill-list",
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
