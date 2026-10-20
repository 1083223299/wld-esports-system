<template>
  <div class="container">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
        @search="handleSearch" @reset="handleReset">
      </SearchForm>
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 操作按钮栏 -->
      <div class="action-bar-fixed">
        <!-- 新增按钮：system:menu:add -->
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
          v-permission="'system:menu:add'">
          新增
        </el-button>
        <el-button type="info" icon="el-icon-sort" class="add-btn" @click="handleToggleExpandAll">
          展开/折叠
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" row-key="menuId" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }" :default-expand-all="isExpandAll"
          ref="menuTableRef" @selection-change="handleSelectionChange" class="xxxxx">
          <el-table-column prop="menuName" label="菜单名称" width="240">
            <template slot-scope="scope">
              <div class="menu-name-wrapper" :style="{ paddingLeft: scope.row.indent + 'px' }">
                <span :class="['menu-name', 'level-' + scope.row.level, 'type-' + scope.row.menuType]">
                  {{ scope.row.menuName }}
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="icon" label="图标" align="center" width="100">
            <template slot-scope="scope">
              <div class="icon-wrapper">
                <Item v-if="scope.row.icon" :icon="scope.row.icon" />
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="orderNum" label="排序" width="60" align="center"></el-table-column>
          <el-table-column prop="perms" label="权限标识" show-overflow-tooltip align="center"></el-table-column>
          <el-table-column prop="component" label="组件路径" show-overflow-tooltip align="center"></el-table-column>
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === '0' ? 'success' : 'warning'" size="small">
                {{ scope.row.status === '0' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180" align="center"></el-table-column>
          <el-table-column label="操作" fixed="right" width="180" align="center">
            <template slot-scope="scope">
              <div class="action-buttons">
                <!-- 编辑按钮：system:menu:edit -->
                <el-button v-permission="'system:menu:edit'" type="text" @click="handleEdit(scope.row)"
                  style="color: #9047f8">
                  编辑
                </el-button>
                <!-- 新增子菜单按钮：system:menu:add -->
                <el-button v-permission="'system:menu:add'" type="text" @click="handleAdd(scope.row)"
                  style="color: #9047f8">
                  新增
                </el-button>
                <!-- 删除按钮：system:menu:remove -->
                <el-button v-permission="'system:menu:remove'" type="text" @click="handleDelete(scope.row)"
                  style="color: #f56c6c">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 新增/编辑菜单弹窗 -->
    <el-dialog :title="drawerTitle" :visible.sync="drawerVisible" width="750px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="menu-dialog" @close="closeDrawer">
      <AddForm ref="addFormRef" :edit-data="editFormData" :menu-options="menuOptions" :submitting="submitting"
        @submit="handleFormSubmit" @cancel="closeDrawer" />
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import AddForm from "./components/Add-Form.vue";
import {
  getMenuList,
  deleteMenu,
  putMenuEdit,
  postMenuAdd,
} from "@/api/menu";
import { MenuhandleTree } from '@/utils';
// 导入菜单图标+标题子组件
import Item from '../../../layout/components/Sidebar/Item.vue'

export default {
  name: "MenuList",
  components: {
    SearchForm,
    AddForm,
    Item
  },
  data() {
    return {
      // ========== 搜索表单配置 ==========
      searchItems: [
        {
          type: "input",
          prop: "menuName",
          label: "菜单名称",
          placeholder: "请输入菜单名称",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择状态",
          options: [
            { label: "全部", value: "" },
            { label: "启用", value: "0" },
            { label: "停用", value: "1" },
          ],
          clearable: true,
        },
      ],

      // 筛选表单数据
      filterForm: {
        menuName: "",
        status: "",
      },

      // 表格数据
      tableData: [],
      loading: false,


      // 弹窗控制
      drawerVisible: false,
      drawerTitle: "新增菜单",

      // 编辑数据
      editFormData: {},
      submitting: false,
      currentRowId: null,

      // 展开/折叠
      isExpandAll: false,

      // 菜单选项（用于父级选择）
      menuOptions: [],

      // 选中行（如果需要多选功能）
      selectedRows: [],
      single: true,
      multiple: true,
    };
  },

  mounted() {
    this.fetchTableData();
  },

  methods: {

    // 获取菜单图标
    getMenuIcon(row) {
      if (row.icon) return row.icon;
      const iconMap = {
        'M': 'el-icon-folder-opened',
        'C': 'el-icon-document',
        'F': 'el-icon-setting'
      };
      return iconMap[row.menuType] || 'el-icon-menu';
    },

    // 获取菜单类型标签样式
    getMenuTypeTag(menuType) {
      const tagMap = {
        'M': 'warning',
        'C': 'success',
        'F': 'info'
      };
      return tagMap[menuType] || '';
    },

    // 获取菜单类型文本
    getMenuTypeText(menuType) {
      const textMap = {
        'M': '目录',
        'C': '菜单',
        'F': '按钮'
      };
      return textMap[menuType] || '';
    },

    // ========== 搜索/重置 ==========
    handleSearch(e) {
      if (e) {
        const formValues = { ...e };
        this.filterForm.menuName = formValues.menuName || "";
        this.filterForm.status = formValues.status || "";
        this.fetchTableData();
      }
    },

    handleReset() {
      this.filterForm = {
        menuName: "",
        status: "",
      };
      this.fetchTableData();
    },

    // ========== 数据请求 ==========
    async fetchTableData() {
      this.loading = true;
      try {
        const params = {
          menuName: this.filterForm.menuName,
          status: this.filterForm.status,
        };

        const filtered = this.$filterEmpty(params);
        const resData = await getMenuList(filtered);
        const res = resData.data;

        if (res) {
          const data = MenuhandleTree(res, 'menuId');
          this.tableData = data || [];
        }
      } catch (error) {
        console.error("获取菜单列表失败:", error);
        this.$message.error("获取菜单列表失败");
      } finally {
        this.loading = false;
      }
    },

    // ========== 表格选择 ==========
    handleSelectionChange(selection) {
      this.selectedRows = selection;
      this.single = selection.length !== 1;
      this.multiple = !selection.length;
    },

    // ========== 展开/折叠 ==========
    handleToggleExpandAll() {
      this.isExpandAll = !this.isExpandAll;
      this.toggleExpand(this.tableData, this.isExpandAll);
    },

    toggleExpand(data, expand) {
      data.forEach(item => {
        this.$refs.menuTableRef.toggleRowExpansion(item, expand);
        if (item.children && item.children.length > 0) {
          this.toggleExpand(item.children, expand);
        }
      });
    },

    // ========== 构建菜单选项树 ==========
    buildMenuOptions(data, excludeId = null) {
      // 深拷贝数据
      const cloneData = JSON.parse(JSON.stringify(data));

      // 递归过滤排除节点
      const filterExclude = (list, id) => {
        return list.filter(item => {
          if (item.menuId === id) {
            return false;
          }
          if (item.children && item.children.length > 0) {
            item.children = filterExclude(item.children, id);
          }
          return true;
        });
      };

      let filteredData = cloneData;
      if (excludeId) {
        filteredData = filterExclude(cloneData, excludeId);
      }

      // 添加根节点
      const rootMenu = { menuId: 0, menuName: '主类目', children: filteredData };
      return [rootMenu];
    },

    // ========== 新增/编辑 ==========
    // ========== 新增/编辑 ==========
    handleAdd(row) {
      this.drawerTitle = "新增菜单";
      this.currentRowId = null;

      if (row && row.menuId) {
        // 点击表格中的新增按钮（添加子菜单）
        this.menuOptions = this.buildMenuOptions(this.tableData, row.menuId);
        // 设置默认父级为当前行，并传递菜单名称
        this.editFormData = {
          parentId: row.menuId,
          parentName: row.menuName,  // 新增：传递父级菜单名称
          menuName: '',
          menuType: 'M',
          orderNum: 0,
          path: '',
          component: '',
          queryParam: '',
          isFrame: '1',
          isCache: '0',
          visible: '0',
          status: '0',
          perms: '',
          icon: ''
        };
      } else {
        // 点击顶部新增按钮
        this.menuOptions = this.buildMenuOptions(this.tableData, null);
        this.editFormData = {
          parentId: 0,
          parentName: '主类目',  // 新增：根节点名称
          menuName: '',
          menuType: 'M',
          orderNum: 0,
          path: '',
          component: '',
          queryParam: '',
          isFrame: '1',
          isCache: '0',
          visible: '0',
          status: '0',
          perms: '',
          icon: ''
        };
      }

      this.drawerVisible = true;

      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
          this.$refs.addFormRef.fillFormData(this.editFormData);
        }
      });
    },
    handleEdit(row) {
      this.drawerTitle = "修改菜单";
      this.currentRowId = row.menuId;

      // 构建菜单选项树（排除当前节点及其子节点）
      this.menuOptions = this.buildMenuOptions(this.tableData, row.menuId);

      // 先打开弹窗
      this.drawerVisible = true;

      // 等待弹窗渲染完成后，再填充表单数据
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          // 先重置表单
          this.$refs.addFormRef.resetForm();
          // 再填充数据
          this.$refs.addFormRef.fillFormData(row);
        }
      });
    },

    closeDrawer() {
      this.drawerVisible = false;
      this.editFormData = {};
      this.currentRowId = null;
      this.submitting = false;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.resetForm();
        }
      });
    },

    async handleFormSubmit(formData) {
      this.submitting = true;
      try {
        let res;
        if (this.currentRowId) {
          formData.menuId = this.currentRowId;
          const filtered = this.$filterEmpty(formData);
          res = await putMenuEdit(filtered);
          if (res.code === 200) {
            this.$message.success("修改成功");
          } else {
            this.$message.error(res.msg || "修改失败");
            return;
          }
        } else {
          const filtered = this.$filterEmpty(formData);
          res = await postMenuAdd(filtered);
          if (res.code === 200) {
            this.$message.success("新增成功");
          } else {
            this.$message.error(res.msg || "新增失败");
            return;
          }
        }
        this.closeDrawer();
        this.fetchTableData();
      } catch (error) {
        console.error("提交失败:", error);
        this.$message.error("提交失败");
      } finally {
        this.submitting = false;
      }
    },

    // ========== 删除 ==========
    async handleDelete(row) {
      this.$confirm("确定要删除选中的菜单吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          const res = await deleteMenu(row.menuId);
          if (res.code === 200) {
            this.$message.success("删除成功");
            this.fetchTableData();
          }
        } catch (error) {
          console.error("删除失败:", error);
          this.$message.error("删除失败");
        }
      }).catch(() => { });
    },
  },
};
</script>
<style scoped>
/* 页面容器 */
.container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 列表卡片 */
.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 操作栏 */
.action-bar-fixed {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 20px;
}

/* 表格包裹层 - 核心滚动区域 */
.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
  position: relative;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* ========== 菜单名称样式 ========== */
.menu-name-wrapper {
  display: flex;
  align-items: center;
  padding: 4px 0;
  transition: all 0.2s;
}

/* 让树形表格的展开列和内容列在同一行显示 */
::v-deep .el-table__expand-column {
  width: auto !important;
  vertical-align: middle !important;
}

::v-deep .el-table__expand-icon {
  position: relative;
  top: 0;
  margin-right: 8px;
  display: inline-block !important;
  vertical-align: middle !important;
}

::v-deep .el-table__row .el-table__cell:first-child .cell {
  display: flex;
  align-items: center;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}

/* 确保菜单名称容器可以换行 */
.menu-name-wrapper {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 4px 0;
  transition: all 0.2s;
  line-height: 1.4;
}

/* 菜单名称可以换行 */
.menu-name-wrapper .menu-name {
  white-space: normal;
  word-break: break-word;
  display: inline-block;
}
</style>