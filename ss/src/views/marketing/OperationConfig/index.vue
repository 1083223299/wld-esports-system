<template>
    <div class="operation-config-page" v-loading="pageLoading">
        <div class="hero-tabs" role="tablist" aria-label="保证金配置类型">
            <button
                v-for="item in typeOptions"
                :key="item.value"
                type="button"
                class="hero-tab"
                :class="{ 'is-active': activeType === item.value }"
                role="tab"
                :aria-selected="activeType === item.value"
                @click="handleTypeChange(item.value)"
            >
                <div class="hero-tab__icon">
                    <i :class="item.value === 'personal' ? 'el-icon-user' : 'el-icon-office-building'" />
                </div>
                <div class="hero-tab__body">
                    <div class="hero-tab__title">
                        {{ item.label }}
                        <em v-if="activeType === item.value">当前</em>
                    </div>
                    <div class="hero-tab__desc">{{ item.hint }}</div>
                </div>
                <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
            </button>
        </div>

        <div class="config-shell">
            <div class="config-shell__body">
                <div v-if="activeType === 'personal'" class="module-stack">
                    <section class="module-card module-card--amount">
                        <div class="module-card__head">
                            <div class="module-card__meta">
                                <span class="module-card__serial">01</span>
                                <div>
                                    <div class="module-card__title">金额配置</div>
                                    <div class="module-card__desc">配置充足金额、预警金额与最低金额阈值。</div>
                                </div>
                            </div>
                        </div>

                        <div class="module-card__surface">
                            <div v-if="!isSectionEditing('personalAmount')" class="display-panel">
                                <div class="display-panel__actions">
                                    <el-button class="action-btn display-edit-btn1" type="primary" icon="el-icon-edit"
                                        @click="startSectionEdit('personalAmount')">
                                        编辑
                                    </el-button>
                                </div>
                                <div class="display-stack display-stack--amount">
                                    <div class="display-item display-item--hero display-item--amount-main">
                                        <div class="display-item__top">
                                            <div class="display-item__label">充足金额</div>
                                            <span class="display-item__tag">安全线</span>
                                        </div>
                                        <div class="display-item__value">{{ formatAmountText(personalForm.depositAmount)
                                            }}</div>
                                        <div class="display-item__sub">达到该金额后，保证金状态视为充足。</div>
                                    </div>
                                    <div class="display-item display-item--hero display-item--amount-warning">
                                        <div class="display-item__top">
                                            <div class="display-item__label">预警金额</div>
                                            <span class="display-item__tag">提醒线</span>
                                        </div>
                                        <div class="display-item__value">{{ formatAmountText(personalForm.warningAmount)
                                            }}</div>
                                        <div class="display-item__sub">低于该金额时，对用户展示预警提示。</div>
                                    </div>
                                    <div class="display-item display-item--hero display-item--amount-limit">
                                        <div class="display-item__top">
                                            <div class="display-item__label">最低金额</div>
                                            <span class="display-item__tag">限制线</span>
                                        </div>
                                        <div class="display-item__value">{{ formatAmountText(personalForm.minAmount) }}
                                        </div>
                                        <div class="display-item__sub">低于该金额时，限制技术陪继续接单。</div>
                                    </div>
                                </div>
                                <!-- <div class="module-note">建议关系：充足金额 ≥ 预警金额 ≥ 最低金额。</div> -->
                            </div>
                            <template v-else>
                                <div class="display-panel__actions">
                                    <el-button class="action-btn"
                                        @click="cancelSectionEdit('personalAmount')">取消</el-button>
                                    <el-button type="primary" class="save-btn" :loading="submittingMap.personalAmount"
                                        @click="submitPersonalAmount">
                                        完成
                                    </el-button>
                                </div>
                                <el-form ref="personalAmountForm" :model="personalForm" :rules="personalAmountRules"
                                    label-position="top">
                                    <div class="module-grid module-grid--amount">
                                        <el-form-item label="充足金额" prop="depositAmount">
                                            <el-input-number v-model="personalForm.depositAmount" :min="0"
                                                :precision="0" :step="1" controls-position="right" />
                                        </el-form-item>
                                        <el-form-item label="预警金额" prop="warningAmount">
                                            <el-input-number v-model="personalForm.warningAmount" :min="0"
                                                :precision="0" :step="1" controls-position="right" />
                                        </el-form-item>
                                        <el-form-item label="最低金额" prop="minAmount">
                                            <el-input-number v-model="personalForm.minAmount" :min="0" :precision="0"
                                                :step="1" controls-position="right" />
                                        </el-form-item>
                                    </div>
                                </el-form>
                                <!-- <div class="module-note">建议关系：充足金额 ≥ 预警金额 ≥ 最低金额。</div> -->
                            </template>
                        </div>
                    </section>

                    <section class="module-card module-card--withdraw">
                        <div class="module-card__head">
                            <div class="module-card__meta">
                                <span class="module-card__serial">02</span>
                                <div>
                                    <div class="module-card__title">提现配置</div>
                                    <div class="module-card__desc">配置保证金缴纳后可提现的出账天数。</div>
                                </div>
                            </div>
                        </div>

                        <div class="module-card__surface">
                            <div v-if="!isSectionEditing('personalWithdraw')" class="display-panel">
                                <div class="display-panel__actions">
                                    <el-button class="action-btn display-edit-btn1" type="primary" icon="el-icon-edit"
                                        @click="startSectionEdit('personalWithdraw')">
                                        编辑
                                    </el-button>
                                </div>
                                <div class="withdraw-hero">
                                    <div class="withdraw-hero__content withdraw-hero__content--sentence">
                                        <span class="withdraw-hero__prefix">保证金出账期</span>
                                        <span class="withdraw-hero__days">{{ hasDisplayValue(personalForm.withdrawDays)
                                            ?
                                            personalForm.withdrawDays : '--' }}</span>
                                        <span class="withdraw-hero__unit">天后可提现</span>
                                    </div>
                                    <div class="withdraw-hero__desc">保证金缴纳完成后，需等待出账期结束才能发起提现。</div>
                                </div>
                            </div>
                            <template v-else>
                                <div class="display-panel__actions">
                                    <el-button class="action-btn"
                                        @click="cancelSectionEdit('personalWithdraw')">取消</el-button>
                                    <el-button type="primary" class="save-btn" :loading="submittingMap.personalWithdraw"
                                        @click="submitPersonalWithdraw">
                                        完成
                                    </el-button>
                                </div>
                                <el-form ref="personalWithdrawForm" :model="personalForm" :rules="personalWithdrawRules"
                                    label-position="top">
                                    <div class="module-grid module-grid--single">
                                        <el-form-item label="保证金出账期（天）" prop="withdrawDays">
                                            <el-input-number v-model="personalForm.withdrawDays" :min="0" :precision="0"
                                                :step="1" controls-position="right" />
                                        </el-form-item>
                                    </div>
                                </el-form>
                            </template>
                        </div>
                    </section>

                    <section class="module-card module-card--editor module-card--rule">
                        <div class="module-card__head">
                            <div class="module-card__meta">
                                <span class="module-card__serial">03</span>
                                <div>
                                    <div class="module-card__title">规则配置</div>
                                    <div class="module-card__desc">填写个人保证金规则说明，保存时按原文提交。</div>
                                </div>
                            </div>
                        </div>

                        <div class="module-card__surface">
                            <div v-if="!isSectionEditing('personalRule')" class="display-panel">
                                <div class="display-panel__actions">
                                    <el-button class="action-btn display-edit-btn1" type="primary" icon="el-icon-edit"
                                        @click="startSectionEdit('personalRule')">
                                        编辑
                                    </el-button>
                                </div>
                                <div class="rich-display" v-html="formatRuleDisplay(personalForm.configDesc)"></div>
                            </div>
                            <template v-else>
                                <div class="display-panel__actions">
                                    <el-button class="action-btn"
                                        @click="cancelSectionEdit('personalRule')">取消</el-button>
                                    <el-button type="primary" class="save-btn" :loading="submittingMap.personalRule"
                                        @click="submitPersonalRule">
                                        完成
                                    </el-button>
                                </div>
                                <el-form ref="personalRuleForm" :model="personalForm" :rules="personalRuleRules"
                                    label-position="top">
                                    <el-form-item label="保证金规则说明" prop="configDesc">
                                        <div class="editor-wrapper">
                                            <quill-editor v-model="personalForm.configDesc" :options="editorOptions" />
                                        </div>
                                    </el-form-item>
                                </el-form>
                            </template>
                        </div>
                    </section>
                </div>

                <div v-else class="module-stack module-stack--club">
                    <section class="module-card module-card--amount module-card--club-amount">
                        <div class="module-card__head">
                            <div class="module-card__meta">
                                <span class="module-card__serial">01</span>
                                <div>
                                    <div class="module-card__title">金额配置</div>
                                    <div class="module-card__desc">按人数区间分组维护保证金策略，支持多组连续配置。</div>
                                </div>
                            </div>
                        </div>

                        <div class="module-card__surface">
                            <div v-if="!isSectionEditing('clubAmount')" class="display-panel">
                                <div class="display-panel__actions display-panel__actions--between">
                                    <div class="club-amount-meta">
                                        <span class="club-amount-meta__label">预警人数差</span>
                                        <span class="club-amount-meta__value">{{
                                            formatPeopleDiffText(clubForm.warningPeopleDiff)
                                            }}</span>
                                    </div>
                                    <el-button class="action-btn display-edit-btn1" type="primary" icon="el-icon-edit"
                                        @click="startSectionEdit('clubAmount')">
                                        编辑
                                    </el-button>
                                </div>
                                <div class="club-amount-tip">
                                    距离陪陪人数上限差值的提醒。例：若俱乐部属于 0-10 人的分组内，预警人数差为 3 人，则其下技术陪人数在 7~9 人时，按下一层级人数的金额进行计算提醒。
                                </div>
                                <div class="range-list range-list--strategy club-amount-scroll">
                                    <div v-for="(item, index) in clubForm.rangeList" :key="item.rowKey"
                                        class="range-card range-card--strategy">
                                        <div class="range-card__head">
                                            <div class="range-card__title-wrap">
                                                <div class="range-card__badge">{{ String(index + 1).padStart(2, '0') }}
                                                </div>
                                                <div class="range-card__title">人数区间 {{ getRangePreview(item, index) }}
                                                </div>
                                                <div class="range-card__desc">第 {{ index + 1 }} 组保证金策略</div>
                                            </div>
                                        </div>
                                        <div class="strategy-metrics">
                                            <div class="display-item display-item--mini">
                                                <div class="display-item__label">陪陪人数</div>
                                                <div class="display-item__value">{{ getRangePreview(item, index) }}
                                                </div>
                                            </div>
                                            <div class="display-item display-item--hero">
                                                <div class="display-item__label">充足金额</div>
                                                <div class="display-item__value">{{ formatAmountText(item.depositAmount)
                                                }}</div>
                                            </div>
                                            <div class="display-item display-item--hero">
                                                <div class="display-item__label">预警金额</div>
                                                <div class="display-item__value">{{ formatAmountText(item.warningAmount)
                                                }}</div>
                                            </div>
                                            <div class="display-item display-item--hero">
                                                <div class="display-item__label">最低金额</div>
                                                <div class="display-item__value">{{ formatAmountText(item.minAmount) }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <template v-else>
                                <div class="display-panel__actions">
                                    <el-button class="action-btn"
                                        @click="cancelSectionEdit('clubAmount')">取消</el-button>
                                    <el-button type="primary" class="save-btn" :loading="submittingMap.clubAmount"
                                        @click="submitClubAmount">
                                        完成
                                    </el-button>
                                </div>
                                <el-form ref="clubAmountForm" :model="clubForm" :rules="clubAmountRules"
                                    label-position="top">
                                    <div class="club-amount-inline">
                                        <el-form-item label="预警人数差" prop="warningPeopleDiff">
                                            <el-input-number v-model="clubForm.warningPeopleDiff" :min="0"
                                                :precision="0" :step="1" controls-position="right" />
                                        </el-form-item>
                                    </div>
                                </el-form>
                                <div class="club-amount-tip club-amount-tip--edit">
                                    距离陪陪人数上限差值的提醒。例：若俱乐部属于 0-10 人的分组内，预警人数差为 3 人，则其下技术陪人数在 7~9 人时，按下一层级人数的金额进行计算提醒。
                                </div>

                                <div class="range-toolbar">
                                    <div class="module-note">首组下限必须为 0，后续组下限需等于上一组上限 + 1，最后一组可不填上限。</div>
                                    <el-button type="primary" plain icon="el-icon-plus" class="range-toolbar__btn"
                                        @click="addRangeItem">
                                        新增区间
                                    </el-button>
                                </div>

                                <div v-if="clubForm.rangeList.length" class="range-editor-board club-amount-scroll">
                                    <div class="range-editor-head">
                                        <div class="range-editor-cell">人数下限</div>
                                        <div class="range-editor-cell">人数上限</div>
                                        <div class="range-editor-cell">充足金额</div>
                                        <div class="range-editor-cell">预警金额</div>
                                        <div class="range-editor-cell">最低金额</div>
                                        <div class="range-editor-cell range-editor-cell--action">操作</div>
                                    </div>

                                    <div v-for="(item, index) in clubForm.rangeList" :key="item.rowKey"
                                        class="range-editor-row">
                                        <div class="range-editor-cell">
                                            <el-input-number v-model="item.minPersonNum" :min="0" :precision="0"
                                                :step="1" controls-position="right" :disabled="index === 0" />
                                        </div>
                                        <div class="range-editor-cell">
                                            <el-input-number v-model="item.maxPersonNum" :min="0" :precision="0"
                                                :step="1" controls-position="right" />
                                        </div>
                                        <div class="range-editor-cell">
                                            <el-input-number v-model="item.depositAmount" :min="0" :precision="0"
                                                :step="1" controls-position="right" />
                                        </div>
                                        <div class="range-editor-cell">
                                            <el-input-number v-model="item.warningAmount" :min="0" :precision="0"
                                                :step="1" controls-position="right" />
                                        </div>
                                        <div class="range-editor-cell">
                                            <el-input-number v-model="item.minAmount" :min="0" :precision="0"
                                                :step="1" controls-position="right" />
                                        </div>
                                        <div class="range-editor-cell range-editor-cell--action">
                                            <div class="range-editor-row__meta">{{ getRangePreview(item, index) }}</div>
                                            <el-button v-if="clubForm.rangeList.length > 1" type="text"
                                                class="danger-text-btn" @click="removeRangeItem(index)">
                                                删除
                                            </el-button>
                                        </div>
                                    </div>
                                </div>

                                <div v-else class="empty-block">暂无区间配置，请先新增至少一个人数区间。</div>
                            </template>
                        </div>
                    </section>

                    <section class="module-card module-card--withdraw">
                        <div class="module-card__head">
                            <div class="module-card__meta">
                                <span class="module-card__serial">02</span>
                                <div>
                                    <div class="module-card__title">提现配置</div>
                                    <div class="module-card__desc">配置俱乐部保证金缴纳后的可提现周期。</div>
                                </div>
                            </div>
                        </div>

                        <div class="module-card__surface">
                            <div v-if="!isSectionEditing('clubWithdraw')" class="display-panel">
                                <div class="display-panel__actions">
                                    <el-button class="action-btn display-edit-btn1" type="primary" icon="el-icon-edit"
                                        @click="startSectionEdit('clubWithdraw')">
                                        编辑
                                    </el-button>
                                </div>
                                <div class="withdraw-hero">
                                    <div class="withdraw-hero__content withdraw-hero__content--sentence">
                                        <span class="withdraw-hero__prefix">保证金出账期</span>
                                        <span class="withdraw-hero__days">{{ hasDisplayValue(clubForm.withdrawDays) ?
                                            clubForm.withdrawDays : '--' }}</span>
                                        <span class="withdraw-hero__unit">天后可提现</span>
                                    </div>
                                    <div class="withdraw-hero__desc">保证金缴纳完成后，需等待出账期结束才能发起提现。</div>
                                </div>
                            </div>
                            <template v-else>
                                <div class="display-panel__actions">
                                    <el-button class="action-btn"
                                        @click="cancelSectionEdit('clubWithdraw')">取消</el-button>
                                    <el-button type="primary" class="save-btn" :loading="submittingMap.clubWithdraw"
                                        @click="submitClubWithdraw">
                                        完成
                                    </el-button>
                                </div>
                                <el-form ref="clubWithdrawForm" :model="clubForm" :rules="clubWithdrawRules"
                                    label-position="top">
                                    <div class="module-grid module-grid--single">
                                        <el-form-item label="保证金出账期（天）" prop="withdrawDays">
                                            <el-input-number v-model="clubForm.withdrawDays" :min="0" :precision="0"
                                                :step="1" controls-position="right" />
                                        </el-form-item>
                                    </div>
                                </el-form>
                            </template>
                        </div>
                    </section>

                    <section class="module-card module-card--editor module-card--rule">
                        <div class="module-card__head">
                            <div class="module-card__meta">
                                <span class="module-card__serial">03</span>
                                <div>
                                    <div class="module-card__title">规则配置</div>
                                    <div class="module-card__desc">维护开票税点与俱乐部保证金规则说明。</div>
                                </div>
                            </div>
                        </div>

                        <div class="module-card__surface">
                            <div v-if="!isSectionEditing('clubRule')" class="display-panel">
                                <div class="display-panel__actions">
                                    <el-button class="action-btn display-edit-btn1" type="primary" icon="el-icon-edit"
                                        @click="startSectionEdit('clubRule')">
                                        编辑
                                    </el-button>
                                </div>
                                <div class="display-stack">
                                    <div class="display-item">
                                        <div class="display-item__label">平台代开发票税点</div>
                                        <div class="display-item__value">{{ formatPercentText(clubForm.invoiceTaxRate)
                                        }}</div>
                                    </div>
                                </div>
                                <div class="rich-display" v-html="formatRuleDisplay(clubForm.configDesc)"></div>
                            </div>
                            <template v-else>
                                <div class="display-panel__actions">
                                    <el-button class="action-btn" @click="cancelSectionEdit('clubRule')">取消</el-button>
                                    <el-button type="primary" class="save-btn" :loading="submittingMap.clubRule"
                                        @click="submitClubRule">
                                        完成
                                    </el-button>
                                </div>
                                <el-form ref="clubRuleForm" :model="clubForm" :rules="clubRuleRules"
                                    label-position="top">
                                    <div class="module-grid module-grid--single">
                                        <el-form-item label="平台代开发票税点（%）" prop="invoiceTaxRate">
                                            <el-input-number v-model="clubForm.invoiceTaxRate" :min="0" :max="100"
                                                :precision="2" :step="0.01" controls-position="right" />
                                        </el-form-item>
                                    </div>
                                    <el-form-item label="保证金规则说明" prop="configDesc">
                                        <div class="editor-wrapper">
                                            <quill-editor v-model="clubForm.configDesc" :options="editorOptions" />
                                        </div>
                                    </el-form-item>
                                </el-form>
                            </template>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { quillEditor } from "vue-quill-editor";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "quill/dist/quill.bubble.css";
import {
    getPersonalDepositDetail,
    savePersonalDepositAmount,
    savePersonalDepositWithdraw,
    savePersonalDepositRule,
    getClubDepositDetail,
    saveClubDepositAmount,
    saveClubDepositWithdraw,
    saveClubDepositRule
} from "@/api/depositConfig";

export default {
    name: "OperationConfig",
    components: {
        QuillEditor: quillEditor
    },
    data() {
        return {
            activeType: "personal",
            pageLoading: false,
            loadedMap: {
                personal: false,
                club: false
            },
            typeOptions: [
                { value: "personal", label: "个人保证金配置", hint: "个人金额、提现周期、规则说明" },
                { value: "club", label: "俱乐部保证金配置", hint: "人数区间、税点规则、提现周期" }
            ],
            personalForm: this.createEmptyPersonalForm(),
            clubForm: this.createEmptyClubForm(),
            submittingMap: {
                personalAmount: false,
                personalWithdraw: false,
                personalRule: false,
                clubAmount: false,
                clubWithdraw: false,
                clubRule: false
            },
            editingMap: {
                personalAmount: false,
                personalWithdraw: false,
                personalRule: false,
                clubAmount: false,
                clubWithdraw: false,
                clubRule: false
            },
            sectionSnapshotMap: {},
            editorOptions: {
                theme: "snow",
                placeholder: "请输入规则说明",
                modules: {
                    toolbar: [
                        ["bold", "italic", "underline"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        [{ color: [] }, { background: [] }],
                        [{ align: [] }],
                        ["clean"]
                    ]
                }
            }
        };
    },
    computed: {
        personalAmountRules() {
            return {
                depositAmount: [{ required: true, validator: this.validateMoneyField, trigger: "change" }],
                warningAmount: [{ required: true, validator: this.validateMoneyField, trigger: "change" }],
                minAmount: [{ required: true, validator: this.validateMoneyField, trigger: "change" }]
            };
        },
        personalWithdrawRules() {
            return {
                withdrawDays: [{ required: true, validator: this.validateIntegerField, trigger: "change" }]
            };
        },
        personalRuleRules() {
            return {
                configDesc: [{ required: true, validator: this.validateRichTextField, trigger: "blur" }]
            };
        },
        clubAmountRules() {
            return {
                warningPeopleDiff: [{ required: true, validator: this.validateIntegerField, trigger: "change" }]
            };
        },
        clubWithdrawRules() {
            return {
                withdrawDays: [{ required: true, validator: this.validateIntegerField, trigger: "change" }]
            };
        },
        clubRuleRules() {
            return {
                invoiceTaxRate: [{ required: true, validator: this.validateTaxRateField, trigger: "change" }],
                configDesc: [{ required: true, validator: this.validateRichTextField, trigger: "blur" }]
            };
        }
    },
    created() {
        this.fetchCurrentDetail();
    },
    methods: {
        createEmptyPersonalForm() {
            return {
                id: "",
                depositAmount: undefined,
                warningAmount: undefined,
                minAmount: undefined,
                withdrawDays: undefined,
                configDesc: ""
            };
        },
        createEmptyClubForm() {
            return {
                id: "",
                warningPeopleDiff: undefined,
                withdrawDays: undefined,
                invoiceTaxRate: undefined,
                configDesc: "",
                rangeList: [this.createRangeItem(0)]
            };
        },
        createRangeItem(baseMin) {
            return {
                rowKey: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                id: undefined,
                minPersonNum: typeof baseMin === "number" ? baseMin : undefined,
                maxPersonNum: undefined,
                depositAmount: undefined,
                warningAmount: undefined,
                minAmount: undefined
            };
        },
        normalizeClubRangeList(rangeList) {
            const list = Array.isArray(rangeList) && rangeList.length
                ? this.cloneSectionData(rangeList)
                : [this.createRangeItem(0)];
            list[0].minPersonNum = 0;
            return list;
        },
        normalizeNumberValue(value) {
            if (value === null || value === undefined || value === "") {
                return undefined;
            }
            const result = Number(value);
            return Number.isNaN(result) ? undefined : result;
        },
        normalizeTextValue(value) {
            return value === null || value === undefined ? "" : String(value);
        },
        hasDisplayValue(value) {
            return value !== null && value !== undefined && value !== "";
        },
        formatAmountText(value) {
            return this.hasDisplayValue(value) ? `${Number(value)} 元` : "-";
        },
        formatDaysText(value) {
            return this.hasDisplayValue(value) ? `${value} 天` : "暂未配置";
        },
        formatPercentText(value) {
            return this.hasDisplayValue(value) ? `${Number(value).toFixed(2)}%` : "-";
        },
        formatPeopleDiffText(value) {
            return this.hasDisplayValue(value) ? `${value} 人` : "-";
        },
        formatRuleDisplay(value) {
            const html = this.normalizeEditorHtml(value);
            return html || '<div class="rich-display__empty">暂未配置规则说明</div>';
        },
        normalizeEditorHtml(value) {
            const content = String(value || "").trim();
            return content === "<p><br></p>" ? "" : content;
        },
        getEditorPlainText(value) {
            return String(value || "")
                .replace(/<[^>]+>/g, "")
                .replace(/&nbsp;/gi, " ")
                .replace(/\s+/g, " ")
                .trim();
        },
        validateMoneyField(rule, value, callback) {
            if (value === null || value === undefined || value === "") {
                callback(new Error("请填写金额"));
                return;
            }
            const num = Number(value);
            if (!Number.isInteger(num) || num < 0) {
                callback(new Error("金额仅支持大于等于0的整数"));
                return;
            }
            callback();
        },
        validateIntegerField(rule, value, callback) {
            if (value === null || value === undefined || value === "") {
                callback(new Error("请填写整数值"));
                return;
            }
            if (Number(value) < 0 || !Number.isInteger(Number(value))) {
                callback(new Error("请输入大于等于0的整数"));
                return;
            }
            callback();
        },
        validateTaxRateField(rule, value, callback) {
            if (value === null || value === undefined || value === "") {
                callback(new Error("请填写税点"));
                return;
            }
            const num = Number(value);
            if (Number.isNaN(num) || num < 0) {
                callback(new Error("税点不能小于0"));
                return;
            }
            if (num > 100) {
                callback(new Error("税点不能超过100"));
                return;
            }
            if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
                callback(new Error("税点最多保留两位小数"));
                return;
            }
            callback();
        },
        validateRichTextField(rule, value, callback) {
            const text = this.getEditorPlainText(this.normalizeEditorHtml(value));
            if (!text) {
                callback(new Error("请输入规则说明"));
                return;
            }
            callback();
        },
        validateForm(refName) {
            return new Promise((resolve, reject) => {
                const formRef = this.$refs[refName];
                if (!formRef || !formRef.validate) {
                    resolve(true);
                    return;
                }
                formRef.validate((valid) => {
                    if (valid) {
                        resolve(true);
                        return;
                    }
                    reject(new Error("表单校验未通过"));
                });
            });
        },
        cloneSectionData(data) {
            return JSON.parse(JSON.stringify(data));
        },
        getSectionRefName(sectionKey) {
            const map = {
                personalAmount: "personalAmountForm",
                personalWithdraw: "personalWithdrawForm",
                personalRule: "personalRuleForm",
                clubAmount: "clubAmountForm",
                clubWithdraw: "clubWithdrawForm",
                clubRule: "clubRuleForm"
            };
            return map[sectionKey];
        },
        clearSectionValidate(sectionKey) {
            const refName = this.getSectionRefName(sectionKey);
            const formRef = this.$refs[refName];
            if (formRef && formRef.clearValidate) {
                this.$nextTick(() => {
                    formRef.clearValidate();
                });
            }
        },
        getSectionData(sectionKey) {
            const map = {
                personalAmount: {
                    depositAmount: this.personalForm.depositAmount,
                    warningAmount: this.personalForm.warningAmount,
                    minAmount: this.personalForm.minAmount
                },
                personalWithdraw: {
                    withdrawDays: this.personalForm.withdrawDays
                },
                personalRule: {
                    configDesc: this.personalForm.configDesc
                },
                clubAmount: {
                    warningPeopleDiff: this.clubForm.warningPeopleDiff,
                    rangeList: this.cloneSectionData(this.clubForm.rangeList)
                },
                clubWithdraw: {
                    withdrawDays: this.clubForm.withdrawDays
                },
                clubRule: {
                    invoiceTaxRate: this.clubForm.invoiceTaxRate,
                    configDesc: this.clubForm.configDesc
                }
            };
            return map[sectionKey] ? this.cloneSectionData(map[sectionKey]) : {};
        },
        applySectionData(sectionKey, data) {
            if (sectionKey === "personalAmount") {
                this.personalForm.depositAmount = data.depositAmount;
                this.personalForm.warningAmount = data.warningAmount;
                this.personalForm.minAmount = data.minAmount;
                return;
            }
            if (sectionKey === "personalWithdraw") {
                this.personalForm.withdrawDays = data.withdrawDays;
                return;
            }
            if (sectionKey === "personalRule") {
                this.personalForm.configDesc = data.configDesc;
                return;
            }
            if (sectionKey === "clubAmount") {
                this.clubForm.warningPeopleDiff = data.warningPeopleDiff;
                this.clubForm.rangeList = this.normalizeClubRangeList(data.rangeList || []);
                return;
            }
            if (sectionKey === "clubWithdraw") {
                this.clubForm.withdrawDays = data.withdrawDays;
                return;
            }
            if (sectionKey === "clubRule") {
                this.clubForm.invoiceTaxRate = data.invoiceTaxRate;
                this.clubForm.configDesc = data.configDesc;
            }
        },
        isSectionEditing(sectionKey) {
            return !!this.editingMap[sectionKey];
        },
        startSectionEdit(sectionKey) {
            this.sectionSnapshotMap[sectionKey] = this.getSectionData(sectionKey);
            this.$set(this.editingMap, sectionKey, true);
        },
        cancelSectionEdit(sectionKey) {
            if (this.sectionSnapshotMap[sectionKey]) {
                this.applySectionData(sectionKey, this.sectionSnapshotMap[sectionKey]);
            }
            this.$set(this.editingMap, sectionKey, false);
            this.$delete(this.sectionSnapshotMap, sectionKey);
            this.clearSectionValidate(sectionKey);
        },
        finishSectionEdit(sectionKey) {
            this.$set(this.editingMap, sectionKey, false);
            this.$delete(this.sectionSnapshotMap, sectionKey);
            this.clearSectionValidate(sectionKey);
        },
        resetEditStateByType(type) {
            const sectionMap = {
                personal: ["personalAmount", "personalWithdraw", "personalRule"],
                club: ["clubAmount", "clubWithdraw", "clubRule"]
            };
            (sectionMap[type] || []).forEach((sectionKey) => {
                if (this.editingMap[sectionKey]) {
                    this.cancelSectionEdit(sectionKey);
                }
            });
        },
        handleTypeChange(type) {
            if (this.activeType === type) {
                return;
            }
            this.resetEditStateByType(this.activeType);
            this.activeType = type;
            this.fetchCurrentDetail();
        },
        async fetchCurrentDetail(force) {
            if (this.activeType === "personal") {
                await this.fetchPersonalDetail(force);
            } else {
                await this.fetchClubDetail(force);
            }
        },
        async fetchPersonalDetail(force) {
            if (!force && this.loadedMap.personal) {
                return;
            }
            this.pageLoading = true;
            try {
                const res = await getPersonalDepositDetail({});
                if (res && res.success) {
                    const data = res.data || {};
                    this.personalForm = {
                        id: this.normalizeTextValue(data.id),
                        depositAmount: this.normalizeNumberValue(data.depositAmount),
                        warningAmount: this.normalizeNumberValue(data.warningAmount),
                        minAmount: this.normalizeNumberValue(data.minAmount),
                        withdrawDays: this.normalizeNumberValue(data.withdrawDays),
                        configDesc: this.normalizeTextValue(data.configDesc)
                    };
                    this.loadedMap.personal = true;
                } else {
                    this.$message.error((res && res.errorMessage) || "获取个人保证金配置失败");
                }
            } catch (error) {
                this.$message.error("获取个人保证金配置失败");
            } finally {
                this.pageLoading = false;
            }
        },
        async fetchClubDetail(force) {
            if (!force && this.loadedMap.club) {
                return;
            }
            this.pageLoading = true;
            try {
                const res = await getClubDepositDetail({});
                if (res && res.success) {
                    const data = res.data || {};
                    const rangeList = Array.isArray(data.rangeList) && data.rangeList.length
                        ? data.rangeList.map((item, index) => {
                            // 兼容旧字段名，优先使用文档字段 minPersonNum / maxPersonNum
                            const minPersonNum = item.minPersonNum !== undefined && item.minPersonNum !== null
                                ? item.minPersonNum
                                : item.minTechnicalCount;
                            const maxPersonNum = item.maxPersonNum !== undefined && item.maxPersonNum !== null
                                ? item.maxPersonNum
                                : item.maxTechnicalCount;
                            return {
                                rowKey: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
                                id: item.id || undefined,
                                minPersonNum: this.normalizeNumberValue(minPersonNum),
                                maxPersonNum: maxPersonNum === null || maxPersonNum === undefined || maxPersonNum === ""
                                    ? undefined
                                    : this.normalizeNumberValue(maxPersonNum),
                                depositAmount: this.normalizeNumberValue(item.depositAmount),
                                warningAmount: this.normalizeNumberValue(item.warningAmount),
                                minAmount: this.normalizeNumberValue(item.minAmount)
                            };
                        })
                        : [this.createRangeItem(0)];

                    this.clubForm = {
                        id: this.normalizeTextValue(data.id),
                        warningPeopleDiff: this.normalizeNumberValue(data.warningPeopleDiff),
                        withdrawDays: this.normalizeNumberValue(data.withdrawDays),
                        invoiceTaxRate: this.normalizeNumberValue(data.invoiceTaxRate),
                        configDesc: this.normalizeTextValue(data.configDesc),
                        rangeList: this.normalizeClubRangeList(rangeList)
                    };
                    this.loadedMap.club = true;
                } else {
                    this.$message.error((res && res.errorMessage) || "获取俱乐部保证金配置失败");
                }
            } catch (error) {
                this.$message.error("获取俱乐部保证金配置失败");
            } finally {
                this.pageLoading = false;
            }
        },
        checkAmountRelation(amountInfo, silent) {
            if (Number(amountInfo.depositAmount) < Number(amountInfo.warningAmount)) {
                if (!silent) {
                    this.$message.warning("充足金额不能小于预警金额");
                }
                return false;
            }
            if (Number(amountInfo.warningAmount) < Number(amountInfo.minAmount)) {
                if (!silent) {
                    this.$message.warning("预警金额不能小于最低金额");
                }
                return false;
            }
            return true;
        },
        addRangeItem() {
            const lastItem = this.clubForm.rangeList[this.clubForm.rangeList.length - 1];
            const baseMin = lastItem && lastItem.maxPersonNum !== null && lastItem.maxPersonNum !== undefined && lastItem.maxPersonNum !== ""
                ? Number(lastItem.maxPersonNum) + 1
                : undefined;
            this.clubForm.rangeList.push(this.createRangeItem(baseMin));
            this.clubForm.rangeList = this.normalizeClubRangeList(this.clubForm.rangeList);
        },
        removeRangeItem(index) {
            this.clubForm.rangeList.splice(index, 1);
            this.clubForm.rangeList = this.normalizeClubRangeList(this.clubForm.rangeList);
        },
        getRangePreview(item, index) {
            const min = item.minPersonNum;
            const max = item.maxPersonNum;
            if (min === undefined || min === null || min === "") {
                return `请填写第 ${index + 1} 组人数区间`;
            }
            if (max === undefined || max === null || max === "") {
                return `${min} 人及以上`;
            }
            return `${min} - ${max} 人`;
        },
        isNonNegativeInteger(value) {
            const num = Number(value);
            return Number.isInteger(num) && num >= 0;
        },
        validateRangeList() {
            if (!Array.isArray(this.clubForm.rangeList) || !this.clubForm.rangeList.length) {
                this.$message.warning("请至少配置一个人数区间");
                return false;
            }

            for (let index = 0; index < this.clubForm.rangeList.length; index += 1) {
                const item = this.clubForm.rangeList[index];
                const isLast = index === this.clubForm.rangeList.length - 1;
                const min = item.minPersonNum;
                const max = item.maxPersonNum;

                if (min === null || min === undefined || min === "" || !Number.isInteger(Number(min)) || Number(min) < 0) {
                    this.$message.warning(`请正确填写第 ${index + 1} 组的陪陪人数下限`);
                    return false;
                }
                if (index === 0 && Number(min) !== 0) {
                    this.$message.warning("第一组陪陪人数下限必须为0");
                    return false;
                }
                if (index > 0) {
                    const previousItem = this.clubForm.rangeList[index - 1];
                    if (previousItem.maxPersonNum === null || previousItem.maxPersonNum === undefined || previousItem.maxPersonNum === "") {
                        this.$message.warning("仅最后一组允许不填写人数上限");
                        return false;
                    }
                    if (Number(min) !== Number(previousItem.maxPersonNum) + 1) {
                        this.$message.warning(`第 ${index + 1} 组人数下限必须等于上一组上限 + 1`);
                        return false;
                    }
                }
                if (!isLast && (max === null || max === undefined || max === "")) {
                    this.$message.warning(`第 ${index + 1} 组必须填写陪陪人数上限`);
                    return false;
                }
                if (max !== null && max !== undefined && max !== "") {
                    if (!Number.isInteger(Number(max)) || Number(max) < Number(min)) {
                        this.$message.warning(`第 ${index + 1} 组陪陪人数上限必须大于等于下限`);
                        return false;
                    }
                }
                if (
                    !this.isNonNegativeInteger(item.depositAmount) ||
                    !this.isNonNegativeInteger(item.warningAmount) ||
                    !this.isNonNegativeInteger(item.minAmount)
                ) {
                    this.$message.warning(`第 ${index + 1} 组金额仅支持大于等于0的整数`);
                    return false;
                }
                if (!this.checkAmountRelation(item, true)) {
                    this.$message.warning(`第 ${index + 1} 组金额关系不正确（充足 ≥ 预警 ≥ 最低）`);
                    return false;
                }
            }

            return true;
        },
        async submitPersonalAmount() {
            try {
                await this.validateForm("personalAmountForm");
            } catch (error) {
                return;
            }
            if (!this.checkAmountRelation(this.personalForm)) {
                return;
            }
            this.submittingMap.personalAmount = true;
            try {
                const res = await savePersonalDepositAmount({
                    depositAmount: this.personalForm.depositAmount,
                    warningAmount: this.personalForm.warningAmount,
                    minAmount: this.personalForm.minAmount
                });
                if (res && res.success) {
                    this.$message.success("个人金额配置保存成功");
                    await this.fetchPersonalDetail(true);
                    this.finishSectionEdit("personalAmount");
                } else {
                    this.$message.error((res && res.errorMessage) || "个人金额配置保存失败");
                }
            } catch (error) {
                this.$message.error("个人金额配置保存失败");
            } finally {
                this.submittingMap.personalAmount = false;
            }
        },
        async submitPersonalWithdraw() {
            try {
                await this.validateForm("personalWithdrawForm");
            } catch (error) {
                return;
            }
            this.submittingMap.personalWithdraw = true;
            try {
                const res = await savePersonalDepositWithdraw({
                    withdrawDays: this.personalForm.withdrawDays
                });
                if (res && res.success) {
                    this.$message.success("个人提现配置保存成功");
                    await this.fetchPersonalDetail(true);
                    this.finishSectionEdit("personalWithdraw");
                } else {
                    this.$message.error((res && res.errorMessage) || "个人提现配置保存失败");
                }
            } catch (error) {
                this.$message.error("个人提现配置保存失败");
            } finally {
                this.submittingMap.personalWithdraw = false;
            }
        },
        async submitPersonalRule() {
            this.personalForm.configDesc = this.normalizeEditorHtml(this.personalForm.configDesc);
            try {
                await this.validateForm("personalRuleForm");
            } catch (error) {
                return;
            }
            this.submittingMap.personalRule = true;
            try {
                const res = await savePersonalDepositRule({
                    configDesc: this.personalForm.configDesc
                });
                if (res && res.success) {
                    this.$message.success("个人规则配置保存成功");
                    await this.fetchPersonalDetail(true);
                    this.finishSectionEdit("personalRule");
                } else {
                    this.$message.error((res && res.errorMessage) || "个人规则配置保存失败");
                }
            } catch (error) {
                this.$message.error("个人规则配置保存失败");
            } finally {
                this.submittingMap.personalRule = false;
            }
        },
        async submitClubAmount() {
            try {
                await this.validateForm("clubAmountForm");
            } catch (error) {
                return;
            }
            if (!this.validateRangeList()) {
                return;
            }
            this.submittingMap.clubAmount = true;
            try {
                const payload = {
                    warningPeopleDiff: this.clubForm.warningPeopleDiff,
                    rangeList: this.clubForm.rangeList.map((item) => {
                        const rangePayload = {
                            minPersonNum: item.minPersonNum,
                            depositAmount: item.depositAmount,
                            warningAmount: item.warningAmount,
                            minAmount: item.minAmount
                        };
                        if (item.id !== null && item.id !== undefined && item.id !== "") {
                            rangePayload.id = item.id;
                        }
                        if (item.maxPersonNum !== null && item.maxPersonNum !== undefined && item.maxPersonNum !== "") {
                            rangePayload.maxPersonNum = item.maxPersonNum;
                        }
                        return rangePayload;
                    })
                };
                if (this.clubForm.id !== null && this.clubForm.id !== undefined && this.clubForm.id !== "") {
                    payload.id = this.clubForm.id;
                }
                const res = await saveClubDepositAmount(payload);
                if (res && res.success) {
                    this.$message.success("俱乐部金额配置保存成功");
                    await this.fetchClubDetail(true);
                    this.finishSectionEdit("clubAmount");
                } else {
                    this.$message.error((res && res.errorMessage) || "俱乐部金额配置保存失败");
                }
            } catch (error) {
                this.$message.error("俱乐部金额配置保存失败");
            } finally {
                this.submittingMap.clubAmount = false;
            }
        },
        async submitClubWithdraw() {
            try {
                await this.validateForm("clubWithdrawForm");
            } catch (error) {
                return;
            }
            this.submittingMap.clubWithdraw = true;
            try {
                const res = await saveClubDepositWithdraw({
                    withdrawDays: this.clubForm.withdrawDays
                });
                if (res && res.success) {
                    this.$message.success("俱乐部提现配置保存成功");
                    await this.fetchClubDetail(true);
                    this.finishSectionEdit("clubWithdraw");
                } else {
                    this.$message.error((res && res.errorMessage) || "俱乐部提现配置保存失败");
                }
            } catch (error) {
                this.$message.error("俱乐部提现配置保存失败");
            } finally {
                this.submittingMap.clubWithdraw = false;
            }
        },
        async submitClubRule() {
            this.clubForm.configDesc = this.normalizeEditorHtml(this.clubForm.configDesc);
            try {
                await this.validateForm("clubRuleForm");
            } catch (error) {
                return;
            }
            this.submittingMap.clubRule = true;
            try {
                const res = await saveClubDepositRule({
                    invoiceTaxRate: this.clubForm.invoiceTaxRate,
                    configDesc: this.clubForm.configDesc
                });
                if (res && res.success) {
                    this.$message.success("俱乐部规则配置保存成功");
                    await this.fetchClubDetail(true);
                    this.finishSectionEdit("clubRule");
                } else {
                    this.$message.error((res && res.errorMessage) || "俱乐部规则配置保存失败");
                }
            } catch (error) {
                this.$message.error("俱乐部规则配置保存失败");
            } finally {
                this.submittingMap.clubRule = false;
            }
        }
    }
};
</script>

<style scoped lang="scss">
.operation-config-page {
    height: 100%;
    padding: 16px 18px;
    background:
        radial-gradient(circle at top left, rgba(143, 3, 255, 0.06), transparent 24%),
        linear-gradient(180deg, #f5f7fb 0%, #f3f6fb 100%);
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.hero-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0 0 16px;
    flex-shrink: 0;
}

.hero-tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 68px;
    padding: 12px 16px;
    border: 1px solid #ece8f8;
    border-radius: 14px;
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 244, 255, 0.96)),
        #fff;
    box-shadow: 0 8px 20px rgba(74, 45, 140, 0.05);
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    outline: none;
}

