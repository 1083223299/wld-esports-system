import request from '@/utils/request'

export function listDept(params) {
  return request({
    url: '/system-v1/dept/list',
    method: 'get',
    params
  })
}

// 查询部门详细
export function getDept(deptId) {
  return request({
    url: '/system-v1/dept/' + deptId,
    method: 'get'
  })
}

export function treeselect() {
  return request({
    url: '/system-v1/dept/treeselect',
    method: 'get'
  })
}

// 新增部门
export function addDept(data) {
  return request({
    url: '/system-v1/dept',
    method: 'post',
    data
  })
}
// 修改部门
export function updateDept(data) {
  return request({
    url: '/system-v1/dept',
    method: 'put',
    data
  })
}

export function delDept(deptId) {
  return request({
    url: '/system-v1/dept/' + deptId,
    method: 'delete'
  })
}

/**
 * 查询当前部门的所有用户信息
 * @param deptId
 */
export function listUserByDeptId(deptId) {
  return request({
    url: '/system-v1/user/list/dept/' + deptId,
    method: 'get'
  })
}

// 查询部门列表（排除节点）
export function listDeptExcludeChild(deptId) {
  return request({
    url: '/system-v1/dept/list/exclude/' + deptId,
    method: 'get'
  });
}


