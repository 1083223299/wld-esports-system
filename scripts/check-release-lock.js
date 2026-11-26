/**
 * 打包前预检（由 npm run dist:* / pack:* 的 predist / prepack 钩子自动执行）
 * ---------------------------------------------------------------
 * 打包输出目录已经移到项目工作区之外（见 electron-builder.config.js），
 * 所以 VSCode 打开 release\win-unpacked\resources\app.asar
 * 不会再阻塞打包 —— 旧目录不参与本次构建。
 *
 * 这里只做一件事：清掉构建目录里上次残留的 win-unpacked（带重试），
 * 万一仍被占用（例如手动打开过构建目录里的文件），给出中文提示并阻断，
 * 避免 electron-builder 跑到一半才报错。
 */
const fs = require('fs');
const path = require('path');
const { resolveBuildDir } = require('./build-paths.cjs');

const buildDir = resolveBuildDir();
const winUnpacked = path.join(buildDir, 'win-unpacked');

if (fs.existsSync(winUnpacked)) {
  try {
    fs.rmSync(winUnpacked, { recursive: true, force: true, maxRetries: 3, retryDelay: 600 });
  } catch (e) {
    console.error('');
    console.error('==========================================================');
    console.error('  打包阻断：构建目录正被其他程序占用');
    console.error('----------------------------------------------------------');
    console.error(`  目录：${winUnpacked}`);
    console.error(`  原因：${e.code || ''} ${e.message}`);
    console.error('----------------------------------------------------------');
    console.error('  处理方法：关闭正在占用该目录的编辑器 / 预览 / 压缩工具，然后重试；');
    console.error('  或在 PowerShell 里执行：');
    console.error(`    Remove-Item -LiteralPath "${winUnpacked}" -Recurse -Force`);
    console.error('==========================================================');
    console.error('');
    process.exit(1);
  }
}

console.log(`[预检] 构建目录：${buildDir}`);
console.log('[预检] 安装包打包完成后会自动回移到 release/');
