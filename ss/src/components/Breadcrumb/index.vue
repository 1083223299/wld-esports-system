<template>
  <!-- 面包屑导航 + 侧边栏折叠按钮 组合组件 -->
  <div class="breadcrumb-container">
    <!-- 侧边栏折叠/展开按钮组件 -->
    <Hamburger :is-active="sidebar.opened" :page-title="pageTitle" class="hamburger-container"
      @toggleClick="toggleSideBar" />
    <!-- Element UI 面包屑组件，自定义类名，分隔符为 / -->
    <el-breadcrumb class="app-breadcrumb" separator="/">
      <!-- 过渡动画组，为面包屑项添加切换动画 -->
      <transition-group name="breadcrumb">
        <!-- 循环渲染面包屑层级列表 -->
        <el-breadcrumb-item v-for="(item, index) in levelList" :key="item.path">
          <!-- 最后一项 / 重定向为noRedirect的项：显示纯文本，不可点击 -->
          <span class="no-redirect">
            {{ item.meta.title }}
          </span>
          <!-- 可跳转的面包屑项：显示可点击链接 -->
          <!-- <a v-else @click.prevent="handleLink(item)">
            {{ item.meta.title }}
          </a> -->
        </el-breadcrumb-item>
      </transition-group>
    </el-breadcrumb>


  </div>
</template>

<script>
// 导入路径匹配工具库，用于编译带参数的路由路径
import { compile } from 'path-to-regexp'
// 导入侧边栏折叠按钮组件
import Hamburger from '@/components/Hamburger'
// 导入Vuex辅助函数，映射getters
import { mapGetters } from 'vuex'

export default {
  // 注册组件
  name: 'Breadcrumb',
  components: {
    Hamburger
  },
  // 计算属性：映射Vuex中的sidebar状态（侧边栏展开/折叠状态）
  computed: {
    ...mapGetters([
      'sidebar'
    ]),
    // 计算当前页面标题
    pageTitle() {
      if (this.levelList && this.levelList.length > 0) {
        const lastItem = this.levelList[this.levelList.length - 1]
        return lastItem.meta ? lastItem.meta.title : ''
      }
      return ''
    }
  },
  // 组件数据
  data() {
    return {
      // 面包屑层级列表，存储匹配到的路由层级
      levelList: []
    }
  },
  // 监听路由变化：路由改变时重新生成面包屑
  watch: {
    $route() {
      this.getBreadcrumb()
    }
  },
  // 组件创建时：初始化面包屑
  created() {
    this.getBreadcrumb()
  },
  // 方法定义
  methods: {
    /**
     * 触发侧边栏折叠/展开切换
     * 分发Vuex action来修改侧边栏状态
     */
    toggleSideBar() {
      this.$store.dispatch('app/toggleSideBar')
    },

    /**
     * 生成面包屑导航列表
     */
    getBreadcrumb() {
      // 过滤出包含meta.title的路由匹配项
      let matched = this.$route.matched.filter(item => item.meta && item.meta.title)

      // 获取第一个匹配的路由项
      const first = matched[0]

      // 如果第一个路由不是首页，则在面包屑开头添加首页
      if (!this.isDashboard(first)) {
        // 确保首页路由有正确的属性
        matched = [{
          path: '/dashboard',
          name: 'Dashboard',
          meta: { title: '首页' }
        }].concat(matched)
      }

      // 最终的面包屑列表：过滤掉meta.breadcrumb=false的路由项
      this.levelList = matched.filter(item =>
        item.meta &&
        item.meta.title &&
        item.meta.breadcrumb !== false
      )
    },

    /**
     * 判断当前路由是否为首页
     */
    isDashboard(route) {
      if (!route) return false
      const name = route.name
      const path = route.path

      if (name) {
        // 判断是否是首页相关的路由名称
        const dashboardNames = ['dashboard', 'Dashboard', '首页', 'home', 'Home']
        return dashboardNames.includes(name.toString())
      }

      if (path) {
        // 判断是否是首页相关的路径
        const dashboardPaths = ['/dashboard', '/home', '/']
        return dashboardPaths.includes(path)
      }

      return false
    },

    /**
     * 编译路由路径（处理带参数的路径）
     */
    pathCompile(path) {
      try {
        // 使用新的compile方法
        const toPath = compile(path)
        // 获取路由参数
        const { params } = this.$route

        // 处理参数，确保所有参数都是字符串类型
        const safeParams = {}
        Object.keys(params).forEach(key => {
          safeParams[key] = params[key] || ''
        })

        return toPath(safeParams)
      } catch (err) {
        console.warn('路径编译失败，使用原始路径:', path, err)
        return path
      }
    },

    /**
     * 处理面包屑项的点击事件
     */
    handleLink(item) {
      // 如果当前已经是这个路由，不进行跳转
      if (this.$route.path === item.path) {
        return
      }

      const { redirect, path } = item

      // 处理首页特殊逻辑
      if (this.isDashboard(item)) {
        this.$router.push('/dashboard')
        return
      }

      // 如果有redirect属性，直接跳转到redirect指定的路径
      if (redirect) {
        this.$router.push(redirect)
        return
      }

      // 检查路径是否包含参数（如 :id）
      if (path && path.includes(':')) {
        // 对于带参数的路径，使用编译后的路径
        const compiledPath = this.pathCompile(path)
        this.$router.push(compiledPath)
      } else {
        // 对于普通路径，直接跳转
        this.$router.push(path)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
// 面包屑组件样式
.app-breadcrumb.el-breadcrumb {
  display: inline-block; // 行内块级显示，与折叠按钮并排
  font-size: 14px; // 字体大小
  line-height: 20px; // 行高
  margin-left: 8px; // 左边距

  // 不可跳转的面包屑项样式
  .no-redirect {
    // color: #0C0214;        // 灰色文字
    cursor: text; // 文本光标，不可点击
  }
}

// 侧边栏折叠按钮容器样式
.hamburger-container {
  line-height: 0; // 行高
  height: 100%; // 高度100%
  cursor: pointer; // 手型光标
  transition: background .3s; // 背景色过渡动画
  -webkit-tap-highlight-color: transparent; // 去除移动端点击高亮
  padding-top: 4px;
  align-items: center;

  // 鼠标悬停效果
  &:hover {
    background: rgba(0, 0, 0, .025)
  }
}

.el-breadcrumb__inner a:hover {
  color: #409EFF;
}
</style>