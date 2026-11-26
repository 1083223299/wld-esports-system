<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '../api/modules/auth';
import { useUserStore } from '../stores/user';
import { useToast } from '../composables/useToast';
import logo from '../assets/images/logo.png';
import { CircleClose } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { show } = useToast();

const loginFormRef = ref(null);
const loading = ref(false);
const passwordType = ref('password');
const rememberMe = ref(false);

const form = reactive({
  username: '',
  password: '',
  wecomId: '',
});

/** 企微 ID 下拉选项（GET /api/admin/auth/wecom-options） */
const wecomOptions = ref([]);

/** 下拉组件实例引用，用于清空 Element 内部的搜索关键字 */
const wecomSelectRef = ref(null);

/** 清空已选企微ID 与组件内部搜索词 */
function clearWecom() {
  form.wecomId = '';
  const inst = wecomSelectRef.value;
  // 清空组件内部输入词，恢复展示全部选项
  if (inst?.states) inst.states.inputValue = '';
}

const rules = {
  username: [{ required: true, message: '账号不能为空', trigger: 'change' }],
  password: [{ required: true, message: '密码不能为空', trigger: 'change' }],
};

/** 拉取企微下拉选项（失败提示由 request.js 统一处理，下拉留空不影响登录） */
async function loadWecomOptions() {
  try {
    wecomOptions.value = (await authApi.getWecomOptions()) || [];
  } catch {
    wecomOptions.value = [];
  }
}

onMounted(() => {
  loadWecomOptions();

  const saved = localStorage.getItem('loginRemember');
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    form.username = String(parsed.username || '').trim();
    form.password = String(parsed.password || '').trim();
    rememberMe.value = !!parsed.rememberMe;
  } catch {
    localStorage.removeItem('loginRemember');
  }
});

function trimLoginField(field) {
  form[field] = form[field].trim();
}

function showPwd() {
  passwordType.value = passwordType.value === 'password' ? '' : 'password';
}

function saveRememberState() {
  if (rememberMe.value) {
    localStorage.setItem(
      'loginRemember',
      JSON.stringify({
        username: form.username.trim(),
        password: form.password.trim(),
        rememberMe: true,
      })
    );
  } else {
    localStorage.removeItem('loginRemember');
  }
}

async function submit() {
  if (!loginFormRef.value) return;
  form.username = form.username.trim();
  form.password = form.password.trim();
  const valid = await loginFormRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;

  try {
    saveRememberState();
    const result = await authApi.login({
      username: form.username,
      password: form.password,
      wecomId: form.wecomId || '',
    });
    userStore.setSession(result);
    show('登录成功', 'success');

    // 用 me 接口拉取权威用户信息（含 wecomName 等），失败不阻塞登录
    authApi
      .me()
      .then((user) => userStore.setUser(user))
      .catch(() => {});

    const redirect = route.query.redirect || '/home';
    router.replace(String(redirect));
  } catch (error) {
    // 错误提示已由 request.js 统一 toast，这里避免重复弹窗
    console.error('[login]', error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-container">
    <div class="left-side">
      <div class="illustration"></div>
    </div>

    <div class="right-side">
      <div class="login-card">
        <div class="logo">
          <img :src="logo" alt="logo" />
          <span class="system-name">未来洞电竞管理后台</span>
        </div>

        <h2 class="title">欢迎使用</h2>

        <el-form ref="loginFormRef" :model="form" :rules="rules" class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入帐号"
              name="username"
              type="text"
              size="large"
              clearable
              @blur="trimLoginField('username')"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              :type="passwordType"
              placeholder="请输入密码"
              name="password"
              size="large"
              clearable
              @blur="trimLoginField('password')"
              @keyup.enter="submit"
            >
              <!-- 密码可见切换图标，放入 suffix 插槽与清空 × 并排 -->
              <template #suffix>
                <span class="show-pwd" @click="showPwd">
                  <SvgIcon :icon-class="passwordType === 'password' ? 'eye' : 'eye-open'" />
                </span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-select
              ref="wecomSelectRef"
              v-model="form.wecomId"
              placeholder="请选择企微ID（可选）"
              filterable
              filter-placeholder="输入角色或姓名搜索"
              size="large"
              class="wecom-select"
            >
              <el-option
                v-for="opt in wecomOptions"
                :key="opt.wecomId"
                :label="opt.label || opt.name"
                :value="opt.wecomId"
              />
            </el-select>
            <!-- 自定义清空 ×：有选中值时显示，点击清空已选企微ID -->
            <span v-if="form.wecomId" class="wecom-clear" @click="clearWecom">
              <el-icon><CircleClose /></el-icon>
            </span>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              class="login-btn"
              size="large"
              :loading="loading"
              :disabled="!(form.username.trim() && form.password.trim())"
              @click="submit"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <label class="remember-box">
          <el-checkbox v-model="rememberMe">记住密码</el-checkbox>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.left-side {
  position: relative;
  flex: 1;
  background-image: url('../assets/images/login_ban.png'),
    linear-gradient(135deg, var(--login-g1) 0%, var(--login-g2) 100%);
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

/* 主题染色层：切换主题时登录插画随之协调变色 */
.left-side::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--login-tint);
  transition: background 0.35s ease;
  pointer-events: none;
}

.right-side {
  flex: 1;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 400px;
  padding: 40px;
  box-sizing: border-box;
}

.logo {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
}

.logo img {
  width: 40px;
  height: 40px;
  margin-right: 8px;
}

.system-name {
  color: #e540cc;
  font-size: 24px;
  font-weight: normal;
  white-space: nowrap;
}

.title {
  margin-bottom: 30px;
  color: var(--text-main);
  font-size: 30px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  line-height: 1.5;
}

.login-form :deep(.el-form-item) {
  position: relative;
  margin-bottom: 20px;
}

.wecom-select {
  width: 100%;
}

/* 下拉框自定义清空 ×：浮在右侧箭头左边 */
.wecom-clear {
  position: absolute;
  right: 34px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  font-size: 15px;
  color: var(--text-sub, #889aa4);
  cursor: pointer;
  z-index: 2;
}

.wecom-clear:hover {
  color: var(--primary-hover, #e540cc);
}

.login-btn {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  font-size: 15px;
}

.remember-box {
  display: flex;
  align-items: center;
  margin-top: 6px;
}

.show-pwd {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  font-size: 14px;
  color: #889aa4;
  cursor: pointer;
  user-select: none;
}

@media (max-width: 880px) {
  .left-side {
    display: none;
  }
}
</style>
