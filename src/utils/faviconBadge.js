import logoUrl from '../assets/images/logo.png';

/**
 * 浏览器标签页 favicon 未读角标
 * ---------------------------------------------------------------
 * 纯 Web 版替代桌面端的托盘角标：
 * 用 Canvas 把 logo 叠加「红色数字气泡」角标，输出为 dataURL，
 * 再设置为 <link rel="icon">，让未读数在浏览器标签页上一眼可见。
 * ---------------------------------------------------------------
 */

let faviconLink = null;
let logoImage = null; // 已加载的 logo 缓存（避免每次重绘都重新加载）

function getFaviconLink() {
  if (faviconLink) return faviconLink;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  faviconLink = link;
  return link;
}

function loadLogo() {
  return new Promise((resolve) => {
    if (logoImage && logoImage.complete) {
      resolve(logoImage);
      return;
    }
    const img = new Image();
    img.onload = () => {
      logoImage = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

/** 在 64x64 画布上绘制 logo + 右上角红色数字气泡 */
function drawBadge(img, count) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 1) 底图：logo（覆盖整个画布）
  ctx.drawImage(img, 0, 0, size, size);

  // 2) 右上角红色气泡（圆角胶囊，容纳 1~3 位数字）
  const text = count > 99 ? '99+' : String(count);
  const isLong = text.length >= 3;
  const rad = isLong ? 13 : 11;
  const cx = size - rad;
  const cy = rad;

  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // 3) 白色数字
  ctx.font = `bold ${isLong ? 12 : 14}px "Microsoft YaHei", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, cy + 1);

  return canvas.toDataURL('image/png');
}

/**
 * 设置 favicon 未读角标；count<=0 时恢复纯 logo favicon
 * @param {number} count 未读数
 */
export function setFaviconBadge(count) {
  const n = Number(count) || 0;
  const link = getFaviconLink();

  if (n <= 0) {
    // 未读清零：恢复默认 favicon（logo 原图）
    link.href = logoUrl;
    return;
  }

  loadLogo().then((img) => {
    if (!img) return;
    try {
      link.href = drawBadge(img, n);
    } catch {
      /* 绘制失败时保持原 favicon */
    }
  });
}
