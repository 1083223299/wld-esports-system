/**
 * 财务管理 > 我的押金 模拟数据
 * 对应需求图：押金总额卡片 + 提现按钮 + 押金明细流水
 * 备注规则：
 *  1. 满足「已退店满14天 && 钱包未冻结」才展示提现按钮
 *  2. 点击提现先判断是否实名，未实名引导去实名认证
 *  3. 提交提现时二次校验：每日最多3次、仅 08:00-18:00 可提现
 * 上线后 account 与 flowRows 替换为接口返回即可。
 */

// ===== 当前登录账号的押金账户状态（mock） =====
export const depositAccount = {
  alipayAccount: '16541656416', // 支付宝账号
  alipayName: '张三', // 支付宝真实姓名（二次确认时展示）
  depositBalance: 300.0, // 押金总额（顶部卡片展示）
  withdrawableBalance: 300.0, // 可提现余额
  isRealNameVerified: true, // 是否已完成实名认证
  hasQuitStore: true, // 是否已退店
  quitAt: '2026-09-20 10:00:00', // 退店时间（距今天数需 ≥14 天才允许提现）
  walletFrozen: false, // 钱包是否被冻结
  submittedToday: 1, // 今日已提交提现次数（上限 3 次）
};

// 提现规则常量
export const WITHDRAW_RULES = {
  quitStoreRequiredDays: 14, // 退店后需超过 14 天
  dailyMaxTimes: 3, // 一天内提交上限次数
  availableHourStart: 8, // 可提现时间段 08:00
  availableHourEnd: 18, // 可提现时间段 18:00
};

// ===== 押金明细 - 流水类型 =====
export const DEPOSIT_FLOW_TYPE_OPTIONS = [
  { label: '充值', value: 'recharge' },
  { label: '提现成功', value: 'withdraw_success' },
  { label: '平台扣除', value: 'platform_deduct' },
  { label: '提现失败(提现金额已退还钱包)', value: 'withdraw_fail' },
  { label: '余额抵扣', value: 'balance_deduct' },
];

// 类型 value -> 展示文案
export const FLOW_TYPE_TEXT = {
  recharge: '充值',
  withdraw_success: '提现成功',
  platform_deduct: '平台扣除',
  withdraw_fail: '提现失败(提现金额已退还钱包)',
  balance_deduct: '余额抵扣',
};

// 各类型默认原因（充值 / 提现成功 无原因）
const REASON_POOL = [
  '违规处罚扣除押金',
  '订单赔付扣除押金',
  '平台违约金扣除',
  '超时未接单扣除',
  '提现失败：银行卡信息有误',
  '提现失败：账户异常',
  '抵扣待支付订单费用',
  '抵扣会员服务费',
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
 * 生成押金明细流水
 * @param {number} count 条数（需求图为 658 条）
 */
export function buildDepositFlowRows(count = 658) {
  const rand = seededRandom(20261015);
  const rows = [];
  const types = Object.keys(FLOW_TYPE_TEXT);

  for (let i = 0; i < count; i += 1) {
    // 按权重取类型：充值 / 提现成功较多，其余较少
    const r = rand();
    let type;
    if (r < 0.25) type = 'recharge';
    else if (r < 0.5) type = 'withdraw_success';
    else if (r < 0.68) type = 'platform_deduct';
    else if (r < 0.84) type = 'withdraw_fail';
    else type = 'balance_deduct';

    const isIncome = type === 'recharge' || type === 'balance_deduct';
    const amount = (Math.floor(rand() * 900) + 100) + Math.floor(rand() * 100) / 100;

    // 充值、提现成功 无原因；其余随机取原因
    let reason = '';
    if (type !== 'recharge' && type !== 'withdraw_success') {
      reason = REASON_POOL[Math.floor(rand() * REASON_POOL.length)];
    }

    const d = new Date(2026, 9, 10, 11, 12, 22);
    d.setSeconds(d.getSeconds() - i * 137);

    rows.push({
      id: `flow-${i}`,
      type,
      typeText: FLOW_TYPE_TEXT[type],
      amount: isIncome ? amount : -amount,
      reason,
      time: formatTime(d),
    });
  }
  return rows;
}
