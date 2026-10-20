<template>
  <el-dialog
    title="打款成功"
    :visible.sync="dialogVisible"
    width="480px"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item label="请上传完成凭证图片" prop="payVoucher">
        <el-upload
          action="#"
          :show-file-list="false"
          :http-request="handleUpload"
          :before-upload="beforeUpload"
          accept="image/png,image/jpeg,image/jpg"
        >
          <div v-if="previewUrl" class="voucher-preview">
            <img :src="previewUrl" alt="打款凭证" />
            <el-button type="text">重新上传</el-button>
          </div>
          <el-button v-else type="text" style="color: #409eff" :loading="uploading">上传</el-button>
        </el-upload>
      </el-form-item>
    </el-form>
    <div slot="footer">
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { fileUpload } from "@/api/user";

export default {
  name: "PaySuccessDialog",
  props: {
    visible: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false }
  },
  data() {
    return {
      uploading: false,
      previewUrl: "",
      form: { payVoucher: "" },
      rules: {
        payVoucher: [{ required: true, message: "请上传完成凭证图片", trigger: "change" }]
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
        this.form.payVoucher = "";
        this.previewUrl = "";
        this.uploading = false;
        this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
      }
    }
  },
  methods: {
    handleClose() {
      this.$emit("update:visible", false);
    },
    beforeUpload(file) {
      const ok = ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
      if (!ok) {
        this.$message.error("仅支持 png/jpg 图片");
        return false;
      }
      if (file.size / 1024 / 1024 > 5) {
        this.$message.error("图片大小不能超过 5MB");
        return false;
      }
      return true;
    },
    async handleUpload({ file }) {
      this.uploading = true;
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fileUpload(formData);
        if (!res || !res.success || !res.data) {
          throw new Error((res && res.errorMessage) || "上传失败");
        }
        const ossId = res.data.ossId || res.data.id || "";
        const url =
          res.data.url ||
          res.data.fileUrl ||
          res.data.ossUrl ||
          res.data.urlLink ||
          "";
        if (!ossId && !url) {
          throw new Error("未获取到凭证文件");
        }
        this.form.payVoucher = String(ossId || url);
        this.previewUrl = url || URL.createObjectURL(file);
        this.$refs.formRef && this.$refs.formRef.validateField("payVoucher");
        this.$message.success("上传成功");
      } catch (error) {
        this.$message.error(error.message || "上传失败");
      } finally {
        this.uploading = false;
      }
    },
    handleSubmit() {
      this.$refs.formRef.validate((valid) => {
        if (!valid) return;
        this.$emit("confirm", this.form.payVoucher);
      });
    }
  }
};
</script>

<style scoped>
.voucher-preview {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.voucher-preview img {
  width: 140px;
  height: 90px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}
</style>
