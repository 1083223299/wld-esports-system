<template>
  <div class="container">
    <!-- Tab 栏 -->
    <div class="tab-bar">
      <div
        class="tab-item"
        :class="{ active: activeTab === 'active' }"
        @click="activeTab = 'active'"
      >
        在职陪玩
      </div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'exit' }"
        @click="activeTab = 'exit'"
      >
        退出记录
      </div>
    </div>

    <!-- 在职陪玩 -->
    <template v-if="activeTab === 'active'">
      <InvitationRecord
        v-if="activePage === 'invitation'"
        @back="activePage = 'list'"
      />
      <ExitRecord
        v-else-if="activePage === 'exitRecord'"
        @back="activePage = 'list'"
      />
      <template v-else>
        <keep-alive>
          <UnionCompanionList
            v-if="currentComponent === 'UnionCompanionList'"
          />
        </keep-alive>
        <AddCompanion
          v-if="currentComponent === 'AddCompanion'"
          :isBack="isAddBack"
          :sharedData="sharedData"
        />
      </template>
    </template>

    <!-- 退出记录 -->
    <div v-else-if="activeTab === 'exit'" style="height: 100%">
      <ExitRecord />
    </div>
  </div>
</template>

<script>
// 导入子组件
import UnionCompanionList from "./list.vue";
import AddCompanion from "./add.vue";
import InvitationRecord from "./invitationRecord.vue";
import ExitRecord from "./exitRecord.vue";
export default {
  name: "UnionSupport",
  components: {
    UnionCompanionList,
    AddCompanion,
    InvitationRecord,
    ExitRecord,
  },
  data() {
    return {
      // 当前显示的组件
      currentComponent: "UnionCompanionList",
      // 父子组件共享数据（用于编辑传参）
      sharedData: {
        editId: null,
        editRow: null,
      },
      isAddBack: false,
      activePage: "list",
      activeTab: "active",
    };
  },
  mounted() {
    this.applyRouteQuery();
  },
  activated() {
    this.applyRouteQuery();
  },
  watch: {
    "$route.query.page"() {
      this.applyRouteQuery();
    },
  },
  methods: {
    applyRouteQuery() {
      if (this.$route && this.$route.query.page === "invitation") {
        this.activeTab = "active";
        this.activePage = "invitation";
      }
    },
    // 切换到列表页
    handleSwitchToList(e) {
      this.isAddBack = e;
      this.currentComponent = "UnionCompanionList";
    },
    // 切换到新增/编辑页
    handleSwitchToAdd(row = null) {
      if (row) {
        this.sharedData.editId = row.userId;
        this.sharedData.editRow = row;
      } else {
        this.sharedData.editId = null;
        this.sharedData.editRow = null;
      }
      this.currentComponent = "AddCompanion";
    },
    // 刷新列表数据
    handleRefreshList() {
      const listComp = this.$refs.dynamicComponent;
      if (listComp && listComp.fetchTableData) {
        listComp.fetchTableData();
      }
    },
  },
  // 向子组件注入方法和数据
  provide() {
    return {
      switchToList: this.handleSwitchToList,
      switchToAdd: this.handleSwitchToAdd,
      getSharedData: () => this.sharedData,
      getSharedRefresh: () => this.isAddBack, // 是否刷新列表数据
    };
  },
};
</script>

<style scoped lang="scss">
.container {
  height: 100%;
  padding: 20px;
}
.tab-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 20px 16px;
  flex-shrink: 0;
}
.tab-item {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  cursor: pointer;
  padding-bottom: 10px;
  position: relative;

  &.active {
    color: #6a35ff;
    font-weight: 600;

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: #6a35ff;
      border-radius: 2px 2px 0 0;
    }
  }
}

.tab-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
