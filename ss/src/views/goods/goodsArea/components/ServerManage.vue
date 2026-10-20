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
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd" v-permission="'goodsArea:server:add'">
          新增区服
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="filteredData" stripe row-key="id" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :tree-props="{ children: 'children' }" ref="table">
          <!-- 区服名称 -->
          <el-table-column prop="serverName" label="区服名称" show-overflow-tooltip></el-table-column>
          <!-- 操作按钮 -->
          <el-table-column label="操作" fixed="right" width="250">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleAddChild(scope.row)" style="color: #9047f8" v-permission="'goodsArea:server:addChild'">
                  新增子级
                </el-button>
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8" v-permission="'goodsArea:server:edit'">
                  编辑
                </el-button>
                <el-button type="text" style="color: #f56c6c" @click="handleDelete(scope.row)" v-permission="'goodsArea:server:remove'">
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

    <!-- 新增/编辑区服抽屉 -->
    <el-drawer :title="drawerTitle" :visible.sync="drawerVisible" direction="rtl" size="500px"
      :close-on-click-modal="false" :close-on-press-escape="false">
      <div class="drawer-content">
        <el-form :model="drawerForm" :rules="rules" ref="drawerFormRef" label-width="100px">
          <!-- 批量添加区服 -->
          <div v-for="(item, index) in drawerForm.servers" :key="index" class="server-item-wrapper">
            <el-form-item :label="`${index + 1}. 区服名称`" :prop="`servers.${index}.serverName`">
              <el-input v-model="item.serverName" placeholder="请输入区服名称" maxlength="50" clearable style="width: 260px" />
              <!-- 操作按钮 -->
              <div class="btn-group" v-if="index === drawerForm.servers.length - 1 && drawerForm.servers.length < 50">
                <el-button class="add-plus" type="text" icon="el-icon-plus" @click="addServer" title="添加区服" />
              </div>
              <div class="btn-group2" v-if="drawerForm.servers.length > 1">
                <el-button class="add-minus" type="text" icon="el-icon-minus" @click="removeServer(index)"
                  title="删除区服" />
              </div>
            </el-form-item>
          </div>

          <!-- 提交按钮 -->
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
  </div>
</template>

<script>
import SearchForm from '@/components/SearchComponent/index.vue';
import PaginationSimple from '@/components/PaginationSimple/index.vue';
import { productServerList, addProductServer, editProductServer, removeProductServer } from '@/api/goodsArea';