.hero-tab::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: transparent;
    transition: background 0.25s ease;
}

.hero-tab:hover {
    transform: translateY(-1px);
    border-color: rgba(106, 53, 255, 0.28);
    box-shadow: 0 10px 24px rgba(106, 53, 255, 0.1);
}

.hero-tab.is-active {
    border-color: transparent;
    color: #fff;
    background: linear-gradient(135deg, #6a35ff 0%, #9047f8 55%, #7b3dff 100%);
    box-shadow:
        0 12px 26px rgba(106, 53, 255, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.hero-tab.is-active::before {
    background: rgba(255, 255, 255, 0.55);
}

.hero-tab.is-active::after {
    content: "";
    position: absolute;
    right: -36px;
    top: -36px;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 68%);
    pointer-events: none;
}

.hero-tab__icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-size: 18px;
    color: #6a35ff;
    background: rgba(106, 53, 255, 0.1);
    box-shadow: inset 0 0 0 1px rgba(106, 53, 255, 0.08);
    transition: all 0.25s ease;
}

.hero-tab.is-active .hero-tab__icon {
    color: #fff;
    background: rgba(255, 255, 255, 0.18);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.hero-tab__body {
    flex: 1;
    min-width: 0;
}

.hero-tab__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 700;
    color: #303133;
    line-height: 1.2;
}

.hero-tab__title em {
    font-style: normal;
    font-size: 11px;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
}

.hero-tab.is-active .hero-tab__title {
    color: #fff;
}

.hero-tab__desc {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
}

.hero-tab.is-active .hero-tab__desc {
    color: rgba(255, 255, 255, 0.82);
}

.hero-tab__arrow {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #c0c4cc;
    background: #f5f5f8;
    transition: all 0.25s ease;
    flex-shrink: 0;
    font-size: 12px;
}

.hero-tab:hover .hero-tab__arrow {
    color: #6a35ff;
    background: rgba(106, 53, 255, 0.1);
}

.hero-tab.is-active .hero-tab__arrow {
    color: #6a35ff;
    background: #fff;
    transform: translateX(2px);
}

@media (max-width: 900px) {
    .hero-tabs {
        grid-template-columns: 1fr;
    }
}

.config-shell {
    flex: 1;
    min-height: 0;
    border-radius: 24px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 255, 0.98) 100%) padding-box,
        linear-gradient(135deg, rgba(143, 3, 255, 0.12) 0%, rgba(63, 124, 255, 0.08) 100%) border-box;
    border: 1px solid transparent;
    box-shadow: 0 18px 42px rgba(31, 35, 41, 0.08);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.config-shell__body {
    padding: 14px 16px 16px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
}

