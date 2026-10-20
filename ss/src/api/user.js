import request from "@/utils/request";
// 发送验证码
export function photoCode(phonenumber) {
  return request({
    url: "/resource/sms/code", // 请求的API地址
    method: "get", // 请求方法为POST
    params: { phonenumber }, // 请求体数据
  });
}
/**
 * 登录功能函数
 * @param {Object} data - 登录所需的数据对象
 * @returns {Promise} - 返回一个Promise对象，包含登录请求的结果
 */
export function login(data) {
  return request({
    // 发起登录请求
    url: "/auth/login", // 请求的API地址
    method: "post", // 请求方法为POST
    data, // 请求体数据
  });
}

// 忘记密码
export function resetPassword(data) {
  return request({
    url: "/auth/reset-password", // 请求的API地址
    method: "post", // 请求方法为POST
    data, // 请求体数据
  });
}
/**
 * 获取用户信息
 * @param {string} token - 用户认证令牌
 * @returns {Promise} 返回一个Promise对象，包含请求结果
 */
export function getInfo(token) {
  return request({
    url: "/system/user/getInfo", // 请求的API地址
    method: "get", // 请求方法为GET
    params: { token }, // 请求参数，传入token
  });
}

/**
 * 用户登出功能函数
 * 该函数用于发送登出请求到服务器
 * @returns {Promise} 返回一个Promise对象，包含服务器响应结果
 */
export function logout() {
  return request({
    url: "/auth/logout", // 登出API的URL路径
    method: "post", // 使用POST方法请求
  });
}

/**
 * 获取环信 App Token
 * @param {Object} data - 请求体，通常包含当前登录用户的 userId
 * @returns {Promise} - 返回环信登录令牌
 */
export function getHuanxinToken(data) {
  return request({
    url: "/im/msg/get",
    method: "post",
    data,
  });
}

/**
 * 更新用户信息
 * @param {Object} data - 包含用户更新信息的对象
 * @returns {Promise} - 返回一个Promise对象，用于处理请求结果
 */
export function updateUser(data) {
  return request({
    url: "/business/businessUser/updateUser", // 请求的API地址
    method: "post", // 请求方法为POST
    data, // 请求体数据
  });
}

/**
 * 文件上传功能函数
 * @param {Object} data - 上传文件的数据对象
 * @param {Object} [config] - 额外的 axios 配置（如 onUploadProgress、signal、silentError）
 * @returns {Promise} 返回一个Promise对象，包含服务器响应结果
 */
export function fileUpload(data, config = {}) {
  return request({
    url: "/common/file/upload", // 文件上传的API端点
    method: "post", // 请求方法为POST
    data, // 请求体数据，包含要上传的文件信息
    ...config,
  });
}
