import request from "@/utils/request";

// 查询全局参数
export function getCompanionRankGlobalDetail(data = {}) {
  return request({
    url: "/business/companion-rank-config/global/detail",
    method: "post",
    data,
  });
}

// 保存全局参数
export function saveCompanionRankGlobal(data) {
  return request({
    url: "/business/companion-rank-config/global/save",
    method: "post",
    data,
  });
}

// 群体配额列表
export function listCompanionRankGroups(data = {}) {
  return request({
    url: "/business/companion-rank-config/group/list",
    method: "post",
    data,
  });
}

// 保存群体
export function saveCompanionRankGroup(data) {
  return request({
    url: "/business/companion-rank-config/group/save",
    method: "post",
    data,
  });
}

// 群体优先级排序
export function sortCompanionRankGroups(data) {
  return request({
    url: "/business/companion-rank-config/group/sort",
    method: "post",
    data,
  });
}

// 启停群体
export function changeCompanionRankGroupStatus(data) {
  return request({
    url: "/business/companion-rank-config/group/change-status",
    method: "post",
    data,
  });
}

// 因子配置详情
export function getCompanionRankFactorDetail(data) {
  return request({
    url: "/business/companion-rank-config/factor/detail",
    method: "post",
    data,
  });
}

// 保存因子配置
export function saveCompanionRankFactors(data) {
  return request({
    url: "/business/companion-rank-config/factor/save",
    method: "post",
    data,
  });
}

// 预置规则码与因子码
export function getCompanionRankMetaOptions(data = {}) {
  return request({
    url: "/business/companion-rank-config/meta/options",
    method: "post",
    data,
  });
}
