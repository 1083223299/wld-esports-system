<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
});

const route = useRoute();
const router = useRouter();

const openedKeys = ref(new Set());
const hoveredKey = ref('');

/* ===== 菜单模糊搜索 ===== */
const keyword = ref('');
const query = computed(() => keyword.value.trim().toLowerCase());
const searching = computed(() => query.value.length > 0);

/** 子串优先，其次按字符顺序的次序列（如 xtsz → 系统设置） */
function matchLabel(text, q) {
  const s = String(text || '');
  if (!q) return { ok: true };
  const lower = s.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx >= 0) return { ok: true, mode: 'sub', start: idx, end: idx + q.length };
  const hits = [];
  let qi = 0;
  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      hits.push(i);
      qi += 1;
    }
  }
  if (qi === q.length) return { ok: true, mode: 'fuzzy', hits };
  return { ok: false };
}

/** 把文字拆成 [{ t, hit }] 片段，hit 为命中段用于高亮 */
function segments(text, q) {
  const s = String(text || '');
  const r = matchLabel(s, q);
  if (!q || !r.ok) return [{ t: s, hit: false }];
  if (r.mode === 'sub') {
    return [
      { t: s.slice(0, r.start), hit: false },
      { t: s.slice(r.start, r.end), hit: true },
      { t: s.slice(r.end), hit: false },
    ].filter((x) => x.t);
  }
  const hitSet = new Set(r.hits);
  const out = [];
  let buf = '';
  let bufHit = hitSet.has(0);
  for (let i = 0; i < s.length; i++) {
    const h = hitSet.has(i);
    if (h !== bufHit) {
      if (buf) out.push({ t: buf, hit: bufHit });
      buf = '';
      bufHit = h;
    }
    buf += s[i];
  }
  if (buf) out.push({ t: buf, hit: bufHit });
  return out;
}

