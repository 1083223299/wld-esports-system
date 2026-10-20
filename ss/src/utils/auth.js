import Cookies from 'js-cookie'

const TokenKey = 'vue_admin_getToken'

/**
 * 获取存储的认证令牌
 * @returns {string|null} 返回存储的令牌，如果不存在则返回null
 */
export function getToken() {
  // 从Cookies中获取名为TokenKey的值并返回
  return Cookies.get(TokenKey)
}

/**
 * 设置用户认证令牌的函数
 * @param {string} token - 需要设置的认证令牌
 * @returns {undefined} - 通过Cookies.set方法设置令牌，无返回值
 */
export function setToken(token) {
  return Cookies.set(TokenKey, token) // 使用Cookies.set方法将令牌存储到Cookie中，键为TokenKey
}

/**
 * 移除认证Token的函数
 * 该函数用于清除存储在Cookies中的认证信息
 * @returns {undefined} 无返回值
 */
export function removeToken() {
  return Cookies.remove(TokenKey) // 调用Cookies的remove方法，传入TokenKey作为参数来删除对应的Cookie
}
