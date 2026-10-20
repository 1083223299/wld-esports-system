<template>
  <div class="container">
    <UnionAuditList />
  </div>
</template>

<script>
import UnionAuditList from './list.vue'

export default {
  name: 'UnionAudit',
  components: {
    UnionAuditList
  }
}
</script>

<style scoped>
.container {
  height: 100%;
  padding: 20px;
}
</style>
