<template>
  <div class="add-companion-container">
    <!-- 头部返回 -->
    <div class="page-header" @click="handleBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">{{ isEdit ? "编辑陪陪" : "新增陪陪" }}</div>
    </div>

    <el-card shadow="hover" class="form-card">
      <el-form
        ref="companionForm"
        :model="formData"
        label-width="104px"
        class="companion-form"
        size="medium"
      >
        <!-- 动态陪玩手机号列表 -->
        <div
          v-for="(phoneItem, index) in formData.phoneList"
          :key="index"
          class="phone-item-wrapper"
        >
          <el-form-item
            :label="`${index + 1}. 陪玩手机号`"
            :prop="`phoneList[${index}].phone`"
          >
            <el-input
              v-model="phoneItem.phone"
              placeholder="请输入11位手机号"
              style="width: 300px"
              @blur="validatePhone(index)"
              @input="clearPhoneError(index)"
              :disabled="phoneItem.checking"
            />
            <!-- 操作按钮 -->
            <div
              class="btn-group"
              v-if="
                index === formData.phoneList.length - 1 &&
                formData.phoneList.length < 50
              "
            >
              <el-button
                class="add-plus"
                type="text"
                icon="el-icon-plus"
                @click="addPhoneItem(index)"
                :disabled="formData.phoneList.length >= 50"
                title="添加手机号"
              />
            </div>
            <div class="btn-group2" v-if="formData.phoneList.length > 1">
              <el-button
                class="add-minus"
                type="text"
                icon="el-icon-minus"
                @click="removePhoneItem(index)"
                title="删除手机号"
              />
            </div>

            <!-- 错误/加载提示 -->
            <div class="tip-wrapper">
              <el-icon v-if="phoneItem.checking" class="loading-icon">
                <loading />
              </el-icon>
              <div v-else-if="phoneItem.error" class="error-tip">
                {{ phoneItem.error }}
              </div>
              <div v-else-if="phoneItem.success" class="success-tip">
                ✔ 手机号验证通过
              </div>
            </div>
          </el-form-item>
        </div>

        <!-- 批量操作按钮 -->
        <!-- <el-form-item label="批量操作">
          <el-button 
            type="text" 
            icon="el-icon-refresh-left" 
            @click="clearAllPhones"
            :disabled="formData.phoneList.length === 0"
          >
            清空所有手机号
          </el-button>
          <el-button 
            type="text" 
            icon="el-icon-check" 
            @click="validateAllPhones"
            :disabled="formData.phoneList.length === 0"
          >
            验证所有手机号
          </el-button>
          <span class="phone-count-tip">
            当前已输入 {{ formData.phoneList.length }} / 50 个手机号
          </span>
        </el-form-item> -->

        <!-- 保存和取消按钮 -->
        <el-form-item class="form-actions">
          <el-button
            type="primary"
            size="medium"
            @click="handleSubmit"
            :loading="submitLoading"
            style="background: #4d23d9; border-color: #4d23d9"
            :disabled="!isAllPhonesValid"
          >
            {{ isEdit ? "更新保存" : "保存" }}
          </el-button>
          <el-button type="default" size="medium" @click="handleBack">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import {
  batchAddUserInvitation,
  checkUserInvitationPhone,
  unionGetPhoneList,
} from "@/api/unionSupport";
import { Loading } from "element-ui";

