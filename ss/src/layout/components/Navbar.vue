<template>
  <div class="navbar">
    <Breadcrumb class="breadcrumb-container" />

    <div class="right-menu">
      <InviteCodeBadge v-if="userData.inviteCode" />
      <div class="user-name">账户：<PhoneDisplay :value="name" /></div>
      <div class="avatar-wrapper">
        <el-upload
          class="avatar-uploader"
          action="#"
          :show-file-list="false"
          :before-upload="beforeAvatarUpload"
          :http-request="handleAvatarUpload"
        >
          <img
            v-if="avatar + '?imageView2/1/w/80/h/80'"
            :src="avatar + '?imageView2/1/w/80/h/80'"
            class="avatar"
            @error="(e) => handleImgError(e)"
          />
          <div v-else>
            <img src="@/assets/defaulIcon.png" class="avatar" />
          </div>
          <i class="el-icon-camera-solid avatar-icon" />
        </el-upload>
      </div>
      <el-dropdown class="avatar-container" trigger="hover">
        <div class="avatar-wrapper">
          <div class="user-introduction">{{ introduction }}</div>
          <i class="el-icon-arrow-down user-icon" />
        </div>
        <el-dropdown-menu slot="dropdown" class="user-dropdown">
          <div @click="handlePersonalCenter">
            <el-dropdown-item>个人中心</el-dropdown-item>
          </div>
          <el-dropdown-item divided @click.native="logout">
            <span style="display: block">退出登录</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <NotificationCenter class="right-menu-item" />
    </div>
  </div>
</template>

<script>
import { updateUser, fileUpload } from "@/api/user";
import { mapGetters } from "vuex";
import Breadcrumb from "@/components/Breadcrumb";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import NotificationCenter from "./NotificationCenter/index.vue";
import InviteCodeBadge from "./InviteCodeBadge/index.vue";

export default {
  components: {
    Breadcrumb,
    PhoneDisplay,
    NotificationCenter,
    InviteCodeBadge,
  },
  data() {
    return {
      userInfo: {
        urlLink: "",
        nickName: "",
        phone: "",
        userName: "",
        email: "",
        remark: "",
        createTime: "",
      },
    };
  },
  computed: {
    ...mapGetters(["userData", "avatar", "name", "introduction"]),
  },
  methods: {
    handleImgError(e) {
      e.target.src = require("@/assets/defaulIcon.png");
      e.target.onerror = null;
    },
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
    handleAvatarUpload({ file, onSuccess }) {
      this.userInfo = this.userData;
      const formData = new FormData();
      formData.append("file", file);

      fileUpload(formData).then((res) => {
        this.userInfo.urlLink = URL.createObjectURL(file);
        onSuccess("success");
        let infos = {
          ...this.userInfo,
          avatar: res.data.ossId,
        };
        updateUser(infos).then(() => {
          this.$store.dispatch("user/getInfo");
          setTimeout(() => {
            this.$message.success("头像上传成功");
          }, 100);
        });
      });
    },
    isMobile(name) {
      const mobileReg = /^1[3-9]\d{9}$/;
      if (!name || typeof name !== "string") return false;
      return mobileReg.test(name.trim());
    },
    handlePersonalCenter() {
      this.$router.push({
        name: "PersonalCenter",
        params: {},
      });
    },
    toggleSideBar() {
      this.$store.dispatch("app/toggleSideBar");
    },
    async logout() {
      await this.$store.dispatch("user/logout");
      this.$router.push("/login");
    },
  },
};
</script>

<style lang="scss" scoped>
.navbar {
  height: 80px;
  overflow: hidden;
  position: relative;
  background: #fff;
  padding: 15px 0;
  display: flex;
  align-items: center;

  .breadcrumb-container {
    float: left;
    margin-left: 22px;
    display: flex;
    align-items: flex-end;
    flex: 1;
  }

  .right-menu {
    float: right;
    height: 100%;
    line-height: 50px;
    display: flex;
    align-items: center;

    &:focus {
      outline: none;
    }

    .right-menu-item {
      display: inline-block;
      padding: 0 8px;
      height: 100%;
      font-size: 18px;
      color: #5a5e66;
      vertical-align: text-bottom;
      margin-right: 30px;

      &.hover-effect {
        cursor: pointer;
        transition: background 0.3s;

        &:hover {
          background: rgba(0, 0, 0, 0.025);
        }
      }
    }

    .avatar-container {
      .avatar-wrapper {
        position: relative;
        display: flex;
        align-items: center;

        .user-introduction {
          margin: 0 8px 0 12px;
          color: #343c6a;
        }

        .user-icon {
          color: #a1a7ad;
          font-size: 19px;
        }
      }
    }
  }
}

.user-name {
  overflow-wrap: break-word;
  color: rgba(106, 53, 255, 1);
  font-size: 16px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  margin-right: 55px;
}

.avatar-flex {
  display: flex;
  justify-content: center;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 20px;
  overflow: hidden;
  display: block;
  object-fit: cover;
}

.avatar img {
  width: 100%;
  height: 100%;
}

.avatar-uploader {
  width: 40px;
  height: 40px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: #fafafa;
}

.avatar-icon {
  position: absolute;
  bottom: 0;
  right: 0px;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 4px 4px 2px;
  border-radius: 8px 0 0 0;
  font-size: 14px;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #9268f2;
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
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

.user-avatar {
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #343c6a;
  font-size: 14px;
}

::v-deep .el-upload {
  display: inline-block;
  text-align: center;
  cursor: pointer;
  outline: 0;
  width: 40px;
  height: 40px;
  overflow: hidden;
  border-radius: 50%;
  position: relative;
}
</style>
