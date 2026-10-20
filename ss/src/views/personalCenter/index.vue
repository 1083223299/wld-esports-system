<!-- eslint-disable vue/html-self-closing -->
<template>
  <div class="profile-container">
    <!-- 头部标题 -->
    <div class="page-header"><div class="page-title">个人中心</div></div>
    <div class="profile-content">
      <!-- 头像区域 -->
      <div class="avatar-flex">
        <div class="avatar-wrapper">
          <el-upload
            class="avatar-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="beforeAvatarUpload"
            :http-request="handleAvatarUpload"
          >
            <img v-if="userInfo.urlLink" :src="userInfo.urlLink" class="avatar" @error="(e) => handleImgError(e)"/>
						<div v-else>
							<img src="@/assets/defaulIcon.png" class="avatar" />
              <!-- <i v-else class="el-icon-plus avatar-uploader-icon" /> -->
						</div>
						<i class="el-icon-camera-solid avatar-icon" />
						
            <!-- <div class="avatar-tips">点击更换头像</div> -->
          </el-upload>
        </div>

        <!-- 个人信息表单 -->
        <el-form :model="userInfo" class="info-form" :rules="emailRules">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="用户名称：">
                <el-input
                  v-model="userInfo.userName"
									placeholder="-"
                  disabled
                  class="info-input"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="手机号：">
                <div class="info-input phone-display-wrapper">
                  <PhoneDisplay :value="userInfo.phone" />
                </div>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="账号：">
                <el-input
                  v-model="userInfo.nickName"
									placeholder="-"
                  disabled
                  class="info-input"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12" class="info-email">
              <el-form-item label="邮箱：">
                <el-input
                  v-model="userInfo.email"
									placeholder="-"
                  class="info-input"
                  clearable
                  @blur="validateEmail"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="角色名称：">
                <el-input v-model="userInfo.remark" placeholder="-" disabled class="info-input" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="创建时间：">
                <el-input
                  v-model="userInfo.createTime"
                  placeholder="-"
                  disabled
                  class="info-input"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-button type="text" class="change-pwd-btn" @click="openChangePasswordDialog">修改密码</el-button>
        </el-form>
      </div>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button class="cancel-btn" @click="resetForm">取消</el-button>
        <el-button type="primary" class="save-btn" @click="saveForm">保存</el-button>
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <el-dialog
      title="修改密码"
      :visible.sync="dialogVisible"
      width="400px"
      :close-on-click-modal="false"
      class="custom-dialog"
    >
      <el-form
        ref="passwordForm"
        :model="passwordForm"
        :rules="passwordRules"
        class="pwd-form"
      >
        <el-form-item label="手机号">
          <div class="pwd-input phone-display-wrapper">
            <PhoneDisplay :value="passwordForm.phone" />
          </div>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            :key="passwordType1"
            :type="passwordType1"
            ref="password1"
            placeholder="请输入新密码"
            class="pwd-input"
          />
          <span class="show-pwd" @click="showPwd">
            <svg-icon :icon-class="passwordType1 === 'password' ? 'eye' : 'eye-open'" />
          </span>
        </el-form-item>
        <el-form-item label="确定密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            :key="passwordType2"
            :type="passwordType2"
            ref="password2"
            placeholder="请再次输入密码"
            class="pwd-input"
          />
          <span class="show-pwd" @click="showPwd2">
            <svg-icon :icon-class="passwordType2 === 'password' ? 'eye' : 'eye-open'" />
          </span>
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <el-row :gutter="10" width="100%">
            <el-col :span="14">
              <el-input
                v-model="passwordForm.code"
                placeholder="请输入验证码"
                class="pwd-input"
              ></el-input>
            </el-col>
            <el-col :span="10">
              <el-button
                :disabled="countDown > 0"
                class="verify-code-btn"
                @click="getcode"
              >
                {{ countDown > 0 ? `${countDown}秒后重新获取` : "获取验证码" }}
              </el-button>
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button class="dialog-cancel-btn" @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          class="dialog-confirm-btn"
          @click="submitPasswordChange"
        >确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
  import { photoCode, resetPassword, updateUser, fileUpload } from '@/api/user'
  import PhoneDisplay from "@/components/PhoneDisplay/index.vue"
  import { mapGetters } from 'vuex'
  import store from '../../store'
