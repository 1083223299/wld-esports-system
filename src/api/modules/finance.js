import { request } from '../request';

/**
 * 财务管理（管理端）接口
 * 依据 Apifox「未来洞电竞后台 / 财务管理 / 收益明细」OpenAPI 规格：
 * - 全部接口鉴权：Header Authorization: Bearer {token}（后台 JWT，三端互不通用），
 *   request.js 已自动附加当前登录 token，无需重复传参
 * - 列表类接口为服务端分页/筛选，Query 空值自动剔除
 * - code=0/200 视为成功，业务错误由 request.js 统一提示
 */

/* ================= 枚举 → 中文（接口返回/提交均为英文枚举） ================= */

/** 身份 */
export const OWNER_TYPE = {
  CLUB: '俱乐部',
  PLAYER: '打手',
  PLATFORM: '平台',
};

/** 钱包类型（收益明细顶部 Tab） */
export const WALLET_TYPE = {
  INCOME: '收益',
  DEPOSIT: '押金',
};

/**
 * 管理端钱包明细的平台损益文案兜底；展示优先使用接口返回的 bizTypeLabel。
 */
export const BIZ_TYPE_LABEL = {
  ORDER_PAY: '收入-订单实付',
  ORDER_INCOME: '支出-合作方结算',
  DAILIANTONG_COST: '支出-代练通',
  ORDER_CLOSE: '支出-订单关闭',
  PLATFORM_RECHARGE: '支出-平台充值',
  WITHDRAW_SUBMIT: '支出-提现扣减',
  WITHDRAW_FAIL_BACK: '收入-提现失败退回',
  TRANSFER_DEDUCT: '冲减-转单扣除',
  SYSTEM_DEDUCT: '冲减-结算扣回',
  SETTLE_VOID: '冲减-结算扣回',
  BALANCE_OFFSET: '支出-余额抵扣', // 金额为负（收益扣出）；金额为正（押金转入）时接口返回"收入-余额抵扣"，动态并入下拉
};

/** 文案转换（接口返回英文枚举 → 中文展示） */
export const ownerTypeText = (code) => OWNER_TYPE[code] || code || '—';
export const walletTypeText = (code) => WALLET_TYPE[code] || code || '—';
export const bizTypeText = (code) => BIZ_TYPE_LABEL[code] || code || '—';

/**
 * 收支类型展示文案：接口 bizTypeLabel 优先（后端 2026-10-23 确认 GET /api/admin/finance/txns 统一返回中文 label，
 * 展示以 bizTypeLabel 为准），预置表兜底（接口未回 label 或后端新增码未同步时用本地映射，最后回退 code）。
 */
export function resolveBizTypeLabel(item = {}) {
  if (item.bizTypeLabel) return item.bizTypeLabel;
  if (item.bizType === 'ORDER_INCOME') {
    if (item.ownerType === 'PLAYER') return '支出-打手收入';
    if (item.ownerType === 'CLUB') return '支出-俱乐部收入';
  }
  return BIZ_TYPE_LABEL[item.bizType] || item.bizType || '—';
}

/* ================= 下拉选项（value 为接口枚举值） ================= */

export const OWNER_TYPE_OPTIONS = Object.entries(OWNER_TYPE).map(([value, label]) => ({ label, value }));
export const WALLET_TYPE_OPTIONS = Object.entries(WALLET_TYPE).map(([value, label]) => ({ label, value }));

/**
 * 收支类型（业务码）预置选项：同一中文文案只保留首个 value。
 * 订单结算收入的打手/俱乐部具体文案由接口按 ownerType 返回。
 */
export const BIZ_TYPE_OPTIONS = (() => {
  const seen = new Set();
  return Object.entries(BIZ_TYPE_LABEL)
    .filter(([, label]) => {
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    })
    .map(([value, label]) => ({ label, value }));
})();

/* ================= 查询参数组装（空值自动剔除） ================= */

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  const query = qs.toString();
  return query ? `?${query}` : '';
}

/* ================= 财务管理（管理端）接口 ================= */

export const financeApi = {
  /**
   * 渠道订单统计 GET /api/admin/finance/channel-stats
   * @param {{from?:string,to?:string,channelCode?:'WECOM'|'WECHAT'|'DOUYIN'}} params
   * @returns {Promise<{list:Array<{channelCode:string,channelName:string,orderAmountTotal:number,dispatchAmountTotal:number,orderCount:number,dispatchedCount:number}>}>}
   */
  channelStats: (params = {}) =>
    request.get(`/api/admin/finance/channel-stats${buildQuery(params)}`),

  /**
   * 收益明细（钱包流水）GET /api/admin/finance/txns
   * - walletType: INCOME 收益 / DEPOSIT 押金（对应页面顶部 Tab）
   * - ownerType: CLUB / PLAYER / PLATFORM（平台损益身份筛选）
   * - bizType: 业务码（收支类型筛选）
   * - keyword: 匹配账号昵称或手机号
   * - from / to: 时间范围（yyyy-MM-dd 或 ISO 日期时间）
   * @param {{page?:number,pageSize?:number,from?:string,to?:string,ownerType?:'CLUB'|'PLAYER'|'PLATFORM',
   *          walletType?:string,userId?:number,keyword?:string,clubId?:number,clubName?:string,
   *          bizType?:string,orderNo?:string}} params
   * @returns {Promise<{total:number,page:number,pageSize:number,list:Array}>}
   */
  txns: (params = {}) => request.get(`/api/admin/finance/txns${buildQuery(params)}`),
};
