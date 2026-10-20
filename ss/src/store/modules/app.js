// 引入 js-cookie 库，用于操作浏览器的 Cookie
import Vue from "vue";
import Cookies from "js-cookie";
// 各菜单角标数量的数据源（后端联调时按需增删）
import { getUnionAuditPendingCount } from "@/api/unionAudit";
import { getTopicReviewPendingCount } from "@/api/community";

// 菜单角标配置：{ 路由完整路径: 对应的数量接口 }
// 路径须与后端菜单配置的 component/路由地址最终解析出的完整路径一致
// 菜单角标配置：{ paths: 该角标可能命中的路由完整路径列表, fetcher: 对应的数量接口 }
// paths 中须包含后端菜单配置解析出的完整路径（父级路由地址 + 子级路由地址）
// extract: 可选，从接口响应中提取角标数量（默认取 res.data）
const menuBadgeSources = [
  {
    paths: ["/unionManagement/unionAudit"],
    fetcher: getUnionAuditPendingCount,
  },
  {
    paths: ["/community/topicReview"],
    fetcher: getTopicReviewPendingCount,
    extract: (res) => (res && res.data && res.data.pendingCount) || 0,
  },
];

// 定义 Vuex 的 state（状态），存储组件需要共享的数据
const state = {
  // 侧边栏相关状态
  sidebar: {
    // 侧边栏是否展开：优先从 Cookie 中读取状态（1 为展开，0 为收起），
    // !!+ 是将 Cookie 中的字符串转为布尔值（+ 转数字，!! 转布尔），默认值为 true（展开）
    opened: Cookies.get("sidebarStatus")
      ? !!+Cookies.get("sidebarStatus")
      : true,
    // 侧边栏切换时是否需要动画：false 表示需要动画，true 表示不需要
    withoutAnimation: false,
  },
  // 设备类型：默认是桌面端（desktop），也可切换为移动端（mobile）
  device: "desktop",
  // 菜单角标数量映射：{ 路由完整路径: 数量 }
  menuBadges: {},
};

// 定义 mutations（变更），唯一能修改 state 的地方，必须是同步函数
const mutations = {
  // 切换侧边栏展开/收起状态
  TOGGLE_SIDEBAR: (state) => {
    // 取反当前侧边栏展开状态
    state.sidebar.opened = !state.sidebar.opened;
    // 切换时启用动画
    state.sidebar.withoutAnimation = false;
    // 根据最新状态更新 Cookie，持久化存储（1=展开，0=收起）
    if (state.sidebar.opened) {
      Cookies.set("sidebarStatus", 1);
    } else {
      Cookies.set("sidebarStatus", 0);
    }
  },
  // 关闭侧边栏（强制收起）
  CLOSE_SIDEBAR: (state, withoutAnimation) => {
    // 更新 Cookie 为收起状态
    Cookies.set("sidebarStatus", 0);
    // 设置侧边栏为收起状态
    state.sidebar.opened = false;
    // 接收外部传入的是否需要动画的参数（比如窗口缩放时可能不需要动画）
    state.sidebar.withoutAnimation = withoutAnimation;
  },
  // 切换设备类型（桌面端/移动端）
  TOGGLE_DEVICE: (state, device) => {
    // 将 state 中的设备类型更新为传入的值
    state.device = device;
  },
  // 设置单个菜单角标
  SET_MENU_BADGE: (state, { path, count }) => {
    Vue.set(state.menuBadges, path, Number(count) || 0);
  },
};

// 定义 actions（动作），可以包含异步操作，通过 commit 调用 mutations 修改 state
const actions = {
  // 触发切换侧边栏的 action
  toggleSideBar({ commit }) {
    // 提交 TOGGLE_SIDEBAR mutation
    commit("TOGGLE_SIDEBAR");
  },
  // 触发关闭侧边栏的 action
  closeSideBar({ commit }, { withoutAnimation }) {
    // 提交 CLOSE_SIDEBAR mutation，并传入是否需要动画的参数
    commit("CLOSE_SIDEBAR", withoutAnimation);
  },
  // 触发切换设备类型的 action
  toggleDevice({ commit }, device) {
    // 提交 TOGGLE_DEVICE mutation，并传入设备类型参数
    commit("TOGGLE_DEVICE", device);
  },
  // 拉取左侧菜单角标数量（遍历所有配置的角标数据源）
  fetchMenuBadges({ commit }) {
    menuBadgeSources.forEach(({ paths, fetcher, extract }) => {
      fetcher()
        .then((res) => {
          let count = 0;
          if (extract) {
            count = extract(res);
          } else if (res && res.success) {
            count = res.data;
          } else if (res && typeof res === "number") {
            count = res;
          } else if (res && res.data !== undefined && res.data !== null) {
            count = res.data;
          }
          paths.forEach((menuPath) => {
            commit("SET_MENU_BADGE", { path: menuPath, count });
          });
        })
        .catch(() => {
          // 角标接口异常时静默处理，不影响页面使用
        });
    });
  },
};

// 导出模块，namespaced: true 表示开启命名空间，避免不同模块的 mutation/action 命名冲突
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
