<template>
  <div class="list-wrapper">
    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd" v-permission="'system:goodsCategory:add'">
          新增品类
        </el-button>
      </div>

      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">
          <el-table-column prop="categoryName" label="品类名称"></el-table-column>
          <el-table-column prop="sort" label="排序值"></el-table-column>
          <el-table-column prop="productCount" label="商品数量">
            <template slot-scope="scope">
              <span>{{ scope.row.productCount || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="280" >
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleGoodsManage(scope.row)" style="color: #9047f8" v-permission="'system:goodsCategory:goods'">
                  商品管理
                </el-button>
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8" v-permission="'system:goodsCategory:edit'">
                  编辑
                </el-button>
                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c" v-permission="'system:goodsCategory:remove'">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="drawerTitle" :visible.sync="drawerVisible" width="500px" :close-on-click-modal="false"
      :close-on-press-escape="false" @close="closeDrawer">
      <el-form ref="categoryForm" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="品类名称" prop="categoryName">
          <el-input v-model="formData.categoryName" placeholder="请输入品类名称" maxlength="15" />
        </el-form-item>
        <el-form-item label="排序值" prop="sort">
          <el-input-number v-model="formData.sort" :min="0" :max="999" controls-position="right" style="width: 100%" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="closeDrawer">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { productCategoryList, addProductCategory, updateProductCategory, deleteProductCategory } from "@/api/goodsCategory";

export default {
  name: "ProductCategoryList",
  components: { PaginationSimple },
  inject: ["switchToGoods", "getSharedData"],
  data() {
    return {
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      drawerVisible: false,
      drawerTitle: "新增品类",
      formData: { id: null, categoryName: "", sort: 0 },
      submitting: false,
      rules: {
        categoryName: [{ required: true, message: "请输入品类名称", trigger: "blur" }],
        sort: [{ required: true, message: "请输入排序值", trigger: "blur" }]
      }
    };
  },
  created() {
    this.fetchTableData();
  },
  activated() {
    const sharedData = this.getSharedData();
    if (sharedData && sharedData.needRefresh) {
      this.fetchTableData();
    }
  },
  methods: {
    async fetchTableData() {
      this.loading = true;
      try {
        const params = { pageNum: this.pagination.pageNum, pageSize: this.pagination.pageSize };
        const res = await productCategoryList(params);
        if (res.code === 200 && res.data) {
          this.tableData = res.data.rows || [];
          this.pagination.total = res.data.total || 0;
        }
      } catch (error) {
        console.error("获取品类列表失败:", error);
        this.$message.error("获取品类列表失败");
      } finally {
        this.loading = false;
      }
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },
    handleAdd() {
      this.drawerTitle = "新增品类";
      this.formData = { id: null, categoryName: "", sort: 0 };
      this.drawerVisible = true;
    },
    handleEdit(row) {
      this.drawerTitle = "编辑品类";
      this.formData = { id: row.id, categoryName: row.categoryName, sort: row.sort };
      this.drawerVisible = true;
    },
    async handleDelete(row) {
      this.$confirm("确定要删除该品类吗？", "提示", { type: "warning" })
        .then(async () => {
          await deleteProductCategory(row.id);
          this.$message.success("删除成功");
          this.fetchTableData();
        })
        .catch(() => { });
    },
    handleGoodsManage(row) {
      this.switchToGoods({ id: row.id, categoryName: row.categoryName });
    },
    closeDrawer() {
      this.drawerVisible = false;
      this.formData = { id: null, categoryName: "", sort: 0 };
      this.submitting = false;
      this.$nextTick(() => {
        if (this.$refs.categoryForm) {
          this.$refs.categoryForm.clearValidate();
        }
      });
    },
    async handleSubmit() {
      this.$refs.categoryForm.validate(async (valid) => {
        if (!valid) return;
        this.submitting = true;
        try {
          if (this.formData.id) {
            await updateProductCategory(this.formData);
            this.$message.success("编辑成功");
          } else {
            await addProductCategory(this.formData);
            this.$message.success("新增成功");
          }
          this.closeDrawer();
          this.fetchTableData();
        } catch (error) {
          console.error("提交失败:", error);
          this.$message.error("操作失败");
        } finally {
          this.submitting = false;
        }
      });
    }
  }
};
</script>

<style scoped>
/* 页面容器 */
.list-wrapper {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.action-bar-fixed {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 20px;
}

.add-btn {
  background: #6a35ff;
  border: none;
  width: 191px;
}

.add-btn:hover {
  background: #7b38d9;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
  position: relative;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.form-footer {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}
</style>