.module-stack {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    align-items: stretch;
}

.module-stack--club {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
}

.module-card--club-amount {
    grid-column: span 1;
}

.module-stack--club .module-card--club-amount {
    grid-column: 1 / -1;
}

.module-stack--club .module-card,
.module-stack--club .module-card__surface {
    height: auto;
}

.module-card+.module-card {
    margin-top: 0;
    padding-top: 18px;
}

.module-card+.module-card::before {
    content: '';
    position: absolute;
    top: 18px;
    left: -8px;
    bottom: 18px;
    height: 1px;
    width: 1px;
    background: linear-gradient(180deg, rgba(143, 3, 255, 0), rgba(143, 3, 255, 0.12), rgba(63, 124, 255, 0.12), rgba(63, 124, 255, 0));
}

.module-card {
    height: 100%;
    padding: 18px 18px 16px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 255, 0.98) 100%);
    border: 1px solid rgba(143, 160, 196, 0.12);
    box-shadow: 0 10px 28px rgba(31, 35, 41, 0.04);
    overflow: hidden;
    position: relative;
}

.module-card--editor {
    padding-bottom: 20px;
}

.module-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 18px;
    right: 18px;
    height: 1px;
    background: linear-gradient(90deg, rgba(143, 3, 255, 0), rgba(143, 3, 255, 0.18), rgba(63, 124, 255, 0));
    opacity: 0;
}

