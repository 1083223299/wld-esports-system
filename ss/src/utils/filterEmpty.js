/**
 * 过滤对象中的空值
 * @param {Object} obj - 需要过滤的对象
 * @param {Object} options - 配置选项
 * @param {boolean} options.filterEmptyString - 是否过滤空字符串，默认 true
 * @param {boolean} options.filterNull - 是否过滤 null，默认 true
 * @param {boolean} options.filterUndefined - 是否过滤 undefined，默认 true
 * @param {boolean} options.filterEmptyArray - 是否过滤空数组，默认 true
 * @param {boolean} options.filterEmptyObject - 是否过滤空对象，默认 true
 * @param {Array} options.keepKeys - 需要保留的键名（即使值为空也保留）
 * @returns {Object} 过滤后的对象
 */
export function filterEmptyFields(obj, options = {}) {
  const {
    filterEmptyString = true,
    filterNull = true,
    filterUndefined = true,
    filterEmptyArray = true,
    filterEmptyObject = true,
    keepKeys = []
  } = options;

  if (!obj || typeof obj !== 'object') return obj;

  const result = {};
  
  for (const key in obj) {
    const value = obj[key];
    
    // 检查是否需要保留该字段（即使值为空）
    const shouldKeep = keepKeys.includes(key);
    
    // 判断是否为空值
    let isEmpty = false;
    
    // 1. 检查 undefined
    if (filterUndefined && value === undefined) {
      isEmpty = true;
    }
    // 2. 检查 null
    else if (filterNull && value === null) {
      isEmpty = true;
    }
    // 3. 检查空字符串
    else if (filterEmptyString && value === '') {
      isEmpty = true;
    }
    // 4. 检查空数组
    else if (filterEmptyArray && Array.isArray(value) && value.length === 0) {
      isEmpty = true;
    }
    // 5. 检查空对象
    else if (filterEmptyObject && typeof value === 'object' && !Array.isArray(value) && value !== null) {
      if (Object.keys(value).length === 0) {
        isEmpty = true;
      }
    }
    
    // 如果不是空值或者需要保留，则添加到结果中
    if (!isEmpty || shouldKeep) {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * 深度过滤对象中的空值（递归处理嵌套对象）
 * @param {Object} obj - 需要过滤的对象
 * @param {Object} options - 配置选项
 * @returns {Object} 过滤后的对象
 */
export function deepFilterEmptyFields(obj, options = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const filtered = filterEmptyFields(obj, options);
  
  // 递归处理嵌套对象
  for (const key in filtered) {
    const value = filtered[key];
    if (value && typeof value === 'object') {
      filtered[key] = deepFilterEmptyFields(value, options);
    }
  }
  
  return filtered;
}

export default {
  filterEmptyFields,
  deepFilterEmptyFields
};