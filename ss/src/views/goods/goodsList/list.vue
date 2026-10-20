<template>
  <div class="container-body">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20" :confirm-reset="true"
        confirm-reset-message="确定要重置所有筛选条件吗？" @search="handleSearch" @reset="handleReset"></SearchForm>
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 操作按钮栏 -->
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
          v-permission="'system:goodsList:add'">
          新增商品
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false" height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" ref="table">
          <!-- 商品Id -->
          <el-table-column prop="id" label="商品Id"></el-table-column>
          <!-- 商品名称 -->
          <el-table-column prop="productName" label="商品名称" show-overflow-tooltip></el-table-column>
          <!-- 业务类型 -->
          <el-table-column prop="businessType" label="业务类型">
            <template slot-scope="scope">
              <span v-if="Array.isArray(scope.row.businessType)">
                {{scope.row.businessType.map(item => item === '1' ? '搭档' : item === '2' ? '代练' : '').join(', ')}}
              </span>
              <span v-else>
                {{ scope.row.businessType === '1' ? '搭档' : scope.row.businessType === '2' ? '代练' : '' }}
              </span>
            </template>
          </el-table-column>
          <!-- 分润属性 -->
          <el-table-column prop="profitType" label="分润属性">
            <template slot-scope="scope">
              {{ scope.row.profitType === '0' ? '特殊' : '通用' }}
            </template>
          </el-table-column>
          <!-- 商品图片 -->
          <el-table-column label="商品图片" width="100">
            <template slot-scope="scope">
              <div class="avatar-cell">
                <!-- 有链接时加载目标图片，加载失败触发error事件替换为默认图 -->
                <img v-if="scope.row.productImgUrl" :src="scope.row.productImgUrl" class="avatar-thumb"
                  @click="previewAvatar(scope.row)" @error="(e) => handleImgError(e)" />
                <!-- 无链接直接显示默认图 -->
                <img v-else src="@/assets/defaulIcon.png" class="avatar-thumb" @click="defaulImg" />
              </div>
            </template>
          </el-table-column>
          <!-- 火热标签 -->
          <el-table-column prop="isHot" label="火热标签" v-if="checkPermission('system:goodsList:hot')">
            <template slot-scope="scope">
              <el-switch v-model="scope.row.isHot" active-color="#8F03FF" active-value="1" inactive-value="0"
                @change="toggleHot(scope.row)" validate-event>
              </el-switch>
            </template>
          </el-table-column>
             <!-- 是否支持申请技术陪 -->
          <el-table-column prop="supportTechApply" label="是否支持申请技术陪" >
            <template slot-scope="scope">
              <el-switch v-model="scope.row.supportTechApply" active-color="#8F03FF" active-value="1" inactive-value="0"
                @change="toggleSupportApplyWay(scope.row)" validate-event>
              </el-switch>
            </template>
          </el-table-column>
          <!-- 状态 -->
          <el-table-column prop="status" label="状态">
            <template slot-scope="scope">
              <div class="status-badge" :class="scope.row.status === '0' ? 'status-offline' : 'status-online'">
                <span class="status-dot"></span>
                <span class="status-text">{{ scope.row.status === '0' ? '下架' : '上架' }}</span>
              </div>
            </template>
          </el-table-column>
          <!-- 操作按钮 -->
          <el-table-column label="操作" fixed="right" width="160">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047f8"
                  v-permission="'system:goodsList:edit'">
                  编辑
                </el-button>
                <el-button type="text" :style="scope.row.status === '0' ? 'color: #1BC286' : 'color: #f56c6c'"
                  @click="toggleStatus(scope.row)" v-permission="'system:goodsList:status'">
                  {{ scope.row.status === '0' ? '上架' : '下架' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          :selected-rows="selectedRows" @current-change="handleCurrentChange"></PaginationSimple>
      </div>
    </el-card>

    <!-- 图片放大组件：v-model控制显示，单图传[url] -->
    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />

  </div>
</template>

<script>
// 导入组件

import SearchForm from "@/components/SearchComponent/index.vue"; // 搜索表单组件
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
import checkPermission from "@/utils/checkPermission";

// 导入API接口
import {
  productList,    // 获取商品列表
  changeProductStatus,  // 修改商品状态
  toggleProductHot, // 切换商品热门状态
  toggleSupportApply // 切换商品是否支持申请技术陪状态
} from "@/api/goodsList";

export default {
  name: "GoodsCompanionList", // 组件名称
  // 注册组件
  components: {
    SearchForm,
    PaginationSimple,

  },
  inject: ["switchToAdd", "getSharedRefresh"], // 注入新增页面跳转方法
  // 数据定义
  data() {
    return {
      // 搜索表单配置项
      searchItems: [
        {
          type: "input",
          prop: "productName",
          label: "商品名称",
          placeholder: "请输入商品名称",
          clearable: true,
        },
        {
          type: "select",
          prop: "businessType",
          label: "业务类型",
          placeholder: "请选择业务类型",
          options: [
            { label: "全部", value: null },
            { label: "搭档", value: '1' },
            { label: "代练", value: '2' },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "profitType",
          label: "分润属性",
          placeholder: "请选择分润属性",
          options: [
            { label: "全部", value: null },
            { label: "特殊", value: '0' },
            { label: "通用", value: '1' },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "全部状态",
          options: [
            { label: "全部", value: null },
            { label: "上架", value: '1' },
            { label: "下架", value: '0' },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "isHot",
          label: "火热标签",
          placeholder: "请选择火热标签",
          options: [
            { label: "全部", value: null },
            { label: "非热门", value: '0' },
            { label: "热门", value: '1' },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "supportTechApply",
          label: "是否申请技术陪",
          placeholder: "请选择是否支持申请技术陪",
          options: [
            { label: "全部", value: null },
            { label: "否", value: '0' },
            { label: "是", value: '1' },
          ],
          clearable: true,
        },
      ],
      // 筛选表单数据
      filterForm: {
        productName: "",
        businessType: '',
        profitType: '',
        status: '',
        isHot: ''
      },
      tableData: [],              // 表格数据源
      selectedRows: [],           // 选中的行数据
      loading: false,             // 加载状态
      pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
      sortParams: { prop: "", order: "" }, // 排序参数
      avatarDialogVisible: false, // 头像预览弹窗显示状态
      previewAvatarUrl: "",       // 预览头像URL
      moduleHeight: 0, // 搜索模块高度
    };
  },
  // 创建生命周期：初始化配置和数据
  created() {
    this.initTableData();     // 初始化表格数据
  },
  // 挂载生命周期：添加事件监听
  mounted() {
    /**获取搜索框高度 ***/
    this.updateModuleHeight();
    // 监听窗口大小变化
    window.addEventListener('resize', this.updateModuleHeight);

  },
  // 销毁前生命周期：清理资源
  beforeDestroy() {
    window.removeEventListener('resize', this.updateModuleHeight);
  },

  activated() {
    if (this.getSharedRefresh()) {
      this.fetchTableData()
    }
  },
  // 方法定义
  methods: {
    // 切换商品是否支持申请技术陪状态
    toggleSupportApplyWay(row){
    
      const isCancelSupportApply = row.supportTechApply === '0';
      const confirmMessage = isCancelSupportApply ? "确定要取消该商品的是否支持申请技术陪吗？" : "确定要为该商品开启是否支持申请技术陪吗？";
      const successMessage = isCancelSupportApply ? "已取消该商品的是否支持申请技术陪" : "已为该商品开启是否支持申请技术陪";
      this.$confirm(confirmMessage, "是否支持申请技术陪状态", {
        type: "warning",
      })
        .then(() => {
          const params = {
            id: row.id,
            supportTechApply: row.supportTechApply,
          };
          // 调用状态修改接口
          toggleSupportApply(params).then(() => {
            this.$message.success(successMessage);
            this.fetchTableData(); // 刷新数据
          }).catch(() => {
            row.supportTechApply = row.supportTechApply === '1' ? '0' : '1';
          });
        }).catch(() => {
          row.supportTechApply = row.supportTechApply === '1' ? '0' : '1';
        });
    },

    checkPermission,
    // 切换商品火热标签状态
    toggleHot(row) {
      const isCancelHot = row.isHot === '0';
      const confirmMessage = isCancelHot ? "确定要取消该商品的火热标签吗？" : "确定要为该商品开启火热标签吗？";
      const successMessage = isCancelHot ? "已取消该商品的火热标签" : "已为该商品开启火热标签";
      this.$confirm(confirmMessage, "热门状态", {
        type: "warning",
      })
        .then(() => {
          const params = {
            id: row.id,
            isHot: row.isHot,
          };
          // 调用状态修改接口
          toggleProductHot(params).then(() => {
            this.$message.success(successMessage);
            this.fetchTableData(); // 刷新数据
          }).catch(() => {
            row.isHot = row.isHot === '1' ? '0' : '1';
          });
        }).catch(() => {
          row.isHot = row.isHot === '1' ? '0' : '1';
        });
    },
    // 处理图片加载失败（损坏/404/跨域等）
    handleImgError(e) {
      // 替换为默认头像的绝对/相对路径，和你v-else里的路径保持一致
      e.target.src = require('@/assets/defaulIcon.png')
      // 【可选】防止个别情况图片死循环加载（比如默认图也丢了）
      e.target.onerror = null
    },
    defaulImg() {
      this.$message.warning('头像文件不存在！')
    },
    /**获取搜索框高度计算 ***/
    updateModuleHeight() {
      this.$nextTick(() => {
        if (this.$refs.responsiveModule) {
          this.moduleHeight = this.$refs.responsiveModule.offsetHeight;
          console.log('当前高度:', this.moduleHeight);
        }
      });
    },


    /**
     * 初始化表格数据
     */
    initTableData() {
      this.loading = true;
      this.fetchTableData();
    },
    // ===================== 业务逻辑方法 =====================
    /**
     * 处理搜索事件
     * @param {Object} e 搜索表单数据
     */
    handleSearch(e) {
      if (e) {
        this.filterForm = { ...this.filterForm, ...e };
      }
      this.pagination.pageNum = 1; // 重置页码
      this.fetchTableData();       // 重新获取数据
    },

    /**
     * 处理重置事件
     */
    handleReset() {
      this.filterForm = {
        productName: "",
        businessType: '',
        profitType: '',
        status: '',
        isHot: ''
      };
      this.pagination.pageNum = 1; // 重置页码
      this.sortParams = { prop: "", order: "" }; // 重置排序
      this.fetchTableData(); // 重新获取数据
    },
    /**
     * 处理新增按钮点击
     */
    handleAdd() {
      this.switchToAdd();
    },
    /**
     * 处理编辑按钮点击
     * @param {Object} row 行数据
     */
    handleEdit(row) {
      this.switchToAdd(row);
    },
    /**
     * 切换商品状态（上架/下架）
     * @param {Object} row 行数据
     */
    toggleStatus(row) {
      const action = row.status === '0' ? "上架" : "下架";
      this.$confirm(`确定要${action}该商品吗？`, "商品状态", {
        type: "warning",
      })
        .then(() => {
          const params = {
            id: row.id,
            status: row.status === '0' ? '1' : '0',
          };
          // 调用状态修改接口
          changeProductStatus(params).then(() => {
            row.status = row.status === '0' ? '1' : '0';
            this.$message.success(`已${action}该商品`);
            this.fetchTableData(); // 刷新数据
          });
        })
        .catch(() => {
        });
    },
    /**
     * 预览头像
     * @param {Object} user 用户数据
     */
    previewAvatar(user) {
      this.previewAvatarUrl = user.productImgUrl;
      const img = new Image()
      img.src = this.previewAvatarUrl
      img.onload = () => {
        this.avatarDialogVisible = true;
      } // 图片有效
      img.onerror = () => {
        this.$message.warning('头像文件损坏或不存在！')
      } // 图片损坏
      // this.avatarDialogVisible = true;
    },
    /**
     * 关闭头像预览弹窗
     */
    handleAvatarDialogClose() {
      this.avatarDialogVisible = false;
      this.previewAvatarUrl = "";
    },
    /**
     * 处理表格排序变更
     * @param {Object} param0 排序参数
     */
    handleSortChange({ prop, order }) {
      this.sortParams = { prop, order };
      this.fetchTableData(); // 重新获取数据
    },
    /**
     * 处理分页页码变更
     * @param {Number} val 页码
     */
    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData(); // 重新获取数据
    },
    /**
     * 获取表格数据
     */
    fetchTableData() {
      this.loading = true;
      // 构造请求参数
      const formatData = {
        ...this.filterForm,
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      // 移除空值参数
      Object.keys(formatData).forEach((key) => {
        if (
          formatData[key] === "" ||
          formatData[key] === null ||
          formatData[key] === undefined ||
          (Array.isArray(formatData[key]) && formatData[key].length === 0)
        ) {
          delete formatData[key];
        }
      });
      // 调用列表接口
      productList(formatData)
        .then((res) => {
          console.log(res);
          if (res.success && res.data && res.data.rows) {
            // 处理表格数据
            this.tableData = res.data.rows;
            this.pagination.total = res.data.total || 0; // 设置总记录数
          } else {
            this.tableData = [];
            this.pagination.total = 0;
          }
          this.loading = false; // 关闭加载状态
        })
        .catch((error) => {
          console.error("获取商品列表失败:", error);
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false; // 关闭加载状态
          this.$message.error("获取数据失败，请稍后重试");
        });
    },
  },
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

// 头像单元格样式
.avatar-cell {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0;
  border-radius: 4px;
}

.avatar-cell:hover {
  background-color: #f0f0f0;
}

// 头像缩略图样式
.avatar-thumb {
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.avatar-thumb img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

// 标签样式
.el-tag.el-tag--success {
  background-color: #f0f9eb00;
  border-color: #e1f3d800;
  color: #1BC286;
}

.el-tag.el-tag--warning {
  background-color: #fdf6ec00;
  border-color: #faecd800;
  color: #FF4D4F;
}

.el-tag--small {
  padding: 0;
}

// 状态徽章样式
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  animation: pulse 2s infinite;
}

.status-online {
  background-color: rgba(27, 194, 134, 0.1);
  color: #1BC286;
}

.status-online .status-dot {
  background-color: #1BC286;
}

.status-offline {
  background-color: rgba(255, 77, 79, 0.1);
  color: #FF4D4F;
}

.status-offline .status-dot {
  background-color: #FF4D4F;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(27, 194, 134, 0.7);
  }

  70% {
    box-shadow: 0 0 0 6px rgba(27, 194, 134, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(27, 194, 134, 0);
  }
}

.status-offline .status-dot {
  animation: pulse-offline 2s infinite;
}

@keyframes pulse-offline {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7);
  }

  70% {
    box-shadow: 0 0 0 6px rgba(255, 77, 79, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0);
  }
}
</style>
