/**
 * 财务管理 > 我的钱包 模拟数据
 * 顶部可提现余额卡片 + 钱包明细流水 + 提现弹窗
 */

// ===== 当前登录打手的钱包账户状态（mock） =====
export const walletAccount = {
  alipayAccount: '16541656416', // 支付宝账号
  alipayName: '张三', // 支付宝真实姓名（二次确认时展示）
  withdrawableBalance: 300.0, // 可提现余额（顶部卡片展示）
  walletFrozen: false, // 钱包是否被冻结
  submittedToday: 2, // 今日已提交提现次数
};

// 提现规则常量
export const WITHDRAW_RULES = {
  dailyMaxTimes: 3, // 一天内提交上限次数
  availableHourStart: 8, // 可提现时间段 08:00
  availableHourEnd: 18, // 可提现时间段 18:00
  minAmount: 90, // 提现金额需 ≥ 90 元
};

// ===== 钱包明细 - 流水类型 =====
// value 即类型筛选下拉值；typeText 即表格"类型"列展示文案
export const FLOW_TYPE_OPTIONS = [
  { label: '订单收入', value: 'order_income' },
  { label: '提现成功', value: 'withdraw_success' },
  { label: '平台扣除', value: 'platform_deduct' },
  { label: '转单扣除', value: 'transfer_deduct' },
  { label: '提现失败(提现金额已退还钱包)', value: 'withdraw_fail' },
  { label: '余额抵扣', value: 'balance_deduct' },
  { label: '平台充值', value: 'platform_recharge' },
];

export const FLOW_TYPE_TEXT = {
  order_income: '订单收入',
  withdraw_success: '提现成功',
  platform_deduct: '平台扣除',
  transfer_deduct: '转单扣除',
  withdraw_fail: '提现失败(提现金额已退还钱包)',
  balance_deduct: '余额抵扣',
  platform_recharge: '平台充值',
};

// 收入类（金额带 +）：订单收入、平台充值
const INCOME_TYPES = new Set(['order_income', 'platform_recharge']);
// 带关联订单号（蓝色链接）：订单收入、转单扣除、平台充值
const HAS_RELATION_TYPES = new Set(['order_income', 'transfer_deduct', 'platform_recharge']);
// 带原因展示：平台扣除、提现失败、余额抵扣、平台充值
const HAS_REASON_TYPES = new Set(['platform_deduct', 'withdraw_fail', 'balance_deduct', 'platform_recharge']);

// 原因池（后端下发，前端不做映射）
const REASON_POOL = [
  '违规处罚扣除',
  '订单赔付扣除',
  '平台违约金扣除',
  '超时未处理扣除',
  '银行卡信息有误',
  '账户异常',
  '抵扣待支付订单费用',
  '平台补款',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 可复现伪随机（每次刷新数据一致）
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * 生成钱包明细流水
 * @param {number} count 条数（需求图为 658 条）
 */
export function buildFlowRows(count = 658) {
  const rand = seededRandom(20261015);
  const rows = [];
  const types = Object.keys(FLOW_TYPE_TEXT);

  for (let i = 0; i < count; i += 1) {
    const type = types[Math.floor(rand() * types.length)];
    const isIncome = INCOME_TYPES.has(type);
    const amount = (Math.floor(rand() * 900) + 100) + Math.floor(rand() * 100) / 100;

    // 关联订单号：仅指定类型有，模拟一个 15 位数字串
    const relationNo = HAS_RELATION_TYPES.has(type)
      ? String(154549648448000 + Math.floor(rand() * 999))
      : '';

    // 原因：仅指定类型有，后端下发原文
    const reason = HAS_REASON_TYPES.has(type)
      ? REASON_POOL[Math.floor(rand() * REASON_POOL.length)]
      : '';

    const d = new Date(2026, 9, 10, 11, 12, 22);
    d.setSeconds(d.getSeconds() - i * 137);

    rows.push({
      id: `flow-${i}`,
      type,
      typeText: FLOW_TYPE_TEXT[type],
      amount: isIncome ? amount : -amount,
      relationNo,
      reason,
      time: formatTime(d),
    });
  }
  return rows;
}
