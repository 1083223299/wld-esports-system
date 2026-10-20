<template>
  <div class="container">
    <el-card class="form-card" shadow="never">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px" label-position="right">
        <el-form-item label="规范内容：" prop="content">
          <div class="editor-wrapper">
            <quill-editor
              ref="quillEditor"
              v-model="form.content"
              :options="editorOptions"
              @change="handleEditorChange"
            />
          </div>
        </el-form-item>
      </el-form>

      <div class="footer-actions">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave"
          style="background-color: #6A35FF; border-color: #6A35FF;">
          保存
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { quillEditor } from 'vue-quill-editor'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'
import { getRuleDetail, updateRule } from "@/api/community";

export default {
  name: 'CommunityNorms',
  components: {
    quillEditor
  },
  data() {
    return {
      form: {
        content: ''
      },
      formRules: {
        content: [
          { required: true, message: '请输入规范内容', trigger: 'blur' }
        ]
      },
      editorOptions: {
        theme: 'snow',
        placeholder: '请输入',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ size: [false, 'small', 'large', 'huge'] }],
            [{ font: [] }],
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ indent: '-1' }, { indent: '+1' }],
            [{ align: [] }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
            [{ direction: 'rtl' }],
            ['blockquote', 'code-block'],
            ['link', 'image', 'video'],
            [{ script: 'sub' }, { script: 'super' }],
            ['clean'],
            ['undo', 'redo'],
            ['fullscreen']
          ]
        }
      }
    }
  },
  mounted() {
    this.fetchContent()
  },
  methods: {
    handleEditorChange({ html }) {
      this.form.content = html
    },
    handleCancel() {
      this.$message.info('已取消')
    },
    handleSave() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return
        if (!this.form.content || this.form.content === '<p><br></p>') {
          this.$message.warning('请输入规范内容')
          return
        }
        try {
          const res = await updateRule({ ruleContent: this.form.content })
          if (res.success) {
            this.$message.success('保存成功')
          } else {
            this.$message.error(res.errorMessage || '保存失败')
          }
        } catch (error) {
          this.$message.error('保存失败')
        }
      })
    },
    async fetchContent() {
      try {
        const res = await getRuleDetail({})
        if (res.success && res.data) {
          this.form.content = res.data.ruleContent || ''
        }
      } catch (error) {
        console.error('获取社区规范内容失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
  box-sizing: border-box;
}

.form-card {
  border: none;
  border-radius: 8px;
}

::v-deep .el-card__body {
  padding: 24px;
}

::v-deep .el-form-item__label {
  font-weight: 500;
  color: #303133;
}

.editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

::v-deep .ql-toolbar.ql-snow {
  border: none;
  border-bottom: 1px solid #dcdfe6;
  background: #fafafa;
}

::v-deep .ql-container.ql-snow {
  border: none;
  height: 400px;
  font-size: 14px;
}

::v-deep .ql-editor {
  padding: 16px;
  min-height: 400px;
}

::v-deep .ql-editor.ql-blank::before {
  font-style: normal;
  color: #c0c4cc;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}
</style>
