<template>
  <div class="order-detail-page">
    <!-- 头部返回 -->
    <div class="page-header" @click="goBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">详情</div>
    </div>

    <!-- 订单流水详情 -->
    <el-card shadow="never" class="section-card">
      <div slot="header">订单流水详情</div>
      <el-table :data="orderDetail" size="small" class="detail-table" stripe row-key="id" :border="false"
        :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }"
        :header-row-style="{ backgroundColor: '#F6F6FB' }">
        <el-table-column prop="orderId" label="订单号" width="200" />
        <el-table-column prop="orderStatus" label="订单状态" width="120">
          <template slot-scope="scope">
            {{ formatOrderStatus(scope.row.orderStatus) }}
          </template>
        </el-table-column>
        <el-table-column prop="bossNickName" label="用户名称" width="120" />
        <el-table-column prop="bossId" label="用户ID" width="120" />
        <el-table-column prop="waiterNickName" label="陪陪名称" width="120" />
        <el-table-column prop="waiterId" label="陪陪ID" width="120" />
        <el-table-column prop="payment" label="支付方式" width="120">
          <template slot-scope="scope">{{ formatPayMethod(scope.row.payment) }}</template>
        </el-table-column>
        <el-table-column prop="originalPrice" label="下单单价" width="100">
          <template slot-scope="scope">{{ scope.row.originalPrice }}</template>
        </el-table-column>
        <el-table-column prop="num" label="下单数量" width="100" />
        <el-table-column prop="price" label="下单总金额" width="120">
          <template slot-scope="scope">{{ scope.row.price }}</template>
        </el-table-column>
        <el-table-column prop="sourceChannel" label="渠道" width="80" />
        <el-table-column prop="createTime" label="支付时间" width="160" />
        <el-table-column prop="endTime" label="完成时间" width="160" />
        <el-table-column label="操作" width="80" fixed="right">
          <template slot-scope="scope">
            <el-button v-if="canCreateRefund(scope.row)" type="primary" size="mini" @click="openRefundDialog(scope.row)"
              class="mini-primary" style="background: #6b35ff00;border-color: #6b35ff00;color: #6a35ff;">退款</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <!-- 订单退款记录 -->
    <el-card shadow="never" class="section-card">
      <div slot="header">订单退款记录</div>
      <div v-if="refundWarningRows.length" class="refund-warning">
        <i class="el-icon-warning-outline"></i>
        该订单存在退款金额与退款份数不匹配的申请，请以服务端计算金额为准；该记录仅允许拒绝。
      </div>
      <el-table :data="refundList" size="small" class="detail-table" stripe row-key="id" :border="false"
        v-loading="refundRecordDataLoading" :header-row-style="{ backgroundColor: '#F6F6FB' }"
        :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }">
        <el-table-column prop="tkNo" label="退款流水号" width="200" />
        <el-table-column prop="status" label="退款状态" width="120">
          <template slot-scope="scope">
            <el-tag :type="statusType(scope.row.status)">
              {{ statusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="refundType" label="退款类型" width="110">
          <template slot-scope="scope">
            {{ formatRefundType(scope.row.refundType) }}
          </template>
        </el-table-column>
        <el-table-column prop="bossNickName" label="用户名称" width="120" />
        <el-table-column prop="bossId" label="用户ID" width="120" />
        <el-table-column prop="waiterNickName" label="陪陪名称" width="120" />
        <el-table-column prop="waiterId" label="陪陪ID" width="120" />
        <el-table-column prop="payment" label="支付方式" width="120">
          <template slot-scope="scope">{{ formatPayMethod(scope.row.payment) }}</template>
        </el-table-column>
        <el-table-column prop="originalPrice" label="单价" width="100">
          <template slot-scope="scope">{{ scope.row.originalPrice }}元</template>
        </el-table-column>
        <el-table-column prop="num" label="退款数量" width="100" />
        <el-table-column prop="price" label="退款总金额" width="120">
          <template slot-scope="scope">{{ scope.row.price }}元</template>
        </el-table-column>
        <el-table-column prop="sourceChannel" label="退款渠道" width="100" />
        <el-table-column prop="createTime" label="申请时间" width="160" />
        <el-table-column prop="endTime" label="完成时间" width="160" />
        <el-table-column label="操作" width="100" fixed="right">
          <template slot-scope="scope">
            <template v-if="scope.row.status === 0">
              <el-button v-if="!isAmountNumMismatch(scope.row)" type="success" size="mini"
                :loading="isRowProcessing(scope.row.id)" :disabled="isRowProcessing(scope.row.id)"
                @click="handleAgree(scope.row, 0)">同意</el-button>
              <el-button type="danger" size="mini" :loading="isRowProcessing(scope.row.id)"
                :disabled="isRowProcessing(scope.row.id)" @click="handleAgree(scope.row, 1)">拒绝</el-button>
            </template>
            <el-button v-else-if="scope.row.status === 2&&scope.row.payment != 2" type="warning" size="mini"
              :loading="isRowProcessing(scope.row.id)" :disabled="isRowProcessing(scope.row.id)"
              @click="handleRetry(scope.row)">重新提交</el-button>
          </template>
        </el-table-column>
      </el-table>
      <PaginationSimple :current-page="currentPage" :page-size="pageSize" :total="total"
        @current-change="handlePageChange">
      </PaginationSimple>
    </el-card>

    <!-- 未来币退款弹窗 -->
    <el-dialog title="未来币退款" :visible.sync="coinDialogVisible" width="500px" class="dialog-center"
      @close="resetRefundForm">
      <el-form :model="coinForm" ref="coinForm">
        <el-form-item label="退款数量">
          <el-input v-model="coinForm.num" placeholder="请输入退款数量" maxlength="9" @input="handleNumInput"
            @blur="handleNumBlur" />
          <span class="input-hint">可退数量上限：{{ coinForm.numAx }}</span>
        </el-form-item>
        <el-form-item label="退款单价">
          <span class="text-span">{{ formatMoney(coinForm.originalPrice) }} <span> 未来币</span></span>
        </el-form-item>
        <el-form-item label="退款金额">
          <span class="text-span">由服务端按订单优惠券及退款规则计算<span> 未来币</span></span>
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
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
// 导入API接口
import {
  ordersDetail, // 订单详情
  refundList, // 退款记录
  initiateRefund, // 发起退款
  refundStatus, // 退款状态
  retryRefund, // 失败退款原记录重试
} from "@/api/orderRefundRecords";

export default {
  name: 'EditCompanion',
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
      orderDetail: [],
      refundList: [],
      coinDialogVisible: false,
      coinForm: { numAx: 0, num: '', originalPrice: '', remark: '' },
      refundOrder: null,
      processingRefundIds: {},
      sharedData: {}
    };
  },
  computed: {
    // 后端没有返回专门的异常标记时，用订单总份数、优惠券金额和本次退款金额识别原型中的冲突场景。
    refundWarningRows() {
      return this.refundList.filter(row => this.isAmountNumMismatch(row));
    },
    hasPendingRefund() {
      return this.refundList.some(row => Number(row.status) === 0);
    },
    hasFailedRefund() {
      return this.refundList.some(row => Number(row.status) === 2);
    },
  },
  created() {
    this.loadPageData()
  },
  activated() {
    this.loadPageData()
  },
  methods: {
    loadPageData() {
      // keep-alive 下二次进入不会再次触发 created，这里统一在 created/activated 中刷新数据
      this.sharedData = this.getSharedData()
      if (this.sharedData.orderId) {
        this.currentPage = 1
        this.rderTransactionDetails(this.sharedData.orderId)
        this.refundRecord(this.sharedData.orderId)
      }
    },
    handlePageChange(val) {
      this.currentPage = val;
      this.refundRecord(this.sharedData.orderId)
    },
    goBack() {
      this.switchToList()
    },
    formatPayMethod(m) {
      const map = {
        1: '未来币', 2: '淘宝'
      };
      return map[m] || m;
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
    formatOrderStatus(s) {
      const map = {
        0: '待接单', // 待接单
        1: '进行中', // 进行中
        2: '退款中', // 进行中
        3: '已完成',
        4: '已取消',
        5: '交易关闭',
        7: '部分退款成功',
        8: '拒绝退款',
        12: '未接单',
      };
      return map[s] || s;
    },
    formatRefundStatus(s) {
      const map = { 0: '处理中', 1: '退款成功', 2: '退款失败' };
      return map[s] || s;
    },
    refundStatusTagType(s) {
      if (s === 1) return 'success';
      if (s === 2) return 'danger';
      if (s === 0) return 'warning';
      return '';
    },
    // 退款列表退款状态
    statusType(status) {
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
    canCreateRefund(order) {
      // 接口文档规定后台只能发起未来币退款，淘宝退款由淘宝 C 端发起。
      if (!order || String(order.payment) !== '1') return false;
      if (this.hasPendingRefund || this.hasFailedRefund) return false;

      const orderStatus = Number(order.orderStatus);
      const orderRefundStatus = order.orderRefundStatus == null
        ? null
        : Number(order.orderRefundStatus);
      if (orderRefundStatus === null) {
        return [1, 3, 7].includes(orderStatus);
      }
      return (orderStatus === 1 && [0, 3].includes(orderRefundStatus)) ||
        (orderStatus === 3 && [0, 2, 3].includes(orderRefundStatus)) ||
        (orderStatus === 7 && [0, 2, 3].includes(orderRefundStatus));
    },
    openRefundDialog(order) {
      if (!order || String(order.payment) !== '1') {
        this.$message.warning('淘宝退款由淘宝用户发起，后台仅支持审核');
        return;
      }
      if (this.hasPendingRefund) {
        this.$message.warning('该订单已有待审核退款记录，请先完成审核');
        return;
      }
      if (this.hasFailedRefund) {
        this.$message.warning('该订单已有失败退款记录，请在原记录上重新提交');
        return;
      }

      const maxNum = this.getAvailableRefundNum(order);
      if (maxNum <= 0) {
        this.$message.warning('该订单没有可退份数');
        return;
      }
      this.refundOrder = order;
      this.coinForm.numAx = maxNum;
      this.coinForm.num = String(maxNum);
      this.coinForm.originalPrice = order.actualUnitPrice || order.originalPrice || '';
      this.coinForm.remark = '';
      this.coinDialogVisible = true;
    },
    getAvailableRefundNum(order) {
      const explicitFields = ['availableNum', 'refundableNum', 'remainingNum', 'canRefundNum'];
      const explicitValue = explicitFields
        .map(field => order && order[field])
        .find(value => value !== null && value !== undefined && value !== '');
      if (explicitValue !== undefined) return Math.max(0, Number(explicitValue) || 0);
      // 详情接口未提供可退份数时，仅作为输入上限提示；最终以服务端校验为准。
      return Math.max(0, Number(order && order.num) || 0);
    },
    resetRefundForm() {
      this.coinForm = { numAx: 0, num: '', originalPrice: '', remark: '' };
      this.refundOrder = null;
    },
    handleNumInput(value) {
      this.coinForm.num = String(value == null ? '' : value).replace(/\D/g, '');
    },
    handleNumBlur() {
      const value = Number(this.coinForm.num);
      if (!this.coinForm.num || !Number.isInteger(value) || value < 1) {
        this.coinForm.num = '';
        return;
      }
      if (value > Number(this.coinForm.numAx)) {
        this.coinForm.num = String(this.coinForm.numAx);
        this.$message.warning(`退款数量不能超过可退份数 ${this.coinForm.numAx}`);
      }
    },
    isApiSuccess(res) {
      return Boolean(res && res.success === true);
    },
    getApiErrorMessage(res, fallback) {
      return (res && res.errorMessage) || fallback;
    },
    async submitCoinRefund() {
      const remark = String(this.coinForm.remark || '').trim();
      const num = Number(this.coinForm.num);
      const maxNum = Number(this.coinForm.numAx);
      if (!remark) {
        this.$message.warning('退款原因不能为空！')
        return
      }
      if (!Number.isInteger(num) || num <= 0) {
        this.$message.warning('退款数量必须是大于 0 的整数！');
        return;
      }
      if (num > maxNum) {
        this.$message.warning(`退款数量不能超过可退份数 ${maxNum}！`);
        return;
      }
      try {
        const res = await initiateRefund({
          orderId: String(this.sharedData.orderId),
          remark,
          num,
        });
        if (!this.isApiSuccess(res)) {
          throw new Error(this.getApiErrorMessage(res, '发起退款失败'));
        }
        await Promise.all([
          this.rderTransactionDetails(this.sharedData.orderId),
          this.refundRecord(this.sharedData.orderId),
        ]);
        this.$message.success('退款申请已提交，等待审核');
        this.coinDialogVisible = false;
      } catch (error) {
        this.$message.error(error.message || '发起退款失败，请稍后重试');
      }
    },
    isRowProcessing(id) {
      return Boolean(this.processingRefundIds[String(id)]);
    },
    setRowProcessing(id, value) {
      this.$set(this.processingRefundIds, String(id), value);
    },
    async handleAgree(row, type) {
      if (!row || Number(row.status) !== 0) return;
      if (type === 0 && this.isAmountNumMismatch(row)) {
        this.$message.warning('该记录退款金额与份数不匹配，只允许拒绝');
        return;
      }

      const actionText = type === 0 ? '同意' : '拒绝';
      try {
        await this.$confirm(
          `确定${actionText}退款申请吗？\n订单号：${row.orderId || '-'}\n退款份数：${row.num || 0}\n退款金额：${this.formatMoney(row.price)}`,
          '退款审核确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
      } catch (error) {
        return;
      }

      this.setRowProcessing(row.id, true);
      try {
        const res = await refundStatus({ id: String(row.id), type });
        if (!this.isApiSuccess(res)) {
          throw new Error(this.getApiErrorMessage(res, '退款审核失败'));
        }
        await Promise.all([
          this.rderTransactionDetails(this.sharedData.orderId),
          this.refundRecord(this.sharedData.orderId),
        ]);
        this.$message.success(type === 0 ? '退款审核已提交' : '退款已拒绝');
      } catch (error) {
        this.$message.error(error.message || '退款审核失败，请稍后重试');
      } finally {
        this.setRowProcessing(row.id, false);
      }
    },
    async handleRetry(row) {
      if (!row || Number(row.status) !== 2) return;
      try {
        await this.$confirm('重新提交后，该记录将恢复为待审核状态，是否继续？', '重新提交退款', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });
      } catch (error) {
        return;
      }

      this.setRowProcessing(row.id, true);
      try {
        const res = await retryRefund({ id: String(row.id) });
        if (!this.isApiSuccess(res)) {
          throw new Error(this.getApiErrorMessage(res, '重新提交失败'));
        }
        await this.refundRecord(this.sharedData.orderId);
        this.$message.success('已重新提交，等待审核');
      } catch (error) {
        this.$message.error(error.message || '重新提交失败，请稍后重试');
      } finally {
        this.setRowProcessing(row.id, false);
      }
    },
    isCouponOrder(row) {
      const order = row || this.refundOrder || this.orderDetail[0] || {};
      const couponAmount = order.couponAmount;
      return couponAmount !== null && couponAmount !== undefined && couponAmount !== '' && Number(couponAmount) !== 0;
    },
    moneyToCents(value) {
      const text = String(value == null ? '' : value).trim();
      if (!/^\d+(\.\d+)?$/.test(text)) return null;
      const parts = text.split('.');
      return Number(parts[0]) * 100 + Number((parts[1] || '').concat('00').slice(0, 2));
    },
    isAmountNumMismatch(row) {
      if (!row || Number(row.status) !== 0 || String(row.payment) !== '0' || !this.isCouponOrder(row)) return false;
      const order = this.orderDetail[0] || {};
      const totalNum = Number(order.num);
      const refundNum = Number(row.num);
      const orderPrice = this.moneyToCents(row.orderPrice != null ? row.orderPrice : order.orderPrice || order.price);
      const couponAmount = this.moneyToCents(row.couponAmount);
      const refundPrice = this.moneyToCents(row.price);
      if (!Number.isInteger(totalNum) || !Number.isInteger(refundNum) || refundNum >= totalNum) return false;
      if (orderPrice === null || couponAmount === null || refundPrice === null) return false;
      return refundPrice === orderPrice - couponAmount;
    },
    async rderTransactionDetails(tradeId) {
      try {
        this.orderFlowDataLoading = true
        const res = await ordersDetail(tradeId)
        console.log('加载订单流水详情', res.data)
        if (res.data) {
          this.orderDetail = [res.data]
        } else {
          this.orderDetail = []
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
        if (res && res.success && res.data && res.data.rows) {
          this.refundList = res.data.rows
          this.total = res.data.total || 0; // 设置总记录数
        } else {
          this.refundList = []
          this.total = 0; // 设置总记录数
        }
      } catch (error) {
        this.$message.error('加载退款记录详情失败')
      } finally {
        this.refundRecordDataLoading = false
      }
    },
  }
};
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

.refund-warning {
  margin: 12px 0;
  padding: 10px 14px;
  color: #9a6700;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 4px;
  font-size: 12px;
}

.refund-warning i {
  margin-right: 6px;
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
