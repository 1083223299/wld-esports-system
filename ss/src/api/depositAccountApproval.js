import request from "@/utils/request";

/** 获取保证金账户信息 type: 0个人 1工会 */
export function getDepositAccount(data) {
  return request({
    url: "/business/deposit-account-approval/depositAccount",
    method: "post",
    data: data || {}
  });
}

/** 新增保证金扣减审批 */
export function addDepositAccountApproval(data) {
  return request({
    url: "/business/deposit-account-approval/add",
    method: "post",
    data
  });
}

/** 查询保证金扣减审批列表 */
export function getDepositAccountApprovalList(data) {
  return request({
    url: "/business/deposit-account-approval/list",
    method: "post",
    data: data || {}
  });
}

/** 获取订单能否操作保证金扣减标记；data=true 可扣减，false 不可扣减 */
export function getDepositAccountFlag(data) {
  return request({
    url: "/business/deposit-account-approval/depositAccountFlag",
    method: "post",
    data: data || {}
  });
}

/** 审核保证金扣减审批 */
export function auditDepositAccountApproval(data) {
  return request({
    url: "/business/deposit-account-approval/edit",
    method: "post",
    data
  });
}
