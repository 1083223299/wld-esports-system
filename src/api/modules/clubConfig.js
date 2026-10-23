import { request } from '../request';

/**
 * 俱乐部配置（真实后端）
 * 对应 OpenAPI：配置管理 / 04-规格
 * - GET  /api/club/settings      俱乐部配置：{ publicGrab }
 * - PUT  /api/club/settings      保存俱乐部配置：{ publicGrab }
 * - GET  /api/club/specs/mine    本俱乐部规格：{ specs, clubSpecs }
 * 鉴权：Header Authorization: Bearer {token}（request.js 自动携带）
 *
 * 字段口径：
 * - publicGrab 是否公开抢单：1=公开抢单（打手可直接接公共订单），0=必须先由俱乐部接单
 * - specs      本账号可接规格 [{ gameId, all, specIds }]
 * - clubSpecs  所属俱乐部规格 [{ gameId, all, specIds }]，仅打手账号返回
 * - all=true 或 specIds 为空，均表示该游戏下全部规格可接
 */
export const clubConfigApi = {
  /** 获取俱乐部配置：返回 { publicGrab } */
  get: () => request.get('/api/club/settings'),

  /** 保存俱乐部配置：publicGrab 传 1（公开抢单）或 0（俱乐部先接单） */
  save: ({ publicGrab } = {}) =>
    request.put('/api/club/settings', { publicGrab: Number(publicGrab) }),

  /** 本俱乐部规格：返回 { specs, clubSpecs } */
  getMySpecs: () => request.get('/api/club/specs/mine'),
};
