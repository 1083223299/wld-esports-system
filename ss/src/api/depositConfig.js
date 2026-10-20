import request from "@/utils/request";

// 查询个人保证金配置详情
export function getPersonalDepositDetail(data) {
  return request({
    url: "/business/deposit-config/personal-detail",
    method: "post",
    data: data || {}
  });
}

// 保存个人保证金金额配置
export function savePersonalDepositAmount(data) {
  return request({
    url: "/business/deposit-config/personal-amount-save",
    method: "post",
    data
  });
}

// 保存个人保证金提现配置
export function savePersonalDepositWithdraw(data) {
  return request({
    url: "/business/deposit-config/personal-withdraw-save",
    method: "post",
    data
  });
}

// 保存个人保证金规则配置
export function savePersonalDepositRule(data) {
  return request({
    url: "/business/deposit-config/personal-rule-save",
    method: "post",
    data
  });
}

// 查询俱乐部保证金配置详情
export function getClubDepositDetail(data) {
  return request({
    url: "/business/deposit-config/club-detail",
    method: "post",
    data: data || {}
  });
}

// 保存俱乐部保证金金额配置
export function saveClubDepositAmount(data) {
  return request({
    url: "/business/deposit-config/club-amount-save",
    method: "post",
    data
  });
}

// 保存俱乐部保证金提现配置
export function saveClubDepositWithdraw(data) {
  return request({
    url: "/business/deposit-config/club-withdraw-save",
    method: "post",
    data
  });
}

// 保存俱乐部保证金规则配置
export function saveClubDepositRule(data) {
  return request({
    url: "/business/deposit-config/club-rule-save",
    method: "post",
    data
  });
}
