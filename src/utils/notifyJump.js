import { NOTIFY_TYPE } from '../api/notifySocket';

/**
 * 系统通知 · 跳转规则（按消息通知列表需求图）
 * ---------------------------------------------------------------
 * 订单相关：
 * - 平台派单/转单、订单交易关闭 → 跳转到订单列表并搜索到该订单
 *   （特殊场景：查询不到时报「订单不存在」，由订单列表页处理）
 * - 抢单超时回流 → 图未标注跳转，仅标记已读
 * 钱包相关（转单扣款 / 收益提现失败 / 押金提现失败）→ 图未标注跳转，仅标记已读
 * 原有类型：卡单预警 → 订单列表并搜索；系统公告 → 不跳转
 * ---------------------------------------------------------------
 */

/** 需要跳转订单列表并搜索订单的通知类型 */
const ORDER_SEARCH_TYPES = [
  NOTIFY_TYPE.STUCK, // 卡单预警：定位对应订单
  NOTIFY_TYPE.ORDER_DISPATCH, // 平台派单/转单
  NOTIFY_TYPE.ORDER_CLOSED, // 订单交易关闭
];

/**
 * 解析通知的跳转目标
 * @param {Object} item 通知项（含 type / orderNos）
 * @returns {Object|string|null} vue-router 目标；无跳转返回 null
 */
export function resolveNotifyTarget(item) {
  if (!item) return null;
  const orderNo = Array.isArray(item.orderNos) ? item.orderNos[0] : item.orderNo || '';

  // 订单类通知：跳转订单列表并搜索该订单
  if (ORDER_SEARCH_TYPES.includes(item.type)) {
    if (orderNo) {
      return { path: '/orders/my-orders', query: { orderNo } };
    }
    return { path: '/orders/my-orders' };
  }

  // 其余（抢单超时 / 钱包类 / 系统公告）：图未标注跳转，仅标记已读
  return null;
}
