<template>
  <div class="admin-layout">
    <Sidebar ref="sidebarRef" class="sidebar" :collapsed="sidebarCollapsed" :class="{ collapsed: sidebarCollapsed }" />
    <div class="main-panel">
      <div class="breadcrumb-row">
        <button class="collapse-btn" type="button" @click="toggleSidebar" aria-label="收起/展开侧边栏">
          <span class="collapse-icon" :class="{ flipped: sidebarCollapsed }">☰</span>
        </button>

        <div class="breadcrumb">
          <template v-for="(item, index) in breadcrumbs" :key="item.path || index">
            <span v-if="index > 0" class="divider">/</span>
            <span
              class="page-name"
              :class="{
                'app-name': index === 0 && breadcrumbs.length > 1,
                current: index === breadcrumbs.length - 1,
              }"
            >
              {{ item.meta?.title }}
            </span>
          </template>
        </div>
        <button
          class="page-refresh-btn"
          type="button"
          aria-label="刷新页面"
          title="刷新页面"
          @click="refreshPage"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M13.2 5.2A5.7 5.7 0 0 0 3 4L1.8 5.3M2 2.8v2.7h2.7M2.8 10.8A5.7 5.7 0 0 0 13 12l1.2-1.3M14 13.2v-2.7h-2.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4" />
          </svg>
        </button>

        <div class="business-actions">
          <ThemePanel />
          <SettingsPanel />

          <button
            class="notice-chip"
            :class="{ shaking: bellShaking }"
            type="button"
            aria-label="系统通知"
            title="系统通知"
            @click="openNotify"
          >
            <span class="notice-icon">🔔</span>
            <span v-if="notify.badgeText" class="notice-badge">
              {{ notify.badgeText }}
            </span>
          </button>

          <el-dropdown trigger="hover" @command="handleCommand">
            <span class="user">
              <img src="../assets/images/defaulIcon.png" alt="avatar" />
              <span class="user-name">{{ userStore.displayName }}</span>
              <span class="caret"></span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="change-password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <div class="window-controls">
            <button class="win-btn" type="button" title="最小化" @click="minimize">
              <svg viewBox="0 0 12 12" width="12" height="12"><path d="M2 6h8" stroke="currentColor" stroke-width="1.2" /></svg>
            </button>
            <button
              class="win-btn"
              type="button"
              :title="isMaximized ? '还原' : '最大化'"
              @click="toggleMaximize"
            >
              <svg v-if="!isMaximized" viewBox="0 0 12 12" width="12" height="12">
                <rect x="2.4" y="2.4" width="7.2" height="7.2" fill="none" stroke="currentColor" stroke-width="1.2" />
              </svg>
              <svg v-else viewBox="0 0 12 12" width="12" height="12">
                <rect x="2.2" y="3.4" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.2" />
                <path d="M4 3.4V2.2h6v6H8.8" fill="none" stroke="currentColor" stroke-width="1.2" />
              </svg>
            </button>
            <button class="win-btn close" type="button" title="关闭" @click="closeWindow">
              <svg viewBox="0 0 12 12" width="12" height="12">
                <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <AppMain class="content" />
    </div>

    <AppModal v-model="passwordModalVisible" title="修改密码" width="460px">
      <form class="password-form" @submit.prevent="submitPasswordChange">
        <p class="password-form-hint">新密码至少 6 位，并确认两次输入一致。</p>
        <label class="password-field">
          <span>旧密码</span>
          <input
            v-model="passwordForm.oldPassword"
            type="password"
            autocomplete="current-password"
            placeholder="请输入旧密码"
            :disabled="passwordSubmitting"
          />
        </label>
        <label class="password-field">
          <span>新密码</span>
          <input
            v-model="passwordForm.newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="请输入新密码（至少 6 位）"
            :disabled="passwordSubmitting"
          />
        </label>
        <label class="password-field">
          <span>确认新密码</span>
          <input
            v-model="passwordForm.confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="请再次输入新密码"
            :disabled="passwordSubmitting"
          />
        </label>
      </form>
      <template #footer>
        <button class="btn btn-plain" type="button" :disabled="passwordSubmitting" @click="passwordModalVisible = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="passwordSubmitting" @click="submitPasswordChange">
        {{ passwordSubmitting ? '提交中…' : '确认修改' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import AppModal from '../components/AppModal.vue';
import { useUserStore } from '../stores/user';
import { useNotifyStore } from '../stores/notify';
import { authApi } from '../api/modules/auth';
import Sidebar from './components/Sidebar.vue';
import AppMain from './components/AppMain.vue';
import ThemePanel from '../components/ThemePanel.vue';
import SettingsPanel from '../components/SettingsPanel.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const notify = useNotifyStore();
const sidebarCollapsed = ref(false);
const sidebarRef = ref(null);
const passwordModalVisible = ref(false);
const passwordSubmitting = ref(false);
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

function getTopmostOverlay() {
  const overlays = Array.from(document.querySelectorAll('.modal-overlay, .logo-lightbox'));
  let topmost = null;
  let highestZIndex = -Infinity;

  overlays.forEach((overlay) => {
    const zIndex = Number.parseInt(window.getComputedStyle(overlay).zIndex, 10) || 0;
    if (zIndex > highestZIndex || zIndex === highestZIndex) {
      topmost = overlay;
      highestZIndex = zIndex;
    }
  });

  return topmost;
}

function getVisibleFilterResetButton(event) {
  if (document.querySelector('.el-overlay, .el-message-box__wrapper, [role="dialog"]')) return null;

  const activeElement = event.target instanceof Element ? event.target : null;
  const activeFilter = activeElement?.closest('.search-form-container');
  if (
    activeElement?.matches('input, textarea, [contenteditable="true"]') &&
    !activeFilter
  ) {
    return null;
  }

  const visibleFilters = Array.from(document.querySelectorAll('.search-form-container'))
    .filter((container) => container.getClientRects().length > 0);
  const activeFilterReset = activeFilter?.querySelector('.Reset-Button');
  const resetButton = activeFilterReset || visibleFilters[0]?.querySelector('.Reset-Button');

  return resetButton instanceof HTMLButtonElement && !resetButton.disabled ? resetButton : null;
}

const imageViewerEscapeEvents = new WeakSet();

function markImageViewerEscape(event) {
  if (event.key === 'Escape' && document.querySelector('.el-image-viewer__wrapper')) {
    imageViewerEscapeEvents.add(event);
  }
}

function handleKeyboardShortcuts(event) {
  if (event.isComposing || event.keyCode === 229) return;
  if (imageViewerEscapeEvents.has(event)) return;

  const key = event.key.toLowerCase();
  const hasModifier = event.ctrlKey || event.metaKey;
  const topmostOverlay = getTopmostOverlay();

  if (hasModifier && event.shiftKey && !event.altKey && key === 'x') {
    if (topmostOverlay) return;
    const resetButton = getVisibleFilterResetButton(event);
    if (!resetButton) return;
    event.preventDefault();
    resetButton.click();
    return;
  }

  if (hasModifier && !event.altKey && !event.shiftKey && key === 'k') {
    if (topmostOverlay) return;
    event.preventDefault();
    if (sidebarCollapsed.value) sidebarCollapsed.value = false;
    nextTick(() => sidebarRef.value?.focusSearch());
    return;
  }

  if (hasModifier && !event.altKey && !event.shiftKey && key === 'enter') {
    if (!topmostOverlay?.classList.contains('modal-overlay')) return;
    const saveButton = topmostOverlay.querySelector('[data-shortcut-save]');
    if (!saveButton || saveButton.disabled || saveButton.getAttribute('aria-disabled') === 'true') return;
    event.preventDefault();
    saveButton.click();
    return;
  }

  if (event.key === 'Escape' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    if (!topmostOverlay?.classList.contains('modal-overlay')) return;
    event.preventDefault();
    event.stopPropagation();
    topmostOverlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
  }
}

/* ================= 顶部铃铛（系统通知） ================= */
const bellShaking = ref(false);

// 收到新消息时铃铛晃动（监听 store 的脉冲计数）
watch(
  () => notify.pulse,
  () => {
    bellShaking.value = true;
    setTimeout(() => {
      bellShaking.value = false;
    }, 900);
  }
);

function openNotify() {
  if (window.notifyBridge && window.notifyBridge.clearFlash) {
    window.notifyBridge.clearFlash();
  }
  router.push('/notify');
}

// 面包屑：取 route.matched 中带 meta.title 的层级，非首页时在最前面补「首页」
const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta && item.meta.title);
  const first = matched[0];
  const isHome = first && ['Home', 'home'].includes(String(first.name));
  if (isHome) return matched;
  return [{ path: '/home', name: 'Home', meta: { title: '首页' } }, ...matched];
});

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function refreshPage() {
  window.location.reload();
}

