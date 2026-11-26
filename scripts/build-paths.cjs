/**
 * 构建路径统一解析
 * ---------------------------------------------------------------
 * 背景：electron-builder 每次打包前都要清空 output 目录下的 win-unpacked。
 *      如果这个目录落在 VSCode 工作区内、且有人打开过里面的 app.asar，
 *      删除就会失败（The process cannot access the file because it is being used
 *      by another process）。
 *
 * 方案：把 electron-builder 的输出目录放到项目工作区之外，
 *      打包完成后再由 scripts/collect-artifacts.js 把最终产物回移到 release/。
 *      这样 VSCode、电脑管家扫描项目目录都不会再卡住打包。
 *
 * 可用环境变量 WLDDJ_BUILD_DIR 覆盖默认位置（CI 或多环境打包时使用）。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveBuildDir() {
  // 1) 显式指定优先
  if (process.env.WLDDJ_BUILD_DIR) {
    return ensureDir(path.resolve(process.env.WLDDJ_BUILD_DIR));
  }

  // 2) Windows：优先放 D 盘（与项目同盘，回移拷贝快），不可用时回退到本地缓存目录
  if (process.platform === 'win32') {
    try {
      return ensureDir('D:\\builds\\wlddj-esports-build');
    } catch (e) {
      return ensureDir(path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'wlddj-esports-build'));
    }
  }

  // 3) macOS / Linux（含 GitHub Actions 的 macos runner）
  return ensureDir(path.join(os.tmpdir(), 'wlddj-esports-build'));
}

module.exports = { PROJECT_ROOT, resolveBuildDir };
