export default {
  // 计算属性：用于响应式获取设备类型
  computed: {
    device() {
      // 从Vuex状态管理中获取应用的设备类型
      return this.$store.state.app.device
    }
  },
  // 生命周期钩子：组件挂载完成后执行
  mounted() {
    // 修复iOS设备上点击菜单时会触发mouseleave（鼠标离开）事件的bug
    this.fixBugIniOS()
  },
  methods: {
    // 修复iOS设备上的菜单交互bug
    fixBugIniOS() {
      // 获取子菜单组件的引用（$refs.subMenu对应模板中的ref="subMenu"）
      const $subMenu = this.$refs.subMenu
      if ($subMenu) {
        // 缓存子菜单原有的mouseleave事件处理函数
        const handleMouseleave = $subMenu.handleMouseleave
        // 重写子菜单的mouseleave事件处理函数
        $subMenu.handleMouseleave = (e) => {
          // 如果当前设备是移动端（iOS），则直接返回，不执行原处理逻辑
          if (this.device === 'mobile') {
            return
          }
          // 如果是桌面端，正常执行原有的mouseleave事件逻辑
          handleMouseleave(e)
        }
      }
    }
  }
}