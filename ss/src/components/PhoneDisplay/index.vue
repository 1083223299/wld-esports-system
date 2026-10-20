<template>
  <span class="phone-display">
    <span>{{ displayPhone }}</span>
    <i
      v-if="showToggle"
      class="el-icon-view phone-display__icon"
      :class="{ 'is-active': visible }"
      @click.stop="toggleVisible"
    />
  </span>
</template>

<script>
export default {
  name: "PhoneDisplay",
  props: {
    value: {
      type: [String, Number],
      default: "",
    },
  },
  data() {
    return {
      visible: false,
    };
  },
  computed: {
    normalizedPhone() {
      if (this.value === null || this.value === undefined) {
        return "";
      }
      return String(this.value).trim();
    },
    currentUser() {
      return this.$store.getters.userData || {};
    },
    isSuperAdmin() {
      return Number(this.currentUser.userId) === 1;
    },
    showToggle() {
      return this.isSuperAdmin && this.canMask;
    },
    canMask() {
      return /^\d{11}$/.test(this.normalizedPhone);
    },
    maskedPhone() {
      if (!this.normalizedPhone) {
        return "-";
      }
      if (!this.canMask) {
        return this.normalizedPhone;
      }
      return `${this.normalizedPhone.slice(0, 3)}****${this.normalizedPhone.slice(7)}`;
    },
    displayPhone() {
      if (!this.normalizedPhone) {
        return "-";
      }
      if (!this.isSuperAdmin) {
        return this.normalizedPhone;
      }
      return this.visible ? this.normalizedPhone : this.maskedPhone;
    },
  },
  methods: {
    toggleVisible() {
      if (!this.showToggle) {
        return;
      }
      this.visible = !this.visible;
    },
  },
};
</script>

<style scoped lang="scss">
.phone-display {
  display: inline-flex;
  align-items: center;
}

.phone-display__icon {
  margin-left: 8px;
  font-size: 14px;
  color: #c0c4cc;
  cursor: pointer;
}

.phone-display__icon.is-active {
  color: #409eff;
}
</style>
