<template>
  <div>
    <el-button type="primary" @click="dialogVisible = true">打开弹窗</el-button>
    
    <ProDialog
      title="用户详情"
      v-model="dialogVisible"
      width="600px"
      @confirm="handleDialogConfirm"
    >
      <div class="dialog-content">
        <p>用户名：张三</p>
        <p>手机号：<PhoneDisplay value="13800138000" /></p>
        <p>邮箱：zhangsan@example.com</p>
      </div>
      <!-- 自定义底部按钮 -->
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEdit">编辑</el-button>
      </template>
    </ProDialog>
  </div>
</template>

<script>
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";

export default {
  components: {
    PhoneDisplay,
  },
  data() {
    return {
      dialogVisible: false
    }
  },
  methods: {
    handleDialogConfirm() {
      this.$message.success('点击了确定按钮')
    },
    handleEdit() {
      this.$message.info('点击了编辑按钮')
      this.dialogVisible = false
    }
  }
}
</script>
