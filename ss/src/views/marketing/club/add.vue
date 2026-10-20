<template>
    <div class="factor-detail-page" v-loading="pageLoading">


        <!-- 基本信息卡片 -->
        <el-card shadow="never" class="info-card">
            <!-- 头部返回 -->
            <div slot="header"  class="page-header" @click="goBack">
                <i class="el-icon-arrow-left"></i>
                <div class="page-title">编辑{{ detailData.factorName || '影响因素' }}</div>
            </div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">影响因素</span>
                    <span class="info-value">{{ detailData.factorName || '-' }}</span>
                    <span class="info-label">因素类型</span>
                    <span class="info-value">
                        <el-tag :type="detailData.factorType === '2' ? 'warning' : 'info'" size="small">
                            {{ detailData.factorType === '1' ? '固定值' : '区间配置' }}
                        </el-tag>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">得分上限</span>
                    <span class="info-value highlight">{{ detailData.maxScore || '-' }}分</span>
                    <span class="info-label" v-if="detailData.unit">单位</span>
                    <span class="info-value" v-if="detailData.unit">{{ detailData.unit }}</span>
                </div>
            </div>
        </el-card>

        <!-- 得分配置卡片 -->
        <el-card shadow="never" class="config-card">
            <div slot="header" class="card-header">
                <span class="header-title">得分配置</span>
                <span class="score-range-badge" v-if="detailData.factorType === '2'">
                    <i class="el-icon-s-data"></i>
                    得分区间：0-{{ detailData.maxScore }}分
                </span>
            </div>

            <!-- 固定值类型：单个得分输入 -->
            <div v-if="detailData.factorType === '1'" class="normal-config">
                <el-form ref="fixedForm" :model="fixedForm" :rules="fixedRules" label-width="80px">
                    <el-form-item label="得分" prop="score">
                        <el-input v-model="fixedForm.score" placeholder="请输入得分" class="score-input"
                            @input="handleFixedScoreInput">
                            <template slot="append">分</template>
                        </el-input>
                        <div class="input-hint">
                            <i class="el-icon-info"></i>
                            得分范围：0-{{ detailData.maxScore }}分，仅支持整数
                        </div>
                    </el-form-item>
                </el-form>
            </div>

            <!-- 区间配置类型 -->
            <div v-else class="range-config">
                <div class="range-table">
                    <div class="table-header">
                        <span class="col-label">区间名称</span>
                        <span class="col-start">最小值</span>
                        <span class="col-end">最大值</span>
                        <span class="col-score">得分</span>
                        <span class="col-action">操作</span>
                    </div>
                    <div class="table-body" v-if="rangeList.length > 0">
                        <div v-for="(item, index) in rangeList" :key="index" class="table-row">
                            <span class="col-label">{{ item.ruleName || `区间${index + 1}` }}</span>
                            <span class="col-start">{{ index === 0 ? '0' : getFormattedValue(item.minValue) }}</span>
                            <span class="col-end">
                                <template v-if="!isLastRange(index)">
                                    <el-input v-model="item.maxValue" placeholder="请输入" size="small" class="range-input"
                                        @input="handleRangeMaxChange(index)">
                                        <template slot="append">{{ detailData.unit || '' }}</template>
                                    </el-input>
                                </template>
                                <template v-else>
                                    <span class="infinity-text">以上</span>
                                </template>
                            </span>
                            <span class="col-score">
                                <el-input v-model="item.score" placeholder="得分" size="small" class="score-input-small"
                                    @input="handleScoreInput(item)">
                                    <template slot="append">分</template>
                                </el-input>
                            </span>
                            <span class="col-action">
                                <el-button v-if="rangeList.length > 1 && isLastRange(index)" type="text"
                                    icon="el-icon-delete" class="action-btn delete-btn" @click="removeRange(index)">
                                </el-button>
                                <el-button v-if="isLastRange(index)" type="text" icon="el-icon-plus"
                                    class="action-btn add-btn" @click="addRange">
                                </el-button>
                            </span>
                        </div>
                    </div>
                    <div v-else class="empty-state">
                        <p>暂无区间配置</p>
                        <el-button type="primary" size="small" @click="initDefaultRange">
                            <i class="el-icon-plus"></i> 添加区间
                        </el-button>
                    </div>
                </div>
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
import { detailClub, addClub } from "@/api/club";

