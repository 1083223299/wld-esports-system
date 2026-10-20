<!-- eslint-disable vue/html-self-closing -->
<template>
  <div class="login-container">
    <!-- 左侧插画区域 -->
    <div class="left-side">
      <div class="illustration">
        <!-- <img src="@/assets/login_img/login_ban.png" alt="背景" /> -->
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="right-side">
      <div class="login-card">
        <div class="logo">
          <img src="@/assets/logo.png" alt="logo" />
          <span class="system-name">未来洞管理系统</span>
        </div>

        <h2 class="title">登录</h2>

        <el-form ref="loginForm" :rules="rules" :model="loginForm" class="login-form">

          <el-form-item prop="username">
            <el-input ref="username" v-model="loginForm.username" placeholder="请输入您的账号" name="username" type="text"
              tabindex="1" auto-complete="on" size="medium" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input :key="passwordType" ref="password" v-model="loginForm.password" :type="passwordType"
              placeholder="请输入您的密码" name="password" tabindex="2" auto-complete="on" size="medium"
              @keyup.enter.native="handleLogin" />
            <span class="show-pwd" @click="showPwd">
              <svg-icon :icon-class="passwordType === 'password' ? 'eye' : 'eye-open'" />
            </span>
          </el-form-item>

          <el-form-item>
            <el-button type="primary"
              :class="loginForm.username && loginForm.password ? 'login-btn' : 'login-btn-disabled'" size="medium"
              :loading="loading" :disabled="!(loginForm.username && loginForm.password)"
              @click.native.prevent="handleLogin">
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="forgot-password">
          <div class="forgotpassword" @click.prevent="handleForgotPwd">忘记密码</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'Login',
  data() {
    return {
      // wld-admin
      // weilaidongh3$8Hkjds%
      loginForm: {
        username: '',
        password: '',
        tenantId: "000000",
        rememberMe: true,
        clientId: "e5cd7e4891bf95d1d19206ce24a7b32e",
        // grantType: "password_qx"
        grantType: "password"
      },
      loading: false,
      passwordType: 'password',
      redirect: undefined,
      rules: {
        username: [
          { required: true, message: '账号不能为空', trigger: 'change' },
        ],
        password: [
          { required: true, message: '密码不能为空', trigger: 'change' }
        ]
      }
    }
  },
  watch: {
    $route: {
      handler: function (route) {
        this.redirect = route.query && route.query.redirect
      },
      immediate: true
    }
  },
  methods: {
    showPwd() {
      if (this.passwordType === 'password') {
        this.passwordType = ''
      } else {
        this.passwordType = 'password'
      }
      this.$nextTick(() => {
        this.$refs.password.focus()
      })
    },
    handleLogin() {
      this.$refs.loginForm.validate(valid => {
        if (valid) {
          this.loading = true;

          this.$store.dispatch('user/login', this.loginForm)
            .then(() => {
              // 登录成功后，获取用户信息（包含角色）
              return this.$store.dispatch('user/getInfo');
            })
            .then(() => {
              // 获取用户信息成功后，生成动态路由
              return this.$store.dispatch('permission/generateRoutes');
            })
            .then((accessRoutes) => {
              // 动态添加路由到 router
              accessRoutes.forEach(route => {
                this.$router.addRoute(route);
              });

              // 跳转到首页或重定向页面
              const redirect = this.$route.query.redirect || '/';
              this.$router.push({ path: redirect });
              this.loading = false;
            })
            .catch((error) => {
              this.loading = false;
            });
        }
      });
    },
    // 忘记密码
    handleForgotPwd() {
      this.$router.push({
        name: 'ForgotPassword',
        params: { username: this.loginForm.username } // 路由参数，目标页可通过 $route.params 获取
      })
    }
  }
}
</script>

<style lang="scss" scoped>
$dark_gray: #889aa4;

.login-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.left-side {
  // .illustration {
  //   width: 400px;
  //   height: 400px;
  //   img {
  //     width: 100%;
  //     height: 100%;
  //     object-fit: contain;
  //   }
  // }
  flex: 1;
  /* 核心：背景图相关样式 */
  background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%);
  background-image: url("../../assets/login_img/login_ban.png");
  background-repeat: no-repeat;
  /* 禁止背景图重复 */
  background-position: center center;
  /* 背景图始终居中显示 */
  background-size: cover;
  /* 核心：覆盖整个容器，保持比例，裁剪超出部分 */
  /* 布局基础属性 */
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  /* 保证容器至少占满屏幕高度 */
  width: 100%;
}

.right-side {
  flex: 1;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  .login-card {
    width: 400px;
    padding: 40px;
    box-sizing: border-box;

    .logo {
      display: flex;
      align-items: center;
      margin-bottom: 30px;

      img {
        width: 40px;
        height: 40px;
        margin-right: 8px;
      }

      .system-name {
        color: #e540cc;
        font-weight: 500;
        overflow-wrap: break-word;
        color: #e540cc;
        font-size: 24px;
        font-weight: normal;
        text-align: left;
        white-space: nowrap;
      }
    }

    .title {
      margin-bottom: 30px;
      overflow-wrap: break-word;
      color: #000000;
      font-size: 30px;
      font-weight: 600;
      text-align: left;
      white-space: nowrap;
    }

    .login-form {
      .el-form-item {
        margin-bottom: 20px;
      }

      .login-btn {
        background-color: #6a35ff;
        border-radius: 8px;
        height: 40px;
        width: 100%;
      }

      .login-btn-disabled {
        background-color: #E7DEFF;
        border-radius: 8px;
        height: 40px;
        width: 100%;
      }
    }

    .forgot-password {
      text-align: right;

      .forgotpassword {
        color: #6a35ff;
        font-size: 14px;
        cursor: pointer;
      }
    }
  }
}

.show-pwd {
  position: absolute;
  right: 10px;
  top: 5px;
  font-size: 10px;
  color: $dark_gray;
  cursor: pointer;
  user-select: none;
}

.el-button--primary {
  border-color: #6b35ff00;
}

.el-input--medium:focus {
  border-color: #8F5EFF !important;
}

::v-deep .login-btn:hover {
  background-color: #8F5EFF;
}
</style>
