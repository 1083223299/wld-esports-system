import request from "@/utils/request";

// 订单列表
export function ordersList(params) {
  return request({
    url: "/system/orders/getTaoBaoList", // 请求的API地址
    method: "get", // 请求方法为
    params // 请求体数据
  });
}

