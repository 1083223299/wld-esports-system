import { request } from '../request';

function buildQuery(params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return qs.length ? `?${qs.join('&')}` : '';
}

/**
 * 俱乐部配置（真实后端，2026-10-23 后端字段定义）
 * 对应 OpenAPI：俱乐部后台/配置管理
 * - GET/PUT /api/club/settings               俱乐部配置（接单设置 + 百分比分润）
 * - GET/PUT /api/club/settings/player-profits 固定分润（服务端分页，keyword/page/pageSize）
 *
 * settings 响应 data：
 * - publicGrab    1 打手可直接接公共订单，0 必须先由俱乐部接单
 * - profitMode    PERCENT | FIXED，只在响应里（页面初始分润模式取这里）
 * - playerRate    打手分润，大于0、小于100的整数；保存时传这个（会改本俱乐部全部规格）
 * - clubShareRate 100 - playerRate，只展示，不要提交
 *
 * player-profits 响应 data：{ total, page, pageSize, list }
 * - list 每项：gameId、gameName、specId、specName、playerFixed、configured（0 未填，1 已填）
 * - 保存体：{ items: [{ specId, playerFixed }] }，playerFixed 为空的行跳过，0 和正数、最多两位小数
 */
export const clubConfigApi = {
  /** 获取俱乐部配置：返回 { publicGrab, profitMode, playerRate, clubShareRate } */
  get: () => request.get('/api/club/settings'),

  /**
   * 保存俱乐部配置（接单设置 + 百分比分润共用本接口）
   * @param {{publicGrab?:number, playerRate?:number}} payload
   *   publicGrab：1 公开抢单 / 0 俱乐部先接单
   *   playerRate：打手分润（大于0、小于100的整数），仅在百分比分润模式下传
   */
  save: ({ publicGrab, playerRate } = {}) => {
    const body = {};
    if (publicGrab !== undefined) body.publicGrab = Number(publicGrab);
    if (playerRate !== undefined) body.playerRate = Number(playerRate);
    return request.put('/api/club/settings', body);
  },

  /**
   * 固定分润列表（服务端分页）
   * @param {{keyword?:string, page?:number, pageSize?:number}} params
   * @returns {Promise<{total:number, page:number, pageSize:number, list:Array<{
   *   gameId:number, gameName:string, specId:number, specName:string,
   *   playerFixed:number, configured:number /* 0 未填，1 已填 *\/}>}>}
   */
  getPlayerProfits: ({ keyword, page, pageSize } = {}) =>
    request.get(`/api/club/settings/player-profits${buildQuery({ keyword, page, pageSize })}`),

  /**
   * 保存固定分润：playerFixed 为空的行跳过，0 和正数、最多两位小数
   * @param {{items:Array<{specId:number, playerFixed:number}>}} payload
   */
  savePlayerProfits: (payload = {}) =>
     request.put('/api/club/settings/player-profits', payload, undefined, { timeout: 50000 }),
};
