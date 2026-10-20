import store from '@/store'

/**
 * 检查是否有权限
 * @param {string|Array} permission - 权限标识，可以是字符串或数组
 * @returns {boolean} 是否有权限
 */
export function checkPermission(permission) {
    const permissions = store.getters && store.getters.permissions

    if (!permissions || permissions.length === 0) {
        return false
    }

    // 超级管理员（拥有 *:*:* 权限）直接返回 true
    if (permissions.includes('*:*:*')) {
        return true
    }

    if (typeof permission === 'string') {
        return permissions.includes(permission)
    }

    if (permission instanceof Array && permission.length > 0) {
        return permission.some(perm => permissions.includes(perm))
    }

    return false
}

/**
 * 检查是否有所有权限（必须全部满足）
 * @param {Array} permissions - 权限标识数组
 * @returns {boolean} 是否拥有所有权限
 */
export function checkAllPermissions(permissions) {
    const userPermissions = store.getters && store.getters.permissions

    if (!userPermissions || userPermissions.length === 0) {
        return false
    }

    // 超级管理员直接返回 true
    if (userPermissions.includes('*:*:*')) {
        return true
    }

    return permissions.every(perm => userPermissions.includes(perm))
}

export default checkPermission