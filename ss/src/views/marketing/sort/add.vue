<template>
    <div class="factor-detail-page" v-loading="pageLoading">


        <!-- 基本信息卡片 -->
        <el-card shadow="never" class="info-card">
            <!-- 头部返回 -->
            <div class="page-header" @click="goBack">
                <i class="el-icon-arrow-left"></i>
                <div class="page-title">编辑影响因素</div>
            </div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">影响因素</span>
                    <span class="info-value">{{ detailData.factorName || '-' }}</span>
                    <span class="info-label">因素编码</span>
                    <span class="info-value">{{ detailData.factorCode || '-' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">类型</span>
                    <span class="info-value">
                        <el-tag :type="detailData.factorType === '2' ? 'warning' : 'info'" size="small">
                            {{ detailData.factorTypeDesc || '-' }}
                        </el-tag>
                    </span>
                </div>
                <div class="info-row" v-if="detailData.remark">
                    <span class="info-label">备注</span>
                    <span class="info-value remark-value">{{ detailData.remark }}</span>
                </div>
            </div>
        </el-card>

        <!-- 得分配置卡片 -->
        <el-card shadow="never" class="config-card">
            <div slot="header" class="card-header">
                <span class="header-title">得分配置</span>
            </div>

            <div v-if="isClubType" class="range-config club-config">
                <div class="club-config__tip">
                    <span class="club-config__tip-main">支持多组不同俱乐部，维护不同得分</span>
                    <span class="club-config__tip-sub">归属俱乐部加分</span>
                </div>
                <div class="club-config__panel">
                    <div class="club-config__title">编辑</div>
                    <div class="club-config__body" v-if="clubRangeList.length">
                        <div v-for="(item, index) in clubRangeList" :key="index" class="club-config__row">
                            <div class="club-config__field">
                                <div class="club-config__label"><span class="club-config__required">*</span>俱乐部{{ index
                                    + 1 }}</div>
                                <el-select v-model="item.rangeName" filterable placeholder="请选择俱乐部"
                                    class="club-config__select">
                                    <el-option v-for="option in getAvailableClubOptions(index)" :key="option.tradeId"
                                        :label="option.tradeName" :value="option.tradeName" />
                                </el-select>
                            </div>
                            <div class="club-config__field club-config__field--score">
                                <div class="club-config__label"><span class="club-config__required">*</span>得分</div>
                                <el-input v-model="item.score" placeholder="请输入得分" class="club-config__score"
                                    @input="handleClubScoreInput(item)"></el-input>
                            </div>
                            <div class="club-config__actions">
                                <el-button v-if="clubRangeList.length > 1" type="text" icon="el-icon-delete"
                                    class="action-btn delete-btn" @click="removeClubRange(index)">
                                </el-button>
                                <el-button v-if="isLastClubRange(index)" type="text" icon="el-icon-plus"
                                    class="action-btn add-btn" @click="addClubRange">
                                </el-button>
                            </div>
                        </div>
                    </div>
                    <div v-else class="empty-state">
                        <p>暂无俱乐部加分配置</p>
                        <el-button type="primary" size="small" @click="initDefaultClubRange">
                            <i class="el-icon-plus"></i> 添加俱乐部
                        </el-button>
                    </div>
                </div>
            </div>

            <div v-else-if="isSubSkillType" class="sub-skill-config">
                <el-form ref="subSkillForm" :model="subSkillForm" :rules="subSkillRules" label-width="130px">
                    <el-form-item label="单技能匹配得分" prop="score">
                        <el-input v-model="subSkillForm.score" placeholder="请输入单技能匹配得分"
                            class="sub-skill-config__input" @input="handleSubSkillScoreInput('score')">
                            <template slot="append">分</template>
                        </el-input>
                    </el-form-item>
                    <el-form-item label="总得分上限" prop="scoreSum">
                        <el-input v-model="subSkillForm.scoreSum" placeholder="请输入总得分上限"
                            class="sub-skill-config__input" @input="handleSubSkillScoreInput('scoreSum')">
                            <template slot="append">分</template>
                        </el-input>
                    </el-form-item>
                </el-form>
            </div>

            <div v-else-if="isRandomType" class="random-config">
                <el-form ref="randomFormRef" :model="randomForm" :rules="randomRules" label-width="110px">
                    <el-form-item>
                        <template slot="label">
                            <span class="random-config__label"><span class="club-config__required">*</span>随机值</span>
                        </template>
                        <div class="random-config__range">
                            <el-form-item prop="score" class="random-config__inner-item">
                                <el-input v-model="randomForm.score" placeholder="请输入最小值"
                                    class="random-config__input" @input="handleRandomInput('score')">
                                    <template slot="append">分</template>
                                </el-input>
                            </el-form-item>
                            <span class="random-config__separator">-</span>
                            <el-form-item prop="scoreSum" class="random-config__inner-item">
                                <el-input v-model="randomForm.scoreSum" placeholder="请输入最大值"
                                    class="random-config__input" @input="handleRandomInput('scoreSum')">
                                    <template slot="append">分</template>
                                </el-input>
                            </el-form-item>
                        </div>
                    </el-form-item>
                </el-form>
            </div>

            <!-- 普通类型：单个得分输入 -->
            <div v-else-if="!isRangeType" class="normal-config">
                <el-form ref="normalForm" :model="normalForm" :rules="normalRules" label-width="80px">
                    <el-form-item label="得分" prop="score">
                        <el-input v-model="normalForm.score" placeholder="请输入得分" class="score-input"
                            @input="handleNormalScoreInput">
                            <template slot="append">分</template>
                        </el-input>
                    </el-form-item>
                </el-form>
            </div>

            <!-- 区间配置类型 -->
            <div v-else class="range-config">
                <!-- 年龄相近 -->
                <template v-if="detailData.factorCode === 'age'">
                    <div class="range-table age-table">
                        <div class="table-header">
                            <span class="col-label">年龄差区间</span>
                            <span class="col-start">起始岁差</span>
                            <span class="col-end">结束岁差</span>
                            <span class="col-score">得分</span>
                            <span class="col-action">操作</span>
                        </div>
                        <div class="table-body" v-if="ageRangeList.length > 0">
                            <div v-for="(item, index) in ageRangeList" :key="index" class="table-row">
                                <span class="col-label">区间{{ index + 1 }}</span>
                                <span class="col-start">{{ getAgeStartText(index) }}</span>
                                <span class="col-end">
                                    <template v-if="!isLastAgeRange(index)">
                                        <el-input v-model="item.maxValue" placeholder="请输入" size="small"
                                            class="range-input" @input="handleAgeMaxChange(index)">
                                            <template slot="append">岁</template>
                                        </el-input>
                                    </template>
                                    <template v-else>
                                        <span class="infinity-text">以上</span>
                                    </template>
                                </span>
                                <span class="col-score">
                                    <el-input v-model="item.score" placeholder="得分" size="small"
                                        class="score-input-small" @input="handleScoreInput(item)">
                                        <template slot="append">分</template>
                                    </el-input>
                                </span>
                                <span class="col-action">
                                    <el-button v-if="ageRangeList.length > 1 && isLastAgeRange(index)" type="text"
                                        icon="el-icon-delete" class="action-btn delete-btn"
                                        @click="removeAgeRange(index)">
                                    </el-button>
                                    <el-button v-if="isLastAgeRange(index)" type="text" icon="el-icon-plus"
                                        class="action-btn add-btn" @click="addAgeRange">
                                    </el-button>
                                </span>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            <p>暂无区间配置</p>
                            <el-button type="primary" size="small" @click="initDefaultAgeRange">
                                <i class="el-icon-plus"></i> 添加区间
                            </el-button>
                        </div>
                    </div>
                </template>

                <!-- 价格匹配 -->
                <template v-else-if="detailData.factorCode === 'price'">
                    <div class="range-table price-table">
                        <div class="table-header">
                            <span class="col-label">价格档位</span>
                            <span class="col-range">价格范围</span>
                            <span class="col-score">得分</span>
                        </div>
                        <div class="table-body">
                            <div v-for="(item, index) in priceRangeList" :key="index" class="table-row">
                                <span class="col-label">{{ getPriceLabel(index) }}</span>
                                <span class="col-range">
                                    <span class="price-range">
                                        <span class="price-start">{{ index === 0 ? '0' : (item.minValue || '-')
                                            }}</span>
                                        <span class="price-separator">~</span>
                                        <template v-if="!isLastPriceRange(index)">
                                            <el-input v-model="item.maxValue" placeholder="请输入" size="small"
                                                class="range-input" @input="handlePriceMaxChange(index)">
                                                <template slot="append">币</template>
                                            </el-input>
                                        </template>
                                        <template v-else>
                                            <span class="infinity-text">以上</span>
                                        </template>
                                    </span>
                                </span>
                                <span class="col-score">
                                    <el-input v-model="item.score" placeholder="得分" size="small"
                                        class="score-input-small" @input="handleScoreInput(item)">
                                        <template slot="append">分</template>
                                    </el-input>
                                </span>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- 接单量 -->
                <template v-else-if="detailData.factorCode === 'order_count'">
                    <div class="range-table order-table">
                        <div class="table-header">
                            <span class="col-label">接单量区间</span>
                            <span class="col-start">起始单数</span>
                            <span class="col-end">结束单数</span>
                            <span class="col-score">得分</span>
                            <span class="col-action">操作</span>
                        </div>
                        <div class="table-body" v-if="orderCountRangeList.length > 0">
                            <div v-for="(item, index) in orderCountRangeList" :key="index" class="table-row">
                                <span class="col-label">区间{{ index + 1 }}</span>
                                <span class="col-start">{{ getOrderCountStartText(index) }}</span>
                                <span class="col-end">
                                    <template v-if="!isLastOrderRange(index)">
                                        <el-input v-model="item.maxValue" placeholder="请输入" size="small"
                                            class="range-input" @input="handleOrderMaxChange(index)">
                                            <template slot="append">单</template>
                                        </el-input>
                                    </template>
                                    <template v-else>
                                        <span class="infinity-text">以上</span>
                                    </template>
                                </span>
                                <span class="col-score">
                                    <el-input v-model="item.score" placeholder="得分" size="small"
                                        class="score-input-small" @input="handleScoreInput(item)">
                                        <template slot="append">分</template>
                                    </el-input>
                                </span>
                                <span class="col-action">
                                    <el-button v-if="orderCountRangeList.length > 1 && isLastOrderRange(index)"
                                        type="text" icon="el-icon-delete" class="action-btn delete-btn"
                                        @click="removeOrderCountRange(index)">
                                    </el-button>
                                    <el-button v-if="isLastOrderRange(index)" type="text" icon="el-icon-plus"
                                        class="action-btn add-btn" @click="addOrderCountRange">
                                    </el-button>
                                </span>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            <p>暂无区间配置</p>
                            <el-button type="primary" size="small" @click="initDefaultOrderCountRange">
                                <i class="el-icon-plus"></i> 添加区间
                            </el-button>
                        </div>
                    </div>
                </template>

                <!-- 新陪陪加分 -->
                <template v-else-if="detailData.factorCode === 'new_waiter'">
                    <div class="range-table fixed-table">
                        <div class="table-header">
                            <span class="col-label">入驻时长</span>
                            <span class="col-range">时长范围</span>
                            <span class="col-score">得分</span>
                        </div>
                        <div class="table-body">
                            <div v-for="(item, index) in newWaiterRangeList" :key="index" class="table-row">
                                <span class="col-label">新陪陪入驻时长</span>
                                <span class="col-range">
                                    <span class="fixed-range">{{ item.minValue }} ~ {{ item.maxValue }} 天</span>
                                </span>
                                <span class="col-score">
                                    <el-input v-model="item.score" placeholder="得分" size="small"
                                        class="score-input-small" @input="handleScoreInput(item)">
                                        <template slot="append">分</template>
                                    </el-input>
                                </span>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </el-card>

        <!-- 底部操作按钮 -->
        <div class="footer-actions">
            <el-button @click="goBack" class="cancel-btn">取消</el-button>
            <el-button type="primary" @click="submitForm" :loading="submitLoading" class="submit-btn">保存配置</el-button>
        </div>
    </div>
</template>

<script>
import { DetailRecommendFactor, EditsaveRanges } from "@/api/sort";
import { getunionList } from "@/api/table";

const createEmptyClubRange = (sortOrder = 1) => ({
    rangeId: null,
    configId: null,
    rangeName: "",
    minValue: null,
    maxValue: null,
    score: null,
    sortOrder
});

export default {
    name: 'FactorDetail',
    inject: ['switchToList', 'getSharedData', 'refreshList'],
    data() {
        return {
            pageLoading: false,
            submitLoading: false,
            sharedData: {},
            detailData: {},
            clubOptions: [],

            // 普通类型表单
            normalForm: { score: null },
            normalRules: {
                score: [
                    { required: true, message: '请输入得分', trigger: 'blur' }
                ]
            },
            subSkillForm: {
                score: null,
                scoreSum: null
            },
            subSkillRules: {
                score: [{ required: true, message: '请输入单技能匹配得分', trigger: 'blur' }],
                scoreSum: [{ required: true, message: '请输入总得分上限', trigger: 'blur' }]
            },
            randomForm: {
                score: null,
                scoreSum: null
            },
            randomRules: {
                score: [{ required: true, message: '请输入最小值', trigger: 'blur' }],
                scoreSum: [{ required: true, message: '请输入最大值', trigger: 'blur' }]
            },

            // 区间配置数据
            ageRangeList: [],
            priceRangeList: [
                { rangeId: null, minValue: 0, maxValue: null, score: null, sortOrder: 1 },
                { rangeId: null, minValue: null, maxValue: null, score: null, sortOrder: 2 },
                { rangeId: null, minValue: null, maxValue: null, score: null, sortOrder: 3 }
            ],
            clubRangeList: [],
            orderCountRangeList: [],
            newWaiterRangeList: [
                { rangeId: null, minValue: 0, maxValue: 7, score: null, sortOrder: 1 },
                { rangeId: null, minValue: 8, maxValue: 15, score: null, sortOrder: 2 },
                { rangeId: null, minValue: 16, maxValue: 30, score: null, sortOrder: 3 }
            ]
        }
    },

    computed: {
        isClubType() {
            return this.detailData.factorCode === 'club';
        },
        isSubSkillType() {
            return this.detailData.factorCode === 'sub_skill';
        },
        isRandomType() {
            return this.detailData.factorCode === 'random';
        },
        isRangeType() {
            const rangeCodes = ['age', 'price', 'order_count', 'new_waiter'];
            return rangeCodes.includes(this.detailData.factorCode);
        }
    },

    async created() {
        this.sharedData = this.getSharedData();
        if (this.sharedData.configId) {
            await this.fetchDetail();
        }
    },

    methods: {
        goBack() {
            this.switchToList();
        },

        // ==================== 数据获取 ====================
        async fetchDetail() {
            this.pageLoading = true;
            try {
                const res = await DetailRecommendFactor(this.sharedData.configId);
                if (res.success) {
                    this.detailData = res.data || {};
                    if (this.isClubType) {
                        await this.fetchClubOptions();
                    }
                    this.initFormData();
                } else {
                    this.$message.error(res.errorMessage || '获取详情失败');
                }
            } catch (error) {
                console.error("获取详情失败:", error);
                this.$message.error("获取详情失败");
            } finally {
                this.pageLoading = false;
            }
        },

        // ==================== 初始化表单数据 ====================
        initFormData() {
            const rangeList = this.detailData.rangeList || [];

            if (this.isClubType) {
                this.clubRangeList = rangeList.length
                    ? rangeList
                        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                        .map(item => ({
                            rangeId: item.rangeId || null,
                            configId: item.configId || this.sharedData.configId || null,
                            rangeName: item.rangeName || "",
                            minValue: item.minValue,
                            maxValue: item.maxValue,
                            score: item.score !== null ? parseInt(item.score) : null,
                            sortOrder: item.sortOrder || 1
                        }))
                    : [createEmptyClubRange(1)];
            } else if (this.isSubSkillType) {
                const firstRange = rangeList[0] || {};
                this.subSkillForm.score = firstRange.score !== null && firstRange.score !== undefined
                    ? parseInt(firstRange.score)
                    : (this.detailData.defaultScore || null);
                this.subSkillForm.scoreSum = firstRange.scoreSum !== null && firstRange.scoreSum !== undefined
                    ? parseInt(firstRange.scoreSum)
                    : null;
            } else if (this.isRandomType) {
                const firstRange = rangeList[0] || {};
                this.randomForm.score = firstRange.score !== null && firstRange.score !== undefined && firstRange.score !== ''
                    ? parseInt(firstRange.score)
                    : (firstRange.minValue !== null && firstRange.minValue !== undefined && firstRange.minValue !== ''
                        ? parseInt(firstRange.minValue)
                        : 0);
                this.randomForm.scoreSum = firstRange.scoreSum !== null && firstRange.scoreSum !== undefined && firstRange.scoreSum !== ''
                    ? parseInt(firstRange.scoreSum)
                    : (firstRange.maxValue !== null && firstRange.maxValue !== undefined && firstRange.maxValue !== ''
                        ? parseInt(firstRange.maxValue)
                        : null);
            } else if (!this.isRangeType) {
                // 普通类型：优先用 rangeList[0].score，否则用 defaultScore
                if (rangeList.length > 0 && rangeList[0].score !== null) {
                    this.normalForm.score = parseInt(rangeList[0].score);
                } else {
                    this.normalForm.score = this.detailData.defaultScore || null;
                }
            } else {
                // 区间类型
                if (rangeList && rangeList.length > 0) {
                    this.initRangeData(rangeList);
                }
                // 无数据时保持默认空数组
            }
        },
        async fetchClubOptions() {
            try {
                const res = await getunionList({
                    pageNum: 1,
                    pageSize: 999
                });
                if (res.code === 200) {
                    this.clubOptions = Array.isArray(res.data?.rows)
                        ? res.data.rows.map(item => ({
                            tradeId: item.tradeId,
                            tradeName: item.tradeName
                        }))
                        : [];
                }
            } catch (error) {
                this.clubOptions = [];
            }
        },
        getAvailableClubOptions(currentIndex) {
            const selectedNames = this.clubRangeList
                .map((item, index) => index === currentIndex ? "" : item.rangeName)
                .filter(Boolean);
            return this.clubOptions.filter(option => {
                return !selectedNames.includes(option.tradeName);
            });
        },

        initRangeData(rangeList) {
            const factorCode = this.detailData.factorCode;
            const sortedData = [...rangeList].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

            if (factorCode === 'age') {
                this.ageRangeList = sortedData.map(item => ({
                    rangeId: item.rangeId || null,
                    minValue: item.minValue !== null ? parseFloat(item.minValue) : null,
                    maxValue: item.maxValue !== null ? parseFloat(item.maxValue) : null,
                    score: item.score !== null ? parseInt(item.score) : null,
                    sortOrder: item.sortOrder || 1
                }));
            } else if (factorCode === 'price') {
                sortedData.forEach(item => {
                    const index = this.priceRangeList.findIndex(p => p.sortOrder === item.sortOrder);
                    if (index !== -1) {
                        this.$set(this.priceRangeList, index, {
                            ...this.priceRangeList[index],
                            rangeId: item.rangeId || null,
                            minValue: item.minValue !== null ? parseFloat(item.minValue) : this.priceRangeList[index].minValue,
                            maxValue: item.maxValue !== null ? parseFloat(item.maxValue) : null,
                            score: item.score !== null ? parseInt(item.score) : null
                        });
                    }
                });
            } else if (factorCode === 'order_count') {
                this.orderCountRangeList = sortedData.map(item => ({
                    rangeId: item.rangeId || null,
                    minValue: item.minValue !== null ? parseFloat(item.minValue) : null,
                    maxValue: item.maxValue !== null ? parseFloat(item.maxValue) : null,
                    score: item.score !== null ? parseInt(item.score) : null,
                    sortOrder: item.sortOrder || 1
                }));
            } else if (factorCode === 'new_waiter') {
                sortedData.forEach(item => {
                    const index = this.newWaiterRangeList.findIndex(p => p.sortOrder === item.sortOrder);
                    if (index !== -1) {
                        this.$set(this.newWaiterRangeList, index, {
                            ...this.newWaiterRangeList[index],
                            rangeId: item.rangeId || null,
                            score: item.score !== null ? parseInt(item.score) : null
                        });
                    }
                });
            }
        },

        // ==================== 默认区间初始化 ====================
        initDefaultAgeRange() {
            this.ageRangeList = [
                { rangeId: null, minValue: 0, maxValue: null, score: null, sortOrder: 1 }
            ];
        },

        initDefaultOrderCountRange() {
            this.orderCountRangeList = [
                { rangeId: null, minValue: 0, maxValue: null, score: null, sortOrder: 1 }
            ];
        },
        initDefaultClubRange() {
            this.clubRangeList = [createEmptyClubRange(1)];
        },

        // ==================== 输入处理 ====================
        handleNormalScoreInput(val) {
            this.normalForm.score = this.filterInteger(val);
        },
        handleSubSkillScoreInput(field) {
            this.subSkillForm[field] = this.filterInteger(this.subSkillForm[field]);
        },
        handleRandomInput(field) {
            this.randomForm[field] = this.filterInteger(this.randomForm[field]);
        },

        handleScoreInput(item) {
            item.score = this.filterInteger(item.score);
        },
        handleClubScoreInput(item) {
            item.score = this.filterInteger(item.score);
        },

        handleAgeMaxChange(index) {
            const item = this.ageRangeList[index];
            const newMaxValue = this.filterPositiveNumber(item.maxValue);
            this.$set(this.ageRangeList, index, { ...item, maxValue: newMaxValue });

            // 下一个区间的起点 = 当前区间的终点 + 1
            if (index < this.ageRangeList.length - 1) {
                const nextMin = newMaxValue !== null ? parseFloat(newMaxValue) + 1 : null;
                this.$set(this.ageRangeList[index + 1], 'minValue', nextMin);
            }
        },

        handlePriceMaxChange(index) {
            const item = this.priceRangeList[index];
            const newMaxValue = this.filterPositiveNumber(item.maxValue);
            this.$set(this.priceRangeList, index, { ...item, maxValue: newMaxValue });

            if (index < this.priceRangeList.length - 1) {
                const nextMin = newMaxValue !== null ? parseFloat(newMaxValue) + 1 : null;
                this.$set(this.priceRangeList[index + 1], 'minValue', nextMin);
            }
        },

        handleOrderMaxChange(index) {
            const item = this.orderCountRangeList[index];
            const newMaxValue = this.filterPositiveNumber(item.maxValue);
            this.$set(this.orderCountRangeList, index, { ...item, maxValue: newMaxValue });

            if (index < this.orderCountRangeList.length - 1) {
                const nextMin = newMaxValue !== null ? parseFloat(newMaxValue) + 1 : null;
                this.$set(this.orderCountRangeList[index + 1], 'minValue', nextMin);
            }
        },

        filterInteger(val) {
            if (val === null || val === undefined) return null;
            let num = String(val).replace(/[^\d]/g, '');
            if (num) {
                return parseInt(num, 10);
            }
            return null;
        },
        filterPositiveNumber(val) {
            if (val === null || val === undefined) return null;
            let strVal = String(val).replace(/[^\d.]/g, '');
            const parts = strVal.split('.');
            if (parts.length > 2) {
                strVal = parts[0] + '.' + parts.slice(1).join('');
            }
            if (strVal) {
                const num = parseFloat(strVal);
                return isNaN(num) ? null : num;
            }
            return null;
        },

        // ==================== 年龄相近操作 ====================
        isLastAgeRange(index) {
            return index === this.ageRangeList.length - 1;
        },

        getAgeStartText(index) {
            if (index === 0) return '0 岁';
            const val = this.ageRangeList[index].minValue;
            return val !== null ? `${val} 岁` : '-';
        },

        addAgeRange() {
            const lastIndex = this.ageRangeList.length - 1;
            this.$set(this.ageRangeList[lastIndex], 'maxValue', null);

            let newMinValue = null;
            const lastMax = this.ageRangeList[lastIndex].maxValue;
            if (lastMax !== null) {
                newMinValue = parseFloat(lastMax) + 1;
            }

            this.ageRangeList.push({
                rangeId: null,
                minValue: newMinValue,
                maxValue: null,
                score: null,
                sortOrder: this.ageRangeList.length + 1
            });
        },

        removeAgeRange(index) {
            if (this.ageRangeList.length <= 1) {
                this.$message.warning('至少保留一个区间');
                return;
            }
            this.ageRangeList.splice(index, 1);
            this.ageRangeList.forEach((item, i) => { item.sortOrder = i + 1; });
        },

        // ==================== 价格匹配操作 ====================
        getPriceLabel(index) {
            return ['低档', '中档', '高档'][index] || '';
        },

        isLastPriceRange(index) {
            return index === 2;
        },

        // ==================== 接单量操作 ====================
        isLastOrderRange(index) {
            return index === this.orderCountRangeList.length - 1;
        },

        getOrderCountStartText(index) {
            if (index === 0) return '0 单';
            const val = this.orderCountRangeList[index].minValue;
            return val !== null ? `${val} 单` : '-';
        },

        addOrderCountRange() {
            const lastIndex = this.orderCountRangeList.length - 1;
            this.$set(this.orderCountRangeList[lastIndex], 'maxValue', null);

            let newMinValue = null;
            const lastMax = this.orderCountRangeList[lastIndex].maxValue;
            if (lastMax !== null) {
                newMinValue = parseFloat(lastMax) + 1;
            }

            this.orderCountRangeList.push({
                rangeId: null,
                minValue: newMinValue,
                maxValue: null,
                score: null,
                sortOrder: this.orderCountRangeList.length + 1
            });
        },

        removeOrderCountRange(index) {
            if (this.orderCountRangeList.length <= 1) {
                this.$message.warning('至少保留一个区间');
                return;
            }
            this.orderCountRangeList.splice(index, 1);
            this.orderCountRangeList.forEach((item, i) => { item.sortOrder = i + 1; });
        },
        isLastClubRange(index) {
            return index === this.clubRangeList.length - 1;
        },
        addClubRange() {
            this.clubRangeList.push(createEmptyClubRange(this.clubRangeList.length + 1));
        },
        removeClubRange(index) {
            if (this.clubRangeList.length <= 1) {
                this.$message.warning('至少保留一个俱乐部配置');
                return;
            }
            this.clubRangeList.splice(index, 1);
            this.clubRangeList.forEach((item, i) => {
                item.sortOrder = i + 1;
            });
        },

        // ==================== 验证 ====================
        validateRangeData() {
            const factorCode = this.detailData.factorCode;
            if (factorCode === 'age' && this.ageRangeList.length === 0) {
                this.$message.warning('请先添加区间配置');
                return false;
            }
            if (factorCode === 'order_count' && this.orderCountRangeList.length === 0) {
                this.$message.warning('请先添加区间配置');
                return false;
            }

            if (factorCode === 'club') {
                return this.validateClubRange();
            } else if (factorCode === 'age') {
                return this.validateAgeRange();
            } else if (factorCode === 'price') {
                return this.validatePriceRange();
            } else if (factorCode === 'order_count') {
                return this.validateOrderCountRange();
            } else if (factorCode === 'new_waiter') {
                return this.validateNewWaiterRange();
            }
            return true;
        },
        validateClubRange() {
            if (!this.clubRangeList.length) {
                this.$message.warning('请先添加俱乐部配置');
                return false;
            }
            const selectedNames = new Set();
            for (let i = 0; i < this.clubRangeList.length; i++) {
                const item = this.clubRangeList[i];
                if (!item.rangeName) {
                    this.$message.error(`请选择俱乐部${i + 1}`);
                    return false;
                }
                if (selectedNames.has(item.rangeName)) {
                    this.$message.error(`俱乐部${item.rangeName}已重复选择`);
                    return false;
                }
                selectedNames.add(item.rangeName);
                if (item.score === null || item.score === undefined || item.score === '') {
                    this.$message.error(`请填写俱乐部${i + 1}的得分`);
                    return false;
                }
                if (item.score < 0) {
                    this.$message.error(`俱乐部${i + 1}得分不能小于0`);
                    return false;
                }
            }
            return true;
        },

        validateAgeRange() {
            for (let i = 0; i < this.ageRangeList.length; i++) {
                const item = this.ageRangeList[i];
                if (item.score === null || item.score === undefined || item.score === '') {
                    this.$message.error(`请填写年龄差区间${i + 1}的得分`);
                    return false;
                }
                if (item.score < 0) {
                    this.$message.error(`年龄差区间${i + 1}得分不能小于0`);
                    return false;
                }
                if (!this.isLastAgeRange(i)) {
                    if (item.maxValue === null || item.maxValue === undefined || item.maxValue === '') {
                        this.$message.error(`请填写年龄差区间${i + 1}的结束岁差`);
                        return false;
                    }
                    const minValue = i === 0 ? 0 : item.minValue;
                    if (parseFloat(item.maxValue) <= parseFloat(minValue)) {
                        this.$message.error(`年龄差区间${i + 1}的结束岁差必须大于起始岁差`);
                        return false;
                    }
                }
            }
            return true;
        },

        validatePriceRange() {
            for (let i = 0; i < this.priceRangeList.length; i++) {
                const item = this.priceRangeList[i];
                if (item.score === null || item.score === undefined || item.score === '') {
                    this.$message.error(`请填写${this.getPriceLabel(i)}的得分`);
                    return false;
                }
                if (item.score < 0) {
                    this.$message.error(`${this.getPriceLabel(i)}得分不能小于0`);
                    return false;
                }
                if (!this.isLastPriceRange(i)) {
                    if (item.maxValue === null || item.maxValue === undefined || item.maxValue === '') {
                        this.$message.error(`请填写${this.getPriceLabel(i)}的结束价格`);
                        return false;
                    }
                    const minValue = i === 0 ? 0 : item.minValue;
                    if (parseFloat(item.maxValue) <= parseFloat(minValue)) {
                        this.$message.error(`${this.getPriceLabel(i)}的结束价格必须大于起始价格`);
                        return false;
                    }
                }
            }
            return true;
        },

        validateOrderCountRange() {
            for (let i = 0; i < this.orderCountRangeList.length; i++) {
                const item = this.orderCountRangeList[i];
                if (item.score === null || item.score === undefined || item.score === '') {
                    this.$message.error(`请填写接单量区间${i + 1}的得分`);
                    return false;
                }
                if (item.score < 0) {
                    this.$message.error(`接单量区间${i + 1}得分不能小于0`);
                    return false;
                }
                if (!this.isLastOrderRange(i)) {
                    if (item.maxValue === null || item.maxValue === undefined || item.maxValue === '') {
                        this.$message.error(`请填写接单量区间${i + 1}的结束单数`);
                        return false;
                    }
                    const minValue = i === 0 ? 0 : item.minValue;
                    if (parseFloat(item.maxValue) <= parseFloat(minValue)) {
                        this.$message.error(`接单量区间${i + 1}的结束单数必须大于起始单数`);
                        return false;
                    }
                }
            }
            return true;
        },

        validateNewWaiterRange() {
            for (let i = 0; i < this.newWaiterRangeList.length; i++) {
                const item = this.newWaiterRangeList[i];
                if (item.score === null || item.score === undefined || item.score === '') {
                    this.$message.error(`请填写${i === 0 ? '0-7天' : i === 1 ? '8-15天' : '16-30天'}的得分`);
                    return false;
                }
                if (item.score < 0) {
                    this.$message.error('得分不能小于0');
                    return false;
                }
            }
            return true;
        },

        // ==================== 构建提交数据 ====================
        buildSubmitData() {
            const factorCode = this.detailData.factorCode;
            const configId = this.sharedData.configId;
            let rangeList = [];

            if (this.isClubType) {
                rangeList = this.clubRangeList.map((item, index) => ({
                    rangeId: item.rangeId || 0,
                    configId: configId,
                    rangeName: item.rangeName,
                    minValue: null,
                    maxValue: null,
                    score: item.score,
                    sortOrder: index + 1
                }));
            } else if (this.isRandomType) {
                const firstRange = (this.detailData.rangeList || [])[0] || {};
                rangeList = [{
                    rangeId: firstRange.rangeId || 0,
                    configId: configId,
                    rangeName: '默认',
                    minValue: null,
                    maxValue: null,
                    score: this.randomForm.score,
                    scoreSum: this.randomForm.scoreSum,
                    sortOrder: 1
                }];
            } else if (this.isSubSkillType) {
                const firstRange = (this.detailData.rangeList || [])[0] || {};
                rangeList = [{
                    rangeId: firstRange.rangeId || 0,
                    configId: configId,
                    rangeName: '默认',
                    minValue: 0,
                    maxValue: 0,
                    score: this.subSkillForm.score,
                    scoreSum: this.subSkillForm.scoreSum,
                    sortOrder: 1
                }];
            } else if (!this.isRangeType) {
                rangeList = [{
                    rangeId: 0,
                    configId: configId,
                    rangeName: '默认',
                    minValue: 0,
                    maxValue: 0,
                    score: this.normalForm.score,
                    sortOrder: 1
                }];
            } else if (factorCode === 'age') {
                rangeList = this.ageRangeList.map((item, index) => ({
                    rangeId: item.rangeId || 0,
                    configId: configId,
                    rangeName: `区间${index + 1}`,
                    minValue: index === 0 ? 0 : item.minValue,
                    maxValue: this.isLastAgeRange(index) ? null : item.maxValue,
                    score: item.score,
                    sortOrder: index + 1
                }));
            } else if (factorCode === 'price') {
                rangeList = this.priceRangeList.map((item, index) => ({
                    rangeId: item.rangeId || 0,
                    configId: configId,
                    rangeName: this.getPriceLabel(index),
                    minValue: index === 0 ? 0 : item.minValue,
                    maxValue: this.isLastPriceRange(index) ? null : item.maxValue,
                    score: item.score,
                    sortOrder: index + 1
                }));
            } else if (factorCode === 'order_count') {
                rangeList = this.orderCountRangeList.map((item, index) => ({
                    rangeId: item.rangeId || 0,
                    configId: configId,
                    rangeName: `区间${index + 1}`,
                    minValue: index === 0 ? 0 : item.minValue,
                    maxValue: this.isLastOrderRange(index) ? null : item.maxValue,
                    score: item.score,
                    sortOrder: index + 1
                }));
            } else if (factorCode === 'new_waiter') {
                rangeList = this.newWaiterRangeList.map((item, index) => ({
                    rangeId: item.rangeId || 0,
                    configId: configId,
                    rangeName: index === 0 ? '0-7天' : index === 1 ? '8-15天' : '16-30天',
                    minValue: item.minValue,
                    maxValue: item.maxValue,
                    score: item.score,
                    sortOrder: index + 1
                }));
            }

            return rangeList;
        },

        // ==================== 提交 ====================
        async submitForm() {
            if (this.isClubType) {
                if (!this.validateRangeData()) {
                    return;
                }
            } else if (this.isRandomType) {
                try {
                    await this.$refs.randomFormRef.validate();
                } catch {
                    return;
                }
                const { score, scoreSum } = this.randomForm;
                if (score === null || score === undefined || score === '') {
                    this.$message.error('请输入最小值');
                    return;
                }
                if (scoreSum === null || scoreSum === undefined || scoreSum === '') {
                    this.$message.error('请输入最大值');
                    return;
                }
                if (score < 0 || scoreSum < 0) {
                    this.$message.error('随机值不能小于0');
                    return;
                }
                if (Number(score) > Number(scoreSum)) {
                    this.$message.error('最小值不能大于最大值');
                    return;
                }
            } else if (this.isSubSkillType) {
                try {
                    await this.$refs.subSkillForm.validate();
                } catch {
                    return;
                }
                if (this.subSkillForm.score === null || this.subSkillForm.score === undefined || this.subSkillForm.score === '') {
                    this.$message.error('请输入单技能匹配得分');
                    return;
                }
                if (this.subSkillForm.scoreSum === null || this.subSkillForm.scoreSum === undefined || this.subSkillForm.scoreSum === '') {
                    this.$message.error('请输入总得分上限');
                    return;
                }
                if (this.subSkillForm.score < 0 || this.subSkillForm.scoreSum < 0) {
                    this.$message.error('得分不能小于0');
                    return;
                }
            } else if (!this.isRangeType) {
                try {
                    await this.$refs.normalForm.validate();
                } catch {
                    return;
                }
                const score = this.normalForm.score;
                if (score === null || score === undefined || score === '') {
                    this.$message.error('请输入得分');
                    return;
                }
                if (score < 0) {
                    this.$message.error('得分不能小于0');
                    return;
                }
            } else {
                if (!this.validateRangeData()) {
                    return;
                }
            }

            const submitData = this.buildSubmitData();

            this.submitLoading = true;
            try {
                const res = await EditsaveRanges(submitData);
                if (res.success) {
                    this.$message.success('保存成功');
                    // 先刷新列表
                    if (this.refreshList) {
                        this.refreshList();
                    }
                    this.goBack();
                } else {
                    this.$message.error(res.errorMessage || '保存失败');
                }
            } catch (error) {
                console.error("保存失败:", error);
                this.$message.error("保存失败，请稍后重试");
            } finally {
                this.submitLoading = false;
            }
        }
    }
}
</script>

<style scoped lang="scss">
.factor-detail-page {
    height: 100%;
    background: #F5F7FA;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    box-sizing: border-box;
}

.page-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    cursor: pointer;
    flex-shrink: 0;

    i {
        font-size: 16px;
        margin-right: 10px;
        color: #606266;
        transition: color 0.3s;
    }

    &:hover i {
        color: #8F03FF;
    }

    .page-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
    }
}

