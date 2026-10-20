<template>
  <div class="container">
    <UserSkillAuditList />
  </div>
</template>

<script>
import UserSkillAuditList from './list.vue'

export default {
  name: 'UserSkillAudit',
  components: {
    UserSkillAuditList
  }
}
</script>

<style scoped>
.container {
  height: 100%;
  padding: 20px;
}
</style>