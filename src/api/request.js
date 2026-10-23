import { config } from '../config/env';
import { getToken, removeToken } from '../utils/auth';
import { useToast } from '../composables/useToast';

const BASE_URL = config.apibaseURL;
const TIMEOUT = config.timeout || 8000;

const requestInterceptors = {
  before: [],
  after: [],
};

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

async function http({ url, method = 'GET', data, headers = {} }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

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
        'Content-Type': 'application/json',
        ...requestConfig.headers,
      },
      body: data !== undefined && data !== null ? JSON.stringify(data) : undefined,
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

    if (unauthorized) {
      // 已有登录态：清 token 并跳回登录页；登录页（无 token）只提示，不跳转
      if (getToken()) {
        removeToken();
        window.location.hash = '#/login';
      }
      notified = true;
      notifyError(errorMessage);
      throw new Error(errorMessage);
    }

    if (!res.ok) {
      throw new Error(errorMessage);
    }

    if (isObject && 'code' in payload && payload.code !== 0 && payload.code !== 200) {
      throw new Error(bodyMessage || '业务处理失败');
    }

    let result = isObject && 'data' in payload ? payload.data : payload;
    for (const interceptor of requestInterceptors.after) {
      result = (await interceptor(result, res, payload)) ?? result;
    }

    return result;
  } catch (error) {
    const message = error?.message || '请求失败';
    if (!notified) {
      notifyError(message);
    }
    throw error;
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
  put: (url, data, headers) => http({ url, method: 'PUT', data, headers }),
  del: (url, headers) => http({ url, method: 'DELETE', headers }),
};
