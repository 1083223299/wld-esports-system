import request from "@/utils/request";

/**
 * 俱乐部保证金相关接口
 * ---------------------------------------------------------------------------
 * overview：首页余额 / 状态 / 规则配置 / 当前档位
 * flow-list：余额变动明细
 * recharge：发起充值，返回支付参数 DepositRechargePayVo
 */

/** 查询当前登录俱乐部的保证金首页数据 */
export function getClubDepositOverview(data) {
  return request({
    url: "/business/club-deposit/overview",
    method: "post",
    data: data || {}
  });
}

/** 查询当前登录俱乐部的保证金余额变动记录 */
export function getClubDepositFlowList(data) {
  return request({
    url: "/business/club-deposit/flow-list",
    method: "post",
    data: data || {}
  });
}

/**
 * 俱乐部保证金充值
 * POST /business/club-deposit/recharge
 * @param {{ amount: number }} data DepositRechargeBo，amount 必填
 * @returns {Promise<{ success: boolean, data?: {
 *   orderNo: string,
 *   amount: number,
 *   payChannel: string,
 *   payType: number,
 *   payScene: string,
 *   orderStr: string
 * }, errorCode?: string, errorMessage?: string }>}
 */
export function clubDepositRecharge(data) {
  return request({
    url: "/business/club-deposit/recharge",
    method: "post",
    data: {
      amount: Number(data && data.amount)
    }
  });
}

/**
 * 俱乐部保证金充值支付结果轮询
 * POST /business/club-deposit/recharge-pay-status
 * @param {{ orderNo: string }} data
 * @returns {Promise<{ success: boolean, data?: {
 *   orderNo: string,
 *   tradeId?: number,
 *   amount: number,
 *   payStatus: number, // 0待支付 1支付成功 2支付失败
 *   paid: boolean,
 *   continuePolling: boolean,
 *   payTime?: string
 * } }>}
 */
export function clubDepositRechargePayStatus(data) {
  return request({
    url: "/business/club-deposit/recharge-pay-status",
    method: "post",
    data: {
      orderNo: data && data.orderNo
    },
    silentError: true
  });
}

/**
 * @deprecated 文档已移除，规则请从 overview.depositClubConfig 读取
 */
export function getClubDepositRules(data) {
  return request({
    url: "/business/club-deposit/rules",
    method: "post",
    data: data || {}
  });
}
