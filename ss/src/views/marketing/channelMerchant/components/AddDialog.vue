<template>
  <el-dialog
    title="新增渠道商"
    :visible.sync="dialogVisible"
    width="520px"
    append-to-body
    :close-on-click-modal="false"
    custom-class="channel-merchant-add-dialog"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="add-form"
    >
      <el-form-item label="渠道商名称" prop="name" required>
        <el-input
          v-model="form.name"
          placeholder="请输入渠道商名称"
          maxlength="50"
          show-word-limit
          clearable
        />
      </el-form-item>

      <el-form-item label="联系人" prop="contactName" required>
        <el-input
          v-model="form.contactName"
          placeholder="请输入联系人"
          maxlength="20"
          show-word-limit
          clearable
        />
      </el-form-item>

      <el-form-item label="联系电话（登录账号）" prop="phone" required>
        <el-input
          v-model="form.phone"
          placeholder="请输入11位手机号"
          maxlength="11"
          clearable
          @blur="handlePhoneBlur"
        />
      </el-form-item>

      <el-form-item label="初始密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="不填默认123456"
          maxlength="20"
          show-password
          clearable
        />
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio :label="0">启用</el-radio>
          <el-radio :label="1">停用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <div slot="footer" class="dialog-footer">
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        确定
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import {
  addChannelMerchant,
  checkChannelMerchantPhone,
} from "@/api/channelMerchant";

const PHONE_REG = /^1[3-9]\d{9}$/;

function createForm() {
  return {
    name: "",
    contactName: "",
    phone: "",
    password: "",
    status: 0,
  };
}

export default {
  name: "ChannelMerchantAddDialog",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    const validateName = (rule, value, callback) => {
      const text = String(value || "").trim();
      if (!text) {
        callback(new Error("请输入渠道商名称"));
        return;
      }
      if (text.length < 2 || text.length > 50) {
        callback(new Error("渠道商名称需为2-50个字符"));
        return;
      }
      callback();
    };
    const validateContactName = (rule, value, callback) => {
      const text = String(value || "").trim();
      if (!text) {
        callback(new Error("请输入联系人"));
        return;
      }
      if (text.length < 2 || text.length > 20) {
        callback(new Error("联系人需为2-20个字符"));
        return;
      }
      callback();
    };
    const validatePhone = (rule, value, callback) => {
      const phone = String(value || "").trim();
      if (!phone) {
        callback(new Error("请输入联系电话"));
        return;
      }
      if (!PHONE_REG.test(phone)) {
        callback(new Error("请输入正确的11位手机号"));
        return;
      }
      callback();
    };
    const validatePassword = (rule, value, callback) => {
      const pwd = String(value || "");
      if (!pwd) {
        callback();
        return;
      }
      if (pwd.length < 6 || pwd.length > 20) {
        callback(new Error("初始密码需为6-20位"));
        return;
      }
      callback();
    };

    return {
      form: createForm(),
      submitting: false,
      phoneChecked: false,
      rules: {
        name: [{ required: true, validator: validateName, trigger: "blur" }],
        contactName: [{ required: true, validator: validateContactName, trigger: "blur" }],
        phone: [{ required: true, validator: validatePhone, trigger: "blur" }],
        password: [{ validator: validatePassword, trigger: "blur" }],
      },
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit("update:visible", val);
      },
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.resetForm();
      }
    },
    "form.phone"() {
      this.phoneChecked = false;
    },
  },
  methods: {
    resetForm() {
      this.form = createForm();
      this.submitting = false;
      this.phoneChecked = false;
      this.$nextTick(() => {
        if (this.$refs.formRef) {
          this.$refs.formRef.clearValidate();
        }
      });
    },
    handleClose() {
      this.resetForm();
    },
    async checkPhoneAvailable() {
      const phone = String(this.form.phone || "").trim();
      if (!PHONE_REG.test(phone)) {
        return false;
      }
      const res = await checkChannelMerchantPhone({ phone });
      const payload = res && res.data != null ? res.data : res;
      const available =
        payload && typeof payload.available === "boolean"
          ? payload.available
          : true;
      if (!available) {
        const message =
          (payload && payload.message) || "该手机号已注册，请更换";
        this.$message.error(message);
        this.phoneChecked = false;
        return false;
      }
      this.phoneChecked = true;
      return true;
    },
    async handlePhoneBlur() {
      const phone = String(this.form.phone || "").trim();
      if (!PHONE_REG.test(phone)) return;
      try {
        await this.checkPhoneAvailable();
      } catch (e) {
        this.phoneChecked = false;
      }
    },
    handleSubmit() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return;
        this.submitting = true;
        try {
          if (!this.phoneChecked) {
            const ok = await this.checkPhoneAvailable();
            if (!ok) return;
          }
          const payload = {
            name: String(this.form.name || "").trim(),
            contactName: String(this.form.contactName || "").trim(),
            phone: String(this.form.phone || "").trim(),
            status: Number(this.form.status),
          };
          const password = String(this.form.password || "").trim();
          if (password) {
            payload.password = password;
          }
          const res = await addChannelMerchant(payload);
          if (res && res.success === false) {
            this.$message.error(res.errorMessage || "新增失败");
            return;
          }
          this.$message.success("新增成功");
          this.dialogVisible = false;
          this.$emit("success");
        } catch (e) {
          // 业务错误已由 request 拦截器提示
        } finally {
          this.submitting = false;
        }
      });
    },
  },
};
</script>

<style lang="scss">
.channel-merchant-add-dialog {
  border-radius: 12px;
  overflow: hidden;

  .el-dialog__header {
    padding: 20px 24px 8px;
  }

  .el-dialog__title {
    font-size: 18px;
    font-weight: 600;
    color: #1d2129;
  }

  .el-dialog__body {
    padding: 8px 24px 0;
  }

  .el-dialog__footer {
    padding: 8px 24px 24px;
  }
}
</style>

<style scoped lang="scss">
.add-form ::v-deep .el-form-item__label {
  padding-bottom: 6px;
  color: #4e5969;
  font-weight: 500;
  line-height: 1.4;
}

.add-form ::v-deep .el-form-item {
  margin-bottom: 16px;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button--primary {
  background: #6a35ff;
  border-color: #6a35ff;
}

.dialog-footer .el-button--primary:hover,
.dialog-footer .el-button--primary:focus {
  background: #8f5eff;
  border-color: #8f5eff;
}
</style>
