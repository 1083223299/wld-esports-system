import Vue from "vue";
import Router from "vue-router";

Vue.use(Router);
/* 布局组件 */
import Layout from "@/layout";

/**
 * 注意：子菜单只会在 route.children.length >= 1 时显示
 * 详情查看：https://panjiachen.github.io/vue-element-admin-site/guide/essentials/router-and-nav.html
 *
 * hidden: true                   如果设置为 true，该项不会显示在侧边栏（默认为 false）
 * alwaysShow: true               如果设置为 true，将始终显示根菜单
 *                                如果没有设置 alwaysShow，当项目有多个子路由时，
 *                                它将变为嵌套模式，否则不显示根菜单
 * redirect: noRedirect           如果设置为 noRedirect，面包屑中不会重定向
 * name:'router-name'             名称用于 <keep-alive>（必须设置！！！）
 * meta : {
 roles: ['admin','editor']    控制页面访问权限（可以设置多个角色）
 title: 'title'               显示在侧边栏和面包屑中的名称（建议设置）
 icon: 'svg-name'/'el-icon-x' 显示在侧边栏的图标
 breadcrumb: false            如果设置为 false，该项将在面包屑中隐藏（默认为 true）
 activeMenu: '/example/list'  如果设置路径，侧边栏将高亮显示你设置的路径
 }
 */

/**
 * constantRoutes - 常量路由
 * 没有权限要求的基页面
 * 所有角色都可以访问
 */
export const constantRoutes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index"),
    hidden: true,
  },
  {
    path: "/forgotPassword",
    name: "ForgotPassword",
    component: () => import("@/views/forgotPassword/index"),
    hidden: true,
  },
  {
    path: "/404",
    component: () => import("@/views/404"),
    hidden: true,
  },
  {
    path: "/",
    component: Layout,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/dashboard/index"),
        meta: { title: "首页", icon: "layout_icon1" },
      },
      {
        path: "personalCenter",
        name: "PersonalCenter",
        component: () => import("@/views/personalCenter/index"),
        hidden: false,
      },
      // {
      //   path: "personnelManagement/merchantPlaymateAudit",
      //   name: "MerchantPlaymateAudit",
      //   component: () => import("@/views/personnelManagement/merchantPlaymateAudit/index.vue"),
      //   meta: { title: "商户陪玩审核", icon: "layout_icon3" },
      //   hidden: true,
      // },
      // {
      //   path: "businessPop",
      //   name: "BusinessPop",
      //   component: () => import("@/views/operation/businessPop/index.vue"),
      //   meta: { title: "文案配置", icon: "layout_icon3" },
      // },
    ],
  },
];

// 创建路由实例
const createRouter = () =>
  new Router({
    scrollBehavior: () => ({ y: 0 }),
    routes: constantRoutes,
  });

const router = createRouter();

// 重置路由（登出时使用）
export function resetRouter() {
  const newRouter = createRouter();
  router.matcher = newRouter.matcher;

  // 清空存储的动态路由
  window.__dynamicRoutes = [];
}

export default router;
