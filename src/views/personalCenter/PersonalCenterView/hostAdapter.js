import { request as hostRequest } from '../../../api/request';
import { config } from '../../../config/env';
import { getToken } from '../../../utils/auth';

function normalizeHeaders(headers) {
  const parsed = new Headers(headers || {});
  const values = Object.fromEntries(parsed.entries());
  const authorization = parsed.get('authorization');

  if (authorization) {
    values.Authorization = authorization;
    delete values.authorization;
  }

  return { parsed, values };
}

export function createPersonalCenterHostAdapter() {
  return {
    async request(path, init = {}) {
      const { parsed, values } = normalizeHeaders(init.headers);

      if (path.startsWith('/api/admin/pc/v1/bytes/') || parsed.get('accept') === 'application/octet-stream') {
        const token = getToken();
        if (token && !parsed.has('authorization')) {
          values.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${config.apibaseURL}${path}`, {
          ...init,
          headers: values,
        });

        if (!response.ok) {
          throw new Error(`下载失败 (${response.status})`);
        }

        return response;
      }

      const data = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      return hostRequest.http({
        url: path,
        method: init.method || 'GET',
        data,
        headers: values,
      });
    },
    openHandover() {
      window.location.hash = '#/orders/list';
    },
  };
}
