<template>
  <div class="sidebar-logo-container" :class="{'collapse':collapse}">
    <transition name="sidebarLogoFade">
      <router-link v-if="collapse" key="collapse" class="sidebar-logo-link" to="/">
        <div class="title_logo2">
          <img v-if="logo" :src="logo" class="sidebar-logo" />
          <!-- <div class="future-hole-logo">
            <span class="logo-text">{{ title }}</span>
          </div> -->
        </div>
        <!-- <h1 v-else class="sidebar-title">{{ title }} </h1> -->
      </router-link>
      <router-link v-else key="expand" class="sidebar-logo-link" to="/">
        <div class="title_logo">
          <img v-if="logo" :src="logo" class="sidebar-logo" />
          <img v-if="logo2" :src="logo2" class="future-hole-logo" />
          <!-- <h1 class="sidebar-title">{{ title }} </h1> -->
          <!-- <div class="future-hole-logo">
            <span class="logo-text">{{ title }}</span>
          </div> -->
        </div>
      </router-link>
    </transition>
  </div>
</template>

<script>
import logoImg from '@/assets/logo.png'
import logoImg2 from '@/assets/logo1.png'
export default {
  name: 'SidebarLogo',
  props: {
    collapse: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      title: '未来洞',
      logo: logoImg,
      logo2: logoImg2
    }
  }
}
</script>

<style lang="scss" scoped>
.sidebarLogoFade-enter-active {
  transition: opacity 1.5s;
}

.sidebarLogoFade-enter,
.sidebarLogoFade-leave-to {
  opacity: 0;
}

.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: 80px;
  line-height: 80px;
  background: #ffffff;
  text-align: center;
  overflow: hidden;

  & .sidebar-logo-link {
    height: 100%;
    width: 100%;
    & .sidebar-logo {
      width: 38px;
      height: 38px;
      vertical-align: middle;
      margin-right: 12px;
      margin-left: 29px
    }

    & .sidebar-title {
      display: inline-block;
      margin: 0;
      color: #fff;
      font-weight: 600;
      line-height: 50px;
      font-size: 14px;
      vertical-align: middle;
    }
  }

  &.collapse {
    .sidebar-logo {
      margin-right: 0px;
      margin-left: 0px
    }
  }
}
.future-hole-logo {
  display: inline-flex;
  align-items: center;
  height: 22px;
}

.logo-text {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(90deg, #6A35FF 0%, #6A35FF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  // text-shadow: 0 2px 4px rgba(255, 106, 213, 0.3);
  letter-spacing: 2px;
  font-style: italic
}
.title_logo{
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  margin-top: 24px;
}
.title_logo2{
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  margin-top: 24px;
}
</style>