.module-card--amount::after,
.module-card--withdraw::after,
.module-card--rule::after {
    opacity: 1;
}

.module-card__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
}

.module-card__meta {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
}

.module-card__serial {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #ffffff;
    background: linear-gradient(135deg, #8f03ff 0%, #6a35ff 60%, #3f7cff 100%);
    box-shadow: 0 8px 18px rgba(106, 53, 255, 0.18);
}

.module-card__title {
    margin-bottom: 6px;
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: #1b2540;
}

.module-card__desc {
    font-size: 12px;
    line-height: 18px;
    color: #7a849f;
}

.module-card__surface {
    display: flex;
    flex-direction: column;
    height: calc(100% - 14px);
    padding: 14px;
    border-radius: 16px;
    background:
        linear-gradient(180deg, rgba(247, 248, 255, 0.92) 0%, rgba(255, 255, 255, 0.96) 100%);
    border: 1px solid rgba(156, 172, 214, 0.12);
}

.display-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 100%;
}

.display-panel__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-bottom: 4px;
}

.display-panel__actions--between {
    justify-content: space-between;
    align-items: center;
}

.club-amount-meta {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px 8px 12px;
    border-radius: 999px;
    background:
        linear-gradient(135deg, rgba(143, 3, 255, 0.08) 0%, rgba(63, 124, 255, 0.05) 100%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 249, 255, 0.96) 100%);
    border: 1px solid rgba(143, 160, 210, 0.16);
    box-shadow: 0 10px 22px rgba(106, 53, 255, 0.08);
    min-width: 0;
}

