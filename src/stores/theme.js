import { defineStore } from 'pinia';
import { DEFAULT_THEME, resolveTheme, resolveSystemThemeId } from '../theme/themes';

/** 主题持久化键（与 main.js 挂载前预加载保持一致） */
export const THEME_STORAGE_KEY = 'futurecave-theme';

/** 读取本地记忆的主题（损坏时返回 null） */
function readSavedTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved.name) return saved.name;
    }
  } catch {
    /* 忽略损坏数据 */
  }
  return null;
}

/** 系统亮暗媒体查询 */
const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * 主题 Store：记录当前主题、应用到 <html data-theme> 并持久化。
 * name === 'system' 时为"跟随系统"模式：根据系统亮暗自动选择
 * 亮色主题（aurora）或暗色主题（nightgold），并监听系统切换。
 */
export const useThemeStore = defineStore('theme', {
  state: () => ({
    name: readSavedTheme() || DEFAULT_THEME,
    /** 跟随系统时实际解析出的真实主题 id */
    resolvedId: DEFAULT_THEME,
    /** 系统主题变化监听函数 */
    _systemListener: null,
  }),

  getters: {
    /** 当前生效的主题对象（跟随系统时返回解析后的真实主题） */
    current: (state) => resolveTheme(state.resolvedId),
    isDark: (state) => resolveTheme(state.resolvedId).mode === 'dark',
    isSystem: (state) => state.name === 'system',
  },

  actions: {
    /** 解析当前 name 对应的真实主题 id */
    _resolveRealId(name) {
      if (name === 'system') return resolveSystemThemeId();
      return resolveTheme(name).id;
    },

    /** 应用主题：切换 html[data-theme]、记忆选择并触发平滑过渡 */
    apply(name) {
      this.name = name;
      this.resolvedId = this._resolveRealId(name);

      // 清理旧监听
      if (this._systemListener) {
        darkMedia.removeEventListener('change', this._systemListener);
        this._systemListener = null;
      }

      // 跟随系统：注册监听，系统亮暗变化时自动重解析
      if (name === 'system') {
        this._systemListener = () => {
          this.resolvedId = resolveSystemThemeId();
          this._applyToDom();
        };
        darkMedia.addEventListener('change', this._systemListener);
      }

      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ name }));
      } catch {
        /* 忽略存储失败 */
      }

      this._applyToDom();
    },

    _applyToDom() {
      const root = document.documentElement;
      root.setAttribute('data-theme', this.resolvedId);

      root.classList.add('theme-switching');
      clearTimeout(this._transitionTimer);
      this._transitionTimer = setTimeout(() => {
        root.classList.remove('theme-switching');
      }, 420);
    },

    /** 启动时应用持久化主题（挂载前 main.js 已预置，这里兜底） */
    init() {
      this.apply(this.name);
    },
  },
});
