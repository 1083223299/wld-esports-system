<script setup>
import { computed, ref } from 'vue';
import { useThemeStore } from '../stores/theme';
import { themes } from '../theme/themes';

const themeStore = useThemeStore();
const open = ref(false);

/** 色板仅展示真实主题，跟随系统单独作为开关 */
const paletteThemes = computed(() => themes.filter((t) => t.id !== 'system'));

function pick(id) {
  themeStore.apply(id);
}

/** 跟随系统开关：开启走 system；关闭沿用当前解析到的真实主题，界面不跳变 */
function toggleSystem(val) {
  themeStore.apply(val ? 'system' : themeStore.resolvedId);
}
</script>

<template>
  <span class="theme-switcher">
    <button
      class="theme-btn"
      :class="{ active: open }"
      type="button"
      title="主题换肤"
      aria-label="主题换肤"
      @click="open = !open"
    >
      <svg class="palette-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <defs>
          <linearGradient id="theme-palette-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style="stop-color: var(--primary)" />
            <stop offset="55%" style="stop-color: var(--primary-hover)" />
            <stop offset="100%" style="stop-color: var(--primary-deep)" />
          </linearGradient>
        </defs>
        <path
          d="M12 2.5A9.5 9.5 0 1 0 21.5 12c0-1.66-1.34-3-3-3h-2.2c-1.1 0-2-.9-2-2 0-.55.22-1.05.57-1.41.4-.4.63-.96.63-1.59 0-1.66-1.34-2.5-3.5-2.5z"
          fill="url(#theme-palette-grad)"
        />
        <circle cx="7.4" cy="11.2" r="1.25" fill="#ffffff" />
        <circle cx="12" cy="7.2" r="1.25" fill="#ffffff" />
        <circle cx="16.4" cy="11.2" r="1.25" fill="#ffffff" />
      </svg>
      <span class="theme-btn-dot" :style="{ background: themeStore.current.preview.primary }"></span>
    </button>

    <transition name="theme-pop">
      <div v-if="open" class="theme-panel" role="dialog" aria-label="主题换肤">
        <div class="panel-head">
          <div class="panel-title">主题换肤</div>
          <span class="panel-mode" :class="themeStore.isDark ? 'dark' : 'light'">
            {{ themeStore.isDark ? '暗色' : '亮色' }}
          </span>
        </div>

        <div class="system-row">
          <span class="system-label">跟随系统</span>
          <el-switch
            class="system-switch"
            :model-value="themeStore.isSystem"
            aria-label="跟随系统"
            @change="toggleSystem"
          />
        </div>

        <div class="swatch-grid">
          <button
            v-for="t in paletteThemes"
            :key="t.id"
            class="swatch"
            :class="{ active: t.id === themeStore.resolvedId }"
            type="button"
            :title="t.name"
            :aria-label="t.name"
            @click="pick(t.id)"
          >
            <span class="swatch-fill" :style="{ background: t.swatch }">
              <svg
                v-if="t.id === themeStore.resolvedId"
                class="swatch-check"
                viewBox="0 0 12 12"
                width="12"
                height="12"
                aria-hidden="true"
              >
                <path
                  d="M2.5 6.5 5 9l4.5-5.5"
                  stroke="#ffffff"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  fill="none"
                />
              </svg>
            </span>
          </button>
        </div>

        <div class="panel-foot">
          <span class="foot-tip">选择后即时生效，自动记忆</span>
        </div>
      </div>
    </transition>

    <div v-if="open" class="theme-mask" @click="open = false"></div>
  </span>
</template>

<style scoped>
.theme-switcher {
  position: relative;
  display: inline-flex;
}

/* ---- 触发按钮：圆形渐变描边 + 主题色圆点 ---- */
.theme-btn {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--primary-border);
  background: var(--bg-elevated);
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
.theme-btn:hover,
.theme-btn.active {
  border-color: var(--primary-border-strong);
  color: var(--primary);
  box-shadow: 0 4px 12px var(--primary-glow);
}
.theme-btn:active {
  transform: scale(0.94);
}
.palette-icon {
  display: block;
}
.theme-btn-dot {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--bg-elevated);
  box-shadow: 0 0 0 1px var(--primary-border);
  transition: background 0.3s ease;
}

/* ---- 面板 ---- */
.theme-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: -4px;
  width: 230px;
  padding: 14px 16px;
  z-index: 61;
  background: var(--panel-glass);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  text-align: left;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}
.panel-mode {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.panel-mode.light {
  background: var(--primary-soft);
  color: var(--primary);
}
.panel-mode.dark {
  background: var(--primary);
  color: var(--text-invert);
}

/* ---- 跟随系统开关行 ---- */
.system-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.system-label {
  font-size: 12px;
  color: var(--text-main);
}

/* ---- 色板 ---- */
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: 14px;
}
.swatch {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.18s ease;
}
.swatch-fill {
  position: relative;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--border-soft);
  transition: transform 0.18s ease;
}
.swatch:hover .swatch-fill {
  transform: scale(1.12);
}
.swatch:active .swatch-fill {
  transform: scale(0.98);
}
.swatch-check {
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.45));
}

/* ---- 底部提示 ---- */
.panel-foot {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-soft);
}
.foot-tip {
  font-size: 11px;
  color: var(--text-sub);
}

/* ---- 关闭蒙层（点击面板外关闭） ---- */
.theme-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: transparent;
}

/* ---- 弹出动画 ---- */
.theme-pop-enter-active,
.theme-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.theme-pop-enter-from,
.theme-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}
</style>
