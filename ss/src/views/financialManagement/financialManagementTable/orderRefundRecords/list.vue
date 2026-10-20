<template>
  <div class="refund-management">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="queryForm" :gutter="20" @search="handleSearch"
        @reset="handleReset"></SearchForm>
    </div>
    <!-- 数据列表 -->
    <el-card class="list-card" shadow="never">
      <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
        :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }"
        :header-row-style="{ backgroundColor: '#F6F6FB' }" row-class-name="tableRowClassName" ref="table">
        <el-table-column prop="tkNo" label="退款流水号" width="180" />
        <el-table-column prop="orderId" label="业务订单号" width="180" />
        <el-table-column prop="taobaoOrderNo" label="淘宝订单号" width="190">
          <template slot-scope="scope">
            {{ scope.row.taobaoOrderNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="退款状态" width="120">
          <template slot-scope="scope">
            <span class="refund-status-inline" :style="getRefundStatusStyle(scope.row.status)">
              <span class="refund-status-dot"></span>
              <span class="refund-status-text">{{ statusText(scope.row.status) }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="refundType" label="退款类型" width="110">
          <template slot-scope="scope">
            {{ formatRefundType(scope.row.refundType) }}
          </template>
        </el-table-column>
        <el-table-column prop="bossNickName" label="用户名称" width="120" />
        <el-table-column prop="bossId" label="用户ID" width="150" />
        <el-table-column prop="waiterNickName" label="陪陪名称" width="150" />
        <el-table-column prop="waiterId" label="陪陪ID" width="150" />
        <el-table-column prop="payment" label="支付方式" width="150">
          <template slot-scope="scope">
            {{ formatPayMethod(scope.row.payment) }}
          </template>
        </el-table-column>
        <el-table-column prop="originalPrice" label="单价" width="90">
          <template slot-scope="scope">
            {{ formatMoney(scope.row.originalPrice) }}
          </template>
        </el-table-column>
        <el-table-column prop="num" label="数量" width="80" />
        <el-table-column prop="price" label="退款总金额" width="120">
          <template slot-scope="scope">
            {{ formatMoney(scope.row.price) }}
          </template>
        </el-table-column>
        <el-table-column prop="orderPrice" label="订单总价" width="110">
          <template slot-scope="scope">
            {{ formatMoney(scope.row.orderPrice) }}
          </template>
        </el-table-column>
        <el-table-column prop="couponAmount" label="是否用券" width="100">
          <template slot-scope="scope">
            <el-tag :type="hasCoupon(scope.row.couponAmount) ? 'success' : 'info'" size="mini">
              {{ hasCoupon(scope.row.couponAmount) ? '已用券' : '未用券' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sourceChannel" label="渠道" width="100" />
        <el-table-column prop="createTime" label="申请时间" min-width="160" sortable />
        <el-table-column prop="endTime" label="完成时间" min-width="160" />
        <el-table-column label="操作" width="80" fixed="right" v-if="checkPermission('system:orderRefundRecords:detail')">
          <template slot-scope="scope">
            <el-button v-permission="'system:orderRefundRecords:detail'" size="mini" @click="viewDetail(scope.row)"
              style="color: #9047F8;" class="mini-buttom">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页组件 -->
      <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
        @current-change="handleCurrentChange"></PaginationSimple>
    </el-card>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue"; // 搜索表单组件
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
import checkPermission from "@/utils/checkPermission";
// 导入API接口
import {
  refundList, // 订单列表
} from "@/api/orderRefundRecords";

const REFUND_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "处理中", value: 0 },
  { label: "退款成功", value: 1 },
  { label: "退款失败", value: 2 },
];

const REFUND_STATUS_MAP = {
  0: { label: "处理中", color: "#409EFF" },
  1: { label: "退款成功", color: "#67C23A" },
  2: { label: "退款失败", color: "#F56C6C" },
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
      loading: false, // 加载状态
      queryForm: {
        orderId: '',
        taobaoOrderNo: '',
        userId: '',
        waiterId: '',
        payment: '',
        status: '',
        startTime: '',
        endTime: '',
        applyTimeRange: []
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
          prop: "taobaoOrderNo",
          label: "淘宝订单号",
          placeholder: "请输入淘宝订单号",
          clearable: true,
        },
        {
          type: "input",
          prop: "userId",
          label: "用户ID",
          inputType: "number",
          placeholder: "请输入用户ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "waiterId",
          label: "陪玩ID",
          inputType: "number",
          placeholder: "请输入陪玩ID",
          clearable: true,
        },
        {
          type: "select",
          prop: "payment",
          label: "支付方式",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "淘宝", value: "0" },
            { label: "未来币", value: "1" },
            { label: "苹果支付", value: "2" },
            { label: "支付宝", value: "3" },
            { label: "对公转账", value: "4" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "退款状态",
          placeholder: "全部",
          options: REFUND_STATUS_OPTIONS,
          clearable: true,
        },
        {
          type: "daterange",
          prop: "applyTimeRange",
          label: "申请时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          pickerOptions: {
            onPick: ({ maxDate, minDate }) => {
              if (minDate && !maxDate) {
                this.searchItems.find(item => item.prop === 'applyTimeRange').pickerOptions.disabledDate = (time) => {
                  const selectedDate = minDate;
                  const current = new Date(time);
                  const timeDiff = Math.abs(current.getTime() - selectedDate.getTime());
                  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                  // 如果日期差大于31天，则禁用
                  return dayDiff > 31;
                };
              } else {
                // 当选择了两个日期后，重置禁用规则
                this.searchItems.find(item => item.prop === 'applyTimeRange').pickerOptions.disabledDate = null;
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
      pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
      tableData: [],
      moduleHeight: 0, // 搜索模块高度
    };
  },
  // 创建生命周期：初始化配置和数据
  created() {
    this.initTableData();     // 初始化表格数据
  },
  /**获取搜索框高度 ***/
  mounted() {
    this.updateModuleHeight();
    // 监听窗口大小变化
    window.addEventListener('resize', this.updateModuleHeight);
  },

  beforeDestroy() {
    // 移除监听器
    window.removeEventListener('resize', this.updateModuleHeight);
  },
  methods: {
    checkPermission,
    // 退款列表退款状态
    statusType(status) {
      return REFUND_STATUS_MAP[status]?.color || '#999999'
    },
    getRefundStatusStyle(status) {
      return {
        '--refund-status-color': this.statusType(status)
      }
    },
    // 获取退款状态文本
    statusText(status) {
      return REFUND_STATUS_MAP[status]?.label || ''
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
    /**
     * 处理分页页码变更
     * @param {Number} val 页码
     */
    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData(); // 重新获取数据
    },
    handleSearch(e) {
      if (e) {
        const formValues = { ...e };
        // 处理日期范围
        if (formValues.applyTimeRange && formValues.applyTimeRange.length === 2) {
          formValues.startTime = formValues.applyTimeRange[0];
          formValues.endTime = formValues.applyTimeRange[1];
        } else {
          formValues.startTime = '';
          formValues.endTime = '';
        }
        this.queryForm = { ...this.queryForm, ...formValues };
      }
      this.pagination.pageNum = 1
      this.fetchTableData()
    },
    handleReset() {
      this.queryForm = {
        orderId: '',
        taobaoOrderNo: '',
        userId: '',
        waiterId: '',
        payment: '',
        status: '',
        startTime: '',
        endTime: '',
        applyTimeRange: []
      };
      this.fetchTableData()
      // 刷新列表
    },
    viewDetail(row) {
      // 跳转到详情页或弹窗
      this.switchToEdit(row);
      console.log('查看详情：', row);
    },
    formatPayMethod(method) {
      const map = {
        1: '未来币', 2: '淘宝'
      };
      return map[method] || method;
    },
    formatRefundType(type) {
      const map = {
        full: '全额退款',
        partial: '部分退款',
        '全额': '全额退款',
        '部分': '部分退款',
      };
      return map[type] || type || '-';
    },
    formatMoney(value) {
      if (value === null || value === undefined || value === '') return '-';
      const text = String(value);
      if (!/^-?\d+(\.\d+)?$/.test(text)) return text;
      const parts = text.split('.');
      return `${parts[0]}.${(parts[1] || '').concat('00').slice(0, 2)}`;
    },
    hasCoupon(value) {
      return value !== null && value !== undefined && value !== '' && !/^0+(\.0+)?$/.test(String(value));
    },
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
      if (params.applyTimeRange && params.applyTimeRange.length === 2) {
        params.startTime = params.applyTimeRange[0];
        params.endTime = params.applyTimeRange[1];
      } else {
        delete params.startTime;
        delete params.endTime;
      }
      delete params.applyTimeRange;
      refundList(params).then((res) => {
        if (res && res.success && res.data && res.data.rows) {
          this.tableData = res.data.rows
          this.pagination.total = res.data.total || 0; // 设置总记录数
        } else {
          this.tableData = [];
          this.pagination.total = 0;
        }
        this.loading = false; // 关闭加载状态
      })
        .catch((error) => {
          console.error("获公会流水列表失败:", error);
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false; // 关闭加载状态
          this.$message.error("获取数据失败，请稍后重试");
        });
    },
  }
};
</script>

<style lang="scss" scoped>
.filter-card {
  background-color: #fff;
}

// /* // 列表卡片样式 */
.list-card {
  border-radius: 24px;
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
  color: #999;
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

.el-tag {
  padding: 0;
  background-color: #ecf5ff00;
  border-color: #d9ecff00;
}

.refund-status-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 88px;
  font-size: 12px;
  font-weight: 500;
  color: var(--refund-status-color);
  line-height: 1;
}

.refund-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--refund-status-color);
  flex-shrink: 0;
}

.refund-status-text {
  white-space: nowrap;
  text-align: center;
  color: inherit;
}
</style>
