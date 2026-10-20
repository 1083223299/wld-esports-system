<template>
  <transition name="float-panel-fade">
    <div
      v-show="value"
      ref="panel"
      class="float-panel"
      :class="{ dragging, minimized, 'theme-dark': theme === 'dark' }"
      :style="panelStyle"
    >
      <div v-show="!minimized" class="float-panel-header" @mousedown="beginDrag">
        <span class="float-panel-title">{{ title }}</span>
        <div class="float-panel-actions" @mousedown.stop>
          <i class="el-icon-minus" title="最小化" @click="minimize"></i>
          <i class="el-icon-close" title="关闭" @click="handleClose"></i>
        </div>
      </div>

      <div v-show="!minimized" class="float-panel-body">
        <slot></slot>
      </div>
      <div v-show="minimized" class="float-panel-mini" @mousedown="beginDrag">
        <slot name="mini" :restore="restoreFromMini"></slot>
      </div>

      <div
        v-show="!minimized"
        class="float-panel-resize-grip"
        title="拖拽等比缩放，双击恢复原始大小"
        @mousedown.prevent="beginResize"
        @dblclick="resetScale"
      ></div>
    </div>
  </transition>
</template>

<script>
/** 整个视口：拖拽范围，浮窗要能拖到侧边栏和顶栏上面去 */
function measureViewport() {
  const el = document.documentElement;
  return {
    left: 0,
    top: 0,
    width: el.clientWidth || window.innerWidth,
    height: el.clientHeight || window.innerHeight,
  };
}

/**
 * 读取内容区。
 * 默认用视口；但后台布局有左侧边栏和固定顶栏，真正「页面中间」是主内容区，
 * 传 boundsSelector 让面板按那个元素的盒子居中，否则会相对内容区偏左上。
 * 取的是 content box（扣掉 padding），因为 .app-main 用 padding-top 给固定顶栏让位。
 *
 * 注意：这个只用来算初始位置和停靠点，拖拽范围是整个视口，不要用这里当边界。
 */
function measureBounds(selector) {
  const bounds = measureViewport();
  if (!selector) return bounds;

  const target = document.querySelector(selector);
  if (!target) return bounds;

  const rect = target.getBoundingClientRect();
  const style = window.getComputedStyle(target);
  const padTop = parseFloat(style.paddingTop) || 0;
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const padRight = parseFloat(style.paddingRight) || 0;
  return {
    left: rect.left + padLeft,
    top: rect.top + padTop,
    width: Math.max(0, rect.width - padLeft - padRight),
    height: Math.max(0, rect.height - padTop),
  };
}

/**
 * 通用悬浮面板：非模态，展开/最小化两态都可拖动。
 * 与 el-dialog 的区别是它不遮罩、不锁页面滚动，适合「边看浮层边操作列表」的场景。
 *
 * 两种形态：
 * - 展开：打开时水平垂直居中，可拖到任意位置
 * - 最小化：缩到右下角，只留 mini 插槽的内容（如头像+房间名），可拖走，点它可以还原
 *
 * 两种形态统一用 left/top 定位，这样拖拽逻辑只有一套。
 */
const EDGE_GAP = 24;
/** 拖到屏幕边缘时允许贴边，不要在左侧和上侧留缝 */
const DRAG_EDGE = 0;
const MINI_HEIGHT = 64;
const RESIZE_THROTTLE = 200;
/** 超过这个位移才算拖拽，否则点击缩小版会被误判成点击放大 */
const DRAG_THRESHOLD = 3;

