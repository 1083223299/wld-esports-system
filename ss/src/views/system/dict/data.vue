<template>
  <div class="container">
    <!-- 头部返回 -->
    <div class="page-header" @click="handleBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">返回</div>
    </div>

    <!-- 筛选查询区 -->
    <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20" @search="handleSearch"
      @reset="handleReset" />

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 操作按钮栏 -->
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
          v-permission="'system:dict:add'">
          新增
        </el-button>
        <el-button type="success" icon="el-icon-edit" class="add-btn" :disabled="single" @click="handleEdit"
          v-permission="'system:dict:edit'">
          修改
        </el-button>
        <el-button type="danger" icon="el-icon-delete" class="add-btn" :disabled="multiple" @click="handleDelete"
          v-permission="'system:dict:remove'">
          删除
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="dictCode" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" :height="tableHeight" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="dictLabel" label="字典标签" width="180">
            <template slot-scope="scope">
              <el-tag v-if="scope.row.listClass && scope.row.listClass !== 'default'" :type="scope.row.listClass"
                size="small">
                {{ scope.row.dictLabel }}
              </el-tag>
              <span v-else>{{ scope.row.dictLabel }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="dictValue" label="字典键值" width="180"></el-table-column>
          <el-table-column prop="dictSort" label="排序" width="80"></el-table-column>
          <el-table-column prop="status" label="状态" width="80">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === '0' ? 'success' : 'warning'" size="small">
                {{ scope.row.status === '0' ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="cssClass" label="样式属性" width="120" show-overflow-tooltip></el-table-column>
          <el-table-column prop="remark" label="备注" show-overflow-tooltip></el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180"></el-table-column>
          <el-table-column label="操作" fixed="right" width="150">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8"
                  v-permission="'system:dict:edit'">
                  编辑
                </el-button>
                <el-button type="text" @click="handleDelete(scope.row)" style="color: #f56c6c"
                  v-permission="'system:dict:remove'">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="drawerTitle" :visible.sync="drawerVisible" width="600px" :close-on-click-modal="false"
      :close-on-press-escape="false" class="dict-data-dialog" @close="closeDrawer">
      <el-form ref="dataFormRef" :model="editFormData" :rules="rules" label-width="100px" label-position="right"
        class="data-form">
        <el-form-item label="字典类型">
          <el-input v-model="editFormData.dictType" disabled />
        </el-form-item>
        <el-form-item label="字典标签" prop="dictLabel">
          <el-input v-model="editFormData.dictLabel" placeholder="请输入字典标签" maxlength="100" />
        </el-form-item>
        <el-form-item label="字典键值" prop="dictValue">
          <el-input v-model="editFormData.dictValue" placeholder="请输入字典键值" maxlength="100" />
        </el-form-item>
        <el-form-item label="显示排序" prop="dictSort">
          <el-input-number v-model="editFormData.dictSort" :min="0" :max="999" controls-position="right"
            style="width: 100%" />
        </el-form-item>
        <el-form-item label="样式属性" prop="cssClass">
          <el-input v-model="editFormData.cssClass" placeholder="请输入样式属性（如：btn-success）" />
        </el-form-item>
        <el-form-item label="回显样式" prop="listClass">
          <el-select v-model="editFormData.listClass" placeholder="请选择回显样式" style="width: 100%">
            <el-option v-for="item in listClassOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="editFormData.status">
            <el-radio :label="'0'">启用</el-radio>
            <el-radio :label="'1'">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="editFormData.remark" type="textarea" :rows="3" placeholder="请输入备注" maxlength="500"
            show-word-limit />
        </el-form-item>
        <div class="form-footer">
          <el-button @click="closeDrawer">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleFormSubmit">确定</el-button>
        </div>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { listData, getData, addData, updateData, delData } from "@/api/dictData";
import { listDict } from "@/api/dict";

export default {
  name: "DictData",
  components: {
    SearchForm,
    PaginationSimple,
  },
  inject: ['switchToList', 'getSharedData'],
  data() {
    return {
      // 字典类型和名称
      dictType: '',
      dictName: '',

      // 字典类型选项列表
      dictTypeOptions: [],

      // 搜索表单配置
      searchItems: [
        {
          type: "select",
          prop: "dictType",
          label: "字典名称",
          placeholder: "请选择字典名称",
          options: [],
          clearable: true,
        },
        {
          type: "input",
          prop: "dictLabel",
          label: "字典标签",
          placeholder: "请输入字典标签",
          clearable: true,
        },
      ],

      // 筛选表单数据
      filterForm: {
        dictType: "",
        dictLabel: "",
      },

      // 分页参数
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      // 表格数据
      tableData: [],
      loading: false,
      tableHeight: 0,

      // 弹窗控制
      drawerVisible: false,
      drawerTitle: "新增字典数据",
      editFormData: {
        dictCode: null,
        dictType: '',
        dictLabel: '',
        dictValue: '',
        dictSort: 0,
        cssClass: '',
        listClass: 'default',
        status: '0',
        remark: ''
      },
      submitting: false,
      currentRowId: null,

      // 选中行
      selectedRows: [],
      single: true,
      multiple: true,

      // 回显样式选项
      listClassOptions: [
        { value: 'default', label: '默认' },
        { value: 'primary', label: '主要' },
        { value: 'success', label: '成功' },
        { value: 'info', label: '信息' },
        { value: 'warning', label: '警告' },
        { value: 'danger', label: '危险' }
      ],

      // 表单验证规则
      rules: {
        dictLabel: [
          { required: true, message: '请输入字典标签', trigger: 'blur' },
          { max: 100, message: '长度不能超过100个字符', trigger: 'blur' }
        ],
        dictValue: [
          { required: true, message: '请输入字典键值', trigger: 'blur' },
          { max: 100, message: '长度不能超过100个字符', trigger: 'blur' }
        ],
        dictSort: [
          { required: true, message: '请输入显示排序', trigger: 'blur' },
          { type: 'number', message: '排序必须为数字', trigger: 'blur' }
        ]
      }
    };
  },
  created() {
    // 初始化时获取数据
    this.initData();
    // 获取字典类型列表用于下拉选择
    this.fetchDictTypeList();
  },
  // 使用 activated 生命周期（keep-alive 组件激活时调用）
  activated() {
    // 每次激活时重新获取数据
    this.initData();
    // 刷新字典类型列表
    this.fetchDictTypeList();
  },
  mounted() {
    this.calcTableHeight();
  },
  methods: {
    // 获取字典类型列表
    async fetchDictTypeList() {
      try {
        const resData = await listDict({ pageNum: 1, pageSize: 100 });
        const res = resData.data
        if (res.code === 200) {
          const dictList = res.rows || [];
          // 转换为下拉选项格式
          this.dictTypeOptions = dictList.map(item => ({
            label: item.dictName,
            value: item.dictType
          }));
          // 更新搜索表单的选项
          const searchItem = this.searchItems.find(item => item.prop === 'dictType');
          if (searchItem) {
            searchItem.options = this.dictTypeOptions;
          }
        }
      } catch (error) {
        console.error("获取字典类型列表失败:", error);
      }
    },

    // 初始化数据
    initData() {
      // 从父组件获取传递的数据
      const sharedData = this.getSharedData();
      console.log('DictData 获取到的 sharedData:', sharedData);

      if (sharedData && sharedData.dictType) {
        // 如果 dictType 发生变化，重新加载数据
        if (this.dictType !== sharedData.dictType) {
          this.dictType = sharedData.dictType;
          this.dictName = sharedData.dictName || '';
          this.editFormData.dictType = this.dictType;
          // 设置筛选条件的默认值为当前字典类型
          this.filterForm.dictType = this.dictType;
          // 重置分页
          this.pagination.pageNum = 1;
          // 重置搜索条件中的字典标签
          this.filterForm.dictLabel = "";
          // 重新获取数据
          this.fetchTableData();
        }
      } else {
        console.warn('未获取到 dictType，请检查传值');
      }
    },

    // 计算表格高度
    calcTableHeight() {
      this.$nextTick(() => {
        const listCard = this.$el.querySelector('.list-card');
        if (!listCard) return;

        const cardRect = listCard.getBoundingClientRect();
        const actionBar = listCard.querySelector('.action-bar-fixed');
        const pagination = listCard.querySelector('.pagination-fixed');

        const actionBarHeight = actionBar ? actionBar.offsetHeight : 56;
        const paginationHeight = pagination ? pagination.offsetHeight : 72;

        this.tableHeight = cardRect.height - actionBarHeight - paginationHeight - 40;
      });
    },

    // 返回列表页
    handleBack() {
      this.switchToList(true);
    },

    // 搜索
    handleSearch(e) {
      if (e) {
        // 如果选择了字典类型，使用选中的值，否则使用当前字典类型
        this.filterForm.dictType = e.dictType || this.dictType;
        this.filterForm.dictLabel = e.dictLabel || "";
        this.pagination.pageNum = 1;
        this.fetchTableData();
      }
    },

    // 重置
    handleReset() {
      this.filterForm = {
        dictType: this.dictType,
        dictLabel: "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    // 获取数据列表
    async fetchTableData() {
      const searchDictType = this.filterForm.dictType || this.dictType;

      if (!searchDictType) {
        console.warn('dictType 为空，无法获取字典数据');
        return;
      }

      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          dictType: searchDictType,
          dictLabel: this.filterForm.dictLabel,
        };

        const resData = await listData(params);
        const res = resData.data

        if (res.code === 200) {
          this.tableData = res.rows || [];
          this.pagination.total = res.total || 0;
          this.calcTableHeight();
        } else {
          this.$message.error(res.msg || "获取字典数据失败");
        }
      } catch (error) {
        console.error("获取字典数据失败:", error);
        this.$message.error("获取字典数据失败");
      } finally {
        this.loading = false;
      }
    },

    // 分页切换
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },

    // 选中行变化
    handleSelectionChange(selection) {
      this.selectedRows = selection;
      this.single = selection.length !== 1;
      this.multiple = !selection.length;
    },

    // 新增
    handleAdd() {
      this.drawerTitle = "新增字典数据";
      this.currentRowId = null;
      this.editFormData = {
        dictCode: null,
        dictType: this.dictType,
        dictLabel: '',
        dictValue: '',
        dictSort: 0,
        cssClass: '',
        listClass: 'default',
        status: '0',
        remark: ''
      };
      this.drawerVisible = true;
      this.$nextTick(() => {
        if (this.$refs.dataFormRef) {
          this.$refs.dataFormRef.clearValidate();
        }
      });
    },

    // 编辑
    async handleEdit(row) {
      if (!row.dictCode && this.selectedRows.length === 1) {
        row = this.selectedRows[0];
      }
      if (!row || !row.dictCode) {
        this.$message.warning("请选择要修改的数据");
        return;
      }

      this.loading = true;
      try {
        const res = await getData(row.dictCode);
        if (res.code === 200) {
          this.drawerTitle = "编辑字典数据";
          this.currentRowId = row.dictCode;
          this.editFormData = {
            dictCode: res.data.dictCode,
            dictType: res.data.dictType,
            dictLabel: res.data.dictLabel || '',
            dictValue: res.data.dictValue || '',
            dictSort: res.data.dictSort !== undefined ? res.data.dictSort : 0,
            cssClass: res.data.cssClass || '',
            listClass: res.data.listClass || 'default',
            status: res.data.status !== undefined ? String(res.data.status) : '0',
            remark: res.data.remark || ''
          };
          this.drawerVisible = true;
          this.$nextTick(() => {
            if (this.$refs.dataFormRef) {
              this.$refs.dataFormRef.clearValidate();
            }
          });
        } else {
          this.$message.error(res.msg || "获取字典数据详情失败");
        }
      } catch (error) {
        console.error("获取字典数据详情失败:", error);
        this.$message.error("获取字典数据详情失败");
      } finally {
        this.loading = false;
      }
    },

    // 删除
    async handleDelete(row) {
      let ids = [];
      if (row && row.dictCode) {
        ids = [row.dictCode];
      } else if (this.selectedRows.length > 0) {
        ids = this.selectedRows.map((item) => item.dictCode);
      }

      if (ids.length === 0) {
        this.$message.warning("请选择要删除的数据");
        return;
      }

      this.$confirm(`确定要删除选中的${ids.length}条字典数据吗？`, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        try {
          const idStr = ids.join(',');
          const res = await delData(idStr);
          if (res.code === 200) {
            this.$message.success("删除成功");
            this.fetchTableData();
          } else {
            this.$message.error(res.msg || "删除失败");
          }
        } catch (error) {
          console.error("删除失败:", error);
          this.$message.error("删除失败");
        }
      }).catch(() => { });
    },

    // 关闭弹窗
    closeDrawer() {
      this.drawerVisible = false;
      this.editFormData = {
        dictCode: null,
        dictType: this.dictType,
        dictLabel: '',
        dictValue: '',
        dictSort: 0,
        cssClass: '',
        listClass: 'default',
        status: '0',
        remark: ''
      };
      this.currentRowId = null;
      this.submitting = false;
    },

    // 提交表单
    async handleFormSubmit() {
      this.$refs.dataFormRef.validate(async (valid) => {
        if (!valid) return;

        this.submitting = true;
        try {
          let res;
          if (this.currentRowId !== null) {
            // 修改
            res = await updateData(this.editFormData);
            if (res.code === 200) {
              this.$message.success("修改成功");
            } else {
              this.$message.error(res.msg || "修改失败");
              return;
            }
          } else {
            // 新增
            res = await addData(this.editFormData);
            if (res.code === 200) {
              this.$message.success("新增成功");
            } else {
              this.$message.error(res.msg || "新增失败");
              return;
            }
          }
          this.closeDrawer();
          this.fetchTableData();
        } catch (error) {
          console.error("提交失败:", error);
          this.$message.error("提交失败");
        } finally {
          this.submitting = false;
        }
      });
    },
  },
};
</script>

<style scoped>
/* 页面容器 */
.container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部返回 */
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

.page-header i {
  font-size: 16px;
}

.page-title {
  font-size: 14px;
}

/* 字典信息卡片 */
.dict-info {
  margin-bottom: 16px;
}

.info-card {
  background-color: #f8f9fa;
  border-radius: 8px;
}

.info-card :deep(.el-card__body) {
  padding: 12px 20px;
}

.info-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
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

/* 列表卡片 */
.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: 0;
}

.list-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

/* 操作栏 */
.action-bar-fixed {
  padding: 0 0 20px 0;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* 表格包裹层 */
.table-wrapper {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

.table-wrapper :deep(.el-table) {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.table-wrapper :deep(.el-table__header-wrapper) {
  flex-shrink: 0;
}

.table-wrapper :deep(.el-table__body-wrapper) {
  flex: 1;
  overflow-y: auto !important;
}

/* 分页区域 */
.pagination-fixed {
  padding: 0 20px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* 新增按钮样式 */
.add-btn {
  padding-left: 55px;
  padding-right: 57px;
  border-radius: 8px;
}

/* 表单样式 */
.data-form {
  padding: 20px;
}

.form-footer {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

/* 弹窗样式 */
.dict-data-dialog :deep(.el-dialog__body) {
  padding: 0;
}
</style>