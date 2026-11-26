/**
 * 打包后处理钩子分发器
 * ---------------------------------------------------------------
 * electron-builder 的 afterPack 只能挂一个钩子，而两个平台各需要自己的后处理：
 *   - Windows：scripts/after-pack-win.cjs（改写 exe 版本信息与图标，逻辑保持原样）
 *   - macOS：scripts/after-pack-mac.cjs（ad-hoc 签名，避免 arm64 上"已损坏，无法打开"）
 * 这里只做转发，Windows 分支的行为与之前挂 after-pack-win.cjs 完全一致。
 */
const winHook = require('./after-pack-win.cjs');
const macHook = require('./after-pack-mac.cjs');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName === 'darwin') {
    return macHook.default(context);
  }
  return winHook.default(context);
};
