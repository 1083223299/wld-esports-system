import { request } from '../request';

/**
 * 登录（俱乐部端）
 * POST /api/club/auth/login
 * - 经网关时签发端由路径前缀决定（/api/club/... 即 CLUB）；直连时必填 client，这里固定传 CLUB
 * - 可选参数 captchaId / captchaCode：后端开启图形验证码时传入（当前登录页未启用）
 * - 成功 data：{ token, client, role, name, accountId, clubId }
 */
export const authApi = {
  login: ({ username, password }) =>
    request.post('/api/club/auth/login', {
      client: 'CLUB',
      username,
      password,
    }),
};
