import request from "@/utils/request";
// 获取入驻陪玩列表
export function getUserListIsWaiter(params) {
  return request({
    url: "/business/businessUser/getUserListIsWaiter", // 请求的API地址
    method: "get",
    params
  });
}

// 获取入驻用户列表
export function getBusinessUserList(params) {
  return request({
    url: "/business/businessUser/listV2", // 请求的API地址
    method: "get",
    params
  });
}
