/**
 * 主题元数据（用于换肤面板展示与校验）
 * 注意：preview 中的颜色仅用于面板预览卡片，与 theme.css 中对应主题的
 * 令牌保持一致；实际渲染颜色以 theme.css 的 [data-theme] 为准。
 *
 * 特殊主题：
 *   system 跟随系统（虚拟主题）——本身不写 data-theme，
 *   而是根据 prefers-color-scheme 解析到下方真实主题：
 *     亮色 → aurora（紫夜星云）
 *     暗色 → nightgold（暗夜黑金）
 */

export const DEFAULT_THEME = 'system';

/** 系统暗色时使用的暗色主题 id */
const SYSTEM_DARK_THEME = 'nightgold';
/** 系统亮色时使用的亮色主题 id */
const SYSTEM_LIGHT_THEME = 'aurora';

/** 根据系统亮暗偏好解析真实主题 id */
export function resolveSystemThemeId() {
  if (typeof window === 'undefined' || !window.matchMedia) return SYSTEM_LIGHT_THEME;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? SYSTEM_DARK_THEME
    : SYSTEM_LIGHT_THEME;
}

export const themes = [
  {
    id: 'system',
    name: '跟随系统',
    subtitle: '自动匹配亮暗',
    mode: 'auto',
    preview: {
      page: 'linear-gradient(135deg, #f4f9fd 0%, #0b0d12 100%)',
      sidebar: 'linear-gradient(180deg, #f4f7ff 0%, #12151d 100%)',
      card: 'linear-gradient(135deg, #ffffff 0%, #151922 100%)',
      primary: '#6a35ff',
      gradient: 'linear-gradient(135deg, #8f5eff, #d4a440)',
    },
  },
  {
    id: 'aurora',
    name: '紫夜星云',
    subtitle: '经典幻紫',
    mode: 'light',
    preview: {
      page: '#f4f9fd',
      sidebar: '#f4f7ff',
      card: '#ffffff',
      primary: '#6a35ff',
      gradient: 'linear-gradient(135deg, #7a83ff, #6a35ff)',
    },
  },
  {
    id: 'ocean',
    name: '深海科技蓝',
    subtitle: '沉稳睿智',
    mode: 'light',
    preview: {
      page: '#eef4fb',
      sidebar: '#eaf2fd',
      card: '#ffffff',
      primary: '#2563eb',
      gradient: 'linear-gradient(135deg, #38bdf8, #2563eb)',
    },
  },
  {
    id: 'emerald',
    name: '翡翠流光',
    subtitle: '清新雅致',
    mode: 'light',
    preview: {
      page: '#effaf7',
      sidebar: '#e8f6f2',
      card: '#ffffff',
      primary: '#0d9488',
      gradient: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
    },
  },
  {
    id: 'rose',
    name: '绯红烈焰',
    subtitle: '热烈高级',
    mode: 'light',
    preview: {
      page: '#fdf2f4',
      sidebar: '#faecef',
      card: '#ffffff',
      primary: '#e11d48',
      gradient: 'linear-gradient(135deg, #fb7185, #e11d48)',
    },
  },
  {
    id: 'nightgold',
    name: '暗夜黑金',
    subtitle: '深邃尊贵',
    mode: 'dark',
    preview: {
      page: '#0b0d12',
      sidebar: '#12151d',
      card: '#151922',
      primary: '#d4a440',
      gradient: 'linear-gradient(135deg, #f0c453, #c9973a)',
    },
  },
];

export function resolveTheme(name) {
  return themes.find((t) => t.id === name) || themes.find((t) => t.id === DEFAULT_THEME);
}
