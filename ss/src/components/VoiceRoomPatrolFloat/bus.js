/**
 * 语音房巡查悬浮窗的打开通道。
 *
 * 悬浮窗挂在 Layout 的 AppMain 上（常驻，跨路由不销毁），
 * 业务页面通过 openVoiceRoomPatrol 让它显示，避免浮窗跟着页面一起被销毁。
 */
let opener = null;

/**
 * 注册打开处理函数，返回反注册函数
 * @param {Function} fn
 * @returns {Function}
 */
export function onVoiceRoomPatrol(fn) {
  opener = fn;
  return () => {
    if (opener === fn) opener = null;
  };
}

/**
 * 打开指定房间的巡查悬浮窗
 * @param {Object} room 语音房行数据
 */
export function openVoiceRoomPatrol(room) {
  if (typeof opener === "function") opener(room);
}

/**
 * 巡查过程中房间状态被改动的通知通道。
 * 目前唯一的触发点是「禁用成员并踢出房间」——这是后台动作，
 * 语音房列表页还开着的话需要刷新在线人数/房间状态。
 * @param {Function} fn
 * @returns {Function}
 */
let refresher = null;

/**
 * 注册“语音房列表需刷新”处理函数，返回反注册函数
 * @param {Function} fn
 * @returns {Function}
 */
export function onVoiceRoomRefresh(fn) {
  refresher = fn;
  return () => {
    if (refresher === fn) refresher = null;
  };
}

/** 通知语音房列表页刷新数据 */
export function notifyVoiceRoomRefresh() {
  if (typeof refresher === "function") refresher();
}
