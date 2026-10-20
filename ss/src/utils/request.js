import axios from "axios";
import { MessageBox, Message } from "element-ui";
import store from "@/store";
import { getToken, removeToken } from "@/utils/auth";
import { runBeforeReload } from "@/utils/appEvents";
// import router from '@/router/index.js'

/**
 * 登录失效后的收尾重载。
 * 整页重载不会执行 Vue 组件的 beforeDestroy，所以先让业务（比如退出 TRTC 房间）
 * 跑完收尾任务，再刷新页面，避免巡查连接滞留在房间里。
 */
function reloadAfterCleanup() {
  runBeforeReload().then(() => {
    location.reload();
  });
}

// 创建axios实例
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 240000,
});
// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 携带token逻辑（保留原有逻辑）
    if (store.getters.token) {
      config.headers["authorization"] = `Bearer ${getToken()}`;
    }
    config.headers["clientid"] = `e5cd7e4891bf95d1d19206ce24a7b32e`;
    // configURL = config.url;
    return config;
  },
  (error) => {
    console.error("请求拦截器错误：", error);
    // 确保始终返回Promise.reject，避免中断
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    try {
      let res = response.data.data;
      // 如果 res 不存在，直接返回
      if (!res) {
        console.warn('响应数据为空');
        return response;
      }

      // 判断是否登录接口过期，如果过期则跳转到登录页面
      if (res.errorCode === '50001') {
        removeToken();
        // 跳转到登录页面
        setTimeout(() => {
          MessageBox.alert(`${res.errorCode}: ${res.errorMessage}`, '提示', {
            confirmButtonText: '重新登录',
          }).then(() => {
            store.dispatch("user/resetToken").then(() => {
              reloadAfterCleanup();
            });
          })
        }, 800)
        return
      }

      // 1. 优先判断HTTP状态码（基础层面的成功）
      if (response.data && response.data.code && (response.data.code < 200 || response.data.code >= 300)) {
        Message({
          message: "请求失败（HTTP状态码异常）" + (response.data.errorMessage || response.data.msg || ''),
          type: "error",
          duration: 5 * 1000,
        });
        return Promise.reject(new Error("HTTP状态码异常" + (response.data.errorMessage || response.data.msg || '')));
      }

      // 2. 判断业务code（你的自定义规则）
      if (res.errorCode !== undefined && res.errorCode !== '0') {
        console.log(res);

        // silentError：轮询等场景由业务自行处理，避免重复弹 toast
        if (!(response.config && response.config.silentError)) {
          Message({
            message: res.errorMessage || res.data.errorMessage || res.msg || "接口请求失败",
            type: "error",
            duration: 5 * 1000,
          });
        }

        // token相关错误处理（保留原有逻辑）
        if ([50008, 50012, 50014].includes(res.errorMessage)) {
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
              reloadAfterCleanup();
            });
          });
        }
        // 关键修复：无论业务code是否正确，都返回Promise（失败则reject）
        return Promise.reject(new Error(res.errorMessage || res.data.errorMessage || res.msg || "接口业务错误"));
      } else {
        // 业务成功，返回数据
        return res;
      }
    } catch (e) {
      // 捕获解析response.data的异常（比如非JSON响应）
      console.error("响应解析错误：", e);
      if (!(response.config && response.config.silentError)) {
        Message({
          message: "响应数据格式错误",
          type: "error",
          duration: 5 * 1000,
        });
      }
      return Promise.reject(e);
    }
  },
  (error) => {
    console.log('cuowuchuli', error);

    // 统一处理网络错误/超时/404等场景
    let errMsg = "接口请求失败";
    if (error.code === "ECONNABORTED") {
      errMsg = "请求超时，请稍后重试";
    } else if (error.message.includes("Network Error")) {
      errMsg = "网络异常，请检查网络连接";
    } else if (error.response) {
      // 有响应但状态码非2xx
      errMsg = `请求失败（${error.response.status}）：${error.message}`;
    }

    console.error("响应拦截器错误：", error);
    if (!(error.config && error.config.silentError)) {
      Message({
        message: errMsg,
        type: "error",
        duration: 5 * 1000,
      });
    }
    // 关键：确保错误分支也返回Promise.reject
    return Promise.reject(error);
  }
);

export default service;
