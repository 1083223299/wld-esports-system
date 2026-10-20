<template>
  <div>
    <!-- 侧边栏展开状态：原有核心渲染逻辑，控制菜单项/子菜单的显示 -->
    <div v-if="!item.hidden && !isRootPath(item.path) && shouldShowMenuItem">
      <!-- 无下级子菜单：渲染普通菜单项（带路由跳转） -->
      <template v-if="!hasChildren(item)">
        <AppLink v-if="item.meta" :to="resolvePath(item.path)">
          <el-menu-item 
            :index="resolvePath(item.path, true)" 
            :class="{ 'submenu-title-noDropdown': !isNest }"
          >
            <!-- 菜单图标+标题子组件 -->
            <Item :icon="item.meta.icon" :title="item.meta.title" />
            <span v-if="effectiveUnread > 0" class="message-center-trigger__badge">
              {{ badgeCount }}
            </span>
            <!-- <el-badge v-if="badgeCount > 0" :value="badgeCount" :max="99" class="menu-badge" /> -->
          </el-menu-item>
        </AppLink>
      </template>
      <!-- 有可见下级子菜单：渲染折叠子菜单（el-submenu） -->
      <el-submenu 
        v-else-if="hasVisibleChildren" 
        ref="subMenu" 
        :index="resolvePath(item.path, true)"
        popper-append-to-body
      >
        <template slot="title">
          <!-- 子菜单标题栏：图标+标题 -->
          <Item v-if="item.meta" :icon="item.meta.icon" :title="item.meta.title" />
        </template>
        <!-- 递归渲染子菜单：自身组件循环调用，实现无限级菜单 -->
        <sidebar-item 
          v-for="child in visibleChildren" 
          :key="child.path" 
          :is-nest="true" 
          :item="child"
          :base-path="resolvePath(item.path)" 
          class="nest-menu"  
        />
      </el-submenu>
    </div>
    <!-- 根路径特殊处理：路径为/时，直接递归渲染子菜单（不显示自身，仅作为容器） -->
    <template v-if="isRootPath(item.path) && hasChildren(item)">
      <sidebar-item 
        v-for="child in visibleChildren" 
        :key="child.path" 
        :is-nest="isNest" 
        :item="child"
        :base-path="resolvePath(item.path)" 
        :class="{ 'nest-menu': isNest }"  
      />
    </template>
  </div>
  <!-- 侧边栏收起状态：核心新增逻辑（暂注释，后续可结合折叠状态v-show/v-if开启） -->
  <!-- <div v-else class="sidebar-collapse-item">
    收起状态DOM：仅显示图标，悬浮弹出子菜单气泡
  </div> -->
</template>

<script>
// 导入vuex辅助函数：将store中的getter映射为组件计算属性
import { mapGetters } from 'vuex'
// 导入node路径处理模块：用于解析/拼接路由路径
import path from 'path'
// 导入外部链接校验工具：判断路径是否为http/https等外部链接
import { isExternal } from '@/utils/validate'
// 导入菜单图标+标题子组件
import Item from './Item'
// 导入路由跳转链接组件（兼容外部链接/内部路由）
import AppLink from './Link'
// 导入iOS侧边栏兼容混合模块（解决iOS端的菜单滑动/点击bug）
import FixiOSBug from './FixiOSBug'

