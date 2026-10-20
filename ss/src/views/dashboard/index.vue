<template>
  <div class="dashboard-container">
    <div class="dashboard-content">
      <img src="../../assets/welcomeImage.png" alt="欢迎图片" class="dashboard-img">
    </div>
  </div>
</template>

<script>
import {mapGetters} from 'vuex'

export default {
  name: 'Dashboard',
  computed: {
    ...mapGetters([
      'name'
    ])
  }
}
</script>

<style lang="scss" scoped>
.dashboard {
  &-container {
    width: 100%;
    height: 100%;
    padding: 30px;
    box-sizing: border-box;
    //overflow: auto;
  }

  &-content {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 30px;
    display: block;
    margin: 0 auto;
  }
}

// 响应式适配
@media screen and (max-width: 768px) {
  .dashboard {
    &-container {
      padding: 15px;
    }

    &-img {
      border-radius: 20px;
    }
  }
}
@media screen and (max-width: 480px) {
  .dashboard {
    &-container {
      padding: 10px;
    }

    &-img {
      border-radius: 15px;
    }
  }
}
</style>
