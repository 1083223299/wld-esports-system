<template>
  <div class="container community-list-page">
    <MerchantPlaymateAuditList />
  </div>
</template>

<script>
import MerchantPlaymateAuditList from "./list.vue";

export default {
  name: "MerchantPlaymateAudit",
  components: {
    MerchantPlaymateAuditList,
  },
};
</script>

<style scoped>
.container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}
</style>