.club-amount-meta::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    background: linear-gradient(135deg, #8f03ff 0%, #3f7cff 100%);
    box-shadow: 0 0 0 5px rgba(143, 3, 255, 0.08);
}

.club-amount-meta__label {
    font-size: 12px;
    line-height: 18px;
    color: #8a93ac;
    white-space: nowrap;
}

.club-amount-meta__value {
    font-size: 15px;
    line-height: 22px;
    font-weight: 700;
    color: #25335c;
    white-space: nowrap;
}

.club-amount-tip {
    position: relative;
    padding: 10px 12px 10px 34px;
    margin-top: 2px;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(143, 3, 255, 0.045) 0%, rgba(63, 124, 255, 0.035) 100%);
    border: 1px solid rgba(143, 160, 210, 0.12);
    font-size: 12px;
    line-height: 19px;
    color: #62708f;
}

.club-amount-tip::before {
    content: '!';
    position: absolute;
    top: 10px;
    left: 12px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: #ffffff;
    background: linear-gradient(135deg, #8f03ff 0%, #3f7cff 100%);
}

.club-amount-tip--edit {
    margin-top: 0;
    margin-bottom: 12px;
}

.withdraw-hero {
    position: relative;
    padding: 18px 18px 16px;
    border-radius: 16px;
    overflow: hidden;
    background:
        radial-gradient(circle at top right, rgba(255, 255, 255, 0.36), transparent 26%),
        linear-gradient(135deg, rgba(63, 124, 255, 0.10) 0%, rgba(143, 3, 255, 0.08) 100%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(247, 249, 255, 0.97) 100%);
    border: 1px solid rgba(132, 148, 219, 0.18);
    box-shadow: 0 14px 30px rgba(84, 104, 179, 0.08);
}

.withdraw-hero::before {
    content: '';
    position: absolute;
    top: 16px;
    right: 16px;
    width: 54px;
    height: 54px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(143, 3, 255, 0.12) 0%, rgba(63, 124, 255, 0.10) 100%);
    transform: rotate(18deg);
}

