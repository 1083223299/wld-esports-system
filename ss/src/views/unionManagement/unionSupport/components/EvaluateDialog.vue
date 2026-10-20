<template>
  <el-drawer
    :visible="visible"
    size="500px"
    direction="rtl"
    wrapper-closable
    custom-class="evaluate-drawer"
    v-loading="loading"
    @close="handleClose"
  >
    <div class="evaluate-content">
      <div class="drawer-header">
        <div class="header-top">
          <div class="dialog-header">
            <span class="dialog-title">{{ userName || '' }}评价（{{ total }}）</span>
          </div>
          <div class="evaluate-header" v-if="total > 0">
            <div class="evaluate-score">
              <span class="score-text">{{ evaluateScore.toFixed(2) }}</span>
              <el-rate
                v-model="evaluateScore"
                disabled
                size="small"
                show-score
                :score-template="''"
                text-color="#FFB800"
                class="evaluate-stars"
              ></el-rate>
            </div>
          </div>
        </div>
      </div>
      
      <div class="comments-container">
        <div v-if="commentList && commentList.length > 0" class="evaluate-comments">
          <div v-for="comment in commentList" :key="comment.postId" class="comment-item">
            <div class="comment-header">
              <img v-if="comment.avatarUrl" :src="comment.avatarUrl" alt="用户头像" class="comment-avatar" @error="(e) => handleImgError(e)"/>
              <img v-else src="@/assets/defaulIcon.png" alt="用户头像" class="comment-avatar" />
              <div class="comment-avatar-wrapper">
                <div class="comment-user">
                  <div class="comment-meta">
                    <span class="username">{{ comment.nickName }}<span v-show="comment.anonymous === 1">(匿名)</span></span>
                    <span class="time game-stars">发布于{{ comment.createTime || '半小时' }}</span>
                  </div>
                  <div class="comment-meta">
                    <span class="game-type">{{ comment.goodName }}/{{ comment.priceParameters }}</span>
                    <div class="game-stars">
                      <el-rate
                        v-model="comment.level"
                        disabled
                        size="small"
                        text-color="#FFB800"
                      ></el-rate>
                    </div>
                  </div>
                  <div class="comment-content">{{ comment.title }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Empty v-else text="暂无评价数据"></Empty>
      </div>
    </div>
    <div v-if="total > 0" class="pagination-wrapper">
      <PaginationSimple
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        @current-change="handlePageChange"
      ></PaginationSimple>
    </div>
    <div class="drawer-footer">
      <el-button type="primary" class="drawer-button" style="border: none; width: 25%;display: block;margin: auto;" @click="handleClose">确定</el-button>
    </div>
  </el-drawer>
</template>

<script>
import PaginationSimple from "@/components/PaginationSimple/index.vue";

export default {
  name: "EvaluateDrawer",
  components: {
    PaginationSimple
  },
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    visible: {
      type: Boolean,
      required: true,
      default: false,
    },
    userName: {
      type: String,
      default: "",
    },
    total: {
      type: Number,
      default: 0,
    },
    evaluateScore: {
      type: Number,
      default: 0,
    },
    commentList: {
      type: Array,
      default: () => [],
    },
    currentPage: {
      type: Number,
      default: 1,
    },
    pageSize: {
      type: Number,
      default: 10,
    },
  },
  methods: {
    // 处理图片加载失败（损坏/404/跨域等）
    handleImgError(e) {
      // 替换为默认头像的绝对/相对路径，和你v-else里的路径保持一致
      e.target.src = require('@/assets/defaulIcon.png')
      // 【可选】防止个别情况图片死循环加载（比如默认图也丢了）
      e.target.onerror = null
    },
    handleClose() {
      this.$emit("close");
    },
    handlePageChange(page) {
      this.$emit("page-change", page);
    },
  },
};
</script>

<style scoped lang="scss">
.evaluate-drawer {
  .el-drawer__body{
    overflow: scroll !important;
  }
  .el-drawer__header {
    margin-bottom: 0;
    padding: 0;
  }
  
  .el-drawer__body {
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}

.evaluate-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  // overflow: scroll;
  // margin-bottom: 80px;
}

.drawer-header {
  padding: 20px 10px 20px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header {
  display: flex;
  align-items: center;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.evaluate-header {
  display: flex;
  align-items: center;
}

.evaluate-score {
  display: flex;
  align-items: center;
}

.score-text {
  font-size: 18px;
  font-weight: 600;
  color: #ffb800;
  margin-right: 8px;
}

.comments-container {
  flex: 1;
  // overflow-y: auto;
  padding: 12px 5px 0 16px;
  display: flex;
  flex-direction: column;
  position: relative;
  margin-bottom: 106px;
  overflow-y: scroll;
}

.evaluate-comments {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
  // margin-bottom: 53px;
}

.comment-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.comment-header {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
}

.comment-avatar-wrapper {
  flex: 1;
  min-width: 0;
}

.comment-user {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.comment-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 14px;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #333;

  span {
    font-size: 12px;
    color: #333;
    margin-left: 4px;
  }
}

.time {
  font-size: 12px;
  color: #909399;
}

.game-type {
  font-size: 12px;
  color: #909399;
  flex: 1;
}

.game-stars {
  display: flex;
  align-items: center;
  min-width: 100px;
}

.comment-content {
  font-size: 14px;
  color: #86909C;
  line-height: 1.5;
  margin-top: 8px;
  font-size: 12px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  flex-direction: column;
}

.pagination-wrapper {
  // margin-top: 20px;
  // padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
  position: absolute;
  bottom: 58px;
  left: 0;
  right: 0;
  background: #fff;
  padding-right: 32px;
}

.drawer-footer {
  padding: 10px 20px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
  flex-shrink: 0;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

@media (max-width: 768px) {
  ::v-deep.evaluate-drawer {
    width: 100% !important;
    max-width: 95%;
  }
  
  .drawer-header {
    padding: 16px 16px 12px;
  }
  
  .comments-container {
    padding: 12px 16px 0 16px;
  }
  
  .header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .dialog-title {
    font-size: 16px;
  }
  
  .comment-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .game-stars {
    min-width: auto;
    width: 100%;
    justify-content: flex-end;
  }
  
  .drawer-footer {
    padding: 16px;
  }
}
// .drawer-button:hover {
//   background-color: #1aad77!important;
//   color: #fff;
// }
.empty-img {
  width: 38%;
  height: 38%;
  object-fit: cover;
}
</style>