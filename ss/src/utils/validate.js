/**
 * @param {string} path
 * @returns {Boolean}
 */
/**
 * 判断路径是否为外部链接
 * @param {string} path - 需要检查的路径
 * @returns {boolean} 如果路径是外部链接则返回true，否则返回false
 */
export function isExternal(path) {
  // 使用正则表达式测试路径是否以 http:、https:、mailto: 或 tel: 开头
  return /^(https?:|mailto:|tel:)/.test(path)
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
/**
 * 验证用户名是否有效
 * @param {string} str - 需要验证的用户名字符串
 * @returns {boolean} - 如果用户名有效返回true，否则返回false
 */
export function validUsername(str) {
  // 定义有效的用户名列表
  const valid_map = ['admin', 'editor']
  // 检查输入的用户名（去除首尾空格后）是否存在于有效用户名列表中
  // indexOf()方法如果找到匹配项会返回索引值（>=0），找不到则返回-1
  return valid_map.indexOf(str.trim()) >= 0
}
