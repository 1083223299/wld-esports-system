import { request } from '../request';

/**
 * 打手管理（俱乐部）接口（真实后端）
 * 对应 OpenAPI：未来洞电竞/俱乐部后台/打手列表
 * - GET  /api/club/players                    本俱乐部打手列表（page/pageSize/status/keyword）
 * - POST /api/club/players                    新增打手（俱乐部）
 * - PUT  /api/club/players/{id}               编辑打手（俱乐部）
 * - PUT  /api/club/players/{id}/flags         打手状态位（退店：请求体只传 {"inStore":0}）
 * - GET  /api/club/players/{playerId}/specs   查本俱乐部打手规格
 * - PUT  /api/club/players/{playerId}/specs   配本俱乐部打手规格
 * 鉴权：Header Authorization: Bearer {token}（request.js 自动携带，三端 JWT 互不通用）
 */

/** 拼接 query string（空值/undefined 不参与拼接） */
function buildQuery(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const playerApi = {
  /**
   * 本俱乐部打手列表（服务端分页）
   * @param {{page?:number, pageSize?:number, status?:string, keyword?:string}} params
   * @returns {{page:number, pageSize:number, total:number, list:Array}}
   */
  list: (params = {}) => request.get(`/api/club/players${buildQuery(params)}`),

  /**
   * 新增打手（俱乐部）
   * @param {{name:string, phone:string, password:string, clubId?:number}} data
   */
  create: (data) => request.post('/api/club/players', data),

  /**
   * 编辑打手（俱乐部）
   * @param {number} id 打手 ID
   * @param {{name:string, phone:string, password?:string, clubId?:number}} data
   */
  update: (id, data) => request.put(`/api/club/players/${id}`, data),

  /**
   * 打手退店（俱乐部）：请求体只传 {"inStore":0}
   * @param {number} id 打手 ID
   */
  quitStore: (id) => request.put(`/api/club/players/${id}/flags`, { inStore: 0 }),

  /**
   * 查本俱乐部打手规格（按游戏分组）
   * @param {number} playerId
   * @returns {Array<{gameId:number, all:boolean, specIds:number[]}>}
   */
  getSpecs: (playerId) => request.get(`/api/club/players/${playerId}/specs`),

  /**
   * 配本俱乐部打手规格（specs 传空数组表示清空）
   * @param {number} playerId
   * @param {Array<{gameId:number, all:boolean, specIds:number[]}>} specs
   */
  setSpecs: (playerId, specs) =>
    request.put(`/api/club/players/${playerId}/specs`, { specs }),
};
