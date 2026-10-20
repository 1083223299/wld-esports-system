<!--
  俱乐部保证金提现弹窗
  ---------------------------------------------------------------------------
  - 提现金额：取 overview.availableAmount（可提现余额），只读展示
  - 公会信息：父组件传入 tradeName / tradeNo
  - 发票：
      invoiceType=1 俱乐部开具 → 必须上传发票图片
      invoiceType=2 平台代开 → 展示税点提示，不上传发票
  - 提交：POST 提现申请（depositWithdrawOrder.clubDepositWithdrawApply）
-->
<template>
  <el-dialog
    title="提现"
    :visible.sync="dialogVisible"
    width="640px"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="游戏公会">
        <el-input :value="unionInfo.tradeName" disabled />
      </el-form-item>
      <el-form-item label="公会ID">
        <el-input :value="unionInfo.tradeNo" disabled />
      </el-form-item>
      <el-form-item label="提现金额">
        <el-input :value="formatAmount(amount)" disabled />
      </el-form-item>
      <el-form-item label="收款银行" prop="bankName">
        <el-input v-model.trim="form.bankName" placeholder="例如：工商银行、建设银行等" maxlength="50" />
      </el-form-item>
      <el-form-item label="收款账户" prop="accountNo">
        <el-input v-model.trim="form.accountNo" placeholder="请输入16-19位数字银行账号" maxlength="19" />
      </el-form-item>
      <el-form-item label="收款户名" prop="accountName">
        <el-input v-model.trim="form.accountName" placeholder="请输入收款账户名" maxlength="50" />
      </el-form-item>
      <el-form-item label="发票" prop="invoiceType">
        <el-radio-group v-model="form.invoiceType">
          <el-radio :label="1">俱乐部开具</el-radio>
          <el-radio :label="2">平台代开</el-radio>
        </el-radio-group>
        <div v-if="form.invoiceType === 2" class="form-tip">
          提交后由平台代开发票，税点为 {{ taxRateText }}
        </div>
      </el-form-item>
      <el-form-item v-if="form.invoiceType === 1" label="上传发票" prop="invoiceFile">
        <el-upload
          action="#"
          :show-file-list="false"
          :http-request="handleUpload"
          :before-upload="beforeUpload"
          accept="image/png,image/jpeg,image/jpg"
        >
          <div v-if="invoicePreview" class="invoice-preview">
            <img :src="invoicePreview" alt="发票" />
            <el-button type="text">重新上传</el-button>
          </div>
          <el-button v-else type="primary" plain size="small" :loading="uploading">上传发票</el-button>
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
import { clubDepositWithdrawApply } from "@/api/depositWithdrawOrder";

export default {
  name: "ClubDepositWithdrawDialog",
  props: {
    visible: { type: Boolean, default: false },
    /** 可提现金额（availableAmount） */
    amount: { type: [Number, String], default: 0 },
    /** 平台代开税点，如 "4.00" */
    invoiceTaxRate: { type: [Number, String], default: 0 },
    unionInfo: {
      type: Object,
      default: () => ({ tradeName: "", tradeNo: "" })
    }
  },
  data() {
    const validateAccountNo = (rule, value, callback) => {
      if (!value) {
        callback(new Error("请输入收款账号"));
        return;
      }
      if (!/^\d{16,19}$/.test(String(value))) {
        callback(new Error("请输入16-19位数字银行账号"));
        return;
      }
      callback();
    };
    const validateInvoiceFile = (rule, value, callback) => {
      // 仅「俱乐部开具」时强制上传发票
      if (this.form.invoiceType === 1 && !value) {
        callback(new Error("请上传发票"));
        return;
      }
      callback();
    };
    return {
      submitting: false,
      uploading: false,
      invoicePreview: "",
      form: {
        bankName: "",
        accountNo: "",
        accountName: "",
        invoiceType: 1, // 1 俱乐部开具 / 2 平台代开
        invoiceFile: "" // 上传后存 ossId 或 url
      },
      rules: {
        bankName: [{ required: true, message: "请输入收款银行", trigger: "blur" }],
        accountNo: [{ required: true, validator: validateAccountNo, trigger: "blur" }],
        accountName: [{ required: true, message: "请输入收款户名", trigger: "blur" }],
        invoiceType: [{ required: true, message: "请选择发票开具方式", trigger: "change" }],
        invoiceFile: [{ validator: validateInvoiceFile, trigger: "change" }]
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
    },
    taxRateText() {
      const rate = Number(this.invoiceTaxRate);
      return Number.isNaN(rate) ? "--" : `${rate}%`;
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.resetForm();
      }
    },
    // 切换开票方式时清掉发票校验提示
    "form.invoiceType"() {
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate("invoiceFile");
      });
    }
  },
  methods: {
    formatAmount(val) {
      const num = Number(val);
      if (Number.isNaN(num)) return "-";
      return `¥${num.toFixed(2)}`;
    },
    resetForm() {
      this.form = {
        bankName: "",
        accountNo: "",
        accountName: "",
        invoiceType: 1,
        invoiceFile: ""
      };
      this.invoicePreview = "";
      this.submitting = false;
      this.uploading = false;
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },
    handleClose() {
      this.resetForm();
      this.$emit("update:visible", false);
    },
    beforeUpload(file) {
      const isImage = ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
      if (!isImage) {
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
          throw new Error("未获取到发票文件");
        }
        // 提交优先传 ossId；预览优先用远程 url，否则本地 blob
        this.form.invoiceFile = String(ossId || url);
        this.invoicePreview = url || this.invoicePreview;
        if (!url && file) {
          this.invoicePreview = URL.createObjectURL(file);
        }
        this.$refs.formRef && this.$refs.formRef.validateField("invoiceFile");
        this.$message.success("上传成功");
      } catch (error) {
        this.$message.error(error.message || "上传失败");
      } finally {
        this.uploading = false;
      }
    },
    handleSubmit() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return;
        this.submitting = true;
        try {
          const payload = {
            amount: Number(this.amount),
            bankName: this.form.bankName,
            accountNo: this.form.accountNo,
            accountName: this.form.accountName,
            invoiceType: this.form.invoiceType
          };
          // 仅俱乐部开具时带发票文件
          if (this.form.invoiceType === 1) {
            payload.invoiceFile = this.form.invoiceFile;
          }
          const res = await clubDepositWithdrawApply(payload);
          if (!res || !res.success) {
            throw new Error((res && res.errorMessage) || "提现申请失败");
          }
          this.$message.success("提现申请已提交");
          this.dialogVisible = false;
          this.$emit("success", res.data || {});
        } catch (error) {
          this.$message.error(error.message || "提现申请失败");
        } finally {
          this.submitting = false;
        }
      });
    }
  }
};
</script>

<style scoped lang="scss">
.form-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 18px;
}

.invoice-preview {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;

  img {
    width: 120px;
    height: 80px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #ebeef5;
  }
}
</style>
