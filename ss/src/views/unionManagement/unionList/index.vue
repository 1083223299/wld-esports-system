<!--
  公会列表页（unionList）
  ---------------------------------------------------------------------------
  职责：
  1. 按条件检索公会列表（名称 / ID / 负责人 / 商户名称 / 公会类型 / 状态 /
     是否首推 / 合作状态 / 创建时间）
  2. 表格展示公会基础信息、商户信息（merchantName / guildType /
     merchantCreateTime / subscriptionStatusLabel）、通用分润、特殊分润（含模式明细）
  3. 开关控制「启用/禁用」「置顶」
  4. 抽屉内嵌 Add-Form，完成新增 / 编辑（接口：/trade/union/add、edit、detail）

  商户信息由接口直接返回 flat 字段：merchantName / guildType / merchantCreateTime；
  订阅状态由列表接口返回 subscriptionStatusLabel 只读展示。

  分润数据结构约定（tradeUnionRateList）：
  - type === '1'：通用游戏分润（无 productId）
  - type === '2'：特殊游戏分润（有 productId + specialProfitSharingVoList/Bos）
  - 兼容旧字段 tradeUnionSpecialRateList
-->
<template>
    <div class="container">
        <!-- ========== 顶部搜索区 ========== -->
        <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
            @search="handleSearch" @reset="handleReset" />

        <!-- ========== 列表主卡片：操作栏 + 表格 + 分页 ========== -->
        <el-card class="list-card" shadow="never">
            <!-- 固定操作栏（不随表格滚动） -->
            <div class="action-bar-fixed">
                <el-button v-permission="'system:unionList:add'" type="primary" icon="el-icon-plus" class="add-btn"
                    @click="handleAdd">
                    新增公会
                </el-button>
            </div>

            <!-- 表格滚动区域：高度自适应剩余空间 -->
            <div class="table-scroll-container">
                <el-table :data="tableData" stripe row-key="tradeId" v-loading="loading" :border="false"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }" height="100%">
                    <!-- 基础列 -->
                    <el-table-column prop="tradeId" label="公会ID" align="left" width="130" />
                    <el-table-column prop="tradeName" label="公会名称" width="120" />

                    <!-- 商户名称：接口返回 merchantName（公会-商户绑定关系 JOIN 商户主表） -->
                    <el-table-column label="商户名称" min-width="150" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            <span v-if="row.merchantName">{{ row.merchantName }}</span>
                            <span v-else class="cell-placeholder">—</span>
                        </template>
                    </el-table-column>

                    <!-- 公会类型：guildType merchant=商户公会 / 其余=公会（服务端按绑定关系实时计算） -->
                    <el-table-column label="公会类型" width="90">
                        <template slot-scope="{ row }">
                            <span class="type-tag" :class="row.guildType === 'merchant' ? 'type-tag--merchant' : 'type-tag--plain'">
                                {{ row.guildType === 'merchant' ? "商户公会" : "公会" }}
                            </span>
                        </template>
                    </el-table-column>

                    <!-- Logo：无图时展示默认占位图 -->
                    <el-table-column label="公会logo" width="100">
                        <template slot-scope="scope">
                            <img v-if="!scope.row.logoUrl" src="@/assets/no_logo.png" alt="" class="unionLogo" />
                            <img v-else :src="scope.row.logoUrl" alt="" class="unionLogo" />
                        </template>
                    </el-table-column>

                    <el-table-column label="评分" width="80">
                        <template slot-scope="{ row }">
                            {{ row.averageScore }}分
                        </template>
                    </el-table-column>

                    <!-- 置顶开关：失败时需回滚开关状态（见 topStatusChange） -->
                    <el-table-column prop="isTop" label="置顶" width="80" v-if="checkPermission('system:unionList:top')">
                        <template slot-scope="{ row }">
                            <el-switch v-model="row.isTop" active-color="#8F03FF" :active-value="1" :inactive-value="0"
                                @change="topStatusChange(row)" />
                        </template>
                    </el-table-column>

                    <el-table-column prop="sortValue" label="排序值" width="80" />

                    <!--
                      注意：权限码末尾带反引号是历史写法（system:unionList:status`），
                      若后端菜单权限未带该字符，此列可能一直不显示，改权限时需同步核对。
                    -->
                    <el-table-column label="状态" width="80" v-if="checkPermission('system:unionList:status`')">
                        <template slot-scope="scope">
                            <el-switch v-model="scope.row.status" active-color="#8F03FF" active-value="1"
                                inactive-value="0" @change="statusChange(scope.row)" />
                        </template>
                    </el-table-column>

                    <el-table-column prop="tradeNamePerson" label="公会负责人" width="100" />

                    <!-- 手机号脱敏展示组件 -->
                    <el-table-column prop="phone" label="联系方式" width="140">
                        <template slot-scope="scope">
                            <PhoneDisplay :value="scope.row.phone" />
                        </template>
                    </el-table-column>

                    <el-table-column prop="waiterCount" label="陪陪数量" width="80">
                        <template slot-scope="scope">
                            {{ scope.row.waiterCount || 0 }}
                        </template>
                    </el-table-column>

                    <el-table-column prop="orderCount" label="总订单数" width="80" />

                    <!-- 通用分润：取 tradeUnionRateList 中 type=1 的一条 -->
                    <el-table-column label="通用游戏类型" min-width="160">
                        <template slot-scope="scope">
                            <div class="ProfitSharingRatio" v-if="getGeneralRate(scope.row)">
                                <span>公会: {{ getGeneralRate(scope.row).unionRateProportion || '--' }}%</span>
                                <span>陪陪: {{ getGeneralRate(scope.row).waiterRateProportion || '--' }}%</span>
                                <span>平台: {{ getGeneralRate(scope.row).platformRateProportion || '--' }}%</span>
                            </div>
                            <span v-else>--</span>
                        </template>
                    </el-table-column>

                    <!--
                      特殊分润：按游戏分组，模式分行展示三方比例
                    -->
                    <el-table-column label="特殊游戏类型" min-width="360" align="left">
                        <template slot-scope="scope">
                            <div v-if="getSpecialRates(scope.row).length" class="special-rate-list">
                                <div v-for="(item, index) in getSpecialRates(scope.row)" :key="index"
                                    class="special-rate-card">
                                    <div class="special-rate-card__game" :title="item.productName">
                                        {{ item.productName || "游戏" }}
                                    </div>
                                    <div v-if="item.modes && item.modes.length" class="special-rate-card__modes">
                                        <div v-for="(mode, mIndex) in item.modes" :key="mIndex"
                                            class="special-mode-row">
                                            <span class="special-mode-row__name" :title="mode.name">
                                                {{ mode.name }}
                                            </span>
                                            <div class="special-mode-row__rates">
                                                <span class="rate-chip rate-chip--union">
                                                    公会 {{ mode.union }}%
                                                </span>
                                                <span class="rate-chip rate-chip--waiter">
                                                    陪陪 {{ mode.waiter }}%
                                                </span>
                                                <span class="rate-chip rate-chip--platform">
                                                    平台 {{ mode.platform }}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else class="special-mode-row__rates special-mode-row__rates--solo">
                                        <span class="rate-chip rate-chip--union">
                                            公会 {{ formatRate(item.unionRateProportion) }}%
                                        </span>
                                        <span class="rate-chip rate-chip--waiter">
                                            陪陪 {{ formatRate(item.waiterRateProportion) }}%
                                        </span>
                                        <span class="rate-chip rate-chip--platform">
                                            平台 {{ formatRate(item.platformRateProportion) }}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span v-else class="special-rate-empty">--</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="depositAmount" label="保证金余额(元)" width="120">
                        <template slot-scope="{ row }">
                            {{
                                row.depositAmount === null ||
                                    row.depositAmount === undefined ||
                                    row.depositAmount === ""
                                    ? "-"
                                    : row.depositAmount
                            }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="createByName" label="操作人" min-width="100"></el-table-column>
                    <el-table-column prop="createTime" label="公会创建时间" min-width="160"></el-table-column>

                    <!-- 商户创建时间：接口返回 merchantCreateTime（仅商户公会类型有值） -->
                    <el-table-column label="商户创建时间" min-width="160">
                        <template slot-scope="{ row }">
                            <span v-if="row.merchantCreateTime">{{ row.merchantCreateTime }}</span>
                            <span v-else class="cell-placeholder">—</span>
                        </template>
                    </el-table-column>

                    <!-- 订阅状态：列表接口返回 subscriptionStatusLabel（千牛侧实时查询只读展示） -->
                    <el-table-column label="订阅状态" width="110">
                        <template slot-scope="{ row }">
                            <span v-if="row.subscriptionStatusLabel === '订阅中'" class="sub-tag sub-tag--active">订阅中</span>
                            <span v-else-if="row.subscriptionStatusLabel === '订阅结束'" class="sub-tag sub-tag--expired">订阅结束</span>
                            <span v-else class="cell-placeholder">{{ row.subscriptionStatusLabel || "—" }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column label="合作状态" width="110">
                        <template slot-scope="{ row }">
                            <span class="exit-status-text"
                                :class="getExitStatus(row) === '1' ? 'is-terminated' : 'is-cooperating'">
                                {{ getExitStatusText(row) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" fixed="right" width="200"
                        v-if="checkPermission('system:unionList:edit')">
                        <template slot-scope="scope">
                            <el-button v-permission="'system:unionList:edit'" type="text" size="mini"
                                @click="handleEdit(scope.row)" style="color: #9047F8;">
                                编辑
                            </el-button>
                            <el-button v-if="canDeductDeposit(scope.row)" type="text" size="mini"
                                @click="openDepositDeduct(scope.row)" style="color: #E6A23C;">
                                扣减保证金
                            </el-button>
                            <el-button type="text" size="mini" @click="openDepositDeductLog(scope.row)"
                                style="color: #409EFF;">
                                扣减日志
                            </el-button>
                            <!-- 合作中且无待审核申请 → 可终止 -->
                            <el-button v-if="canTerminate(scope.row)" type="text" size="mini"
                                @click="handleTerminate(scope.row)" style="color: #FF4D4F;">
                                终止合作
                            </el-button>
                            <!-- 已终止 → 可重启 -->
                            <el-button v-if="canRestart(scope.row)" type="text" size="mini"
                                @click="handleRestart(scope.row)" style="color: #67C23A;">
                                重启合作
                            </el-button>
                            <el-button type="text" size="mini" @click="handleLog(scope.row)" style="color: #409EFF;">
                                终止合作日志
                            </el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <!-- 底部分页：吸底，不随表格滚动 -->
            <div class="pagination-fixed">
                <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize"
                    :total="pagination.total" @current-change="handleCurrentChange" />
            </div>
        </el-card>

        <!-- ========== 新增 / 编辑抽屉 ========== -->
        <DrawerComponent :visible="drawerVisible" :title="drawerTitle" @close="closeDrawer">
            <!--
              AddForm 对外方法：
              - resetForm()      清空表单
              - setEditMode(bool) 编辑态（如禁用手机号修改）
              - fillFormData(data) 详情回填
              事件：
              - submit(formData) 提交载荷（logo=ossId，photos=逗号串，含 tradeUnionRateList）
              - cancel           关闭抽屉
            -->
            <AddForm ref="addFormRef" :submitting="submitting" @submit="handleFormSubmit" @cancel="closeDrawer" />
        </DrawerComponent>

        <el-dialog title="终止合作" :visible.sync="terminateDialogVisible" :close-on-click-modal="false" append-to-body
            @close="handleTerminateDialogClose">
            <div class="terminate-dialog">
                <div class="terminate-upload-panel">
                    <div class="terminate-upload-head">
                        <div class="terminate-upload-title">
                            <span class="terminate-required">*</span>
                            <span>凭证图片（最多5张）</span>
                        </div>
                        <div class="terminate-upload-count">{{ terminateForm.voucherList.length }}/5</div>
                    </div>
                    <div class="terminate-upload-sub">支持 png、jpg 格式，至少上传 1 张，最多上传 5 张</div>
                    <!-- 满 5 张后隐藏上传入口，仅可删除 -->
                    <div v-if="terminateForm.voucherList.length < 5" class="terminate-upload-link"
                        @click="triggerTerminateUpload">
                        上传图片
                    </div>
                    <div class="terminate-upload-grid">
                        <div v-for="(item, index) in terminateForm.voucherList"
                            :key="`${item.ossId || item.url}-${index}`" class="terminate-upload-item">
                            <img :src="item.url" class="terminate-upload-item__image"
                                @click="previewTerminateImage(index)" />
                            <div class="terminate-upload-item__mask">
                                <i class="el-icon-zoom-in" @click.stop="previewTerminateImage(index)"></i>
                                <i class="el-icon-delete" @click.stop="removeTerminateImage(index)"></i>
                            </div>
                            <div v-if="terminatePhotoUploading && terminateUploadingIndex === index"
                                class="terminate-upload-item__loading">
                                <i class="el-icon-loading"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <input ref="terminatePhotoInput" type="file" accept="image/png,image/jpeg,image/jpg" multiple
                    style="display: none" @change="handleTerminatePhotoChange" />

                <div class="terminate-impact-card">
                    <div class="terminate-tip-title">是否提交终止合作审核，一旦审核通过</div>
                    <div class="terminate-tip-list">
                        <div class="terminate-tip-item">1、其下陪陪将自动转为个人陪</div>
                        <div class="terminate-tip-item">2、该俱乐部禁用添加陪陪、充值保证金等功能；仅保留保证金、订单收益提现功能；</div>
                        <div class="terminate-tip-item">
                            3、终止合作后，订单收益可随时提现；但保证金需要等旗下全部的技术陪订单都出账期{{ depositWithdrawDays }}天后，方可提现
                        </div>
                    </div>
                </div>
            </div>
            <div slot="footer" class="terminate-dialog__footer">
                <el-button class="terminate-btn terminate-btn--ghost"
                    @click="terminateDialogVisible = false">取消</el-button>
                <el-button class="terminate-btn terminate-btn--danger" type="primary" :loading="terminateSubmitting"
                    @click="submitTerminate">提交</el-button>
            </div>
        </el-dialog>

        <el-dialog title="日志" :visible.sync="logDialogVisible" width="960px" :close-on-click-modal="false"
            append-to-body @close="handleLogDialogClose">
            <div class="log-dialog" v-loading="logLoading">
                <div class="log-table-head">
                    <div class="log-table-head__item log-table-head__item--status">状态</div>
                    <div class="log-table-head__item log-table-head__item--images">凭证图片</div>
                    <div class="log-table-head__item log-table-head__item--reason">驳回原因</div>
                    <div class="log-table-head__item log-table-head__item--time">提交时间</div>
                    <div class="log-table-head__item log-table-head__item--time">审核时间</div>
                </div>

                <div v-if="logList.length" class="log-table-body">
                    <div v-for="item in logList" :key="item.id" class="log-row">
                        <div class="log-cell log-cell--status">
                            <span class="log-status-tag" :class="getLogStatusClass(item.status)">
                                {{ getLogStatusText(item.status) }}
                            </span>
                        </div>
                        <div class="log-cell log-cell--images">
                            <div v-if="item.voucherImages && item.voucherImages.length" class="log-image-list">
                                <div v-for="(img, index) in item.voucherImages" :key="`${item.id}-${index}`"
                                    class="log-image-item" @click="openLogImagePreview(item.voucherImages, index)">
                                    <img :src="img" alt="凭证图片" />
                                </div>
                            </div>
                            <span v-else class="log-empty-text">-</span>
                        </div>
                        <div class="log-cell log-cell--reason">
                            <span v-if="item.rejectReason" class="log-reject-text">{{ item.rejectReason }}</span>
                            <span v-else class="log-empty-text">-</span>
                        </div>
                        <div class="log-cell log-cell--time">{{ item.createTime || '-' }}</div>
                        <div class="log-cell log-cell--time">{{ item.auditTime || '-' }}</div>
                    </div>
                </div>

                <div v-else class="log-empty-state">
                    <i class="el-icon-document"></i>
                    <div class="log-empty-state__title">暂无终止合作记录</div>
                    <div class="log-empty-state__desc">当前俱乐部还没有提交过终止合作申请</div>
                </div>
            </div>
            <div slot="footer" class="terminate-dialog__footer">
                <el-button class="terminate-btn terminate-btn--ghost" @click="logDialogVisible = false">关闭</el-button>
            </div>
        </el-dialog>

        <el-dialog :visible.sync="terminatePreviewVisible" title="图片预览" width="500px" append-to-body>
            <img :src="terminatePreviewUrl" style="width: 100%;" />
        </el-dialog>

        <ImgZoom v-model="logPreviewVisible" :img-list="logPreviewImages" :init-index="logPreviewIndex" />

        <DepositDeductDialog :visible.sync="depositDeductVisible" :type="1" :target-id="depositDeductTarget.id"
            :deposit-amount="depositDeductTarget.depositAmount" @success="fetchTableData" />
        <DepositDeductLogDrawer :visible.sync="depositDeductLogVisible" :type="1" :target-id="depositDeductLogTarget.id"
            :target-name="depositDeductLogTarget.name" />
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import DrawerComponent from "@/components/Drawer/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import DepositDeductDialog from "@/components/DepositDeductDialog/index.vue";
import DepositDeductLogDrawer from "@/components/DepositDeductLogDrawer/index.vue";
import { fileUpload } from "@/api/user";
import { getunionList, getunionDetail, PostUnionAdd, PutUnionEdit, PostUpdateStatus, PostUpdateTopStatus, PostClubExitSubmit, PostRestartCooperation, PostClubExitLogs } from "@/api/table"
import { getClubDepositDetail } from "@/api/depositConfig";
import AddForm from './components/Add-Form.vue'
import checkPermission from "@/utils/checkPermission";

export default {
    name: "unionList",
    components: {
        SearchForm,
        DrawerComponent,
        AddForm,
        PaginationSimple,
        PhoneDisplay,
        ImgZoom,
        DepositDeductDialog,
        DepositDeductLogDrawer,
    },
    data() {
        return {
            /**
             * 搜索表单字段配置（交给 SearchForm 渲染）
             * createTime 为日期范围，提交前会拆成 startTime / endTime
             */
            searchItems: [
                { type: "input", prop: "tradeName", label: "公会名称", placeholder: "请输入公会名称", clearable: true },
                { type: "input", prop: "tradeNo", label: "公会ID", placeholder: "请输入公会ID", clearable: true },
                { type: "input", prop: "tradeNamePerson", label: "公会负责人", placeholder: "请输入公会负责人", clearable: true },
                { type: "input", prop: "merchantName", label: "商户名称", placeholder: "请输入商户名称", clearable: true },
                {
                    type: "select",
                    prop: "guildType",
                    label: "公会类型",
                    placeholder: "全部",
                    options: [
                        { label: "全部", value: "" },
                        { label: "平台公会", value: "pure" },
                        { label: "商户公会", value: "merchant" },
                    ],
                    clearable: true,
                },
                {
                    type: "select",
                    prop: "status",
                    label: "状态",
                    placeholder: "请选择状态",
                    options: [
                        { label: "全部", value: "" },
                        { label: "启用", value: "1" },
                        { label: "禁用", value: "0" },
                    ],
                    clearable: true,
                },
                {
                    type: "select",
                    prop: "isTop",
                    label: "是否首推",
                    placeholder: "全部",
                    options: [
                        { label: "全部", value: "" },
                        { label: "是", value: "1" },
                        { label: "否", value: "0" },
                    ],
                    clearable: true,
                },
                {
                    type: "select",
                    prop: "exitStatus",
                    label: "合作状态",
                    placeholder: "请选择合作状态",
                    options: [
                        { label: "全部", value: "" },
                        { label: "合作中", value: "0" },
                        { label: "终止合作", value: "1" },
                    ],
                    clearable: true,
                },
                {
                    type: "daterange", prop: "createTime", label: "创建时间", valueFormat: "yyyy-MM-dd HH:mm:ss",
                    startPlaceholder: "开始日期", endPlaceholder: "结束日期",
                    pickerOptions: {
                        shortcuts: [
                            {
                                text: "最近三天",
                                onClick(picker) {
                                    const end = new Date();
                                    const start = new Date();
                                    start.setTime(start.getTime() - 3600 * 1000 * 24 * 2);
                                    picker.$emit("pick", [start, end]);
                                },
                            },
                            {
                                text: "最近一周",
                                onClick(picker) {
                                    const end = new Date();
                                    const start = new Date();
                                    start.setTime(start.getTime() - 3600 * 1000 * 24 * 6);
                                    picker.$emit("pick", [start, end]);
                                },
                            },
                            {
                                text: "最近一个月",
                                onClick(picker) {
                                    const end = new Date();
                                    const start = new Date();
                                    start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
                                    picker.$emit("pick", [start, end]);
                                },
                            },
                        ],
                    },
                },
            ],

            /** 实际请求参数（日期范围已拆成 startTime / endTime） */
            filterForm: {
                tradeName: '',
                tradeNo: '',
                tradeNamePerson: '',
                merchantName: '',
                guildType: '',
                status: '',
                isTop: '',
                exitStatus: '',
                startTime: '',
                endTime: ''
            },

            /** 分页 */
            pagination: { pageNum: 1, pageSize: 10, total: 0 },

            /** 表格数据 */
            tableData: [],
            loading: false,

            /** 抽屉状态 */
            drawerVisible: false,
            drawerTitle: "新增公会",
            submitting: false,
            /** 当前编辑的公会 ID；null 表示新增 */
            currentRowId: null,
            /** 俱乐部保证金出账期（天），用于终止合作提示文案 */
            depositWithdrawDays: 3,
            terminateDialogVisible: false,
            terminateSubmitting: false,
            terminatePhotoUploading: false,
            terminateUploadingIndex: -1,
            terminatePreviewVisible: false,
            terminatePreviewUrl: '',
            logDialogVisible: false,
            logLoading: false,
            logList: [],
            logPreviewVisible: false,
            logPreviewImages: [],
            logPreviewIndex: 0,
            terminateForm: {
                tradeId: '',
                voucherList: [],
            },
            depositDeductVisible: false,
            depositDeductTarget: { id: "", depositAmount: "" },
            depositDeductLogVisible: false,
            depositDeductLogTarget: { id: "", name: "" },
        }
    },
    created() {
        this.fetchTableData();
        this.fetchDepositWithdrawDays();
    },
    methods: {
        /** 权限判断（模板里直接调用） */
        checkPermission,
        canDeductDeposit(row) {
            // 仅未终止合作、未进入终止合作审核的数据支持扣除保证金
            return this.canTerminate(row);
        },
        openDepositDeduct(row) {
            if (!this.canDeductDeposit(row)) {
                this.$message.warning("仅合作中且未进入终止合作审核的公会可扣减保证金");
                return;
            }
            this.depositDeductTarget = {
                id: row.tradeId,
                depositAmount: row.depositAmount
            };
            this.depositDeductVisible = true;
        },
        openDepositDeductLog(row) {
            this.depositDeductLogTarget = {
                id: row.tradeId,
                name: row.tradeName || ""
            };
            this.depositDeductLogVisible = true;
        },
        async fetchDepositWithdrawDays() {
            try {
                const res = await getClubDepositDetail({});
                const data = (res && res.data) || {};
                const days = Number(data.withdrawDays);
                if (Number.isFinite(days) && days > 0) {
                    this.depositWithdrawDays = days;
                }
            } catch (e) {
                // ignore，保留默认值
            }
        },

        /**
         * 从行数据中取「通用分润」配置
         * 优先 type === '1'；否则回退到无 productId 的项（兼容旧数据）
         */
        getGeneralRate(row) {
            const list = row.tradeUnionRateList || [];
            return (
                list.find((item) => String(item.type) === "1") ||
                list.find((item) => !item.productId) ||
                null
            );
        },

        /**
         * 比例展示：小数(0.15) → 15；已是百分数(15 / 15.00)则原样
         */
        formatRate(value) {
            if (value === "" || value === null || value === undefined) return "--";
            const n = Number(value);
            if (!Number.isFinite(n)) return "--";
            const percent = n >= 0 && n <= 1 ? n * 100 : n;
            return Number(percent.toFixed(2));
        },

        /**
         * 从行数据中整理「特殊分润」展示结构
         * 返回：[{ productName, modes:[{ name, union, waiter, platform }], ... }]
         * - 新结构：specialProfitSharingVoList / specialProfitSharingBos
         * - 旧结构：tradeUnionSpecialRateList 或游戏级三比例字段
         */
        getSpecialRates(row) {
            const list = row.tradeUnionRateList || [];
            const typed = list.filter((item) => String(item.type) === "2" || item.productId);
            const source = typed.length ? typed : row.tradeUnionSpecialRateList || [];

            return source.map((item) => {
                const modeSource = item.specialProfitSharingVoList || item.specialProfitSharingBos || [];
                const nameList = String(item.modelNames || "")
                    .split(/[、,，]/)
                    .map((name) => name.trim())
                    .filter(Boolean);

                const modes = modeSource.map((mode, index) => ({
                    name:
                        mode.relationName ||
                        mode.modelName ||
                        mode.fieldName ||
                        nameList[index] ||
                        `模式${index + 1}`,
                    union: this.formatRate(mode.unionRateProportion),
                    waiter: this.formatRate(mode.waiterRateProportion),
                    platform: this.formatRate(mode.platformRateProportion),
                }));

                return {
                    productName: item.productName,
                    unionRateProportion: item.unionRateProportion,
                    waiterRateProportion: item.waiterRateProportion,
                    platformRateProportion: item.platformRateProportion,
                    modes,
                };
            });
        },

        /**
         * 搜索：把 SearchForm 回传值写入 filterForm
         * createTime[起,止] → startTime / endTime
         */
        handleSearch(e) {
            if (e) {
                const formValues = { ...e };
                if (formValues.createTime) {
                    if (formValues.createTime.length === 2) {
                        this.filterForm.startTime = formValues.createTime[0];
                        this.filterForm.endTime = formValues.createTime[1];
                    } else {
                        this.filterForm.startTime = "";
                        this.filterForm.endTime = "";
                    }
                } else {
                    this.filterForm.startTime = "";
                    this.filterForm.endTime = "";
                }
                // createTime 本身不传给接口
                delete formValues.createTime;
                this.filterForm = { ...this.filterForm, ...formValues };
            }
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },

        /** 重置筛选并回到第一页 */
        handleReset() {
            this.filterForm = {
                tradeName: '',
                tradeNo: '',
                tradeNamePerson: '',
                merchantName: '',
                guildType: '',
                status: '',
                isTop: '',
                exitStatus: '',
                startTime: '',
                endTime: ''
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        /**
         * 合作状态：0 合作中 / 1 终止合作；历史数据缺省按合作中
         */
        getExitStatus(row) {
            if (!row) return "0";
            const raw = row.exitStatus;
            if (raw === null || raw === undefined || raw === "") return "0";
            return String(raw);
        },
        getExitStatusText(row) {
            return this.getExitStatus(row) === "1" ? "终止合作" : "合作中";
        },
        /** 是否存在待审核的终止合作申请 */
        isExitPending(row) {
            if (!row) return false;
            if (row.hasPendingExit === true || row.hasPendingExit === 1 || row.hasPendingExit === "1") {
                return true;
            }
            const apply =
                row.exitApplyStatus != null
                    ? row.exitApplyStatus
                    : row.exitAuditStatus != null
                        ? row.exitAuditStatus
                        : row.pendingExitStatus;
            return String(apply) === "0";
        },
        /** 合作中且无待审申请，才可点终止合作 */
        canTerminate(row) {
            return this.getExitStatus(row) === "0" && !this.isExitPending(row);
        },
        /** 已终止才可重启 */
        canRestart(row) {
            return this.getExitStatus(row) === "1";
        },

        /** 分页切换 */
        handleCurrentChange(val) {
            this.pagination.pageNum = val;
            this.fetchTableData();
        },

        /**
         * 拉取列表
         * 空字符串参数会剔除，避免后端收到无效过滤条件
         */
        async fetchTableData() {
            this.loading = true;
            const searchParam = {
                ...this.filterForm,
                pageSize: this.pagination.pageSize,
                pageNum: this.pagination.pageNum,
            };
            Object.keys(searchParam).forEach((key) => {
                if (searchParam[key] === undefined || searchParam[key] === "") {
                    delete searchParam[key];
                }
            });
            try {
                const res = await getunionList(searchParam);
                if (res.code == 200) {
                    this.pagination.total = res.data.total;
                    this.tableData = res.data.rows;
                }
            } catch (error) {
                console.error("获取公会列表失败:", error);
                this.$message.error("获取数据失败，请稍后重试");
            } finally {
                this.loading = false;
            }
        },

        /**
         * 启用 / 禁用
         * 失败时把 switch 值回滚，避免 UI 与后端不一致
         */
        async statusChange(row) {
            try {
                const params = { tradeId: row.tradeId, status: row.status };
                const response = await PostUpdateStatus(params);
                if (response.code === 200) {
                    this.$message.success(row.status == "0" ? "关闭成功" : "开启成功");
                    this.fetchTableData();
                } else {
                    this.$message.error(response.message || "操作失败");
                    row.status = row.status === "1" ? "0" : "1";
                }
            } catch (error) {
                console.error("提交失败:", error);
                this.$message.error("操作失败，请稍后重试");
                row.status = row.status === "1" ? "0" : "1";
            }
        },

        /**
         * 置顶 / 取消置顶
         * 同样在失败时用 originalValue 回滚
         */
        async topStatusChange(row) {
            const originalValue = row.isTop;
            try {
                const params = { tradeId: row.tradeId, isTop: row.isTop };
                const response = await PostUpdateTopStatus(params);
                if (response.code === 200) {
                    this.$message.success(row.isTop == "1" ? "置顶成功" : "取消置顶成功");
                    this.fetchTableData();
                } else {
                    this.$message.error(response.message || "操作失败");
                    row.isTop = originalValue === "1" ? "0" : "1";
                }
            } catch (error) {
                console.error("提交失败:", error);
                this.$message.error("操作失败，请稍后重试");
                row.isTop = originalValue === "1" ? "0" : "1";
            }
        },

        /** 打开新增抽屉，并重置子表单为新增态 */
        handleAdd() {
            this.drawerTitle = "新增公会";
            this.currentRowId = null;
            this.drawerVisible = true;
            this.$nextTick(() => {
                if (this.$refs.addFormRef) {
                    this.$refs.addFormRef.resetForm();
                    this.$refs.addFormRef.setEditMode(false);
                }
            });
        },

        /**
         * 打开编辑抽屉
         * 流程：先开抽屉 → 请求详情 → 延迟回填（等抽屉 / 表单挂载完成）
         */
        async handleEdit(row) {
            this.drawerTitle = "编辑公会";
            this.currentRowId = row.tradeId;
            this.drawerVisible = true;

            try {
                const res = await getunionDetail(row.tradeId);
                if (res.code === 200) {
                    const detailData = res.data;
                    // 抽屉动画 / 子组件挂载需要一点时间，过短会导致 ref 尚未就绪
                    setTimeout(() => {
                        if (this.$refs.addFormRef) {
                            this.$refs.addFormRef.resetForm();
                            this.$refs.addFormRef.setEditMode(true);
                            this.$refs.addFormRef.fillFormData(detailData);
                        }
                    }, 150);
                } else {
                    this.$message.error(res.message || "获取详情失败");
                    this.drawerVisible = false;
                }
            } catch (error) {
                console.error("获取详情失败:", error);
                this.$message.error("获取详情失败");
                this.drawerVisible = false;
            }
        },
        handleTerminate(row) {
            this.terminateForm = {
                tradeId: row.tradeId,
                voucherList: []
            };
            this.terminateDialogVisible = true;
        },
        async handleLog(row) {
            this.logDialogVisible = true;
            this.logLoading = true;
            this.logList = [];
            try {
                const res = await PostClubExitLogs({
                    tradeId: row.tradeId
                });
                if (res.code === 200 || res.success) {
                    this.logList = Array.isArray(res.data) ? res.data : [];
                } else {
                    this.$message.error(res.message || res.errorMessage || '获取日志失败');
                }
            } catch (error) {
                this.$message.error('获取日志失败，请稍后重试');
            } finally {
                this.logLoading = false;
            }
        },
        handleLogDialogClose() {
            this.logLoading = false;
            this.logList = [];
        },
        getLogStatusText(status) {
            const statusMap = {
                '0': '待审核',
                '1': '通过',
                '2': '驳回'
            };
            return statusMap[String(status)] || '未知状态';
        },
        getLogStatusClass(status) {
            const statusMap = {
                '0': 'is-pending',
                '1': 'is-pass',
                '2': 'is-reject'
            };
            return statusMap[String(status)] || '';
        },
        openLogImagePreview(images, index) {
            this.logPreviewImages = Array.isArray(images) ? images : [];
            this.logPreviewIndex = index || 0;
            this.logPreviewVisible = true;
        },
        handleTerminateDialogClose() {
            this.terminateSubmitting = false;
            this.terminatePhotoUploading = false;
            this.terminateUploadingIndex = -1;
            this.terminateForm = {
                tradeId: '',
                voucherList: []
            };
            if (this.$refs.terminatePhotoInput) {
                this.$refs.terminatePhotoInput.value = '';
            }
        },
        triggerTerminateUpload() {
            if (this.terminatePhotoUploading) {
                return;
            }
            if (this.terminateForm.voucherList.length >= 5) {
                this.$message.warning('最多上传5张凭证图片');
                return;
            }
            if (this.$refs.terminatePhotoInput) {
                this.$refs.terminatePhotoInput.click();
            }
        },
        async handleTerminatePhotoChange(e) {
            const files = Array.from((e && e.target && e.target.files) || []);
            if (!files.length) {
                return;
            }
            const remainCount = 5 - this.terminateForm.voucherList.length;
            const uploadFiles = files.slice(0, remainCount);
            if (files.length > remainCount) {
                this.$message.warning('最多上传5张凭证图片');
            }
            for (const file of uploadFiles) {
                const isImage = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type);
                const isLt50M = file.size / 1024 / 1024 <= 50;
                if (!isImage) {
                    this.$message.error(`${file.name} 格式不支持，仅支持 png、jpg`);
                    continue;
                }
                if (!isLt50M) {
                    this.$message.error(`${file.name} 大小超过50MB`);
                    continue;
                }
                await this.uploadTerminatePhoto(file);
            }
            e.target.value = '';
        },
        async uploadTerminatePhoto(file) {
            const currentIndex = this.terminateForm.voucherList.length;
            this.terminateForm.voucherList.push({
                url: '',
                ossId: ''
            });
            this.terminatePhotoUploading = true;
            this.terminateUploadingIndex = currentIndex;
            try {
                const formData = new FormData();
                formData.append('file', file);
                const response = await fileUpload(formData);
                const uploadData = response && response.data && response.data.data ? response.data.data : response.data;
                if ((response.code === 200 || response.success || (response.data && response.data.code === 200)) && uploadData && uploadData.url) {
                    this.$set(this.terminateForm.voucherList, currentIndex, {
                        url: uploadData.url,
                        ossId: uploadData.ossId || ''
                    });
                    this.$message.success('上传成功');
                } else {
                    throw new Error(response.message || (response.data && response.data.errorMessage) || '上传失败');
                }
            } catch (error) {
                this.terminateForm.voucherList.splice(currentIndex, 1);
                this.$message.error(error.message || '上传失败');
            } finally {
                this.terminatePhotoUploading = false;
                this.terminateUploadingIndex = -1;
            }
        },
        removeTerminateImage(index) {
            this.terminateForm.voucherList.splice(index, 1);
        },
        previewTerminateImage(index) {
            const current = this.terminateForm.voucherList[index];
            if (!current || !current.url) return;
            this.terminatePreviewUrl = current.url;
            this.terminatePreviewVisible = true;
        },
        async submitTerminate() {
            // 提交凭证图片 URL（不用 ossId）
            const voucherImages = this.terminateForm.voucherList
                .map((item) => item.url)
                .filter(Boolean);
            if (!this.terminateForm.tradeId) {
                this.$message.error('缺少俱乐部ID');
                return;
            }
            if (!voucherImages.length) {
                this.$message.warning('请至少上传1张凭证图片');
                return;
            }
            this.terminateSubmitting = true;
            try {
                const res = await PostClubExitSubmit({
                    tradeId: this.terminateForm.tradeId,
                    voucherImages
                });
                if (res.code === 200 || res.success) {
                    this.$message.success('提交成功，已进入审核');
                    this.terminateDialogVisible = false;
                    this.fetchTableData();
                } else {
                    this.$message.error(res.message || res.errorMessage || '提交失败');
                }
            } catch (error) {
                this.$message.error('提交失败，请稍后重试');
            } finally {
                this.terminateSubmitting = false;
            }
        },
        handleRestart(row) {
            this.$confirm('确认重启该俱乐部的合作关系吗？重启后此前因终止合作禁用的功能将全部恢复。', '重启合作', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                const res = await PostRestartCooperation({
                    tradeId: row.tradeId
                });
                if (res.code === 200 || res.success) {
                    this.$message.success('重启合作成功');
                    this.fetchTableData();
                } else {
                    this.$message.error(res.message || res.errorMessage || '重启合作失败');
                }
            }).catch(() => { });
        },

        /** 关闭抽屉并清理编辑上下文 */
        closeDrawer() {
            this.drawerVisible = false;
            this.currentRowId = null;
            this.submitting = false;
        },

        /**
         * 接收 AddForm 提交的数据
         * - 有 currentRowId → PUT 编辑
         * - 否则 → POST 新增
         * 成功后关抽屉并刷新列表
         */
        async handleFormSubmit(formData) {
            try {
                this.submitting = true;
                let response;
                if (this.currentRowId) {
                    formData.tradeId = this.currentRowId;
                    response = await PutUnionEdit(formData);
                    this.$message.success("编辑成功");
                } else {
                    response = await PostUnionAdd(formData);
                    this.$message.success("新增成功");
                }
                if (response.code === 200) {
                    this.closeDrawer();
                    this.fetchTableData();
                } else {
                    this.$message.error(response.message || "操作失败");
                }
            } catch (error) {
                console.error("提交失败:", error);
                this.$message.error("操作失败，请稍后重试");
            } finally {
                this.submitting = false;
            }
        },

        /**
         * 以下两个方法为历史手机号显隐逻辑；
         * 当前列已改用 PhoneDisplay 组件，保留以兼容可能的外部调用。
         */
        togglePhoneVisibilityForRow(row) {
            if (!Object.prototype.hasOwnProperty.call(row, "showPhone")) {
                this.$set(row, "showPhone", false);
            }
            row.showPhone = !row.showPhone;
        },
        formatPhoneNumberForRow(phone, row) {
            if (!phone) return "";
            if (row.showPhone) return phone;
            if (phone.length === 11) return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
            if (phone.length === 13) return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
            return phone;
        },
    },
};
</script>

<style scoped>
/* 页面容器：纵向撑满，方便内部表格区域滚动 */
.container {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

/* 列表卡片：自身不滚动，由内部 table-scroll-container 负责滚动 */
.list-card {
    border-radius: 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* 顶部操作栏固定高度，不被 flex 压缩 */
.action-bar-fixed {
    margin-bottom: 20px;
    padding: 0 12px;
    flex-shrink: 0;
}

/* 表格主体可滚动 */
.table-scroll-container {
    flex: 1;
    overflow-y: auto;
    margin-right: -12px;
}

/* 分页吸底 */
.pagination-fixed {
    background: white;
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    z-index: 10;
}

/* 卡片内容区改为纵向 flex，配合上方滚动结构 */
::v-deep .el-card__body {
    padding: 24px 24px 0 24px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

::v-deep .el-table {
    min-height: 100px;
}

.action-bar {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

.add-btn {
    background: #6a35ff;
    padding-left: 55px;
    padding-right: 57px;
    border-radius: 8px;
    border: none;
}

.unionLogo {
    width: 46px;
    height: 46px;
    border-radius: 8px;
}

.exit-status-text {
    font-size: 13px;
    font-weight: 500;
}

.exit-status-text.is-cooperating {
    color: #303133;
}

.exit-status-text.is-terminated {
    color: #f56c6c;
}

/* 公会类型标签：公会=灰底深灰字 / 商户公会=紫底紫字 */
.type-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
}

.type-tag--plain {
    background: #f2f3f5;
    color: #4e5969;
}

.type-tag--merchant {
    background: #f5edff;
    color: #8f03ff;
}

/* 订阅状态标签：订阅中=绿 / 订阅结束=红 */
.sub-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
}

.sub-tag--active {
    background: #e8f7ef;
    color: #00b42a;
}

.sub-tag--expired {
    background: #ffece8;
    color: #f53f3f;
}

.cell-placeholder {
    color: #c0c4cc;
}

.ProfitSharingRatio {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    line-height: 1.5;
    color: #606266;
}

/* 特殊分润：按游戏卡片 + 模式行 */
.special-rate-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 0;
    text-align: left;
}

.special-rate-card {
    border: 1px solid #eef0f5;
    border-radius: 10px;
    background: #fafbff;
    padding: 8px 10px;
}

.special-rate-card__game {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.special-rate-card__modes {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.special-mode-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.special-mode-row__name {
    flex: 0 0 64px;
    max-width: 72px;
    font-size: 12px;
    color: #606266;
    line-height: 22px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.special-mode-row__rates {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.special-mode-row__rates--solo {
    margin-top: 2px;
}

.rate-chip {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;
}

.rate-chip--union {
    color: #6a35ff;
    background: rgba(106, 53, 255, 0.08);
}

.rate-chip--waiter {
    color: #0677ff;
    background: rgba(6, 119, 255, 0.08);
}

.rate-chip--platform {
    color: #e6a23c;
    background: rgba(230, 162, 60, 0.12);
}

.special-rate-empty {
    color: #909399;
}

.phone-display {
    display: flex;
    align-items: center;
    justify-content: center;
}

.phone-toggle {
    width: 16px;
    height: 16px;
    margin-left: 13px;
}

.pagination-container {
    flex-direction: column;
    align-items: stretch;
}

.terminate-dialog {
    padding: 6px 4px 0;
}

::v-deep .el-dialog__header {
    padding: 24px 28px 12px;
}

::v-deep .el-dialog__title {
    color: #20203c;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.2px;
}

::v-deep .el-dialog__body {
    padding: 4px 28px 10px;
}

::v-deep .el-dialog__footer {
    padding: 18px 28px 28px;
}

.terminate-upload-panel {
    padding: 22px 20px 20px;
    border-radius: 22px;
    background:
        linear-gradient(180deg, #ffffff 0%, #fbfbff 100%) padding-box,
        linear-gradient(135deg, rgba(143, 3, 255, 0.16) 0%, rgba(63, 124, 255, 0.12) 100%) border-box;
    border: 1px solid transparent;
    box-shadow: 0 14px 32px rgba(60, 74, 122, 0.08);
}

.terminate-upload-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.terminate-upload-title {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #20203c;
    font-size: 14px;
    line-height: 22px;
    font-weight: 600;
}

.terminate-required {
    color: #F56C6C;
}

.terminate-upload-count {
    min-width: 52px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(143, 3, 255, 0.08);
    color: #7b3ff4;
    font-size: 12px;
    line-height: 16px;
    text-align: center;
    font-weight: 700;
}

.terminate-upload-sub {
    margin-top: 8px;
    color: #8a90a7;
    font-size: 12px;
    line-height: 20px;
}

.terminate-upload-link {
    margin-top: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 98px;
    height: 36px;
    padding: 0 16px;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(143, 3, 255, 0.08) 0%, rgba(63, 124, 255, 0.1) 100%);
    color: #5b6ff8;
    font-size: 13px;
    line-height: 20px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.terminate-upload-link:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(91, 111, 248, 0.14);
}

.terminate-upload-grid {
    margin-top: 18px;
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
}

.terminate-upload-trigger,
.terminate-upload-item {
    width: 94px;
    height: 94px;
    border: 1px solid rgba(143, 160, 210, 0.18);
    border-radius: 16px;
    background: linear-gradient(180deg, #f8faff 0%, #f4f7ff 100%);
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 22px rgba(79, 92, 140, 0.08);
}

.terminate-upload-trigger {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #8f9bb8;
    font-size: 24px;
    gap: 8px;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.terminate-upload-trigger span {
    font-size: 12px;
    line-height: 16px;
    color: #616a84;
}

.terminate-upload-trigger:hover {
    transform: translateY(-1px);
    border-color: rgba(143, 3, 255, 0.24);
    box-shadow: 0 16px 28px rgba(91, 111, 248, 0.16);
}

.terminate-upload-item__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.terminate-upload-item__mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #fff;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.terminate-upload-item:hover .terminate-upload-item__mask {
    opacity: 1;
}

.terminate-upload-item__mask i {
    cursor: pointer;
    font-size: 16px;
}

.terminate-upload-item__loading {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #409EFF;
    font-size: 20px;
}

.terminate-tip-title {
    color: #20203c;
    font-size: 14px;
    line-height: 22px;
    font-weight: 700;
}

.terminate-impact-card {
    margin-top: 22px;
    padding: 20px 20px 18px;
    border-radius: 22px;
    background:
        linear-gradient(180deg, rgba(255, 248, 248, 0.98) 0%, rgba(255, 244, 244, 0.96) 100%) padding-box,
        linear-gradient(135deg, rgba(255, 77, 79, 0.18) 0%, rgba(255, 170, 102, 0.12) 100%) border-box;
    border: 1px solid transparent;
    box-shadow: 0 14px 32px rgba(255, 107, 122, 0.08);
}

.terminate-tip-list {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.terminate-tip-item {
    color: #F56C6C;
    font-size: 13px;
    line-height: 23px;
}

.terminate-dialog__footer {
    display: flex;
    justify-content: center;
    gap: 20px;
}

.terminate-btn {
    min-width: 112px;
    height: 38px;
    border-radius: 999px;
    padding: 0 20px;
    font-weight: 600;
}

.terminate-btn--ghost {
    color: #59637e;
    border-color: #dce2f2;
    background: #ffffff;
}

.terminate-btn--ghost:hover,
.terminate-btn--ghost:focus {
    color: #4a5470;
    border-color: #cdd6ec;
    background: #ffffff;
}

.terminate-btn--danger {
    border: none;
    background: linear-gradient(135deg, #ff6b7a 0%, #ff4d4f 52%, #ff7d45 100%);
    box-shadow: 0 14px 26px rgba(255, 77, 79, 0.24);
}

.terminate-btn--danger:hover,
.terminate-btn--danger:focus {
    background: linear-gradient(135deg, #ff7b88 0%, #ff575a 52%, #ff8957 100%);
    box-shadow: 0 18px 30px rgba(255, 77, 79, 0.28);
}

.log-dialog {
    padding: 4px 0 2px;
}

.log-table-head {
    display: grid;
    grid-template-columns: 80px 320px 1fr 190px 190px;
    gap: 0;
    min-height: 54px;
    padding: 0 18px;
    border-radius: 14px;
    background: linear-gradient(180deg, #f3f4f8 0%, #eceef5 100%);
    color: #2f3447;
    font-size: 14px;
    font-weight: 600;
    align-items: center;
}

.log-table-head__item {
    text-align: center;
}

.log-table-body {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 430px;
    overflow-y: auto;
    padding-right: 6px;
}

.log-row {
    display: grid;
    grid-template-columns: 80px 320px 1fr 190px 190px;
    padding: 18px 18px;
    border-radius: 18px;
    background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%);
    box-shadow: 0 10px 24px rgba(55, 66, 108, 0.06);
    border: 1px solid #eef1f8;
    align-items: center;
}

.log-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #303133;
    font-size: 14px;
    line-height: 22px;
    text-align: center;
}

.log-cell--reason {
    padding: 0 16px;
}

.log-status-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 78px;
    height: 34px;
    padding: 0 16px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
}

.log-status-tag.is-pending {
    color: #a56a00;
    background: rgba(255, 180, 36, 0.16);
}

.log-status-tag.is-pass {
    color: #1f9b5d;
    background: rgba(103, 194, 58, 0.15);
}

.log-status-tag.is-reject {
    color: #f56c6c;
    background: rgba(245, 108, 108, 0.14);
}

.log-image-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
}

.log-image-item {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid #e8ebf5;
    box-shadow: 0 6px 14px rgba(70, 82, 124, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.log-image-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 18px rgba(70, 82, 124, 0.14);
}

.log-image-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.log-reject-text {
    color: #303133;
    text-align: center;
    word-break: break-all;
}

.log-empty-text {
    color: #b8becd;
}

.log-empty-state {
    min-height: 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #8c93a8;
}

.log-empty-state i {
    font-size: 40px;
    color: #c5cbdb;
}

.log-empty-state__title {
    margin-top: 14px;
    color: #43485c;
    font-size: 16px;
    font-weight: 600;
}

.log-empty-state__desc {
    margin-top: 8px;
    font-size: 13px;
    line-height: 20px;
}
</style>