export default {
  name: "FloatPanel",
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "",
    },
    width: {
      type: Number,
      default: 720,
    },
    height: {
      type: Number,
      default: 600,
    },
    miniWidth: {
      type: Number,
      default: 220,
    },
    /** 每次切换路由自动收成最小化 */
    autoMinimizeOnRouteChange: {
      type: Boolean,
      default: false,
    },
    /** 居中/贴边/拖拽的可用区域选择器，默认整个视口 */
    boundsSelector: {
      type: String,
      default: "",
    },
    /** 外观主题：light = 浅色通用面板，dark = 深色玻璃拟态（语音房风格） */
    theme: {
      type: String,
      default: "light",
    },
  },
  data() {
    return {
      minimized: false,
      dragging: false,
      dragMoved: false,
      // 整体等比缩放倍数（右下角手柄拖出来的），1 = 原始大小
      scale: 1,
      resizeState: null,
      // 两种形态共用的左上角坐标
      offset: { left: EDGE_GAP, top: EDGE_GAP },
      dragState: null,
      resizeTimer: null,
      // 存进 data 才能让依赖它的 computed 在区域变化后重算
      bounds: measureBounds(this.boundsSelector),
      // 拖拽永远按整个视口，不受内容区留白限制
      dragBounds: measureViewport(),
    };
  },
  computed: {
    /** 展开高度按视口收敛，避免矮屏幕下超出可视区 */
    expandedHeight() {
      return Math.max(240, Math.min(this.height, this.dragBounds.height - EDGE_GAP * 2));
    },
    panelStyle() {
      return {
        left: `${this.offset.left}px`,
        top: `${this.offset.top}px`,
        width: `${this.minimized ? this.miniWidth : this.width}px`,
        height: `${this.minimized ? MINI_HEIGHT : this.expandedHeight}px`,
        // transform-origin 是 top left，所以 left/top 就是视觉左上角，拖拽定位逻辑不用改。
        // 缩放为 1 时清空 inline transform，float-panel-fade 的 translateY 入场位移才不会被盖掉。
        transform: this.scale === 1 ? "" : `scale(${this.scale})`,
      };
    },
  },
  watch: {
    value(val) {
      if (val) {
        this.minimized = false;
        // 每次重新打开回到原始大小，避免上次缩放残留到新的巡查
        this.scale = 1;
        this.center();
      }
    },
    $route() {
      if (this.autoMinimizeOnRouteChange) this.minimize();
    },
  },
  mounted() {
    window.addEventListener("resize", this.onResize);
    // 父组件可能一上来就是打开的（比如直接定位到带浮窗的页面），
    // 此时 value 从 true 变 true，watcher 不会触发，得在挂载时自己居中，
    // 否则会停在 data() 里的初始 offset（屏幕左上角）。
    if (this.value) this.$nextTick(this.center);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.onResize);
    this.endDrag();
    this.endResize();
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
  },
  methods: {
    readBounds() {
      this.bounds = measureBounds(this.boundsSelector);
      this.dragBounds = measureViewport();
    },
    /** 展开态在可用区域里水平垂直居中（按缩放后的视觉尺寸算） */
    center() {
      this.readBounds();
      const width = this.width * this.scale;
      const height = this.expandedHeight * this.scale;
      this.offset = {
        left: this.clamp(
          Math.round(this.bounds.left + (this.bounds.width - width) / 2),
          width
        ),
        top: this.clamp(
          Math.round(this.bounds.top + (this.bounds.height - height) / 2),
          height
        ),
      };
    },
    /** 最小化态停靠右下角，之后仍可被拖走 */
    dockToCorner() {
      this.readBounds();
      const miniWidth = this.miniWidth * this.scale;
      const miniHeight = MINI_HEIGHT * this.scale;
      this.offset = {
        left: this.clamp(
          this.bounds.left + this.bounds.width - miniWidth - EDGE_GAP,
          miniWidth
        ),
        top: this.clamp(
          this.bounds.top + this.bounds.height - miniHeight - EDGE_GAP - 40,
          miniHeight
        ),
      };
    },
    minimize() {
      this.endDrag();
      this.minimized = true;
      this.dockToCorner();
    },
    /** 放大：和初次打开一样飞回页面中间 */
    restore() {
      if (!this.minimized) return;
      // minimized 和 offset 一起改，同一批渲染才会从 mini 位置平滑飞到中间
      this.minimized = false;
      this.center();
    },
    /** 缩小版的点击入口：刚才是拖拽就不要误触发放大 */
    restoreFromMini() {
      if (this.dragMoved) {
        this.dragMoved = false;
        return;
      }
      this.restore();
    },
    toggleMinimize() {
      if (this.minimized) {
        this.restore();
      } else {
        this.minimize();
      }
    },
    beginDrag(event) {
      if (event.button !== 0) return;

      const panel = this.$refs.panel;
      if (!panel) return;

      const rect = panel.getBoundingClientRect();
      this.dragState = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        startX: event.clientX,
        startY: event.clientY,
      };
      this.dragMoved = false;
      this.offset = { left: rect.left, top: rect.top };
      this.dragging = true;

      document.addEventListener("mousemove", this.onDrag);
      document.addEventListener("mouseup", this.endDrag);
      event.preventDefault();
    },
    onDrag(event) {
      const panel = this.$refs.panel;
      if (!panel || !this.dragState) return;

      const movedX = event.clientX - this.dragState.startX;
      const movedY = event.clientY - this.dragState.startY;
      if (Math.abs(movedX) > DRAG_THRESHOLD || Math.abs(movedY) > DRAG_THRESHOLD) {
        this.dragMoved = true;
      }

      //面板被 transform 缩放过，offsetWidth 是布局尺寸，边界必须按视觉尺寸算
      const rect = panel.getBoundingClientRect();
      this.offset = {
        left: this.clamp(event.clientX - this.dragState.offsetX, rect.width),
        top: this.clamp(event.clientY - this.dragState.offsetY, rect.height),
      };
    },
    /**
     * 限制在整个视口内，而不是内容区。
     * 内容区左边有侧边栏、上边有固定顶栏，用它当边界会让缩小后再放大的浮窗
     * 拖不到侧边栏和顶栏上面，表现为上和左有两道边距。
     * 上下左右都允许贴到屏幕边缘，否则左上角会留一条缝。
     */
    clamp(value, panelSize) {
      const min = this.dragBounds.left + DRAG_EDGE;
      const max = Math.max(
        min,
        this.dragBounds.left + this.dragBounds.width - panelSize - DRAG_EDGE
      );
      return Math.min(Math.max(min, value), max);
    },
    clampOffset() {
      const panel = this.$refs.panel;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      this.offset = {
        left: this.clamp(this.offset.left, rect.width),
        top: this.clamp(this.offset.top, rect.height),
      };
    },
    endDrag() {
      this.dragging = false;
      this.dragState = null;
      document.removeEventListener("mousemove", this.onDrag);
      document.removeEventListener("mouseup", this.endDrag);
    },
    /**
     * 右下角手柄：整体等比缩放（transform: scale）。
     * 面板 transform-origin 是 top left，缩放时左上角纹丝不动，
     * 所以把手柄方向向量（左上角 → 右下角）和鼠标位移做投影就能得到缩放比，
     * 光标始终贴着手柄走。上限按视口算，避免缩放后拖出屏幕外。
     */
    beginResize(event) {
      if (event.button !== 0) return;
      const panel = this.$refs.panel;
      if (!panel) return;

      this.readBounds();
      const rect = panel.getBoundingClientRect();
      const baseWidth = rect.width / (this.scale || 1);
      const baseHeight = rect.height / (this.scale || 1);
      const anchorX = rect.left;
      const anchorY = rect.top;
      const pad = 24;
      const maxScale = Math.min(
        2,
        (this.dragBounds.width - pad - anchorX) / baseWidth,
        (this.dragBounds.height - pad - anchorY) / baseHeight
      );

      this.resizeState = {
        anchorX,
        anchorY,
        vx: baseWidth,
        vy: baseHeight,
        denom: baseWidth * baseWidth + baseHeight * baseHeight,
        minScale: 0.5,
        // 面板贴着屏幕边缘时算出来的上限可能小于 0.5，兜底保证区间合法
        maxScale: Math.max(0.5, maxScale),
      };
      document.addEventListener("mousemove", this.onResizeMove);
      document.addEventListener("mouseup", this.endResize);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "nwse-resize";
    },
    onResizeMove(event) {
      const state = this.resizeState;
      if (!state) return;
      const ux = event.clientX - state.anchorX;
      const uy = event.clientY - state.anchorY;
      const scale = (ux * state.vx + uy * state.vy) / state.denom;
      const clamped = Math.min(state.maxScale, Math.max(state.minScale, scale));
      this.scale = Math.round(clamped * 100) / 100;
    },
    endResize() {
      if (!this.resizeState) return;
      this.resizeState = null;
      document.removeEventListener("mousemove", this.onResizeMove);
      document.removeEventListener("mouseup", this.endResize);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    },
    resetScale() {
      this.scale = 1;
    },
    onResize() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.readBounds();
        // 拖拽中只收回可用区域，松手后再决定是否重新居中
        if (this.dragging) return this.clampOffset();
        // 缩放拖拽中面板位置本就不动，交给人来决定缩放完要不要挪
        if (this.resizeState) return undefined;
        this.minimized ? this.dockToCorner() : this.center();
        return undefined;
      }, RESIZE_THROTTLE);
    },
    handleClose() {
      this.$emit("input", false);
      this.$emit("close");
    },
  },
};
</script>

