import request from '@/utils/request'

// 分页查询敏感词
export function getSensitiveWords(data) {
    return request({
        url: `/business/community/sensitive-word/page`,
        method: "post",
        data
    });
}
// 新增敏感词
export function addSensitiveWord(data) {
    return request({
        url: `/business/community/sensitive-word/create`,
        method: "post",
        data
    });
}
// 编辑敏感词
export function editSensitiveWord(data) {
    return request({
        url: `/business/community/sensitive-word/update`,
        method: "post",
        data
    });
}
// 删除敏感词
export function deleteSensitiveWord(data) {
    return request({
        url: `/business/community/sensitive-word/delete`,
        method: "post",
        data
    });
}
// 启停敏感词状态
export function updateSensitiveWordStatus(data) {
    return request({
        url: `/business/community/sensitive-word/change-status`,
        method: "post",
        data
    });
}
// 批量删除敏感词
export function batchDeleteSensitiveWords(data) {
    return request({
        url: `/business/community/sensitive-word/batch-delete`,
        method: "post",
        data
    });
}

// 分页查询举报类型
export function getReportTypes(data) {
    return request({
        url: `/business/community/report-type/page`,
        method: "post",
        data
    });
}

// 新增举报类型
export function addReportType(data) {
    return request({
        url: `/business/community/report-type/create`,
        method: "post",
        data
    });
}
// 编辑举报类型
export function editReportType(data) {
    return request({
        url: `/business/community/report-type/update`,
        method: "post",
        data
    });
}
// 启停举报类型状态
export function updateReportTypeStatus(data) {
    return request({
        url: `/business/community/report-type/change-status`,
        method: "post",
        data
    });
}
// 删除举报类型
export function deleteReportType(data) {
    return request({
        url: `/business/community/report-type/delete`,
        method: "post",
        data
    });
}

// 批量删除举报类型
export function batchDeleteReportTypes(data) {
    return request({
        url: `/business/community/report-type/batch-delete`,
        method: "post",
        data
    });
}
// 分页查询话题分类
export function getTopicCategories(data) {
    return request({
        url: `/business/community/topic-category/page`,
        method: "post",
        data
    });
}
// 新增话题分类
export function addTopicCategory(data) {
    return request({
        url: `/business/community/topic-category/create`,
        method: "post",
        data
    });
}
// 编辑话题分类
export function editTopicCategory(data) {
    return request({
        url: `/business/community/topic-category/update`,
        method: "post",
        data
    });
}
// 启停话题分类状态
export function updateTopicCategoryStatus(data) {
    return request({
        url: `/business/community/topic-category/change-status`,
        method: "post",
        data
    });
}
// 删除话题分类
export function deleteTopicCategory(data) {
    return request({
        url: `/business/community/topic-category/delete`,
        method: "post",
        data
    });
}
// 批量删除话题分类
export function batchDeleteTopicCategories(data) {
    return request({
        url: `/business/community/topic-category/batch-delete`,
        method: "post",
        data
    });
}
// 分页查询社区音乐
export function getCommunityMusicPage(data) {
    return request({
        url: `/business/community/music/page`,
        method: "post",
        data
    });
}
// 查询社区音乐详情
export function getCommunityMusicDetail(data) {
    return request({
        url: `/business/community/music/detail`,
        method: "post",
        data
    });
}
// 新增社区音乐
export function addCommunityMusic(data) {
    return request({
        url: `/business/community/music/create`,
        method: "post",
        data
    });
}
// 修改社区音乐
export function updateCommunityMusic(data) {
    return request({
        url: `/business/community/music/update`,
        method: "post",
        data
    });
}
// 启用或停用社区音乐
export function changeCommunityMusicStatus(data) {
    return request({
        url: `/business/community/music/change-status`,
        method: "post",
        data
    });
}

// 分页查询话题

