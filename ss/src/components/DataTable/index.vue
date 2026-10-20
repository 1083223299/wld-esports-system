<template>
  <div class="data-table-container">
    <!-- 工具栏 -->
    <div v-if="showToolbar" class="table-toolbar">
      <div class="toolbar-left">
        <slot name="toolbar-left">
          <el-button
            v-if="showCreateBtn"
            type="primary"
            @click="$emit('create')"
            :icon="createBtnIcon"
          >
            {{ createBtnText }}
          </el-button>
        </slot>
      </div>
      <div class="toolbar-right">
        <slot name="toolbar-right">
          <el-button
            v-if="showRefresh"
            type="text"
            icon="el-icon-refresh"
            @click="$emit('refresh')"
            :loading="loading"
          >
            刷新
          </el-button>
          <el-button
            v-if="showColumnConfig"
            type="text"
            icon="el-icon-setting"
            @click="$emit('column-config')"
          >
            列设置
          </el-button>
        </slot>
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      :border="border"
      :stripe="stripe"
      :max-height="maxHeight"
      :height="height"
      :row-key="rowKey"
      :default-sort="defaultSort"
      @sort-change="onSortChange"
      @selection-change="onSelectionChange"
      @row-click="onRowClick"
      @row-dblclick="onRowDblClick"
      style="width: 100%"
    >
      <!-- 选择列 -->
      <el-table-column
        v-if="showSelection"
        type="selection"
        width="55"
        align="center"
      />

      <!-- 序号列 -->
      <el-table-column
        v-if="showIndex"
        type="index"
        label="序号"
        width="60"
        align="center"
        :index="indexMethod"
      />

      <!-- 动态列 -->
      <template v-for="column in columns">
        <!-- 自定义列 -->
        <el-table-column
          v-if="column.type"
          :key="`type-${column.prop || column.type}`"
          :type="column.type"
          :width="column.width"
          :align="column.align || 'center'"
          :header-align="column.headerAlign || 'center'"
          :label="column.label"
          :fixed="column.fixed"
          :sortable="column.sortable"
        />

        <!-- 操作列 -->
        <el-table-column
          v-else-if="column.prop === 'actions'"
          :key="`actions-${column.prop}`"
          :label="column.label || '操作'"
          :width="column.width || '200'"
          :align="column.align || 'center'"
          :fixed="column.fixed"
        >
          <template slot-scope="scope">
            <slot name="actions" :row="scope.row" :index="scope.$index">
              <el-button
                v-for="(btn, index) in column.buttons"
                :key="index"
                :type="btn.type || 'text'"
                :size="btn.size || 'mini'"
                :icon="btn.icon"
                :disabled="btn.disabled && btn.disabled(scope.row)"
                @click.stop="btn.click(scope.row)"
              >
                {{ btn.text }}
              </el-button>
            </slot>
          </template>
        </el-table-column>

        <!-- 普通列 -->
        <el-table-column
          v-else
          :key="`normal-${column.prop}`"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :align="column.align || 'center'"
          :header-align="column.headerAlign || 'center'"
          :fixed="column.fixed"
          :sortable="column.sortable"
          :formatter="column.formatter"
        >
          <!-- 自定义列内容 -->
          <template v-if="column.render" slot-scope="scope">
            <component
              :is="column.render"
              :row="scope.row"
              :$index="scope.$index"
              :column="column"
            />
          </template>

          <!-- 默认插槽 -->
          <template v-else-if="column.slotName" slot-scope="scope">
            <slot
              :name="column.slotName"
              :row="scope.row"
              :index="scope.$index"
            />
          </template>
        </el-table-column>
      </template>
    </el-table>

    <!-- 分页 -->
    <div v-if="showPagination && pagination.total > 0" class="table-pagination">
      <el-pagination
        :current-page="pagination.current"
        :page-sizes="pagination.pageSizes"
        :page-size="pagination.size"
        :layout="pagination.layout"
        :total="pagination.total"
        :background="pagination.background"
        @size-change="onPageSizeChange"
        @current-change="onPageChange"
      >
        <template v-if="showJumpTo" #jumper>
          <span>跳至</span>
          <el-input
            v-model.number="jumpPage"
            size="mini"
            @keyup.enter.native="onJumpPage"
            style="width: 60px; margin: 0 5px"
          />
          <span>页</span>
        </template>
      </el-pagination>
    </div>

    <!-- 底部 -->
    <div v-if="$slots.footer" class="table-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
  
  <script>
