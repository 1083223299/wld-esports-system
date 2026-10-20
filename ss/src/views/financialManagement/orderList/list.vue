<template>
  <div class="order-management">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="queryForm" :gutter="20" @search="handleSearch"
        @reset="handleReset"></SearchForm>
    </div>
    <!-- 数据列表展示 -->
    <el-card class="list-card" shadow="never">
      <el-table :data="tableData" stripe style="width: 100%" v-loading="loading"
        :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }"
        :height="`calc(100vh - ${moduleHeight}px - 214px)`">
        <el-table-column prop="orderId" label="订单编号" width="200"></el-table-column>
        <el-table-column prop="tid" label="淘宝订单号" width="180"></el-table-column>
        <el-table-column prop="orderStatus" label="订单状态" width="140">
          <template slot-scope="scope">
            <span class="order-status-inline" :style="getOrderStatusStyle(scope.row.orderStatus)">
              <span class="order-status-dot"></span>
              <span class="order-status-text">{{ getOrderStatusText(scope.row.orderStatus) }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="orderRefundStatus" label="退款状态" width="120">
          <template slot-scope="scope">
            <el-tag :type="getRefundStatusType(scope.row.orderRefundStatus)" size="mini">
              {{ getRefundStatusText(scope.row.orderRefundStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bossNickName" label="用户名称" width="120"></el-table-column>
        <el-table-column prop="bossId" label="用户ID" width="170"></el-table-column>
        <el-table-column prop="waiterNickName" label="陪陪名称" width="100"></el-table-column>
        <el-table-column prop="waiterId" label="陪陪ID" width="170"></el-table-column>
        <el-table-column prop="payment" label="支付方式" width="100">
          <template slot-scope="scope">
            {{ formatPayMethod(scope.row.payment) }}
          </template>
        </el-table-column>
        <el-table-column prop="originalPrice" label="单价" width="100" align="left">
          <template slot-scope="scope">
            ¥{{ scope.row.originalPrice }}
          </template>
        </el-table-column>
        <el-table-column prop="num" label="数量" width="80" align="center"></el-table-column>
        <el-table-column prop="price" label="总金额" width="120" align="left">
          <template slot-scope="scope">
            ¥{{ scope.row.price }}
          </template>
        </el-table-column>
        <el-table-column prop="sourceChannel" label="渠道" width="80"></el-table-column>
        <el-table-column prop="createTime" label="支付时间" min-width="160">
          <template slot-scope="scope">
            {{ scope.row.createTime || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="endTime" label="完成时间" min-width="160">
          <template slot-scope="scope">
            {{ scope.row.endTime || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template slot-scope="scope">
            <el-button v-permission="'system:orderList:detail'" size="mini" @click="handleDetail(scope.row)"
              style="color: #9047F8;" class="mini-buttom">详情
            </el-button>
            <el-button v-permission="'system:orderList:log'" size="mini" @click="handleLog(scope.row)"
              style="color: #ff8107;" class="mini-buttom2">日志
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页组件 -->
      <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
        @current-change="handleCurrentChange"></PaginationSimple>
    </el-card>
    <el-dialog title="日志" :visible.sync="isHandleLog" width="560px" class="dialog-center">
      <el-card shadow="never" class="section-card">
        <el-table :data="logLists" size="small" class="detail-table" stripe row-key="id" v-loading="logLoading"
          :header-row-style="{ backgroundColor: '#F6F6FB' }">
          <el-table-column prop="operatorName" label="操作人" width="100"></el-table-column>
          <el-table-column prop="orderStatus" label="订单状态" width="120"></el-table-column>
          <el-table-column prop="content" label="内容" width="140"></el-table-column>
          <el-table-column prop="createTime" label="操作时间" width="145"></el-table-column>
        </el-table>
        <PaginationSimple :current-page="currentLogPage" :page-size="pageLogSize" :total="totalLog"
          @current-change="handleLogPageChange"></PaginationSimple>
      </el-card>
    </el-dialog>

  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue"; // 搜索表单组件
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
// 导入API接口
import {
  ordersList, // 订单列表
} from "@/api/orderList";
import {
  logList, // 日志列表
} from "@/api/orderFlow";

const ORDER_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "待接单", value: 0 },
  { label: "未接单", value: 12 },
  { label: "已取消", value: 4 },
  { label: "退款中", value: 2 },
  { label: "拒绝退款", value: 8 },
  { label: "进行中", value: 1 },
  { label: "已完成", value: 3 },
  { label: "交易关闭", value: 5 },
  { label: "部分退款成功", value: 7 },
];

const ORDER_STATUS_MAP = {
  0: { label: "待接单", color: "#F39C12" },
  1: { label: "进行中", color: "#3A71FF" },
  2: { label: "退款中", color: "#9347EC" },
  3: { label: "已完成", color: "#28B150" },
  4: { label: "已取消", color: "#ACACAC" },
  5: { label: "交易关闭", color: "#7D26CD" },
  7: { label: "部分退款成功", color: "#7D26CD" },
  8: { label: "拒绝退款", color: "#8B5A2B" },
  12: { label: "未接单", color: "#EA7BB9" },
};

export default {
  name: 'ListCompanion',
  components: {
    SearchForm,
    PaginationSimple,
  },
  inject: ["switchToEdit"], // 注入编辑页面跳转方法
  data() {
    return {
      logLists: [], // 日志列表
      orderId: "", // 订单ID
      currentLogPage: 1, // 当前日志页码
      pageLogSize: 10, // 日志分页大小
      totalLog: 0, // 日志总数
      isHandleLog: false, // 是否显示日志弹窗
      logLoading: false, // 日志加载状态
      mockData: [], // 模拟数据
      // 筛选表单
      queryForm: {
        orderId: '',
        tId: '',
        bossId: '',
        payment: '',
        orderStatus: '',
        // orderRefundStatus: '',
        paymentTimeRange: []
      },

      // 搜索表单配置项
      searchItems: [
        {
          type: "input",
          prop: "orderId",
          label: "订单号",
          placeholder: "请输入订单号",
          clearable: true,
        },
        {
          type: "input",
          prop: "tId",
          label: "淘宝订单号",
          placeholder: "请输入淘宝订单号",
          clearable: true,
        },
        {
          type: "input",
          prop: "bossId",
          label: "用户ID",
          inputType: "number",
          placeholder: "请输入用户ID",
          clearable: true,
        },
        {
          type: "select",
          prop: "payment",
          label: "支付方式",
          placeholder: "全部",
          options: [
            { label: "全部", value: null },
            { label: "未来币", value: 1 },
            { label: "淘宝", value: 2 },
            // { label: "微信", value: 1 },
            // { label: "支付宝", value: 2 },
            // { label: "苹果支付", value: 3 },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "orderStatus",
          label: "订单状态",
          placeholder: "全部",
          options: ORDER_STATUS_OPTIONS,
          clearable: true,
        },
        {
          type: "select",
          prop: "orderRefundStatus",
          label: "退款状态",
          placeholder: "全部",
          options: [
            { label: "全部", value: null },
            { label: "正常订单", value: 0 },
            { label: "申请退款中", value: 1 },
            { label: "退款成功", value: 2 },
            { label: "退款失败", value: 3 },
            { label: "退款取消", value: 4 },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "paymentTimeRange",
          label: "支付时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          pickerOptions: {
            onPick: ({ maxDate, minDate }) => {
              if (minDate && !maxDate) {
                this.searchItems.find(item => item.prop === 'paymentTimeRange').pickerOptions.disabledDate = (time) => {
                  const selectedDate = minDate;
                  const current = new Date(time);
                  const timeDiff = Math.abs(current.getTime() - selectedDate.getTime());
                  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                  // 如果日期差大于31天，则禁用
                  return dayDiff > 31;
                };
              } else {
                // 当选择了两个日期后，重置禁用规则
                this.searchItems.find(item => item.prop === 'paymentTimeRange').pickerOptions.disabledDate = null;
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

      // 表格数据
      tableData: [],
      loading: false,
      total: 0,

      pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
      moduleHeight: 0, // 搜索模块高度
    }
  },

  mounted() {
    this.fetchTableData()
    this.updateModuleHeight();
    // 监听窗口大小变化
    window.addEventListener('resize', this.updateModuleHeight);
  },

  beforeDestroy() {
    // 移除监听器
    window.removeEventListener('resize', this.updateModuleHeight);
  },
  methods: {
    /**获取搜索框高度计算 ***/
    updateModuleHeight() {
      this.$nextTick(() => {
        if (this.$refs.responsiveModule) {
          this.moduleHeight = this.$refs.responsiveModule.offsetHeight;
          console.log('当前高度:', this.moduleHeight);
        }
      });
    },

    // 加载表格数据
    fetchTableData() {
      // 获取表格数据
      this.loading = true;
      // 构造查询参数
      const params = {
        ...this.queryForm,
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize
      };
      // 将日期范围拆成 startTime / endTime
      if (params.paymentTimeRange && params.paymentTimeRange.length === 2) {
        params.startTime = params.paymentTimeRange[0];
        params.endTime = params.paymentTimeRange[1];
      }
      delete params.paymentTimeRange;
      console.log('查询参数:', this.queryForm);
      // TODO: 替换为真实接口
      ordersList(params).then((res) => {
        if (res.data && res.data.rows) {
          this.tableData = res.data.rows
          this.pagination.total = res.data.total || 0; // 设置总记录数
        } else {
          this.tableData = [];
          this.pagination.total = 0;
        }
        this.loading = false; // 关闭加载状态
      })
        .catch((error) => {
          console.error("获取列表失败:", error);
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false; // 关闭加载状态
          this.$message.error("获取数据失败，请稍后重试");
        });
    },

    // 搜索
    handleSearch(e) {
      if (e) {
        const formValues = e;
        // 处理日期范围
        if (formValues.paymentTimeRange && formValues.paymentTimeRange.length === 2) {
          this.queryForm.startTime = formValues.paymentTimeRange[0];
          this.queryForm.endTime = formValues.paymentTimeRange[1];
          delete formValues.paymentTimeRange;
        } else {
          this.queryForm.startTime = '';
          this.queryForm.endTime = '';
        }
        this.queryForm = { ...this.queryForm, ...formValues };
      }
      this.pagination.pageNum = 1
      this.fetchTableData()
    },

    // 重置
    handleReset() {
      this.queryForm = {
        orderId: '',
        tId: '',
        bossId: '',
        payment: '',
        orderStatus: '',
        // orderRefundStatus: '',
        paymentTimeRange: []
      }
      this.pagination.pageNum = 1
      this.fetchTableData()
    },


    // 当前页改变
    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData(); // 重新获取数据
    },

    // 日志
    handleLog(row) {
      this.orderId = row.orderId;
      this.isHandleLog = true
      this.logListForm()
    },
    handleLogPageChange(val) {
      this.currentLogPage = val;
      this.logListForm(); // 重新获取数据
    },

    async logListForm() {
      try {
        this.logLoading = true
        const params = {
          orderId: this.orderId,
          pageNum: this.currentLogPage,
          pageSize: this.pageLogSize
        };
        const res = await logList(params)
        console.log('加载退款记录', res)
        if (res.data && res.data.rows) {
          this.logLists = res.data.rows
          this.totalLog = res.data.total || 0; // 设置总记录数
        } else {
          this.logLists = []
          this.totalLog = 0; // 设置总记录数
        }
      } catch (error) {
        this.$message.error('加载日志失败')
      } finally {
        // this.isHandleLog = false
        this.logLoading = false
      }
    },

    // 查看详情
    handleDetail(row) {
      this.switchToEdit(row);
    },

    // 获取支付方式类型
    getPaymentMethodType(method) {
      const types = {
        1: 'success',
        2: 'primary',
      }
      return types[method] || 'info'
    },

    // 获取支付方式文本
    formatPayMethod(method) {
      const texts = {
        1: '未来币',
        2: '淘宝',
        // 1: '微信',
        // 2: '支付宝',
        // 3: '苹果支付'
      }
      return texts[method] || method
    },

    // 获取订单状态类型
    getOrderStatusType(status) {
      const statusItem = ORDER_STATUS_MAP[status]
      return statusItem ? statusItem.color : '#999999'
    },

    getOrderStatusStyle(status) {
      const color = this.getOrderStatusType(status)
      return {
        '--status-color': color
      }
    },

    // 获取订单状态文本
    getOrderStatusText(status) {
      return ORDER_STATUS_MAP[status]?.label || status
    },

    // 获取退款状态类型
    getRefundStatusType(status) {
      const types = {
        0: 'primary',
        1: 'warning',
        2: 'success',
        3: 'danger',
        4: 'info'
      }
      return types[status] || ''
    },

    // 获取退款状态文本
    getRefundStatusText(status) {
      const texts = {
        0: '-', // 正常订单
        1: '申请退款中', // 申请退款中
        2: '退款成功',
        3: '退款失败',
        4: '退款取消',
      }
      return texts[status] || ''
    }
  }
}
</script>

<style scoped lang="scss">
::v-deep.el-dialog__body {
  padding: 0 !important;
}

/* .order-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
} */

.filter-card {
  border: none;
}

.info-section {
  margin-bottom: 20px;
}

.el-card {
  border: none;
}

.el-card>>>.el-card__header {
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.el-table {
  font-size: 13px;
}

// .el-table>>>.el-table__header th {
//   background-color: #f8f9fa;
//   color: #606266;
//   font-weight: 600;
// }

.el-pagination {
  padding: 0;
}

.el-descriptions {
  margin-top: 10px;
}

.filter-card {
  background-color: #fff;
}

// /* // 列表卡片样式 */
.list-card {
  border-radius: 24px;
}

.el-tag {
  height: 32px;
  padding: 0 10px;
  line-height: 30px;
  font-size: 12px;
  border-width: 0;
  border-style: solid;
  border-radius: 4px;
  background-color: #f0f9eb00;
  border-color: #e1f3d800;
  color: #409EFF;
}

.el-tag.el-tag--success {
  background-color: #f0f9eb00;
  border-color: #e1f3d800;
  color: #1BC286;
}

.el-tag.el-tag--warning {
  background-color: #fdf6ec00;
  border-color: #faecd800;
  color: #FF8107;
}

.el-tag.el-tag--danger {
  background-color: #fdf6ec00;
  border-color: #faecd800;
  color: #FF4D4F;
}

.el-tag.el-tag--info {
  background-color: #fdf6ec00;
  border-color: #faecd800;
  color: #999999;
}

.el-button {
  border-color: transparent;
  background: 0 0;
  padding-left: 0;
  padding-right: 0;
}

.mini-buttom:hover {
  background-color: #ffffff00 !important;
  border-color: #ffffff00 !important;
}

.mini-buttom2:hover {
  background-color: #ffffff00 !important;
  border-color: #ffffff00 !important;
  color: #fd8d1c !important;
}

.el-tag {
  padding: 0;
}

.order-status-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 88px;
  font-size: 12px;
  font-weight: 500;
  color: var(--status-color);
  line-height: 1;
}

.order-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--status-color);
  flex-shrink: 0;
}

.order-status-text {
  white-space: nowrap;
  text-align: center;
  color: inherit;
}

::v-deep .el-dialog__body {
  padding: 0 0 0 0 !important;
}
</style>
