import Vue from 'vue'
// 布局类
import Empty from './Empty/index.vue' //空状态组件
// 数据展示类
import ImgZoom from './ImgZoom/index.vue'; // 图片放大组件
import InfiniteScroll from './InfiniteScroll/index.vue'; // 无限滚动触底加载更多组件
// 表单输入类

// 弹窗抽屉类
import ProDialog from './ProDialog/index.vue' // 弹窗组件
// 权限控制类
import WldButton from './WldButton/index.vue' // 权限按钮组件

// 批量注册全局组件
const components = {
  Empty,
  ProDialog,
  WldButton,
  ImgZoom,
  InfiniteScroll
}

Object.keys(components).forEach(key => {
  Vue.component(key, components[key])
})

export default Vue