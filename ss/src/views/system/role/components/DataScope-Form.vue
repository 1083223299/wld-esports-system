<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
    <el-form-item label="角色名称">
      <el-input v-model="form.roleName" disabled />
    </el-form-item>
    <el-form-item label="角色标识">
      <el-input v-model="form.roleKey" disabled />
    </el-form-item>
    <el-form-item label="权限范围" prop="dataScope">
      <el-select v-model="form.dataScope">
        <el-option label="全部数据权限" value="1" />
        <el-option label="自定义数据权限" value="2" />
        <el-option label="本部门数据权限" value="3" />
        <el-option label="本部门及以下数据权限" value="4" />
        <el-option label="仅本人数据权限" value="5" />
      </el-select>
    </el-form-item>
    <div class="form-footer">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit"
        >提交</el-button
      >
    </div>
  </el-form>
</template>

<script>
export default {
  name: "DataScopeForm",
  props: {
    editData: {
      type: Object,
      default: () => ({}),
    },
    submitting: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      form: {},
      rules: {
        dataScope: [
          { required: true, message: "请选择权限范围", trigger: "change" },
        ],
      },
    };
  },
  watch: {
    editData: {
      handler(newVal) {
        if (newVal && Object.keys(newVal).length > 0) {
          this.fillFormData(newVal);
        }
      },
      immediate: true,
    },
  },
  methods: {
    fillFormData(data) {
      this.form = {
        ...data,
        dataScope: data.dataScope ? String(data.dataScope) : "1",
        menuIds: data.menuIds || [],
        deptIds: data.deptIds || [],
      };
    },
    resetForm() {
      this.form = {};
      this.$nextTick(() => {
        if (this.$refs.formRef) {
          this.$refs.formRef.clearValidate();
        }
      });
    },
    handleCancel() {
      this.$emit("cancel");
    },
    handleSubmit() {
      this.$refs.formRef.validate(valid => {
        if (valid) {
          const formData = {
            ...this.form,
          };
          this.$emit("submit", formData);
        }
      });
    },
  },
};
</script>

<style scoped>
.tree-border {
  margin-top: 5px;
  border: 1px solid #e5e6e7;
  background: #fff none;
  border-radius: 4px;
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-bottom: 20px;
}
</style>
