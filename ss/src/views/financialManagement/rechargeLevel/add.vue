<template>
  <div class="add-companion-container">
    <div class="page-header" @click="handleBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">新增充值档位</div>
    </div>

    <el-form ref="companionForm" :model="formData" :rules="formRules" label-width="104px" class="companion-form"
      size="medium">
      <el-form-item label="渠道" prop="type">
        <el-select v-model="formData.type" placeholder="请选择渠道" filterable clearable style="width: 300px"
          @change="handleTypeChange">
          <el-option v-for="item in channelOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="formData.type" label="汇率换算">
        <div class="rate">
          <div class="rate-item">
            <div class="rate-item-title">人民币</div>
            <div class="rate-item-content">1</div>
          </div>
          <div class="rate-symbol">=</div>
          <div class="rate-item">
            <div class="rate-item-title">未来币</div>
            <div class="rate-item-content">{{ exchangeRateValue }}</div>
          </div>
        </div>
      </el-form-item>

      <div v-if="formData.type">
        <div v-for="(item, index) in formData.levelList" :key="index" class="level-item-wrapper">
          <el-form-item :label="index === 0 ? '配置档位' : ''" :prop="`levelList[${index}].amount`" :rules="[
            { required: true, message: '请输入金额', trigger: 'blur' },
            { type: 'number', message: '请输入数字', trigger: 'blur' },
            { validator: validateUniqueAmount, trigger: 'change' }
          ]">
            <div class="level-item-content">
              <div class="sort">{{ index + 1 }}.</div>
              <div class="level-input">
                <el-input v-model.number="item.amount" placeholder="请输入金额" style="width: 120px" type="number" :min="0"
                  @input="(val) => handleAmountInput(val, item)">
                </el-input>
                <div>元</div>
              </div>
              <div class="level-symbol">=</div>
              <div class="level-input level-input-disabled">
                <el-input disabled :value="exchangeRate(item.amount)" style="width: 120px"></el-input>
                <div>未来币</div>
              </div>
              <div class="btn-group" v-if="index === formData.levelList.length - 1 && formData.levelList.length < 50">
                <el-button class="add-plus" type="text" icon="el-icon-plus" @click="addLevelItem(index)"
                  :disabled="formData.levelList.length >= 50" title="添加档位" />
              </div>
              <div class="btn-group2" v-if="formData.levelList.length > 1">
                <el-button class="add-minus" type="text" icon="el-icon-minus" @click="removeLevelItem(index)"
                  title="删除档位" />
              </div>
            </div>
          </el-form-item>
        </div>
      </div>

      <el-form-item class="form-actions">
        <el-button type="primary" size="medium" @click="handleSubmit" :loading="submitLoading"
          style="background: #4d23d9; border-color: #4d23d9;" :disabled="!isAllValid">
          保存
        </el-button>
        <el-button type="default" size="medium" @click="handleBack">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { addRechargeConfig } from '@/api/rechargeLevel';

