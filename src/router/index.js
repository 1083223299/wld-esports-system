import { createRouter, createWebHashHistory } from 'vue-router';
import { getToken } from '../utils/auth';
import Layout from '../layout/index.vue';

/**
 * 路由结构同 ss（vue-element-admin 风格）：
 * - hidden: true    不在侧边栏显示
 * - alwaysShow: true 始终显示父级菜单（有子菜单时）
 * - meta.title      侧边栏/面包屑名称
 * - meta.icon       侧边栏图标
 * 侧边栏由 Sidebar 直接遍历该树生成，顺序 = 数组顺序（无需后端接口）
 */
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    hidden: true,
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/HomeView.vue'),
        meta: { title: '首页', icon: 'layout_icon1' },
      },
      {
        path: 'notify',
        name: 'SystemNotify',
        component: () => import('../views/handoverCenter/SystemNotifyView/index.vue'),
        hidden: true, // 独立入口：侧边栏不展示，仅通过右上角铃铛进入
        meta: { title: '系统通知' },
      },
      {
        path: 'users',
        name: 'Users',
        redirect: '/users/player-list',
        alwaysShow: true,
        meta: { title: '打手管理', icon: 'layout_icon11' },
        children: [
          {
            path: 'player-list',
            name: 'PlayerList',
            component: () => import('../views/userManagement/PlayerListView/index.vue'),
            meta: { title: '打手列表' },
          },
        ],
      },
      {
        path: 'orders',
        name: 'Orders',
        redirect: '/orders/my-orders',
        alwaysShow: true,
        meta: { title: '订单管理', icon: 'layout_icon4' },
        children: [
          {
            path: 'my-orders',
            name: 'MyOrders',
            component: () => import('../views/orderManagement/MyOrdersView/index.vue'),
            meta: { title: '我的订单' },
          },
          {
            path: 'hall',
            name: 'ClaimHall',
            component: () => import('../views/orderManagement/ClaimHallView/index.vue'),
            meta: { title: '抢单大厅' },
          },
          {
            path: 'dispatch',
            name: 'DispatchMessage',
            component: () => import('../views/orderManagement/DispatchMessageView/index.vue'),
            meta: { title: '派单消息' },
          },
        ],
      },
      {
        path: 'finance',
        name: 'Finance',
        redirect: '/finance/my-deposit',
        alwaysShow: true,
        meta: { title: '财务管理', icon: 'layout_icon6' },
        children: [
          {
            path: 'my-deposit',
            name: 'MyDeposit',
            component: () => import('../views/financialManagement/MyDepositView/index.vue'),
            meta: { title: '我的押金' },
          },
          {
            path: 'my-wallet',
            name: 'MyWallet',
            component: () => import('../views/financialManagement/MyWalletView/index.vue'),
            meta: { title: '我的钱包' },
          },
        ],
      },
      {
        path: 'configuration',
        name: 'Configuration',
        redirect: '/configuration/index',
        alwaysShow: true,
        meta: { title: '配置管理', icon: 'layout_icon2' },
        children: [
          {
            path: 'index',
            name: 'ClubConfig',
            component: () => import('../views/configurationManagement/ClubConfigView/index.vue'),
            meta: { title: '配置管理' },
          },
        ],
      },
      // {
      //   path: 'settings',
      //   name: 'Settings',
      //   component: () => import('../views/SettingsView.vue'),
      //   meta: { title: '系统设置', icon: 'layout_icon2' },
      // },
    ],
  },
  // 兼容旧地址
  {
    path: '/player-list',
    redirect: '/users/player-list',
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = getToken();
  const needsAuth = to.meta.requiresAuth !== false;

  if (!needsAuth) {
    if (token && to.path === '/login') {
      next('/home');
      return;
    }
    next();
    return;
  }

  if (!token) {
    next({ path: '/login', query: { redirect: to.fullPath } });
    return;
  }

  next();
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 未来洞` : '未来洞';
});

export default router;