<template>
  <div class="container-body">
    <!-- 头部返回 -->
    <div class="page-header" @click="handleBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">返回</div>
    </div>

    <!-- 品类信息卡片 -->
    <el-card class="info-card" shadow="never">
      <div class="info-content">
        <span class="info-label">当前品类：</span>
        <span class="info-value">{{ categoryName }}</span>
      </div>
    </el-card>

    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
        @search="handleSearch" @reset="handleReset"></SearchForm>
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd">
          新增商品
        </el-button>
      </div>

      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">
          <el-table-column prop="productImgUrl" label="商品图片">
            <template slot-scope="scope">
              <img v-if="scope.row.productImgUrl" :src="scope.row.productImgUrl" class="product-thumb"
                @click="previewImage(scope.row.productImgUrl)" />
              <img v-else src="@/assets/defaulIcon.png" class="product-thumb" />
            </template>
          </el-table-column>
          <el-table-column prop="productName" label="商品名称" show-overflow-tooltip></el-table-column>
          <el-table-column prop="sort" label="排序值"></el-table-column>
          <el-table-column label="操作" fixed="right" width="150">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleDeleteGoods(scope.row)" style="color: #f56c6c">
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

    <!-- 批量新增商品弹窗 -->
    <el-drawer :title="drawerTitle" :visible.sync="drawerVisible" direction="rtl" size="600px"
      :close-on-click-modal="false" :close-on-press-escape="false">
      <div class="drawer-content">
        <el-form :model="drawerForm" :rules="rules" ref="drawerFormRef" label-width="100px">
          <div v-for="(item, index) in drawerForm.items" :key="index" class="goods-item-wrapper">
            <el-form-item :label="`${index + 1}. 商品名称`" :prop="`items.${index}.productId`" :rules="itemRules">
              <div class="goods-item">
                <el-select v-model="item.productId" placeholder="请选择商品" style="flex: 1" clearable filterable>
                  <el-option v-for="product in productOptions" :key="product.id" :label="product.productName"
                    :value="product.id" />
                </el-select>
                <div class="batch-actions">
                  <el-button v-if="index === drawerForm.items.length - 1 && drawerForm.items.length < 50" type="text"
                    icon="el-icon-plus" class="batch-add" @click="addBatchItem" />
                  <el-button v-if="drawerForm.items.length > 1" type="text" icon="el-icon-minus" class="batch-remove"
                    @click="removeBatchItem(index)" />
                </div>
              </div>
            </el-form-item>
            <el-form-item label="排序值" :prop="`items.${index}.sort`" :rules="sortRules">
              <el-input-number v-model="item.sort" :min="0" :max="999" controls-position="right" style="width: 100%" />
            </el-form-item>
            <el-divider v-if="index !== drawerForm.items.length - 1" />
          </div>

          <el-form-item class="form-actions">
            <el-button type="primary" size="medium" @click="submitDrawer" :loading="submitLoading"
              style="background: #4d23d9; border-color: #4d23d9;">
              确定
            </el-button>
            <el-button type="default" size="medium" @click="drawerVisible = false">
              取消
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-drawer>

    <!-- 图片预览弹窗 -->
    <ImgZoom v-model="imagePreviewVisible" :img-list="[previewImageUrl]" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { productCategoryRefList, addProductCategoryRef, deleteProductCategoryRef } from "@/api/goodsCategory";
import { productList } from "@/api/goodsList";

