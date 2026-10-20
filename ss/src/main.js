import Vue from "vue";

import "normalize.css/normalize.css"; // 现代化 CSS 重置替代方案

import ElementUI from "element-ui";
import "element-ui/lib/theme-chalk/index.css";
// import locale from 'element-ui/lib/locale/lang/en' // 语言国际化

import "@/styles/index.scss"; // 全局 CSS 样式

import { filterEmptyFields, deepFilterEmptyFields } from '@/utils/filterEmpty'

// 全局挂载过滤方法
Vue.prototype.$filterEmpty = filterEmptyFields
Vue.prototype.$deepFilterEmpty = deepFilterEmptyFields

import App from "./App";
import store from "./store";
import router from "./router";
import './components' // 引入全局封装组件

import "@/icons"; // 图标
import "@/permission"; // 权限控制

// 导入权限指令（路径对应你的实际文件路径）
import permission from "@/directive/permission";
// 全局注册指令（执行插件的install方法，注册v-permission）
Vue.use(permission);

// 设置 ElementUI 语言为英文
// Vue.use(ElementUI, { locale })
// 如果想要中文版 element-ui，按如下方式声明
Vue.use(ElementUI);

Vue.config.productionTip = false;

new Vue({
  el: "#app",
  router,
  store,
  render: (h) => h(App),
});
