/** 个人保证金提现状态（与产品文案对齐，数值以后端为准，操作同时兼容 statusName） */
export const PERSONAL_STATUS = {
  PENDING: 0, // 待审核
  SUCCESS: 9, // 打款成功
  REJECTED: 2, // 驳回
  MANUAL_PENDING: 5, // 系统打款失败，待人工处理
  PAY_FAILED: 8 // 打款失败
};

export const PERSONAL_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "待审核", value: PERSONAL_STATUS.PENDING },
  { label: "打款成功", value: PERSONAL_STATUS.SUCCESS },
  { label: "驳回", value: PERSONAL_STATUS.REJECTED },
  { label: "系统打款失败，待人工处理", value: PERSONAL_STATUS.MANUAL_PENDING },
  { label: "打款失败", value: PERSONAL_STATUS.PAY_FAILED }
];

/** 俱乐部保证金提现状态 */
export const CLUB_STATUS = {
  PENDING: 0, // 待审核
  WAIT_PAY: 1, // 待打款
  REJECTED: 2, // 驳回
  PAY_FAILED: 8, // 打款失败
  SUCCESS: 9 // 打款成功
};

export const CLUB_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "待审核", value: CLUB_STATUS.PENDING },
  { label: "待打款", value: CLUB_STATUS.WAIT_PAY },
  { label: "驳回", value: CLUB_STATUS.REJECTED },
  { label: "打款失败", value: CLUB_STATUS.PAY_FAILED },
  { label: "打款成功", value: CLUB_STATUS.SUCCESS }
];

export function isPendingAudit(row) {
  if (row.status !== null && row.status !== undefined && row.status !== "") {
    return Number(row.status) === PERSONAL_STATUS.PENDING;
  }
  const name = String(row.statusName || "");
  return name.includes("待审核");
}

export function isManualPayPending(row) {
  if (row.status !== null && row.status !== undefined && row.status !== "") {
    return Number(row.status) === PERSONAL_STATUS.MANUAL_PENDING;
  }
  const name = String(row.statusName || "");
  return name.includes("待人工") || name.includes("系统打款失败");
}

export function isWaitPay(row) {
  if (row.status !== null && row.status !== undefined && row.status !== "") {
    return Number(row.status) === CLUB_STATUS.WAIT_PAY;
  }
  const name = String(row.statusName || "");
  return name.includes("待打款");
}

export function isImageUrl(val) {
  if (!val) return false;
  const text = String(val);
  return /^https?:\/\//.test(text) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(text);
}
