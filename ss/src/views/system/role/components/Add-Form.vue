<template>
  <el-form ref="addFormRef" :model="form" :rules="rules" label-width="100px" class="Form" label-position="left">
    <el-form-item label="角色名称" prop="roleName">
      <el-input v-model="form.roleName" placeholder="请输入角色名称" />
    </el-form-item>
    <el-form-item prop="roleKey">
      <template slot="label">
        <span>
          <el-tooltip content="控制器中定义的权限字符，如：@SaCheckRole('admin')" placement="top">
            <i class="el-icon-question"></i>
          </el-tooltip>
          权限字符
        </span>
      </template>
      <el-input v-model="form.roleKey" placeholder="请输入权限字符" />
    </el-form-item>
    <el-form-item label="角色顺序" prop="roleSort">
      <el-input-number v-model="form.roleSort" controls-position="right" :min="0" />
    </el-form-item>
    <el-form-item label="状态">
      <el-radio-group v-model="form.status">
        <el-radio label="0">启用</el-radio>
        <el-radio label="1">禁用</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="菜单权限">
      <el-checkbox v-model="menuExpand" @change="handleCheckedTreeExpand">展开/折叠</el-checkbox>
      <el-checkbox v-model="menuNodeAll" @change="handleCheckedTreeNodeAll">全选/全不选</el-checkbox>
      <el-checkbox v-model="form.menuCheckStrictly" @change="handleCheckedTreeConnect">父子联动</el-checkbox>
      <el-tree ref="menuRef" class="tree-border" :data="menuOptions" show-checkbox node-key="id"
        :check-strictly="!form.menuCheckStrictly" empty-text="加载中，请稍候" :props="{ label: 'label', children: 'children' }"
        :default-checked-keys="checkedKeys"></el-tree>
    </el-form-item>
    <el-form-item label="备注">
      <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
    </el-form-item>
    <div class="form-footer">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
    </div>
  </el-form>
</template>

<script>
export default {
  name: "RoleForm",
  props: {
    editData: {
      type: Object,
      default: () => ({}),
    },
    menuOptions: {
      type: Array,
      default: () => [],
    },
    checkedKeys: {
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
      form: {
        roleId: undefined,
        roleName: "",
        roleKey: "",
        roleSort: 0,
        status: "0",
        menuCheckStrictly: true,
        menuIds: [],
        remark: "",
      },
      rules: {
        roleName: [
          { required: true, message: "角色名称不能为空", trigger: "blur" },
        ],
        roleKey: [
          { required: true, message: "权限字符不能为空", trigger: "blur" },
        ],
        roleSort: [
          { required: true, message: "角色顺序不能为空", trigger: "blur" },
        ],
      },
      menuExpand: false,
      menuNodeAll: false,
    };
  },
  methods: {
    handleCancel() {
      this.$emit("cancel");
    },
    handleSubmit() {
      this.$refs.addFormRef.validate((valid) => {
        if (valid) {
          const checkedKeys = this.$refs.menuRef.getCheckedKeys();
          const halfCheckedKeys = this.$refs.menuRef.getHalfCheckedKeys();
          this.form.menuIds = [...checkedKeys, ...halfCheckedKeys];
          this.$emit("submit", this.form);
        } else {
          return false;
        }
      });
    },
    resetForm() {
      this.form = {
        roleId: undefined,
        roleName: "",
        roleKey: "",
        roleSort: 0,
        status: "0",
        menuCheckStrictly: true,
        menuIds: [],
        remark: "",
      };
      this.menuExpand = false;
      this.menuNodeAll = false;
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.clearValidate();
        }
        if (this.$refs.menuRef) {
          this.$refs.menuRef.setCheckedKeys([]);
          this.collapseAllNodes(this.menuOptions);
        }
      });
    },
    collapseAllNodes(nodes) {
      nodes.forEach(node => {
        if (this.$refs.menuRef.store.nodesMap[node.id]) {
          this.$refs.menuRef.store.nodesMap[node.id].expanded = false;
        }
        if (node.children && node.children.length > 0) {
          this.collapseAllNodes(node.children);
        }
      });
    },
    fillFormData(data) {
      this.form = {
        roleId: data.roleId,
        roleName: data.roleName || "",
        roleKey: data.roleKey || "",
        roleSort: data.roleSort || 0,
        status: data.status ? String(data.status) : "0",
        menuCheckStrictly: data.menuCheckStrictly !== false,
        menuIds: data.menuIds || [],
        remark: data.remark || "",
      };
      this.$nextTick(() => {
        if (this.$refs.menuRef) {
          this.$refs.menuRef.setCheckedKeys(this.checkedKeys);
        }
      });
    },
    handleCheckedTreeExpand(value) {
      const treeList = this.menuOptions;
      for (let i = 0; i < treeList.length; i++) {
        this.$refs.menuRef.store.nodesMap[treeList[i].id].expanded = value;
      }
    },
    handleCheckedTreeNodeAll(value) {
      this.$refs.menuRef.setCheckedKeys(value ? this.getAllMenuIds(this.menuOptions) : []);
    },
    handleCheckedTreeConnect(value) {
      this.form.menuCheckStrictly = !value;
    },
    getAllMenuIds(data) {
      let ids = [];
      data.forEach((item) => {
        ids.push(item.id);
        if (item.children && item.children.length > 0) {
          ids = ids.concat(this.getAllMenuIds(item.children));
        }
      });
      return ids;
    },
  },
};
</script>

<style scoped>
.Form {
  padding: 20px;
}

.tree-border {
  margin-top: 5px;
  border: 1px solid #e5e6e7;
  background: #fff none;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
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
</style>
<style scoped>
/* 其他样式保持不变... */

/* 强制修改 checkbox 选中时的背景色 */
::v-deep .el-checkbox__input.is-checked .el-checkbox__inner,
::v-deep .el-checkbox__input.is-indeterminate .el-checkbox__inner {
  background-color: #6A35FF !important;
  border-color: #6A35FF !important;
}

/* 修改 checkbox 选中时的边框颜色 */
::v-deep .el-checkbox__input.is-checked .el-checkbox__inner {
  border-color: #6A35FF !important;
}

/* 修改 checkbox hover 时的边框颜色 */
::v-deep .el-checkbox__input:not(.is-disabled):hover .el-checkbox__inner {
  border-color: #6A35FF !important;
}

/* 修改 checkbox 选中时的对勾颜色（如果需要） */
::v-deep .el-checkbox__input.is-checked .el-checkbox__inner::after {
  border-color: #fff !important;
}

/* 修改 tree 组件中的 checkbox 样式 */
::v-deep .el-tree .el-checkbox__input.is-checked .el-checkbox__inner,
::v-deep .el-tree .el-checkbox__input.is-indeterminate .el-checkbox__inner {
  background-color: #6A35FF !important;
  border-color: #6A35FF !important;
}

/* 修改 tree 组件 hover 时的样式 */
::v-deep .el-tree .el-checkbox__input:not(.is-disabled):hover .el-checkbox__inner {
  border-color: #6A35FF !important;
}

/* 如果还需要修改 tree 节点选中时的背景色 */
::v-deep .el-tree-node__content:hover {
  background-color: rgba(106, 53, 255, 0.05) !important;
}
</style>