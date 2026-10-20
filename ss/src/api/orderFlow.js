import request from "@/utils/request";

// 订单流水列表
export function ordersList(params) {
  return request({
    url: "/system/orders/list", // 请求的API地址
    method: "get", // 请求方法为
    params // 请求体数据
  });
}

// 订单聊天记录，pageNum 从 1 开始，接口默认每页 20 条
export function chatRecordList(data) {
  return request({
    url: "/business/order-flow/chat-record-list",
    method: "post",
    data
  });
}

// 订单流水详情
export function ordersDetail(params) {
  return request({
    url: `/system/orders/${params}`, // 请求的API地址
    method: "get", // 请求方法为
  });
}

// 发起退款
export function initiateRefund(data) {
  return request({
    url: "/system/ordersRefund", // 请求的API地址
    method: "post", // 请求方法为
    data // 请求体数据
  });
}

// 退款记录列表
export function refundList(params) {
  return request({
    url: "/system/ordersRefund/list", // 请求的API地址
    method: "get", // 请求方法为
    params // 请求体数据
  });
}

// 同意、拒绝 退款
export function refundStatus(data) {
  return request({
    url: "/system/ordersRefund", // 请求的API地址
    method: "put", // 请求方法为
    data // 请求体数据
  });
}

// 日志列表
export function logList(params) {
  return request({
    url: "/system/operationLog/list", // 请求的API地址
    method: "get", // 请求方法为
    params // 请求体数据
  });
}

// 收益明细
export function revenueDetail(data) {
  return request({
    url: "/system/orders/revenue-detail",
    method: "post",
    data
  });
}

// 陪陪流水
// merchantName 商户名称
// sourceChannel 渠道：ALL/app_android/app_ios/merchant_tb/wld_tb（兼容 android/ios）
export function AccompanyWaterList(data) {
  return request({
    url: "/business/accountLog/flowRecordList", // 请求的API地址
    method: "post", // 请求方法为
    data // 请求体数据
  });
}

// 纳税明细（云账户代发成功的用户提现记录）
export function getUserWithdrawTaxList(data) {
  return request({
    url: "/business/user-withdraw/tax-list",
    method: "post",
    data
  });
}

// 平台流水
export function PlatformFlowList(data) {
  return request({
    url: "/business/accountLog/platformFlowList", // 请求的API地址
    method: "post", // 请求方法为
    data // 请求体数据
  });
}

// 平台流水导出
export function PlatformFlowExport(data) {
  return request({
    url: "/business/accountLog/platform-flow-export",
    method: "post",
    data,
    responseType: "blob"
  });
}

// 查询充值订单列表
export function RechargeOrderList(params) {
  return request({
    url: "/business/accountLog/RechargeOrderList", // 请求的API地址
    method: "get", // 请求方法为
    params // 请求体数据
  });
}

// 充值订单详情
export function RechargeOrderDetail(orderNo) {
  return request({
    url: "/business/accountLog/RechargeOrderDetail", // 请求的API地址
    method: "get", // 请求方法为
    params: { orderNo }
  });
}

// 充值订单退款记录详情
export function RechargeRefundDetail(orderNo) {
  return request({
    url: `/business/accountLog/RechargeOrderDetailV2/${orderNo}`,
    method: "get",
  });
}

// 订单未来币扣减按钮显示标记
export function getOrderApprovalFlag(id) {
  return request({
    url: `/system/orders/orderApprovalFlag/${id}`,
    method: "get"
  });
}

// 充值退款按钮
// orderNo 订单号 
// refundAmount  金额
export function rechargeRefund(data) {
  return request({
    url: "/business/accountLog/rechargeRefund",
    method: "post",
    data
  });
}
