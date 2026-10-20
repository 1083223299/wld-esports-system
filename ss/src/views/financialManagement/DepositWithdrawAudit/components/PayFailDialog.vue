<template>
  <el-dialog
    title="打款失败原因"
    :visible.sync="dialogVisible"
    width="480px"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item label="请输入打款失败原因" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="4"
          maxlength="50"
          show-word-limit
          placeholder="请输入打款失败原因"
        />
      </el-form-item>
    </el-form>
    <div slot="footer">
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: "PayFailDialog",
  props: {
    visible: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false }
  },
  data() {
    return {
      form: { remark: "" },
      rules: {
        remark: [
          { required: true, message: "请输入打款失败原因", trigger: "blur" },
          { max: 50, message: "最多50个字", trigger: "blur" }
        ]
      }
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit("update:visible", val);
      }
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.form.remark = "";
        this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
      }
    }
  },
  methods: {
    handleClose() {
      this.$emit("update:visible", false);
    },
    handleSubmit() {
      this.$refs.formRef.validate((valid) => {
        if (!valid) return;
        this.$emit("confirm", String(this.form.remark || "").trim());
      });
    }
  }
};
</script>
