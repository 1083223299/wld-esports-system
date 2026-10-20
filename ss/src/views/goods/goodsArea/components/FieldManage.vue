<template>
  <div class="container-body">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
        @search="handleSearch" @reset="handleReset"></SearchForm>
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 操作按钮栏 -->
      <div class="action-bar-fixed" v-permission="'goodsArea:field:add'">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd">
          新增字段
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" ref="table">
          <!-- 字段名称 -->
          <el-table-column prop="" label="" width="100"></el-table-column>
          <el-table-column prop="fieldName" label="字段名称" show-overflow-tooltip></el-table-column>
          <!-- 操作按钮 -->
          <el-table-column label="操作" fixed="right" width="200" align="center">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8" v-permission="'goodsArea:field:edit'">
                  编辑
                </el-button>
                <el-button type="text" style="color: #f56c6c" @click="handleDelete(scope.row)" v-permission="'goodsArea:field:remove'">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.current" :page-size="pagination.size" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <FormDialog ref="dialog" :title="dialogTitle" @confirm="handleConfirm" />
  </div>
</template>

<script>
import SearchForm from '@/components/SearchComponent/index.vue';
import FormDialog from './FormDialog.vue';
import PaginationSimple from '@/components/PaginationSimple/index.vue';
import { productFieldList, addProductField, editProductField, removeProductField } from '@/api/goodsArea';

export default {
  name: 'FieldManage',
  components: { SearchForm, FormDialog, PaginationSimple },
  props: {
    gameName: { type: String, default: '' },
    productId: { type: [String, Number], default: '' }
  },
  data() {
    return {
      searchItems: [{ type: 'input', prop: 'fieldName', label: '字段名称', placeholder: '请输入字段名称', clearable: true }],
      filterForm: { fieldName: '' },
      loading: false,
      dialogTitle: '',
      currentRow: null,
      tableData: [],
      requestSerial: 0,
      pagination: {
        current: 1,
        size: 15,
        total: 0
      }
    };
  },
  watch: {
    productId: {
      handler() {
        this.fetchFieldList();
      },
      immediate: true
    }
  },
  methods: {
    async fetchFieldList() {
      if (!this.productId) {
        this.tableData = [];
        this.pagination.total = 0;
        return;
      }
      const requestId = ++this.requestSerial;
      this.loading = true;
      try {
        const params = {
          productId: this.productId,
          fieldName: this.filterForm.fieldName,
          pageNum: this.pagination.current,
          pageSize: this.pagination.size
        };
        const res = await productFieldList(params);
        if (requestId !== this.requestSerial) {
          return;
        }
        if (res.success && res.data) {
          this.tableData = res.data.rows || [];
          this.pagination.total = res.data.total || 0;
        }
      } catch (error) {
        if (requestId !== this.requestSerial) {
          return;
        }
        console.error('获取字段列表失败:', error);
        this.$message.error('获取字段列表失败');
      } finally {
        if (requestId === this.requestSerial) {
          this.loading = false;
        }
      }
    },
    handleSearch(e) {
      this.filterForm.fieldName = e?.fieldName || '';
      this.pagination.current = 1;
      this.fetchFieldList();
    },
    handleReset() {
      this.filterForm.fieldName = '';
      this.pagination.current = 1;
      this.fetchFieldList();
    },
    handleAdd() {
      this.dialogTitle = '新增字段';
      this.currentRow = null;
      this.$refs.dialog.open({ name: '' });
    },
    handleEdit(row) {
      this.dialogTitle = '编辑字段';
      this.currentRow = row;
      this.$refs.dialog.open({ name: row.fieldName });
    },
    handleDelete(row) {
      this.$confirm('确定删除吗？', '提示', { type: 'warning' }).then(async () => {
        try {
          await removeProductField(row.id);
          this.$message.success('删除成功');
          this.fetchFieldList();
        } catch (error) {
          console.error('删除字段失败:', error);
          this.$message.error('删除字段失败');
        }
      }).catch(() => { });
    },
    async handleConfirm(fieldName) {
      try {
        if (this.currentRow) {
          await editProductField({
            id: this.currentRow.id,
            productId: this.productId,
            fieldName: fieldName
          });
          this.$message.success('编辑成功');
        } else {
          await addProductField({
            productId: this.productId,
            fieldName: fieldName
          });
          this.$message.success('新增成功');
        }
        this.fetchFieldList();
      } catch (error) {
        console.error('保存字段失败:', error);
        this.$message.error('保存字段失败');
      }
    },
    handleCurrentChange(current) {
      this.pagination.current = current;
      this.fetchFieldList();
    }
  }
};
</script>

<style scoped lang="scss">
/* 页面容器 */
.container-body {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 列表卡片 */
.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 操作栏 */
.action-bar-fixed {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 20px;
}

/* 表格包裹层 - 核心滚动区域 */
.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
  position: relative;
}

/* 分页区域 */
.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

// 新增按钮样式
.add-btn {
  background: #6a35ff;
  border: none;
  width: 191px;
}

.add-btn:hover {
  background: #7b38d9;
}
</style>
