import request from "@/utils/request";

/** 俱乐部申请提现保证金 */
export function clubDepositWithdrawApply(data) {
  return request({
    url: "/business/deposit-withdraw-order/club-apply",
    method: "post",
    data
  });
}

/** 分页查询俱乐部保证金提现列表 */
export function getClubDepositWithdrawList(data) {
  return request({
    url: "/business/deposit-withdraw-order/club-list",
    method: "post",
    data: data || {}
  });
}

/** 审核俱乐部保证金提现申请 */
export function auditClubDepositWithdraw(data) {
  return request({
    url: "/business/deposit-withdraw-order/club-audit",
    method: "post",
    data
  });
}

/** 财务处理俱乐部保证金提现打款 */
export function payClubDepositWithdraw(data) {
  return request({
    url: "/business/deposit-withdraw-order/club-pay",
    method: "post",
    data
  });
}

/** 分页查询个人保证金提现列表 */
export function getPersonalDepositWithdrawList(data) {
  return request({
    url: "/business/deposit-withdraw-order/personal-list",
    method: "post",
    data: data || {}
  });
}

/** 审核个人保证金提现申请 */
export function auditPersonalDepositWithdraw(data) {
  return request({
    url: "/business/deposit-withdraw-order/personal-audit",
    method: "post",
    data
  });
}

/** 财务人工处理个人保证金提现打款 */
export function payPersonalDepositWithdraw(data) {
  return request({
    url: "/business/deposit-withdraw-order/personal-manual-pay",
    method: "post",
    data
  });
}
