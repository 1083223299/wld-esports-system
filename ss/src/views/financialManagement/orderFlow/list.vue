<template>
  <div class="order-management">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="queryForm" :gutter="20" @search="handleSearch"
        @reset="handleReset"></SearchForm>
    </div>
    <!-- 数据列表展示 -->
    <el-card class="list-card" shadow="never">
      <el-table :data="tableData" stripe style="width: 100%" v-loading="loading" :cell-style="{ textAlign: 'center' }"
        :header-cell-style="{ textAlign: 'center' }" :height="`calc(100vh - ${moduleHeight}px - 214px)`">
        <el-table-column prop="orderId" label="订单编号" width="260">
          <template slot-scope="scope">
            <span class="business-type-tag"
              :class="scope.row.orderBusinessType == '1' ? 'business-type-tag-tech' : 'business-type-tag-fun'">
              {{ scope.row.orderBusinessType == '1' ? '技术单' : '娱乐单' }}
            </span>
            <span>{{ scope.row.orderId || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="tid" label="淘宝订单号" width="180"></el-table-column>
        <el-table-column prop="bossNickName" label="用户名称" width="120"></el-table-column>
        <el-table-column prop="bossId" label="用户ID" width="100"></el-table-column>
        <el-table-column prop="merchantName" label="商户名称" width="120">
          <template slot-scope="scope">
            {{ scope.row.merchantName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="clubName" label="俱乐部名称" width="120">
          <template slot-scope="scope">
            {{ scope.row.clubName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="waiterNickName" label="陪陪名称" width="100"></el-table-column>
        <el-table-column prop="waiterId" label="陪陪ID" width="100"></el-table-column>
        <el-table-column prop="payment" label="支付方式" width="100">
          <template slot-scope="scope">
            {{ formatPayMethod(scope.row.payment) }}
          </template>
        </el-table-column>

        <el-table-column prop="companionAttribute" label="陪玩属性" width="100">
          <template slot-scope="scope">
            {{ scope.row.companionAttribute == 0 ? '个人陪' : '俱乐部陪' }}
          </template>
        </el-table-column>
        <el-table-column prop="gameName" label="游戏名称" width="100"></el-table-column>
        <el-table-column prop="purchaseProduct" label="购买商品" width="100"></el-table-column>
        <el-table-column prop="actualUnitPrice" label="实付单价" width="100" align="left">
          <template slot-scope="scope">
            ¥{{ scope.row.actualUnitPrice }}
          </template>
        </el-table-column>

        <el-table-column prop="num" label="数量" width="80" align="center"></el-table-column>
        <el-table-column prop="price" label="金额" width="120" align="left">
          <template slot-scope="scope">
            <div style="display: flex;flex-direction: column;">
              <span>总金额:{{ scope.row.totalOriginalPrice }}</span>
              <span>优惠金额:{{ scope.row.totalPreferentialPrice }}</span>
              <span>实付金额:{{ scope.row.totalActualPayPrice }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="sourceChannel" label="渠道" width="100">
          <template slot-scope="scope">
            <span class="channel-tag">{{ getSourceChannelText(scope.row.sourceChannel) }}</span>
          </template>
        </el-table-column>

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
        <el-table-column prop="voucher" label="完成凭证" width="100">
          <template slot-scope="scope">
            <el-button v-if="scope.row.voucher" type="text" size="mini" style="color: #9047F8;" class="mini-buttom"
              @click="handlePreviewRefundImg(scope.row.voucher)">查看</el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template slot-scope="scope">
            <el-button v-permission="'system:orderFlow:chatRecord'" size="mini" @click="openChatDialog(scope.row)"
              style="color: #6a35ff;" class="mini-buttom">聊天记录</el-button>
            <el-button v-if="canShowDetail(scope.row)" v-permission="'system:orderFlow:detail'" size="mini"
              @click="handleDetail(scope.row)"
              style="color: #9047F8;" class="mini-buttom">详情</el-button>
            <el-button v-permission="'system:orderFlow:log'" size="mini" @click="handleLog(scope.row)"
              style="color: #ff8107;" class="mini-buttom2">日志</el-button>
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

    <el-drawer title="" :visible.sync="chatDialogVisible" direction="rtl" size="620px" append-to-body
      custom-class="order-chat-drawer" :with-header="false" :wrapper-closable="true"
      @opened="scrollChatToBottom" @closed="resetChatState">
      <div class="chat-dialog">
        <div class="chat-dialog__header">
          <button type="button" class="chat-dialog__close" aria-label="关闭聊天记录" @click="closeChatDialog">
            <i class="el-icon-close"></i>
          </button>
          <div>
            <div class="chat-dialog__eyebrow">ORDER CONVERSATION</div>
            <div class="chat-dialog__title">聊天记录</div>
            <div class="chat-dialog__order">{{ chatOrderId || '-' }}</div>
          </div>
          <div class="chat-dialog__people">
            <span class="chat-person chat-person--boss">
              <i>{{ chatAvatarText(chatCurrentOrder && (chatCurrentOrder.bossNickName || chatCurrentOrder.bossName), '用') }}</i>
              {{ (chatCurrentOrder && (chatCurrentOrder.bossNickName || chatCurrentOrder.bossName)) || '用户' }}
            </span>
            <span class="chat-dialog__arrow">↔</span>
            <span class="chat-person chat-person--waiter">
              <i>{{ chatAvatarText(chatCurrentOrder && (chatCurrentOrder.waiterNickName || chatCurrentOrder.waiterName), '陪') }}</i>
              {{ (chatCurrentOrder && (chatCurrentOrder.waiterNickName || chatCurrentOrder.waiterName)) || '陪陪' }}
            </span>
          </div>
        </div>

        <div class="chat-dialog__toolbar">
          <span class="chat-dialog__toolbar-label">类型</span>
          <div class="chat-dialog__filters">
            <button v-for="item in chatMessageTypeOptions" :key="item.value" type="button"
              class="chat-dialog__filter" :class="{ 'is-active': chatMessageTypeFilter === item.value }"
              @click="handleChatMessageTypeChange(item.value)">
              {{ item.label }}
            </button>
          </div>
          <span class="chat-dialog__total">共 {{ chatTotal }} 条</span>
        </div>

        <div ref="chatScroll" class="chat-dialog__messages" @scroll="handleChatScroll">
          <div v-if="chatLoadingMore" class="chat-dialog__loading-more">
            <i class="el-icon-loading"></i> 正在加载更早的聊天记录
          </div>
          <div v-if="chatLoading && !chatRecords.length" class="chat-dialog__state">
            <i class="el-icon-loading"></i>
            <span>正在加载聊天记录</span>
          </div>
          <div v-else-if="!chatRecords.length" class="chat-dialog__state chat-dialog__state--empty">
            <i class="el-icon-chat-dot-round"></i>
            <span>暂无聊天记录</span>
          </div>
          <template v-else>
            <div v-if="!chatHasMore" class="chat-dialog__history-end">已经是最早的消息了</div>
            <div v-for="(record, index) in chatRecords" :key="chatRecordKey(record, index)"
              class="chat-message" :class="isWaiterMessage(record) ? 'chat-message--waiter' : 'chat-message--boss'">
              <div class="chat-message__meta">
                <span>{{ chatSenderName(record) }}</span>
                <span>{{ record.createTime || '-' }}</span>
              </div>
              <div class="chat-message__row">
                <div class="chat-message__avatar">{{ chatAvatarText(chatSenderName(record), isWaiterMessage(record) ? '陪' : '用') }}</div>
                <div class="chat-message__body">
                  <div class="chat-message__role">{{ chatSenderRole(record) }} · {{ chatMessageTypeText(record) }}</div>
                  <el-image v-if="chatMessageType(record) === 'image'" class="chat-message__image"
                    :src="chatImageUrl(record)" fit="contain" :preview-src-list="[chatImageUrl(record)]">
                    <div slot="error" class="chat-message__image-error">图片加载失败</div>
                  </el-image>
                  <div v-else-if="chatMessageType(record) === 'card'" class="chat-message__card">
                    {{ formatChatCard(record.content) }}
                  </div>
                  <div v-else class="chat-message__bubble">{{ record.content || '暂无内容' }}</div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </el-drawer>

    <ImgZoom v-model="refundImgPreviewVisible" :img-list="[refundImgPreviewUrl]" />

  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue"; // 搜索表单组件
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
import ImgZoom from "@/components/ImgZoom/index.vue";
import checkPermission from "@/utils/checkPermission";
// 导入API接口
import {
  ordersList, // 订单列表
  chatRecordList, // 聊天记录
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

const SOURCE_CHANNEL_OPTIONS = [
  { label: "全部", value: "ALL" },
  { label: "app-安卓", value: "app_android" },
  { label: "app-ios", value: "app_ios" },
  { label: "商户淘宝", value: "merchant_tb_xcx" },
  { label: "未来洞淘宝", value: "tb_xcx" },
];

const SOURCE_CHANNEL_MAP = {
  app_android: { label: "app-安卓", value: "app_android" },
  app_ios: { label: "app-ios", value: "app_ios" },
  merchant_tb_xcx: { label: "商户淘宝", value: "merchant_tb_xcx" },
  tb_xcx: { label: "未来洞淘宝", value: "tb_xcx" },
};

export default {
  name: 'ListCompanion',
  components: {
    SearchForm,
    PaginationSimple,
    ImgZoom,
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
      chatDialogVisible: false, // 聊天记录弹窗
      chatLoading: false, // 首次加载状态
      chatLoadingMore: false, // 加载更早记录状态
      chatRecords: [], // 按时间正序展示的聊天记录
      chatCurrentOrder: null, // 当前查看的订单
      chatOrderId: '',
      chatPageNum: 0,
      chatPageSize: 20,
      chatTotal: 0,
      chatHasMore: true,
      chatRequestSerial: 0,
      chatMessageTypeFilter: 'all',
      chatMessageTypeOptions: [
        { label: '全部', value: 'all' },
        { label: '文本', value: 'text' },
        { label: '图片', value: 'image' },
      ],
      // 筛选表单
      queryForm: {
        orderId: '',
        tId: '',
        bossId: '',
        merchantName: '',
        clubName: '',
        payment: '',
        sourceChannel: '',
        orderStatus: '',
        companionId: '',
        orderBusinessType: null,
        companionAttribute: null,
        // orderRefundStatus: '',
        startTime: '',
        endTime: '',
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
          inputType: "number",
          label: "用户ID",
          placeholder: "请输入用户ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "merchantName",
          label: "商户名称",
          placeholder: "请输入商户名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "clubName",
          label: "俱乐部名称",
          placeholder: "请输入俱乐部名称",
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
          prop: "sourceChannel",
          label: "渠道",
          placeholder: "全部",
          options: SOURCE_CHANNEL_OPTIONS,
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
          type: "input",
          prop: "companionId",
          inputType: "number",
          label: "陪陪ID",
          placeholder: "请输入陪陪ID",
          clearable: true,
        },
        {
          type: "select",
          prop: "orderBusinessType",
          label: "订单类型",
          placeholder: "全部",
          options: [
            { label: "全部", value: null },
            { label: "娱乐陪", value: 0 },
            { label: "技术陪", value: 1 },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "companionAttribute",
          label: "陪玩属性",
          placeholder: "全部",
          options: [
            { label: "全部", value: null },
            { label: "个人陪", value: 0 },
            { label: "俱乐部陪", value: 1 },
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
      refundImgPreviewVisible: false,
      refundImgPreviewUrl: "",
    }
  },

  mounted() {
    this.applyRouteQuery();
    this.fetchTableData();
    this.updateModuleHeight();
    // 监听窗口大小变化
    window.addEventListener('resize', this.updateModuleHeight);
  },

  activated() {
    // keep-alive 再次进入时，若带了 orderId 也要重新塞入搜索
    if (this.applyRouteQuery()) {
      this.pagination.pageNum = 1;
      this.fetchTableData();
    }
  },

  watch: {
    "$route.query.orderId"(val) {
      if (!val) return;
      if (this.applyRouteQuery()) {
        this.pagination.pageNum = 1;
        this.fetchTableData();
      }
    },
  },

  beforeDestroy() {
    // 移除监听器
    window.removeEventListener('resize', this.updateModuleHeight);
  },
  methods: {
    checkPermission,
    /** 保证金流水等页面跳转：?orderId=xxx → 填入搜索并查询 */
    applyRouteQuery() {
      const orderId = this.$route && this.$route.query && this.$route.query.orderId;
      if (orderId === undefined || orderId === null || orderId === "") {
        return false;
      }
      const value = String(orderId);
      if (this.queryForm.orderId === value) {
        return false;
      }
      this.queryForm = {
        ...this.queryForm,
        orderId: value,
      };
      this.$nextTick(() => {
        if (this.$refs.searchForm && this.$refs.searchForm.setFormData) {
          this.$refs.searchForm.setFormData({ orderId: value });
        }
      });
      return true;
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
          console.error("获公会流水列表失败:", error);
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false; // 关闭加载状态
          this.$message.error("获取数据失败，请稍后重试");
        });
    },

    // 搜索
    handleSearch(e) {
      if (e) {
        const formValues = { ...e };
        // 处理日期范围
        if (formValues.paymentTimeRange && formValues.paymentTimeRange.length === 2) {
          formValues.startTime = formValues.paymentTimeRange[0];
          formValues.endTime = formValues.paymentTimeRange[1];
        } else {
          formValues.startTime = '';
          formValues.endTime = '';
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
        merchantName: '',
        clubName: '',
        payment: '',
        sourceChannel: '',
        orderStatus: '',
        companionId: '',
        orderBusinessType: null,
        companionAttribute: null,
        // orderRefundStatus: '',
        startTime: '',
        endTime: '',
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

    // 打开聊天记录时先取第 1 页，后续在消息区顶部按页加载更早的记录。
    openChatDialog(row) {
      const orderId = row && (row.ordersId || row.orderId)
      if (!orderId) {
        this.$message.warning('当前订单缺少订单号，无法查看聊天记录')
        return
      }

      this.chatRequestSerial += 1
      this.chatCurrentOrder = row
      this.chatOrderId = String(orderId)
      this.chatRecords = []
      this.chatPageNum = 0
      this.chatTotal = 0
      this.chatHasMore = true
      this.chatMessageTypeFilter = 'all'
      this.chatDialogVisible = true
      this.loadChatRecords(true)
    },

    async loadChatRecords(reset = false) {
      if (!this.chatOrderId || this.chatLoadingMore || (reset && this.chatLoading)) return

      const pageNum = reset ? 1 : this.chatPageNum + 1
      const requestSerial = this.chatRequestSerial
      const scrollElement = this.$refs.chatScroll
      const previousScrollHeight = scrollElement ? scrollElement.scrollHeight : 0
      const previousScrollTop = scrollElement ? scrollElement.scrollTop : 0

      if (reset) {
        this.chatLoading = true
      } else {
        this.chatLoadingMore = true
      }

      try {
        const res = await chatRecordList({
          orderId: this.chatOrderId,
          messageType: this.chatMessageTypeFilter,
          pageNum,
          pageSize: this.chatPageSize,
        })

        if (requestSerial !== this.chatRequestSerial) return

        const data = (res && res.data) || {}
        const records = Array.isArray(data.records) ? data.records : []
        this.chatTotal = Number(data.total) || 0
        this.chatPageNum = pageNum
        this.chatRecords = this.sortChatRecords(reset ? records : this.chatRecords.concat(records))
        this.chatHasMore = this.chatTotal > 0
          ? this.chatRecords.length < this.chatTotal
          : records.length >= this.chatPageSize

        this.$nextTick(() => {
          const currentScrollElement = this.$refs.chatScroll
          if (!currentScrollElement) return
          if (reset) {
            this.scrollChatToBottom()
            return
          }
          currentScrollElement.scrollTop = currentScrollElement.scrollHeight - previousScrollHeight + previousScrollTop
        })
      } catch (error) {
        if (requestSerial === this.chatRequestSerial) {
          this.$message.error('加载聊天记录失败，请稍后重试')
        }
      } finally {
        if (requestSerial === this.chatRequestSerial) {
          this.chatLoading = false
          this.chatLoadingMore = false
        }
      }
    },

    handleChatScroll(event) {
      if (event.target.scrollTop <= 24 && this.chatHasMore && !this.chatLoadingMore && !this.chatLoading) {
        this.loadChatRecords()
      }
    },

    handleChatMessageTypeChange(messageType) {
      if (messageType === this.chatMessageTypeFilter) return

      this.chatRequestSerial += 1
      this.chatMessageTypeFilter = messageType
      this.chatRecords = []
      this.chatPageNum = 0
      this.chatTotal = 0
      this.chatHasMore = true
      this.chatLoading = false
      this.chatLoadingMore = false
      this.loadChatRecords(true)
    },

    closeChatDialog() {
      this.chatDialogVisible = false
    },

    scrollChatToBottom() {
      const scrollElement = this.$refs.chatScroll
      if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight
    },

    resetChatState() {
      this.chatRequestSerial += 1
      this.chatDialogVisible = false
      this.chatCurrentOrder = null
      this.chatOrderId = ''
      this.chatRecords = []
      this.chatPageNum = 0
      this.chatTotal = 0
      this.chatHasMore = true
      this.chatMessageTypeFilter = 'all'
      this.chatLoading = false
      this.chatLoadingMore = false
    },

    sortChatRecords(records) {
      const uniqueRecords = records.filter((record, index, list) => {
        const key = this.chatRecordKey(record, 0)
        return list.findIndex(item => this.chatRecordKey(item, 0) === key) === index
      })
      return uniqueRecords.slice().sort((first, second) => {
        const firstTime = new Date(first.createTime || '').getTime()
        const secondTime = new Date(second.createTime || '').getTime()
        if (!Number.isNaN(firstTime) && !Number.isNaN(secondTime) && firstTime !== secondTime) {
          return firstTime - secondTime
        }
        return Number(first.recordId || 0) - Number(second.recordId || 0)
      })
    },

    chatRecordKey(record, index) {
      return `${record && record.recordId != null ? record.recordId : 'record'}-${record && record.createTime || index}`
    },

    chatMessageType(record) {
      const messageType = String(record && record.messageType || '').toLowerCase()
      if (['text', 'image', 'card'].includes(messageType)) return messageType
      const contentType = Number(record && record.contentType)
      return contentType === 1 ? 'image' : contentType === 2 ? 'card' : 'text'
    },

    chatMessageTypeText(record) {
      const texts = { text: '文本', image: '图片', card: '卡片' }
      return texts[this.chatMessageType(record)] || '消息'
    },

    isWaiterMessage(record) {
      const fromIsWaiter = record && record.fromIsWaiter
      if (typeof fromIsWaiter === 'boolean') return fromIsWaiter
      if (typeof fromIsWaiter === 'number') return fromIsWaiter === 1
      if (typeof fromIsWaiter === 'string') {
        const value = fromIsWaiter.trim().toLowerCase()
        if (['true', '1', 'yes'].includes(value)) return true
        if (['false', '0', 'no', ''].includes(value)) return false
      }

      const fromUserId = record && record.fromUserId
      const waiterId = this.chatCurrentOrder && this.chatCurrentOrder.waiterId
      return fromUserId != null && waiterId != null && String(fromUserId) === String(waiterId)
    },

    chatSenderName(record) {
      return this.isWaiterMessage(record)
        ? (this.chatCurrentOrder && (this.chatCurrentOrder.waiterNickName || this.chatCurrentOrder.waiterName)) || '陪陪'
        : (this.chatCurrentOrder && (this.chatCurrentOrder.bossNickName || this.chatCurrentOrder.bossName)) || '用户'
    },

    chatSenderRole(record) {
      return this.isWaiterMessage(record) ? '陪陪' : '用户'
    },

    chatAvatarText(name, fallback) {
      const text = String(name || fallback || '')
      return text.slice(0, 1) || fallback
    },

    chatImageUrl(record) {
      const content = record && record.content
      if (!content) return ''
      try {
        const parsed = JSON.parse(content)
        if (typeof parsed === 'string') return parsed
        return parsed.url || parsed.imageUrl || parsed.src || content
      } catch (error) {
        return content
      }
    },

    formatChatCard(content) {
      if (!content) return '卡片消息'
      try {
        const parsed = JSON.parse(content)
        return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
      } catch (error) {
        return content
      }
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
    handlePreviewRefundImg(url) {
      if (!url) return;
      this.refundImgPreviewUrl = url;
      this.refundImgPreviewVisible = true;
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

    // 渠道：将历史值（如 android/ios）统一映射为需求中的新业务语义值
    normalizeSourceChannel(channel) {
      const value = String(channel || '').trim()
      if (value === 'android') return 'app_android'
      if (value === 'ios') return 'app_ios'
      return value
    },

    getSourceChannelText(channel) {
      const key = this.normalizeSourceChannel(channel)
      return (SOURCE_CHANNEL_MAP[key] && SOURCE_CHANNEL_MAP[key].label) || key || '-'
    },

    // 商户淘宝渠道订单仅保留「日志」，隐藏「详情」按钮
    canShowDetail(row) {
      return this.normalizeSourceChannel(row && row.sourceChannel) !== 'merchant_tb_xcx'
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

.channel-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  color: #666;
  background-color: #f5f5f5;
  border-radius: 4px;
  line-height: 18px;
}

.el-tag {
  padding: 0;
}

.business-type-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 22px;
  padding: 0 8px;
  margin-right: 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  vertical-align: middle;
  box-sizing: border-box;
}

.business-type-tag-tech {
  color: #fff;
  background: linear-gradient(135deg, #ff8a00 0%, #ff5f2e 100%);
  box-shadow: 0 4px 10px rgba(255, 138, 0, 0.25);
}

.business-type-tag-fun {
  color: #fff;
  background: linear-gradient(135deg, #7b61ff 0%, #4d23d9 100%);
  box-shadow: 0 4px 10px rgba(77, 35, 217, 0.25);
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

::v-deep .order-chat-drawer {
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 100vh !important;
  overflow: hidden;
  border-radius: 18px 0 0 18px;
  background: #f6f7fb;
  box-shadow: 0 20px 60px rgba(38, 42, 75, 0.18);
}

::v-deep .order-chat-drawer .el-drawer__body {
  display: flex;
  height: 100%;
  padding: 0 !important;
}

.chat-dialog {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #25243a;
}

.chat-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 116px;
  padding: 24px 28px 20px;
  position: relative;
  background: linear-gradient(135deg, #6a35ff 0%, #8b6cff 58%, #b8a7ff 100%);
  color: #fff;
}

.chat-dialog__close {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 1;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  font-size: 18px;
  line-height: 30px;
  transition: background-color 0.2s ease;
}

.chat-dialog__close:hover,
.chat-dialog__close:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.28);
}

.chat-dialog__eyebrow {
  margin-bottom: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  opacity: 0.7;
}

.chat-dialog__title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
}

.chat-dialog__order {
  max-width: 290px;
  margin-top: 5px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-dialog__people {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
}

.chat-person {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chat-person i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.2);
  font-style: normal;
  font-weight: 700;
}

.chat-dialog__arrow {
  color: rgba(255, 255, 255, 0.55);
  font-size: 18px;
}

.chat-dialog__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 10px 28px;
  border-bottom: 1px solid #ebe9f1;
  background: #fff;
}

.chat-dialog__toolbar-label {
  flex: 0 0 auto;
  color: #8f8a9c;
  font-size: 12px;
}

.chat-dialog__filters {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid #ded9ea;
  border-radius: 7px;
}

.chat-dialog__filter {
  min-width: 48px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-right: 1px solid #ded9ea;
  background: #fff;
  color: #625e70;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.chat-dialog__filter:last-child {
  border-right: 0;
}

.chat-dialog__filter:hover,
.chat-dialog__filter:focus {
  outline: none;
  background: #f4f1ff;
  color: #6840e7;
}

.chat-dialog__filter.is-active {
  background: #6840e7;
  color: #fff;
}

.chat-dialog__total {
  margin-left: auto;
  color: #8f8a9c;
  font-size: 12px;
  white-space: nowrap;
}

.chat-dialog__messages {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  padding: 16px 28px 28px;
  background:
    radial-gradient(circle at 100% 0, rgba(139, 108, 255, 0.08), transparent 28%),
    #f6f7fb;
  scroll-behavior: auto;
}

.chat-dialog__messages::-webkit-scrollbar {
  width: 6px;
}

.chat-dialog__messages::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background: #d4d0e3;
}

.chat-dialog__loading-more,
.chat-dialog__history-end {
  padding: 6px 0 12px;
  color: #9b98aa;
  font-size: 12px;
  text-align: center;
}

.chat-dialog__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #a09daf;
  font-size: 13px;
}

.chat-dialog__state i {
  color: #8b6cff;
  font-size: 34px;
}

.chat-dialog__state--empty i {
  color: #c1bdd0;
}

.chat-message {
  margin: 0 0 20px;
}

.chat-message__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 44px 7px;
  color: #a19eaf;
  font-size: 11px;
}

.chat-message--waiter .chat-message__meta {
  justify-content: flex-end;
}

.chat-message__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.chat-message--waiter .chat-message__row {
  flex-direction: row-reverse;
}

.chat-message__avatar {
  display: flex;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: #e5e2ed;
  color: #6e687f;
  font-size: 13px;
  font-weight: 700;
}

.chat-message--waiter .chat-message__avatar {
  background: #7652ff;
  color: #fff;
}

.chat-message__body {
  max-width: 72%;
}

.chat-message__role {
  margin: 1px 0 5px;
  color: #aaa6b7;
  font-size: 11px;
}

.chat-message--waiter .chat-message__role {
  text-align: right;
}

.chat-message__bubble,
.chat-message__card {
  padding: 11px 14px;
  border: 1px solid #ebe9f1;
  border-radius: 4px 14px 14px 14px;
  background: #fff;
  box-shadow: 0 5px 16px rgba(50, 45, 79, 0.04);
  color: #363246;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-message--waiter .chat-message__bubble,
.chat-message--waiter .chat-message__card {
  border-color: #7652ff;
  border-radius: 14px 4px 14px 14px;
  background: #7652ff;
  color: #fff;
}

.chat-message__card {
  min-width: 160px;
  border-left: 3px solid #8b6cff;
  background: #fbfaff;
}

.chat-message--waiter .chat-message__card {
  border-right: 3px solid rgba(255, 255, 255, 0.55);
  border-left: 0;
  background: #7652ff;
}

.chat-message__image {
  display: block;
  width: 180px;
  min-height: 80px;
  max-height: 220px;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
}

.chat-message__image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: #aaa6b7;
  font-size: 12px;
}

@media (max-width: 720px) {
  ::v-deep .order-chat-drawer {
    width: calc(100% - 24px) !important;
  }

  .chat-dialog__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .chat-dialog__people {
    width: 100%;
    justify-content: space-between;
  }

  .chat-dialog__toolbar {
    gap: 8px;
    padding: 10px 18px;
  }

  .chat-dialog__filter {
    min-width: 42px;
    padding: 0 7px;
  }

  .chat-dialog__messages {
    height: 58vh;
    padding: 16px 18px 24px;
  }

  .chat-message__body {
    max-width: 78%;
  }
}
</style>
