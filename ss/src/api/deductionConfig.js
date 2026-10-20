import request from "@/utils/request";

// 保证金扣减原因列表
export function getDepositDeductReasonList(data) {
  return request({
    url: "/business/deposit-deduct-reason/list",
    method: "post",
    data
  });
}

// 保证金扣减原因详情
export function getDepositDeductReasonDetail(data) {
  return request({
    url: "/business/deposit-deduct-reason/detail",
    method: "post",
    data
  });
}

// 新增保证金扣减原因
export function addDepositDeductReason(data) {
  return request({
    url: "/business/deposit-deduct-reason/add",
    method: "post",
    data
  });
}

// 编辑保证金扣减原因
export function editDepositDeductReason(data) {
  return request({
    url: "/business/deposit-deduct-reason/edit",
    method: "post",
    data
  });
}

// 删除保证金扣减原因
export function deleteDepositDeductReason(data) {
  return request({
    url: "/business/deposit-deduct-reason/delete",
    method: "post",
    data
  });
}
