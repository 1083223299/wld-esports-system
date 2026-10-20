import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    user: {},
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    displayName: (state) => state.user?.name || state.user?.username || '未登录',
    role: (state) => state.user?.role || '',
  },
  actions: {
    setToken(token) {
      this.token = token || '';
    },
    setUser(user) {
      this.user = user || {};
    },
    /**
     * 写入登录会话，兼容两种入参：
     * - 后端登录结果（扁平）：{ token, client, role, name, accountId, clubId }
     * - 旧 mock 形状：{ token, user }
     */
    setSession(session = {}) {
      const { token, user } = session;
      if (user) {
        this.setToken(token);
        this.setUser(user);
        return;
      }
      this.setToken(token);
      this.setUser({
        id: session.accountId,
        accountId: session.accountId,
        clubId: session.clubId,
        client: session.client,
        role: session.role,
        name: session.name,
      });
    },
    reset() {
      this.token = '';
      this.user = {};
    },
    logout() {
      this.reset();
    },
  },
  persist: {
    key: 'futurecave-auth',
    storage: localStorage,
    pick: ['token', 'user'],
  },
});
