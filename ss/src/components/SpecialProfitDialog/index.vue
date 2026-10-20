<template>
  <div class="special-profit-dialog-root">
    <el-dialog
      :visible.sync="dialogVisible"
      width="560px"
      :close-on-click-modal="false"
      custom-class="special-profit-sharing-dialog"
      append-to-body
      @close="handleClose"
    >
      <div class="deduction-dialog__panel" v-loading="loading">
        <div class="deduction-dialog__header">
          <div>
            <div class="deduction-dialog__title">{{ isEdit ? "编辑特殊分润" : "新增特殊分润" }}</div>
            <div class="deduction-dialog__subtitle">请选择游戏并配置模式分润，提交后立即生效</div>
          </div>
          <div class="deduction-dialog__user">{{ isEdit ? "编辑" : "新增" }}</div>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-width="96px"
          class="deduction-form"
        >
          <div class="deduction-form-card">
            <el-form-item label="游戏名称" prop="productId">
              <el-select
                v-model="form.productId"
                placeholder="请选择游戏名称"
                filterable
                clearable
                style="width: 100%"
                :loading="productLoading"
                @change="handleProductChange"
              >
                <el-option
                  v-for="item in availableProductOptions"
                  :key="item.id"
                  :label="item.productName"
                  :value="String(item.id)"
                />
              </el-select>
            </el-form-item>
          </div>

          <div class="deduction-upload-card">
            <div class="deduction-upload-card__header">
              <div class="deduction-upload-card__title">
                <span class="deduction-required">*</span>分润规则
              </div>
              <div class="deduction-upload-card__desc">同一游戏下模式不可重复，可添加多条规则</div>
            </div>

            <div
              v-for="(item, index) in form.modeRows"
              :key="item._key"
              class="special-rule-item"
            >
              <div class="special-rule-item__top">
                <span class="special-rule-item__index">规则 {{ index + 1 }}</span>
                <div class="special-rule-item__ops">
                  <img
                    src="@/assets/De.png"
                    alt=""
                    class="special-op-icon"
                    :class="{ disabled: form.modeRows.length <= 1 }"
                    @click="removeModeRow(index)"
                  />
                  <img
                    v-if="index === form.modeRows.length - 1"
                    src="@/assets/In.png"
                    alt=""
                    class="special-op-icon"
                    @click="addModeRow"
                  />
                </div>
              </div>

              <el-form-item
                label="游戏模式"
                :prop="'modeRows.' + index + '.relationId'"
                :rules="modeRelationRules(index)"
              >
                <el-select
                  v-model="item.relationId"
                  placeholder="请选择游戏模式"
                  filterable
                  clearable
                  style="width: 100%"
                  :loading="modeLoading"
                  :disabled="!form.productId"
                >
                  <el-option
                    v-for="opt in getAvailableModes(index)"
                    :key="opt.id"
                    :label="opt.fieldName"
                    :value="opt.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item
                label="陪陪分润"
                :prop="'modeRows.' + index + '.waiterRateProportion'"
                :rules="modeRateRules"
              >
                <div class="deduction-amount">
                  <el-input
                    v-model="item.waiterRateProportion"
                    placeholder="请输入分润比例"
                    @input="sanitizeRowRate(item)"
                  >
                    <template slot="append">%</template>
                  </el-input>
                </div>
              </el-form-item>
            </div>
          </div>
        </el-form>

        <div class="deduction-dialog__footer">
          <el-button class="deduction-dialog__btn deduction-dialog__btn--ghost" @click="closeDialog">
            取消
          </el-button>
          <el-button
            type="primary"
            class="deduction-dialog__btn deduction-dialog__btn--primary"
            :loading="submitting"
            @click="handleSubmit"
          >
            提交
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
let rowSeed = 1;

const createModeRow = (payload = {}) => ({
  _key: `mode-${Date.now()}-${rowSeed++}`,
  specialId: payload.specialId ? String(payload.specialId) : "",
  relationId: payload.relationId ? String(payload.relationId) : "",
  relationName: payload.relationName || "",
  waiterRateProportion:
    payload.waiterRateProportion !== undefined && payload.waiterRateProportion !== null
      ? String(payload.waiterRateProportion)
      : "",
});

const rateValidator = (rule, value, callback) => {
  if (value === "" || value === null || value === undefined) {
    callback(new Error("请输入陪陪分润比例"));
    return;
  }
  if (!/^\d+(\.\d+)?$/.test(String(value))) {
    callback(new Error("仅支持正数"));
    return;
  }
  const num = Number(value);
  if (!(num > 0 && num <= 100)) {
    callback(new Error("取值范围为 0 < 比例 ≤ 100"));
    return;
  }
  callback();
};