export default {
    name: 'ClubAdd',
    inject: ['switchToList', 'getSharedData', 'refreshList'],
    data() {
        return {
            pageLoading: false,
            submitLoading: false,
            sharedData: {},
            detailData: {},
            rangeList: [],
 
            // 固定值表单
            fixedForm: { score: null },
            fixedRules: {
                score: [{ required: true, message: '请输入得分', trigger: 'blur' }]
            }
        }
    },


    created() {
        // 首次创建时加载数据
        this.loadData();
    },

    activated() {
        // 每次激活时重新加载数据
        this.loadData();
    },

    methods: {
        goBack() {
            this.switchToList();
        },
        // 统一的数据加载方法
        async loadData() {
            // 先重置表单
            this.resetFormData();

            this.sharedData = this.getSharedData();
            if (this.sharedData.editRow) {
                // 先从列表带过来的数据初始化基本信息
                this.detailData = { ...this.sharedData.editRow };

                if (this.detailData.factorType === '1') {
                    // 固定值类型：从 scoreRule 解析得分
                    this.parseFixedScore();
                } else {
                    // 区间配置类型：查询详情
                    await this.fetchDetail();
                }
            }
        },
        // 重置表单数据
        resetFormData() {
            this.detailData = {};
            this.rangeList = [];
            this.fixedForm.score = null;
            this.$nextTick(() => {
                if (this.$refs.fixedForm) {
                    this.$refs.fixedForm.clearValidate();
                }
            });
        },

        // 解析固定值得分（从 scoreRule 中提取）
        parseFixedScore() {
            // scoreRule 格式如 "得10分" 或直接是数字
            const rule = this.detailData.scoreRule || '';
            const match = rule.match(/(\d+)/);
            if (match) {
                this.fixedForm.score = parseInt(match[1]);
            } else {
                this.fixedForm.score = null;
            }
        },

        // 查询区间详情
        async fetchDetail() {
            this.pageLoading = true;
            try {
                const res = await detailClub({ factorId: this.detailData.id });
                if (res.success) {
                    const data = res.data || [];
                    if (data.length > 0) {
                        this.rangeList = data
                            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                            .map(item => ({
                                id: item.id || null,
                                factorId: item.factorId || this.detailData.id,
                                ruleName: item.ruleName || '',
                                minValue: item.minValue !== null ? parseFloat(item.minValue) : null,
                                maxValue: item.maxValue !== null ? parseFloat(item.maxValue) : null,
                                score: item.score !== null ? parseInt(item.score) : null,
                                sortOrder: item.sortOrder || 1
                            }));
                    }
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

        // ==================== 区间操作 ====================
        isLastRange(index) {
            return index === this.rangeList.length - 1;
        },

        getFormattedValue(val) {
            if (val === null || val === undefined || val === '') return '-';
            return val;
        },

        initDefaultRange() {
            this.rangeList = [{
                id: null,
                factorId: this.detailData.id,
                ruleName: '区间1',
                minValue: 0,
                maxValue: null,
                score: null,
                sortOrder: 1
            }];
        },

        addRange() {
            const lastIndex = this.rangeList.length - 1;
            const lastItem = this.rangeList[lastIndex];

            let newMinValue = null;
            if (lastItem.maxValue !== null && lastItem.maxValue !== '') {
                newMinValue = parseInt(lastItem.maxValue, 10);
            }

            this.rangeList.push({
                id: null,
                factorId: this.detailData.id,
                ruleName: `区间${this.rangeList.length + 1}`,
                minValue: newMinValue,
                maxValue: null,
                score: null,
                sortOrder: this.rangeList.length + 1
            });
        },

        removeRange(index) {
            if (this.rangeList.length <= 1) {
                this.$message.warning('至少保留一个区间');
                return;
            }
            this.rangeList.splice(index, 1);
            this.rangeList.forEach((item, i) => {
                item.sortOrder = i + 1;
                item.ruleName = `区间${i + 1}`;
            });
        },

        // ==================== 输入处理 ====================
        handleFixedScoreInput(val) {
            this.fixedForm.score = this.filterInteger(val, this.detailData.maxScore);
        },

        handleScoreInput(item) {
            item.score = this.filterInteger(item.score, this.detailData.maxScore);
        },

        handleRangeMaxChange(index) {
            const item = this.rangeList[index];
            const newMaxValue = this.filterRangeMaxInteger(item.maxValue);
            this.$set(this.rangeList, index, { ...item, maxValue: newMaxValue });

            if (index < this.rangeList.length - 1) {
                const nextMin = newMaxValue !== null && newMaxValue !== '' ? parseInt(newMaxValue, 10) : null;
                this.$set(this.rangeList[index + 1], 'minValue', nextMin);
            }
        },

        filterInteger(val, max) {
            if (val === null || val === undefined) return null;
            let num = String(val).replace(/[^\d]/g, '');
            if (num) {
                let intVal = parseInt(num, 10);
                if (max && intVal > max) intVal = max;
                return intVal;
            }
            return null;
        },

        isPercentUnit() {
            const unit = String(this.detailData.unit || '');
            return unit.includes('%') || unit.includes('％');
        },

        filterRangeMaxInteger(val) {
            if (val === null || val === undefined) return null;
            const strVal = String(val).replace(/[^\d]/g, '');
            if (strVal) {
                let num = parseInt(strVal, 10);
                if (this.isPercentUnit() && num > 99) {
                    num = 99;
                }
                return Number.isNaN(num) ? null : num;
            }
            return null;
        },

        // ==================== 验证 ====================
        validateRangeData() {
            const maxScore = this.detailData.maxScore;
            for (let i = 0; i < this.rangeList.length; i++) {
                const item = this.rangeList[i];
                if (item.score === null || item.score === undefined || item.score === '') {
                    this.$message.error(`请填写区间${i + 1}的得分`);
                    return false;
                }
                if (item.score < 0 || item.score > maxScore) {
                    this.$message.error(`区间${i + 1}得分必须在0-${maxScore}之间`);
                    return false;
                }
                if (!this.isLastRange(i)) {
                    if (item.maxValue === null || item.maxValue === undefined || item.maxValue === '') {
                        this.$message.error(`请填写区间${i + 1}的最大值`);
                        return false;
                    }
                    if (this.isPercentUnit() && parseInt(item.maxValue, 10) > 99) {
                        this.$message.error(`区间${i + 1}的最大值不能超过99`);
                        return false;
                    }
                    const minValue = i === 0 ? 0 : item.minValue;
                    if (parseFloat(item.maxValue) <= parseFloat(minValue)) {
                        this.$message.error(`区间${i + 1}的最大值必须大于最小值`);
                        return false;
                    }
                }
            }
            return true;
        },

        // ==================== 构建提交数据 ====================
        buildSubmitData() {
            if (this.detailData.factorType === '1') {
                // 固定值类型
                return [{
                    id: 0,
                    factorId: this.detailData.id,
                    ruleName: '默认',
                    minValue: 0,
                    maxValue: 0,
                    score: this.fixedForm.score,
                    sortOrder: 1
                }];
            } else {
                // 区间配置类型
                return this.rangeList.map((item, index) => ({
                    id: item.id || 0,
                    factorId: this.detailData.id,
                    ruleName: item.ruleName || `区间${index + 1}`,
                    minValue: index === 0 ? 0 : item.minValue,
                    maxValue: this.isLastRange(index) ? null : item.maxValue,
                    score: item.score,
                    sortOrder: index + 1
                }));
            }
        },

        // ==================== 提交 ====================
        async submitForm() {
            if (this.detailData.factorType === '1') {
                try {
                    await this.$refs.fixedForm.validate();
                } catch {
                    return;
                }
                const score = this.fixedForm.score;
                const maxScore = this.detailData.maxScore;
                if (score === null || score === undefined || score === '') {
                    this.$message.error('请输入得分');
                    return;
                }
                if (score < 0 || score > maxScore) {
                    this.$message.error(`得分必须在0-${maxScore}之间`);
                    return;
                }
            } else {
                if (this.rangeList.length === 0) {
                    this.$message.warning('请先添加区间配置');
                    return;
                }
                if (!this.validateRangeData()) {
                    return;
                }
            }

            const submitData = this.buildSubmitData();

            this.submitLoading = true;
            try {
                const res = await addClub(submitData);
                if (res.success) {
                    this.$message.success('保存成功');
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

    .score-range-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: linear-gradient(135deg, #F3E8FF 0%, #F8F0FF 100%);
        border-radius: 20px;
        font-size: 13px;
        color: #8F03FF;

        i {
            font-size: 14px;
        }
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
            width: 150px;
            flex-shrink: 0;
            color: #303133;
            font-size: 14px;

            &.highlight {
                color: #8F03FF;
                font-weight: 600;
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

.range-config {
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

            .col-label {
                width: 120px;
                text-align: center;
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

            .col-label {
                width: 120px;
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

    .infinity-text {
        font-size: 12px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #F3E8FF 0%, #F8F0FF 100%);
        border-radius: 6px;
        color: #8F03FF;
        font-weight: 500;
        border: 1px solid #E8D5FF;
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
