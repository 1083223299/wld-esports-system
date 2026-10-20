import request from '@/utils/request'

export function getUserList(params) {
    return request({
        url: '/system-v1/user/list',
        method: 'get',
        params
    })
}

export function getUser(userId) {
    return request({
        url: '/system-v1/user/' + userId,
        method: 'get'
    })
}

export function postUserAdd(data) {
    return request({
        url: '/system-v1/user',
        method: 'post',
        data
    })
}

export function putUserEdit(data) {
    return request({
        url: '/system-v1/user',
        method: 'put',
        data
    })
}

export function deleteUser(data) {
    return request({
        url: '/system-v1/user/' + data,
        method: 'delete'
    })
}

export function deleteUsers(data) {
    return request({
        url: '/system-v1/user/' + data,
        method: 'delete'
    })
}

export function putUserStatus(data) {
    return request({
        url: '/system-v1/user/changeStatus',
        method: 'put',
        data
    })
}

export function resetUserPassword(data) {
    return request({
        url: '/system-v1/user/resetPwd',
        method: 'put',
        data
    })
}

export function getUserProfile() {
    return request({
        url: '/system-v1/user/profile',
        method: 'get'
    })
}

export function updateUserProfile(data) {
    return request({
        url: '/system-v1/user/profile',
        method: 'put',
        data
    })
}

export function updateUserPwd(oldPassword, newPassword) {
    const data = {
        oldPassword,
        newPassword
    }
    return request({
        url: '/system-v1/user/profile/updatePwd',
        method: 'put',
        data
    })
}

export function getUserAvatar() {
    return request({
        url: '/system-v1/user/profile/avatar',
        method: 'get'
    })
}

export function updateUserAvatar(data) {
    return request({
        url: '/system-v1/user/profile/avatar',
        method: 'post',
        data: data
    })
}

export function exportUser(params) {
    return request({
        url: '/system-v1/user/export',
        method: 'get',
        params,
        responseType: 'blob'
    })
}

export function importUser(data) {
    return request({
        url: '/system-v1/user/importData',
        method: 'post',
        data: data,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

export function downloadTemplate() {
    return request({
        url: '/system-v1/user/importTemplate',
        method: 'get',
        responseType: 'blob'
    })
}

export function getDeptTree() {
    return request({
        url: '/system-v1/user/deptTree',
        method: 'get'
    })
}

export function getAuthRole(userId) {
    return request({
        url: '/system-v1/user/authRole/' + userId,
        method: 'get'
    })
}

export function updateAuthRole(params) {
    return request({
        url: '/system-v1/user/authRole',
        method: 'put',
        params: params
    })
}

export function getPostList() {
    return request({
        url: '/system-v1/post/list',
        method: 'get'
    })
}

export function getRoleListForUser() {
    return request({
        url: '/system-v1/role/list',
        method: 'get'
    })
}
