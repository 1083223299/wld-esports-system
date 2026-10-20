<template>
  <el-form
    ref="addFormRef"
    :model="form"
    :rules="rules"
    label-width="80px"
    class="Form"
    label-position="left"
  >
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="用户昵称" prop="nickName">
          <el-input
            v-model="form.nickName"
            placeholder="请输入用户昵称"
            maxlength="30"
          />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="归属部门" prop="deptId">
          <el-cascader
            v-model="form.deptId"
            :options="deptOptions"
            :props="{ value: 'id', label: 'label', children: 'children', checkStrictly: true, emitPath: false }"
            placeholder="请选择归属部门"
            clearable
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="手机号码" prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="请输入手机号码"
            maxlength="11"
          />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱"
            maxlength="50"
          />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="20" v-if="!editData.userId">
      <el-col :span="12">
        <el-form-item label="用户名称" prop="userName">
          <el-input
            v-model="form.userName"
            placeholder="请输入用户名称"
            maxlength="30"
          />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="用户密码" prop="password">
          <el-input
            v-model="form.password"
            placeholder="请输入用户密码"
            type="password"
            maxlength="20"
            show-password
          />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="用户性别">
          <el-select v-model="form.sex" placeholder="请选择" style="width: 100%">
            <el-option label="男" value="0"></el-option>
            <el-option label="女" value="1"></el-option>
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="0">启用</el-radio>
            <el-radio label="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="岗位">
          <el-select v-model="form.postIds" multiple placeholder="请选择" style="width: 100%">
            <el-option
              v-for="item in postOptions"
              :key="item.postId"
              :label="item.postName"
              :value="item.postId"
              :disabled="item.status == '1'"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="角色" prop="roleIds">
          <el-select v-model="form.roleIds" filterable multiple placeholder="请选择" style="width: 100%">
            <el-option
              v-for="item in roleOptions"
              :key="item.roleId"
              :label="item.roleName"
              :value="item.roleId"
              :disabled="item.status == '1'"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="24">
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            placeholder="请输入内容"
            maxlength="200"
            show-word-limit
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
  name: "UserForm",
  props: {
    editData: {
      type: Object,
      default: () => ({}),
    },
    deptOptions: {
      type: Array,
      default: () => [],
    },
    postOptions: {
      type: Array,
      default: () => [],
    },
    roleOptions: {
      type: Array,
      default: () => [],
    },
    submitting: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      form: {
        userId: undefined,
        deptId: undefined,
        userName: null,
        nickName: "",
        password: "",
        phone: "",
        email: "",
        sex: "0",
        status: "0",
        remark: "",
        postIds: [],
        roleIds: [],
      },
      rules: {
        nickName: [
          { required: true, message: "用户昵称不能为空", trigger: "blur" },
        ],
        userName: [
          { required: true, message: "用户名称不能为空", trigger: "blur" },
          {
            min: 2,
            max: 20,
            message: "用户名称长度必须介于 2 和 20 之间",
            trigger: "blur",
          },
        ],
        password: [
          { required: true, message: "用户密码不能为空", trigger: "blur" },
          {
            min: 5,
            max: 20,
            message: "用户密码长度必须介于 5 和 20 之间",
            trigger: "blur",
          },
          {
            pattern: /^[^<>"'|\\]+$/,
            message: "不能包含非法字符：< > \" ' \\ |",
            trigger: "blur",
          },
        ],
        email: [
          {
            type: "email",
            message: "请输入正确的邮箱地址",
            trigger: ["blur", "change"],
          },
        ],
        phone: [
          {
            pattern: /^1[3|4|5|6|7|8|9][0-9]\d{8}$/,
            message: "请输入正确的手机号码",
            trigger: "blur",
          },
        ],
        roleIds: [{ required: true, message: "用户角色不能为空", trigger: "blur" }],
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
        userId: undefined,
        deptId: undefined,
        userName: "",
        nickName: "",
        password: "",
        phone: "",
        email: "",
        sex: "0",
        status: "0",
        remark: "",
        postIds: [],
        roleIds: [],
      };
      this.$nextTick(() => {
        if (this.$refs.addFormRef) {
          this.$refs.addFormRef.clearValidate();
        }
      });
    },
    fillFormData(data) {
      console.log('fillFormData 接收到的数据:', data);
      console.log('data.postIds:', data.postIds);
      console.log('data.posts:', data.posts);
      console.log('data.roleIds:', data.roleIds);
      console.log('data.roles:', data.roles);
      
      this.form = {
        userId: data.userId,
        deptId: data.deptId,
        userName: data.userName || "",
        nickName: data.nickName || "",
        password: "",
        phone: data.phone || "",
        email: data.email || "",
        sex: data.sex ? String(data.sex) : "0",
        status: data.status ? String(data.status) : "0",
        remark: data.remark || "",
        postIds: (data.postIds || data.posts?.map(p => p.postId) || []).filter(id => id != null),
        roleIds: (data.roleIds || data.roles?.filter(r => r && r.roleId != null).map(r => r.roleId) || []),
      };
      
      console.log('填充后的表单数据:', this.form);
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