export default {
  name: "ProfileCenter",
  components: {
    PhoneDisplay,
  },
  data() {
    return {
      passwordType1: 'password', // 密码类型
			passwordType2: 'password', // 密码类型
      ossId: "",
      // 用户信息
      userInfo: {
        urlLink: "",
        nickName: "",
        phone: "",
        userName: "",
        email: "",
        remark: "",
        createTime: "",
      },
      // 原始用户信息，用于重置
      originalUserInfo: {},
      // 修改密码弹窗
      dialogVisible: false,
      // 密码表单
      passwordForm: {
        // nickName: "",
        phone: "",
        newPassword: "",
        confirmPassword: "",
        code: "",
      },
      emailRules: {
        email: [
          { required: true, message: "请输入邮箱地址", trigger: "blur" },
          { 
            type: 'email', 
            message: "邮箱格式错误，请重新输入", 
            trigger: "blur" 
          }
        ]
      },
      // 密码表单校验规则
      passwordRules: {
        newPassword: [
          { required: true, message: "请输入新密码", trigger: "blur" },
          {
            min: 6,
            max: 20,
            message: "密码长度在 6 到 20 个字符",
            trigger: "blur",
          },
        ],
        confirmPassword: [
          { required: true, message: "请再次输入密码", trigger: "blur" },
          { validator: this.validateConfirmPassword, trigger: "blur" },
        ],
        code: [
          { required: true, message: "请输入验证码", trigger: "blur" },
          // { len: 6, message: "验证码长度为6位", trigger: "blur" },
        ],
      },
      // 验证码倒计时
      countDown: 0,
      // 邮箱校验正则
      emailReg: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    };
  },
  created() {
    // 保存原始信息
    this.userInfo = this.userData ;
    this.originalUserInfo = { ...this.userInfo };
  },
  computed: {
    ...mapGetters([
      'userData',
    ])
  },
  methods: {
    // 处理图片加载失败（损坏/404/跨域等）
    handleImgError(e) {
      // 替换为默认头像的绝对/相对路径，和你v-else里的路径保持一致
      e.target.src = require('@/assets/defaulIcon.png')
      // 【可选】防止个别情况图片死循环加载（比如默认图也丢了）
      e.target.onerror = null
    },
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
    // 头像上传前校验
    beforeAvatarUpload(file) {
      const isImage = file.type.startsWith("image/");
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isImage) {
        this.$message.error("只能上传图片文件");
      }
      if (!isLt2M) {
        this.$message.error("图片大小不能超过 2MB");
      }
      return isImage && isLt2M;
    },
    // 头像上传处理
    handleAvatarUpload({ file, onSuccess }) {
      setTimeout(() => {
        // 转换为二进制数据
        // const binaryData = this.fileToBinary(file)
        const formData = new FormData()
        // const blob = new Blob([binaryData.arrayBuffer], { type: binaryData.type })
        formData.append('file', file)
        // formData.append('file', URL.createObjectURL(file))
        
        // 上传进度
        fileUpload(formData).then( (res) => {
          this.userInfo.urlLink = URL.createObjectURL(file)
          this.ossId = res.data.ossId
          onSuccess("success");
          // this.$message.success("头像上传成功");
        })
        console.log('上传接口', this.userInfo.urlLink);
        
      }, 1000);

    },
    
    // 邮箱校验
    validateEmail() {
      // if (!this.emailReg.test(this.userInfo.email)) {
      //   this.$message.error("邮箱格式错误，请重新输入");
      // }
    },
    // 确认密码校验
    validateConfirmPassword(rule, value, callback) {
      if (value !== this.passwordForm.newPassword) {
        callback(new Error("两次输入密码不一致"));
      } else {
        callback();
      }
    },
    // 打开修改密码弹窗
    openChangePasswordDialog() {
      this.passwordForm.phone = this.userInfo.phone
      // this.passwordForm.nickName = this.userInfo.nickName
      this.dialogVisible = true;
      this.$nextTick(() => {
        this.$refs.passwordForm.resetFields();
      });
    },
    // 获取验证码
    async getcode() {
      // 校验手机号（这里用示例手机号）
      if (!this.userInfo.phone) {
        this.$message.error("请先绑定手机号");
        return;
      }
      // 发送验证码
      await photoCode(this.userInfo.phone).then(() => {
        // this.userInfo.code = 9999; // response.SMS_CODE
        this.$message.success("验证码已发送");
        this.countDown = 60;
        const timer = setInterval(() => {
          this.countDown--;
          if (this.countDown <= 0) {
            clearInterval(timer);
          }
        }, 1000);
      })
      
      
    },
    // 提交密码修改
    async submitPasswordChange() {
      this.$refs.passwordForm.validate((valid) => {
        if (valid) {
          // 提交
          resetPassword(this.passwordForm).then( res => {
            console.log('提交表单', res)
            this.$message.success("密码修改成功，请重新登录");
            // this.$router.push("/login");
            this.$store.dispatch('user/logout')
            setTimeout(() => {
              this.$router.push("/login");
            }, 800);
            this.dialogVisible = false;
          })
        }
      });
    },
    // 重置表单
    resetForm() {
      this.userInfo = { ...this.originalUserInfo };
      this.$router.back()
      // this.$message.info("已重置为原始信息");
    },
    // 保存表单
    saveForm() {
      // 邮箱格式校验
      if (this.userInfo.email && !this.emailReg.test(this.userInfo.email)) {
        this.$message.error("邮箱格式错误，请重新输入");
        return;
      }
      // 保存接口
      let infos = {
        ...this.userInfo,
        avatar: this.ossId
      }
      updateUser(infos).then( () => {
        store.dispatch('user/getInfo')
        setTimeout(() => {
          this.originalUserInfo = { ...this.userInfo };
          this.$message.success("信息保存成功");
        }, 100);
      })
      
    },
  },
};
</script>

