const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');
const { getUpdateFeedUrl } = require('./scripts/update-feed.cjs');
const { resolveBuildDir } = require('./scripts/build-paths.cjs');

// 构建输出目录放在项目工作区之外（默认 D:\builds\wlddj-esports-build）
// 目的：VSCode 打开过 release\win-unpacked\resources\app.asar 后不会阻塞打包
const buildDir = resolveBuildDir();

// 按环境区分安装包产物名：生产无前缀，其他环境 {env}_ 前缀（下划线）
// 命名格式：[env_]wlddjEsportsSystemSetupV{version}.{ext}
// 例：生产 wlddjEsportsSystemSetupV1.0.2.exe / 测试 test_wlddjEsportsSystemSetupV1.0.2.exe
const env = process.env.VITE_APP_ENV || 'prod';
const envPrefix = env === 'prod' ? '' : `${env}_`;

// 产品名保持英文，用于安装目录、应用名和安装包文件名
const productName = 'wlddjEsportsSystem';

// 应用 id 按环境区分：prod 用原 appId，其他环境追加 .{env}
const appId = env === 'prod' ? packageJson.build.appId : `${packageJson.build.appId}.${env}`;

// 快捷方式使用中文，非生产环境附加环境标识
const shortcutSuffix = { prod: '', local: '（本地）', dev: '（开发）', test: '（测试）', staging: '（预发布）' }[env] || '';
const shortcutName = `未来洞电竞管理系统${shortcutSuffix}`;

module.exports = {
  ...packageJson.build,
  appId,
  productName,
  // 输出目录：项目外构建，最终安装包由 scripts/collect-artifacts.js 回移到 release/
  directories: {
    ...packageJson.build.directories,
    output: buildDir,
  },
  // Windows：关闭内置的 app-builder → rcedit 改写，改由 after-pack 钩子直接写
  // （内置链路在装有实时防护的机器上会稳定报 Unable to commit changes）
  win: {
    ...packageJson.build.win,
    signAndEditExecutable: false,
  },
  // 打包后钩子统一入口：Windows 仍转给 after-pack-win.cjs（逻辑未改），mac 走 ad-hoc 签名
  // （electron-builder 认不出 identity: '-'，会直接跳过签名，所以必须自己在钩子里执行 codesign）
  afterPack: path.join(__dirname, 'scripts', 'after-pack.cjs'),
  // macOS：Dock / 启动台显示中文名 + 支持 1024 专用图标，产物名与 Windows 均不受影响
  mac: {
    ...packageJson.build.mac,
    // ad-hoc 签名无法公证，关掉硬运行时，避免库校验导致启动崩溃；正式签名时改回 true（package.json 里仍是 true）
    hardenedRuntime: false,
    // 有 build/icon-mac.png（1024 画布）时优先用它，否则回退通用图标
    icon: fs.existsSync(path.join(__dirname, 'build', 'icon-mac.png'))
      ? 'build/icon-mac.png'
      : (packageJson.build.mac.icon || 'build/icon.png'),
    extendInfo: {
      ...((packageJson.build.mac && packageJson.build.mac.extendInfo) || {}),
      // 只改显示名：CFBundleName / .app 文件名 / userData 目录保持英文不变，老用户设置不会丢
      CFBundleDisplayName: '未来洞电竞管理系统',
      NSHumanReadableCopyright: `Copyright © ${new Date().getFullYear()} Jane Doe`,
    },
  },
  artifactName: `${envPrefix}${productName}SetupV\${version}.\${ext}`,
  extraMetadata: {
    ...packageJson.build.extraMetadata,
    appEnvironment: env,
  },
  nsis: {
    ...packageJson.build.nsis,
    shortcutName,
  },
  publish: {
    ...packageJson.build.publish,
    url: getUpdateFeedUrl(env),
  },
};
