import router from "./router";
import store from "./store";
import { Message } from "element-ui";
import NProgress from "nprogress"; // 进度条插件
import "nprogress/nprogress.css"; // 进度条样式文件
import { getToken } from "@/utils/auth"; // 从Cookie中获取令牌
import getPageTitle from "@/utils/get-page-title"; // 导入页面标题获取方法

// NProgress进度条配置：隐藏加载转圈的图标
NProgress.configure({ showSpinner: false });

// 免登录白名单：进入这些路由无需重定向、无需鉴权
const whiteList = ["/login", "/forgotPassword"];

// 全局前置路由守卫：路由跳转前执行（异步）
router.beforeEach(async (to, from, next) => {
  // 启动进度条
  NProgress.start();

  // 设置浏览器标签页的标题
  document.title = getPageTitle(to.meta.title);

  // 判断用户是否已登录（是否存在有效令牌）
  const hasToken = getToken();

  // 存在令牌（用户已登录）的情况
  if (hasToken) {
    // 如果目标路由是登录页
    if (to.path === "/login") {
      // 已登录则重定向到首页
      next({ path: "/" });
      NProgress.done(); // 手动结束进度条（hack兼容：解决路由快速跳转时进度条不关闭的问题）
      return
    } else {
      // 判断用户是否已通过getInfo接口获取到权限角色
      const hasRoles = store.getters.roles && store.getters.roles.length > 0;
      // 已获取角色权限，直接放行
      if (hasRoles) {
        next();
      } else {
        try {
          // 获取用户信息
          // 注意：roles必须是数组格式！例如：['admin'] 或 ['developer','editor']
          const { roles } = await store.dispatch("user/getInfo");
          // await store.dispatch("user/getInfo");

          // 根据用户角色，生成可访问的路由表
          const accessRoutes = await store.dispatch("permission/generateRoutes");

          // 使用 addRoute 逐个添加（不是 addRoutes）
          if (accessRoutes && accessRoutes.length) {
            accessRoutes.forEach(route => {
              router.addRoute(route);
            });
          }

          // 存储动态路由，方便重置
          window.__dynamicRoutes = accessRoutes;
          console.log("用户角色>>>", roles);
          // hack方案：确保动态添加的路由规则生效
          // 设置replace: true，使本次导航不会在浏览器历史记录中留下记录
          next({ ...to, replace: true });
        } catch (error) {
          // 捕获异常：移除令牌并跳转到登录页重新登录
          await store.dispatch("user/resetToken");
          // 弹出错误提示，无具体错误信息则显示默认文案
          Message.error(error || "系统异常");
          // 重定向到登录页，并携带目标路由参数（登录成功后跳回原页面）
          // next(`/login?redirect=${to.path}`);
          next('/login');  // 不带 redirect 参数
          NProgress.done();
        }
      }
    }
  } else {
    // 无令牌（用户未登录）的情况
    // 判断目标路由是否在免登录白名单中
    if (whiteList.indexOf(to.path) !== -1) {
      // 在白名单内，直接放行
      next();
    } else {
      // 不在白名单内，重定向到登录页并携带目标路由参数
      next(`/login?redirect=${to.path}`);
      NProgress.done();
    }
  }
});

// 全局后置路由守卫：路由跳转完成后执行
router.afterEach(() => {
  // 结束进度条
  NProgress.done();
});
