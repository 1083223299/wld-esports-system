<template>
    <div class="add-form">
        <el-form ref="form" :model="form" :rules="rules" label-width="100px" label-position="right" size="medium">
            <el-form-item label="字典名称" prop="dictName">
                <el-input v-model="form.dictName" placeholder="请输入字典名称" maxlength="100" />
            </el-form-item>

            <el-form-item label="字典类型" prop="dictType">
                <el-input v-model="form.dictType" placeholder="请输入字典类型" maxlength="100" />
            </el-form-item>

            <el-form-item label="备注" prop="remark">
                <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" maxlength="500"
                    show-word-limit />
            </el-form-item>

            <div class="form-footer">
                <el-button @click="handleCancel">取消</el-button>
                <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
            </div>
        </el-form>
    </div>
</template>

<script>
export default {
    name: "AddForm",
    props: {
        editData: {
            type: Object,
            default: () => ({})
        },
        submitting: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            form: {
                dictName: '',
                dictType: '',
                remark: ''
            },
            rules: {
                dictName: [
                    { required: true, message: '请输入字典名称', trigger: 'blur' },
                    { max: 100, message: '长度不能超过100个字符', trigger: 'blur' }
                ],
                dictType: [
                    { required: true, message: '请输入字典类型', trigger: 'blur' },
                    { max: 100, message: '长度不能超过100个字符', trigger: 'blur' },
                    {
                        pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
                        message: '字典类型必须以字母开头，只能包含字母、数字和下划线',
                        trigger: 'blur'
                    }
                ]
            }
        }
    },
    watch: {
        editData: {
            handler(val) {
                if (val && Object.keys(val).length > 0) {
                    this.form = {
                        dictName: val.dictName || '',
                        dictType: val.dictType || '',
                        remark: val.remark || ''
                    }
                }
            },
            immediate: true,
            deep: true
        }
    },
    methods: {
        resetForm() {
            this.$refs.form.resetFields()
            this.form = {
                dictName: '',
                dictType: '',
                remark: ''
            }
        },
        fillFormData(data) {
            if (data) {
                this.form = {
                    dictName: data.dictName || '',
                    dictType: data.dictType || '',
                    remark: data.remark || ''
                }
            }
        },
        handleSubmit() {
            this.$refs.form.validate(valid => {
                if (valid) {
                    this.$emit('submit', { ...this.form })
                }
            })
        },
        handleCancel() {
            this.$emit('cancel')
        }
    }
}
</script>

<style scoped>
.add-form {
    padding: 20px;
}

.form-footer {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;
}
</style>