export const ORDER_STATUS_MAP = {
  "1": { label: "充值成功", type: "success" },
  "12": { label: "充值部分退款", type: "warning" },
  "11": { label: "退款成功", type: "info" },
  "1111": { label: "退款失败", type: "danger" },
};

export const PAYMENT_METHOD_MAP = {
  "1": "淘宝",
  "2": "苹果支付",
  "3": "支付宝",
  "4": "对公转账",
};

export const PAY_CHANNEL_MAP = {
  "1": "小程序",
  "2": "安卓",
  "3": "iOS",
};

export const REFUND_STATUS_MAP = {
  0: { label: "处理中", type: "warning" },
  1: { label: "退款成功", type: "success" },
  2: { label: "退款失败", type: "danger" },
  3: { label: "退款取消", type: "info" },
};