export default {
  // 组件名：用于递归自身（必须定义，否则递归报错）
  name: 'SidebarItem',
  // 注册子组件
  components: { Item, AppLink },
  // 混入兼容模块：复用iOS端的bug修复逻辑
  mixins: [FixiOSBug],
  // 接收父组件传递的props参数
  props: {
    // 单个菜单配置项（路由对象，必传）：包含path/meta/children/hidden等属性
    item: {
      type: Object,
      required: true
    },
    // 是否为嵌套子菜单：用于控制菜单项样式，默认false
    isNest: {
      type: Boolean,
      default: false
    },
    // 基础路径：用于拼接子菜单的完整路径，默认空字符串
    basePath: {
      type: String,
      default: ''
    }
  },
  // 计算属性：基于props/数据动态推导，缓存结果（依赖变化自动更新）
  computed: {
    // 引入全局菜单角标映射
    ...mapGetters(['menuBadges']),
    // 当前叶子菜单的角标数量（按完整路由路径匹配，仅需要角标的菜单配置对应路径）
    badgeCount() {
      return Number((this.menuBadges || {})[this.resolvePath(this.item.path, true)] || 0) > 99 ? '99+' : Number((this.menuBadges || {})[this.resolvePath(this.item.path, true)] || 0)
    },
    effectiveUnread() {
      return Number((this.menuBadges || {})[this.resolvePath(this.item.path, true)] || 0)
    },
    /**
     * 过滤后的可见子菜单列表：排除隐藏（hidden: true）的子菜单
     * @returns {Array} 可见子菜单数组
     */
    visibleChildren() {
      // 无children或非数组，返回空数组
      if (!this.item.children || !Array.isArray(this.item.children)) {
        return []
      }
      // 过滤掉hidden为true的子菜单
      return this.item.children.filter(child => !child.hidden)
    },
    /**
     * 是否有可见子菜单：简化判断逻辑，避免重复计算
     * @returns {Boolean} 有则返回true，无则false
     */
    hasVisibleChildren() {
      return this.visibleChildren.length > 0
    },
    /**
     * 是否应该显示当前菜单项：处理“有子菜单但全隐藏”的情况
     * @returns {Boolean} 应该显示则true，否则false
     */
    shouldShowMenuItem() {
      // 有子菜单时，判断是否存在可见子菜单
      if (this.item.children && Array.isArray(this.item.children)) {
        const hasVisibleChildren = this.item.children.some(child => !child.hidden)
        // 子菜单全隐藏，则当前菜单项也不显示
        if (!hasVisibleChildren) {
          return false
        }
      }
      // 无子女单/有可见子菜单，正常显示
      return true
    }
  },
  // 方法：定义组件的业务逻辑方法
  methods: {
    /**
     * 判断是否为根路径：用于根路径（/）的特殊渲染逻辑
     * @param {String} path - 待判断的菜单路径
     * @returns {Boolean} 是根路径则true，否则false
     */
    isRootPath(path) {
      // 外部链接直接返回false
      if (isExternal(path)) return false
      // 路径为/或去除空格后为/，判定为根路径
      return path === '/' || path.trim() === '/'
    },
    /**
     * 判断当前菜单是否有子菜单（含可见性/强制显示判断）
     * @param {Object} menuItem - 单个菜单配置项
     * @returns {Boolean} 有子菜单则true，否则false
     */
    hasChildren(menuItem) {
      // alwaysShow为true：强制判定有子菜单（即使子菜单全隐藏，用于保持菜单展开状态）
      if (menuItem.alwaysShow) {
        return true
      }
      // 有children且为数组，过滤后有可见子菜单，判定为有子菜单
      if (menuItem.children && Array.isArray(menuItem.children)) {
        const visibleChildren = menuItem.children.filter(child => !child.hidden)
        return visibleChildren.length > 0
      }
      // 无children/无可见子菜单，判定为无子菜单
      return false
    },
    /**
     * 解析菜单路径：拼接基础路径、处理外部链接、格式化路径（去重斜杠），适配el-menu的index属性
     * @param {String} routePath - 菜单原始路径
     * @param {Boolean} forMenuIndex - 是否为el-menu的index属性解析（特殊格式化），默认false
     * @returns {String} 解析后的完整路径/外部链接
     */
    resolvePath(routePath, forMenuIndex = false) {
      // 外部链接：直接返回原路径（不做拼接处理）
      if (isExternal(routePath)) {
        return routePath
      }
      // 基础路径为外部链接：直接返回基础路径（防止拼接错误）
      if (isExternal(this.basePath)) {
        return this.basePath
      }
      // 为el-menu的index解析路径：需特殊格式化（去重斜杠，保证index唯一）
      if (forMenuIndex) {
        // 路径以/开头：直接返回（已是绝对路径）
        if (routePath.startsWith('/')) {
          return routePath
        }
        // 拼接基础路径和当前路径，生成绝对路径
        const fullPath = path.resolve(this.basePath, routePath)
        // 正则替换：将多个连续斜杠替换为单个（如//a//b -> /a/b），排除协议后的//（如https://）
        return fullPath.replace(/([^:])\/\/+/g, '$1/')
      }
      // 非index解析：普通路径拼接
      if (routePath.startsWith('/')) {
        return routePath
      }
      // 拼接基础路径和当前路径，返回绝对路径
      return path.resolve(this.basePath, routePath)
    }
  }
}
</script>

