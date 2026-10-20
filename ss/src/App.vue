<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>
<style lang="scss">
  body * {
    box-sizing: border-box;
    flex-shrink: 0;
  }
  // body {
  // }
  input {
    background-color: transparent;
    border: 0;
  }
  button {
    margin: 0;
    padding: 0;
    border: 1px solid transparent;
    outline: none;
    background-color: transparent;
  }

  button:active {
    opacity: 0.6;
  }
  // .el-dialog__footer {
  //   text-align: center !important;
  // }
  .van-nav-bar__left:active,
  .van-nav-bar__right:active {
    opacity: 1;
  }
  [class*='van-']::after {
    border-bottom: 0;
  }
  
</style>
