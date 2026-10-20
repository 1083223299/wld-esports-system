<template>
  <el-form
    ref="addFormRef"
    :model="form"
    :rules="rules"
    label-width="100px"
    class="Form"
    label-position="left"
  >
    <el-row :gutter="24">
      <el-col :span="24">
        <el-form-item label="参数名称" prop="configName">
          <el-input
            v-model="form.configName"
            placeholder="请输入参数名称"
            maxlength="30"
          />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="24">
      <el-col :span="24">
        <el-form-item label="参数键名" prop="configKey">
          <el-input
            v-model="form.configKey"
            placeholder="请输入参数键名"
            maxlength="100"
          />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="24">
      <el-col :span="24">
        <el-form-item label="参数键值" prop="configValue">
          <el-input
            v-model="form.configValue"
            placeholder="请输入参数键值"
            maxlength="500"
          />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="24">
      <el-col :span="24">
        <el-form-item label="系统内置" prop="configType">
          <el-radio-group v-model="form.configType">
            <el-radio label="Y">是</el-radio>
            <el-radio label="N">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="24">
      <el-col :span="24">
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            placeholder="请输入备注"
            maxlength="200"
            :rows="3"
          />
        </el-form-item>
      </el-col>
    </el-row>
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
  name: "ConfigForm",
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
      form: {
        configName: "",
        configKey: "",
        configValue: "",
        configType: "N",
        remark: "",
      },
      rules: {
        configName: [
          { required: true, message: "请输入参数名称", trigger: "blur" },
          {
            min: 2,
            max: 30,
            message: "参数名称长度在 2 到 30 个字符",
            trigger: "blur",
          },
        ],
        configKey: [
          { required: true, message: "请输入参数键名", trigger: "blur" },
          {
            min: 2,
            max: 100,
            message: "参数键名长度在 2 到 100 个字符",
            trigger: "blur",
          },
        ],
        configValue: [
          { required: true, message: "请输入参数键值", trigger: "blur" },
        ],
        configType: [
          { required: true, message: "请选择系统内置", trigger: "change" },
        ],
      },
    };
  },
  methods: {
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
    resetForm() {
      this.form = {
        configName: "",
        configKey: "",
        configValue: "",
        configType: "N",
        remark: "",
      };
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.clearValidate();
        }
      });
    },
    fillFormData(data) {
      this.form = {
        configName: data.configName || "",
        configKey: data.configKey || "",
        configValue: data.configValue || "",
        configType: data.configType || "N",
        remark: data.remark || "",
      };
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
