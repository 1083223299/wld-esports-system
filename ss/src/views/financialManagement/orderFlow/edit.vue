<template>
  <div class="order-detail-page">
    <div class="detail-hero" v-loading="orderFlowDataLoading">
      <div class="detail-hero__nav" @click="goBack">
        <i class="el-icon-arrow-left"></i>
        <span>返回订单流水</span>
      </div>
      <div class="detail-hero__main">
        <div class="detail-hero__identity">
          <div class="detail-hero__eyebrow">
            <span>订单详情</span>
            <span v-if="currentOrder.orderId" class="business-type-tag"
              :class="currentOrder.orderBusinessType == '1' ? 'business-type-tag-tech' : 'business-type-tag-fun'">
              {{ currentOrder.orderBusinessType == '1' ? '技术单' : '娱乐单' }}
            </span>
          </div>
          <div class="detail-hero__title-row">
            <h1>{{ currentOrder.orderId || '加载中...' }}</h1>
          </div>
          <div class="detail-hero__status-row">
            <span class="order-status-inline" :style="getOrderStatusStyle(currentOrder.orderStatus)">
              <span class="order-status-dot"></span>
              <span class="order-status-text">{{ getOrderStatusText(currentOrder.orderStatus) || '-' }}</span>
            </span>
            <span class="status-divider"></span>
            <span class="refund-status-label">退款状态</span>
            <el-tag :type="getRefundStatusType(currentOrder.orderRefundStatus)" size="mini">
              {{ getRefundStatusText(currentOrder.orderRefundStatus) || '-' }}
            </el-tag>
          </div>
        </div>
        <div v-if="!checkPermission(['laborunion'])" class="detail-hero__actions">
          <button
            v-if="(currentOrder.orderStatus === 1 && (currentOrder.orderRefundStatus === 0 || currentOrder.orderRefundStatus === 3)) ||
              (currentOrder.orderStatus === 3 && (currentOrder.orderRefundStatus === 0 || currentOrder.orderRefundStatus === 2 || currentOrder.orderRefundStatus === 3)) ||
              (currentOrder.orderStatus === 7 && (currentOrder.orderRefundStatus === 0 || currentOrder.orderRefundStatus === 2 || currentOrder.orderRefundStatus === 3))"
            type="button" class="hero-action hero-action--refund" v-permission="'system:orderFlow:Refund'"
            @click="handleRefund(currentOrder)">
            <i class="el-icon-refresh-left"></i>
            <span>退款</span>
          </button>
          <button v-if="showFutureCoinDeductionButton" type="button" class="hero-action hero-action--coin"
            v-permission="'system:orderFlow:deduct'" @click="handleFutureCoinDeduction(currentOrder)">
            <i class="el-icon-coin"></i>
            <span>未来币扣减</span>
          </button>
          <button v-if="showDepositDeductionButton" type="button" class="hero-action hero-action--deposit"
            v-permission="'system:orderFlow:deduct'" @click="handleDepositDeduction(currentOrder)">
            <i class="el-icon-wallet"></i>
            <span>保证金扣减</span>
          </button>
        </div>
      </div>
    </div>

    <el-card shadow="never" class="section-card overview-card">
      <div slot="header" class="card-header">
        <div>
          <div class="card-header__title">订单概览</div>
          <div class="card-header__desc">订单、用户与履约信息</div>
        </div>
        <el-button v-if="currentOrder.voucher" type="text" class="link-action"
          @click="handlePreviewRefundImg(currentOrder.voucher)">
          <i class="el-icon-picture-outline"></i>
          查看完成凭证
        </el-button>
      </div>
      <div class="overview-grid">
        <div class="overview-group">
          <div class="overview-group__title"><i class="el-icon-user"></i>交易双方</div>
          <div class="overview-pair">
            <div class="overview-item overview-item--role overview-item--buyer">
              <div class="overview-role-profile">
                <span class="overview-role-avatar">
                  <img v-if="currentOrder.bossAvatar" :src="currentOrder.bossAvatar" alt="" />
                  <i v-else class="el-icon-user"></i>
                </span>
                <div class="overview-role-profile__content">
                  <span class="overview-label">下单用户</span>
                  <span class="overview-value">{{ currentOrder.bossNickName || '-' }}</span>
                </div>
              </div>
              <span class="overview-id">
                <span class="overview-id__label">ID</span>
                <strong>{{ currentOrder.bossId || '-' }}</strong>
              </span>
            </div>
            <div class="overview-role-arrow">
              <span>下单服务</span>
              <div class="overview-role-arrow__line">
                <i class="el-icon-right"></i>
              </div>
            </div>
            <div class="overview-item overview-item--role overview-item--waiter">
              <div class="overview-role-profile">
                <span class="overview-role-avatar">
                  <img v-if="currentOrder.waiterAvatar" :src="currentOrder.waiterAvatar" alt="" />
                  <i v-else class="el-icon-user"></i>
                </span>
                <div class="overview-role-profile__content">
                  <span class="overview-label">服务陪陪</span>
                  <span class="overview-value">{{ currentOrder.waiterNickName || '-' }}</span>
                </div>
              </div>
              <span class="overview-id">
                <span class="overview-id__label">ID</span>
                <strong>{{ currentOrder.waiterId || '-' }}</strong>
              </span>
            </div>
          </div>
        </div>
        <div class="overview-group overview-group--product">
          <div class="overview-group__title"><i class="el-icon-goods"></i>商品信息</div>
          <div class="product-panels">
            <div class="product-panel">
              <span class="product-panel__icon product-panel__icon--game">
                <i class="el-icon-trophy"></i>
              </span>
              <div class="product-panel__content">
                <span class="product-panel__label">游戏</span>
                <strong class="product-panel__value">{{ currentOrder.gameName || '-' }}</strong>
              </div>
            </div>
            <div class="product-panel product-panel--primary">
              <span class="product-panel__icon product-panel__icon--product">
                <img v-if="currentOrder.goodLogo" :src="currentOrder.goodLogo" alt="" />
                <i v-else class="el-icon-shopping-bag-1"></i>
              </span>
              <div class="product-panel__content">
                <span class="product-panel__label">购买商品</span>
                <strong class="product-panel__value">{{ currentOrder.purchaseProduct || currentOrder.goodName || '-'
                  }}</strong>
                <span v-if="currentOrder.priceTypeName" class="product-panel__sub">{{ currentOrder.priceTypeName
                  }}</span>
              </div>
            </div>
            <div class="product-panel">
              <span class="product-panel__icon product-panel__icon--attribute">
                <i class="el-icon-user"></i>
              </span>
              <div class="product-panel__content">
                <span class="product-panel__label">陪玩属性</span>
                <strong class="product-panel__value">
                  {{ currentOrder.companionAttribute == 0 ? '个人陪' : '俱乐部陪' }}
                </strong>
              </div>
            </div>
          </div>
        </div>
        <div class="overview-group overview-group--payment">
          <div class="overview-group__title"><i class="el-icon-wallet"></i>支付信息</div>
          <div class="payment-metrics">
            <div class="payment-metric payment-metric--primary">
              <span class="payment-metric__label">实付总金额</span>
              <div class="payment-metric__value">
                <small>¥</small>
                <strong>{{ formatMoney(currentOrder.totalActualPayPrice) }}</strong>
              </div>
              <span class="payment-metric__meta">订单实际支付金额</span>
            </div>
            <div class="payment-metric">
              <span class="payment-metric__label">商品单价</span>
              <div class="payment-metric__value payment-metric__value--secondary">
                <small>¥</small>
                <strong>{{ formatMoney(currentOrder.actualUnitPrice) }}</strong>
              </div>
              <span class="payment-metric__meta">每份商品价格</span>
            </div>
            <div class="payment-metric payment-metric--method">
              <span class="payment-metric__label">支付方式</span>
              <div class="payment-method-value">
                <span class="payment-method-value__icon"><i class="el-icon-circle-check"></i></span>
                <strong>{{ formatPayMethod(currentOrder.payment) || '-' }}</strong>
              </div>
              <span class="payment-metric__meta">订单支付渠道</span>
            </div>
            <div class="payment-metric">
              <span class="payment-metric__label">下单数量</span>
              <div class="payment-metric__value payment-metric__value--secondary">
                <strong>{{ currentOrder.num || 0 }}</strong>
                <small>份</small>
              </div>
              <span class="payment-metric__meta">本次购买数量</span>
            </div>
          </div>
        </div>
        <div class="overview-group overview-group--timeline">
          <div class="overview-group__title"><i class="el-icon-time"></i>履约时间</div>
          <div class="timeline-list">
            <div class="timeline-row">
              <span class="timeline-dot is-start"></span>
              <span class="overview-label">支付时间</span>
              <span class="overview-value">{{ currentOrder.createTime || '-' }}</span>
            </div>
            <div class="timeline-row">
              <span class="timeline-dot is-end"></span>
              <span class="overview-label">完成时间</span>
              <span class="overview-value">{{ currentOrder.endTime || '-' }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="section-card revenue-card">
      <div slot="header" class="card-header card-header--revenue">
        <div>
          <div class="card-header__title">收益分配</div>
          <div class="card-header__desc">按订单份次展示各方收益</div>
        </div>
        <div v-if="showClubIncome" class="club-summary">
          <div class="club-summary__item">
            <span>俱乐部</span>
            <strong>{{ revenueDetail.clubName || '-' }}</strong>
          </div>
          <div class="club-summary__divider"></div>
          <div class="club-summary__item">
            <span>俱乐部ID</span>
            <strong>{{ revenueDetail.clubId || '-' }}</strong>
          </div>
        </div>
      </div>
      <div class="table-wrapper" v-loading="revenueDetailLoading">
        <el-table :data="revenueItems" size="small" class="detail-table" stripe row-key="rowKey" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }">
          <el-table-column prop="label" label="份次" min-width="90"></el-table-column>
          <el-table-column prop="productUnitPrice" label="商品单价" min-width="120">
            <template slot-scope="scope">{{ formatMoney(scope.row.productUnitPrice) }}</template>
          </el-table-column>
          <el-table-column prop="refundStatus" label="是否退款" min-width="120">
            <template slot-scope="scope">
              <span :class="{ 'text-danger': String(scope.row.refundStatus) === '是' }">
                {{ scope.row.refundStatus || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="waiterIncome" label="陪陪收益" min-width="120">
            <template slot-scope="scope">{{ formatMoney(scope.row.waiterIncome) }}</template>
          </el-table-column>
          <el-table-column v-if="showClubIncome" prop="clubIncome" label="俱乐部收益" min-width="120">
            <template slot-scope="scope">{{ formatMoney(scope.row.clubIncome) }}</template>
          </el-table-column>
          <el-table-column prop="platformIncome" label="平台收益" min-width="120">
            <template slot-scope="scope">{{ formatMoney(scope.row.platformIncome) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-card shadow="never" class="section-card records-card">
      <div slot="header" class="card-header">
        <div>
          <div class="card-header__title">关联记录</div>
          <div class="card-header__desc">退款与账户扣减处理记录</div>
        </div>
      </div>
      <el-tabs v-model="activeRecordTab" class="record-tabs">
        <el-tab-pane name="refund">
          <span slot="label">退款记录 <em>{{ total }}</em></span>
          <div v-loading="refundRecordDataLoading">
            <div v-if="refundRecordData.length" class="table-wrapper">
              <el-table :data="refundRecordData" size="small" class="detail-table" stripe row-key="id" :border="false"
                :header-row-style="{ backgroundColor: '#F6F6FB' }">
                <el-table-column prop="tkNo" label="退款流水号" min-width="180" show-overflow-tooltip />
                <el-table-column prop="status" label="退款状态" width="110">
                  <template slot-scope="scope">
                    <el-tag :type="statusType(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="bossNickName" label="用户名称" min-width="110" show-overflow-tooltip />
                <el-table-column prop="bossId" label="用户ID" min-width="110" />
                <el-table-column prop="waiterNickName" label="陪陪名称" min-width="110" show-overflow-tooltip />
                <el-table-column prop="waiterId" label="陪陪ID" min-width="110" />
                <el-table-column prop="payment" label="支付方式" width="100">
                  <template slot-scope="scope">{{ formatPayMethod(scope.row.payment) }}</template>
                </el-table-column>
                <el-table-column prop="actualUnitPrice" label="实付单价" width="100" />
                <el-table-column prop="num" label="退款数量" width="100" />
                <el-table-column prop="price" label="退款总金额" width="120" />
                <el-table-column prop="sourceChannel" label="退款渠道" width="100" />
                <el-table-column prop="createTime" label="申请时间" width="160" />
                <el-table-column prop="endTime" label="完成时间" width="160">
                  <template slot-scope="scope">{{ scope.row.endTime || '--' }}</template>
                </el-table-column>
                <el-table-column v-if="!checkPermission(['laborunion'])" label="操作" width="110" fixed="right">
                  <template slot-scope="scope">
                    <div v-if="scope.row.status === 0" class="table-actions">
                      <el-button type="text" class="action-link is-success" v-permission="'system:orderFlow:audit'"
                        @click="handleApprove(scope.row, 0)">同意</el-button>
                      <el-button type="text" class="action-link is-danger" v-permission="'system:orderFlow:audit'"
                        @click="handleApprove(scope.row, 1)">拒绝</el-button>
                    </div>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-empty v-else description="暂无退款记录" :image-size="88" />
            <PaginationSimple v-if="refundRecordData.length" :current-page="currentPage" :page-size="pageSize"
              :total="total" @current-change="handlePageChange" />
          </div>
        </el-tab-pane>

        <el-tab-pane name="futureCoin">
          <span slot="label">未来币扣减 <em>{{ futureCoinDeductionLogData.length }}</em></span>
          <div v-loading="futureCoinDeductionLogLoading">
            <div v-if="futureCoinDeductionLogData.length" class="table-wrapper">
              <el-table :data="futureCoinDeductionLogData" size="small" class="detail-table" stripe row-key="id"
                :border="false" :header-row-style="{ backgroundColor: '#F6F6FB' }">
                <template v-if="isGuildUser">
                  <el-table-column prop="reason" label="扣除原因" show-overflow-tooltip />
                  <el-table-column prop="amount" label="扣除未来币" />
                  <el-table-column prop="updateTime" label="扣减时间">
                    <template slot-scope="scope">{{ scope.row.updateTime || '--' }}</template>
                  </el-table-column>
                </template>
                <template v-else>
                  <el-table-column prop="status" label="状态" width="110">
                    <template slot-scope="scope">
                      <span class="deduction-status" :style="{ color: getDeductionStatusColor(scope.row.status) }">
                        {{ getDeductionStatusText(scope.row.status) }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="auditRemark" label="驳回原因" min-width="140" show-overflow-tooltip>
                    <template slot-scope="scope">{{ scope.row.auditRemark || '--' }}</template>
                  </el-table-column>
                  <el-table-column prop="reason" label="扣除原因" min-width="140" show-overflow-tooltip />
                  <el-table-column prop="type" label="扣减类型" width="100">
                    <template slot-scope="scope">{{ getDeductionTypeText(scope.row.type) }}</template>
                  </el-table-column>
                  <el-table-column prop="amount" label="扣除未来币" width="120" />
                  <el-table-column prop="ossUrls" label="扣除凭证" width="100">
                    <template slot-scope="scope">
                      <el-button v-if="normalizeDeductionVoucherUrls(scope.row.ossUrls).length" type="text"
                        class="link-action" @click="previewDeductionLogVoucher(scope.row.ossUrls)">查看</el-button>
                      <span v-else>--</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="提交时间" width="160" />
                  <el-table-column prop="updateTime" label="扣减时间" width="160">
                    <template slot-scope="scope">{{ scope.row.updateTime || '--' }}</template>
                  </el-table-column>
                </template>
              </el-table>
            </div>
            <el-empty v-else description="暂无未来币扣减记录" :image-size="88" />
          </div>
        </el-tab-pane>

        <el-tab-pane name="deposit">
          <span slot="label">保证金扣减 <em>{{ depositDeductionLogData.length }}</em></span>
          <div v-loading="depositDeductionLogLoading">
            <div v-if="depositDeductionLogData.length" class="table-wrapper">
              <el-table :data="depositDeductionLogData" size="small" class="detail-table" stripe row-key="id"
                :border="false" :header-row-style="{ backgroundColor: '#F6F6FB' }">
                <template v-if="isClubRoleView">
                  <el-table-column prop="reason" label="扣除原因" min-width="180" show-overflow-tooltip />
                  <el-table-column prop="amount" label="扣除保证金" width="140">
                    <template slot-scope="scope">{{ formatDepositAmount(scope.row.amount) }}</template>
                  </el-table-column>
                  <el-table-column prop="updateTime" label="扣除时间" width="180">
                    <template slot-scope="scope">{{ scope.row.updateTime || scope.row.deductTime || '--' }}</template>
                  </el-table-column>
                </template>
                <template v-else>
                  <el-table-column prop="status" label="状态" width="110">
                    <template slot-scope="scope">
                      <span class="deduction-status" :style="{ color: getDeductionStatusColor(scope.row.status) }">
                        {{ getDeductionStatusText(scope.row.status) }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="auditRemark" label="驳回原因" min-width="140" show-overflow-tooltip>
                    <template slot-scope="scope">
                      {{ Number(scope.row.status) === 2 ? (scope.row.auditRemark || '--') : '--' }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="reason" label="扣除原因" min-width="140" show-overflow-tooltip />
                  <el-table-column prop="amount" label="扣除保证金" width="120">
                    <template slot-scope="scope">{{ formatDepositAmount(scope.row.amount) }}</template>
                  </el-table-column>
                  <el-table-column prop="voucherOssUrls" label="扣除凭证" width="100">
                    <template slot-scope="scope">
                      <el-button v-if="normalizeDepositVoucherUrls(scope.row).length" type="text" class="link-action"
                        @click="previewDepositLogVoucher(scope.row)">查看</el-button>
                      <span v-else>--</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="prizeId" label="补偿奖品ID" min-width="140">
                    <template slot-scope="scope">{{ scope.row.prizeId || '--' }}</template>
                  </el-table-column>
                  <el-table-column prop="prizeInfo" label="补偿奖品信息" min-width="180" show-overflow-tooltip>
                    <template slot-scope="scope">{{ scope.row.prizeInfo || '--' }}</template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="提交时间" width="160" />
                  <el-table-column prop="updateTime" label="扣减时间" width="160">
                    <template slot-scope="scope">
                      {{ Number(scope.row.status) === 1 ? (scope.row.updateTime || scope.row.deductTime || '--') : '--'
                      }}
                    </template>
                  </el-table-column>
                </template>
              </el-table>
            </div>
            <el-empty v-else description="暂无保证金扣减记录" :image-size="88" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 现金退款弹窗 -->
    <el-dialog title="现金退款" :visible.sync="cashDialogVisible" width="500px" class="dialog-center">
      <el-form :model="coinForm" ref="coinForm">
        <div v-if="isCouponRefundOnlyFull" class="field-tip warning-tip">
          优惠券订单不支持部分退款
        </div>
        <el-form-item label="退款数量">
          <el-input v-model="coinForm.num" :disabled="isCouponRefundOnlyFull" placeholder="请输入退款数量" maxlength="9"
            @input="handleRefundNumInput" @blur="validateRefundNum" />
          <div class="field-tip">可退数量上限：{{ coinForm.numAx || 0 }}</div>

        </el-form-item>
        <el-form-item label="退款单价">
          <span class="text-span">{{ coinForm.actualUnitPrice }}<span> 元</span></span>
        </el-form-item>
        <el-form-item label="退款金额">
          <span class="text-span">{{ getRefundAmount() }} <span> 元</span></span>
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
        <div v-if="isCouponRefundOnlyFull" class="field-tip warning-tip">
          优惠券订单不支持部分退款
        </div>
        <el-form-item label="退款数量">
          <el-input v-model="coinForm.num" :disabled="isCouponRefundOnlyFull" placeholder="请输入退款数量" maxlength="9"
            @input="handleRefundNumInput" @blur="validateRefundNum" />
          <div class="field-tip">可退数量上限：{{ coinForm.numAx || 0 }}</div>
        </el-form-item>
        <el-form-item label="退款单价">
          <span class="text-span">{{ coinForm.actualUnitPrice }} <span> 未来币</span></span>
        </el-form-item>
        <el-form-item label="退款金额">
          <span class="text-span">{{ getRefundAmount() }}<span> 未来币</span> </span>
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

    <ImgZoom v-model="refundImgPreviewVisible" :img-list="[refundImgPreviewUrl]" />
    <ImgZoom v-model="deductionLogPreviewVisible" :img-list="deductionLogPreviewList"
      :init-index="deductionLogPreviewIndex" />
    <FutureCoinDeductionDialog :visible.sync="futureCoinDeductionVisible" :user-id="futureCoinDeductionUserId"
      user-id-label="陪陪ID" :order-id="futureCoinDeductionOrderId" @success="handleFutureCoinDeductionSuccess" />
    <OrderDepositDeductDialog :visible.sync="depositDeductionVisible" :order-id="depositDeductionOrderId"
      :account-type="depositDeductionAccountType" :account-id="depositDeductionAccountId"
      :account-name="depositDeductionAccountName" :club-id="depositDeductionClubId"
      @success="handleDepositDeductionSuccess" />
  </div>
</template>

<script>
// 导入权限判断工具函数：checkPermission，配合v-if使用
import checkPermission from '@/utils/permission'
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
import ImgZoom from "@/components/ImgZoom/index.vue";
import FutureCoinDeductionDialog from "@/components/FutureCoinDeductionDialog/index.vue";
import OrderDepositDeductDialog from "@/components/OrderDepositDeductDialog/index.vue";
// 导入API接口
import {
  ordersDetail, // 订单详情
  refundList, // 退款记录
  initiateRefund, // 发起退款
  refundStatus, // 退款状态
  revenueDetail, // 收益明细
  getOrderApprovalFlag
} from "@/api/orderFlow";
import { openListAccountApproval } from "@/api/personalSupport";
import {
  getDepositAccountFlag,
  getDepositAccountApprovalList
} from "@/api/depositAccountApproval";

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
    ImgZoom,
    FutureCoinDeductionDialog,
    OrderDepositDeductDialog
  },
  inject: ['switchToList', 'getSharedData'], // 注入父组件方法
  data() {
    return {
      total: 0, // 总条数
      currentPage: 1, // 当前页码
      pageSize: 10, // 每页显示条数
      orderFlowDataLoading: false,
      refundRecordDataLoading: false,
      revenueDetailLoading: false,
      // 订单流水数据（6条，修正后的准确数据）
      orderFlowData: [],

      // 退款记录数据（6条，修正后的准确数据）
      refundRecordData: [],
      futureCoinDeductionLogLoading: false,
      futureCoinDeductionLogData: [],
      activeRecordTab: "refund",
      revenueDetail: {
        clubId: "",
        clubName: "",
        items: [],
        total: {},
      },
      cashDialogVisible: false,
      coinDialogVisible: false,
      cashForm: { num: 0, originalPrice: 23, remark: '' },
      coinForm: { numAx: 0, num: "", actualUnitPrice: 0, totalPreferentialPrice: "0", remark: '' },
      sharedData: {},
      refundImgPreviewVisible: false,
      refundImgPreviewUrl: "",
      deductionLogPreviewVisible: false,
      deductionLogPreviewList: [],
      deductionLogPreviewIndex: 0,
      showFutureCoinDeductionButton: false,
      futureCoinDeductionVisible: false,
      futureCoinDeductionUserId: "",
      futureCoinDeductionOrderId: "",
      showDepositDeductionButton: false,
      depositDeductionVisible: false,
      depositDeductionOrderId: "",
      depositDeductionAccountType: 0,
      depositDeductionAccountId: "",
      depositDeductionAccountName: "",
      depositDeductionClubId: "",
      depositDeductionLogLoading: false,
      depositDeductionLogData: []
    }
  },

  computed: {
    currentOrder() {
      return Array.isArray(this.orderFlowData) && this.orderFlowData.length
        ? this.orderFlowData[0]
        : {}
    },
    isGuildUser() {
      const roles = this.$store && this.$store.getters ? this.$store.getters.roles : []
      if (!Array.isArray(roles)) {
        return false
      }
      return roles.some(role => {
        if (typeof role === 'string') {
          return role === 'guild'
        }
        return role && role.roleKey === 'guild'
      })
    },
    // 俱乐部端视角：只看已通过的保证金扣减，不展示状态列
    isClubRoleView() {
      return this.checkPermission(['laborunion']) || this.isGuildUser
    },
    showClubIncome() {
      const firstRow = Array.isArray(this.orderFlowData) ? this.orderFlowData[0] : null
      if (!firstRow) return false
      return Number(firstRow.companionAttribute) !== 0
    },
    revenueItems() {
      const items = Array.isArray(this.revenueDetail.items) ? this.revenueDetail.items : []
      const rows = items.map((item, index) => ({
        ...item,
        label: this.getRevenueRowLabel(index),
        rowKey: `item-${index}`,
      }))
      if (this.revenueDetail.total && Object.keys(this.revenueDetail.total).length) {
        rows.push({
          ...this.revenueDetail.total,
          label: '总计',
          rowKey: 'total',
        })
      }
      return rows
    },
    isCouponRefundOnlyFull() {
      return Number(this.coinForm.totalPreferentialPrice || 0) !== 0
    },
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
      this.fetchRevenueDetail(this.sharedData.orderId)
      this.refundRecord(this.sharedData.orderId)
    }
  },
  methods: {
    async fetchOrderApprovalFlag(orderId) {
      if (!orderId) {
        this.showFutureCoinDeductionButton = false
        return
      }
      try {
        const res = await getOrderApprovalFlag(orderId)
        if (res && res.success) {
          this.showFutureCoinDeductionButton = !Boolean(res.data)
          return
        }
        this.showFutureCoinDeductionButton = false
      } catch (error) {
        this.showFutureCoinDeductionButton = false
      }
    },
    async fetchDepositDeductionFlag(orderId) {
      if (!orderId) {
        this.showDepositDeductionButton = false
        return
      }
      try {
        const res = await getDepositAccountFlag({ orderId })
        if (res && res.success) {
          // data=true 可扣减，false 不可扣减（待审/已通过时隐藏；驳回后后端应回 true）
          this.showDepositDeductionButton = res.data === true
          return
        }
        this.showDepositDeductionButton = false
      } catch (error) {
        this.showDepositDeductionButton = false
      }
    },
    formatDepositAmount(value) {
      if (value === null || value === undefined || value === '') return '--'
      return `${value}元`
    },
    normalizeDepositVoucherUrls(row = {}) {
      const candidates = [
        row.voucherOssUrls,
        row.ossUrls,
        row.voucherUrls,
        row.urls
      ]
      let list = []
      for (let i = 0; i < candidates.length; i += 1) {
        const urls = this.normalizeDeductionVoucherUrls(candidates[i])
        if (urls.length) {
          list = urls
          break
        }
      }
      return list.filter((url) => /^https?:\/\//i.test(String(url)))
    },
    previewDepositLogVoucher(row) {
      const urls = this.normalizeDepositVoucherUrls(row).filter(
        (url) => !/\.(mp4|webm|mov|m3u8)(\?|$)/i.test(String(url))
      )
      if (!urls.length) {
        const all = this.normalizeDepositVoucherUrls(row)
        if (all.length) {
          window.open(all[0], '_blank')
        }
        return
      }
      this.previewDeductionLogVoucher(urls)
    },
    async fetchDepositDeductionLog(orderId) {
      if (!orderId) {
        this.depositDeductionLogData = []
        return
      }
      this.depositDeductionLogLoading = true
      try {
        const params = {
          pageNum: 1,
          pageSize: 50,
          orderId
        }
        if (this.isClubRoleView) {
          params.status = 1
        }
        const res = await getDepositAccountApprovalList(params)
        if (res && res.success) {
          const payload = res.data != null ? res.data : res
          let rows = []
          if (Array.isArray(payload && payload.rows)) {
            rows = payload.rows
          } else if (Array.isArray(payload)) {
            rows = payload
          }
          // 按提交时间倒序
          this.depositDeductionLogData = rows.slice().sort((a, b) => {
            const ta = new Date(a.createTime || 0).getTime()
            const tb = new Date(b.createTime || 0).getTime()
            return tb - ta
          })
          return
        }
        this.depositDeductionLogData = []
        this.$message.error((res && res.errorMessage) || '获取保证金扣减记录失败')
      } catch (error) {
        console.error('获取保证金扣减记录失败:', error)
        this.depositDeductionLogData = []
        this.$message.error('获取保证金扣减记录失败')
      } finally {
        this.depositDeductionLogLoading = false
      }
    },
    getDeductionTypeText(type) {
      const typeMap = {
        0: '我的余额',
        1: '可用余额'
      }
      return typeMap[type] || '--'
    },
    getDeductionStatusText(status) {
      const statusMap = {
        0: '待审核',
        1: '通过',
        2: '驳回'
      }
      return statusMap[status] || '--'
    },
    getDeductionStatusColor(status) {
      const colorMap = {
        0: '#E6A23C',
        1: '#67C23A',
        2: '#F56C6C'
      }
      return colorMap[status] || '#909399'
    },
    normalizeDeductionVoucherUrls(urls) {
      if (Array.isArray(urls)) {
        return urls.filter(Boolean)
      }
      if (!urls) {
        return []
      }
      if (typeof urls === 'string') {
        try {
          const parsed = JSON.parse(urls)
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [urls]
        } catch (error) {
          return [urls]
        }
      }
      return []
    },
    previewDeductionLogVoucher(urls, index = 0) {
      const imgList = this.normalizeDeductionVoucherUrls(urls)
      if (!imgList.length) {
        return
      }
      this.deductionLogPreviewList = imgList
      this.deductionLogPreviewIndex = index
      this.deductionLogPreviewVisible = true
    },
    async fetchFutureCoinDeductionLog(orderId) {
      if (!orderId) {
        this.futureCoinDeductionLogData = []
        return
      }
      this.futureCoinDeductionLogLoading = true
      try {
        const params = {
          pageNum: 1,
          pageSize: 20,
          orderId: orderId
        }
        if (this.isGuildUser) {
          params.status = 1
        }
        const res = await openListAccountApproval(params)
        if (res && res.success && res.data) {
          this.futureCoinDeductionLogData = Array.isArray(res.data.rows) ? res.data.rows : []
          return
        }
        this.futureCoinDeductionLogData = []
        this.$message.error((res && res.errorMessage) || '获取未来币扣除记录失败')
      } catch (error) {
        console.error('获取未来币扣除记录失败:', error)
        this.futureCoinDeductionLogData = []
        this.$message.error('获取未来币扣除记录失败')
      } finally {
        this.futureCoinDeductionLogLoading = false
      }
    },
    getRevenueRowLabel(index) {
      const labels = ['第一份', '第二份', '第三份', '第四份', '第五份', '第六份']
      return labels[index] || `第${index + 1}份`
    },
    formatMoney(value) {
      if (value === null || value === undefined || value === "") return "-"
      return value
    },
    handlePageChange(val) {
      this.currentPage = val;
      this.refundRecord(this.sharedData.orderId)
    },
    // 将权限判断函数挂载到组件方法，方便模板中v-if直接调用
    checkPermission,
    goBack() {
      this.switchToList()
    },
    handlePreviewRefundImg(url) {
      if (!url) return
      this.refundImgPreviewUrl = url
      this.refundImgPreviewVisible = true
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
      this.coinForm.numAx = Number(order.num) || 0;
      this.coinForm.num = String(order.num || "");
      this.coinForm.actualUnitPrice = order.actualUnitPrice != null ? order.actualUnitPrice : order.originalPrice;
      this.coinForm.totalPreferentialPrice = order.totalPreferentialPrice != null ? String(order.totalPreferentialPrice) : "0";
      if (this.isCouponRefundOnlyFull) {
        this.coinForm.num = String(this.coinForm.numAx);
      }
      this.coinForm.remark = '';
      if (order.payment === "1") {
        this.coinDialogVisible = true;
      } else {
        this.cashDialogVisible = true;
      }
      // 实际项目中这里会根据支付方式跳转到不同弹窗
      console.log('退款操作:', order, order.payment)
    },
    handleFutureCoinDeduction(order) {
      // 订单场景扣减陪陪账户，传 waiterId（非老板 bossId）
      this.futureCoinDeductionUserId = order.waiterId || ""
      this.futureCoinDeductionOrderId = order.orderId || this.sharedData.orderId || ""
      if (!this.futureCoinDeductionUserId) {
        this.$message.error('缺少陪陪ID')
        return
      }
      this.futureCoinDeductionVisible = true
    },
    handleFutureCoinDeductionSuccess() {
      this.fetchOrderApprovalFlag(this.futureCoinDeductionOrderId)
      this.fetchFutureCoinDeductionLog(this.futureCoinDeductionOrderId)
    },
    handleDepositDeduction(order) {
      const orderId = (order && order.orderId) || this.sharedData.orderId || ""
      const isClub = Number(order && order.companionAttribute) !== 0
      const clubId =
        (order && (order.clubId || order.tradeId)) ||
        this.revenueDetail.clubId ||
        ""
      const clubName =
        (order && (order.clubName || order.tradeName)) ||
        this.revenueDetail.clubName ||
        ""

      this.depositDeductionOrderId = orderId
      this.depositDeductionAccountType = isClub ? 1 : 0
      this.depositDeductionClubId = clubId

      if (isClub) {
        this.depositDeductionAccountId = clubId
        this.depositDeductionAccountName = clubName || (order && order.waiterNickName) || ""
        if (!this.depositDeductionAccountId) {
          this.$message.error('缺少俱乐部ID')
          return
        }
      } else {
        this.depositDeductionAccountId = (order && order.waiterId) || ""
        this.depositDeductionAccountName = (order && order.waiterNickName) || ""
        if (!this.depositDeductionAccountId) {
          this.$message.error('缺少陪陪ID')
          return
        }
      }
      this.depositDeductionVisible = true
    },
    handleDepositDeductionSuccess() {
      this.fetchDepositDeductionFlag(this.depositDeductionOrderId)
      this.fetchDepositDeductionLog(this.depositDeductionOrderId)
    },
    handleRefundNumInput(value) {
      if (this.isCouponRefundOnlyFull) {
        this.coinForm.num = String(this.coinForm.numAx || "");
        return;
      }
      const sanitized = String(value ?? "").replace(/\D/g, "");
      this.coinForm.num = sanitized;
    },
    validateRefundNum() {
      if (this.isCouponRefundOnlyFull) {
        this.coinForm.num = String(this.coinForm.numAx || "");
        return;
      }
      const maxNum = Number(this.coinForm.numAx) || 0;
      if (!this.coinForm.num) {
        return;
      }
      const currentNum = Number(this.coinForm.num);
      if (Number.isNaN(currentNum) || currentNum < 1) {
        this.coinForm.num = "";
        return;
      }
      if (maxNum && currentNum > maxNum) {
        this.coinForm.num = String(maxNum);
        this.$message.warning(`退款数量不能超过原始下单数量 ${maxNum}`);
      }
    },
    getRefundAmount() {
      const quantity = Number(this.coinForm.num) || 0;
      const unitPrice = Number(this.coinForm.actualUnitPrice) || 0;
      return (quantity * unitPrice).toFixed(2);
    },
    async fetchRevenueDetail(orderId) {
      try {
        this.revenueDetailLoading = true
        const res = await revenueDetail({ orderId })
        if (res.success && res.data) {
          this.revenueDetail = {
            clubId: res.data.clubId || "",
            clubName: res.data.clubName || "",
            items: Array.isArray(res.data.items) ? res.data.items : [],
            total: res.data.total || {},
          }
        } else {
          this.revenueDetail = {
            clubId: "",
            clubName: "",
            items: [],
            total: {},
          }
          this.$message.error(res.errorMessage || '加载收益明细失败')
        }
      } catch (error) {
        this.revenueDetail = {
          clubId: "",
          clubName: "",
          items: [],
          total: {},
        }
        this.$message.error('加载收益明细失败')
      } finally {
        this.revenueDetailLoading = false
      }
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
      if (!this.coinForm.num || Number(this.coinForm.num) < 1) {
        this.$message.warning('退款数量必须大于0！')
        return
      }
      if (Number(this.coinForm.num) > Number(this.coinForm.numAx)) {
        this.$message.warning(`退款数量不能超过原始下单数量 ${this.coinForm.numAx}！`)
        this.coinForm.num = String(this.coinForm.numAx);
        return
      }
      let infos = {
        num: Number(this.coinForm.num),
        remark: this.coinForm.remark,
        orderId: this.sharedData.orderId,
      }
      initiateRefund(infos).then(() => {
        this.rderTransactionDetails(this.sharedData.orderId)
        this.fetchRevenueDetail(this.sharedData.orderId)
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
          this.fetchRevenueDetail(this.sharedData.orderId)
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
          this.futureCoinDeductionOrderId = res.data.orderId || this.sharedData.orderId || ""
          this.depositDeductionOrderId = this.futureCoinDeductionOrderId
          this.fetchOrderApprovalFlag(this.futureCoinDeductionOrderId)
          this.fetchFutureCoinDeductionLog(this.futureCoinDeductionOrderId)
          this.fetchDepositDeductionFlag(this.depositDeductionOrderId)
          this.fetchDepositDeductionLog(this.depositDeductionOrderId)
        } else {
          this.orderFlowData = []
          this.showFutureCoinDeductionButton = false
          this.futureCoinDeductionLogData = []
          this.showDepositDeductionButton = false
          this.depositDeductionLogData = []
        }
      } catch (error) {
        this.$message.error('加载订单流水详情失败')
        this.showFutureCoinDeductionButton = false
        this.futureCoinDeductionLogData = []
        this.showDepositDeductionButton = false
        this.depositDeductionLogData = []
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
  min-height: 100%;
  // padding: 24px;
  background: #f5f7fb;
  border-radius: 24px;
  color: #1d2129;
}

.detail-hero {
  position: relative;
  margin-bottom: 16px;
  padding: 14px 20px 18px;
  overflow: hidden;
  border-radius: 16px;
  color: #fff;
  background:
    radial-gradient(circle at 90% 10%, rgba(255, 255, 255, 0.2), transparent 30%),
    linear-gradient(135deg, #6038e6 0%, #8547f1 52%, #a55bf2 100%);
  box-shadow: 0 10px 24px rgba(105, 57, 218, 0.18);

  &::after {
    content: "";
    position: absolute;
    right: -50px;
    bottom: -85px;
    width: 230px;
    height: 230px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 50%;
  }
}

.detail-hero__nav {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #fff;
  }
}

.detail-hero__main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.detail-hero__identity {
  min-width: 0;
}

.detail-hero__eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 4px;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.65);

  .business-type-tag {
    height: 20px;
    min-width: 48px;
    padding: 0 8px;
    line-height: 20px;
    letter-spacing: 0;
    box-shadow: none;
  }
}

.detail-hero__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  h1 {
    margin: 0;
    font-size: 21px;
    line-height: 1.35;
    font-weight: 700;
    letter-spacing: 0.2px;
    word-break: break-all;
  }
}

.detail-hero__status-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 9px;

  .order-status-inline {
    min-width: 0;
    padding: 7px 12px;
    color: var(--status-color) !important;
    background: #fff;
    border: 0;
    border-radius: 999px;
    font-weight: 700;
    box-shadow: 0 5px 12px rgba(43, 18, 102, 0.18);
  }

  .order-status-dot {
    width: 7px;
    height: 7px;
    background: var(--status-color);
  }

  ::v-deep .el-tag {
    height: 29px;
    padding: 0 12px;
    line-height: 29px;
    color: #5630b7;
    background: #fff;
    border: 0;
    border-radius: 999px;
    font-weight: 700;
    box-shadow: 0 5px 12px rgba(43, 18, 102, 0.18);
  }
}

.status-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.28);
}

.refund-status-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.detail-hero__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background: rgba(47, 18, 116, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.hero-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 122px;
  height: 42px;
  margin: 0;
  padding: 0 17px;
  border: 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.2px;
  cursor: pointer;
  appearance: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: none;
  }

  i {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    margin: 0;
    border-radius: 6px;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.2);
  }
}

