import request from "@/utils/request";

export function versionList(params) {
    return request({
      url: "/business/app-version/list", // 请求的API地址
      method: "get", // 请求方法为
      params // 请求体数据
    });
}

// 详情
export function versionEat(params) {
    return request({
      url: `/business/app-version/${params}`, // 请求的API地址
      method: "get", // 请求方法为
      params // 请求体数据
    });
}

// 新增
export function versionAdd(data) {
  return request({
    url: "/business/app-version/add", // 请求的API地址
    method: "post", // 请求方法为
    data // 请求体数据
  });
}

// 修改
export function versionEdit(data) {
  return request({
    url: "/business/app-version/edit", // 请求的API地址
    method: "post", // 请求方法为
    data // 请求体数据
  });
}

/**
 * 文件上传功能函数
 * @param {Object} data - 上传文件的数据对象
 * @returns {Promise} 返回一个Promise对象，包含服务器响应结果
 */
export function fileUpload(data) {
  return request({
    url: "/business/app-version/upload-file", // 文件上传的API端点
    method: "post", // 请求方法为POST
    data, // 请求体数据，包含要上传的文件信息
  });
}
