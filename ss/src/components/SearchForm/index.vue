<template>
  <el-form :inline="true" :model="formData" class="search-form" ref="formRef">
    <slot name="before"></slot>
    
    <!-- 动态渲染表单字段 -->
    <el-form-item 
      v-for="field in fields" 
      :key="field.prop" 
      :label="field.label"
      :rules="field.rules"
      :prop="field.prop"
    >
      <!-- 输入框 -->
      <el-input
        v-if="field.type === 'input'"
        v-model="formData[field.prop]"
        :placeholder="field.placeholder || `请输入${field.label}`"
        :clearable="field.clearable !== false"
        :disabled="field.disabled"
        @keyup.enter="onSearch"
      />

      <!-- 下拉选择 -->
      <el-select
        v-else-if="field.type === 'select'"
        v-model="formData[field.prop]"
        :placeholder="field.placeholder || `请选择${field.label}`"
        :clearable="field.clearable !== false"
        :multiple="field.multiple"
        :filterable="field.filterable"
      >
        <el-option
          v-for="option in field.options"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <!-- 增强版日期范围选择 -->
      <template v-else-if="field.type === 'daterange' || field.type === 'datetime-range'">
        <div class="enhanced-date-range">
          <!-- 快捷选择 -->
          <el-select
            v-if="field.shortcuts && field.shortcuts.length > 0"
            v-model="shortcutMap[field.prop]"
            placeholder="快捷选择"
            size="mini"
            style="width: 100px; margin-right: 8px;"
            @change="handleShortcutChange(field, $event)"
          >
            <el-option
              v-for="shortcut in field.shortcuts"
              :key="shortcut.value"
              :label="shortcut.label"
              :value="shortcut.value"
            />
          </el-select>
          
          <!-- 日期时间范围选择器 -->
          <el-date-picker
            v-if="field.type === 'datetime-range'"
            v-model="formData[field.prop]"
            type="datetimerange"
            :range-separator="field.rangeSeparator || '至'"
            :start-placeholder="field.startPlaceholder || '开始时间'"
            :end-placeholder="field.endPlaceholder || '结束时间'"
            :value-format="field.valueFormat || 'yyyy-MM-dd HH:mm:ss'"
            :clearable="field.clearable !== false"
            :editable="field.editable !== false"
            :disabled="field.disabled"
            :default-time="field.defaultTime || ['00:00:00', '23:59:59']"
            @change="handleDateRangeChange(field)"
            style="width: 380px"
          />
          
          <!-- 日期范围选择器 -->
          <el-date-picker
            v-else
            v-model="formData[field.prop]"
            type="daterange"
            :range-separator="field.rangeSeparator || '至'"
            :start-placeholder="field.startPlaceholder || '开始日期'"
            :end-placeholder="field.endPlaceholder || '结束日期'"
            :value-format="field.valueFormat || 'yyyy-MM-dd'"
            :clearable="field.clearable !== false"
            :editable="field.editable !== false"
            :disabled="field.disabled"
            :default-time="field.defaultTime"
            @change="handleDateRangeChange(field)"
            style="width: 280px"
          />
        </div>
      </template>
      
      <!-- 日期选择 -->
      <el-date-picker
        v-else-if="field.type === 'date' || field.type === 'datetime'"
        v-model="formData[field.prop]"
        :type="field.type === 'datetime' ? 'datetime' : 'date'"
        :placeholder="field.placeholder || `请选择${field.label}`"
        :value-format="field.valueFormat || (field.type === 'datetime' ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd')"
        :clearable="field.clearable !== false"
        :editable="field.editable !== false"
        :disabled="field.disabled"
        style="width: 180px"
      />
      
      <!-- 自定义插槽 -->
      <slot
        v-else-if="field.type === 'slot'"
        :name="field.slotName"
        :field="field"
        :formData="formData"
      />
    </el-form-item>
    
    <slot name="after"></slot>
    
    <!-- 操作按钮 -->
    <el-form-item class="form-actions">
      <slot name="actions">
        <el-button 
          type="primary" 
          @click="onSearch"
          :loading="loading"
        >
          搜索
        </el-button>
        <el-button @click="onReset">重置</el-button>
        <slot name="extra-buttons"></slot>
      </slot>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  name: 'SearchForm',
  props: {
    fields: {
      type: Array,
      required: true,
      default: () => []
    },
    initialData: {
      type: Object,
      default: () => ({})
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      formData: {},
      shortcutMap: {}
    }
  },
  watch: {
    initialData: {
      immediate: true,
      handler(val) {
        this.initFormData()
      }
    }
  },
  created() {
    // 初始化快捷选择映射
    this.initShortcutMap()
  },
  methods: {
    initFormData() {
      const defaultData = {}
      this.fields.forEach(field => {
        defaultData[field.prop] = field.defaultValue || ''
      })
      
      this.formData = {
        ...defaultData,
        ...this.initialData
      }
    },
    
    initShortcutMap() {
      this.fields.forEach(field => {
        if ((field.type === 'daterange' || field.type === 'datetime-range') && field.shortcuts) {
          this.shortcutMap[field.prop] = ''
        }
      })
    },
    
    // 处理快捷选择
    handleShortcutChange(field, value) {
      if (!value) return
      
      const dateRange = this.calculateDateRange(value, field.includeTime)
      
      // 更新表单数据
      this.$set(this.formData, field.prop, [
        dateRange.start,
        dateRange.end
      ])
      
      // 如果自动搜索
      if (field.autoSearch) {
        this.$nextTick(() => {
          this.onSearch()
        })
      }
    },
    
    // 计算时间范围
    calculateDateRange(shortcut, includeTime = true) {
      const now = new Date()
      const start = new Date()
      const end = new Date()
      
      switch (shortcut) {
        // 今天
        case 'today':
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)
          break
          
        // 昨天
        case 'yesterday':
          start.setDate(start.getDate() - 1)
          start.setHours(0, 0, 0, 0)
          end.setDate(end.getDate() - 1)
          end.setHours(23, 59, 59, 999)
          break
          
        // 最近7天
        case 'last7days':
          start.setDate(start.getDate() - 6)
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)
          break
          
        // 最近30天
        case 'last30days':
          start.setDate(start.getDate() - 29)
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)
          break
          
        // 本月
        case 'thisMonth':
          start.setDate(1)
          start.setHours(0, 0, 0, 0)
          end.setMonth(end.getMonth() + 1, 0)
          end.setHours(23, 59, 59, 999)
          break
          
        // 上月
        case 'lastMonth':
          start.setMonth(start.getMonth() - 1, 1)
          start.setHours(0, 0, 0, 0)
          end.setDate(0) // 上月最后一天
          end.setHours(23, 59, 59, 999)
          break
          
        // 今年
        case 'thisYear':
          start.setMonth(0, 1)
          start.setHours(0, 0, 0, 0)
          end.setMonth(11, 31)
          end.setHours(23, 59, 59, 999)
          break
          
        // 自定义：最近N天
        default:
          if (shortcut.startsWith('last')) {
            const days = parseInt(shortcut.replace('last', '').replace('days', ''))
            if (!isNaN(days)) {
              start.setDate(start.getDate() - (days - 1))
              start.setHours(0, 0, 0, 0)
              end.setHours(23, 59, 59, 999)
            }
          }
          break
      }
      
      // 格式化时间
      const format = includeTime ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd'
      return {
        start: this.formatDate(start, format),
        end: this.formatDate(end, format)
      }
    },
    
    // 格式化日期
    formatDate(date, format) {
      const pad = n => n.toString().padStart(2, '0')
      
      const year = date.getFullYear()
      const month = pad(date.getMonth() + 1)
      const day = pad(date.getDate())
      const hour = pad(date.getHours())
      const minute = pad(date.getMinutes())
      const second = pad(date.getSeconds())
      
      if (format === 'yyyy-MM-dd') {
        return `${year}-${month}-${day}`
      } else {
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`
      }
    },
    
    // 处理日期范围变化
    handleDateRangeChange(field) {
      // 清除对应的快捷选择
      if (this.shortcutMap[field.prop]) {
        this.shortcutMap[field.prop] = ''
      }
    },
    
    onSearch() {
      const params = this.getFormParams()
      this.$emit('search', params)
    },
    
    onReset() {
      this.$refs.formRef.resetFields()
      this.initFormData()
      this.initShortcutMap()
      this.$emit('reset')
    },
    
    getFormParams() {
      // 深拷贝表单数据
      const params = JSON.parse(JSON.stringify(this.formData))
      
      // 处理特殊字段
      this.fields.forEach(field => {
        if ((field.type === 'daterange' || field.type === 'datetime-range') && Array.isArray(params[field.prop])) {
          // 如果有字段映射
          if (field.propMap) {
            params[field.propMap.start] = params[field.prop][0] || ''
            params[field.propMap.end] = params[field.prop][1] || ''
          }
          // 删除原始字段
          delete params[field.prop]
        }
      })
      
      // 过滤空值
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key]
        }
      })
      
      return params
    },
    
    // 暴露给父组件的方法
    getFormData() {
      return this.formData
    },
    
    setFormData(data) {
      this.formData = { ...this.formData, ...data }
    },
    
    resetFields() {
      this.onReset()
    },
    
    // 设置日期范围
    setDateRange(fieldProp, start, end) {
      if (this.formData[fieldProp]) {
        this.$set(this.formData, fieldProp, [start, end])
      }
    },
    
    // 清除日期范围
    clearDateRange(fieldProp) {
      if (this.formData[fieldProp]) {
        this.$set(this.formData, fieldProp, [])
        if (this.shortcutMap[fieldProp]) {
          this.shortcutMap[fieldProp] = ''
        }
      }
    }
  },
  mounted() {
    this.initFormData()
  }
}
</script>

<style scoped>
.search-form {
  margin-bottom: 20px;
}
.form-actions {
  margin-right: 0;
}
.enhanced-date-range {
  display: flex;
  align-items: center;
}
</style>