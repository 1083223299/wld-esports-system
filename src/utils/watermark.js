/** 全局水印覆盖层：canvas 生成半透明斜向水印，平铺覆盖整个页面（防截图泄密） */
import { resolveTheme } from '../theme/themes';

let watermarkEl = null; // 当前水印 DOM（单例）

/** 浅色主题水印：深色半透明文字 */
const FILL_FOR_LIGHT_THEME = 'rgba(0, 0, 0, 0.07)';
/** 深色主题水印：浅色半透明文字（深色底上沿用黑字会几乎不可见） */
const FILL_FOR_DARK_THEME = 'rgba(255, 255, 255, 0.03)';

/**
 * 当前生效主题是否为暗色。
 * 以 <html data-theme> 为准（theme store 切换主题 / 跟随系统切换明暗时都会更新该属性）；
 * 读取不到时按亮色处理，保证默认主题下表现不变。
 */
function currentThemeIsDark() {
  if (typeof document === 'undefined') return false;
  const id = document.documentElement.getAttribute('data-theme');
  if (!id) return false;
  return resolveTheme(id).mode === 'dark';
}

/**
 * 挂载水印。重复调用会先移除旧水印再重建。
 * @param {string} text 水印文字
 * @param {{ dark?: boolean }} [options] dark=true 时使用浅色水印；省略则按当前主题自动判断
 */
export function applyWatermark(text, options = {}) {
  removeWatermark();

  const dark = typeof options.dark === 'boolean' ? options.dark : currentThemeIsDark();

  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 1.2);
  ctx.rotate((-Math.PI / 18)); // 逆时针 10°，斜向水印
  ctx.font = '14px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = dark ? FILL_FOR_DARK_THEME : FILL_FOR_LIGHT_THEME;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/png');

  const el = document.createElement('div');
  el.id = 'app-watermark';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = [
    'position: fixed',
    'inset: 0',
    'z-index: 9999',
    'pointer-events: none', // 不拦截任何点击 / 选择
    'user-select: none',
    'background-image: url(' + dataUrl + ')',
    'background-repeat: repeat',
    'background-size: 280px 200px',
  ].join(';');

  document.body.appendChild(el);
  watermarkEl = el;
}

/** 移除水印覆盖层 */
export function removeWatermark() {
  if (watermarkEl && watermarkEl.parentNode) {
    watermarkEl.parentNode.removeChild(watermarkEl);
  }
  watermarkEl = null;
}
