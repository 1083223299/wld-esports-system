/**
 * 将时间解析为字符串格式
 * @param {(Object|string|number)} time - 要解析的时间（支持Date对象、时间字符串、时间戳）
 * @param {string} cFormat - 自定义输出格式，默认值为 '{y}-{m}-{d} {h}:{i}:{s}'
 * @returns {string | null} 解析后的时间字符串，入参无效时返回null
 */
export function parseTime(time, cFormat) {
  if (arguments.length === 0 || !time) {
    return null
  }
  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    if ((typeof time === 'string')) {
      if ((/^[0-9]+$/.test(time))) {
        // 支持处理纯数字字符串格式的时间戳，例如 "1548221490638"
        time = parseInt(time)
      } else {
        // 兼容safari浏览器的时间格式
        // 参考链接：https://stackoverflow.com/questions/4310953/invalid-date-in-safari
        time = time.replace(new RegExp(/-/gm), '/')
      }
    }

    if ((typeof time === 'number') && (time.toString().length === 10)) {
      // 处理10位时间戳（秒级），转换为13位时间戳（毫秒级）
      time = time * 1000
    }
    date = new Date(time)
  }
  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay()
  }
  const time_str = format.replace(/{([ymdhisa])+}/g, (result, key) => {
    const value = formatObj[key]
    // 注意：getDay() 方法返回0表示周日
    if (key === 'a') { return ['日', '一', '二', '三', '四', '五', '六'][value] }
    return value.toString().padStart(2, '0')
  })
  return time_str
}

/**
 * 格式化时间为相对时间或指定格式
 * @param {number} time - 时间戳（支持10位/13位）
 * @param {string} option - 自定义格式字符串，传此参数则返回指定格式的时间，否则返回相对时间
 * @returns {string} 格式化后的时间字符串（如"刚刚"、"10分钟前"、"3月5日14时20分"等）
 */
export function formatTime(time, option) {
  if (('' + time).length === 10) {
    // 处理10位时间戳（秒级），转换为13位时间戳（毫秒级）
    time = parseInt(time) * 1000
  } else {
    time = +time
  }
  const d = new Date(time)
  const now = Date.now()

  const diff = (now - d) / 1000

  if (diff < 30) {
    return '刚刚'
  } else if (diff < 3600) {
    // 小于1小时
    return Math.ceil(diff / 60) + '分钟前'
  } else if (diff < 3600 * 24) {
    return Math.ceil(diff / 3600) + '小时前'
  } else if (diff < 3600 * 24 * 2) {
    return '1天前'
  }
  if (option) {
    return parseTime(time, option)
  } else {
    return (
      d.getMonth() +
      1 +
      '月' +
      d.getDate() +
      '日' +
      d.getHours() +
      '时' +
      d.getMinutes() +
      '分'
    )
  }
}

/**
 * 解析搜索 ID，避免 Number() 对大整数四舍五入导致精度丢失
 * @param {string|number|null|undefined} value
 * @returns {{ valid: boolean, value: string|null }}
 */
export function parseSearchId(value) {
  if (value === null || value === undefined) {
    return { valid: true, value: null }
  }
  const str = String(value).trim()
  if (!str) {
    return { valid: true, value: null }
  }
  if (!/^\d+$/.test(str)) {
    return { valid: false, value: null }
  }
  return { valid: true, value: str }
}

/**
 * 将合法搜索 ID 写入请求参数
 * @param {Object} params
 * @param {string} key
 * @param {string|number|null|undefined} value
 * @returns {boolean} 是否合法；格式非法时返回 false
 */
export function assignSearchId(params, key, value) {
  const parsed = parseSearchId(value)
  if (!parsed.valid) {
    return false
  }
  if (parsed.value !== null) {
    params[key] = parsed.value
  }
  return true
}

/**
 * 将URL参数解析为对象
 * @param {string} url - 带参数的URL地址
 * @returns {Object} 解析后的参数对象，无参数时返回空对象
 */
export function param2Obj(url) {
  const search = decodeURIComponent(url.split('?')[1]).replace(/\+/g, ' ')
  if (!search) {
    return {}
  }
  const obj = {}
  const searchArr = search.split('&')
  searchArr.forEach(v => {
    const index = v.indexOf('=')
    if (index !== -1) {
      const name = v.substring(0, index)
      const val = v.substring(index + 1, v.length)
      obj[name] = val
    }
  })
  return obj
}



/**
 * 构造树型结构数据
 * @param {Array} data 数据源
 * @param {string} id id字段 默认 'id'
 * @param {string} parentId 父节点字段 默认 'parentId'
 * @param {string} children 子节点字段 默认 'children'
 * @returns {Array} 树型结构数据
 */
export  function handleTree(data, id = 'id', parentId = 'parentId', children = 'children') {
  const tree = [];
  const map = {};
  // 建立映射表
  data.forEach(item => {
    map[item[id]] = { ...item, [children]: [] };
  });


  // 构建树形结构
  data.forEach(item => {
    const parent = map[item[parentId]];
    if (parent) {
      parent[children].push(map[item[id]]);
    } else {
      tree.push(map[item[id]]);
    }
  });

  return tree;
}

export function MenuhandleTree(data, id = 'id', parentId = 'parentId', children = 'children') {
  const tree = [];
  const map = {};
  
  // 建立映射表
  data.forEach(item => {
    map[item[id]] = { ...item, [children]: [] };
  });

  // 构建树形结构
  data.forEach(item => {
    const parent = map[item[parentId]];
    if (parent) {
      parent[children].push(map[item[id]]);
    } else {
      tree.push(map[item[id]]);
    }
  });

  // 添加层级和缩进值
  const addLevelAndIndent = (nodes, level = 0, indent = 0) => {
    nodes.forEach(node => {
      node.level = level;
      node.indent = indent;  // 缩进值
      
      if (node[children] && node[children].length > 0) {
        // 根据当前节点类型计算子节点的缩进
        let childIndent = indent;
        if (node.menuType === 'M') {
          // 目录下的子节点缩进增加 20px
          childIndent = indent + 20;
        } else if (node.menuType === 'C') {
          // 菜单下的子节点缩进增加 20px
          childIndent = indent + 20;
        } else {
          // 其他情况
          childIndent = indent + 20;
        }
        addLevelAndIndent(node[children], level + 1, childIndent);
      }
    });
  };
  addLevelAndIndent(tree, 0, 0);
  
  return tree;
}