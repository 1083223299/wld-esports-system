<template>
  <div class="forget-password-page">
    <!-- 左侧装饰区 -->
    <div class="left-section">
      <div class="illustration"></div>
    </div>

    <!-- 右侧表单区 -->
    <div class="right-section">
      <div class="form-container">
        <!-- 移除返回面包屑 -->
        <div class="title" @click="$router.push('/login')"><i class="el-icon-arrow-left"></i> 忘记密码</div>

        <el-form
          ref="forgetPwdForm"
          :model="forgetPwdForm"
          :rules="rules"
          class="forget-pwd-form"
          label-position="top"
        >
          <el-form-item label="手机号" prop="phone">
            <el-input
              v-model="forgetPwdForm.phone"
              placeholder="请输入您的手机号"
              clearable
            />
          </el-form-item>

          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="forgetPwdForm.newPassword"
              :key="passwordType1"
              :type="passwordType1"
							ref="password1"
              placeholder="请输入您的新密码"
/>
						<span class="show-pwd" @click="showPwd">
              <svg-icon :icon-class="passwordType1 === 'password' ? 'eye' : 'eye-open'" />
            </span>
          </el-form-item>

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="forgetPwdForm.confirmPassword"
              :key="passwordType2"
              :type="passwordType2"
							ref="password2"
              placeholder="请再次确认您的密码"
            />
						<span class="show-pwd" @click="showPwd2">
              <svg-icon :icon-class="passwordType2 === 'password' ? 'eye' : 'eye-open'" />
            </span>
          </el-form-item>

          <el-form-item label="验证码" prop="code">
            <div class="captcha-input-group">
              <el-input
                v-model="forgetPwdForm.code"
                placeholder="请输入验证码"
                clearable
              />
              <el-button
                type="text"
                :disabled="captchaBtnDisabled"
                @click="handleGetcode"
                class="code-btn"
              >
                {{ captchaBtnText }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :class="isFormComplete ? 'submit-btn' : 'submit-btn-disabled'"
              size="medium"
              :loading="submitting"
              @click="handleSubmit"
              :disabled="!isFormComplete"
            >
              确定
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 图形验证码弹窗 -->
    <el-dialog
      title="请完成图形验证码验证"
      :visible.sync="captchaDialogVisible"
      width="30%"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div class="popup-captcha">
        <img :src="popupCaptchaUrl" @click="refreshPopupCaptcha" alt="图形验证码" />
        <el-input
          v-model="popupCaptchaInput"
          placeholder="请输入图形验证码"
          clearable
          style="margin-top: 15px;"
        />
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="captchaDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="verifyPopupCaptcha">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
  import { photoCode, resetPassword } from '@/api/user'
export default {
  name: "ForgotPassword",
  data() {
    // 密码一致性校验
    const validatePasswordSame = (rule, value, callback) => {
      if (value !== this.forgetPwdForm.newPassword) {
        callback(new Error("两次密码输入不一致"));
      } else {
        callback();
      }
    };

    return {
			passwordType1: 'password', // 密码类型
			passwordType2: 'password', // 密码类型
      forgetPwdForm: {
        phone: "",
        newPassword: "",
        confirmPassword: "",
        code: ""
      },
      rules: {
        phone: [
          { required: true, message: "请输入手机号", trigger: "blur" },
          { min: 11, max: 11, message: "请输入正确的手机号", trigger: "blur" },
          { 
            pattern: /^1[3-9]\d{9}$/, 
            message: "请输入正确的手机号格式", 
            trigger: "blur" 
          }
        ],
        newPassword: [
          { required: true, message: "请输入新密码", trigger: "blur" },
          { min: 6, max: 20, message: "密码长度在 6 到 20 个字符", trigger: "blur" }
        ],
        confirmPassword: [
          { required: true, message: "请再次输入密码", trigger: "blur" },
          { validator: validatePasswordSame, trigger: "blur" }
        ],
        code: [{ required: true, message: "请输入验证码", trigger: "blur" }]
      },
      captchaBtnText: "获取验证码",
      captchaBtnDisabled: false,
      captchaCountdown: 60,
      countdownTimer: null, // 倒计时定时器，用于清除
      submitting: false,
      // 短信验证码错误次数
      smsErrorCount: 0,
      // 图形验证码弹窗相关
      captchaDialogVisible: false,
      popupCaptchaUrl: "",
      popupCaptchaInput: ""
    };
  },
  computed: {
    // 计算属性：判断表单是否填写完整
    isFormComplete() {
      const { phone, newPassword, confirmPassword, code } = this.forgetPwdForm;
      return !!phone && !!newPassword && !!confirmPassword && !!code;
    }
  },
  created() {
    this.refreshPopupCaptcha();
  },
  beforeDestroy() {
    // 组件销毁前清除倒计时定时器，防止内存泄漏
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },
  methods: {
		showPwd() {
      if (this.passwordType1 === 'password') {
        this.passwordType1 = ''
      } else {
        this.passwordType1 = 'password'
      }
      this.$nextTick(() => {
        this.$refs.password1.focus()
      })
    },
		showPwd2() {
      if (this.passwordType2 === 'password') {
        this.passwordType2 = ''
      } else {
        this.passwordType2 = 'password'
      }
      this.$nextTick(() => {
        this.$refs.password2.focus()
      })
    },
    // 刷新弹窗图形验证码
    refreshPopupCaptcha() {
      this.popupCaptchaUrl = `/api/captcha?timestamp=${new Date().getTime()}`;
      this.popupCaptchaInput = "";
    },

    // 获取短信验证码
    async handleGetcode() {
      // 1. 校验手机号
      const valid = await this.$refs.forgetPwdForm.validateField(["phone"]);
      if (!valid)
      if (!this.forgetPwdForm.phone) return
      
      // 2. 错误次数 >=3 时，先弹出图形验证码弹窗
      if (this.smsErrorCount >= 3) {
        this.captchaDialogVisible = true;
        return;
      }

      // 3. 直接发送短信验证码
      this.sendSmsCode();
    },

    // 验证弹窗图形验证码
    async verifyPopupCaptcha() {
      if (!this.popupCaptchaInput) {
        this.$message.warning("请输入图形验证码");
        return;
      }

      try {
        // 调用后端接口验证图形验证码
        // await photoCode(this.forgetPwdForm.phone).then(response => {
        //   this.forgetPwdForm.code = 9999; // response.SMS_CODE
        // })
        this.captchaDialogVisible = false;
        // 验证通过后发送短信验证码
        this.sendSmsCode();
      } catch (error) {
        this.$message.error("图形验证码错误，请重试");
        this.refreshPopupCaptcha();
      }
    },

    // 发送短信验证码
    async sendSmsCode() {
      try {
        this.captchaBtnDisabled = true;
        // 发送验证码接口
        await photoCode(this.forgetPwdForm.phone).then(() => {
          // this.forgetPwdForm.code = 9999; // response.SMS_CODE
        })
        this.$message.success("验证码已发送");
        this.startCountdown();
      } catch (error) {
        this.captchaBtnDisabled = false;
      }
    },

    // 完善的验证码倒计时逻辑
    startCountdown() {
      // 先清除之前的定时器，防止多个定时器同时运行
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
      }
      
      // 重置倒计时数值
      this.captchaCountdown = 60;
      this.captchaBtnText = `${this.captchaCountdown}秒后重新获取`;
      
      // 启动新的定时器
      this.countdownTimer = setInterval(() => {
        this.captchaCountdown--;
        this.captchaBtnText = `${this.captchaCountdown}秒后重新获取`;
        
        // 倒计时结束
        if (this.captchaCountdown <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null; // 清空定时器引用
          this.captchaBtnText = "重新获取验证码";
          this.captchaBtnDisabled = false;
        }
      }, 1000);
    },

    // 提交表单
    async handleSubmit() {
      try {
        await this.$refs.forgetPwdForm.validate();
        this.submitting = true;

        // 调用后端重置密码接口
        await resetPassword(this.forgetPwdForm).then( res => {
          console.log('提交表单', res)
          this.$message.success("密码修改成功，即将跳转到登录页");
          setTimeout(() => {
            this.$router.push("/login");
          }, 1000);
        })

        
      } catch (error) {
        if (error.response?.data?.message === "验证码错误") {
          this.$message.error("验证码错误");
          this.smsErrorCount++; // 短信验证码错误次数+1
        }
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
$dark_gray:#889aa4;
.forget-password-page {
  display: flex;
  height: 100vh;
}

.left-section {
  background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%);
  flex: 1;
  background-image: url("../../assets/login_img/login_ban.png");
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
}

.right-section {
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
}

.form-container {
  width: 100%;
  max-width: 400px;
  // padding: 40px;
  // background: white;
  // border-radius: 8px;
  // box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  
  .title {
		font-weight: 500;
		font-size: 16px;
		color: #333333;
		line-height: 22px;
		text-align: left;
		font-style: normal;
		// margin-bottom: 35px;
		cursor: pointer;
  }
}

.captcha-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
  
  .code-btn {
    color: #6a35ff;
    padding: 0;
    font-size: 14px;
		border-radius: 6px;
		border: 1px solid #4D23D9;
		padding: 9px 24px
  }
	::v-deep .el-input__inner {
		width: 100%;
	}
	.el-input {
    flex: 1;
    display: block;
}
}

.popup-captcha {
  text-align: center;
  img {
    width: 120px;
    height: 45px;
    border-radius: 4px;
    cursor: pointer;
  }
}

.submit-btn {
  background-color: #6a35ff;
  border-radius: 8px !important;
  height: 40px;
  width: 100%;
  border: none;
}
.submit-btn-disabled {
  background-color: #e7deff;
  border-radius: 8px !important;
  height: 40px;
  width: 100%;
  border: none;
  cursor: not-allowed;
}

.el-form-item__label {
  line-height: 0 !important;
  margin-bottom: 8px;
  color: #666;
}

// 隐藏密码输入框的眼睛图标（彻底移除星号相关）
::v-deep .el-input__suffix-inner {
  display: none;
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
::v-deep .el-form--label-top .el-form-item__label {
  padding: 0;
}
.el-form-item{
	margin-top: 32px;
}
::v-deep .el-form-item__label{
	line-height: 0;
	margin-bottom: 7px;
	font-weight: 500;
	font-size: 14px;
	color: #333333;
	line-height: 22px;
	text-align: left;
	font-style: normal;
}
::v-deep .el-form-item{
	margin-top: 26px;
}
</style>
