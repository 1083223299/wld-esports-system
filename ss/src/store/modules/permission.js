// 导入路由配置：常量路由（所有角色均可访问，如登录页/404）
import { constantRoutes } from "@/router";
import { getRoutes } from "@/api/menu";
import Layout from "@/layout";
import ParentView from "@/layout/components/ParentView.vue";

// 同步收集 views 下页面，避免 require([...]) 打出 chunk-xxx.undefined.js
const viewModules = require.context("@/views", true, /\.vue$/);

function resolveView(component) {
  const view = String(component)
    .replace(/^\/+/, "")
    .replace(/\.vue$/i, "");
  const key = `./${view}.vue`;
  if (!viewModules.keys().includes(key)) {
    console.error("未找到页面组件:", component, "期望:", key);
    return undefined;
  }
  const mod = viewModules(key);
  return mod.default || mod;
}

/**
 * 将后端返回的菜单数据转换为路由格式
 * @param {Array} menus - 后端返回的菜单列表
 * @returns {Array} 转换后的路由配置
 */
function convertMenusToRoutes(menus) {
  const routes = [];

  menus.forEach((menu) => {
    let component = null;

    if (menu.component === "Layout") {
      component = Layout;
    } else if (menu.component === "ParentView") {
      component = ParentView;
    } else if (menu.component) {
      component = resolveView(menu.component);
    }

    // 2. 构建路由对象
    const route = {
      path: menu.path,
      name: menu.name,
      component: component,
      redirect: menu.redirect === "noRedirect" ? undefined : menu.redirect,
      hidden: menu.hidden === true,
      alwaysShow: menu.alwaysShow === true,
      meta: {
        title: menu.meta?.title || menu.name,
        icon: menu.meta?.icon,
        noCache: menu.meta?.noCache || false,
        roles: menu.meta?.roles || [],
      },
    };

    // 3. 递归处理子菜单
    if (menu.children && menu.children.length > 0) {
      route.children = convertMenusToRoutes(menu.children);
    }

    routes.push(route);
  });

  return routes;
}

const state = {
  routes: [], // 总路由表（常量路由 + 动态路由）
  addRoutes: [], // 动态添加的路由
};

const mutations = {
  SET_ROUTES: (state, routes = []) => {
    state.addRoutes = routes;
    // 合并常量路由和动态路由
    state.routes = constantRoutes.concat(routes);
    // 添加 404 路由（必须放在最后）
    const has404 = state.routes.some((route) => route.path === "*");
    if (!has404) {
      state.routes.push({ path: "*", redirect: "/404", hidden: true });
    }
  },
};

const actions = {
  generateRoutes({ commit }) {
    return new Promise((resolve, reject) => {
      console.log("开始获取动态路由...");

      // 调用你的 getRoutes 接口，使用 .then 替代 await
      getRoutes()
        .then((res) => {
          console.log("后端返回的菜单数据:", res);

          let accessedRoutes = [];

          // 根据你的响应格式处理
          if (res && Array.isArray(res)) {
            accessedRoutes = convertMenusToRoutes(res);
          } else if (
            res &&
            res.code === 200 &&
            res.data &&
            Array.isArray(res.data)
          ) {
            accessedRoutes = convertMenusToRoutes(res.data);
          }

          console.log("转换后的路由:", accessedRoutes);

          commit("SET_ROUTES", accessedRoutes);
          resolve(accessedRoutes);
        })
        .catch((error) => {
          console.error("生成动态路由失败:", error);
          reject(error);
        });
    });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
