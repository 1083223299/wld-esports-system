import { request } from '../request';

/**
 * 俱乐部端账号信息 / 实名认证
 * - GET  /api/club/me           当前登录用户（俱乐部）
 * - POST /api/club/me/real-name 实名认证（俱乐部）
 * 鉴权：Header Authorization: Bearer {token}（request.js 自动携带，CLUB 端 JWT；三端互不通用）
 *
 * me 返回（示例）：{ accountId, name, role, clubId, realNameVerified, idNoMasked(打码), ... }
 * realName：通过后 realNameVerified=true；只校验 18 位身份证格式与校验位（不对接公安核验）；
 *   已认证后换姓名/号码返回 CONFLICT「已完成实名，不能修改」；响应只给打码后的身份证号。
 */
export const clubAccountApi = {
  /** 当前登录用户（俱乐部） */
  me: () => request.get('/api/club/me'),

  /**
   * 实名认证（俱乐部）
   * @param {{realName:string, idNo:string}} data realName 2-32字；idNo 18位
   */
  realName: ({ realName, idNo }) =>
    request.post('/api/club/me/real-name', { realName, idNo }),
};
