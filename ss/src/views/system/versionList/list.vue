<template>
  <div class="container">

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 操作按钮栏 -->
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
          v-permission="'system:versionList:add'">
          新增版本
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }" @sort-change="handleSortChange"
          @selection-change="handleSelectionChange" :row-class-name="tableRowClassName" ref="table">
          <el-table-column prop="versionCode" label="版本号" min-width="140"></el-table-column>
          <el-table-column prop="platform" label="渠道" min-width="100">
            <template slot-scope="scope">
              {{ scope.row.platform === 1 ? 'iOS' : 'android' }}
            </template>
          </el-table-column>
          <el-table-column prop="updateContent" label="内容" min-width="144"></el-table-column>
          <el-table-column prop="isForceUpdate" label="更新方式" min-width="100">
            <template slot-scope="scope">
              {{ scope.row.isForceUpdate === 0 ? '非强制更新' : '强制更新' }}
            </template>
          </el-table-column>
          <el-table-column prop="updateCount" label="更新数量" min-width="120"></el-table-column>
          <el-table-column prop="updateFileUrl" label="安装包" min-width="120">
            <template slot-scope="scope">
              <div v-if="scope.row.platform === 1">{{ scope.row.updateFileUrl }}</div>
              <div v-else><img src="@/assets/apk.png" alt="" class="apkLogo" /></div>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" min-width="154"></el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button type="text" @click="handleEdit(scope.row)" style="color: #9047F8;"
                  v-permission="'system:versionList:edit'">
                  编辑
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          :selected-rows="selectedRows" @current-change="handleCurrentChange" @clear-selection="clearSelection">
        </PaginationSimple>
      </div>
    </el-card>
  </div>
</template>


<script>
// 导入组件
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
// 导入API接口
import {
  versionList,    // 获取列表接口
} from "@/api/versionList";

export default {
  name: "VersionTable", // 组件名称
  // 注册组件
  components: {
    PaginationSimple
  },
  inject: ["switchToAdd", "getSharedRefresh"], // 注入新增页面跳转方法
  // 数据定义
  data() {
    return {
      dataAnalysisLoading: false,            // 数据分析列表加载状态
      dataAnalysisDialog: false, // 数据分析弹窗显示状态
      tableData: [],              // 表格数据源
      selectedRows: [],           // 选中的行数据
      loading: false,             // 加载状态
      pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
      sortParams: { prop: "", order: "" }, // 排序参数
      moduleHeight: 0, // 搜索模块高度
    };
  },
  // 创建生命周期：初始化配置和数据
  created() {
    this.initTableData();     // 初始化表格数据
  },
  // 挂载生命周期：添加事件监听
  mounted() {

  },
  activated() {
    // console.log('批量新增/编辑组件被激活')
    if (this.getSharedRefresh()) {
      this.fetchTableData()
    }
  },
  // 方法定义
  methods: {
    // 数据分析弹窗
    onDataAnalysis(row) {
      console.log(row)
      this.dataAnalysisDialog = true
    },
    /**
     * 表格行样式类名
     * @param {Object} param0 行数据
     * @returns {String} 样式类名
     */
    tableRowClassName({ row }) {
      return row.userId === this.playingVoiceId ? "playing-row" : "";
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
     * 处理表格选择变更
     * @param {Array} selection 选中的行数据
     */
    handleSelectionChange(selection) {
      this.selectedRows = selection;
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
     * 清空表格选择
     */
    clearSelection() {
      this.selectedRows = [];
      if (this.$refs.table) this.$refs.table.clearSelection(); // 清空表格选择
      this.$message.info("已清空选择");
    },
    /**
     * 获取表格数据
     */
    fetchTableData() {
      this.loading = true;
      // 构造请求参数
      const formatData = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,                              // 否则为空字符串（无排序）
      };
      // 调用列表接口
      versionList(formatData)
        .then((res) => {
          console.log("查询版本更新表格数据:", res);
          if (res.data && res.data.rows) {
            // 处理表格数据，添加手机号显示状态和语音默认配置
            this.tableData = res.data.rows.map((item) => ({
              ...item,
            }));
            this.pagination.total = res.data.total || 0; // 设置总记录数

          } else {
            this.tableData = [];
            this.pagination.total = 0;
          }
          this.loading = false; // 关闭加载状态
        })
        .catch((error) => {
          console.error("列表失败:", error);
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false; // 关闭加载状态
          this.$message.error("获取数据失败，请稍后重试");
        });
    },
  },
};
</script>
<style scoped>
.container {
  height: 100%;
}

/* 列表卡片 */
.list-card {
  height: 100%;
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

.apkLogo {
  width: 46px;
  height: 46px;
  border-radius: 8px;
}
</style>