import request from "@/utils/request";

// 订单流水列表
export function ordersList(params) {
    return request({
      url: "/system/orders/list", // 请求的API地址
      method: "get", // 请求方法为
      params // 请求体数据
    });
}

// 订单流水详情
export function ordersDetail(params) {
  return request({
    url: `/system/orders/${params}`, // 请求的API地址
    method: "get", // 请求方法为
  });
}

// 管理员发起未来币退款。淘宝退款由淘宝 C 端发起，后台不调用此接口创建淘宝退款。
export function initiateRefund(data) {
  return request({
    url: "/system/orders-refund/create-refund",
    method: "post",
    data
  });
}

// 分页查询退款记录
export function refundList(params) {
  return request({
    url: "/system/orders-refund/refund-list",
    method: "post",
    data: params
  });
}

// 管理员审核退款：0 同意，1 拒绝
export function refundStatus(data) {
  return request({
    url: "/system/orders-refund/review-refund",
    method: "post",
    data
  });
}

// 失败退款原记录重试，不新建退款记录
export function retryRefund(data) {
  return request({
    url: "/system/orders-refund/retry-refund",
    method: "post",
    data
  });
}