/* ================= 窗口控制（桌面端顶栏） ================= */
const winControls = window.windowControls;
const isMaximized = ref(false);
let offMaximizeChange = null;

function minimize() {
  winControls && winControls.minimize();
}
function toggleMaximize() {
  winControls && winControls.toggleMaximize();
}
function closeWindow() {
  winControls && winControls.close();
}

onMounted(() => {
  window.addEventListener('keydown', markImageViewerEscape, true);
  window.addEventListener('keydown', handleKeyboardShortcuts);
  if (winControls && winControls.onMaximizeChange) {
    offMaximizeChange = winControls.onMaximizeChange((value) => {
      isMaximized.value = value;
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', markImageViewerEscape, true);
  window.removeEventListener('keydown', handleKeyboardShortcuts);
  if (offMaximizeChange) offMaximizeChange();
});

function handleCommand(command) {
  if (command === 'change-password') {
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
    passwordModalVisible.value = true;
    return;
  }
  if (command === 'logout') {
    userStore.logout();
    ElMessage.success('已退出登录');
    router.push('/login');
  }
}

async function submitPasswordChange() {
  const { oldPassword, newPassword, confirmPassword } = passwordForm.value;
  if (!oldPassword) {
    ElMessage.warning('请输入旧密码');
    return;
  }
  if (!newPassword) {
    ElMessage.warning('请输入新密码');
    return;
  }
  if (newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位');
    return;
  }
  if (newPassword === oldPassword) {
    ElMessage.warning('新密码不能与旧密码相同');
    return;
  }
  if (newPassword !== confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致');
    return;
  }

  passwordSubmitting.value = true;
  try {
    await authApi.changePassword({ oldPassword, newPassword, confirmPassword });
    ElMessage.success('密码已修改');
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
    passwordModalVisible.value = false;
  } catch (error) {
    if (!error?.requestNotified) {
      ElMessage.error(error?.message || '密码修改失败');
    }
  } finally {
    passwordSubmitting.value = false;
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--bg-page);
  overflow: hidden;
}

.password-form {
  display: grid;
  gap: 16px;
}

.password-form-hint {
  margin: 0;
  color: var(--text-sub);
  font-size: 13px;
  line-height: 1.6;
}

.password-field {
  display: grid;
  gap: 7px;
  color: var(--text-sub);
  font-size: 13px;
}

.password-field input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: none;
  background: var(--bg-elevated);
  color: var(--text-main);
  font: inherit;
}

.password-field input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-border);
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.sidebar.collapsed {
  width: 64px;
}

.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.breadcrumb-row {
  height: 59px;
  min-height: 59px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 0 18px;
  background: var(--bg-topbar);
  border-bottom: 1px solid var(--border-soft);
  -webkit-app-region: drag; /* 顶栏空白区域可拖动窗口 */
  user-select: none;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-soft);
  background: var(--bg-elevated);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 12px;
  -webkit-app-region: no-drag;
}