<style scoped lang="scss">
.float-panel {
  position: fixed;
  z-index: 1900;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
  // border: 1px solid #e6e9f2;
  border-radius: 16px;
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.18),
    0 2px 8px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  // 等比缩放以左上角为锚点，left/top 才能继续直接当视觉坐标用
  transform-origin: top left;
  // 展开/最小化之间位置与尺寸都是确定值，可以直接过渡出移动动画
  transition:
    left 0.32s cubic-bezier(0.4, 0, 0.2, 1),
    top 0.32s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.32s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.32s cubic-bezier(0.4, 0, 0.2, 1),
    border-radius 0.32s ease,
    box-shadow 0.32s ease;

  &.dragging {
    // 拖拽时必须关掉过渡，否则面板会追着鼠标「拖尾」
    transition: none;
    cursor: move;
    user-select: none;
  }

  &.minimized {
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  }

  // 深色「语音房」主题：夜间紫 + 品红 + 冰蓝的氛围光
  &.theme-dark {
    background:
      radial-gradient(1100px 540px at 12% -8%, rgba(124, 58, 237, 0.45), transparent 60%),
      radial-gradient(820px 500px at 108% 6%, rgba(217, 70, 239, 0.28), transparent 55%),
      radial-gradient(680px 420px at 60% 120%, rgba(34, 211, 238, 0.12), transparent 60%),
      linear-gradient(165deg, #171236 0%, #221a52 52%, #130e30 100%);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow:
      0 30px 70px rgba(8, 5, 28, 0.6),
      0 2px 12px rgba(8, 5, 28, 0.45),
      inset 0 0 0 1px rgba(255, 255, 255, 0.04);

    &.minimized {
      box-shadow:
        0 14px 40px rgba(8, 5, 28, 0.6),
        0 0 0 1px rgba(167, 139, 250, 0.35),
        0 0 24px rgba(124, 58, 237, 0.35);
    }

    .float-panel-header {
      background: linear-gradient(
        90deg,
        rgba(124, 58, 237, 0.22),
        rgba(217, 70, 239, 0.1) 55%,
        rgba(34, 211, 238, 0.08)
      );
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: none;
    }

    .float-panel-title {
      color: #f4edff;

      &::before {
        color: #c4b5fd;
      }
    }

    .float-panel-actions i {
      color: rgba(255, 255, 255, 0.72);

      &:hover {
        color: #fff;
        text-shadow: 0 0 8px rgba(196, 181, 253, 0.8);
      }
    }

    .float-panel-resize-grip::before,
    .float-panel-resize-grip::after {
      border-color: rgba(255, 255, 255, 0.5);
    }
  }
}