.withdraw-hero__content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
}

.withdraw-hero__content--sentence {
    gap: 10px;
    flex-wrap: wrap;
}

.withdraw-hero__prefix {
    font-size: 15px;
    line-height: 24px;
    font-weight: 600;
    color: #586a90;
}

.withdraw-hero__days {
    font-size: 38px;
    line-height: 42px;
    font-weight: 700;
    letter-spacing: -1px;
    color: #1f2b4d;
}

.withdraw-hero__unit {
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: #5a6d92;
}

.withdraw-hero__desc {
    position: relative;
    z-index: 1;
    font-size: 12px;
    line-height: 18px;
    color: #7d87a2;
}

.display-stack {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
}

.display-stack--amount {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.display-stack--compact {
    gap: 8px;
}

.display-item {
    padding: 12px 14px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 249, 255, 0.96) 100%);
    border: 1px solid rgba(149, 166, 209, 0.12);
}

.display-item--hero {
    padding: 16px 16px 14px;
    background:
        linear-gradient(135deg, rgba(143, 3, 255, 0.04) 0%, rgba(63, 124, 255, 0.03) 100%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(248, 250, 255, 0.97) 100%);
    border: 1px solid rgba(143, 160, 210, 0.16);
    box-shadow: 0 10px 26px rgba(87, 102, 156, 0.06);
}