export default {
  name: 'AddCompanion',
  inject: ['switchToList'],
  data() {
    return {
      submitLoading: false,
      formData: {
        type: "",
        levelList: [{ amount: null }],
      },
      channelOptions: [
        { label: "小程序", value: "tb_xcx" },
        { label: "安卓", value: "android" },
        { label: "iOS", value: "ios" },
      ],
      formRules: {
        type: [{ required: true, message: "请选择渠道", trigger: "change" }],
      },
    };
  },
  computed: {
    exchangeRateValue() {
      if (this.formData.type === 'ios') {
        return '0.7';
      }
      return '1';
    },
    exchangeRate() {
      return (money) => {
        if (!money && money !== 0) return '';
        if (this.formData.type === 'ios') {
          // 精确计算，保留1位小数
          const result = money * 0.7;
          // 如果是整数则显示整数，否则保留1位小数
          return result % 1 === 0 ? result : result.toFixed(1);
        }
        return money;
      };
    },
    isAllValid() {
      if (!this.formData.type) return false;
      if (!this.formData.levelList || this.formData.levelList.length === 0) return false;
      return this.formData.levelList.every(item => item.amount && item.amount > 0);
    }
  },
  activated() {
    this.resetForm();
  },
  deactivated() {
    this.resetForm();
  },
  methods: {
    resetForm() {
      this.formData = {
        type: "",
        levelList: [{ amount: null }],
      };
      this.submitLoading = false;
      this.$nextTick(() => {
        if (this.$refs.companionForm) {
          this.$refs.companionForm.clearValidate();
        }
      });
    },

    handleTypeChange() {
      this.formData.levelList = [{ amount: null }];
    },

    validateUniqueAmount(rule, value, callback) {
      const amounts = this.formData.levelList
        .map(item => item.amount)
        .filter(amount => amount !== null && amount !== undefined && amount !== '');
      const isDuplicate = amounts.filter(amount => amount === value).length > 1;
      if (isDuplicate) {
        callback(new Error('档位金额重复，请修改'));
      } else {
        callback();
      }
    },

    handleAmountInput(val, item) {
      if (val === '' || val === null || val === undefined) {
        item.amount = null;
        return;
      }
      const num = Number(val);
      if (Number.isNaN(num)) return;
      if (num < 0) item.amount = 0;
    },

    addLevelItem(index) {
      if (this.formData.levelList.length >= 50) {
        this.$message.warning("最多支持50个档位");
        return;
      }
      this.formData.levelList.splice(index + 1, 0, { amount: null });
    },

    removeLevelItem(index) {
      if (this.formData.levelList.length === 1) {
        this.$message.warning("至少保留一个档位");
        return;
      }
      this.formData.levelList.splice(index, 1);
    },

    async handleSubmit() {
      try {
        const isValid = await this.$refs.companionForm.validate();
        if (!isValid) return;

        this.submitLoading = true;

        // 构造提交数据
        const submitData = this.formData.levelList.map(item => ({
          type: this.formData.type,
          amount: item.amount,
          wlbCoin: this.exchangeRate(item.amount)
        }));

        const res = await addRechargeConfig(submitData);

        if (res.code === 200) {
          this.$message.success("保存成功！");
          this.switchToList(true);
        } else {
          this.$message.error(res.msg || "保存失败");
        }
      } catch (error) {
        console.error('提交表单异常:', error);
        this.$message.error("保存失败");
      } finally {
        this.submitLoading = false;
      }
    },

    handleBack() {
      const hasInput = this.formData.levelList.some(item => item.amount);
      if (hasInput) {
        this.$confirm("确定放弃编辑？所有更改将不保存。", "提示", {
          type: "warning",
          confirmButtonText: "确定返回",
          cancelButtonText: "继续编辑"
        }).then(() => {
          this.switchToList(false);
        }).catch(() => { });
      } else {
        this.switchToList(false);
      }
    },
  },
};
</script>

<style scoped lang="scss">
/* 保持原有样式不变 */
::v-deep .el-card__body {
  padding: 0;
}

.add-companion-container {
  background-color: #fff;
  padding: 32px;
  border-radius: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 防止外层滚动 */
  box-sizing: border-box;
}

.page-header {
  flex-shrink: 0;
  /* 头部不缩放 */
}

.companion-form {
  margin-top: 20px;
  flex: 1;
  overflow-y: auto;
  /* 表单区域可滚动 */
  padding-right: 10px;
  /* 给滚动条留空间 */
}

.rate {
  display: flex;
  align-content: center;
}

.rate-symbol {
  margin: 0 15px;
}

.rate-item {
  width: 150px;
  height: 36px;
  background: #f9f9f9;
  display: flex;
  align-items: center;
  border-radius: 6px;
  line-height: 36px;
  font-size: 13px;
}

.rate-item-title {
  width: 70px;
  background: #d9d9d9;
  border-radius: 6px 0 0 6px;
  text-align: center;
}

.rate-item-content {
  flex: 1;
  text-align: center;
}

.form-card {
  margin: 0 auto;
  border-radius: 0;
  border: 0;
}

.companion-form {
  margin-top: 20px;
}

.level-item-wrapper {
  margin-bottom: 8px;
  text-align: left;
}

.level-item-content {
  display: flex;
  align-content: center;
}

.sort {
  margin-right: 8px;
}

.level-symbol {
  padding: 0 15px;
}

.level-input {
  display: flex;
  align-items: center;
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  padding-right: 15px;
  box-sizing: border-box;
}

.level-input ::v-deep .el-input__inner {
  border: none;
}

.level-input-disabled {
  background-color: #F5F7FA;
}

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
}

.btn-group .el-button--text:hover {
  background: #3a19b8;
}

.btn-group2 .el-button--text {
  border-radius: 50%;
  background: #FF4D4F;
  color: #fff;
  height: 20px;
  width: 20px;
  padding: 0;
}

.btn-group2 .el-button--text:hover {
  background: #fa4548;
}

.form-actions {
  padding-left: 120px;
  margin-top: 30px;
}

.form-actions button {
  padding: 8px 24px;
  margin-right: 15px;
}

@media (max-width: 768px) {
  .add-companion-container {
    padding: 10px;
  }

  .form-actions {
    padding-left: 0;
    text-align: center;
  }

  .form-actions button {
    width: 100%;
    max-width: 200px;
    margin: 5px auto;
    display: block;
  }
}
</style>