.info-card {
    flex-shrink: 0;
    margin-bottom: 20px;
    border-radius: 12px;
    border: none;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

    ::v-deep .el-card__header {
        padding: 16px 24px;
        border-bottom: 1px solid #F0F0F0;
    }

    ::v-deep .el-card__body {
        padding: 20px 24px;
    }
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .header-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
    }
}

.info-content {
    .info-row {
        display: flex;
        align-items: flex-start;
        margin-bottom: 16px;

        &:last-child {
            margin-bottom: 0;
        }

        .info-label {
            width: 80px;
            flex-shrink: 0;
            color: #909399;
            font-size: 14px;
        }

        .info-value {
            width: 200px;
            flex-shrink: 0;
            color: #303133;
            font-size: 14px;

            &.highlight {
                color: #8F03FF;
                font-weight: 600;
            }

            &.remark-value {
                flex: 1;
                color: #606266;
            }
        }
    }
}

.config-card {
    flex: 1;
    border-radius: 12px;
    border: none;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

    ::v-deep .el-card__header {
        padding: 16px 24px;
        border-bottom: 1px solid #F0F0F0;
    }

    ::v-deep .el-card__body {
        padding: 24px;
    }
}

.normal-config {
    .score-input {
        width: 240px;
    }

    .input-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        font-size: 13px;
        color: #909399;

        i {
            color: #8F03FF;
        }
    }
}

