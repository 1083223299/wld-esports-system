import request from '@/utils/request'

// 获取路由菜单
export function getRoutes() {
    return request({
        url: '/system-v1/menu/getRouters',
        method: 'get',
    })
}
export function getMenuList(params) {
    return request({
        url: '/system-v1/menu/list',
        method: 'get',
        params
    })
}

export function getMenu(menuId) {
    return request({
        url: '/system-v1/menu/' + menuId,
        method: 'get'
    })
}

export function postMenuAdd(data) {
    return request({
        url: '/system-v1/menu',
        method: 'post',
        data
    })
}

export function putMenuEdit(data) {
    return request({
        url: '/system-v1/menu',
        method: 'put',
        data
    })
}

export function deleteMenu(data) {
    return request({
        url: '/system-v1/menu/' + data,
        method: 'delete'
    })
}

export function getMenuTree(roleId) {
    return request({
        url: '/system-v1/menu/roleMenuTreeselect/' + roleId,
        method: 'get'
    })
}

export function getTreeselect() {
    return request({
        url: '/system-v1/menu/treeselect',
        method: 'get'
    })
}

export function getRoleMenuTreeselect(roleId) {
    return request({
        url: '/system-v1/menu/roleMenuTreeselect/' + roleId,
        method: 'get'
    })
}