export default {
  name: "AddCompanion", // 必须与keep-alive的include匹配
  components: {
    Loading, // Vue2需注释这行，Element UI已全局注册
  },
  inject: ["switchToList", "getSharedData"], // 注入父组件方法
  data() {
    return {
      // 编辑/新增标识
      isEdit: false,
      // 加载状态
      unionLoading: false,
      submitLoading: false,
      // 表单数据
      formData: {
        phoneList: [
          {
            phone: "",
            userId: null,
            error: "",
            success: false,
            checking: false, // 手机号验证中
          },
        ],
      },
    };
  },
  created() {
    // 从父组件获取共享数据，判断是否为编辑模式
    const sharedData = this.getSharedData();
    if (sharedData.editId) {
      this.isEdit = true;
      // 编辑模式加载该公会已有的手机号列表
      this.loadUnionPhoneList(sharedData.editId);
    }
  },
  computed: {
    isAllPhonesValid() {
      // 1. 检查 phoneList 是否存在且有数据
      if (!this.formData.phoneList || this.formData.phoneList.length === 0) {
        return false;
      }

      // 2. 检查每一个 phone 都有值（非空、非空白字符）
      return this.formData.phoneList.every(
        (item) =>
          item.phone &&
          item.phone.toString().trim() !== "" &&
          item.success &&
          item.userId !== null &&
          item.userId !== undefined // && item.success
      );
    },
  },
  activated() {
    this.formData = {
      phoneList: [
        {
          phone: "",
          userId: null,
          error: "",
          success: false,
          checking: false, // 手机号验证中
        },
      ],
    };
    console.log("批量新增/编辑组件被激活");
  },
  deactivated() {
    console.log("批量新增/编辑组件被缓存");
  },
  methods: {
    // 加载公会已有的手机号列表（编辑模式）
    async loadUnionPhoneList(tradeId) {
      try {
        this.submitLoading = true;
        const res = await unionGetPhoneList({ tradeId });
        if (res.code === 200 && res.data?.phoneList) {
          // 格式化手机号列表
          this.formData.phoneList = res.data.phoneList.map((phone) => ({
            phone,
            userId: null,
            error: "",
            success: true,
            checking: false,
          }));
        } else {
          this.formData.phoneList = [
            {
              phone: "",
              userId: null,
              error: "",
              success: false,
              checking: false,
            },
          ];
        }
      } catch (error) {
        console.error("加载公会手机号列表失败:", error);
        this.$message.error("加载公会手机号列表失败");
      } finally {
        this.submitLoading = false;
      }
    },

    // 新增手机号输入项
    addPhoneItem(index) {
      if (this.formData.phoneList.length >= 50) {
        this.$message.warning("最多支持50个陪玩手机号");
        return;
      }
      this.formData.phoneList.splice(index + 1, 0, {
        phone: "",
        userId: null,
        error: "",
        success: false,
        checking: false,
      });
    },

    // 删除手机号输入项
    removePhoneItem(index) {
      if (this.formData.phoneList.length === 1) {
        this.$message.warning("至少保留一个陪玩手机号");
        return;
      }
      this.formData.phoneList.splice(index, 1);
    },

    // 清空所有手机号
    // clearAllPhones() {
    //   this.$confirm('确定要清空所有手机号吗？', '提示', {
    //     type: 'warning'
    //   }).then(() => {
    //     this.formData.phoneList = [{ phone: "", error: "", success: false, checking: false }]
    //   })
    // },

    // 清除单个手机号的错误提示
    clearPhoneError(index) {
      this.formData.phoneList[index].error = "";
      this.formData.phoneList[index].success = false;
      this.formData.phoneList[index].userId = null;
      if (this.formData.phoneList[index].phone.length === 11) {
        this.validatePhone(index);
      }
    },

    // 验证单个手机号
    async validatePhone(index) {
      const phoneItem = this.formData.phoneList[index];
      const phone = phoneItem.phone.trim();

      // 空值验证
      if (!phone) {
        phoneItem.error = "手机号不能为空";
        phoneItem.success = false;
        phoneItem.userId = null;
        return;
      }

      // 格式验证
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        phoneItem.error = "请输入正确手机格式";
        phoneItem.success = false;
        phoneItem.userId = null;
        return;
      }

      // 重复手机号验证
      const duplicateIndex = this.formData.phoneList.findIndex((item, idx) => {
        return idx !== index && item.phone.trim() === phone;
      });
      if (duplicateIndex > -1) {
        phoneItem.error = "该手机号已重复输入";
        phoneItem.success = false;
        phoneItem.userId = null;
        return;
      }

      // 后端验证
      try {
        const tradeId = this.getCurrentTradeId();
        if (!tradeId) {
          phoneItem.error = "缺少工会ID，无法校验手机号";
          phoneItem.success = false;
          phoneItem.userId = null;
          return;
        }
        phoneItem.checking = true;
        phoneItem.error = "";
        const res = await checkUserInvitationPhone(phone, tradeId, true);
        phoneItem.checking = false;

        if (res.code === 200 && res.success) {
          const checkResult = res.data || {};
          if (
            Number(checkResult.flag) === 0 &&
            checkResult.userId !== null &&
            checkResult.userId !== undefined
          ) {
            // 验证通过
            phoneItem.success = true;
            phoneItem.userId = checkResult.userId;
            phoneItem.error = "";
          } else {
            // 后端返回错误信息
            phoneItem.error = checkResult.msg || "该手机号当前不能邀请";
            phoneItem.success = false;
            phoneItem.userId = null;
          }
        } else {
          phoneItem.error = "验证失败：" + (res.msg || "服务器异常");
          phoneItem.success = false;
          phoneItem.userId = null;
        }
      } catch (error) {
        phoneItem.checking = false;
        phoneItem.error = "验证失败：网络异常";
        phoneItem.success = false;
        phoneItem.userId = null;
        console.error("手机号验证异常:", error);
      }
    },

    // 验证所有手机号
    async validateAllPhones() {
      let hasError = false;

      // 先验证格式和空值
      await Promise.all(
        this.formData.phoneList.map((item, index) => this.validatePhone(index))
      );
      hasError = this.formData.phoneList.some((item) => item.error);

      if (hasError) {
        // this.$message.warning("部分手机号验证失败，请检查后重试")
        // 滚动到第一个错误的手机号
        const firstErrorIndex = this.formData.phoneList.findIndex(
          (item) => item.error
        );
        if (firstErrorIndex > -1) {
          document
            .querySelector(
              `.phone-item-wrapper:nth-child(${firstErrorIndex + 1})`
            )
            .scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
        }
      } else {
        // this.$message.success("所有手机号验证通过")
      }
    },

    // 获取当前工会ID
    getCurrentTradeId() {
      const userData = this.$store.getters.userData || {};
      return userData.tradeId || "";
    },

    async handleSubmit() {
      try {
        // 1. 清除之前的错误提示
        this.formData.phoneList.forEach((item) => {
          item.error = "";
          item.success = false;
          item.userId = null;
        });

        // 2. 触发表单验证
        const isValid = await this.$refs.companionForm.validate();
        if (!isValid) {
          // this.$message.warning("表单填写不完整，请检查")
          return;
        }

        // 3. 验证所有手机号
        await this.validateAllPhones();

        // 4. 检查是否有验证失败的手机号
        const hasError = this.formData.phoneList.some((item) => item.error);
        if (hasError) {
          return;
        }

        // 5. 构造提交参数
        this.submitLoading = true;
        const tradeId = this.getCurrentTradeId();
        if (!tradeId) {
          this.$message.error("缺少工会ID，无法提交邀请");
          return;
        }
        const formattedTradeId = Number(tradeId);
        const userIds = this.formData.phoneList
          .map((item) => item.userId)
          .filter((item) => item !== null && item !== undefined && item !== "");
        if (userIds.length !== this.formData.phoneList.length) {
          this.$message.error("手机号校验信息缺失，请重新校验后提交");
          return;
        }
        const submitData = {
          tradeId: Number.isNaN(formattedTradeId) ? tradeId : formattedTradeId,
          userIds,
        };

        // 6. 调用后端接口
        const res = await batchAddUserInvitation(submitData);
        if (res.code === 200 && res.success && res.data !== false) {
          this.$message.success(
            this.isEdit ? "更新成功" : "邀请已发出，等待陪陪确认"
          );
          this.$emit("refresh-list"); // 通知列表刷新
          // this.handleBack() // 返回列表页
          this.switchToList(true);
        } else {
          this.$message.error(
            res.errorMessage ||
              res.msg ||
              (this.isEdit ? "更新失败" : "新增失败")
          );
        }
      } catch (error) {
        console.error("提交表单异常:", error);
        // this.$message.error("提交失败，请稍后重试")
      } finally {
        this.submitLoading = false;
      }
    },

    // 返回列表页（适配无路由切换）
    handleBack() {
      // 检查是否有未保存的修改
      const hasInput = this.formData.phoneList.some((item) =>
        item.phone.trim()
      );
      if (hasInput) {
        this.$confirm("确定要取消吗？所有输入内容将不保存", "提示", {
          type: "warning",
          confirmButtonText: "确定返回",
          cancelButtonText: "继续编辑",
        })
          .then(() => {
            // 调用父组件方法返回列表
            this.switchToList(false);
            // 重置表单
            this.$refs.companionForm.resetFields();
          })
          .catch(() => {
            // 留在当前页面
          });
      } else {
        // 无输入内容，直接返回
        this.switchToList(false);
      }
    },
  },
};
</script>

