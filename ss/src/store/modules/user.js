import { login, logout, getInfo } from "@/api/user";
import { getToken, setToken, removeToken } from "@/utils/auth";
import { resetRouter } from "@/router";

const getDefaultState = () => {
  return {
    token: getToken(),
    name: "",
    avatar: "",
    introduction: "",
    userData: {},
    roles: [],
    permissions: [], // 添加权限列表
  };
};

const state = getDefaultState();

const mutations = {
  RESET_STATE: (state) => {
    Object.assign(state, getDefaultState());
  },
  SET_TOKEN: (state, token) => {
    state.token = token;
  },
  SET_NAME: (state, name) => {
    state.name = name;
  },
  SET_AVATAR: (state, avatar) => {
    state.avatar = avatar;
  },
  SET_INTRODUCTION: (state, introduction) => {
    state.introduction = introduction;
  },
  SET_USERDATA: (state, userData) => {
    state.userData = userData;
  },
  SET_ROLES: (state, roles) => {
    state.roles = roles;
  },
  SET_PERMISSIONS: (state, permissions) => {
    state.permissions = permissions;
  },
};

const actions = {
  login({ commit }, userInfo) {
    return new Promise((resolve, reject) => {
      login(userInfo)
        .then((response) => {
          const { data } = response;
          commit("SET_TOKEN", data.access_token || data.token);
          setToken(data.access_token || data.token);
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // get user info
  getInfo({ commit, state }) {
    return new Promise((resolve, reject) => {
      getInfo(state.token)
        .then((response) => {
          const data = response.data;

          if (!data) {
            return reject("验证失败，请重新登录。");
          }

          // 兼容不同的数据格式
          const userData = data.user || data;
          const { nickName, urlLink, remark, roles } = userData;

          if (!roles || roles.length <= 0) {
            return reject("获取用户信息失败：角色列表必须为非空数组");
          }

          commit("SET_ROLES", roles);
          commit("SET_PERMISSIONS", data.permissions || []); // 存储权限列表
          commit("SET_NAME", nickName);
          commit("SET_AVATAR", urlLink);
          commit("SET_INTRODUCTION", remark);
          commit("SET_USERDATA", userData);

          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // user logout
  logout({ commit, state }) {
    return new Promise((resolve, reject) => {
      logout(state.token)
        .then(() => {
          removeToken();
          resetRouter();
          commit("RESET_STATE");
          commit("SET_ROLES", []);
          commit("SET_PERMISSIONS", []);
          commit("SET_USERDATA", {});
          commit("permission/SET_ROUTES", [], { root: true });
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // remove token
  resetToken({ commit }) {
    return new Promise((resolve) => {
      removeToken();
      commit("RESET_STATE");
      commit("SET_ROLES", []);
      commit("SET_PERMISSIONS", []);
      commit("SET_USERDATA", {});
      resolve();
    });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