export default {
  name: 'ServerManage',
  components: { SearchForm, PaginationSimple },
  props: {
    gameName: { type: String, default: '' },
    productId: { type: [String, Number], default: '' }
  },
  data() {
    return {
      searchItems: [
        {
          type: 'input',
          prop: 'serverName',
          label: '区服名称',
          placeholder: '请输入区服名称',
          clearable: true
        }
      ],
      filterForm: {
        serverName: ''
      },
      loading: false,
      drawerVisible: false,
      drawerTitle: '',
      currentRow: null,
      currentParentId: null,
      originalData: [],
      drawerForm: {
        servers: [{ serverName: '' }]
      },
      rules: {
        'servers.0.serverName': [{ required: true, message: '请输入区服名称', trigger: 'blur' }]
      },
      submitLoading: false,
      requestSerial: 0,
      pagination: {
        current: 1,
        size: 10,
        total: 0
      }
    };
  },
  computed: {
    filteredData() {
      if (!this.filterForm.serverName) return this.originalData;
      return this.filterTree(this.originalData, this.filterForm.serverName);
    }
  },
  watch: {
    productId: {
      handler() {
        this.fetchServerList();
      },
      immediate: true
    }
  },
  methods: {
    getResponseRows(data) {
      if (Array.isArray(data)) {
        return data;
      }
      if (Array.isArray(data?.rows)) {
        return data.rows;
      }
      return [];
    },
    getResponseTotal(data, rows) {
      if (typeof data?.total === 'number') {
        return data.total;
      }
      return this.countTreeNodes(rows);
    },
    countTreeNodes(list) {
      if (!Array.isArray(list)) return 0;
      return list.reduce((total, item) => total + 1 + this.countTreeNodes(item.children), 0);
    },
    // 获取区服列表
    async fetchServerList() {
      if (!this.productId) {
        this.originalData = [];
        this.pagination.total = 0;
        return;
      }
      const requestId = ++this.requestSerial;
      this.loading = true;
      try {
        const params = {
          productId: this.productId,
          serverName: this.filterForm.serverName,
          pageNum: this.pagination.current,
          pageSize: this.pagination.size
        };
        const res = await productServerList(params);
        if (requestId !== this.requestSerial) {
          return;
        }
        if (res.success && res.data) {
          const rows = this.getResponseRows(res.data);
          this.originalData = rows;
          this.pagination.total = this.getResponseTotal(res.data, rows);
        }
      } catch (error) {
        if (requestId !== this.requestSerial) {
          return;
        }
        console.error('获取区服列表失败:', error);
        this.$message.error('获取区服列表失败');
      } finally {
        if (requestId === this.requestSerial) {
          this.loading = false;
        }
      }
    },
    // 筛选树状数据
    filterTree(data, keyword) {
      return data.filter(item => {
        const match = item.serverName?.includes(keyword);
        if (item.children?.length) {
          const filtered = this.filterTree(item.children, keyword);
          if (filtered.length) return true;
        }
        return match;
      }).map(item => ({ ...item, children: item.children ? this.filterTree(item.children, keyword) : [] }));
    },
    // 搜索
    handleSearch(e) {
      this.filterForm.serverName = e?.serverName || '';
      this.pagination.current = 1;
      this.fetchServerList();
    },
    // 重置
    handleReset() {
      this.filterForm.serverName = '';
      this.pagination.current = 1;
      this.fetchServerList();
    },
    // 分页当前页变化
    handleCurrentChange(current) {
      this.pagination.current = current;
      this.fetchServerList();
    },
    // 新增区服
    handleAdd() {
      this.drawerTitle = '新增区服';
      this.currentRow = null;
      this.currentParentId = 0;
      this.drawerForm = {
        servers: [{ serverName: '' }]
      };
      this.drawerVisible = true;
      this.$nextTick(() => {
        if (this.$refs.drawerFormRef) {
          this.$refs.drawerFormRef.clearValidate();
        }
      });
    },
    // 新增子区服
    handleAddChild(row) {
      this.drawerTitle = '新增子区服';
      this.currentRow = null;
      this.currentParentId = row.id;
      this.drawerForm = {
        servers: [{ serverName: '' }]
      };
      this.drawerVisible = true;
      this.$nextTick(() => {
        if (this.$refs.drawerFormRef) {
          this.$refs.drawerFormRef.clearValidate();
        }
      });
    },
    // 编辑区服
    handleEdit(row) {
      this.$prompt('请输入新的区服名称', '编辑区服', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: row.serverName,
        inputPlaceholder: '请输入区服名称',
        inputAttributes: {
          maxlength: 50
        }
      }).then(async ({ value }) => {
        // 非空判断
        if (!value || value.trim() === '') {
          this.$message.error('区服名称不能为空');
          return;
        }
        if (value.trim().length > 50) {
          this.$message.error('区服名称最多50个字符');
          return;
        }
        try {
          await editProductServer({
            id: row.id,
            productId: this.productId,
            serverName: value.trim()
          });
          this.$message.success('编辑成功');
          this.fetchServerList();
        } catch (error) {
          console.error('编辑区服失败:', error);
          this.$message.error('编辑区服失败');
        }
      }).catch(() => { });
    },
    // 删除区服
    handleDelete(row) {
      this.$confirm('确定删除吗？', '提示', { type: 'warning' }).then(async () => {
        try {
          await removeProductServer(row.id);
          this.$message.success('删除成功');
          this.fetchServerList();
        } catch (error) {
          console.error('删除区服失败:', error);
          this.$message.error('删除区服失败');
        }
      }).catch(() => { });
    },
    // 添加区服记录
    addServer() {
      this.drawerForm.servers.push({ serverName: '' });
    },
    // 移除区服记录
    removeServer(index) {
      this.drawerForm.servers.splice(index, 1);
    },
    // 提交抽屉表单
    async submitDrawer() {
      this.$refs.drawerFormRef.validate(async (valid) => {
        if (valid) {
          try {
            this.submitLoading = true;
            const servers = this.drawerForm.servers.map(server => ({
              productId: this.productId,
              serverName: server.serverName,
              parentId: this.currentParentId
            }));
            await addProductServer(servers);
            this.$message.success('新增成功');
            this.drawerVisible = false;
            this.fetchServerList();
          } catch (error) {
            console.error('新增区服失败:', error);
            this.$message.error('新增区服失败');
          } finally {
            this.submitLoading = false;
          }
        }
      });
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

/* 抽屉样式 */
.drawer-content {
  padding: 20px;
}

/* 区服项包装器 */
.server-item-wrapper {
  margin-bottom: 20px;
  text-align: left;
}

/* 按钮组样式 */
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
  background: #FF4D4F;
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

/* 按钮区域 */
.form-actions {
  padding-left: 80px;
  margin-top: 30px;

  button {
    padding: 8px 24px;
    margin-right: 15px;
  }
}

/* 分页区域 */
.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}
</style>
