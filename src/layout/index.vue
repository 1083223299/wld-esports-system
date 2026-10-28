<template>
  <div class="admin-layout">
    <Sidebar class="sidebar" :collapsed="sidebarCollapsed" :class="{ collapsed: sidebarCollapsed }" />
    <div class="main-panel">
      <div class="breadcrumb-row">
        <button class="collapse-btn" type="button" @click="toggleSidebar" aria-label="收起/展开侧边栏">
          <svg class="collapse-icon" :class="{ flipped: sidebarCollapsed }" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M3 6h18M3 12h18M3 18h18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <!-- <path
              d="M14 9l-3 3 3 3"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            /> -->
          </svg>
        </button>

        <div class="breadcrumb">
          <template v-for="(item, index) in breadcrumbs" :key="item.path || index">
            <span v-if="index > 0" class="divider">
              <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
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

        <div class="business-actions">
          <ThemePanel />

          <button
            class="notice-chip"
            :class="{ shaking: bellShaking }"
            type="button"
            aria-label="系统通知"
            title="系统通知"
            @click="openNotify"
          >
            <svg class="notice-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M12 3a6 6 0 0 0-6 6c0 5-2.5 6.5-2.5 6.5h17S18 14 18 9a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0"
                stroke="currentColor"
                stroke-width="1.7"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-if="notify.unreadCount" class="notice-badge">
              {{ notify.badge || (notify.unreadCount > 99 ? '99+' : notify.unreadCount) }}
            </span>
          </button>

          <el-dropdown trigger="hover" @command="handleCommand">
            <span class="user">
              <span class="avatar-ring">
                <img src="../assets/images/defaulIcon.png" alt="avatar" />
              </span>
              <span class="user-name">{{ userStore.displayName }}</span>
              <span class="caret"></span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <span class="logout-item">退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <AppMain class="content" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../stores/user';
import { useNotifyStore } from '../stores/notify';
import Sidebar from './components/Sidebar.vue';
import AppMain from './components/AppMain.vue';
import ThemePanel from '../components/ThemePanel.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const notify = useNotifyStore();
const sidebarCollapsed = ref(false);

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

function handleCommand(command) {
  if (command === 'logout') {
    userStore.logout();
    ElMessage.success('已退出登录');
    router.push('/login');
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--app-bg, var(--bg-page));
  overflow: hidden;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  transition: width 0.22s var(--ease-out, ease);
}

.sidebar.collapsed {
  width: 72px;
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
  height: 60px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px 0 18px;
  background: var(--bg-topbar);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-soft);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset;
  position: relative;
  z-index: 10;
}

.collapse-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-soft);
  background: var(--bg-elevated);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 14px;
  box-shadow: var(--shadow-sm);
}

.collapse-btn:hover {
  border-color: var(--primary-border-strong);
  color: var(--primary);
  box-shadow: 0 6px 16px -6px var(--primary-glow);
}

.collapse-icon {
  display: block;
  transition: transform 0.22s var(--ease-out, ease);
}

.collapse-icon.flipped {
  transform: rotate(180deg);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-sub);
}

.app-name {
  font-weight: 600;
  color: var(--text-main);
}

.divider {
  display: inline-flex;
  color: var(--text-faint);
  opacity: 0.7;
}

.page-name {
  color: var(--text-sub);
}

.page-name.current {
  color: var(--text-main);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.business-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}

.user {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: var(--bg-elevated);
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.user:hover {
  border-color: var(--primary-border-strong);
  box-shadow: 0 6px 16px -6px var(--primary-glow);
}

.avatar-ring {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-ring img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--bg-elevated);
  box-sizing: border-box;
}

.user-name {
  color: var(--text-main);
  font-weight: 600;
  font-size: 13px;
}

.user .caret {
  color: var(--text-sub);
  font-size: 12px;
  width: 7px;
  height: 7px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  opacity: 0.8;
  margin-bottom: 4px;
}

.logout-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--status-danger);
}

.notice-chip {
  position: relative;
  width: 34px;
  height: 34px;
  border: 1px solid var(--primary-border);
  background: var(--bg-elevated);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-main);
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.notice-icon {
  display: block;
  color: var(--text-sub);
  transition: color 0.2s ease;
}

.notice-chip:hover {
  border-color: var(--primary-border-strong);
  box-shadow: 0 4px 14px var(--primary-glow);
}

.notice-chip:hover .notice-icon {
  color: var(--primary);
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
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff8a65, #ff5a5f);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 17px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(255, 90, 95, 0.4);
}

.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