<style lang="scss" scoped>
/* 全局容器样式 */
.profile-container {
  padding: 30px 60px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  margin: 20px;
}
.profile-content {
  padding: 0 0;
	width: 80%;
}
/* 页面标题 */
.page-header {
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 30px;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  padding-left: 5px;
  border-left: #4D23D9 solid 3px;
}

/* 头像区域 */
.avatar-wrapper {
  margin-bottom: 40px;
	padding-right: 20px;
}
.avatar-flex {
  display: flex;
	justify-content: center;
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin-right: 20px;
  overflow: hidden;
}
.avatar img {
  width: 100%;
  height: 100%;
}
.avatar-text {
  font-size: 14px;
}
.avatar-uploader {
  width: 64px;
  height: 64px;
  /* border: 1px dashed #d9d9d9; */
  /* border-radius: 6px; */
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: #fafafa;
	position: relative;
	overflow: hidden;
}
.avatar-icon{
  position: absolute;
  bottom: 0;
  right: 0;
	color: #fff;
	background: rgba(0, 0, 0, 0.5);
	padding: 2px;
	border-radius: 8px 0 0 0;
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #9268f2;
  width: 64px;
  height: 64px;
  line-height: 64px;
  text-align: center;
}
.avatar {
  width: 64px;
  height: 64px;
  display: block;
  border-radius: 50%;
}
// .avatar-uploader:hover {
// }
.avatar-uploader:hover {
  border-color: #9268f2;
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #9268f2;
  width: 64px;
  height: 64px;
  line-height: 64px;
  text-align: center;
}
.avatar {
  width: 64px;
  height: 64px;
  display: block;
  border-radius: 6px;
  object-fit: cover;
}
.avatar-tips {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 28px;
  line-height: 28px;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}
.avatar-uploader:hover .avatar-tips {
  opacity: 1;
}

/* 信息表单 */
.info-form {
  margin-bottom: 40px;
	flex: 1;
	::v-deep.el-input__inner{
		border: 0;
    width: 100%;
    padding: 0;
	}
}
.info-input {
  --el-input-text-color: #666;
  --el-input-disabled-text-color: #666;
  --el-input-border-color: #e5e5e5;
  --el-input-hover-border-color: #9268f2;
  border-radius: 4px;
}

