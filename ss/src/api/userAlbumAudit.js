import request from '@/utils/request'

/**
 * 查询用户相册审核列表
 */
export function listUserPhotoAlbum(data) {
    return request({
        url: '/business/user-photo-album/list',
        method: 'get',
        params: data
    })
}

/**
 * 审核用户相册
 * @param {string} photoId - 相册ID
 * @param {string} status - 1=已通过 4=审核拒绝
 * @param {string} reasonRejection - 拒绝原因
 */
export function updateUserPhotoAlbumStatus(data) {
    return request({
        url: '/business/user-photo-album/update-status',
        method: 'post',
        data
    })
}

/**
 * 删除已通过的相册
 * @param {string} photoId - 相册ID
 * @param {string} deleteReason - 删除原因
 */
export function deleteUserPhotoAlbum(data) {
    return request({
        url: '/business/user-photo-album/delete',
        method: 'post',
        data
    })
}
