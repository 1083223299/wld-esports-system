<template>
  <div class="channel-merchant-shell">
    <ChannelMerchantList
      v-show="currentView === 'list'"
      ref="listRef"
      @bind="handleOpenBind"
    />
    <BindGuild
      v-if="currentView === 'bind'"
      :merchant="currentMerchant"
      @back="handleBackToList"
    />
  </div>
</template>

<script>
import ChannelMerchantList from "./list.vue";
import BindGuild from "./bindGuild.vue";

export default {
  name: "ChannelMerchant",
  components: {
    ChannelMerchantList,
    BindGuild,
  },
  data() {
    return {
      currentView: "list",
      currentMerchant: null,
    };
  },
  methods: {
    handleOpenBind(row) {
      this.currentMerchant = row
        ? {
            id: row.id,
            channelNo: row.channelNo,
            name: row.name,
            userId: row.userId,
          }
        : null;
      this.currentView = "bind";
    },
    handleBackToList() {
      this.currentView = "list";
      this.currentMerchant = null;
      this.$nextTick(() => {
        if (this.$refs.listRef && this.$refs.listRef.fetchList) {
          this.$refs.listRef.fetchList();
        }
      });
    },
  },
};
</script>

<style scoped>
.channel-merchant-shell {
  height: 100%;
}
</style>