function toggleGroup(key) {
  const next = new Set(openedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  openedKeys.value = next;
}

const isOpen = (key) => {
  if (props.collapsed) {
    return hoveredKey.value === key;
  }

  if (route.path === key || route.path.startsWith(`${key}/`)) return true;
  return openedKeys.value.has(key);
};

const isGroupVisible = (key) => {
  if (searching.value) return true;
  return isOpen(key);
};

const handleMenuEnter = (key) => {
  if (props.collapsed) {
    hoveredKey.value = key;
  }
};

const handleMenuLeave = (event, key) => {
  if (!props.collapsed || hoveredKey.value !== key) return;

  const nextTarget = event?.relatedTarget;
  const current = event?.currentTarget;
  if (nextTarget && current && current.contains(nextTarget)) {
    return;
  }

  hoveredKey.value = '';
};

const groupActive = (menu) =>
  Array.isArray(menu?.children) && menu.children.some((child) => activeKey.value === child.key);

const isVisible = (record) => {
  if (record.meta?.hidden || record.hidden) return false;
  const children = record.children || [];
  if (children.length && !children.some(isVisible)) return false;
  return true;
};

const joinPath = (base, p) =>
  p.startsWith('/') ? p : `${base === '/' ? '' : base}/${p}`;

const menus = computed(() => {
  const root = router.getRoutes().find((r) => r.path === '/');
  return (root?.children || [])
    .filter(isVisible)
    .map((record) => {
      const meta = record.meta || {};
      const fullPath = joinPath('/', record.path);
      const visibleChildren = (record.children || []).filter(isVisible);
      if (visibleChildren.length) {
        return {
          key: fullPath,
          label: meta.title || record.name || fullPath,
          icon: meta.icon || '',
          children: visibleChildren.map((child) => {
            const childPath = joinPath(fullPath, child.path);
            return {
              key: childPath,
              label: child.meta?.title || child.name || child.path,
              to: childPath,
            };
          }),
        };
      }
      return {
        key: fullPath,
        label: meta.title || record.name || fullPath,
        icon: meta.icon || '',
        to: fullPath,
      };
    });
});

const activeKey = computed(() => route.path);

/** 按关键词过滤菜单：父级命中则展示其全部子级；子级命中则展示该项 */
const filteredMenus = computed(() => {
  const q = query.value;
  if (!q) return menus.value;
  return menus.value
    .map((m) => {
      const parentHit = !!matchLabel(m.label, q).ok;
      if (m.children) {
        const kids = m.children.filter((c) => parentHit || matchLabel(c.label, q).ok);
        return kids.length ? { ...m, children: kids } : null;
      }
      return parentHit ? m : null;
    })
    .filter(Boolean);
});

const noResult = computed(() => searching.value && filteredMenus.value.length === 0);

/** 扁平化的全部命中项，用于回车跳转第一条 */
const flatMatches = computed(() => {
  const out = [];
  filteredMenus.value.forEach((m) => {
    if (m.children) m.children.forEach((c) => out.push(c));
    else out.push(m);
  });
  return out;
});

function clearKeyword() {
  keyword.value = '';
}

function onSearchKeydown(e) {
  if (e.key === 'Enter') {
    const first = flatMatches.value[0];
    if (first?.to) router.push(first.to);
  } else if (e.key === 'Escape') {
    clearKeyword();
  }
}

// 跳转后自动清空关键词，回到完整菜单
watch(
  () => route.path,
  () => {
    if (searching.value) clearKeyword();
  }
);

// 折叠时隐藏搜索框，同时清空关键词避免残留过滤
watch(
  () => props.collapsed,
  (v) => {
    if (v) clearKeyword();
  }
);
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: props.collapsed }">
    <div class="sidebar-header">
      <div class="brand-wrap">
        <span class="brand-tile">
          <img src="../../assets/images/logo.png" alt="logo" class="brand-logo" />
        </span>
        <span class="brand-copy">
          <span class="brand-text">未来电竞俱乐部</span>
          <span class="brand-sub">FUTURE CLUB · 后台管理</span>
        </span>
      </div>
    </div>

    <!-- 菜单模糊搜索（折叠时隐藏） -->
    <div class="menu-search">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <input
        v-model="keyword"
        type="text"
        class="search-input"
        placeholder="搜索菜单"
        aria-label="搜索菜单"
        @keydown="onSearchKeydown"
      />
      <button v-if="searching" class="search-clear" type="button" aria-label="清空搜索" @click="clearKeyword">
        ✕
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="主导航">
      <p v-if="noResult" class="search-empty">未找到「{{ keyword.trim() }}」相关菜单</p>

      <ul v-else class="menu">
        <li v-for="m in filteredMenus" :key="m.key" class="menu-item">
          <template v-if="m.children">
            <div
              class="menu-group"
              :class="{ open: isGroupVisible(m.key), active: groupActive(m), collapsed: props.collapsed }"
              @mouseenter="handleMenuEnter(m.key)"
              @mouseleave="handleMenuLeave($event, m.key)"
            >
              <div class="menu-group-title" @click="toggleGroup(m.key)">
                <SvgIcon v-if="m.icon" class="menu-icon" :icon-class="m.icon" />
                <span class="menu-label">
                  <template v-for="(seg, i) in segments(m.label, query)" :key="i"
                    ><mark v-if="seg.hit" class="hl">{{ seg.t }}</mark><template v-else>{{ seg.t }}</template></template
                  >
                </span>
                <span class="group-arrow" aria-hidden="true"></span>
              </div>
              <ul
                class="submenu"
                @mouseenter="handleMenuEnter(m.key)"
                @mouseleave="handleMenuLeave($event, m.key)"
              >
                <li v-for="child in m.children" :key="child.key">
                  <RouterLink :to="child.to" :class="{ active: activeKey === child.key }">
                    <span class="submenu-dot"></span>
                    <span>
                      <template v-for="(seg, i) in segments(child.label, query)" :key="i"
                        ><mark v-if="seg.hit" class="hl">{{ seg.t }}</mark><template v-else>{{ seg.t }}</template></template
                      >
                    </span>
                  </RouterLink>
                </li>
              </ul>
            </div>
          </template>

          <template v-else>
            <RouterLink :to="m.to" :class="{ active: activeKey === m.key, collapsed: props.collapsed }" :title="m.label">
              <SvgIcon v-if="m.icon" class="menu-icon" :icon-class="m.icon" />
              <span class="menu-label">
                <template v-for="(seg, i) in segments(m.label, query)" :key="i"
                  ><mark v-if="seg.hit" class="hl">{{ seg.t }}</mark><template v-else>{{ seg.t }}</template></template
                >
              </span>
            </RouterLink>
          </template>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: 100%;
  background: linear-gradient(180deg, var(--sidebar-bg-1) 0%, var(--sidebar-bg-2) 100%);
  border-right: 1px solid var(--border-soft);
  box-shadow: var(--sidebar-inset);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
}

.sidebar.collapsed {
  width: 72px;
  overflow: visible;
}

/* ===== 菜单模糊搜索 ===== */
.menu-search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 12px 0;
  padding: 0 10px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--border-soft);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.menu-search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.search-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--text-sub);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: var(--text-main);
}

.search-input::placeholder {
  color: var(--text-faint);
}

.search-clear {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border: none;
  padding: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  line-height: 1;
  color: var(--text-sub);
  background: var(--border-soft);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.search-clear:hover {
  color: var(--primary);
  background: var(--primary-soft);
}

.hl {
  background: var(--primary-tint);
  color: var(--primary);
  border-radius: 3px;
  padding: 0 1px;
  font-weight: 700;
}

.search-empty {
  margin: 18px 6px;
  padding: 14px 12px;
  text-align: center;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-sub);
  border-radius: 10px;
  background: var(--sidebar-group-bg);
  border: 1px dashed var(--border-soft);
}

.sidebar.collapsed .menu-search {
  display: none;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 18px 18px;
  border-bottom: 1px solid var(--border-soft);
  position: relative;
}

.sidebar-header::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-border-strong), transparent);
  opacity: 0.5;
}

.brand-wrap {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 12px;
}