<!-- 作用域样式：scoped保证样式仅作用于当前组件，:deep()穿透修改element-ui内置样式 -->
<style scoped>
/* 收起状态：菜单项外层容器（统一布局、宽高适配收起后的侧边栏） */
.sidebar-collapse-item {
  display: flex;
  flex-direction: column; /* 垂直布局 */
  align-items: center; /* 内容水平居中 */
  width: 64px; /* 与收起后的侧边栏宽度一致，可根据项目调整 */
  padding: 8px 0; /* 上下内边距，优化间距 */
  cursor: pointer; /* 鼠标手型，标识可点击 */
}

/* 收起状态：单个菜单项容器（仅显示图标，圆形背景） */
.collapse-menu-item {
  width: 48px;
  height: 48px;
  border-radius: 8px; /* 圆角，美化图标容器 */
  display: flex;
  align-items: center; /* 图标垂直居中 */
  justify-content: center; /* 图标水平居中 */
  transition: background-color 0.2s; /* 背景色过渡动画，优化悬浮体验 */
}

/* 收起状态：图标容器悬浮样式（高亮背景，提升交互反馈） */
.collapse-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 收起状态：根路径触发容器（占位，避免根路径无图标时无法悬浮触发子菜单） */
.root-collapse-trigger {
  width: 48px;
  height: 48px;
}

/* 菜单角标：右对齐，垂直居中 */
.menu-badge {
  float: right;
  margin-top: 12px;
}

/* 收起状态：多级子菜单气泡容器（控制最大高度、滚动，避免气泡过高） */
.collapse-submenu-container {
  max-height: 600px; /* 最大高度，超出滚动 */
  overflow-y: auto; /* 垂直滚动 */
  overflow-x: hidden; /* 隐藏水平滚动 */
}

/* 收起状态：气泡内的子菜单样式（取消默认边框，添加阴影，美化） */
.collapse-submenu {
  min-width: 200px; /* 气泡最小宽度，保证内容显示 */
  border: none !important; /* 取消element-ui默认边框 */
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1) !important; /* 自定义阴影，提升层次感 */
}

/* 穿透修改：气泡内普通菜单项样式（调整内边距、圆角，解决hover重叠） */
/* ::v-deep.el-menu-item {
  padding-left: 20px !important; 
  border-radius: 4px !important; 
} */

/* 穿透修改：气泡内子菜单标题样式（调整内边距，与普通菜单项对齐） */
/* ::v-deep.el-submenu__title {
  padding-left: 20px !important;
} */

/* 收起状态：滚动条美化（可选，隐藏默认滚动条，自定义样式） */
.collapse-submenu-container::-webkit-scrollbar {
  width: 4px; /* 滚动条宽度 */
}
/* 滚动条滑块样式 */
.collapse-submenu-container::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2); /* 滑块背景色 */
  border-radius: 2px; /* 滑块圆角 */
}
.message-center-trigger__badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 4;
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 1px solid #fff;
  border-radius: 50%;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 12px;
  /* background: linear-gradient(135deg, #ff728f, #f04673);
  box-shadow: 0 4px 9px rgba(240, 70, 115, 0.3); */
}
</style>
