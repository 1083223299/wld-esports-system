import request from "@/utils/request";

/** 分页查询个人保证金明细 */
export function getPersonalDepositFlowList(data) {
  return request({
    url: "/business/depositPersonalFlow/list",
    method: "post",
    data: data || {}
  });
}

/** 分页查询运营端俱乐部保证金流水 */
export function getClubDepositFlowList(data) {
  return request({
    url: "/business/deposit-club-flow/list",
    method: "post",
    data: data || {}
  });
}
