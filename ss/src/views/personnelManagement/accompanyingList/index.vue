<template>
  <div class="container">
    <!-- 陪陪邀请记录 -->
    <template v-if="activePage === 'invitation'">
      <InvitationRecord @back="activePage = 'list'" />
    </template>

    <!-- 陪陪列表 -->
    <template v-else>
      <!-- Tab切换栏 -->
      <div class="tab-bar">
        <span
          class="tab-item"
          :class="{ active: activeTab === 'active' }"
          @click="activeTab = 'active'"
          >在职陪玩</span
        >
        <span
          class="tab-item"
          :class="{ active: activeTab === 'exit' }"
          @click="activeTab = 'exit'"
          >退出记录</span
        >
      </div>

      <!-- 在职陪玩 -->
      <template v-if="activeTab === 'active'">
        <!-- keep-alive 缓存指定组件，include 对应子组件 name -->
        <keep-alive :include="['UnionCompanionList', 'AddCompanion']">
          <component
            :is="currentComponent"
            ref="dynamicComponent"
            @switch-to-list="handleSwitchToList"
            @switch-to-add="handleSwitchToAdd"
            @refresh-list="handleRefreshList"
          ></component>
        </keep-alive>
      </template>

      <!-- 退出记录 -->
      <template v-else>
        <ExitRecordSimple />
      </template>
    </template>
  </div>
</template>

<script>
// 导入子组件
import UnionCompanionList from "./list.vue";
import AddCompanion from "./add.vue";
import InvitationRecord from "../invitationRecord/index.vue";
import ExitRecordSimple from "./exitRecordSimple.vue";
export default {
  name: "UnionSupport",
  components: {
    UnionCompanionList,
    AddCompanion,
    InvitationRecord,
    ExitRecordSimple,
  },
  data() {
    return {
      activeTab: "active",
      activePage: "list", // 'list' 列表页 | 'invitation' 邀请记录页
      // 当前显示的组件
      currentComponent: "UnionCompanionList",
      // 父子组件共享数据（用于编辑传参）
      sharedData: {
        editId: null,
        editRow: null,
      },
      isAddBack: false,
    };
  },
  methods: {
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
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
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
  transition: color 0.2s;
  user-select: none;

  &:hover {
    color: #6a35ff;
  }

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

.exit-record-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.exit-record-placeholder {
  font-size: 14px;
  color: #909399;
}
</style>
