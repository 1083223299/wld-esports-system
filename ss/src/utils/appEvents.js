/**
 * 应用级生命周期钩子。
 *
 * 主要解决 location.reload() 的问题：整页重载会直接销毁 JS 上下文，
 * Vue 组件的 beforeDestroy 不会被执行，像「退出 TRTC 房间」这类收尾动作就丢了。
 * 业务在这里注册回调，页面就能在重载前把该收的尾收完。
 */
const beforeReloadHandlers = [];

/**
 * 注册重载前的收尾任务
 * @param {Function} handler 允许返回 Promise，会被 await
 * @returns {Function} 反注册函数
 */
export function onBeforeReload(handler) {
  beforeReloadHandlers.push(handler);
  return () => {
    const index = beforeReloadHandlers.indexOf(handler);
    if (index !== -1) beforeReloadHandlers.splice(index, 1);
  };
}

/**
 * 执行所有重载前任务。
 * 并行执行，避免多个任务的超时时间叠加；单个失败不影响其它任务。
 */
export async function runBeforeReload() {
  const list = beforeReloadHandlers.slice().reverse();
  await Promise.all(
    list.map((handler) =>
      Promise.resolve()
        .then(() => handler())
        .catch((error) => {
          console.warn("reload 前置任务执行失败:", error);
        })
    )
  );
}
