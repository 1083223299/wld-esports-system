const getters = {
  sidebar: (state) => state.app.sidebar,
  device: (state) => state.app.device,
  token: (state) => state.user.token,
  avatar: (state) => state.user.avatar,
  name: (state) => state.user.name,
  roles: (state) => state.user.roles,
  permissions: (state) => state.user.permissions, // 添加权限列表
  introduction: (state) => state.user.introduction,
  routes: (state) => state.permission.routes,
  addRoutes: (state) => state.permission.addRoutes,
  userData: (state) => state.user.userData,
  menuBadges: (state) => state.app.menuBadges,
  unreadCount: (state) => state.notification.unreadCount,
  unreadTotal: (state) => state.notification.unreadTotal,
  systemMessages: (state) => state.notification.systemMessages,
  notificationTotal: (state) => state.notification.total,
};
export default getters;
