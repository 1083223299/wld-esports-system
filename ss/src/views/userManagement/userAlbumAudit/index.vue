<template>
  <div class="container">
    <UserAlbumAuditList />
  </div>
</template>

<script>
import UserAlbumAuditList from './list.vue'

export default {
  name: 'UserAlbumAudit',
  components: {
    UserAlbumAuditList
  }
}
</script>

<style scoped>
.container {
  height: 100%;
  padding: 20px;
}
</style>