.collapse-btn:hover {
  border-color: var(--primary-border-strong);
  background: var(--primary-soft);
  color: var(--primary);
}

.collapse-icon {
  display: inline-block;
  font-size: 18px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.collapse-icon.flipped {
  transform: rotate(180deg);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-sub);
}

.page-refresh-btn {
  width: 30px;
  height: 30px;
  margin-left: 8px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.18s ease;
  -webkit-app-region: no-drag;
}

.page-refresh-btn:hover {
  border-color: var(--primary-border-strong);
  background: var(--primary-soft);
  color: var(--primary);
}

.app-name {
  font-weight: 600;
  color: var(--text-main);
}

.divider {
  color: var(--text-faint);
}

.page-name {
  color: var(--text-sub);
}

.page-name.current {
  color: var(--text-main);
  font-weight: 600;
}

.business-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
  -webkit-app-region: no-drag;
}

/* ================= 窗口控制按钮 ================= */
.window-controls {
  display: flex;
  align-items: stretch;
  align-self: stretch;
  margin-left: 6px;
  border-left: 1px solid var(--border-soft);
  padding-left: 2px;
}

.win-btn {
  width: 40px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-sub);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.win-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-main);
}

.win-btn.close:hover {
  background: var(--danger);
  color: #fff;
}

.user {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  outline: none;
}

.user-name {
  color: var(--primary);
  font-weight: 600;
  font-size: 15px;
}

.user .caret {
  color: var(--text-sub);
  font-size: 12px;
  margin-left: auto;
  width: 8px;
  height: 8px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  opacity: 0.8;
  margin-bottom: 5px;
}

.user img {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.notice-chip {
  position: relative;
  width: 32px;
  height: 32px;
  border: 1px solid var(--primary-border);
  background: var(--bg-elevated);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-main);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.notice-chip:hover {
  border-color: var(--primary-border-strong);
  box-shadow: 0 4px 12px var(--primary-glow);
}

/* 收到新消息时铃铛晃动 */
.notice-chip.shaking {
  animation: bell-shake 0.9s ease;
}

@keyframes bell-shake {
  0%,
  100% {
    transform: rotate(0);
  }
  15% {
    transform: rotate(16deg);
  }
  30% {
    transform: rotate(-14deg);
  }
  45% {
    transform: rotate(10deg);
  }
  60% {
    transform: rotate(-7deg);
  }
  75% {
    transform: rotate(4deg);
  }
  90% {
    transform: rotate(-2deg);
  }
}

.notice-badge {
  position: absolute;
  right: -3px;
  top: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff8a65, #ff5a5f);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}

.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
