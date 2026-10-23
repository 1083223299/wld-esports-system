/**
 * 财务管理 > 我的押金 常量配置
 * 联调说明：
 * - 余额 / 流水 / 提现已切换真实接口（src/api/modules/wallet.js）
 * - 支付宝账号、姓名、退店状态、实名状态、当日已提交次数等字段
 *   后端接口暂未返回，页面以本地默认值兜底，待后端提供后替换。
 */

// 提现规则常量
export const WITHDRAW_RULES = {
  quitStoreRequiredDays: 14, // 退店后需超过 14 天
  dailyMaxTimes: 3, // 一天内提交上限次数
  availableHourStart: 8, // 可提现时间段 08:00
  availableHourEnd: 18, // 可提现时间段 18:00
};

// ===== 押金明细 - 流水类型（筛选下拉） =====
export const DEPOSIT_FLOW_TYPE_OPTIONS = [
  { label: '充值', value: 'recharge' },
  { label: '提现成功', value: 'withdraw_success' },
  { label: '平台扣除', value: 'platform_deduct' },
  { label: '提现失败(提现金额已退还钱包)', value: 'withdraw_fail' },
  { label: '余额抵扣', value: 'balance_deduct' },
];

// 流水业务类型 bizType -> 展示文案；未枚举到的类型前端显示原文
export const FLOW_TYPE_TEXT = {
  recharge: '充值',
  withdraw_success: '提现成功',
  platform_deduct: '平台扣除',
  withdraw_fail: '提现失败(提现金额已退还钱包)',
  balance_deduct: '余额抵扣',
  // 常见大写 / 后端命名变体
  RECHARGE: '充值',
  DEPOSIT_RECHARGE: '充值',
  WITHDRAW: '提现成功',
  WITHDRAW_SUCCESS: '提现成功',
  PLATFORM_DEDUCT: '平台扣除',
  WITHDRAW_FAIL: '提现失败(提现金额已退还钱包)',
  BALANCE_DEDUCT: '余额抵扣',
};
