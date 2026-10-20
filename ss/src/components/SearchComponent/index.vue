<template>
  <div class="search-form-container">
    <el-form ref="searchForm" :model="formData" :inline="true" :label-width="labelWidth" label-position="left"
             class="search-form" @submit.native.prevent>
      <!-- 使用 el-row 和 el-col 布局 -->
      <el-row :gutter="gutter">
        <!-- 动态渲染搜索项，每个占8列（一行3个） -->
        <el-col v-for="item in formItems" :key="item.prop" :span="item.span || 8"
                :style="{ marginBottom: '16px', padding: '0 12px 0 0 !important' }">
          <!-- 文本输入框 -->
          <template v-if="item.type === 'input'">
            <el-form-item :label="`${item.label}`" :prop="item.prop" :label-style="{ color: '#1D2129' }">
              <el-input @input="(val) => handleNumberInput(val, item)" v-model="formData[item.prop]"
                        :placeholder="item.placeholder || `请输入${item.label}`"
                        :clearable="item.clearable !== false" @keyup.enter.native="handleSearch"/>
            </el-form-item>
          </template>

          <!-- 下拉选择器 -->
          <template v-else-if="item.type === 'select'">
            <el-form-item :label="`${item.label}`" :prop="item.prop" :label-style="{ color: '#1D2129' }">
              <el-select v-model="formData[item.prop]" :placeholder="item.placeholder || `请选择${item.label}`"
                         :clearable="item.clearable !== false" style="width: 100%" :filterable="item.filterable"
                         :multiple="item.multiple">
                <el-option v-for="option in item.options" :key="option.value" :label="option.label"
                           :value="option.value"/>
              </el-select>
            </el-form-item>
          </template>

          <!-- 级联选择器（用于树形选择） -->
          <template v-else-if="item.type === 'tree-select'">
            <el-form-item :label="`${item.label}`" :prop="item.prop" :label-style="{ color: '#1D2129' }">
              <el-cascader v-model="formData[item.prop]" :options="item.options"
                :placeholder="item.placeholder || `请选择${item.label}`"
                :clearable="item.clearable !== false" style="width: 100%"
                :filterable="item.filterable !== false"
                :props="item.props || { label: 'label', value: 'id', children: 'children', checkStrictly: true, emitPath: false }"
                :show-all-levels="false" />
            </el-form-item>
          </template>

          <!-- 单选框 -->
          <template v-else-if="item.type === 'radio'">
            <el-form-item :label="`${item.label}`" :prop="item.prop" :label-style="{ color: '#1D2129' }">
              <el-radio-group v-model="formData[item.prop]">
                <el-radio v-for="option in item.options" :key="option.value" :label="option.value">
                  {{ option.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </template>

          <!-- 日期选择器 -->
          <template v-else-if="item.type === 'date'">
            <el-form-item :label="`${item.label}`" :prop="item.prop" :label-style="{ color: '#1D2129' }">
              <el-date-picker v-model="formData[item.prop]" :type="item.dateType || 'date'"
                              :placeholder="item.placeholder || `请选择${item.label}`"
                              :value-format="item.valueFormat || 'yyyy-MM-dd'"
                              style="width: 100%" :clearable="item.clearable !== false"
                              :picker-options="getPickerOptions(item)"
                              @change="handleDateChange(item)"/>
            </el-form-item>
          </template>

          <!-- 日期范围选择器（datetimerange+default-time） -->
          <template v-else-if="item.type === 'daterange'">
            <el-form-item :label="`${item.label}`" :prop="item.prop" :label-style="{ color: '#1D2129' }">
              <el-date-picker v-model="formData[item.prop]" type="datetimerange"
                              :start-placeholder="item.startPlaceholder || '开始日期'"
                              :end-placeholder="item.endPlaceholder || '结束日期'"
                              :value-format="item.valueFormat || 'yyyy-MM-dd HH:mm:ss'" style="width: 100%"
                              :clearable="item.clearable !== false" :picker-options="getPickerOptions(item)"
                              :range-separator="item.rangeSeparator || '—'" :default-time="['00:00:00', '23:59:59']"
                              class="hide-time-in-input" @change="handleDateChange(item)"/>
            </el-form-item>
          </template>

          <!-- 日期范围选择器（不包含时分秒） -->
          <template v-else-if="item.type === 'daterange-no-time'">
            <el-form-item :label="`${item.label}`" :prop="item.prop" :label-style="{ color: '#1D2129' }">
              <el-date-picker v-model="formData[item.prop]" type="daterange"
                :start-placeholder="item.startPlaceholder || '开始日期'" :end-placeholder="item.endPlaceholder || '结束日期'"
                :value-format="item.valueFormat || 'yyyy-MM-dd'" style="width: 100%"
                :clearable="item.clearable !== false" :picker-options="getPickerOptions(item)"
                :range-separator="item.rangeSeparator || '—'" @change="handleDateChange(item)" />
            </el-form-item>
          </template>

          <!-- 自定义插槽 -->
          <template v-else-if="item.type === 'slot'">
            <el-form-item :label="item.label ? `${item.label}` : ''" :prop="item.prop"
                          :label-style="{ color: '#1D2129' }">
              <slot :name="item.slotName" :form="formData" :item="item"/>
            </el-form-item>
          </template>
        </el-col>


      </el-row>
      <!-- 按钮区域 - 单独一行 -->
      <div class="form-actions">
        <el-button type="primary" class="Search-Button"
                   :style="{ backgroundColor: '#6A35FF', borderColor: '#6A35FF' }" @click="handleSearch">
          搜索
        </el-button>
        <el-button v-if="showReset" class="Reset-Button" @click="handleReset">
          重置
        </el-button>
        <!-- <el-form-item></el-form-item> -->
      </div>
    </el-form>
  </div>
</template>

<script>
export default {
  name: "SearchForm",

  props: {
    // 表单配置项数组 - 兼容 items 和 fields 两种命名
    items: {
      type: Array,
      default: () => [],
    },
    // 为了兼容性，也支持 fields 属性名
    fields: {
      type: Array,
      default: () => [],
    },
    // 栅格间隔
    gutter: {
      type: Number,
      default: 20,
    },
    // 标签宽度
    labelWidth: {
      type: String,
      default: "82px",
    },
    // 是否显示重置按钮
    showReset: {
      type: Boolean,
      default: true,
    },
    // 是否在重置前二次确认
    confirmReset: {
      type: Boolean,
      default: true,
    },
    // 重置确认文案
    confirmResetMessage: {
      type: String,
      default: "确定要重置所有筛选条件吗？",
    },
    // 重置确认标题
    confirmResetTitle: {
      type: String,
      default: "提示",
    },
    // 初始值
    initialValues: {
      type: Object,
      default: () => ({}),
    },
    // 是否需要即时搜索（输入变化时触发）
    immediateSearch: {
      type: Boolean,
      default: false,
    },
    // 每项占的列数（8 = 一行3个）
    colSpan: {
      type: Number,
      default: 8,
    },
  },

  data() {
    return {
      formData: {},
      // 存储默认值用于重置
      defaultFormData: {},
      rangePickState: {},
    };
  },

  computed: {
    // 合并 items 和 fields，优先使用 items
    formItems() {
      return this.items.length > 0 ? this.items : this.fields;
    },
  },

  watch: {
    // 监听表单变化，如果开启即时搜索则自动触发
    formData: {
      handler(newVal) {
        if (this.immediateSearch) {
          this.$emit("search", newVal);
        }
      },
      deep: true,
    },
  },

  created() {
    this.initFormData();
  },

  methods: {
    // 初始化表单数据
    initFormData() {
      const formData = {};
      const defaultFormData = {};

      this.formItems.forEach((item) => {
        const fieldDefault = this.cloneFieldValue(this.getDefaultValue(item));
        defaultFormData[item.prop] = fieldDefault;

        if (Object.prototype.hasOwnProperty.call(this.initialValues, item.prop)) {
          formData[item.prop] = this.cloneFieldValue(this.initialValues[item.prop]);
        } else {
          formData[item.prop] = this.cloneFieldValue(fieldDefault);
        }
      });

      this.formData = formData;
      this.defaultFormData = defaultFormData;
    },

    cloneFieldValue(value) {
      if (Array.isArray(value)) {
        return [...value];
      }
      if (value !== null && typeof value === "object") {
        return JSON.parse(JSON.stringify(value));
      }
      return value;
    },
    // 对输入框进行处理的
    handleNumberInput(value, item) {
      // 如果 inputType 配置了 number 属性，才进行数字限制
      if (item.inputType === 'number') {
        // 只允许输入数字和小数点
        let newValue = value.replace(/[^\d.]/g, '');
        // 限制只能有一个小数点
        const parts = newValue.split('.');
        if (parts.length > 2) {
          newValue = parts[0] + '.' + parts.slice(1).join('');
        }
        this.$set(this.formData, item.prop, newValue);
        return;
      }
      if (item.inputType === 'integer') {
        this.$set(this.formData, item.prop, value.replace(/\D/g, ''));
      }
    },

    // 默认值逻辑：daterange默认空（父组件传最近30天）
    getDefaultValue(item) {
      switch (item.type) {
        case "input":
          return item.defaultValue || "";
        case "select":
          return item.multiple
            ? item.defaultValue || []
            : item.defaultValue || "";
        case "radio":
          return item.defaultValue || "";
        case "date":
          return item.defaultValue || "";
        case "daterange":
          return item.defaultValue || [];
        default:
          return "";
      }
    },

    // 搜索事件
    handleSearch() {
      // 触发验证
      this.$refs.searchForm.validate((valid) => {
        if (valid) {
          // 深拷贝表单数据，避免引用问题
          const formData = JSON.parse(JSON.stringify(this.formData));
          this.$emit("search", formData);
        } else {
          console.log("表单验证失败");
          return false;
        }
      });
    },

    // 执行重置表单
    doReset() {
      const resetData = this.cloneFieldValue(this.defaultFormData);
      Object.keys(resetData).forEach((key) => {
        this.$set(this.formData, key, this.cloneFieldValue(resetData[key]));
      });
      this.$nextTick(() => {
        if (this.$refs.searchForm) {
          this.$refs.searchForm.clearValidate();
        }
      });
      this.$emit("reset", this.cloneFieldValue(this.formData));
    },

    // 重置表单
    handleReset() {
      if (!this.confirmReset) {
        this.doReset();
        return;
      }
      this.$confirm(this.confirmResetMessage, this.confirmResetTitle, { type: "warning" })
        .then(() => {
          this.doReset();
        })
        .catch(() => { });
    },

    // 获取表单数据
    getFormData() {
      return JSON.parse(JSON.stringify(this.formData));
    },

    // 设置表单数据
    setFormData(data) {
      Object.keys(data).forEach((key) => {
        if (this.formData.hasOwnProperty(key)) {
          this.$set(this.formData, key, data[key]);
        }
      });
    },

    // 日期类组件默认禁止选择今天之后的日期，同时保留页面自定义 pickerOptions
    getPickerOptions(item) {
      const vm = this;
      const pickerOptions = item.pickerOptions || {};
      if (item.allowFutureDate) {
        return pickerOptions;
      }
      const originDisabledDate = pickerOptions.disabledDate;
      const originOnPick = pickerOptions.onPick;
      return {
        ...pickerOptions,
        onPick(pick) {
          if (item && ["daterange", "daterange-no-time"].includes(item.type)) {
            vm.$set(vm.rangePickState, item.prop, {
              minDate: pick && pick.minDate ? new Date(pick.minDate) : null,
              maxDate: pick && pick.maxDate ? new Date(pick.maxDate) : null,
            });
          }
          if (typeof originOnPick === "function") {
            originOnPick(pick);
          }
        },
        disabledDate(time) {
          const now = new Date();
          const isFutureDate = item && ["daterange", "daterange-no-time"].includes(item.type)
            ? new Date(time.getFullYear(), time.getMonth(), time.getDate()).getTime() >
              new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
            : time.getTime() > now.getTime();
          let isOutOfRange = false;
          if (item && ["daterange", "daterange-no-time"].includes(item.type)) {
            const pickedState = vm.rangePickState[item.prop] || {};
            if (pickedState.minDate && !pickedState.maxDate) {
              const maxRangeDays = item.maxRangeDays || 31;
              const minDate = new Date(
                pickedState.minDate.getFullYear(),
                pickedState.minDate.getMonth(),
                pickedState.minDate.getDate()
              );
              const currentDate = new Date(
                time.getFullYear(),
                time.getMonth(),
                time.getDate()
              );
              const diffDays = Math.abs(currentDate.getTime() - minDate.getTime()) / (24 * 3600 * 1000);
              isOutOfRange = diffDays > maxRangeDays - 1;
            }
          }
          if (typeof originDisabledDate === "function") {
            return isFutureDate || isOutOfRange || originDisabledDate(time);
          }
          return isFutureDate || isOutOfRange;
        }
      };
    },

    handleDateChange(item) {
      if (!item || !["daterange", "daterange-no-time"].includes(item.type)) {
        return;
      }
      const value = this.formData[item.prop];
      if (!Array.isArray(value) || value.length !== 2 || !value[0] || !value[1]) {
        this.$set(this.rangePickState, item.prop, {
          minDate: null,
          maxDate: null,
        });
        return;
      }
      const maxRangeDays = item.maxRangeDays || 31;
      const dayCount = this.getInclusiveDayCount(value[0], value[1]);
      if (dayCount > maxRangeDays) {
        this.$message.warning(`日期范围最多支持选择${maxRangeDays}天`);
        this.$set(this.formData, item.prop, []);
      }
      this.$set(this.rangePickState, item.prop, {
        minDate: null,
        maxDate: null,
      });
    },

    getInclusiveDayCount(startValue, endValue) {
      const startDate = new Date(startValue);
      const endDate = new Date(endValue);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return 0;
      }
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      return Math.floor((endDay.getTime() - startDay.getTime()) / (24 * 3600 * 1000)) + 1;
    },

    // 清空表单验证
    clearValidate(fields) {
      this.$refs.searchForm.clearValidate(fields);
    },
  },
};
</script>

<style lang="scss" scoped>
/* 隐藏输入框中的时分秒部分 */
.hide-time-in-input ::v-deep.el-range-input {
  width: 74px !important; /* 只显示年月日的宽度 */
  overflow: hidden;
}

/* 当聚焦时显示完整内容 */
// .hide-time-in-input ::v-deep.el-range-input:focus-within {
//   width: auto !important;
// }
::v-deep.el-input__inner {
  flex-wrap: nowrap !important;
  justify-content: space-evenly !important;
  align-items: baseline !important;

}

.hide-time-in-input ::v-deep.el-range-separator {
  color: #96989b;
}

/* 或者在失去焦点后截断显示 */
// .hide-time-in-input ::v-deep.el-range-input {
//   // text-overflow: ellipsis;
// }
::v-deep .el-row {
  margin: 0 !important;
}

::v-deep .el-col {
  padding: 0 !important;
}

::v-deep .el-input__inner {
  border-radius: 8px !important;
}

.Search-Button {
  width: 93px;
  height: 40px;
  font-size: 14px;
  color: #FFFFFF;
  border-radius: 8px;
  text-align: center;
  line-height: 40px;
  padding: 0;
}

.Reset-Button {
  width: 85px;
  height: 40px;
  font-size: 14px;
  color: #1D2129;
  border-radius: 8px;
  // background: #F2F3F5 !important;
  text-align: center;
  line-height: 40px;
  padding: 0;
}

.search-form-container {
  padding: 24px 24px 8px;
  background: #fff;
  border-radius: 24px;
  margin-bottom: 20px;


  .search-form {
    width: 100%;

    ::v-deep .el-form-item {
      margin-bottom: 0;
      width: 100%;
      display: flex;
      align-items: center;

      .el-form-item__label {
        color: #1D2129;
        font-weight: normal;
      }

      .el-form-item__content {
        width: calc(100% - 100px);

        .el-input,
        .el-select,
        .el-date-editor {
          width: 100%;
        }

        // 单选框组样式
        .el-radio-group {
          .el-radio {
            margin-right: 20px;
            margin-bottom: 5px;
          }
        }
      }
    }

    .form-actions {
      text-align: right;

      ::v-deep .el-form-item {
        margin-bottom: 0;
      }
    }
  }
}

// 自定义搜索按钮样式
::v-deep .el-button--primary {
  &.custom-search-btn {
    background-color: #6a35ff !important;
    border-color: #6a35ff !important;

    &:hover,
    &:focus {
      background-color: #5a2ce0 !important;
      border-color: #5a2ce0 !important;
    }

    &:active {
      background-color: #4a24c0 !important;
      border-color: #4a24c0 !important;
    }
  }
}

/* 隐藏 number 输入框的上下箭头 */
::v-deep input::-webkit-outer-spin-button,
::v-deep input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

::v-deep input[type=number] {
  -moz-appearance: textfield;
}

::v-deep.available:hover {
  color: #6a35ff !important;
}

// 小屏幕适配
@media screen and (max-width: 768px) {
  .search-form-container {
    padding: 15px;
  }
}
</style>