.display-item__label {
    margin-bottom: 6px;
    font-size: 12px;
    line-height: 18px;
    color: #7b86a0;
    letter-spacing: 0.2px;
}

.display-item__value {
    font-size: 22px;
    line-height: 30px;
    font-weight: 600;
    color: #1f2a46;
    letter-spacing: -0.3px;
}

.display-item__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
}

.display-item__tag {
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    line-height: 16px;
    font-weight: 700;
    color: #6a35ff;
    background: rgba(106, 53, 255, 0.08);
    border: 1px solid rgba(106, 53, 255, 0.10);
}

.display-item__sub {
    margin-top: 8px;
    font-size: 11px;
    line-height: 16px;
    color: #7f8aa6;
}

.display-item--hero .display-item__label {
    margin-bottom: 8px;
    font-size: 11px;
    line-height: 16px;
    color: #8a93ad;
}

.display-item--hero .display-item__value {
    font-size: 28px;
    line-height: 34px;
    font-weight: 700;
    color: #1a2440;
}

.display-item--amount-main {
    grid-column: 1 / -1;
    padding: 18px 18px 16px;
    background:
        radial-gradient(circle at top right, rgba(255, 255, 255, 0.34), transparent 28%),
        linear-gradient(135deg, rgba(143, 3, 255, 0.12) 0%, rgba(92, 76, 255, 0.08) 48%, rgba(63, 124, 255, 0.08) 100%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 248, 255, 0.96) 100%);
    border-color: rgba(130, 108, 255, 0.18);
    box-shadow: 0 14px 32px rgba(96, 83, 201, 0.10);
}

.display-item--amount-main .display-item__value {
    font-size: 34px;
    line-height: 40px;
    letter-spacing: -0.8px;
}

.display-item--amount-warning {
    background:
        linear-gradient(135deg, rgba(255, 190, 92, 0.10) 0%, rgba(255, 142, 70, 0.05) 100%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(255, 249, 243, 0.97) 100%);
    border-color: rgba(255, 178, 88, 0.18);
}

.display-item--amount-warning .display-item__tag {
    color: #e08c19;
    background: rgba(255, 178, 88, 0.10);
    border-color: rgba(255, 178, 88, 0.12);
}

.display-item--amount-limit {
    background:
        linear-gradient(135deg, rgba(255, 110, 143, 0.08) 0%, rgba(255, 88, 88, 0.05) 100%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(255, 246, 248, 0.97) 100%);
    border-color: rgba(255, 131, 155, 0.18);
}

.display-item--amount-limit .display-item__tag {
    color: #d85f7a;
    background: rgba(255, 131, 155, 0.10);
    border-color: rgba(255, 131, 155, 0.12);
}

.display-edit-btn1 {
    min-width: 88px;
    height: 34px;
    padding: 0 14px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #8f03ff 0%, #6a35ff 60%, #3f7cff 100%);
    box-shadow: 0 12px 26px rgba(106, 53, 255, 0.18);
}

.display-edit-btn1:hover,
.display-edit-btn1:focus {
    background: linear-gradient(135deg, #8600f2 0%, #6231f3 60%, #3972f4 100%);
}

::v-deep .display-edit-btn1 span,
::v-deep .display-edit-btn1 i {
    color: #ffffff;
}

.rich-display {
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 249, 255, 0.96) 100%);
    border: 1px solid rgba(149, 166, 209, 0.12);
    color: #31405f;
    font-size: 13px;
    line-height: 1.7;
    word-break: break-word;
}

.module-card--amount .module-card__surface {
    box-shadow: inset 0 1px 0 rgba(143, 3, 255, 0.03);
}

.module-card--withdraw .module-card__surface {
    box-shadow: inset 0 1px 0 rgba(63, 124, 255, 0.03);
}

.module-card--rule .module-card__surface {
    box-shadow: inset 0 1px 0 rgba(106, 53, 255, 0.04);
}

.module-card__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.action-btn {
    min-width: 72px;
    height: 34px;
    padding: 0 14px;
    border-radius: 10px;
}

.save-btn {
    min-width: 82px;
    height: 34px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #8f03ff 0%, #6a35ff 60%, #3f7cff 100%);
    box-shadow: 0 12px 28px rgba(106, 53, 255, 0.18);
}

