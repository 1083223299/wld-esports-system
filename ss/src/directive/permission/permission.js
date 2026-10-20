// 导入Vuex的store实例，用于获取全局状态中的用户权限
import store from '@/store'

/**
 * 权限检查核心方法：判断用户是否拥有指定权限
 * @param {Array|string} permissionValue - 指令绑定的权限标识（可以是字符串或数组）
 * @returns {Boolean} 是否有权限
 */
function hasPermission(permissionValue) {
  const permissions = store.getters && store.getters.permissions

  if (!permissions || permissions.length === 0) {
    return false
  }

  // 超级管理员（拥有 *:*:* 权限）直接返回 true
  if (permissions.includes('*:*:*')) {
    return true
  }

  // 字符串权限
  if (typeof permissionValue === 'string') {
    return permissions.includes(permissionValue)
  }

  // 数组权限（满足其中一个即可）
  if (permissionValue instanceof Array && permissionValue.length > 0) {
    return permissionValue.some(perm => permissions.includes(perm))
  }

  return false
}

/**
 * 处理单个元素的权限
 * @param {HTMLElement} el - 绑定指令的DOM元素
 * @param {Array|string} permissionValue - 权限标识
 */
function handleSingleElement(el, permissionValue) {
  if (!hasPermission(permissionValue)) {
    el.parentNode && el.parentNode.removeChild(el)
  }
}

/**
 * 处理父元素的权限（批量控制子元素）
 * @param {HTMLElement} parentEl - 绑定指令的父元素
 * @param {Array|string} permissionValue - 权限标识
 */
function handleParentElement(parentEl, permissionValue) {
  if (!hasPermission(permissionValue)) {
    parentEl.style.display = 'none'
  } else {
    parentEl.style.display = ''
  }
}

/**
 * 权限检查入口方法
 * @param {HTMLElement} el - 绑定了指令的DOM元素
 * @param {Object} binding - Vue指令的绑定对象
 */
function checkPermission(el, binding) {
  const { value } = binding

  // 校验绑定值格式
  if (!value) {
    throw new Error(`需要指定权限标识，例如 v-permission="'system:user:add'" 或 v-permission="['system:user:add', 'system:user:edit']"`)
  }

  // 支持字符串和数组两种格式
  if (typeof value !== 'string' && !(value instanceof Array)) {
    throw new Error(`权限标识必须是字符串或数组，例如 v-permission="'system:user:add'" 或 v-permission="['system:user:add', 'system:user:edit']"`)
  }

  // 判断是否为父元素（有子元素即视为父元素）
  const isParentElement = el.children && el.children.length > 0

  if (isParentElement) {
    handleParentElement(el, value)
  } else {
    handleSingleElement(el, value)
  }
}

// 导出Vue自定义指令对象
export default {
  inserted(el, binding) {
    checkPermission(el, binding)
  },
  update(el, binding) {
    if (JSON.stringify(binding.oldValue) !== JSON.stringify(binding.value)) {
      checkPermission(el, binding)
    }
  }
}