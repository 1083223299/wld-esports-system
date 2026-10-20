<template>
  <div class="container">
    <keep-alive :include="['ReportComplaintList']">
      <component :is="currentComponent" ref="dynamicComponent" />
    </keep-alive>
  </div>
</template>

<script>
import ReportComplaintList from './list.vue'

export default {
  name: 'reportComplaint',
  components: {
    ReportComplaintList
  },
  data() {
    return {
      currentComponent: 'ReportComplaintList'
    }
  },
  provide() {
    return {
      switchToList: () => {
        this.currentComponent = 'ReportComplaintList'
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
  height: 100%;
}
</style>
