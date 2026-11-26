/**
 * 把外部构建目录中的最终产物回移到项目的 release/ 目录
 * ---------------------------------------------------------------
 * electron-builder 的输出目录已移到工作区外（见 electron-builder.config.js），
 * 这里负责把安装包、更新块、latest.yml 等回移到 release/，
 * 保证原有发布流程（从 release/ 取包上传 OSS）、GitHub Actions 的
 * release/*.dmg、release/*.zip、release/latest-mac.yml 上传逻辑都不变。
 *
 * 用法：
 *   node scripts/collect-artifacts.js                 # dist：回移安装包类文件
 *   node scripts/collect-artifacts.js --with-unpacked # pack：额外同步 win-unpacked 目录
 */
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, resolveBuildDir } = require('./build-paths.cjs');
const { version } = require('../package.json');

const buildDir = resolveBuildDir();
const releaseDir = path.join(PROJECT_ROOT, 'release');
const withUnpacked = process.argv.includes('--with-unpacked');

// 需要回移的顶层文件类型：安装包、增量更新块、更新清单、构建调试信息
const FILE_PATTERNS = [
  /\.exe$/i,
  /\.exe\.blockmap$/i,
  /\.dmg$/i,
  /\.zip$/i,
  /\.blockmap$/i,
  /\.yml$/i,
];

function shouldCopy(name) {
  // 清单类文件总是回移（自动更新依赖）
  if (/^latest(-mac|-linux)?\.yml$/i.test(name)) return true;
  if (/^builder-debug\.yml$/i.test(name) || /^builder-effective-config\.yaml$/i.test(name)) return true;

  if (!FILE_PATTERNS.some((re) => re.test(name))) return false;

  // 安装包只回移当前 package.json 版本，避免把构建目录里历史版本的包带进 release
  return name.includes(version);
}

// 只在源文件更新时覆盖，避免把构建目录里的历史产物反复拷回来
function copyIfNewer(src, dest) {
  const srcStat = fs.statSync(src);
  if (fs.existsSync(dest)) {
    const destStat = fs.statSync(dest);
    if (destStat.size === srcStat.size && destStat.mtimeMs >= srcStat.mtimeMs) return false;
  }
  fs.copyFileSync(src, dest);
  // 保留源文件时间，方便下次比对
  fs.utimesSync(dest, srcStat.atime, srcStat.mtime);
  return true;
}

if (!fs.existsSync(buildDir)) {
  console.error(`[回移] 构建目录不存在：${buildDir}`);
  process.exit(1);
}

fs.mkdirSync(releaseDir, { recursive: true });

let copied = 0;
let skipped = 0;
const errors = [];

for (const ent of fs.readdirSync(buildDir, { withFileTypes: true })) {
  if (!ent.isFile() || !shouldCopy(ent.name)) continue;

  const src = path.join(buildDir, ent.name);
  const dest = path.join(releaseDir, ent.name);

  try {
    if (copyIfNewer(src, dest)) {
      copied += 1;
      console.log(`  ✔ ${ent.name}`);
    } else {
      skipped += 1;
    }
  } catch (e) {
    errors.push(`${ent.name}（${e.code || e.message}）`);
  }
}

// pack 系列：把 win-unpacked 同步回 release，保持原有调试习惯
if (withUnpacked) {
  const srcUnpacked = path.join(buildDir, 'win-unpacked');
  const destUnpacked = path.join(releaseDir, 'win-unpacked');

  if (fs.existsSync(srcUnpacked)) {
    try {
      if (fs.existsSync(destUnpacked)) {
        // 先用重命名探测：目录内有文件被独占时重命名会直接失败，
        // 不会像 rmSync 那样删掉一半文件，保证旧目录原样保留
        const backup = `${destUnpacked}.old-${Date.now()}`;
        fs.renameSync(destUnpacked, backup);
        fs.rmSync(backup, { recursive: true, force: true, maxRetries: 3, retryDelay: 600 });
      }
      fs.cpSync(srcUnpacked, destUnpacked, { recursive: true });
      console.log('  ✔ win-unpacked/ 已同步到 release/');
    } catch (e) {
      // 旧目录被编辑器/杀软占用时不让 pack 失败，只提示新产物位置
      console.warn('');
      console.warn('  ! win-unpacked 未同步到 release/（release 里的旧目录可能仍被占用）');
      console.warn(`    新产物在：${srcUnpacked}`);
      console.warn(`    原因：${e.code || ''} ${e.message}`);
      console.warn('    旧目录保持原样，未做删除');
      console.warn('');
    }
  }
}

console.log('');
console.log(`[回移] 构建目录：${buildDir}`);
console.log(`[回移] 目标目录：${releaseDir}`);
console.log(`[回移] 复制 ${copied} 个文件，跳过 ${skipped} 个未更新文件`);

if (errors.length > 0) {
  console.error('[回移] 以下产物复制失败：');
  for (const err of errors) console.error(`  ✘ ${err}`);
  process.exitCode = 1;
}
