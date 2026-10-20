<template>
  <el-form ref="addFormRef" :model="form" :rules="rules" label-width="100px" class="Form" label-position="left">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-form-item label="上级菜单">
          <el-popover v-model="showTree" ref="popover" placement="bottom-start" width="300" trigger="click"
            popper-class="tree-select-popover">
            <!-- 树形内容 -->
            <el-tree ref="tree" :data="menuOptions" :props="treeProps" :node-key="'menuId'" :default-expand-all="false"
              :highlight-current="true" :current-node-key="form.parentId" @node-click="handleNodeClick"
              style="max-height: 300px; overflow-y: auto" />
            <!-- 触发元素 -->
            <el-input slot="reference" v-model="selectedLabel" placeholder="请选择菜单" readonly clearable />
          </el-popover>
        </el-form-item>
      </el-col>
      <el-col :span="24">
        <el-form-item label="菜单类型" prop="menuType">
          <el-radio-group v-model="form.menuType">
            <el-radio label="M">目录</el-radio>
            <el-radio label="C">菜单</el-radio>
            <el-radio label="F">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="24" v-if="form.menuType !== 'F'">
        <el-form-item label="菜单图标" prop="icon">
          <div class="icon-input-wrapper">
            <div class="icon-preview">
              <i :class="form.icon || 'el-icon-menu'"></i>
            </div>
            <el-input v-model="form.icon" placeholder="请输入图标class" class="icon-input" />
          </div>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="菜单名称" prop="menuName">
          <el-input v-model="form.menuName" placeholder="请输入菜单名称" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="显示排序" prop="orderNum">
          <el-input-number v-model="form.orderNum" controls-position="right" :min="0" />
        </el-form-item>
      </el-col>
      <el-col :span="12" v-if="form.menuType !== 'F'">
        <el-form-item>
          <template slot="label">
            <span>
              <el-tooltip content="选择是外链则路由地址需要以`http(s)://`开头" placement="top">
                <i class="el-icon-question"></i>
              </el-tooltip>
              是否外链
            </span>
          </template>
          <el-radio-group v-model="form.isFrame">
            <el-radio label="0">是</el-radio>
            <el-radio label="1">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="12" v-if="form.menuType !== 'F'">
        <el-form-item prop="path">
          <template slot="label">
            <span>
              <el-tooltip content="访问的路由地址，如：`user`，如外网地址需内链访问则以`http(s)://`开头" placement="top">
                <i class="el-icon-question"></i>
              </el-tooltip>
              路由地址
            </span>
          </template>
          <el-input v-model="form.path" placeholder="请输入路由地址" />
        </el-form-item>
      </el-col>
      <el-col :span="12" v-if="form.menuType === 'C'">
        <el-form-item prop="component">
          <template slot="label">
            <span>
              <el-tooltip content="访问的组件路径，如：`system/user/index`，默认在`views`目录下" placement="top">
                <i class="el-icon-question"></i>
              </el-tooltip>
              组件路径
            </span>
          </template>
          <el-input v-model="form.component" placeholder="请输入组件路径" />
        </el-form-item>
      </el-col>
      <el-col :span="12" v-if="form.menuType !== 'M'">
        <el-form-item>
          <el-input v-model="form.perms" placeholder="请输入权限标识" maxlength="100" />
          <template slot="label">
            <span>
              <el-tooltip content="控制器中定义的权限字符，如：@SaCheckPermission('system:user:list')" placement="top">
                <i class="el-icon-question"></i>
              </el-tooltip>
              权限字符
            </span>
          </template>
        </el-form-item>
      </el-col>
      <el-col :span="12" v-if="form.menuType === 'C'">
        <el-form-item>
          <el-input v-model="form.queryParam" placeholder="请输入路由参数" maxlength="255" />
          <template slot="label">
            <span>
              <el-tooltip content='访问路由的默认传递参数，如：`{"id": 1, "name": "ry"}`' placement="top">
                <i class="el-icon-question"></i>
              </el-tooltip>
              路由参数
            </span>
          </template>
        </el-form-item>
      </el-col>
      <el-col :span="12" v-if="form.menuType === 'C'">
        <el-form-item>
          <template slot="label">
            <span>
              <el-tooltip content="选择是则会被`keep-alive`缓存，需要匹配组件的`name`和地址保持一致" placement="top">
                <i class="el-icon-question"></i>
              </el-tooltip>
              是否缓存
            </span>
          </template>
          <el-radio-group v-model="form.isCache">
            <el-radio label="0">缓存</el-radio>
            <el-radio label="1">不缓存</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="12" v-if="form.menuType !== 'F'">
        <el-form-item>
          <template slot="label">
            <span>
              <el-tooltip content="选择隐藏则路由将不会出现在侧边栏，但仍然可以访问" placement="top">
                <i class="el-icon-question"></i>
              </el-tooltip>
              显示状态
            </span>
          </template>
          <el-radio-group v-model="form.visible">
            <el-radio label="0">显示</el-radio>
            <el-radio label="1">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item>
          <template slot="label">
            <span>
              <el-tooltip content="选择停用则路由将不会出现在侧边栏，也不能被访问" placement="top">
                <i class="el-icon-question"></i>
              </el-tooltip>
              菜单状态
            </span>
          </template>
          <el-radio-group v-model="form.status">
            <el-radio label="0">启用</el-radio>
            <el-radio label="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
    </el-row>
    <div class="form-footer">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交
      </el-button>
    </div>
  </el-form>