.brand-tile {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* background: linear-gradient(135deg, var(--primary-light-5), var(--primary) 60%, var(--primary-deep));
  box-shadow: 0 10px 22px -6px var(--primary-glow-strong),
    inset 0 1px 0 rgba(255, 255, 255, 0.28); */
  position: relative;
}

.brand-tile::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  pointer-events: none;
}

.brand-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  /* filter: brightness(0) invert(1); */
  /* flex-shrink: 0; */
}

.brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.brand-text {
  display: block;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: linear-gradient(90deg, var(--primary), var(--primary-hover));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-sub {
  display: block;
  font-size: 9.5px;
  letter-spacing: 0.16em;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
}

.sidebar.collapsed .brand-wrap {
  justify-content: center;
}

.sidebar.collapsed .brand-text,
.sidebar.collapsed .brand-sub {
  display: none;
}

.sidebar-nav {
  flex: 1;
  overflow: auto;
  padding: 12px 10px 16px;
}

.sidebar.collapsed .sidebar-nav {
  overflow: visible;
}

.menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  margin-bottom: 8px;
  position: relative;
}

.menu a,
.menu-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  color: var(--text-sidebar);
  text-decoration: none;
  transition: all 0.18s ease;
  cursor: pointer;
}

.sidebar.collapsed .menu a,
.sidebar.collapsed .menu-group-title {
  justify-content: center;
  padding: 0 8px;
}

.menu a:hover,
.menu-group-title:hover {
  background: var(--primary-soft);
  color: var(--primary);
}

.menu a.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: var(--text-invert);
  box-shadow: 0 12px 20px var(--primary-glow);
}

.menu a.active .submenu-dot {
  background: var(--primary);
}

.menu-group {
  border-radius: 12px;
  background: var(--sidebar-group-bg);
  padding: 0;
}

.menu-group-title {
  font-weight: 600;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.menu-group.active > .menu-group-title {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: var(--text-invert);
  border-color: var(--primary-border);
  box-shadow: 0 10px 18px var(--primary-glow);
}

.menu-group.active > .menu-group-title .menu-icon,
.menu-group.active > .menu-group-title .group-arrow {
  filter: brightness(0) invert(var(--icon-invert));
}

.group-arrow {
  margin-left: auto;
  width: 8px;
  height: 8px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  opacity: 0.8;
}

.menu-group.open .group-arrow {
  transform: rotate(225deg);
}

.sidebar.collapsed .menu-label,
.sidebar.collapsed .menu-group-title .menu-label,
.sidebar.collapsed .menu-group-title .group-arrow,
.sidebar.collapsed .submenu-dot {
  display: none;
}

.submenu {
  list-style: none;
  margin: 4px 0 0;
  padding: 0 0 0 12px;
  display: none;
}

.menu-group.open .submenu {
  display: block;
}

.sidebar.collapsed .menu-group {
  position: relative;
  overflow: visible;
  width: 44px;
  margin: 0 auto;
}

.sidebar.collapsed .menu-group-title {
  position: relative;
  z-index: 2;
  width: 40px;
  height: 40px;
}

.sidebar.collapsed .menu-group .submenu {
  position: absolute;
  left: 44px;
  top: 50%;
  min-width: 180px;
  width: max-content;
  min-height: 32px;
  background: var(--bg-elevated);
  border: 1px solid var(--primary-border);
  box-shadow: var(--shadow-lg);
  border-radius: 12px;
  padding: 8px;
  display: none;
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 99;
  pointer-events: auto;
}

.sidebar.collapsed .menu-group .submenu::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 18px;
  width: 12px;
  height: 12px;
  background: var(--bg-elevated);
  border-left: 1px solid var(--primary-border);
  border-bottom: 1px solid var(--primary-border);
  transform: rotate(45deg);
}

.sidebar.collapsed .menu-group:hover .submenu,
.sidebar.collapsed .menu-group:focus-within .submenu,
.sidebar.collapsed .menu-group-title:hover + .submenu,
.sidebar.collapsed .menu-group:has(.submenu:hover) .submenu,
.sidebar.collapsed .menu-group.open .submenu {
  display: block;
  opacity: 1;
  transform: translateY(-50%);
}

.sidebar.collapsed .submenu li {
  margin-top: 0;
}

.sidebar.collapsed .submenu a {
  min-height: 34px;
  padding: 0 12px;
  justify-content: flex-start;
  white-space: nowrap;
  display: flex;
}

.submenu li {
  margin-top: 4px;
}

.submenu a {
  min-height: 34px;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-submenu);
  border-radius: 10px;
  background: transparent;
}

.submenu a.active {
  background: var(--primary-soft);
  color: var(--primary);
  box-shadow: inset 0 0 0 1px var(--primary-faint);
}

.submenu-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-submenu);
  display: inline-block;
  flex-shrink: 0;
}

.menu-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  /* 普通菜单图标跟随主题：亮色主题保持原色，暗色主题反白 */
  filter: var(--icon-filter);
  transition: filter 0.2s ease;
}

.menu a.active .menu-icon,
.menu-group.active > .menu-group-title .menu-icon {
  filter: brightness(0) invert(var(--icon-invert));
}
</style>
