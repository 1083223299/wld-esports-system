// 导入Vuex的store实例，用于获取全局状态中当前用户的角色列表
// checkPermission，配合v-if使用，用于判断当前用户是否拥有指定的角色权限--> v-if="checkPermission(['admin'])"
import store from "@/store";

export function hasRole(roleKeys) {
  const keys = Array.isArray(roleKeys) ? roleKeys : [roleKeys];
  const roles = (store.getters && store.getters.roles) || [];
  if (!Array.isArray(roles) || !keys.length) return false;
  return roles.some((role) => {
    if (typeof role === "string") return keys.includes(role);
    return !!(role && keys.includes(role.roleKey));
  });
}

export function isGuildRole() {
  return hasRole(["guild", "laborunion"]);
}

/**
 * 角色权限检查核心函数：判断当前用户是否拥有指定的角色权限
 * @param {Array} value - 需要校验的权限角色列表（如['admin', 'editor']）
 * @returns {Boolean} 有权限返回true，无权限/参数错误返回false
 * @example 用法参考：@/views/orderFlow/edit.vue
 */
export default function checkPermission(value) {
  // 校验入参：必须是**非空数组**（传入了具体的权限角色）
  if (value && value instanceof Array && value.length > 0) {
    return hasRole(value);
  } else {
    // 入参格式错误时，在控制台抛出明确的错误提示，方便开发调试
    console.error(`need roles! Like v-permission="['superadmin','editor']"`);
    // 入参错误时，默认返回无权限
    return false;
  }
}
