<template>
  <el-form ref="addFormRef" :model="form" :rules="rules" label-width="100px" class="Form" label-position="left">
    <el-row :gutter="24">
      <el-col :span="24">
        <el-form-item label="上级部门" prop="parentId">
          <el-popover v-model="showTree" ref="popover" placement="bottom-start" width="300" trigger="click"
            popper-class="tree-select-popover">
            <!-- 树形内容 -->
            <el-tree ref="tree" :data="deptOptions" :props="treeProps" :node-key="'deptId'" :default-expand-all="false"
              :highlight-current="true" :current-node-key="form.parentId" @node-click="handleNodeClick"
              style="max-height: 300px; overflow-y: auto" />
            <!-- 触发元素 -->
            <el-input slot="reference" v-model="selectedLabel" placeholder="请选择上级部门" readonly clearable
              @clear="handleClearParent" />
          </el-popover>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="24">
      <el-col :span="12">
        <el-form-item label="部门名称" prop="deptName">
          <el-input v-model="form.deptName" placeholder="请输入部门名称" maxlength="30" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="类别编码" prop="deptCategory">
          <el-input v-model="form.deptCategory" placeholder="请输入类别编码" maxlength="50" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="24">
      <el-col :span="12">
        <el-form-item label="显示排序" prop="orderNum">
          <el-input-number v-model="form.orderNum" :min="0" :max="999" style="width: 100%" />
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="负责人" prop="leader">
          <el-select v-model="form.leader" placeholder="请选择负责人">
            <el-option v-for="item in deptUserList" :key="item.userId" :label="item.userName" :value="item.userId" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="24">
      <el-col :span="12">
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" maxlength="11" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" maxlength="50" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row>
      <el-col :span="12">
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="0">启用</el-radio>
            <el-radio label="1">禁用</el-radio>
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
  name: "DeptForm",
  props: {
    editData: {
      type: Object,
      default: () => ({}),
    },
    submitting: {
      type: Boolean,
      default: false,
    },
    deptOptions: {
      type: Array,
      default: () => ([]),
    },
    deptUserList: {
      type: Array,
      default: () => ([]),
    }
  },
  data() {
    return {
      showTree: false,
      selectedLabel: '',
      form: {
        parentId: 0,
        deptName: "",
        deptCategory: "",
        orderNum: 0,
        status: "0",
        leader: '',
        phone: '',
        email: '',
        parentName: '',
      },
      treeProps: {
        label: 'deptName',
        children: 'children'
      },
      rules: {
        parentId: [
          { required: true, message: "请选择上级部门", trigger: "change" },
        ],
        deptName: [
          { required: true, message: "请输入部门名称", trigger: "blur" },
          {
            min: 2,
            max: 30,
            message: "部门名称长度在 2 到 30 个字符",
            trigger: "blur",
          },
        ],
        orderNum: [
          { required: true, message: "请输入排序", trigger: "blur" },
        ],
        status: [
          { required: true, message: "请选择状态", trigger: "change" },
        ],
      },
    };
  },
  watch: {
    editData: {
      handler(val) {
        if (!val) return
        this.selectedLabel = val.deptName
        this.$set(this.form, 'parentId', val.parentId)
        this.$nextTick(() => {
          if (this.$refs.popover) {
            this.$refs.popover.$forceUpdate()
          }
        })
      },
      deep: true,
      immediate: true
    },
  },
  methods: {
    // 清除上级部门
    handleClearParent() {
      this.form.parentId = null;
      this.selectedLabel = '';
    },
    handleCancel() {
      this.$emit("cancel");
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
    // 点击树节点
    handleNodeClick(data) {
      this.form.parentId = data.deptId
      this.selectedLabel = data.deptName
      this.showTree = false // 选择后关闭弹窗

    },
    resetForm() {
      this.form = {
        parentId: null,  // 改为 null，而不是使用 editData.parentId
        deptName: "",
        deptCategory: "",
        orderNum: 0,
        status: "0",
        leader: '',
        phone: '',
        email: '',
        parentName: '',
      };
      this.selectedLabel = '';
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.clearValidate();
        }
      });
    },
    fillFormData(data) {
      this.form = {
        parentId: data.parentId !== undefined && data.parentId !== null ? data.parentId : null,
        deptName: data.deptName || "",
        deptCategory: data.deptCategory || "",
        orderNum: data.orderNum || 0,
        status: data.status ? String(data.status) : "0",
        leader: data.leader || "",
        phone: data.phone || "",
        email: data.email || "",
        parentName: data.parentName || "",
        ParentHame: data.ParentHame || "",
        ancestors: data.ancestors || "",
        deptId: this.editData.deptId || "",
      };
      // 设置选中的标签显示
      this.selectedLabel = data.parentName || (data.parentId === 0 ? '主类目' : '');
    },
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
</style>
