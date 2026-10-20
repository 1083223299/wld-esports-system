import request from '@/utils/request'

export function listClient(params) {
    return request({
        url: '/system-v1/client/list',
        method: 'get',
        params
    })
}

export function getClient(clientId) {
    return request({
        url: '/system-v1/client/' + clientId,
        method: 'get'
    })
}

export function addClient(data) {
    return request({
        url: '/system-v1/client',
        method: 'post',
        data
    })
}

export function updateClient(data) {
    return request({
        url: '/system-v1/client',
        method: 'put',
        data
    })
}

export function delClient(clientId) {
    return request({
        url: '/system-v1/client/' + clientId,
        method: 'delete'
    })
}

export function updateClientStatus(data) {
    return request({
        url: '/system-v1/client/changeStatus',
        method: 'put',
        data
    })
}
