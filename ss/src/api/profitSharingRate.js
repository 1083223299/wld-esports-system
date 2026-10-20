import request from "@/utils/request";

/** 个人分润配置列表 */
export function getProfitSharingRateList(params) {
  return request({
    url: "/business/profit-sharing-rate/list",
    method: "get",
    params,
  });
}

/** 新增个人分润配置 */
export function addProfitSharingRate(data) {
  return request({
    url: "/business/profit-sharing-rate",
    method: "post",
    data,
  });
}

/** 修改个人分润配置 */
export function updateProfitSharingRate(data) {
  return request({
    url: "/business/profit-sharing-rate",
    method: "put",
    data,
  });
}

/** 个人分润配置详情 */
export function getProfitSharingRateDetail(profitId) {
  return request({
    url: `/business/profit-sharing-rate/${profitId}`,
    method: "get",
  });
}

/** 删除个人分润配置 */
export function deleteProfitSharingRate(profitId) {
  return request({
    url: `/business/profit-sharing-rate/${profitId}`,
    method: "delete",
  });
}