export default {
  name: "DataTable",
  props: {
    // 表格数据
    tableData: {
      type: Array,
      default: () => [],
    },

    // 列配置
    columns: {
      type: Array,
      required: true,
      default: () => [],
    },

    // 加载状态
    loading: {
      type: Boolean,
      default: false,
    },

    // 分页配置
    pagination: {
      type: Object,
      default: () => ({
        current: 1,
        size: 10,
        total: 0,
        pageSizes: [10, 20, 50, 100],
        layout: "prev, pager, next, jumper, ->, total",
        background: true,
      }),
    },

    // 表格配置
    border: {
      type: Boolean,
      default: true,
    },
    stripe: {
      type: Boolean,
      default: false,
    },
    height: {
      type: [String, Number],
      default: null,
    },
    maxHeight: {
      type: [String, Number],
      default: null,
    },
    rowKey: {
      type: String,
      default: "id",
    },
    defaultSort: {
      type: Object,
      default: null,
    },

    // 功能开关
    showToolbar: {
      type: Boolean,
      default: true,
    },
    showCreateBtn: {
      type: Boolean,
      default: false,
    },
    createBtnText: {
      type: String,
      default: "新增",
    },
    createBtnIcon: {
      type: String,
      default: "el-icon-plus",
    },
    showRefresh: {
      type: Boolean,
      default: false,
    },
    showColumnConfig: {
      type: Boolean,
      default: false,
    },
    showSelection: {
      type: Boolean,
      default: false,
    },
    showIndex: {
      type: Boolean,
      default: false,
    },
    showPagination: {
      type: Boolean,
      default: true,
    },
    showJumpTo: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      jumpPage: 1,
      selectedRows: [],
    };
  },

  watch: {
    "pagination.current": {
      handler(val) {
        this.jumpPage = val;
      },
      immediate: true,
    },
  },

  methods: {
    // 分页事件
    onPageSizeChange(size) {
      this.$emit("page-size-change", size);
    },

    onPageChange(page) {
      this.$emit("page-change", page);
    },

    onJumpPage() {
      if (this.jumpPage && this.jumpPage !== this.pagination.current) {
        const totalPage = Math.ceil(
          this.pagination.total / this.pagination.size
        );
        if (this.jumpPage > totalPage) {
          this.jumpPage = totalPage;
        }
        this.$emit("page-change", this.jumpPage);
      }
    },

    // 表格事件
    onSortChange(sort) {
      this.$emit("sort-change", sort);
    },

    onSelectionChange(selection) {
      this.selectedRows = selection;
      this.$emit("selection-change", selection);
    },

    onRowClick(row, column, event) {
      this.$emit("row-click", row, column, event);
    },

    onRowDblClick(row, column, event) {
      this.$emit("row-dblclick", row, column, event);
    },

    // 序号方法
    indexMethod(index) {
      const { current, size } = this.pagination;
      return (current - 1) * size + index + 1;
    },

    // 暴露给父组件的方法
    clearSelection() {
      this.$refs.table?.clearSelection();
    },

    getSelection() {
      return this.selectedRows;
    },

    toggleRowSelection(row, selected) {
      this.$refs.table?.toggleRowSelection(row, selected);
    },

    toggleAllSelection() {
      this.$refs.table?.toggleAllSelection();
    },
  },
};
</script>
  
  <style scoped>
.data-table-container {
  width: 100%;
}
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.table-pagination {
  margin-top: 20px;
  text-align: right;
}
.table-footer {
  margin-top: 20px;
}
</style>