.hero-action--refund {
  color: #fff;
  background: linear-gradient(135deg, #ff745f 0%, #e94a3e 100%);
  box-shadow: 0 7px 15px rgba(116, 27, 20, 0.3);

  &:hover,
  &:focus {
    color: #fff;
    outline: none;
    background: linear-gradient(135deg, #ff806c 0%, #df4034 100%);
    box-shadow: 0 10px 20px rgba(116, 27, 20, 0.38);
  }
}

.hero-action--coin {
  color: #fff;
  background: linear-gradient(135deg, #4268ee 0%, #4f2bc7 100%);
  box-shadow: 0 7px 15px rgba(35, 35, 126, 0.34);

  &:hover,
  &:focus {
    color: #fff;
    outline: none;
    background: linear-gradient(135deg, #5276f3 0%, #4521b8 100%);
    box-shadow: 0 10px 20px rgba(35, 35, 126, 0.42);
  }
}

.hero-action--deposit {
  color: #563405;
  background: linear-gradient(135deg, #ffd064 0%, #f3a51d 100%);
  box-shadow: 0 7px 15px rgba(112, 67, 5, 0.3);

  &:hover,
  &:focus {
    color: #4a2b00;
    outline: none;
    background: linear-gradient(135deg, #ffda7b 0%, #ed9910 100%);
    box-shadow: 0 10px 20px rgba(112, 67, 5, 0.38);
  }
}

.section-card {
  margin-bottom: 20px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 18px;
  box-shadow: 0 5px 18px rgba(31, 38, 55, 0.04);

  ::v-deep .el-card__header {
    padding: 18px 20px;
    color: #1d2129;
    background: #fff;
    border-bottom: 1px solid #f0f2f5;
  }

  ::v-deep .el-card__body {
    padding: 20px;
  }
}

.overview-card {
  border-color: #e5e8f1;
  box-shadow: 0 3px 12px rgba(38, 45, 64, 0.045);

  ::v-deep .el-card__header {
    background: #fff;
    border-bottom-color: #eef0f4;
  }

  ::v-deep .el-card__body {
    padding: 16px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.card-header__title {
  position: relative;
  padding-left: 12px;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 700;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 2px;
    width: 4px;
    height: 17px;
    border-radius: 4px;
    background: linear-gradient(180deg, #6a35ff 0%, #a65ef5 100%);
  }
}

.card-header__desc {
  margin-top: 5px;
  padding-left: 12px;
  font-size: 12px;
  color: #9aa1ad;
}

.link-action {
  padding: 0;
  color: #7b46e8;
  font-weight: 500;

  &:hover,
  &:focus {
    color: #5f2fd0;
  }
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.overview-group {
  min-width: 0;
  padding: 14px 15px;
  background: #fff;
  border: 1px solid #eceef3;
  border-radius: 12px;
}

.overview-group--payment {
  background: #fff;
  border-color: #eceef3;
}

.overview-group--product {
  background: #fff;
}

.overview-group__title {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 11px;
  font-size: 13px;
  font-weight: 700;
  color: #354052;

  i {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 7px;
    color: #7340df;
    font-size: 13px;
    background: #f1edfa;
  }
}

.overview-pair {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.overview-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.overview-item--role {
  padding: 10px 11px;
  border: 1px solid #ebeef4;
  border-radius: 10px;
  background: #fff;
}

.overview-item--buyer {
  border-left: 3px solid #7b51dc;
}

.overview-item--waiter {
  border-right: 3px solid #20a987;
}

.overview-role-arrow {
  display: flex;
  align-items: center;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
  color: #8766cb;
}

.overview-role-arrow__line {
  position: relative;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #d8cef0 0%, #8b65d2 70%, #7040ca 100%);

  i {
    position: absolute;
    right: -3px;
    top: -7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    background: #7040ca;
    box-shadow: 0 4px 9px rgba(112, 64, 202, 0.24);
  }
}

.overview-role-profile {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.overview-role-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border: 2px solid #eee8fa;
  border-radius: 50%;
  color: #7040ca;
  background: #f3effb;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.overview-item--waiter .overview-role-avatar {
  color: #178d75;
  border-color: #dff2ed;
  background: #eaf8f4;
}

.overview-role-profile__content {
  display: flex;
  min-width: 0;
  flex-direction: column;

  .overview-label {
    margin-bottom: 3px;
  }
}

.overview-label {
  margin-bottom: 7px;
  font-size: 12px;
  color: #a0a6b1;
}

.overview-value {
  overflow: hidden;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 600;
  color: #252a34;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-panels {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1.2fr 0.9fr;
  gap: 8px;
}

.product-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 68px;
  padding: 9px 10px;
  border: 1px solid #eceef3;
  border-radius: 10px;
  background: #fff;
}

.product-panel--primary {
  border-color: #d9cef1;
  border-left: 3px solid #7644d5;
  background: #fff;
}

.product-panel__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border-radius: 9px;
  font-size: 15px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.product-panel__icon--game {
  color: #d88719;
  background: #fff3dc;
}

.product-panel__icon--product {
  color: #fff;
  background: linear-gradient(145deg, #7040db, #9c58ed);
  box-shadow: 0 5px 11px rgba(112, 64, 219, 0.22);
}

.product-panel__icon--attribute {
  color: #178d75;
  background: #e4f8f3;
}

.product-panel__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.product-panel__label {
  font-size: 11px;
  font-weight: 600;
  color: #979eaa;
}

.product-panel__value {
  overflow: hidden;
  font-size: 14px;
  line-height: 1.35;
  color: #222834;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-panel__sub {
  font-size: 10px;
  color: #8d82a1;
}

.payment-metrics {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.payment-metric {
  display: flex;
  min-width: 0;
  min-height: 68px;
  padding: 9px 11px;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgba(112, 64, 219, 0.12);
  border-radius: 10px;
  background: #fff;
}

.payment-metric--primary {
  border-color: #e2daf2;
  background: #fff;

  .payment-metric__value {
    color: #7040db;
  }
}

.payment-metric__label {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #8f85a5;
}

.payment-metric__value {
  display: flex;
  align-items: baseline;
  gap: 3px;
  min-width: 0;

  strong {
    overflow: hidden;
    font-size: 21px;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    font-size: 13px;
    font-weight: 600;
  }
}

.payment-metric__value--secondary {
  color: #5d36b0;

  strong {
    font-size: 19px;
  }

  small {
    color: #9185a8;
  }
}

.payment-metric__meta {
  margin-top: 4px;
  overflow: hidden;
  font-size: 11px;
  color: #9a92a8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-metric--method {
  border-color: #e5dff1;
  background: #fff;
}

.payment-method-value {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;

  strong {
    overflow: hidden;
    font-size: 17px;
    line-height: 1.2;
    color: #5d32bd;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.payment-method-value__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 25px;
  width: 25px;
  height: 25px;
  border-radius: 7px;
  color: #7040ca;
  font-size: 13px;
  background: #eee9f8;
}

.overview-id {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 7px;
  min-height: 26px;
  margin-top: 8px;
  padding: 3px 10px 3px 4px;
  border: 1px solid #e4dcfa;
  border-radius: 8px;
  color: #6541ae;
  background: #f5f1ff;

  strong {
    font-family: Consolas, "SFMono-Regular", monospace;
    font-size: 13px;
    line-height: 1;
    letter-spacing: 0.25px;
  }
}

.overview-id__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #7040db, #9d5bf0);
}

.timeline-list {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.timeline-row {
  display: grid;
  grid-template-columns: 9px minmax(64px, auto) minmax(0, 1fr);
  align-items: center;
  gap: 9px;

  .overview-label {
    margin-bottom: 0;
  }
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(129, 80, 232, 0.18);

  &.is-start {
    background: #8150e8;
  }

  &.is-end {
    background: #1bc286;
    box-shadow: 0 0 0 2px rgba(27, 194, 134, 0.18);
  }
}

.card-header--revenue {
  align-items: center;
}

.club-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 9px 14px;
  background: #f8f6ff;
  border: 1px solid #eee8ff;
  border-radius: 12px;
}

.club-summary__item {
  display: flex;
  flex-direction: column;
  gap: 3px;

  span {
    font-size: 11px;
    color: #9b93aa;
  }

  strong {
    max-width: 180px;
    overflow: hidden;
    font-size: 13px;
    color: #4c357f;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.club-summary__divider {
  width: 1px;
  height: 26px;
  background: #e5dcfb;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.detail-table {
  width: 100%;

  ::v-deep th.el-table__cell {
    height: 46px;
    color: #4e5969;
    font-weight: 600;
    background: #f6f6fb !important;
  }

  ::v-deep td.el-table__cell {
    height: 48px;
    color: #4e5969;
  }

  ::v-deep .el-table__row:last-child td {
    border-bottom: 0;
  }
}

.text-danger {
  color: #ff4d4f;
  font-weight: 600;
}

.records-card {
  ::v-deep .el-card__body {
    padding-top: 0;
  }
}

.record-tabs {
  ::v-deep .el-tabs__header {
    margin-bottom: 18px;
  }

  ::v-deep .el-tabs__nav-wrap::after {
    height: 1px;
    background: #eef0f4;
  }

  ::v-deep .el-tabs__item {
    height: 54px;
    line-height: 54px;
    color: #697180;
    font-weight: 500;
  }

  ::v-deep .el-tabs__item.is-active {
    color: #6a35ff;
  }

  ::v-deep .el-tabs__active-bar {
    height: 3px;
    border-radius: 3px;
    background: linear-gradient(90deg, #6a35ff, #9b57ef);
  }

  em {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 999px;
    font-size: 11px;
    font-style: normal;
    color: #8a92a0;
    background: #f0f2f5;
  }

  ::v-deep .el-tabs__item.is-active em {
    color: #6a35ff;
    background: #f0eaff;
  }

  ::v-deep .el-empty {
    padding: 32px 0 42px;
  }
}

.table-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.action-link {
  margin: 0 !important;
  padding: 0;

  &.is-success {
    color: #1bc286;
  }

  &.is-danger {
    color: #ff4d4f;
  }
}

.deduction-status {
  font-weight: 600;
}

.business-type-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 22px;
  padding: 0 8px;
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
  gap: 6px;
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
  color: inherit;
}

.text-span {
  width: 100%;
  height: 100%;
  display: inline-block;
  padding: 0 15px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
  background: #f5f7fa;

  span {
    float: right;
  }
}

.warning-tip {
  color: #ff4d4f !important;
}

.field-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #999999;
}

.dialog-center ::v-deep .el-form-item {
  margin-bottom: 10px;
}

.dialog-center ::v-deep .el-dialog__body {
  padding: 10px 20px 0 20px !important;
}

.dialog-center ::v-deep .el-dialog__footer {
  padding: 10px 20px 20px;
  box-sizing: border-box;
}

.dialog-center {
  ::v-deep .el-button {
    width: 102px;
    height: 34px;
    padding: 0;
  }
}

@media (max-width: 1100px) {
  .detail-hero__main {
    align-items: flex-start;
    flex-direction: column;
  }

  .detail-hero__actions {
    justify-content: flex-start;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .order-detail-page {
    padding: 14px;
    border-radius: 16px;
  }

  .detail-hero {
    padding: 14px;
    border-radius: 16px;
  }

  .detail-hero__title-row h1 {
    font-size: 20px;
  }

  .detail-hero__actions {
    width: 100%;

    .hero-action {
      flex: 1;
      min-width: 110px;
      padding: 0 12px;
    }
  }

  .section-card {
    border-radius: 14px;

    ::v-deep .el-card__header,
    ::v-deep .el-card__body {
      padding: 16px;
    }
  }

  .overview-pair,
  .timeline-list {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .overview-role-arrow {
    min-height: 38px;
  }

  .overview-role-arrow__line {
    width: 4px;
    height: 30px;
    background: linear-gradient(180deg, #d8cef0 0%, #7040ca 100%);

    i {
      right: -8px;
      top: auto;
      bottom: -5px;
      transform: rotate(90deg);
    }
  }

  .payment-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .product-panels {
    grid-template-columns: 1fr;
  }

  .card-header--revenue {
    align-items: flex-start;
    flex-direction: column;
  }

  .club-summary {
    width: 100%;
    box-sizing: border-box;
  }
}
</style>
