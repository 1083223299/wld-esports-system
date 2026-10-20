import axios from "axios";
import { MessageBox, Message } from "element-ui";
import store from "@/store";
import { getToken, removeToken } from "@/utils/auth";

/**
 * 将对象转换为 URL 查询字符串
 * @param {Object} params 参数对象
 * @returns {String} 查询字符串
 */
const tansParams = (params) => {
  let result = '';
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      result += `${key}=${encodeURIComponent(params[key])}&`;
    }
  }
  return result;
};

// 创建axios实例
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 50000,
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 1. 添加认证信息
    if (store.getters.token) {
      config.headers["authorization"] = `Bearer ${getToken()}`;
    }
    config.headers["clientid"] = `e5cd7e4891bf95d1d19206ce24a7b32e`;

    // 2. 处理 GET 请求：将 params 拼接到 URL
    if (config.method === 'get' && config.params) {
      let url = config.url + '?' + tansParams(config.params);
      url = url.slice(0, -1); // 去掉最后一个 &
      config.params = {};
      config.url = url;
    }

    // 3. 处理 POST/PUT 请求：将 data 序列化为 JSON 字符串
    if ((config.method === 'post' || config.method === 'put') && config.data) {
      // 如果是 FormData，不处理（用于文件上传）
      if (!(config.data instanceof FormData)) {
        config.data = JSON.stringify(config.data);
        config.headers['Content-Type'] = 'application/json;charset=utf-8';
      }
    }

    // 4. 可选：防重复提交（如果需要可以开启）
    // const isRepeatSubmit = config.headers?.repeatSubmit === false;
    // if (!isRepeatSubmit && (config.method === 'post' || config.method === 'put')) {
    //   // 防重复提交逻辑...
    // }

    return config;
  },
  (error) => {
    console.error("请求拦截器错误：", error);
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    try {
      // 获取响应数据
      const rawData = response.data.data;

      console.log('原始响应:', rawData);

      // 如果响应数据为空，直接返回
      if (!rawData) {
        console.warn('响应数据为空');
        return Promise.reject(new Error('响应数据为空'));
      }

      // 处理登录过期（根据你的后端返回结构调整）
      // 情况1: 直接返回 code 401
      if (rawData.code === 401 || rawData.code === 50001) {
        removeToken();
        setTimeout(() => {
          MessageBox.alert(`${rawData.code}: ${rawData.msg || rawData.errorMessage || '登录已过期'}`, '提示', {
            confirmButtonText: '重新登录',
          }).then(() => {
            store.dispatch("user/resetToken").then(() => {
              location.reload();
            });
          });
        }, 800);
        return Promise.reject(new Error('登录已过期'));
      }

      // 情况2: 有 data 嵌套的情况（老后台常见）
      const res = rawData.data || rawData;

      // 检查是否有 errorCode 字段
      if (res.errorCode !== undefined && res.errorCode !== '0') {
        // 业务失败
        Message({
          message: res.errorMessage || res.msg || "接口请求失败",
          type: "error",
          duration: 5 * 1000,
        });

        // 特殊错误码处理
        if ([50008, 50012, 50014].includes(res.errorCode)) {
          MessageBox.confirm(
            "您已退出登录，可取消留在此页面或重新登录",
            "确认退出",
            {
              confirmButtonText: "重新登录",
              cancelButtonText: "取消",
              type: "warning",
            }
          ).then(() => {
            store.dispatch("user/resetToken").then(() => {
              location.reload();
            });
          });
        }
        return Promise.reject(new Error(res.errorMessage || res.msg || "接口业务错误"));
      }

      // 检查是否有 code 字段（标准 REST API）
      if (res.code !== undefined && res.code !== 200) {
        Message({
          message: res.msg || res.errorMessage || "接口请求失败",
          type: "error",
          duration: 5 * 1000,
        });
        return Promise.reject(new Error(res.msg || res.errorMessage || "接口请求失败"));
      }

      // 业务成功，返回数据
      // 如果 rawData 有 data 字段，返回 rawData.data；否则返回 rawData
      return rawData.data !== undefined ? rawData.data : rawData;

    } catch (e) {
      console.error("响应解析错误：", e);
      Message({
        message: "响应数据格式错误",
        type: "error",
        duration: 5 * 1000,
      });
      return Promise.reject(e);
    }
  },
  (error) => {
    console.log('错误处理', error);

    // 统一处理网络错误/超时/404等场景
    let errMsg = "接口请求失败";
    if (error.code === "ECONNABORTED") {
      errMsg = "请求超时，请稍后重试";
    } else if (error.message.includes("Network Error")) {
      errMsg = "网络异常，请检查网络连接";
    } else if (error.response) {
      // 有响应但状态码非2xx
      errMsg = `请求失败（${error.response.status}）：${error.message}`;

      // 处理 401 未授权
      if (error.response.status === 401) {
        removeToken();
        setTimeout(() => {
          MessageBox.alert('登录已过期，请重新登录', '提示', {
            confirmButtonText: '重新登录',
          }).then(() => {
            store.dispatch("user/resetToken").then(() => {
              location.reload();
            });
          });
        }, 800);
      }
    }

    console.error("响应拦截器错误：", error);
    Message({
      message: errMsg,
      type: "error",
      duration: 5 * 1000,
    });
    return Promise.reject(error);
  }
);

export default service;