export default {
  name: "SpecialProfitDialog",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    submitting: {
      type: Boolean,
      default: false,
    },
    productLoading: {
      type: Boolean,
      default: false,
    },
    modeLoading: {
      type: Boolean,
      default: false,
    },
    productOptions: {
      type: Array,
      default: () => [],
    },
    /** 已配置特殊分润的游戏 id 列表（编辑时需排除当前这条） */
    occupiedProductIds: {
      type: Array,
      default: () => [],
    },
    modeOptions: {
      type: Array,
      default: () => [],
    },
    value: {
      type: Object,
      default: () => ({
        profitId: "",
        productId: "",
        modeRows: [createModeRow()],
      }),
    },
  },
  data() {
    return {
      form: this.cloneForm(this.value),
      formRules: {
        productId: [{ required: true, message: "请选择游戏名称", trigger: "change" }],
      },
      modeRateRules: [{ required: true, validator: rateValidator, trigger: "blur" }],
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
    isEdit() {
      return !!this.form.profitId;
    },
    availableProductOptions() {
      const occupied = new Set((this.occupiedProductIds || []).map(String));
      const currentId = this.form.productId ? String(this.form.productId) : "";
      return (this.productOptions || []).filter((item) => {
        const id = String(item.id);
        if (currentId && id === currentId) return true;
        return !occupied.has(id);
      });
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.form = this.cloneForm(this.value);
        this.$nextTick(() => {
          if (this.$refs.formRef) this.$refs.formRef.clearValidate();
        });
      }
    },
  },
  methods: {
    cloneForm(source = {}) {
      const rows = Array.isArray(source.modeRows) && source.modeRows.length
        ? source.modeRows.map((row) => createModeRow(row))
        : [createModeRow()];
      return {
        profitId: source.profitId || "",
        productId: source.productId ? String(source.productId) : "",
        modeRows: rows,
      };
    },
    emitForm() {
      this.$emit("input", {
        profitId: this.form.profitId,
        productId: this.form.productId,
        modeRows: this.form.modeRows.map((row) => ({
          specialId: row.specialId || "",
          relationId: row.relationId,
          relationName: row.relationName || "",
          waiterRateProportion: row.waiterRateProportion,
        })),
      });
    },
    modeRelationRules(index) {
      return [
        { required: true, message: "请选择游戏模式", trigger: "change" },
        {
          validator: (rule, value, callback) => {
            if (!value) {
              callback(new Error("请选择游戏模式"));
              return;
            }
            const duplicated = this.form.modeRows.some(
              (row, i) => i !== index && String(row.relationId) === String(value)
            );
            if (duplicated) {
              callback(new Error("游戏模式不可重复"));
              return;
            }
            callback();
          },
          trigger: "change",
        },
      ];
    },
    getAvailableModes(index) {
      const selected = new Set(
        this.form.modeRows
          .filter((_, i) => i !== index)
          .map((row) => String(row.relationId))
          .filter(Boolean)
      );
      return (this.modeOptions || []).filter((opt) => !selected.has(String(opt.id)));
    },
    sanitizeRate(value) {
      return String(value || "")
        .replace(/[^\d.]/g, "")
        .replace(/^\./, "")
        .replace(/(\..*)\./g, "$1");
    },
    sanitizeRowRate(item) {
      item.waiterRateProportion = this.sanitizeRate(item.waiterRateProportion);
      this.emitForm();
    },
    addModeRow() {
      this.form.modeRows.push(createModeRow());
      this.emitForm();
    },
    removeModeRow(index) {
      if (this.form.modeRows.length <= 1) return;
      this.form.modeRows.splice(index, 1);
      this.emitForm();
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },
    handleProductChange(productId) {
      this.form.modeRows = [createModeRow()];
      this.emitForm();
      this.$emit("product-change", productId);
    },
    closeDialog() {
      this.dialogVisible = false;
    },
    handleClose() {
      this.$emit("close");
    },
    handleSubmit() {
      this.$refs.formRef.validate((valid) => {
        if (!valid) return;
        this.emitForm();
        this.$emit("submit", {
          profitId: this.form.profitId,
          productId: this.form.productId,
          modeRows: this.form.modeRows.map((row) => ({
            specialId: row.specialId || "",
            relationId: String(row.relationId),
            waiterRateProportion: String(row.waiterRateProportion),
          })),
        });
      });
    },
  },
};
</script>

<style>
/* 与未来币扣减弹窗完全一致的弹窗外壳 */
.special-profit-sharing-dialog {
  border-radius: 24px;
  overflow: hidden;
  margin-top: 8vh !important;
}

.special-profit-sharing-dialog .el-dialog__header {
  display: none;
}

.special-profit-sharing-dialog .el-dialog__body {
  padding: 0 !important;
}

.special-profit-sharing-dialog .el-dialog__footer {
  padding: 0 !important;
}

.special-profit-sharing-dialog .el-form-item__error {
  padding-top: 4px;
}