.save-btn:hover,
.save-btn:focus {
    background: linear-gradient(135deg, #8400eb 0%, #6030f0 60%, #3871f4 100%);
}

.module-grid {
    display: grid;
    gap: 12px;
}

.module-grid--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.module-grid--amount {
    grid-template-columns: minmax(0, 1fr);
}

.club-amount-inline {
    display: grid;
    grid-template-columns: minmax(0, 260px);
}

.module-grid--single {
    grid-template-columns: minmax(0, 300px);
}

.module-note {
    margin-top: 8px;
    font-size: 12px;
    line-height: 18px;
    color: #7d88a3;
}

.range-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
    margin-bottom: 12px;
}

.range-toolbar__btn {
    border-radius: 12px;
}

.range-list {
    display: grid;
    gap: 10px;
}

.range-list--strategy {
    gap: 12px;
}

.range-list--editor {
    gap: 10px;
}

.club-amount-scroll {
    max-height: 420px;
    overflow-y: auto;
    padding-right: 6px;
}

.club-amount-scroll::-webkit-scrollbar {
    width: 6px;
}

.club-amount-scroll::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(132, 148, 219, 0.38);
}

.club-amount-scroll::-webkit-scrollbar-track {
    background: transparent;
}

.range-editor-board {
    border: 1px solid rgba(137, 155, 207, 0.14);
    border-radius: 16px;
    background: linear-gradient(180deg, #fbfcff 0%, #f7f9ff 100%);
    overflow: hidden;
}

.range-editor-head,
.range-editor-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr 1.2fr 1.2fr 116px;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
}

.range-editor-head {
    background: rgba(143, 3, 255, 0.04);
    border-bottom: 1px solid rgba(137, 155, 207, 0.12);
}

.range-editor-row+.range-editor-row {
    border-top: 1px solid rgba(137, 155, 207, 0.10);
}

.range-editor-cell {
    min-width: 0;
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
    color: #6f7b97;
}

.range-editor-cell--action {
    text-align: right;
}

.range-editor-row__meta {
    margin-bottom: 4px;
    font-size: 11px;
    line-height: 16px;
    color: #8a93ac;
}

.range-field-stack {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
}

.range-card {
    padding: 14px;
    border-radius: 16px;
    background: linear-gradient(180deg, #fafbff 0%, #f6f8ff 100%);
    border: 1px solid rgba(129, 149, 198, 0.14);
}

.range-card--strategy {
    padding: 10px;
    background:
        linear-gradient(135deg, rgba(143, 3, 255, 0.035) 0%, rgba(63, 124, 255, 0.03) 100%),
        linear-gradient(180deg, #ffffff 0%, #f7f9ff 100%);
    border: 1px solid rgba(137, 155, 207, 0.16);
    box-shadow: 0 6px 16px rgba(88, 103, 156, 0.035);
}

.range-card__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
}

.range-card__title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
}

.range-card__badge {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
    color: #ffffff;
    background: linear-gradient(135deg, #8f03ff 0%, #6a35ff 60%, #3f7cff 100%);
    box-shadow: 0 6px 14px rgba(106, 53, 255, 0.14);
}

.range-card__title {
    margin-bottom: 1px;
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
    color: #25335c;
}

.range-card__desc {
    font-size: 10px;
    line-height: 14px;
    color: #7b86a0;
}

.strategy-metrics {
    display: grid;
    grid-template-columns: 1.1fr repeat(3, minmax(0, 1fr));
    gap: 6px;
}

.display-item--mini {
    padding: 8px 10px;
}

.display-item--mini .display-item__label {
    margin-bottom: 2px;
    font-size: 10px;
    line-height: 14px;
}

.display-item--mini .display-item__value {
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
}

.range-card--strategy .display-item--hero {
    padding: 10px 10px 9px;
    border-radius: 12px;
}

.range-card--strategy .display-item--hero .display-item__label {
    margin-bottom: 4px;
    font-size: 10px;
    line-height: 14px;
}

.range-card--strategy .display-item--hero .display-item__value {
    font-size: 16px;
    line-height: 22px;
    font-weight: 700;
}

.range-field {
    padding: 12px 12px 10px;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid rgba(142, 157, 201, 0.12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.range-field__label {
    margin-bottom: 6px;
    font-size: 12px;
    color: #78829d;
}

.danger-text-btn {
    color: #f56c6c;
}

.empty-block {
    padding: 18px;
    border-radius: 16px;
    background: #f7f8fd;
    font-size: 13px;
    color: #7e95a5;
    text-align: center;
}

.editor-wrapper {
    border: 1px solid #dce8f1;
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
}

::v-deep .editor-wrapper {
    position: relative;
}

::v-deep .editor-wrapper .ql-toolbar.ql-snow {
    border: none;
    border-bottom: 1px solid #e7eef4;
    background: #f8fafc;
}

::v-deep .editor-wrapper .ql-container.ql-snow {
    border: none;
    min-height: 150px;
}

::v-deep .editor-wrapper .ql-editor {
    min-height: 150px;
    font-size: 13px;
    line-height: 1.6;
    color: #26485f;
}

::v-deep .el-form-item {
    margin-bottom: 0;
}

::v-deep .el-form-item__label {
    padding-bottom: 8px;
    font-weight: 600;
    color: #24475f;
    font-size: 13px;
}

::v-deep .el-input-number.is-disabled .el-input__inner,
::v-deep .el-textarea.is-disabled .el-textarea__inner,
::v-deep .el-input.is-disabled .el-input__inner {
    color: #53657b;
    background: #f7f9fc;
    border-color: #e4e9f1;
}

::v-deep .rich-display p {
    margin: 0 0 10px;
}

::v-deep .rich-display p:last-child {
    margin-bottom: 0;
}

::v-deep .rich-display ul,
::v-deep .rich-display ol {
    padding-left: 18px;
    margin: 0;
}

::v-deep .rich-display__empty {
    color: #8a93ac;
}

::v-deep .el-input-number {
    width: 100%;
}

@media (max-width: 1280px) {
    .module-stack {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .module-stack--club {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .module-stack--club .module-card--club-amount {
        grid-column: span 2;
    }

    .module-card__head,
    .range-toolbar,
    .range-card__head {
        flex-direction: column;
    }

    .module-grid--three {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .range-editor-head,
    .range-editor-row {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .range-editor-cell--action {
        text-align: left;
    }

    .strategy-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .club-amount-inline {
        grid-template-columns: minmax(0, 220px);
    }

    .display-stack--amount {
        grid-template-columns: minmax(0, 1fr);
    }

    .display-item--amount-main {
        grid-column: span 1;
    }
}

@media (max-width: 960px) {
    .operation-config-page {
        padding: 16px;
    }

    .config-shell__body {
        padding-left: 14px;
        padding-right: 14px;
    }

    .module-stack {
        grid-template-columns: minmax(0, 1fr);
    }

    .module-stack--club {
        grid-template-columns: minmax(0, 1fr);
    }

    .module-stack--club .module-card--club-amount {
        grid-column: span 1;
    }

    .module-grid--three,
    .module-grid--amount,
    .module-grid--single {
        grid-template-columns: minmax(0, 1fr);
    }

    .strategy-metrics {
        grid-template-columns: minmax(0, 1fr);
    }

    .display-panel__actions--between {
        flex-direction: column;
        align-items: flex-start;
    }

    .club-amount-inline {
        grid-template-columns: minmax(0, 1fr);
    }

    .withdraw-hero {
        padding: 16px 16px 14px;
    }

    .withdraw-hero__days {
        font-size: 32px;
        line-height: 36px;
    }

    .withdraw-hero__prefix,
    .withdraw-hero__unit {
        font-size: 14px;
        line-height: 22px;
    }

    .range-editor-head,
    .range-editor-row {
        grid-template-columns: minmax(0, 1fr);
    }

    .module-card+.module-card::before {
        top: -7px;
        left: 0;
        right: 0;
        bottom: auto;
        width: auto;
        height: 1px;
        background: linear-gradient(90deg, rgba(143, 3, 255, 0), rgba(143, 3, 255, 0.12), rgba(63, 124, 255, 0.12), rgba(63, 124, 255, 0));
    }
}
</style>
