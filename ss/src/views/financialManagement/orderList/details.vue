<template>
  <div class="order-detail-page">
    <!-- 头部返回 -->
    <div class="page-header" @click="goBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">详情</div>
    </div>
    <!-- 订单流水表格 -->
    <el-card shadow="never" class="section-card">
      <div slot="header">订单流水</div>

      <el-table :data="orderFlowData" size="small" class="detail-table" stripe row-key="id"
        v-loading="orderFlowDataLoading" :border="false" :header-row-style="{ backgroundColor: '#F6F6FB' }">
        <el-table-column prop="orderId" label="订单号" width="180"></el-table-column>
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
        <el-table-column prop="bossId" label="用户ID" width="120"></el-table-column>
        <el-table-column prop="waiterNickName" label="陪陪名称" width="100"></el-table-column>
        <el-table-column prop="waiterId" label="陪陪ID" width="120"></el-table-column>
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
        <el-table-column prop="num" label="下单数量" width="100" align="center"></el-table-column>
        <el-table-column prop="price" label="下单总金额" width="120" align="left"></el-table-column>
        <el-table-column prop="createTime" label="支付时间" width="160"></el-table-column>
        <el-table-column prop="endTime" label="完成时间" width="160">
          <template slot-scope="scope">
            {{ scope.row.endTime || '-' }}
          </template>
        </el-table-column>
        <!--        <el-table-column label="操作" width="80" fixed="right" v-if="!checkPermission(['laborunion'])">-->
        <!--          <template slot-scope="scope">-->
        <!--            <el-button v-if="scope.row.orderStatus ===1 && scope.row.orderRefundStatus === 0 || scope.row.orderStatus ===1 && scope.row.orderRefundStatus === 3" type="primary" size="mini"-->
        <!--                       @click="handleRefund(scope.row)" class="mini-primary"-->
        <!--                       style="background: #6b35ff00;border-color: #6b35ff00;color: #6a35ff;">退款</el-button>-->
        <!--          </template>-->
        <!--        </el-table-column>-->
      </el-table>
    </el-card>

    <!-- 退款记录表格 -->
    <el-card shadow="never" class="section-card">
      <div slot="header">退款记录</div>

      <el-table :data="refundRecordData" size="small" class="detail-table" stripe row-key="id"
        v-loading="refundRecordDataLoading" :border="false" :header-row-style="{ backgroundColor: '#F6F6FB' }">
        <el-table-column prop="id" label="退款流水号" width="200"></el-table-column>
        <el-table-column prop="status" label="退款状态" width="120">
          <template slot-scope="scope">
            <el-tag :type="statusType(scope.row.status)">
              {{ statusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bossNickName" label="用户名称" width="120"></el-table-column>
        <el-table-column prop="bossId" label="用户ID" width="120"></el-table-column>
        <el-table-column prop="waiterNickName" label="陪陪名称" width="100"></el-table-column>
        <el-table-column prop="waiterId" label="陪陪ID" width="120"></el-table-column>
        <el-table-column prop="payment" label="支付方式" width="100">
          <template slot-scope="scope">
            {{ formatPayMethod(scope.row.payment) }}
          </template>
        </el-table-column>
        <el-table-column prop="originalPrice" label="单价" width="80" align="left">
          <template slot-scope="scope">
            {{ scope.row.originalPrice }}
          </template>
        </el-table-column>
        <el-table-column prop="num" label="退款数量" width="100" align="center"></el-table-column>
        <el-table-column prop="price" label="退款总金额" width="120" align="left"></el-table-column>
        <el-table-column prop="sourceChannel" label="退款渠道" width="100" align="left"></el-table-column>
        <el-table-column prop="createTime" label="申请时间" width="160"></el-table-column>
        <el-table-column prop="endTime" label="完成时间" width="160">
          <template slot-scope="scope">
            {{ scope.row.endTime ? scope.row.endTime : '--' }}
          </template>
        </el-table-column>
        <!--        <el-table-column label="操作" width="100" fixed="right" v-if="!checkPermission(['laborunion'])">-->
        <!--          <template slot-scope="scope">-->
        <!--            <el-button v-if="scope.row.status === 0" type="success" size="mini"-->
        <!--                       @click="handleApprove(scope.row, 0)">-->
        <!--              同意-->
        <!--            </el-button>-->
        <!--            <el-button v-if="scope.row.status === 0" type="danger" size="mini"-->
        <!--                       @click="handleApprove(scope.row, 1)">-->
        <!--              拒绝-->
        <!--            </el-button>-->
        <!--          </template>-->
        <!--        </el-table-column>-->
      </el-table>
      <PaginationSimple :current-page="currentPage" :page-size="pageSize" :total="total"
        @current-change="handlePageChange">
      </PaginationSimple>
    </el-card>


    <!-- 现金退款弹窗 -->
    <el-dialog title="现金退款" :visible.sync="cashDialogVisible" width="500px" class="dialog-center">
      <el-form :model="coinForm" ref="coinForm">
        <el-form-item label="退款数量">
          <el-input v-model="coinForm.num" disabled placeholder="退款数量" />
        </el-form-item>
        <el-form-item label="退款单价">
          <span class="text-span">{{ coinForm.originalPrice }}<span> 元</span></span>
        </el-form-item>
        <el-form-item label="退款总金额">
          <span class="text-span">{{ (coinForm.num * coinForm.originalPrice).toFixed(2) }} <span> 元</span></span>
        </el-form-item>
        <el-form-item label="退款原因" prop="remark" :rules="[{ required: true, max: 100, message: '必填，最多100字符' }]">
          <el-input type="textarea" v-model="coinForm.remark" show-word-limit :maxlength="100" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="cashDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCoinRefund">确定</el-button>
      </div>
    </el-dialog>

    <!-- 未来币退款弹窗 -->
    <el-dialog title="未来币退款" :visible.sync="coinDialogVisible" width="500px" class="dialog-center">
      <el-form :model="coinForm" ref="coinForm">
        <el-form-item label="退款数量">
          <el-input v-model="coinForm.num" disabled placeholder="退款数量" />
        </el-form-item>
        <el-form-item label="退款单价">
          <span class="text-span">{{ coinForm.originalPrice }} <span> 未来币</span></span>
        </el-form-item>
        <el-form-item label="退款总金额">
          <span class="text-span">{{ (coinForm.num * coinForm.originalPrice).toFixed(2) }}<span> 未来币</span> </span>
        </el-form-item>
        <el-form-item label="退款原因" prop="remark" :rules="[{ required: true, max: 100, message: '必填，最多100字符' }]">
          <el-input type="textarea" v-model="coinForm.remark" show-word-limit :maxlength="100" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="coinDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCoinRefund">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
// 导入权限判断工具函数：checkPermission，配合v-if使用
import checkPermission from '@/utils/permission'
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
// 导入API接口
import {
  ordersDetail, // 订单详情
  refundList, // 退款记录
  initiateRefund, // 发起退款
  refundStatus, // 退款状态
} from "@/api/orderFlow";

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
  name: 'OrderManagement',
  components: {
    PaginationSimple,
  },
  inject: ['switchToList', 'getSharedData'], // 注入父组件方法
  data() {
    return {
      total: 0, // 总条数
      currentPage: 1, // 当前页码
      pageSize: 10, // 每页显示条数
      orderFlowDataLoading: false,
      refundRecordDataLoading: false,
      // 订单流水数据（6条，修正后的准确数据）
      orderFlowData: [],

      // 退款记录数据（6条，修正后的准确数据）
      refundRecordData: [],
      cashDialogVisible: false,
      coinDialogVisible: false,
      cashForm: { num: 0, originalPrice: 23, remark: '' },
      coinForm: { numAx: 0, num: 0, originalPrice: 23, remark: '' },
      sharedData: {}
    }
  },

  computed: {
    // 现金退款记录（用于详情页）
    cashRefundRecords() {
      return this.refundRecordData.filter(item =>
        item.refundNo === this.selectedOrder?.orderNo &&
        item.paymentMethod !== '未来币'
      ).map(item => ({
        ...item,
        status: item.refundStatus,
        refundReason: item.refundAmount ? '用户输入的原因' : '请输入'
      }))
    }
  },
  created() {
    // 从父组件获取共享数据，判断是否为编辑模式
    this.sharedData = this.getSharedData()
    if (this.sharedData.orderId) {
      // 编辑模式加载该公会已有的手机号列表
      this.rderTransactionDetails(this.sharedData.orderId)
      this.refundRecord(this.sharedData.orderId)
    }
  },
  methods: {
    handlePageChange(val) {
      this.currentPage = val;
      this.refundRecord(this.sharedData.orderId)
    },
    // 将权限判断函数挂载到组件方法，方便模板中v-if直接调用
    checkPermission,
    goBack() {
      this.switchToList()
    },
    // 获取支付方式类型
    getPaymentMethodType(method) {
      const types = {
        1: 'primary',
        2: 'success',
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
      return ORDER_STATUS_MAP[status]?.color || '#999999'
    },
    getOrderStatusStyle(status) {
      return {
        '--status-color': this.getOrderStatusType(status)
      }
    },
    // 获取订单状态文本
    getOrderStatusText(status) {
      return ORDER_STATUS_MAP[status]?.label || status
    },
    // 获取退款状态类型
    getRefundStatusType(status) {
      if (!status) return ''
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
    },
    // 退款列表退款状态
    statusType(status) {
      if (!status) return ''
      const types = {
        0: 'primary',
        1: 'success',
        2: 'danger',
      }
      return types[status] || ''
    },
    // 获取退款状态文本
    statusText(status) {
      const texts = {
        0: '处理中', // 正常订单
        1: '退款成功', // 申请退款中
        2: '退款失败',
      }
      return texts[status] || ''
    },
    // 判断是否显示退款按钮
    shouldShowRefundButton(order) {
      // 退款成功状态不显示
      if (order.orderRefundStatus === 2) {
        return false
      }

      // 已取消不展示
      if (order.orderStatus === 4) {
        return false
      }

      // 退款处理中/部分退款：展示；全额退款：不展示
      if (order.orderRefundStatus === 1 && order.orderRefundStatus === '全额退款') {
        return false
      }

      // 已完成：完成时间≤3天展示；>3天不展示
      if (order.orderStatus === 3) {
        const now = new Date();
        const pay = new Date(order.endTime);
        const diffDays = (now - pay) / (1000 * 3600 * 24);
        return diffDays <= 3;
      }
      // 进行中和待接单都展示
      return [0, 1].includes(order.orderStatus);
    },

    // 处理退款
    handleRefund(order) {
      this.coinForm.numAx = order.num;
      this.coinForm.num = order.num;
      this.coinForm.originalPrice = order.originalPrice;
      this.coinForm.remark = '';
      if (order.payment === "1") {
        this.coinDialogVisible = true;
      } else {
        this.cashDialogVisible = true;
      }
      // 实际项目中这里会根据支付方式跳转到不同弹窗
      console.log('退款操作:', order, order.payment)
    },
    // submitCashRefund() {
    //   this.$refs.cashForm.validate(valid => {
    //     if (!valid) return;
    //     // 调用接口
    //     console.log('现金退款提交', this.cashForm);
    //     this.cashDialogVisible = false;
    //   });
    // },
    //  退款
    submitCoinRefund() {
      if (!this.coinForm.remark) {
        this.$message.warning('退款原因不能为空！')
        return
      }
      if (this.coinForm.numAx < this.coinForm.num) {
        this.coinForm.num = this.coinForm.numAx;
      }
      let infos = {
        ...this.coinForm,
        orderId: this.sharedData.orderId,
      }
      initiateRefund(infos).then(() => {
        this.rderTransactionDetails(this.sharedData.orderId)
        this.refundRecord(this.sharedData.orderId)
        this.$message.success("操作成功");
        this.coinDialogVisible = false;
        this.cashDialogVisible = false;
      })
      // this.$refs.coinForm.validate(valid => {
      //   if (!valid) return;
      //   // 调用接口
      //   console.log('未来币退款提交', this.coinForm);
      //   this.coinDialogVisible = false;
      // });
    },
    // 处理同意退款
    handleApprove(refundRecord, type) {
      this.$confirm(`确定要${type === 0 ? '同意' : '拒绝'}这条退款申请吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        let infos = {
          id: refundRecord.id,
          type: type
        }
        refundStatus(infos).then(() => {
          this.refundRecord(this.sharedData.orderId)
          if (type === 0) {
            this.$message.success("操作成功");
          } else {
            this.$message.success('退款已拒绝')
          }
          this.rderTransactionDetails(this.sharedData.orderId)
          this.refundRecord(this.sharedData.orderId)
        })
        // refundRecord.refundStatus = '退款成功'
        // refundRecord.completeTime = new Date().toLocaleString('zh-CN').replace(/\//g, '-')
        // this.$message.success('退款已同意并处理成功')
      })
    },

    // 处理拒绝退款
    // handleReject(refundRecord) {
    //   this.$confirm('确定要拒绝这条退款申请吗？', '提示', {
    //     confirmButtonText: '确定',
    //     cancelButtonText: '取消',
    //     type: 'warning'
    //   }).then(() => {
    //     refundRecord.refundStatus = '退款失败'
    //     refundRecord.completeTime = new Date().toLocaleString('zh-CN').replace(/\//g, '-')
    //     this.$message.success('退款已拒绝')
    //   })
    // },
    // 加载订单流水详情
    async rderTransactionDetails(tradeId) {
      try {
        this.orderFlowDataLoading = true
        const res = await ordersDetail(tradeId)
        console.log('加载订单流水详情', res.data)
        if (res.data) {
          this.orderFlowData = [res.data]
        } else {
          this.orderFlowData = []
        }
      } catch (error) {
        this.$message.error('加载订单流水详情失败')
      } finally {
        this.orderFlowDataLoading = false
      }
    },
    async refundRecord(tradeId) {
      try {
        this.refundRecordDataLoading = true
        const params = {
          orderId: tradeId,
          pageNum: this.currentPage,
          pageSize: this.pageSize
        };
        const res = await refundList(params)
        console.log('加载退款记录', res)
        if (res.data && res.data.rows) {
          this.refundRecordData = res.data.rows
          this.total = res.data.total || 0; // 设置总记录数
        } else {
          this.refundRecordData = []
          this.total = 0; // 设置总记录数
        }
      } catch (error) {
        this.$message.error('加载退款记录详情失败')
      } finally {
        this.refundRecordDataLoading = false
      }
    },

  }
}
</script>

<style scoped lang="scss">
.order-detail-page {
  padding: 32px 32px 0 32px;
  background: #ffffff;
  border-radius: 24px
}

.section-card {
  padding-bottom: 20px;
  background: #fff;
  border: 0px solid #EBEEF5;

}

::v-deep .el-card__header {
  border-bottom: 0px solid #EBEEF5;
  padding: 0px;
  color: #000;
  font-size: 14px;
}

::v-deep .el-card__body {
  border: 1px solid #EBEEF5;
  border-radius: 6px;
  margin: 20px 0 8px 0;
  padding: 0;
}

.detail-table {
  width: 100%;
}

.el-button--success {
  background-color: #1bc28500;
  border-color: #1bc28500;
  color: #1BC286;
}

.el-button--danger {
  background-color: #ff4d5000;
  border-color: #ff4d5000;
  color: #FF4D4F;
}

.el-button--warning {
  background-color: #ff830700;
  border-color: #ff830700;
  color: #FF8107;
}

.el-button--info {
  background-color: #4c79ff00;
  border-color: #4c79ff00;
  color: #999;
}

.el-button--mini,
.el-button--mini.is-round {
  padding: 0;
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

.el-tag.el-tag--info {
  background-color: #fdf6ec00;
  border-color: #faecd800;
  color: #999;
}

.el-tag.el-tag--danger {
  background-color: #fff1f100;
  border-color: #ffe1e100;
  color: #FF4D4F;
}

.el-tag {
  background-color: #ecf5ff00;
  border-color: #d9ecff00;
  height: 32px;
  padding: 0 10px;
  line-height: 30px;
  font-size: 12px;
  color: #58b1ec;
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  box-sizing: border-box;
  white-space: nowrap;
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

// ::v-deep .el-dialog__footer {
//   text-align: center !important;
// }

.text-span {
  width: 100%;
  height: 100%;
  border: #e8e8e8 solid 1px;
  border-radius: 6px;
  display: block;
  padding: 0 15px;
  background: #F5F7FA;
  display: inline-block;

  span {
    float: right
  }
}

.el-form-item {
  margin-bottom: 10px;
}

::v-deep .el-dialog__body {
  padding: 10px 20px 0 20px !important;
}

.mini-primary:hover {
  background: #6b35ff00 !important;
  border-color: #6b35ff00 !important;
  color: #642cff !important;
}

.mini-primary:focus {
  background: #6b35ff00 !important;
  border-color: #6b35ff00 !important;
  color: #642cff !important;
}

::v-deep.el-dialog__footer {
  padding: 10px 20px 20px;
  // text-align: center;
  box-sizing: border-box;
}

.dialog-center {
  ::v-deep.el-button {
    width: 102px;
    height: 34px;
    padding: 0;
  }
}

.pagination-container {
  margin-right: 15px;
}
</style>
