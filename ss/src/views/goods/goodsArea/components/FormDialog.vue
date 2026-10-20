<template>
    <el-dialog :title="title" :visible.sync="visible" width="500px" @close="handleClose">
        <!-- 普通模式（字段管理的新增和编辑） -->
        <div>
            <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
                <el-form-item label="字段名称" prop="name">
                    <el-input v-model="form.name" placeholder="请输入字段名称" maxlength="50" clearable />
                </el-form-item>
            </el-form>
        </div>
        <span slot="footer">
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="submit">确定</el-button>
        </span>
    </el-dialog>
</template>

<script>
export default {
    name: 'FormDialog',
    props: {
        title: { type: String, default: '' },
        moduleName: { type: String, default: '字段' }
    },
    data() {
        const validateName = (rule, value, callback) => {
            if (!value) {
                callback(new Error('请输入字段名称'));
                return;
            }
            if (value !== value.trim()) {
                callback(new Error('字段名称前后不能包含空格'));
                return;
            }
            callback();
        };

        return {
            visible: false,
            form: {
                name: ''
            },
            rules: {
                name: [{ validator: validateName, trigger: 'blur' }]
            }
        };
    },
    methods: {
        open(data = { name: '' }) {
            this.form = {
                name: data.name || ''
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.formRef?.clearValidate());
        },
        submit() {
            this.$refs.formRef.validate(valid => {
                if (valid) {
                    this.$emit('confirm', this.form.name.trim());
                    this.visible = false;
                }
            });
        },
        handleClose() {
            this.form = {
                name: ''
            };
        }
    }
};
</script>