/* 以下样式挂在 custom-class 下，append-to-body 也能稳定生效 */
.special-profit-sharing-dialog .deduction-dialog__panel {
  padding: 26px 28px 24px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.1), transparent 24%),
    radial-gradient(circle at top right, rgba(12, 167, 255, 0.08), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
}

.special-profit-sharing-dialog .deduction-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.special-profit-sharing-dialog .deduction-dialog__title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2533;
}

.special-profit-sharing-dialog .deduction-dialog__subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #7b8496;
}

.special-profit-sharing-dialog .deduction-dialog__user {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(143, 3, 255, 0.08);
  font-size: 12px;
  font-weight: 600;
  color: #6a4ce0;
}

.special-profit-sharing-dialog .deduction-form .el-form-item {
  margin-bottom: 20px;
}

.special-profit-sharing-dialog .deduction-form .el-form-item__label {
  font-weight: 600;
  color: #303645;
}

.special-profit-sharing-dialog .deduction-form-card,
.special-profit-sharing-dialog .deduction-upload-card {
  padding: 18px 18px 4px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(225, 230, 239, 0.88);
  box-shadow: 0 10px 28px rgba(83, 97, 123, 0.08);
}

.special-profit-sharing-dialog .deduction-upload-card {
  margin-top: 14px;
  padding-bottom: 16px;
}

.special-profit-sharing-dialog .deduction-amount {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.special-profit-sharing-dialog .deduction-amount .el-input {
  width: 100%;
}

.special-profit-sharing-dialog .deduction-form .el-input__inner,
.special-profit-sharing-dialog .deduction-form .el-textarea__inner {
  border-radius: 14px;
  border-color: #e2e8f2;
  background: #fbfcff;
}

.special-profit-sharing-dialog .deduction-form .el-input__inner {
  height: 42px;
  line-height: 42px;
}

.special-profit-sharing-dialog .deduction-form .el-input__inner:focus,
.special-profit-sharing-dialog .deduction-form .el-textarea__inner:focus {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.special-profit-sharing-dialog .deduction-form .el-select .el-input.is-focus .el-input__inner {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.special-profit-sharing-dialog .deduction-form .el-input-group__append {
  border-color: #e2e8f2;
  background: #f5f7fb;
  color: #5d6678;
  font-weight: 600;
  border-radius: 0 14px 14px 0;
}

.special-profit-sharing-dialog .deduction-form .el-input-group .el-input__inner {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.special-profit-sharing-dialog .deduction-upload-card__header {
  margin-bottom: 14px;
}

.special-profit-sharing-dialog .deduction-upload-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2533;
}

.special-profit-sharing-dialog .deduction-required {
  margin-right: 4px;
  color: #f56c6c;
}

.special-profit-sharing-dialog .deduction-upload-card__desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #8a94a6;
}

.special-profit-sharing-dialog .special-rule-item {
  padding-top: 4px;
  margin-bottom: 8px;
  border-top: 1px dashed #e6eaf2;
}

.special-profit-sharing-dialog .special-rule-item:first-of-type {
  border-top: none;
  padding-top: 0;
}

.special-profit-sharing-dialog .special-rule-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.special-profit-sharing-dialog .special-rule-item__index {
  font-size: 13px;
  font-weight: 700;
  color: #6a4ce0;
}

.special-profit-sharing-dialog .special-rule-item__ops {
  display: flex;
  align-items: center;
  gap: 12px;
}

.special-profit-sharing-dialog .special-op-icon {
  width: 22px;
  height: 22px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.special-profit-sharing-dialog .special-op-icon:hover {
  opacity: 0.75;
}

.special-profit-sharing-dialog .special-op-icon.disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.special-profit-sharing-dialog .deduction-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
}

.special-profit-sharing-dialog .deduction-dialog__btn {
  min-width: 92px;
  height: 38px;
  border-radius: 999px;
}

.special-profit-sharing-dialog .deduction-dialog__btn--ghost {
  border-color: #dbe1ec;
  background: #fff;
  color: #566174;
}

.special-profit-sharing-dialog .deduction-dialog__btn--ghost:hover,
.special-profit-sharing-dialog .deduction-dialog__btn--ghost:focus {
  color: #566174;
  border-color: #c8d1e0;
  background: #f8faff;
}

.special-profit-sharing-dialog .deduction-dialog__btn--primary {
  border: none;
  background: linear-gradient(135deg, #8f03ff 0%, #5c67ff 100%);
  box-shadow: 0 10px 22px rgba(108, 95, 255, 0.22);
}

.special-profit-sharing-dialog .deduction-dialog__btn--primary:hover,
.special-profit-sharing-dialog .deduction-dialog__btn--primary:focus {
  background: linear-gradient(135deg, #7b00df 0%, #4f58eb 100%);
}
</style>
