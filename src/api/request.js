import { config } from '../config/env';
import { getToken, removeToken } from '../utils/auth';
import { useToast } from '../composables/useToast';
import { ElMessageBox } from 'element-plus';

const BASE_URL = config.apibaseURL;
const TIMEOUT = config.timeout || 8000;

const requestInterceptors = {
  before: [],
  after: [],
};

let authFailurePrompted = false;
let authPromptPromise = null;
let authFailureToastAt = 0;

window.addEventListener('auth:restored', () => {
  authFailurePrompted = false;
  authPromptPromise = null;
  authFailureToastAt = 0;
});

export function addRequestInterceptor(fn) {
  requestInterceptors.before.push(fn);
}

export function addResponseInterceptor(fn) {
  requestInterceptors.after.push(fn);
}

function notifyError(message) {
  const { show } = useToast();
  show(message, 'error');
}

async function handleUnauthorized(errorMessage) {
  if (!getToken()) {
    notifyError(errorMessage);
    return;
  }

  if (!authFailurePrompted) {
    authFailurePrompted = true;
    window.dispatchEvent(new CustomEvent('auth:expired'));
    authPromptPromise = ElMessageBox.confirm(
      '当前登录状态已失效，部分操作无法继续。选择“留在当前页”可继续查看页面，但账号功能需要重新登录后才能恢复。',
      '账号状态异常',
      {
        confirmButtonText: '退出登录',
        cancelButtonText: '留在当前页',
        distinguishCancelAndClose: true,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        type: 'warning',
      },
    )
      .then(() => {
        removeToken();
        window.location.hash = '#/login';
      })
      .catch(() => {})
      .finally(() => {
        authPromptPromise = null;
      });
  }

  if (authPromptPromise) {
    await authPromptPromise;
    return;
  }

  const now = Date.now();
  if (now - authFailureToastAt > 3000) {
    authFailureToastAt = now;
    notifyError('账号登录状态异常，当前操作未完成');
  }
}

async function http({ url, method = 'GET', data, headers = {}, timeout = TIMEOUT }) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  // FormData（文件上传）不走 JSON 序列化，且 Content-Type 交由浏览器自动带 boundary
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;

  let requestConfig = { url, method, headers: { Accept: 'application/json', ...headers } };

  for (const interceptor of requestInterceptors.before) {
    requestConfig = (await interceptor(requestConfig)) || requestConfig;
  }

  const authToken = getToken();
  if (authToken && !requestConfig.headers.Authorization) {
    requestConfig.headers.Authorization = `Bearer ${authToken}`;
  }

  // 401 分支已自行 toast，catch 里不再重复提示
  let notified = false;

  try {
    const targetUrl = /^https?:\/\//.test(requestConfig.url)
      ? requestConfig.url
      : `${BASE_URL}${requestConfig.url}`;

    const res = await fetch(targetUrl, {
      method: requestConfig.method,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...requestConfig.headers,
      },
      body: isFormData ? data : data !== undefined && data !== null ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    let payload = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await res.json();
    } else {
      payload = await res.text();
    }

    // ---- 错误归一化：错误提示一律直接取后端返回的 message ----
    const isObject = payload && typeof payload === 'object';
    const bodyMessage = isObject ? payload.message : null;

    // 401 未授权：HTTP 状态码 401，或响应体 code=401 / bizCode=UNAUTHORIZED
    const unauthorized =
      res.status === 401 ||
      (isObject && (payload.code === 401 || payload.bizCode === 'UNAUTHORIZED'));

    // 后端没给 message 时才用兜底文案
    const errorMessage =
      bodyMessage || (unauthorized ? '登录已过期，请重新登录' : `请求失败（HTTP ${res.status}）`);

    // 统一把 code/bizCode/httpStatus 挂到 Error 上，供业务分支（如 ORDER_TAKEN）识别
    const attachErrorMeta = (err) => {
      if (isObject) {
        err.code = payload.code;
        err.bizCode = payload.bizCode;
      }
      err.status = res.status;
      return err;
    };

    if (unauthorized) {
      notified = true;
      await handleUnauthorized(errorMessage);
      throw attachErrorMeta(new Error(errorMessage));
    }

    if (!res.ok) {
      throw attachErrorMeta(new Error(errorMessage));
    }

    if (isObject && 'code' in payload && payload.code !== 0 && payload.code !== 200) {
      throw attachErrorMeta(new Error(bodyMessage || '业务处理失败'));
    }

    let result = isObject && 'data' in payload ? payload.data : payload;
    for (const interceptor of requestInterceptors.after) {
      result = (await interceptor(result, res, payload)) ?? result;
    }

    return result;
  } catch (error) {
    const requestError = timedOut
      ? new Error(`请求超时（${timeout / 1000}秒），请稍后重试`)
      : error;
    const message = requestError?.message || '请求失败';
    if (!notified) {
      notifyError(message);
    }
    throw requestError;
  } finally {
    clearTimeout(timer);
  }
}

function mock(payload, delay = 300) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(JSON.parse(JSON.stringify(payload))), delay);
  });
}

export const request = {
  http,
  mock,
  get: (url, headers) => http({ url, method: 'GET', headers }),
  post: (url, data, headers) => http({ url, method: 'POST', data, headers }),
  put: (url, data, headers, options = {}) =>
    http({ url, method: 'PUT', data, headers, ...options }),
  del: (url, headers) => http({ url, method: 'DELETE', headers }),
};
