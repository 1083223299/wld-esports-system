<!-- 只有拥有 sys_user_add 权限的用户才能看到新增按钮 
基于按钮权限编码控制显隐 / 禁用，适配后台按钮级权限需求
<WldButton
  permission="sys_user_add"
  type="primary"
  icon="el-icon-plus"
  @click="addUser"
>
  新增用户
</WldButton>

只有拥有 sys_user_delete 权限的用户才能看到删除按钮
<WldButton
  permission="sys_user_delete"
  type="danger"
  icon="el-icon-delete"
  @click="delUser"
>
删除用户
</WldButton> -->
<template>
  <!-- 权限判断：存在权限编码则显示，否则隐藏 -->
  <el-button
    v-if="hasPermission"
    :type="type"
    :size="size"
    :icon="icon"
    :disabled="disabled"
    @click="handleClick"
    class="auth-button"
  >
    <slot></slot>
  </el-button>
</template>

<script>
export default {
  name: 'AuthButton',
  props: {
    // 权限编码（必传，如：sys_user_add）
    permission: {
      type: String,
      required: true
    },
    // 按钮类型（同 Element UI Button）
    type: {
      type: String,
      default: 'default'
    },
    // 按钮大小
    size: {
      type: String,
      default: 'medium'
    },
    // 按钮图标
    icon: {
      type: String,
      default: ''
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    // 判断是否拥有权限
    hasPermission() {
      // 1. 从 Vuex 获取当前用户的权限列表（项目中需在登录时存入）
      const userPermissions = this.$store.getters.permissions || []
      // 2. 超级管理员默认拥有所有权限（可根据项目需求调整）
      const isAdmin = this.$store.getters.roles.includes('admin')
      // 3. 权限判断逻辑
      return isAdmin || userPermissions.includes(this.permission)
    }
  },
  methods: {
    // 按钮点击事件，透传到父组件
    handleClick() {
      this.$emit('click')
    }
  }
}
</script>

<style scoped lang="scss">
.auth-button {
  margin: 0 5px;
}
</style>
