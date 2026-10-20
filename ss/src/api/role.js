import request from '@/utils/request'

export function getRoleList(params) {
    return request({
        url: '/system-v1/role/list',
        method: 'get',
        params
    })
}

export function getRole(roleId) {
    return request({
        url: '/system-v1/role/' + roleId,
        method: 'get'
    })
}

export function postRoleAdd(data) {
    return request({
        url: '/system-v1/role',
        method: 'post',
        data
    })
}

export function putRoleEdit(data) {
    return request({
        url: '/system-v1/role',
        method: 'put',
        data
    })
}

export function deleteRole(data) {
    return request({
        url: '/system-v1/role/' + data,
        method: 'delete'
    })
}

export function putRoleStatus(data) {
    return request({
        url: '/system-v1/role/changeStatus',
        method: 'put',
        data
    })
}

export function dataScope(data) {
    return request({
        url: '/system-v1/role/dataScope',
        method: 'put',
        data
    })
}

export function changeRoleStatus(roleId, status) {
    const data = {
        roleId,
        status
    }
    return request({
        url: '/system-v1/role/changeStatus',
        method: 'put',
        data
    })
}

export function getRoleMenuTreeselect(roleId) {
    return request({
        url: '/system-v1/menu/roleMenuTreeselect/' + roleId,
        method: 'get'
    })
}

export function getRoleDeptTree(roleId) {
    return request({
        url: '/system-v1/role/deptTree/' + roleId,
        method: 'get'
    })
}

export function authRole(data) {
    return request({
        url: '/system-v1/role/authRole',
        method: 'put',
        data
    })
}

export function allocatedUserList(query) {
    return request({
        url: '/system-v1/role/authUser/allocatedList',
        method: 'get',
        params: query
    })
}

export function unallocatedUserList(query) {
    return request({
        url: '/system-v1/role/authUser/unallocatedList',
        method: 'get',
        params: query
    })
}

export function authUserCancel(data) {
    return request({
        url: '/system-v1/role/authUser/cancel',
        method: 'put',
        data
    })
}

export function authUserCancelAll(data) {
    return request({
        url: '/system-v1/role/authUser/cancelAll',
        method: 'put',
        params: data
    })
}

export function authUserSelectAll(data) {
    return request({
        url: '/system-v1/role/authUser/selectAll',
        method: 'put',
        params: data
    })
}