</template>
<script>
export default {
  name: "MenuForm",
  props: {
    editData: {
      type: Object,
      default: () => ({}),
    },
    menuOptions: {
      type: Array,
      default: () => [],
    },
    submitting: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      treeProps: {
        label: 'menuName',
        children: 'children'
      },
      showTree: false,
      selectedLabel: '',
      form: {
        menuId: undefined,
        parentId: 0,
        menuName: "",
        menuType: "M",
        orderNum: 0,
        path: "",
        component: "",
        queryParam: "",
        isFrame: "1",
        isCache: "0",
        visible: "0",
        status: "0",
        perms: "",
        icon: "",
      },
      rules: {
        menuName: [
          { required: true, message: "菜单名称不能为空", trigger: "blur" },
        ],
        orderNum: [
          { required: true, message: "显示排序不能为空", trigger: "blur" },
        ],
        path: [
          { required: true, message: "路由地址不能为空", trigger: "blur" },
        ],
      },
    };
  },
  watch: {
    // 监听 menuOptions 变化，更新树形选择器的高亮
    menuOptions: {
      handler() {
        this.$nextTick(() => {
          if (this.$refs.tree && this.form.parentId) {
            this.$refs.tree.setCurrentKey(this.form.parentId);
          }
        });
      },
      deep: true
    }
  },
  methods: {
    handleCancel() {
      this.$emit("cancel");
    },

    handleNodeClick(data) {
      this.form.parentId = data.menuId;
      this.selectedLabel = data.menuName;
      this.showTree = false;
    },

    handleSubmit() {
      this.$refs.addFormRef.validate((valid) => {
        if (valid) {
          this.$emit("submit", this.form);
        } else {
          return false;
        }
      });
    },

    resetForm() {
      this.form = {
        menuId: undefined,
        parentId: 0,
        menuName: "",
        menuType: "M",
        orderNum: 0,
        path: "",
        component: "",
        queryParam: "",
        isFrame: "1",
        isCache: "0",
        visible: "0",
        status: "0",
        perms: "",
        icon: "",
      };
      this.selectedLabel = '';
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.clearValidate();
        }
      });
    },

    fillFormData(data) {
      if (data) {
        this.form = {
          menuId: data.menuId,
          parentId: data.parentId !== undefined ? data.parentId : 0,
          menuName: data.menuName || "",
          menuType: data.menuType || "M",
          orderNum: data.orderNum || 0,
          path: data.path || "",
          component: data.component || "",
          queryParam: data.queryParam || "",
          isFrame: data.isFrame ? String(data.isFrame) : "1",
          isCache: data.isCache ? String(data.isCache) : "0",
          visible: data.visible ? String(data.visible) : "0",
          status: data.status ? String(data.status) : "0",
          perms: data.perms || "",
          icon: data.icon || "",
        };

        // 直接使用父组件传递的 parentName 设置选中标签
        if (data.parentName !== undefined) {
          this.selectedLabel = data.parentName;
        } else if (this.form.parentId === 0) {
          this.selectedLabel = '主类目';
        } else {
          // 兜底：根据 parentId 查找
          this.setSelectedLabelByParentId(this.form.parentId);
        }

        // 设置树形选择器的高亮
        this.$nextTick(() => {
          if (this.$refs.tree && this.form.parentId) {
            this.$refs.tree.setCurrentKey(this.form.parentId);
          }
        });
      }
    },

    setSelectedLabelByParentId(parentId) {
      if (parentId === 0) {
        this.selectedLabel = '主类目';
        return;
      }

      if (!this.menuOptions || this.menuOptions.length === 0) {
        this.selectedLabel = '';
        return;
      }

      const findMenuName = (list, id) => {
        for (const item of list) {
          if (item.menuId === id) {
            return item.menuName;
          }
          if (item.children && item.children.length > 0) {
            const result = findMenuName(item.children, id);
            if (result) return result;
          }
        }
        return null;
      };

      const menuName = findMenuName(this.menuOptions, parentId);
      this.selectedLabel = menuName || '';
    }
  },
};
</script>

<style scoped>
.Form {
  padding: 20px;
}

.form-footer {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.form-footer .el-button {
  width: 120px;
}

.tree-select-popover {
  max-height: 300px;
  overflow-y: auto;
}

/* 图标输入框样式 */
.icon-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.icon-preview {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  font-size: 20px;
  transition: all 0.3s;
  flex-shrink: 0;
}

.icon-preview i {
  font-size: 20px;
}

.icon-input {
  flex: 1;
}

.icon-input :deep(.el-input__inner) {
  border-radius: 4px;
}
</style>