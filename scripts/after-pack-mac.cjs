/**
 * macOS 打包后处理：ad-hoc 代码签名
 * ---------------------------------------------------------------
 * 背景：GitHub 的 macOS 构建机上没有 Developer ID 证书，electron-builder 会直接跳过签名
 *      （日志：skipped macOS application code signing ... identities found: 0）。
 *      而 Apple Silicon（arm64）有硬性要求：Mach-O 必须带有效签名才允许执行，
 *      完全未签名的包在 M 系列机器上表现为「已损坏，无法打开，你应该将它移到废纸篓」，
 *      清隔离属性（xattr -cr）也无效 —— 那不是隔离问题，是缺签名。
 *
 * 做法：在 electron-builder 生成 .app 之后、打 dmg/zip 之前，用系统 codesign 做 ad-hoc 签名（identity 用 "-"）。
 *      这样产物在任何 Apple Silicon 机器上都能启动（首次仍需右键「打开」绕过 Gatekeeper，因为未公证）。
 *      将来配好 Developer ID 证书后，删掉 config 里的 mac.hardenedRuntime:false 与本钩子即可回到正式签名 + 公证。
 *
 * 注意：本文件只处理 darwin，Windows 仍走 scripts/after-pack-win.cjs，逻辑未改动。
 */
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

exports.default = async function afterPackMac(context) {
  // 只处理 macOS 产物
  if (context.electronPlatformName !== 'darwin') return;

  const appInfo = context.packager.appInfo;
  const appPath = path.join(context.appOutDir, `${appInfo.productFilename}.app`);

  if (!fs.existsSync(appPath)) {
    throw new Error(`[after-pack-mac] 找不到 .app：${appPath}`);
  }

  // 1) ad-hoc 签名：--deep 覆盖内嵌 Framework / Helper 可执行文件（arm64 上每一个都要签）
  await execFileAsync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
  console.log(`[after-pack-mac] ad-hoc 签名完成：${path.basename(appPath)}`);

  // 2) 校验签名有效（失败直接中断打包，避免又产出一个"已损坏"的包）
  const { stderr } = await execFileAsync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath]);
  if (stderr) console.log(stderr.toString().trim());
  console.log('[after-pack-mac] 签名校验通过');
};
