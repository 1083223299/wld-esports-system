import request from "@/utils/request";

// 公会流水列表
export function unionAccountLogList(params) {
    return request({
      url: "/system/union-accountLog/list", // 请求的API地址
      method: "get", // 请求方法为
      params // 请求体数据
    });
}
