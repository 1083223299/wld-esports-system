/**
 * 日期时间工具函数
 */

/**
 * 获取今天的开始和结束时间
 * @returns {Object} {start, end}
 */
export function getTodayRange() {
	const start = new Date()
	start.setHours(0, 0, 0, 0)

	const end = new Date()
	end.setHours(23, 59, 59, 999)

	return {
		start: formatDateTime(start),
		end: formatDateTime(end)
	}
}

/**
 * 获取昨天的开始和结束时间
 * @returns {Object} {start, end}
 */
export function getYesterdayRange() {
	const start = new Date()
	start.setDate(start.getDate() - 1)
	start.setHours(0, 0, 0, 0)

	const end = new Date()
	end.setDate(end.getDate() - 1)
	end.setHours(23, 59, 59, 999)

	return {
		start: formatDateTime(start),
		end: formatDateTime(end)
	}
}

/**
 * 获取最近N天的开始和结束时间
 * @param {number} days - 天数
 * @returns {Object} {start, end}
 */
export function getLastNDaysRange(days) {
	const start = new Date()
	start.setDate(start.getDate() - (days - 1))
	start.setHours(0, 0, 0, 0)

	const end = new Date()
	end.setHours(23, 59, 59, 999)

	return {
		start: formatDateTime(start),
		end: formatDateTime(end)
	}
}

/**
 * 获取本月的开始和结束时间
 * @returns {Object} {start, end}
 */
export function getThisMonthRange() {
	const start = new Date()
	start.setDate(1)
	start.setHours(0, 0, 0, 0)

	const end = new Date()
	end.setMonth(end.getMonth() + 1, 0)
	end.setHours(23, 59, 59, 999)

	return {
		start: formatDateTime(start),
		end: formatDateTime(end)
	}
}

/**
 * 获取上月的开始和结束时间
 * @returns {Object} {start, end}
 */
export function getLastMonthRange() {
	const start = new Date()
	start.setMonth(start.getMonth() - 1, 1)
	start.setHours(0, 0, 0, 0)

	const end = new Date()
	end.setDate(0) // 上月最后一天
	end.setHours(23, 59, 59, 999)

	return {
		start: formatDateTime(start),
		end: formatDateTime(end)
	}
}

/**
 * 获取本年的开始和结束时间
 * @returns {Object} {start, end}
 */
export function getThisYearRange() {
	const start = new Date()
	start.setMonth(0, 1)
	start.setHours(0, 0, 0, 0)

	const end = new Date()
	end.setMonth(11, 31)
	end.setHours(23, 59, 59, 999)

	return {
		start: formatDateTime(start),
		end: formatDateTime(end)
	}
}

/**
 * 格式化日期时间为字符串
 * @param {Date} date - 日期对象
 * @param {string} format - 格式，默认 'yyyy-MM-dd HH:mm:ss'
 * @returns {string}
 */
export function formatDateTime(date, format = 'yyyy-MM-dd HH:mm:ss') {
	if (!date) return ''

	const pad = n => n.toString().padStart(2, '0')

	const year = date.getFullYear()
	const month = pad(date.getMonth() + 1)
	const day = pad(date.getDate())
	const hour = pad(date.getHours())
	const minute = pad(date.getMinutes())
	const second = pad(date.getSeconds())

	return format
		.replace('yyyy', year)
		.replace('MM', month)
		.replace('dd', day)
		.replace('HH', hour)
		.replace('mm', minute)
		.replace('ss', second)
}

/**
 * 获取默认的快捷时间选项
 * @returns {Array} 快捷选项数组
 */
export function getDefaultDateShortcuts() {
	return [
		{ label: '今天', value: 'today' },
		{ label: '昨天', value: 'yesterday' },
		{ label: '最近7天', value: 'last7days' },
		{ label: '最近30天', value: 'last30days' },
		{ label: '本月', value: 'thisMonth' },
		{ label: '上月', value: 'lastMonth' },
		{ label: '今年', value: 'thisYear' }
	]
}

/**
 * 获取自定义快捷时间选项
 * @param {Array} customOptions - 自定义选项
 * @returns {Array} 合并后的快捷选项
 */
export function getCustomDateShortcuts(customOptions = []) {
	const defaults = getDefaultDateShortcuts()
	return [...defaults, ...customOptions]
}

/**
 * 根据快捷值获取时间范围
 * @param {string} shortcut - 快捷值
 * @returns {Object} {start, end}
 */
export function getRangeByShortcut(shortcut) {
	switch (shortcut) {
		case 'today':
			return getTodayRange()
		case 'yesterday':
			return getYesterdayRange()
		case 'last7days':
			return getLastNDaysRange(7)
		case 'last30days':
			return getLastNDaysRange(30)
		case 'thisMonth':
			return getThisMonthRange()
		case 'lastMonth':
			return getLastMonthRange()
		case 'thisYear':
			return getThisYearRange()
		default:
			// 处理自定义格式，如 last15days
			if (shortcut.startsWith('last') && shortcut.endsWith('days')) {
				const days = parseInt(shortcut.replace('last', '').replace('days', ''))
				if (!isNaN(days)) {
					return getLastNDaysRange(days)
				}
			}
			return { start: '', end: '' }
	}
}