<style scoped lang="scss">
::v-deep .el-card__body {
  padding: 0 0 0 0;
}
.add-companion-container {
  background-color: #fff;
  // min-height: 100vh;
  padding: 32px;
  border-radius: 24px;
}

// .page-title {
//   padding-left: 5px;
//   border-left: #4d23d9 solid 3px;
// }

.form-card {
  margin: 0 auto;
  border-radius: 0;
  border: 0;
  // box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.el-card.is-always-shadow,
.el-card.is-hover-shadow:focus,
.el-card.is-hover-shadow:hover {
  -webkit-box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0);
}

.companion-form {
  margin-top: 20px;
  padding: 0 0;
}

// 手机号项包装器
.phone-item-wrapper {
  margin-bottom: 8px;
  text-align: left;
}

// 按钮组样式
.btn-group,
.btn-group2 {
  display: inline-block;
  margin-left: 10px;
}

.btn-group .el-button--text {
  border-radius: 50%;
  background: #4d23d9;
  color: #fff;
  height: 20px;
  width: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #3a19b8;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
}

.btn-group2 .el-button--text {
  border-radius: 50%;
  background: #ff4d4f;
  color: #fff;
  height: 20px;
  width: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #fa4548;
  }
}

// 提示信息样式
.tip-wrapper {
  display: flex;
  align-items: center;
  margin-top: 4px;
  line-height: 12px;
}

.loading-icon {
  color: #4d23d9;
  font-size: 12px;
  margin-right: 4px;
  animation: rotate 1.5s linear infinite;
}

.error-tip {
  color: #f56c6c;
  font-size: 12px;
}

.success-tip {
  color: #67c23a;
  font-size: 12px;
}

// 批量操作样式
.phone-count-tip {
  margin-left: 15px;
  font-size: 12px;
  color: #909399;
}

// 按钮区域
.form-actions {
  padding-left: 120px;
  margin-top: 30px;

  button {
    padding: 8px 24px;
    margin-right: 15px;
  }
}
// 动画
@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

// 响应式适配
@media (max-width: 768px) {
  .add-companion-container {
    padding: 10px;
  }

  .form-actions {
    padding-left: 0;
    text-align: center;

    button {
      width: 100%;
      max-width: 200px;
      margin: 5px auto;
      display: block;
    }
  }

  .el-select {
    width: 100% !important;
  }

  .el-input {
    width: 100% !important;
  }
}
</style>
