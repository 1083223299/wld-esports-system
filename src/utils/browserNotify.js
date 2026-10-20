/**
 * 浏览器系统通知（Web Notification API）
 * ---------------------------------------------------------------
 * 纯 Web 版替代桌面端的托盘/系统弹窗提醒：
 * - 页面获得通知权限后，新消息到达时在操作系统层面弹出系统通知
 * - 未授权 / 浏览器不支持时静默降级（页面内气泡 + 铃铛角标仍正常）
 * ---------------------------------------------------------------
 */

let requested = false;

/** 当前通知权限：'granted' | 'denied' | 'default' | 'unsupported' */
export function notifyPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/**
 * 请求通知权限（必须在用户手势中调用，浏览器才会弹授权框）
 * @returns {Promise<string>} 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function requestNotifyPermission() {
  if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
  if (requested) return Promise.resolve(Notification.permission);
  requested = true;
  try {
    return Notification.requestPermission();
  } catch {
    return Promise.resolve('unsupported');
  }
}

/** 是否已授权（可以弹系统通知） */
export function canNotify() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

/**
 * 弹出一条系统通知
 * @param {Object} opts { title, body, tag, icon, onClick }
 * @returns {boolean} 是否成功弹出
 */
export function showBrowserNotify({ title, body, tag, icon, onClick } = {}) {
  if (!canNotify()) return false;
  try {
    const n = new Notification(title || '系统通知', {
      body: body || '',
      tag: tag || `nt-${Date.now()}`,
      icon: icon || undefined,
    });
    if (typeof onClick === 'function') {
      n.onclick = () => {
        n.close();
        onClick();
      };
    }
    // 部分浏览器不会自动关闭，设置 10s 后收起
    setTimeout(() => {
      try {
        n.close();
      } catch {
        /* 忽略 */
      }
    }, 10000);
    return true;
  } catch {
    return false;
  }
}