/* 操作按钮区域 */
.action-buttons {
  text-align: right;
  padding-right: 10px;
}
.change-pwd-btn {
  color: #9268f2 !important;
  font-size: 14px;
  margin-right: 20px;
	padding: 0;
}
.change-pwd-btn:hover {
  color: #7a4fdf !important;
}
.cancel-btn {
  --el-button-text-color: #666;
  --el-button-border-color: #e5e5e5;
  --el-button-hover-text-color: #333;
  --el-button-hover-border-color: #ccc;
  margin-right: 10px;
}
.save-btn {
  --el-button-primary-bg-color: #9268f2;
  --el-button-primary-border-color: #9268f2;
  --el-button-primary-hover-bg-color: #7a4fdf;
  --el-button-primary-hover-border-color: #7a4fdf;
}

/* 自定义弹窗样式 */
.custom-dialog {
  --el-dialog-header-text-color: #333;
  --el-dialog-content-color: #666;
}
.pwd-form {
  margin-top: 10px;
  ::v-deep .el-form-item {
      margin-bottom: 10px;
  }
}
.pwd-input {
  --el-input-border-color: #e5e5e5;
  --el-input-hover-border-color: #9268f2;
  border-radius: 4px;
}
// .verify-code-btn {
//   --el-button-text-color: #9268f2;
//   --el-button-border-color: #9268f2;
//   --el-button-hover-text-color: #fff;
//   --el-button-hover-bg-color: #9268f2;
//   --el-button-hover-border-color: #9268f2;
//   width: 100%;
// }
.verify-code-btn{
	width: 80PX;
	color: #6a35ff!important;
	padding: 0!important;
	font-size: 14px!important;
	border-radius: 6px!important;
	border: 1px solid #4D23D9!important;
	// padding: 9px 24px!important
}
.dialog-footer {
  text-align: right;
}
.dialog-cancel-btn {
  --el-button-text-color: #666;
  --el-button-border-color: #e5e5e5;
  margin-right: 10px;
}
.dialog-confirm-btn {
  --el-button-primary-bg-color: #9268f2;
  --el-button-primary-border-color: #9268f2;
  --el-button-primary-hover-bg-color: #7a4fdf;
  --el-button-primary-hover-border-color: #7a4fdf;
}
.el-button--primary {
  font-family: HelveticaNeue;
  font-size: 14px;
  color: #ffffff;
  /* line-height: 22px; */
  text-align: center;
  font-style: normal;
  background: #6a35ff;
  border-radius: 8px;
  width: 125px;
  height: 40px;
}
.el-button--default {
  font-family: HelveticaNeue;
  font-size: 14px;
  // color: #86909C;
  /* line-height: 22px; */
  text-align: center;
  font-style: normal;
  border-radius: 8px;
  // border: 1px solid #86909C;
  width: 125px;
  height: 40px;
}
.el-row{
	display: flex;
  width: 100%;
}
.el-col-14{
	
	width: 65.33333%;
}
.el-col-10{
	flex: 1;
}
.show-pwd {
  position: absolute;
  right: 10px;
  top: 45px;
  font-size: 10px;
  color: #889aa4;
  cursor: pointer;
  user-select: none;
}
::v-deep .el-dialog__body {
  padding: 0 20px 0 20px;
}
.info-form{
  ::v-deep .el-form-item {
    display: flex;
    background-color: #F5F7FA;
    border-radius: 8px;
    border: 1px solid #E4E7ED;
    padding: 0 0 0 15px;
  }
  ::v-deep .el-form-item__label {
    color: #C0C4CC!important;
    padding: 0;
  }
  ::v-deep .el-form-item__content {
    flex: 1;
  }
  .info-email{
    ::v-deep .el-form-item {
      background-color: #ffffff;
    }
    ::v-deep .el-form-item__label {
      color: #333!important;
    }
  }
  ::v-deep .el-input__suffix{
    color: #999;
  }
}
::v-deep .el-upload {
  display: inline-block;
  text-align: center;
  cursor: pointer;
  outline: 0;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: 6px;
  position: relative;
}
</style>
