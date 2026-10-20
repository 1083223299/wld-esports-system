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
      <el-col :span="12">
        <el-form-item label="公告标题" prop="noticeTitle">
          <el-input
            v-model="form.noticeTitle"
            placeholder="请输入公告标题"
            maxlength="50"
          />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="公告类型" prop="noticeType">
          <el-select v-model="form.noticeType" placeholder="请选择公告类型">
            <el-option
              v-for="item in noticeTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="24">
      <el-col :span="24">
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio v-for="item in noticeStatusOptions" :key="item.value" :label="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="24">
      <el-col :span="24">
        <el-form-item label="公告内容" prop="noticeContent">
          <el-input
            v-model="form.noticeContent"
            type="textarea"
            placeholder="请输入公告内容"
            maxlength="2000"
            :rows="8"
          />
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
            maxlength="500"
            :rows="3"
          />
        </el-form-item>
      </el-col>
    </el-row>
    <div class="form-footer">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        提交
      </el-button>
    </div>
  </el-form>
</template>

<script>
export default {
  name: "NoticeForm",
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
        noticeId: undefined,
        noticeTitle: "",
        noticeType: "",
        noticeContent: "",
        status: "0",
        remark: "",
      },
      rules: {
        noticeTitle: [
          { required: true, message: "请输入公告标题", trigger: "blur" },
          {
            min: 2,
            max: 50,
            message: "公告标题长度在 2 到 50 个字符",
            trigger: "blur",
          },
        ],
        noticeType: [
          { required: true, message: "请选择公告类型", trigger: "change" },
        ],
        noticeContent: [
          { required: true, message: "请输入公告内容", trigger: "blur" },
        ],
      },
      noticeTypeOptions: [
        { label: "通知", value: "1" },
        { label: "公告", value: "2" },
      ],
      noticeStatusOptions: [
        { label: "正常", value: "0" },
        { label: "停用", value: "1" },
      ],
    };
  },
  watch: {
    // 监听 editData 变化，自动填充表单
    editData: {
      handler(val) {
        if (val && Object.keys(val).length > 0) {
          this.fillFormData(val);
        } else {
          this.resetForm();
        }
      },
      deep: true,
      immediate: true,
    },
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
        noticeId: undefined,
        noticeTitle: "",
        noticeType: "",
        noticeContent: "",
        status: "0",
        remark: "",
      };
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.clearValidate();
        }
      });
    },
    fillFormData(data) {
      console.log('fillFormData 接收到的数据:', data);
      
      // 直接映射字段
      this.form = {
        noticeId: data.noticeId,
        noticeTitle: data.noticeTitle || "",
        noticeType: data.noticeType || "",
        noticeContent: data.noticeContent || "",
        status: data.status || "0",
        remark: data.remark || "",
      };
      
      console.log('填充后的表单数据:', this.form);
      
      // 强制更新视图
      this.$forceUpdate();
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