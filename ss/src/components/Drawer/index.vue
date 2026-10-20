<template>
    <div class="drawer-container" v-show="visible">
        <!-- 遮罩层 -->
        <!-- <div class="drawer-mask" @click="closeDrawer"></div> -->

        <!-- 抽屉内容 -->
        <div class="drawer-wrapper" :class="{ 'drawer-visible': visible }">
            <!-- 抽屉头部 -->
            <div class="drawer-header">
                <div class="header-left" @click="goBack">
                    <i class="el-icon-arrow-left"></i>
                    <div class="drawer-title">{{ title }}</div>
                </div>
            </div>

            <!-- 抽屉内容区域 -->
            <div class="drawer-body">
                <slot></slot>
            </div>
            <!-- <div class="drawer-footer">
                <el-button type="primary" class="Search-Button"
                    :style="{ backgroundColor: '#6A35FF', borderColor: '#6A35FF' }" @click="handleSearch">
                    确定
                </el-button>
                <el-button class="Reset-Button" @click="handleReset">
                    取消
                </el-button>
            </div> -->
        </div>
    </div>
</template>

<script>
export default {
    name: 'DrawerComponent',
    props: {
        // 是否显示抽屉
        visible: {
            type: Boolean,
            default: false
        },
        // 抽屉标题
        title: {
            type: String,
            default: '新增'
        },
        // 是否显示遮罩层
        showMask: {
            type: Boolean,
            default: true
        },
        // 点击遮罩层是否可以关闭
        maskClosable: {
            type: Boolean,
            default: true
        },
        // 抽屉宽度
        width: {
            type: String,
            default: '80%'
        }
    },
    methods: {
        // 返回/关闭抽屉
        goBack() {
            this.$emit('close');
        },

        // 关闭抽屉
        closeDrawer() {
            if (this.maskClosable) {
                this.$emit('close');
            }
        },

        // 阻止事件冒泡
        handleWrapperClick(e) {
            e.stopPropagation();
        }
    }
}
</script>

<style scoped>
.drawer-container {
    position: fixed;
    top: 100px;
    left: 278px;
    right: 20px;
    bottom: 30px;
    height: calc(100vh - 130px);
    background-color: #FFFFFF;
    border-radius: 24px;
    z-index: 2000;
}

.drawer-wrapper {
    height: 100%;
    width: 100%;
    background: #fff;
    z-index: 2002;
    transition: right 0.3s ease-in-out;
    display: flex;
    flex-direction: column;
    border-radius: 24px;
    padding: 0 32px 32px;
}

.drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    padding: 20px 0 20px;
}

.header-left {
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: 8px;
}

.header-left i {
    font-size: 16px;
    font-weight: 700;
    color: #666;
    transition: color 0.3s;
}

.header-left:hover i {
    color: #9047F8;
}

.header-left .drawer-title {
    font-size: 16px;
    color: #000000;
    line-height: 22px;
    font-weight: 700;
}

.header-close {
    font-size: 20px;
    color: #999;
    cursor: pointer;
    transition: color 0.3s;
}

.header-close:hover {
    color: #9047F8;
}

.drawer-body {
    flex: 1;
    overflow-y: auto;
    background: #fff;
}

.drawer-footer {
    padding: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.el-button {
    width: 120px;
    height: 40px;
    border-radius: 8px !important;
    padding: 0 !important;
    line-height: 40px;
    text-align: center;
}

.Reset-Button {
    background-color: #F2F3F5;
}

/* 动画效果 */
@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

/* 响应式设计 */
@media (max-width: 768px) {
    .drawer-wrapper {
        width: 100% !important;
    }
}
</style>