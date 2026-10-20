import {
  listSystemMessages,
  markSystemMessageRead,
  markAllSystemMessagesRead,
} from "@/api/notice";

const state = {
  systemMessages: [],
  unreadCount: 0,
  unreadTotal: 0,
  total: 0,
};

const mutations = {
  SET_SYSTEM_MESSAGES(state, messages) {
    state.systemMessages = messages;
    state.unreadCount = messages.filter((msg) => !msg.isRead).length;
  },
  APPEND_SYSTEM_MESSAGES(state, messages) {
    state.systemMessages = [...state.systemMessages, ...messages];
    state.unreadCount = state.systemMessages.filter(
      (msg) => !msg.isRead
    ).length;
  },
  SET_TOTAL(state, total) {
    state.total = total;
  },
  SET_MSG(state, msg) {
    state.msg = msg;
  },
  SET_UNREAD_TOTAL(state, msg) {
    state.unreadTotal = msg;
  },
  MARK_MESSAGE_READ(state, reminderId) {
    const message = state.systemMessages.find(
      (item) => item.reminderId === reminderId
    );
    if (message) {
      message.isRead = 1;
    }
    state.unreadCount = state.systemMessages.filter(
      (msg) => !msg.isRead
    ).length;
  },
};

const actions = {
  async loadSystemMessages(
    { commit },
    { filter = "all", pageSize = 50, pageNum = 1 } = {}
  ) {
    try {
      const params = { pageNum, pageSize };
      if (filter === "unread") {
        params.isRead = 0;
      }
      const res = await listSystemMessages(params);
      const items =
        res?.data?.rows || res?.data?.records || res?.data?.list || [];
      const total = res?.data?.total || 0;
      const msg = res?.data?.msg || 0;
      const messages = items.map((item) => ({
        ...item,
        messageId: item.reminderId || `${Date.now()}_${Math.random()}`,
        read: item.isRead === 1,
      }));
      commit("SET_SYSTEM_MESSAGES", messages);
      commit("SET_TOTAL", total);
      commit("SET_MSG", msg);
      return { messages, total, msg };
    } catch (error) {
      return { messages: [], total: 0, msg: 0 };
    }
  },

  async loadMoreMessages(
    { commit },
    { filter = "all", pageSize = 50, pageNum = 1 } = {}
  ) {
    try {
      const params = { pageNum, pageSize };
      if (filter === "unread") {
        params.isRead = 0;
      }
      const res = await listSystemMessages(params);
      const items =
        res?.data?.rows || res?.data?.records || res?.data?.list || [];
      const total = res?.data?.total || 0;
      const msg = res?.data?.msg || 0;
      const messages = items.map((item) => ({
        ...item,
        messageId: item.reminderId || `${Date.now()}_${Math.random()}`,
        read: item.isRead === 1,
      }));
      commit("APPEND_SYSTEM_MESSAGES", messages);
      commit("SET_TOTAL", total);
      commit("SET_MSG", msg);
      return { messages, total, msg };
    } catch (error) {
      return { messages: [], total: 0, msg: 0 };
    }
  },

  async fetchUnreadCount({ commit }) {
    try {
      const res = await listSystemMessages({
        pageNum: 1,
        pageSize: 1,
        isRead: 0,
      });
      // const total = res?.data?.total || 0;
      const msg = res?.data?.msg || 0;
      commit("SET_UNREAD_TOTAL", msg);
      return msg;
    } catch (error) {
      return 0;
    }
  },

  async markMessageRead({ commit }, message) {
    const reminderId = message.reminderId || message.messageId;
    try {
      await markSystemMessageRead({ reminderId });
    } catch (error) {
      // 接口失败也继续标记本地已读
    }
    commit("MARK_MESSAGE_READ", reminderId);
  },

  async markAllMessagesRead(
    { dispatch },
    { filter = "all", pageSize = 50, pageNum = 1 } = {}
  ) {
    try {
      await markAllSystemMessagesRead();
    } catch (error) {
      // 接口失败也继续刷新列表
    }
    // 刷新列表
    await dispatch("loadSystemMessages", { filter, pageSize, pageNum });
    // 刷新未读总数
    await dispatch("fetchUnreadCount");
  },
};

const getters = {
  systemMessages: (state) => state.systemMessages,
  unreadCount: (state) => state.unreadCount,
  unreadTotal: (state) => state.unreadTotal,
  total: (state) => state.total,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
