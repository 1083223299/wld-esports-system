<template>
  <div class="form-container">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px" class="form">
      <!-- 发送方 -->
      <el-form-item label="发送方" prop="fromUser">
        <el-select v-model="formData.fromUser" placeholder="请选择发送方" style="width: 100%">
          <el-option label="用户" value="0" />
          <el-option label="搭档" value="1" />
        </el-select>
      </el-form-item>

      <!-- 快捷语内容 -->
      <el-form-item label="快捷语内容" prop="content">
        <el-input v-model="formData.content" placeholder="请输入快捷语内容" :maxlength="10" show-word-limit />
      </el-form-item>

      <!-- 优先级 -->
      <el-form-item label="优先级" prop="sort">
        <el-input v-model.number="formData.sort" type="number" placeholder="请输入优先级(1-100)" 
          min="1" max="100" style="width: 100%" />
      </el-form-item>

    </el-form>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <el-button @click="$emit('cancel')" :disabled="submitting">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        确定
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: "QuickPhraseAddForm",
  props: {
    // 编辑数据
    editData: {
      type: Object,
      default: () => {}
    },
    // 提交中状态
    submitting: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      // 表单数据
      formData: {
        id: '',
        fromUser: '0', // 默认用户
        content: '',
        sort: 1, // 默认优先级1
      },
      // 表单验证规则
      rules: {
        fromUser: [
          {
            required: true,
            message: '请选择发送方',
            trigger: 'blur'
          }
        ],
        content: [
          {
            required: true,
            message: '请输入快捷语内容',
            trigger: 'blur'
          },
          {
            max: 10,
            message: '快捷语内容最多10个字符',
            trigger: 'blur'
          }
        ],
        sort: [
          {
            required: true,
            message: '请输入优先级',
            trigger: 'blur'
          },
          {
            type: 'number',
            min: 1,
            max: 100,
            message: '优先级必须在1-100之间',
            trigger: 'blur'
          }
        ]
      }
    };
  },
  watch: {
    // 监听编辑数据变化
    editData: {
      handler(newVal) {
        if (newVal) {
          this.fillFormData(newVal);
        }
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    // 填充表单数据
    fillFormData(data) {
      this.formData = {
        id: data.id || '',
        fromUser: data.fromUser || '0',
        content: data.content || '',
        sort: data.sort || 1,
      };
    },
    // 重置表单
    resetForm() {
      this.formData = {
        id: '',
        fromUser: '0',
        content: '',
        sort: 1,
      };
      if (this.$refs.formRef) {
        this.$refs.formRef.resetFields();
      }
    },
    // 提交表单
    handleSubmit() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          this.$emit('submit', this.formData);
        }
      });
    }
  }
};
</script>

<style scoped>
.form-container {
  padding: 20px 0;
}

.form {
  margin-bottom: 20px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}
</style>