export function getTopics(data) {
    return request({
        url: `/business/community/topic/page`,
        method: "post",
        data
    });
}
// 新增话题
export function addTopic(data) {
    return request({
        url: `/business/community/topic/create`,
        method: "post",
        data
    });
}
// 编辑话题
export function editTopic(data) {
    return request({
        url: `/business/community/topic/update`,
        method: "post",
        data
    });
}
// 启停话题状态
export function updateTopicStatus(data) {
    return request({
        url: `/business/community/topic/change-status`,
        method: "post",
        data
    });
}
// 删除话题
export function deleteTopic(data) {
    return request({
        url: `/business/community/topic/delete`,
        method: "post",
        data
    });
}
// 批量删除话题
export function batchDeleteTopics(data) {
    return request({
        url: `/business/community/topic/batch-delete`,
        method: "post",
        data
    });
}
// 分页查询话题机审队列
export function getTopicReviewMachinePage(data) {
    return request({
        url: `/business/community/topic-review/machine-page`,
        method: "post",
        data
    });
}
// 分页查询话题人工复审队列
export function getTopicReviewManualPage(data) {
    return request({
        url: `/business/community/topic-review/manual-page`,
        method: "post",
        data
    });
}
// 分页查询话题已处理列表
export function getTopicReviewProcessedPage(data) {
    return request({
        url: `/business/community/topic-review/processed-page`,
        method: "post",
        data
    });
}
// 查询待人工复审话题数量
export function getTopicReviewPendingCount(data) {
    return request({
        url: `/business/community/topic-review/pending-count`,
        method: "post",
        data
    });
}
// 查询话题复审详情
export function getTopicReviewDetail(data) {
    return request({
        url: `/business/community/topic-review/detail`,
        method: "post",
        data
    });
}
// 提交话题人工复审结果
export function auditTopicReview(data) {
    return request({
        url: `/business/community/topic-review/audit`,
        method: "post",
        data
    });
}
// 查询社区规范详情
export function getRuleDetail(data) {
    return request({
        url: `/business/community/rule/detail`,
        method: "post",
        data
    });
}
// 更新社区规范
export function updateRule(data) {
    return request({
        url: `/business/community/rule/update`,
        method: "post",
        data
    });
}

// 分页查询违规帖子审核记录
export function getPostReviews(data) {
    return request({
        url: `/business/community/post-review/page`,
        method: "post",
        data
    });
}
// 查询违规帖子审核记录详情
export function getPostReviewDetail(data) {
    return request({
        url: `/business/community/post-review/detail`,
        method: "post",
        data
    });
}

// 审核违规帖子
export function auditPostReview(data) {
    return request({
        url: `/business/community/post-review/audit`,
        method: "post",
        data
    });
}

// 分页查询帖子列表
export function getPostManages(data) {
    return request({
        url: `/business/community/post-manage/page`,
        method: "post",
        data
    });
}

// 查询帖子巡检详情
export function getPostManageDetail(data) {
    return request({
        url: `/business/community/post-manage/detail`,
        method: "post",
        data
    });
}

// 巡检帖子下架
export function patrolPost(data) {
    return request({
        url: `/business/community/post-manage/patrol`,
        method: "post",
        data
    });
}

// 设置帖子为精帖
export function setFeaturedPost(data) {
    return request({
        url: `/business/community/post-manage/set-featured`,
        method: "post",
        data
    });
}
// 取消帖子精帖
export function cancelFeaturedPost(data) {
    return request({
        url: `/business/community/post-manage/cancel-featured`,
        method: "post",
        data
    });
}

// 分页查询举报中心工单
export function getPostReports(data) {
    return request({
        url: `/business/community/report/page`,
        method: "post",
        data
    });
}
// 查询举报中心工单详情
export function getPostReportDetail(data) {
    return request({
        url: `/business/community/report/detail`,
        method: "post",
        data
    });
}

// 审核举报中心工单
export function auditPostReport(data) {
    return request({
        url: `/business/community/report/audit`,
        method: "post",
        data
    });
}
// 恢复举报中心工单
export function restorePostReport(data) {
    return request({
        url: `/business/community/report/restore`,
        method: "post",
        data
    });
}

// 分页查询评论列表
export function getCommentManages(data) {
    return request({
        url: `/business/community/comment-manage/page`,
        method: "post",
        data
    });
}
// 查询评论详情
export function getCommentManageDetail(data) {
    return request({
        url: `/business/community/comment-manage/detail`,
        method: "post",
        data
    });
}
// 巡检评论下架
export function patrolComment(data) {
    return request({
        url: `/business/community/comment-manage/patrol`,
        method: "post",
        data
    });
}

// 取消评论神评论
export function cancelCommentFeatured(data) {
    return request({
        url: `/business/community/comment-manage/god-cancel`,
        method: "post",
        data
    });
}

// 查询推荐配置详情
export function getRecommendationConfigDetail(data) {
    return request({
        url: `/business/community/recommendation-config/detail`,
        method: "post",
        data
    });
}

// 保存推荐配置
export function saveRecommendationConfig(data) {
    return request({
        url: `/business/community/recommendation-config/save`,
        method: "post",
        data
    });
}
// 重置推荐配置为默认值
export function resetRecommendationConfigToDefault(data) {
    return request({
        url: `/business/community/recommendation-config/reset-default`,
        method: "post",
        data
    });
}

// 查询帖子热度配置详情
export function getTopicHeatConfigDetail(data) {
    return request({
        url: `/business/community/topic/heat-config/detail`,
        method: "post",
        data
    });
}

// 保存帖子热度配置
export function saveTopicHeatConfig(data) {
    return request({
        url: `/business/community/topic/heat-config/save`,
        method: "post",
        data
    });
}

// 重置帖子热度配置为默认值
export function resetTopicHeatConfigToDefault(data) {
    return request({
        url: `/business/community/topic/heat-config/reset-default`,
        method: "post",
        data
    });
}
