import defaultSettings from '@/settings'

const title = defaultSettings.title || '未来洞'

/**
 * 获取页面标题函数
 * @param {string} pageTitle - 页面标题
 * @returns {string} - 返回处理后的页面标题
 */
export default function getPageTitle(pageTitle) {
  if (pageTitle) { // 判断是否传入pageTitle参数
    return `${pageTitle} - ${title}` // 如果有传入，则返回"pageTitle - title"格式
  }
  return `${title}` // 如果没有传入，则返回默认title
}
