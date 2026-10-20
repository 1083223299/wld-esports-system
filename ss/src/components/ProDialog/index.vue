<!-- 弹窗 / 权限类核心组件 -->
<template>
  <el-dialog
    :title="title"
    :visible.sync="visible"
    :width="width"
    :top="top"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    @close="handleClose"
    class="pro-dialog"
    v-drag
  >
    <!-- 弹窗头部自定义 -->
    <div slot="title" class="dialog-title">
      <span>{{ title }}</span>
      <div class="dialog-tool">
        <i 
          class="el-icon-fullscreen" 
          @click="handleFullScreen" 
          v-if="showFullScreen"
        ></i>
      </div>
    </div>
    <!-- 弹窗主体插槽 -->
    <slot></slot>
    <!-- 弹窗底部自定义 -->
    <div slot="footer" class="dialog-footer" v-if="showFooter">
      <slot name="footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </slot>
    </div>
  </el-dialog>
</template>

<script>
// 自定义拖拽指令：实现弹窗拖拽功能
const drag = {
  bind(el) {
    // 找到弹窗头部元素
    const dialogHeader = el.querySelector('.el-dialog__header')
    if (!dialogHeader) return
    dialogHeader.style.cursor = 'move'
    
    // 鼠标按下事件
    dialogHeader.onmousedown = (e) => {
      // 计算鼠标相对弹窗头部的偏移量
      const disX = e.clientX - dialogHeader.offsetLeft
      const disY = e.clientY - dialogHeader.offsetTop
      // 获取弹窗元素
      const dialog = el.querySelector('.el-dialog')
      dialog.style.position = 'absolute'
      dialog.style.marginTop = '0'

      // 鼠标移动事件
      document.onmousemove = (e) => {
        // 计算弹窗新的位置
        const left = e.clientX - disX
        const top = e.clientY - disY
        // 限制弹窗不超出可视区域
        if (left > 0 && left < window.innerWidth - dialog.offsetWidth) {
          dialog.style.left = left + 'px'
        }
        if (top > 0 && top < window.innerHeight - dialog.offsetHeight) {
          dialog.style.top = top + 'px'
        }
      }

      // 鼠标松开事件：停止拖拽
      document.onmouseup = () => {
        document.onmousemove = null
        document.onmouseup = null
      }
    }
  }
}

export default {
  name: 'ProDialog',
  directives: { drag }, // 注册拖拽指令
  props: {
    // 弹窗标题
    title: {
      type: String,
      default: '提示'
    },
    // 弹窗显隐（v-model 绑定值）
    value: {
      type: Boolean,
      default: false
    },
    // 弹窗宽度
    width: {
      type: String,
      default: '50%'
    },
    // 弹窗距离顶部距离
    top: {
      type: String,
      default: '15vh'
    },
    // 是否显示全屏按钮
    showFullScreen: {
      type: Boolean,
      default: true
    },
    // 是否显示底部按钮栏
    showFooter: {
      type: Boolean,
      default: true
    },
    // 点击遮罩层是否关闭弹窗
    closeOnClickModal: {
      type: Boolean,
      default: true
    },
    // 按 ESC 键是否关闭弹窗
    closeOnPressEscape: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      visible: false, // 内部显隐状态
      isFullScreen: false // 是否全屏状态
    }
  },
  watch: {
    // 监听父组件传入的 v-model 值，同步到内部状态
    value: {
      immediate: true,
      handler(val) {
        this.visible = val
        // 全屏状态下关闭弹窗时，恢复原始宽度
        if (!val && this.isFullScreen) {
          this.isFullScreen = false
          this.$el.querySelector('.el-dialog').style.width = this.width
        }
      }
    },
    // 监听内部显隐状态，同步到父组件
    visible(val) {
      this.$emit('input', val)
    }
  },
  methods: {
    // 全屏切换
    handleFullScreen() {
      const dialog = this.$el.querySelector('.el-dialog')
      this.isFullScreen = !this.isFullScreen
      if (this.isFullScreen) {
        // 全屏：宽度占满可视区域
        dialog.style.width = '100vw'
        dialog.style.left = '0'
        dialog.style.top = '0'
        dialog.style.height = '100vh'
        dialog.style.margin = '0'
      } else {
        // 退出全屏：恢复原始宽度和位置
        dialog.style.width = this.width
        dialog.style.left = '50%'
        dialog.style.top = this.top
        dialog.style.height = 'auto'
        dialog.style.transform = 'translateX(-50%)'
      }
    },
    // 确定按钮点击事件
    handleConfirm() {
      this.$emit('confirm')
      this.visible = false
    },
    // 取消按钮点击事件
    handleCancel() {
      this.$emit('cancel')
      this.visible = false
    },
    // 弹窗关闭事件（无论哪种方式关闭，都会触发）
    handleClose() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped lang="scss">
.pro-dialog {
  .dialog-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    .dialog-tool {
      .el-icon-fullscreen {
        cursor: pointer;
        &:hover {
          color: #409eff;
        }
      }
    }
  }
  .dialog-footer {
    // text-align: center;
    .el-button {
      margin: 0 10px;
    }
    
  }
}
::v-deep .el-button{
  width: 102px!important;
  height: 34px!important;
  padding: 0;
}
</style>
