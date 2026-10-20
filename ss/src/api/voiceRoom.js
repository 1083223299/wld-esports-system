import request from '@/utils/request'

/**
 * 分页查询语音房列表
 * 权限：voice-room:room:list
 * @param {Object} data
 * @param {number} [data.pageNum] - 当前页数
 * @param {number} [data.pageSize] - 分页大小
 * @param {number} [data.roomId] - 语音房ID（精确）
 * @param {number} [data.ownerUserId] - 房主用户ID（精确）
 * @param {string} [data.ownerKeyword] - 房主昵称或手机号（模糊）
 * @param {string} [data.orderId] - 关联订单ID（精确）
 * @param {string} [data.status] - 房间状态：0进行中、1已解散、2已结束、3已封禁
 * @param {string} [data.createTimeBegin] - 创建时间起
 * @param {string} [data.createTimeEnd] - 创建时间止
 * @param {Object} [config] - axios 请求配置（如轮询场景传 silentError 抑制 toast）
 * @returns {Promise<{ total: number, rows: Array<Object> }>}
 */
export function pageVoiceRoom(data, config = {}) {
    return request({
        url: '/business/voice-room/room/page',
        method: 'post',
        data,
        ...config
    })
}

/**
 * 查看当前在线成员（最多返回8条，不分页）
 * 权限：voice-room:room:member
 * @param {Object} data
 * @param {number} data.roomId - 语音房ID
 * @returns {Promise<{ roomId: number, onlineCount: number, members: Array<Object> }>}
 */
export function getVoiceRoomMemberList(data) {
    return request({
        url: '/business/voice-room/room/member-list',
        method: 'post',
        data
    })
}

/**
 * 巡查领取进房凭证（仅进行中房间可巡查）
 * 权限：voice-room:room:patrol
 * @param {Object} data
 * @param {number} data.roomId - 语音房ID
 * @returns {Promise<{ roomId: number, trtcRoomId: string, sdkAppId: number, trtcUserId: string, userSig: string, userSigExpireSeconds: number, onlineCount: number, tipMessage: string }>}
 */
export function getVoiceRoomPatrolCredential(data) {
    return request({
        url: '/business/voice-room/room/patrol-credential',
        method: 'post',
        data
    })
}

/**
 * 复制语音房分享口令
 * 权限：voice-room:room:invite-code
 * @param {Object} data
 * @param {number} data.roomId - 语音房ID
 * @returns {Promise<{ roomId: number, inviteCode: string, shareText: string }>}
 */
export function getVoiceRoomInviteCode(data) {
    return request({
        url: '/business/voice-room/room/invite-code',
        method: 'post',
        data
    })
}

/**
 * 巡查封禁勾选用户（针对人，不是封房间）
 * 弹窗字段与后台账号禁用一致：禁用类型、天数、账号范围、原因、备注、附件。
 * 对勾选用户批量：踢出当前语音房 + 调用统一账号禁用，房间状态与邀请码不受影响
 * 权限：voice-room:room:ban
 * @param {Object} data
 * @param {number} data.roomId - 语音房ID
 * @param {Array<number>} data.userIds - 勾选要封禁的用户ID列表
 * @param {number} [data.banType] - 封禁类型：0临时封禁、1永久封禁，默认永久
 * @param {number} [data.banDays] - 临时封禁天数，临时封禁时必填
 * @param {number} [data.banScope] - 禁用账号范围：0仅当前账号、1同身份证下所有账号
 * @param {string} [data.banReason] - 封禁原因
 * @param {string} [data.remark] - 备注，选填，最多50字
 * @param {string} [data.businessFile] - 上传附件，逗号分隔（图片/录音/视频），最多5组
 * @returns {Promise<{ roomId: number, status: string, statusName: string, onlineCount: number, bannedUserIds: Array<number> }>}
 */
export function banVoiceRoom(data) {
    return request({
        url: '/business/voice-room/room/ban',
        method: 'post',
        data
    })
}