.float-panel-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 46px;
  padding: 0 14px 0 18px;
  background: linear-gradient(120deg, #4f46e5 0%, #7c3aed 55%, #2563eb 100%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.12) inset;
  cursor: move;
  user-select: none;
}

.float-panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "\e76f";
    font-family: "element-icons";
    font-size: 15px;
    opacity: 0.9;
  }
}

.float-panel-actions {
  display: flex;
  align-items: center;
  gap: 14px;

  i {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    transition: color 0.2s, transform 0.2s;

    &:hover {
      color: #fff;
      transform: scale(1.12);
    }
  }
}

.float-panel-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}

.float-panel-mini {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  cursor: move;
}

/* 右下角等比缩放手柄（双击恢复原始大小） */
.float-panel-resize-grip {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 16px;
  height: 16px;
  z-index: 6;
  cursor: nwse-resize;
  opacity: 0.45;
  transition: opacity 0.2s;
  user-select: none;

  &:hover {
    opacity: 1;
  }

  &::before,
  &::after {
    content: "";
    position: absolute;
    border-right: 2px solid #64748b;
    border-bottom: 2px solid #64748b;
  }

  &::before {
    right: 1px;
    bottom: 1px;
    width: 12px;
    height: 12px;
  }

  &::after {
    right: 7px;
    bottom: 7px;
    width: 4px;
    height: 4px;
  }
}

.float-panel-fade-enter-active,
.float-panel-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.float-panel-fade-enter,
.float-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
