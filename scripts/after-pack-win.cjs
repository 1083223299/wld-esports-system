/**
 * Windows 打包后处理：改写 exe 的版本信息与图标
 * ---------------------------------------------------------------
 * 背景：electron-builder 默认通过 app-builder.exe 中转调用 rcedit，
 *      在部分机器（装了腾讯电脑管家等实时防护 / 句柄继承环境）上会稳定报
 *      "Fatal error: Unable to commit changes"，导致必须退出防护软件才能打包。
 *      实测：同一个 exe、同一组参数，直接调用 rcedit-x64.exe 可以成功，
 *      经 app-builder 中转则失败，属于中转层的环境问题，与项目代码无关。
 *
 * 做法：关闭内置的 win.signAndEditExecutable，改由本钩子直接调用 rcedit-x64.exe，
 *      失败时等待 2 秒重试（最多 12 次），无需关闭编辑器或防护软件。
 *      改写的仍是打包目录里的同名 exe，最终进安装包的内容与原来一致。
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const RETRY_TIMES = 12;
const RETRY_DELAY = 2000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findRcedit() {
  const roots = [
    path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign'),
    path.join(process.env.APPDATA || '', 'electron-builder', 'Cache', 'winCodeSign'),
  ];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root)) {
      for (const name of ['rcedit-x64.exe', 'rcedit.exe']) {
        const file = path.join(root, dir, name);
        if (fs.existsSync(file)) return file;
      }
    }
  }
  return null;
}

exports.default = async function afterPack(context) {
  // 只处理 Windows 产物
  if (context.electronPlatformName !== 'win32') return;

  const appInfo = context.packager.appInfo;
  const exePath = path.join(context.appOutDir, `${appInfo.productFilename}.exe`);

  if (!fs.existsSync(exePath)) {
    throw new Error(`[after-pack] 找不到可执行文件：${exePath}`);
  }

  const rcedit = findRcedit();
  if (!rcedit) {
    throw new Error('[after-pack] 未找到 rcedit（winCodeSign 缓存），请先联网打包一次以生成缓存');
  }

  const args = [
    exePath,
    '--set-version-string', 'FileDescription', appInfo.productName,
    '--set-version-string', 'ProductName', appInfo.productName,
    '--set-file-version', appInfo.shortVersion || appInfo.version,
    '--set-product-version', appInfo.getVersionInWeirdWindowsForm(),
    '--set-version-string', 'InternalName', path.basename(exePath, '.exe'),
    '--set-version-string', 'OriginalFilename', '',
  ];

  if (appInfo.copyright) {
    args.push('--set-version-string', 'LegalCopyright', appInfo.copyright);
  }
  if (appInfo.companyName) {
    args.push('--set-version-string', 'CompanyName', appInfo.companyName);
  }
  if (context.packager.platformSpecificBuildOptions.legalTrademarks) {
    args.push('--set-version-string', 'LegalTrademarks', context.packager.platformSpecificBuildOptions.legalTrademarks);
  }

  // 图标复用 electron-builder 自己转换出的 .ico
  const iconPath = await context.packager.getIconPath();
  if (iconPath) {
    args.push('--set-icon', iconPath);
  }

  // 与内置行为保持一致：仅非 asInvoker 时才写执行级别
  const requestedExecutionLevel = context.packager.platformSpecificBuildOptions.requestedExecutionLevel;
  if (requestedExecutionLevel && requestedExecutionLevel !== 'asInvoker') {
    args.push('--set-requested-execution-level', requestedExecutionLevel);
  }

  let lastError = null;

  for (let i = 1; i <= RETRY_TIMES; i += 1) {
    try {
      await execFileAsync(rcedit, args, { windowsHide: true });
      console.log(`[after-pack] exe 版本信息与图标已写入${i > 1 ? `（第 ${i} 次尝试成功）` : ''}`);
      return;
    } catch (e) {
      lastError = e;
      const msg = (e.stderr || e.message || '').toString().trim();
      console.warn(`[after-pack] 第 ${i}/${RETRY_TIMES} 次改写失败：${msg}`);
      if (i < RETRY_TIMES) await delay(RETRY_DELAY);
    }
  }

  throw new Error(
    `[after-pack] exe 版本信息改写失败（已重试 ${RETRY_TIMES} 次）：${
      (lastError && (lastError.stderr || lastError.message)) || ''
    }`,
  );
};