export default {
  name: "ProductCategoryGoods",
  components: { SearchForm, PaginationSimple },
  inject: ["switchToList", "getSharedData"],
  data() {
    return {
      categoryId: null,
      categoryName: "",
      searchItems: [
        { type: "input", prop: "productName", label: "商品名称", placeholder: "请输入商品名称", clearable: true }
      ],
      filterForm: { productName: "" },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      productOptions: [],
      drawerVisible: false,
      drawerTitle: "新增商品",
      drawerForm: { items: [{ productId: null, sort: 0 }] },
      submitLoading: false,
      imagePreviewVisible: false,
      previewImageUrl: "",
      rules: {},
      itemRules: [{ required: true, message: "请选择商品", trigger: "change" }],
      sortRules: [{ required: true, message: "请输入排序值", trigger: "blur" }]
    };
  },
  created() {
    this.loadData();
  },

  activated() {
    // 每次激活时重新加载数据
    this.loadData();
  },
  methods: {
    // 统一的数据加载方法
    loadData() {
      const sharedData = this.getSharedData();
      if (sharedData && sharedData.categoryId) {
        const nextCategoryId = sharedData.categoryId;
        const categoryChanged = this.categoryId !== nextCategoryId;
        this.categoryId = nextCategoryId;
        this.categoryName = sharedData.categoryName || "";
        if (categoryChanged) {
          this.filterForm.productName = "";
          this.pagination.pageNum = 1;
        }
        this.fetchTableData();
        this.fetchProductOptions();
      }
    },
    async fetchTableData() {
      if (!this.categoryId) return;
      this.loading = true;
      try {
        const params = {
          categoryId: this.categoryId,
          productName: this.filterForm.productName || undefined,
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize
        };
        const res = await productCategoryRefList(params);
        if (res.code === 200 && res.data) {
          this.tableData = res.data.rows || [];
          this.pagination.total = res.data.total || 0;
        }
      } catch (error) {
        console.error("获取商品列表失败:", error);
        this.$message.error("获取商品列表失败");
      } finally {
        this.loading = false;
      }
    },
    async fetchProductOptions() {
      try {
        const res = await productList({ pageNum: 1, pageSize: 999 });
        if (res.success && res.data && res.data.rows) {
          this.productOptions = res.data.rows;
        }
      } catch (error) {
        console.error("获取商品列表失败:", error);
      }
    },
    handleSearch(e) {
      this.filterForm.productName = e?.productName || "";
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm.productName = "";
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },
    handleBack() {
      this.switchToList(true);
    },
    handleAdd() {
      this.drawerForm = { items: [{ productId: null, sort: 0 }] };
      this.drawerVisible = true;
    },
    addBatchItem() {
      if (this.drawerForm.items.length >= 50) {
        this.$message.warning("最多支持50个商品");
        return;
      }
      this.drawerForm.items.push({ productId: null, sort: 0 });
    },
    removeBatchItem(index) {
      if (this.drawerForm.items.length === 1) {
        this.$message.warning("至少保留一个商品");
        return;
      }
      this.drawerForm.items.splice(index, 1);
    },
    async submitDrawer() {
      const hasEmpty = this.drawerForm.items.some(item => !item.productId);
      if (hasEmpty) {
        this.$message.error("请完整填写所有商品");
        return;
      }
      this.submitLoading = true;
      try {
        const submitData = this.drawerForm.items.map(item => ({
          categoryId: this.categoryId,
          productId: item.productId,
          sort: item.sort
        }));
        await addProductCategoryRef(submitData);
        this.$message.success("新增成功");
        this.drawerVisible = false;
        this.fetchTableData();
      } catch (error) {
        console.error("新增失败:", error);
      } finally {
        this.submitLoading = false;
      }
    },
    async handleDeleteGoods(row) {
      this.$confirm("确定要移除此商品吗？", "提示", { type: "warning" })
        .then(async () => {
          await deleteProductCategoryRef(row.id);
          this.$message.success("移除成功");
          this.fetchTableData();
        })
        .catch(() => { });
    },
    previewImage(url) {
      this.previewImageUrl = url;
      const img = new Image();
      img.src = url;
      img.onload = () => { this.imagePreviewVisible = true; };
      img.onerror = () => { this.$message.warning("图片加载失败"); };
    }
  }
};
</script>

<style scoped lang="scss">
.container-body {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
  transition: color 0.3s;
}

.page-header:hover {
  color: #9047f8;
}

.info-card {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.info-content {
  display: flex;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: 0;
}

::v-deep .el-card {
  border-radius: 24px;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px 24px;
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

.product-thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  cursor: pointer;
}

/* 抽屉样式 */
.drawer-content {
  padding: 20px;
}

.goods-item-wrapper {
  margin-bottom: 20px;
  text-align: left;
}

.goods-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.batch-actions {
  display: flex;
  gap: 5px;
}

.batch-add,
.batch-remove {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.batch-add {
  color: #fff;
  background-color: #6A35FF;
}

.batch-add:hover {
  background-color: #5a2ad9;
}

.batch-remove {
  color: #fff;
  background-color: #ff4d4f;
}

.batch-remove:hover {
  background-color: #e04345;
}

.form-actions {
  padding-left: 80px;
  margin-top: 30px;
}

.form-actions button {
  padding: 8px 24px;
  margin-right: 15px;
}
</style>
