import request from "@/utils/request";

// 举报查看/分页列表
export function getReportComplaintList(params) {
  return request({
    url: "/business/report-complaint/list",
    method: "get",
    params
  });
}

// 禁用账户详情查询
export function getReportComplaintDetail(params) {
  return request({
    url: "/business/report-complaint/query",
    method: "get",
    params
  });
}

// 删除陪陪游戏身份查询（旧）
export function getUserPriceClass(params) {
  return request({
    url: "/business/userPrice/userPriceClass",
    method: "get",
    params
  });
}

// 删除陪陪游戏技能（旧）
export function delUserWaiter(data) {
  return request({
    url: "/business/report-complaint/delUserWaiter",
    method: "post",
    data
  });
}

// 冻结陪陪游戏-查询可冻结技能
export function getSupportedGames(userId) {
  return request({
    url: `/business/waiter-ban-skill/supported-games/${userId}`,
    method: "get"
  });
}

// 冻结陪陪技能
export function freezeWaiterSkill(data) {
  return request({
    url: "/business/report-complaint/freeze",
    method: "post",
    data
  });
}

// 禁用账号
export function updateUserStatus(data) {
  return request({
    url: "/business/businessUser/updateUserStatus",
    method: "post",
    data
  });
}

// 不处理
export function notProcess(data) {
  return request({
    url: "/business/report-complaint/notProcess",
    method: "post",
    data
  });
}
