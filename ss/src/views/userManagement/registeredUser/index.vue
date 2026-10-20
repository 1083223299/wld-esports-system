<template>
  <div class="container">
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
        :confirm-reset="true" confirm-reset-message="确定要重置所有筛选条件吗？"
        @search="handleSearch" @reset="handleReset"></SearchForm>
    </div>
    <el-card class="list-card" shadow="never">

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :height="`calc(100vh - ${moduleHeight}px - 200px)`"
          @sort-change="handleSortChange" @selection-change="handleSelectionChange" ref="table">
          <el-table-column prop="userId" label="用户ID" sortable="custom"></el-table-column>
          <el-table-column prop="nickName" label="用户名称"></el-table-column>
          <el-table-column label="头像">
            <template slot-scope="scope">
              <div class="avatar-cell">
                <!-- 有链接时加载目标图片，加载失败触发error事件替换为默认图 -->
                <img v-if="scope.row.urlLink" :src="scope.row.urlLink" class="avatar-thumb"
                  @click="previewAvatar(scope.row)" @error="(e) => handleImgError(e)" />
                <!-- 无链接直接显示默认图 -->
                <img v-else src="@/assets/defaulIcon.png" class="avatar-thumb" @click="defaulImg" />
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="sex" label="性别">
            <template slot-scope="scope">
              <span class="number-cell">
                {{ sexMap[scope.row.sex] || '未知' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="fansCount" label="粉丝数" sortable="custom">
            <template slot-scope="scope">
              <span class="number-cell">{{ scope.row.fansCount | formatNumber }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="followCount" label="关注数" sortable="custom">
            <template slot-scope="scope">
              <span class="number-cell">{{ scope.row.followCount | formatNumber }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="orderCount" label="接单量" sortable="custom">
            <template slot-scope="scope">
              <span class="number-cell">{{ scope.row.orderCount | formatNumber }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="注册时间"></el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button v-permission="'system:registeredUser:disable'" type="text" size="small"
                  :class="scope.row.status === '0' ? 'text-danger' : 'text-success'" @click="toggleStatus(scope.row)">
                  {{ scope.row.status === '0' ? '禁用' : '启用' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <!-- 分页组件 -->
      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          :selected-rows="selectedRows" @current-change="handleCurrentChange" @batch-enable="batchEnable"
          @batch-disable="batchDisable" @clear-selection="clearSelection"></PaginationSimple>
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


// 导入API接口
import {
  unionStatus,  // 修改陪玩状态
} from "@/api/unionSupport";
import { getBusinessUserList } from '@/api/userManagement'

export default {
  name: "UnionCompanionList", // 组件名称
  // 注册组件
  components: {
    SearchForm,
    PaginationSimple,
  },
  // 过滤器
  filters: {
    // 数字格式化过滤器：万为单位，千分位分隔
    formatNumber(num) {
      if (!num) return "0";
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + "万";
      }
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
  },
  // 数据定义
  data() {
    return {
      userName: "", // 用户名
      sexMap: {
        '0': '男',
        '1': '女'
      },
      // 日期格式化：转成 yyyy-MM-dd HH:mm:ss 格式（供初始值使用）
      formatDateToStr: (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${mm}:${s}`;
      },
      // 搜索表单配置项
      searchItems: [
        {
          type: "input",
          prop: "nickName",
          label: "用户名称",
          placeholder: "请输入用户名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "userId",
          label: "用户ID",
          placeholder: "请输入用户ID",
          inputType: "number",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "账号状态",
          placeholder: "全部状态",
          options: [
            { label: "全部", value: null },
            { label: "正常", value: 0 },
            { label: "停用", value: 1 },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "identityType",
          label: "身份类型",
          placeholder: "全部",
          options: [
            { label: "全部", value: null },
            { label: "个人陪玩", value: '0' },
            { label: "公会陪玩", value: '1' },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "createTime",
          label: "注册时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          pickerOptions: {
            onPick: ({ maxDate, minDate }) => {
              if (minDate && !maxDate) {
                this.searchItems.find(item => item.prop === 'createTime').pickerOptions.disabledDate = (time) => {
                  const selectedDate = minDate;
                  const current = new Date(time);
                  const timeDiff = Math.abs(current.getTime() - selectedDate.getTime());
                  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                  // 如果日期差大于31天，则禁用
                  return dayDiff > 31;
                };
              } else {
                // 当选择了两个日期后，重置禁用规则
                this.searchItems.find(item => item.prop === 'createTime').pickerOptions.disabledDate = null;
              }
            },
            disabledDate: null,
            // 快捷选择配置
            shortcuts: [
              {
                text: "最近一周",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 7);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
              {
                text: "最近一个月",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 30);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
            ],
          },
        },
      ],
      // 筛选表单数据
      filterForm: {
        nickName: "",
        userId: "",
        status: "",
        identityType: '',
        beginCreateTime: "",
        endCreateTime: "",
        createTime: [],
        isWaiter: '', //  选择个人陪玩时 isWaiter为1即可 如果选择的是公会陪玩 那么 isWaiter和isMember都要为1
        isMember: ''
      },
      pickerOptions: null,        // 日期选择器配置
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
    this.initPickerOptions(); // 初始化日期选择器配置
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
  // 方法定义
  methods: {
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
     * 初始化日期选择器配置
     */
    initPickerOptions() {
      this.pickerOptions = {
        onPick: ({ maxDate, minDate }) => {
          if (minDate && !maxDate) {
            this.pickerOptions.disabledDate = (time) => {
              const start = minDate;
              const end = new Date(
                minDate.getTime() + 31 * 24 * 60 * 60 * 1000,
              );
              const current = new Date(time);
              return (
                current.getTime() < start.getTime() ||
                current.getTime() > end.getTime()
              );
            };
          }
        },
        disabledDate: () => false,
      };
    },
    /**
     * 初始化表格数据
     */
    initTableData() {
      this.loading = true;
      this.fetchTableData();
    },

    // ===================== 业务逻辑方法 =====================

    handleSelectionChange(selection) {
      this.selectedRows = selection;
    },
    /**
     * 处理搜索事件
     * @param {Object} e 搜索表单数据
     */
    handleSearch(e) {
      if (e) {
        const formValues = e;
        // 处理日期范围
        if (formValues.createTime && formValues.createTime.length === 2) {
          this.filterForm.beginCreateTime = formValues.createTime[0];
          this.filterForm.endCreateTime = formValues.createTime[1];
          delete formValues.createTime;
        } else {
          this.filterForm.beginCreateTime = '';
          this.filterForm.endCreateTime = '';
        }
        // 处理身份类型
        if (formValues.identityType === '0') {
          this.filterForm.isWaiter = '1';
          this.filterForm.isMember = '';
        } else if (formValues.identityType === '1') {
          this.filterForm.isWaiter = '1';
          this.filterForm.isMember = '1';
        } else {
          this.filterForm.isWaiter = '';
          this.filterForm.isMember = '';
        }
        delete formValues.identityType;
        this.filterForm = { ...this.filterForm, ...formValues };
      }
      this.pagination.pageNum = 1; // 重置页码
      this.fetchTableData();       // 重新获取数据
    },
    /**
     * 处理重置事件
     */
    handleReset() {
      this.filterForm = {
        nickName: "",
        userId: "",
        status: "",
        beginCreateTime: "",
        endCreateTime: "",
        createTime: [],
        isWaiter: '',
        isMember: '',
        identityType: ''
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
     * 切换陪玩账号状态（启用/禁用）
     * @param {Object} row 行数据
     */
    toggleStatus(row) {
      const action = row.status === '0' ? "禁用" : "启用";
      this.$confirm(`确定要${action}${row.nickName}账号吗？`, "用户状态", {
        type: "warning",
      })
        .then(() => {
          const params = {
            tradeUserId: row.userId,
            status: row.status === '1' ? '0' : '1',
          };
          // 调用状态修改接口
          unionStatus(params).then(() => {
            row.status = row.status === '1' ? 0 : 1;
            this.$message.success(`已${action}${row.nickName}账号`);
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
      this.previewAvatarUrl = user.urlLink;
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
     * 批量启用账号
     */
    batchEnable() {
      this.$confirm(
        `确定要启用选中的 ${this.selectedRows.length} 个账号吗？`,
        "批量启用",
        { type: "warning" },
      )
        .then(() => {
          this.selectedRows.forEach((row) => (row.status = 0));
          this.$message.success("批量启用成功");
          this.selectedRows = []; // 清空选中
          this.fetchTableData();  // 刷新数据
        })
        .catch(() => {
        });
    },
    /**
     * 批量禁用账号
     */
    batchDisable() {
      this.$confirm(
        `确定要禁用选中的 ${this.selectedRows.length} 个账号吗？`,
        "批量禁用",
        { type: "warning" },
      )
        .then(() => {
          this.selectedRows.forEach((row) => (row.status = 1));
          this.$message.success("批量禁用成功");
          this.selectedRows = []; // 清空选中
          this.fetchTableData();  // 刷新数据
        })
        .catch(() => {
        });
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
      // 处理日期范围
      if (
        this.filterForm.createTime &&
        this.filterForm.createTime.length === 2
      ) {
        this.filterForm.startTime = this.filterForm.createTime[0];
        this.filterForm.endTime = this.filterForm.createTime[1];
      }
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
      getBusinessUserList(formatData)
        .then((res) => {
          if (res.data && res.data.rows) {
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
          console.error("获取陪陪列表失败:", error);
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
.container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}


// 操作栏样式
.action-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  background: #fff;
  margin-bottom: 8px;
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

// 语音控制组样式
.voice-control-group {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0px 12px 0px 0px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 6px;
  // border-left: 4px solid #9047f8;
}

// 语音播放信息样式
.voice-playing-info {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

// 列表卡片样式
.list-card {
  border-radius: 24px;
}

// 正在播放语音的行样式
::v-deep.el-table .playing-row {
  background-color: rgba(144, 71, 248, 0.05) !important;
}

::v-deep.el-table .playing-row:hover>td {
  background-color: rgba(144, 71, 248, 0.08) !important;
}

::v-deep.el-table .playing-row .voice-item {
  background: rgba(144, 71, 248, 0.1);
  border-color: #9047f8;
}

// 头像单元格样式
.avatar-cell {
  display: flex;
  flex-direction: row;
  align-items: center;
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

// 数字单元格样式
.number-cell {
  font-weight: 500;
  color: #333;
}

// 评价单元格样式
.evaluate-cell {
  display: flex;
  align-items: center;
}

// 操作按钮组样式
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
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

// 禁用文字样式
.text-danger {
  color: #ff4d4f !important;
}

.text-danger:hover {
  color: #f78989 !important;
}

// 启用文字样式
.text-success {
  color: #1bc286 !important;
}

.text-success:hover {
  color: #85ce61 !important;
}

// 手机号单元格样式
.tradeUserPhone-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// 手机号图标样式
.tradeUserPhone-icon {
  margin-left: 8px;
  font-size: 10px;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 8px;
}

.tradeUserPhone-icon:hover {
  color: #919191;
}

.tradeUserPhone-icon.active {
  color: #f56c6c;
  transform: scale(1.1);
}

// 表格表头居中
.el-table th.el-table__cell>.cell {
  text-align: center;
}

// 文本按钮颜色
.el-button--text {
  color: rgb(144, 71, 248);
}

// 批量操作区域样式
.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

// 选中数量文本样式
.selected-count {
  color: #606266;
  font-size: 14px;
}

// 响应式样式
@media (max-width: 768px) {
  .voice-control-group {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
    justify-content: space-between;
  }

  .pagination-container {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-actions {
    margin-bottom: 15px;
    justify-content: center;
    flex-wrap: wrap;
  }
}

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
</style>
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
</style>