.sub-skill-config {
    display: flex;
    flex-direction: column;
}

.sub-skill-config__title {
    margin-bottom: 48px;
    color: #303133;
    font-size: 28px;
    font-weight: 600;
    line-height: 40px;
}

.sub-skill-config__input {
    width: 160px;
}

.random-config {
    min-height: 260px;
    padding-top: 16px;
}

.random-config__range {
    display: flex;
    align-items: center;
    gap: 120px;
}

.random-config__inner-item {
    margin-bottom: 0;
}

.random-config__input {
    width: 160px;
}

.random-config__separator {
    color: #606266;
    font-size: 18px;
    font-weight: 500;
    line-height: 1;
}

.range-config {
    .club-config__tip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        color: #606266;
        font-size: 14px;
    }

    .club-config__tip-main {
        font-weight: 500;
    }

    .club-config__tip-sub {
        color: #303133;
        font-weight: 600;
    }

    .club-config__panel {
        min-height: 360px;
        padding: 14px 0 0;
        border: 1px solid #dcdfe6;
        background: #fff;
        border-radius: 10px;
    }

    .club-config__title {
        margin-bottom: 28px;
        padding: 0 28px;
        color: #303133;
        font-size: 16px;
        font-weight: 600;
    }

    .club-config__body {
        padding: 0 28px 24px;
    }

    .club-config__row {
        display: flex;
        align-items: center;
        gap: 30px;
        margin-bottom: 24px;
    }

    .club-config__field {
        display: flex;
        align-items: center;
    }

    .club-config__field--score {
        gap: 14px;
    }

    .club-config__label {
        margin-right: 12px;
        color: #303133;
        font-size: 14px;
        white-space: nowrap;
    }

    .club-config__required {
        margin-right: 4px;
        color: #f56c6c;
    }

    .club-config__select {
        width: 244px;
    }

    .club-config__score {
        width: 120px;
    }

    .club-config__actions {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .range-table {
        border: 1px solid #EBEEF5;
        border-radius: 10px;
        overflow: hidden;
        width: 100%;

        .table-header {
            display: flex;
            align-items: center;
            padding: 14px 20px;
            background: #F6F6FB;
            border-bottom: 1px solid #EBEEF5;
            font-weight: 600;
            color: #303133;
            font-size: 14px;
        }

        .table-body {
            background: #FFFFFF;
        }

        .table-row {
            display: flex;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #F0F0F0;
            transition: background 0.3s;

            &:last-child {
                border-bottom: none;
            }

            &:hover {
                background: #FAFAFC;
            }
        }

        &.age-table,
        &.order-table {
            .table-header {
                .col-label {
                    width: 130px;
                    text-align: center;
                    font-size: 14px;
                }

                .col-start {
                    width: 100px;
                    text-align: center;
                }

                .col-end {
                    width: 160px;
                    text-align: center;
                }

                .col-score {
                    width: 160px;
                    text-align: center;
                }

                .col-action {
                    width: 100px;
                    text-align: center;
                }
            }

            .table-row {
                .col-label {
                    width: 130px;
                    text-align: center;
                    color: #606266;
                    font-size: 14px;
                }

                .col-start {
                    width: 100px;
                    text-align: center;
                    color: #303133;
                }

                .col-end {
                    width: 160px;
                    display: flex;
                    justify-content: center;
                }

                .col-score {
                    width: 160px;
                    display: flex;
                    justify-content: center;
                }

                .col-action {
                    width: 100px;
                    display: flex;
                    justify-content: center;
                    gap: 4px;
                }
            }
        }

        &.price-table {
            .table-header {
                .col-label {
                    width: 120px;
                    text-align: center;
                    font-size: 14px;
                }

                .col-range {
                    width: 260px;
                    text-align: center;
                }

                .col-score {
                    width: 180px;
                    text-align: center;
                }
            }

            .table-row {
                .col-label {
                    width: 120px;
                    text-align: center;
                    color: #606266;
                    font-weight: 500;
                    font-size: 14px;
                }

                .col-range {
                    width: 260px;
                    display: flex;
                    justify-content: center;
                }

                .col-score {
                    width: 180px;
                    display: flex;
                    justify-content: center;
                }
            }
        }

        &.fixed-table {
            .table-header {
                .col-label {
                    width: 160px;
                    text-align: center;
                    font-size: 14px;
                }

                .col-range {
                    width: 200px;
                    text-align: center;
                }

                .col-score {
                    width: 180px;
                    text-align: center;
                }
            }

            .table-row {
                .col-label {
                    width: 160px;
                    text-align: center;
                    color: #606266;
                    font-size: 14px;

                }

                .col-range {
                    width: 200px;
                    display: flex;
                    justify-content: center;
                }

                .col-score {
                    width: 180px;
                    display: flex;
                    justify-content: center;
                }
            }
        }
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 0;
        color: #909399;

        p {
            margin-bottom: 16px;
        }
    }

    .range-input,
    .score-input-small {
        width: 130px;
    }

    .action-btn {
        padding: 6px;
        font-size: 16px;
        border: none;

        &.delete-btn {
            color: #F56C6C;

            &:hover {
                background: rgba(245, 108, 108, 0.1);
                border-radius: 4px;
            }
        }

        &.add-btn {
            color: #8F03FF;

            &:hover {
                background: rgba(143, 3, 255, 0.1);
                border-radius: 4px;
            }
        }
    }

    .price-range {
        display: flex;
        align-items: center;
        gap: 10px;

        .price-start {
            min-width: 45px;
            text-align: right;
            color: #303133;
        }

        .price-separator {
            color: #909399;
        }
    }

    .fixed-range {
        padding: 8px 16px;
        background: #F5F7FA;
        border-radius: 6px;
        color: #606266;
        border: 1px solid #EBEEF5;
    }

    .infinity-text {
        padding: 8px 16px;
        background: linear-gradient(135deg, #F3E8FF 0%, #F8F0FF 100%);
        border-radius: 6px;
        color: #8F03FF;
        font-weight: 500;
        border: 1px solid #E8D5FF;
        font-size: 12px;
    }
}

.footer-actions {
    flex-shrink: 0;
    padding: 16px 0;
    display: flex;
    justify-content: flex-end;
    gap: 16px;

    .cancel-btn {
        min-width: 100px;
        height: 40px;
        border-radius: 8px;
    }

    .submit-btn {
        min-width: 120px;
        height: 40px;
        border-radius: 8px;
        background: #8F03FF;
        border-color: #8F03FF;

        &:hover,
        &:focus {
            background: #7A00E0;
            border-color: #7A00E0;
        }
    }
}

// 输入框统一样式
::v-deep .el-input-group {
    display: flex !important;
    align-items: stretch !important;

    .el-input__inner {
        height: 36px !important;
        line-height: 36px !important;
        border-top-right-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
        border-right: none !important;
    }

    .el-input-group__append {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 36px !important;
        padding: 0 12px !important;
        background-color: #F5F7FA !important;
        border: 1px solid #DCDFE6 !important;
        border-left: none !important;
        border-radius: 0 6px 6px 0 !important;
        box-sizing: border-box !important;
    }
}
</style>
