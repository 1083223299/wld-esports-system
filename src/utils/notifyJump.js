import { NOTIFY_TYPE } from '../api/notifySocket';

/**
 * 系统通知 · 跳转规则（按消息通知列表需求图 + 2026-10-23 最新 OpenAPI）
 * ---------------------------------------------------------------
 * 后端实时/列表字段：jumpTarget（有订单时为 ORDER，用 orderId 打开订单详情）
 * - jumpTarget=ORDER → 跳「我的订单」列表，锁定订单号搜索并自动打开查看弹窗
 *   （/orders/my-orders?orderNo=xxx&orderId=yyy&openDetail=1；弹窗字段与详情接口一致，关闭后可继续列表操作；
 *    orderId 作为兜底：列表搜索不到该订单时，前端用详情接口直接打开，见 MyOrdersView runNotifyOpen；
 *    2026-10-26 由独立详情页 /orders/order-detail/{orderId} 调整为该方案）
 * 历史规则（本地 mock / 无 jumpTarget 消息）：
 * - 平台派单/转单、订单交易关闭、卡单预警 → 订单列表并搜索该订单
 *   （特殊场景：查询不到时报「订单不存在」，由订单列表页处理）
 * - 抢单超时回流 → 图未标注跳转，仅标记已读
 * 钱包相关（转单扣款 / 收益提现失败 / 押金提现失败）→ 图未标注跳转，仅标记已读
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
 * @param {Object} item 通知项（含 type / orderNos / jumpTarget / orderId / orderNo）
 * @returns {Object|string|null} vue-router 目标；无跳转返回 null
 */
export function resolveNotifyTarget(item) {
  if (!item) return null;
  const orderNo = Array.isArray(item.orderNos) ? item.orderNos[0] : item.orderNo || '';

  // 后端口径（2026-10-23 最新 OpenAPI）：有订单时 jumpTarget=ORDER，用 orderId 打开订单详情。
  // 落地方式（2026-10-26）：跳「我的订单」列表并锁定订单号、自动打开查看弹窗（列表上下文可继续操作）；
  //   同时携带 orderId 作为兜底：列表搜索不到该订单时，前端用详情接口直接打开（见 MyOrdersView runNotifyOpen）。
  if (item.jumpTarget === 'ORDER') {
    const no = item.orderNo || (Array.isArray(item.orderNos) ? item.orderNos[0] : '');
    if (no || item.orderId) {
      return {
        path: '/orders/my-orders',
        query: { orderNo: no || '', orderId: item.orderId || '', openDetail: '1' },
      };
    }
    return { path: '/orders/my-orders' };
  }

  // 本地 mock / 无 jumpTarget 的旧消息：按类型规则跳转
  if (ORDER_SEARCH_TYPES.includes(item.type)) {
    if (orderNo) {
      return { path: '/orders/my-orders', query: { orderNo } };
    }
    return { path: '/orders/my-orders' };
  }

  // 其余（抢单超时 / 钱包类 / 系统公告）：图未标注跳转，仅标记已读
  return null;
}
