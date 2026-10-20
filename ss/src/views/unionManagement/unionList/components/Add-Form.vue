<!--
  公会新增 / 编辑表单（Add-Form）
  ---------------------------------------------------------------------------
  使用场景：
  - 由 unionList/index.vue 抽屉内嵌使用
  - 父组件通过 ref 调用：resetForm / setEditMode / fillFormData
  - 向父组件抛出：submit(submitData) / cancel

  提交载荷约定（与 /trade/union/add|edit 对齐）：
  - logo：OSS 文件 ID（不是预览 URL）
  - photos：多个 OSS ID，逗号拼接字符串
  - tradeUnionRateList：
      type "1" → 通用分润（公会 / 陪陪 / 平台，合计 100%）
      type "2" → 特殊分润（productId + specialProfitSharingBos 模式数组）
  - 特殊分润平台比例前端自动算：100 - 公会 - 陪陪

  对外方法：
  - setEditMode(isEdit)  编辑态禁用手机号修改
  - fillFormData(detail) 详情回填（兼容新旧分润结构）
  - resetForm()          清空表单
-->
<template>
    <el-form ref="addFormRef" :model="form" :rules="rules" label-width="96px" class="union-form" label-position="top">
        <div class="union-form__panel">
            <!-- ========== 01 基础资料：文案字段 + Logo / 封面上传 ========== -->
            <section class="uf-block">
                <header class="uf-block__head">
                    <span class="uf-block__index">01</span>
                    <div>
                        <h3 class="uf-block__title">基础资料</h3>
                        <p class="uf-block__desc">公会信息与展示素材</p>
                    </div>
                </header>

                <div class="uf-basic">
                    <div class="uf-basic__fields">
                        <el-row :gutter="16">
                            <el-col :span="12">
                                <el-form-item label="公会名称" prop="tradeName">
                                    <el-input v-model="form.tradeName" placeholder="请输入公会名称" maxlength="8" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item label="公会负责人" prop="tradeNamePerson">
                                    <el-input v-model="form.tradeNamePerson" placeholder="请输入负责人" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item label="联系方式" prop="phone">
                                    <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11"
                                        :disabled="phoneDisabled" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item label="排序值" prop="sortValue">
                                    <el-input-number v-model="form.sortValue" :min="0" :step="1" :precision="0"
                                        controls-position="right" style="width: 100%" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="24">
                                <el-form-item label="俱乐部简介" prop="introduction">
                                    <el-input v-model="form.introduction" type="textarea" :rows="3"
                                        placeholder="一句话介绍俱乐部" maxlength="70" show-word-limit />
                                </el-form-item>
                            </el-col>
                        </el-row>
                    </div>

                    <!-- 右侧媒体区：Logo ≤2M；俱乐部封面最多 1 张 ≤50M -->
                    <div class="uf-basic__media">
                        <el-form-item label="公会 Logo" prop="logo" class="uf-media-item">
                            <div class="media-upload">
                                <div v-if="form.logo" class="media-upload__item is-logo">
                                    <img :src="form.logo" class="media-upload__img" />
                                    <div class="media-upload__mask">
                                        <i class="el-icon-zoom-in" @click.stop="previewLogo"></i>
                                        <i class="el-icon-delete" @click.stop="handleRemoveLogo"></i>
                                    </div>
                                </div>
                                <div v-else class="media-upload__trigger is-logo"
                                    :class="{ 'is-uploading': uploading }" v-loading="uploading"
                                    @click="triggerLogoUpload">
                                    <i class="el-icon-plus"></i>
                                    <span>{{ uploading ? '上传中...' : '上传 Logo' }}</span>
                                </div>
                                <input ref="logoInput" type="file" accept="image/png,image/jpeg,image/jpg"
                                    style="display: none" @change="handleLogoChange" />
                            </div>
                            <div class="upload-tip">png / jpg · ≤2M</div>
                        </el-form-item>

                        <el-form-item label="俱乐部图片" prop="photos" class="uf-media-item">
                            <div class="media-upload">
                                <div v-for="(photo, index) in form.photos" :key="index"
                                    class="media-upload__item is-cover">
                                    <img :src="photo" class="media-upload__img" />
                                    <div class="media-upload__mask">
                                        <i class="el-icon-zoom-in" @click.stop="previewPhoto(index)"></i>
                                        <i class="el-icon-delete" @click.stop="removePhoto(index)"></i>
                                    </div>
                                    <div v-if="photoUploading && uploadingIndex === index"
                                        class="media-upload__loading">
                                        <i class="el-icon-loading"></i>
                                    </div>
                                </div>
                                <div v-if="form.photos.length < 1" class="media-upload__trigger is-cover"
                                    :class="{ 'is-uploading': photoUploading }" v-loading="photoUploading"
                                    @click="triggerPhotoUpload">
                                    <i class="el-icon-plus"></i>
                                    <span>{{ photoUploading ? '上传中...' : '上传封面' }}</span>
                                </div>
                                <input ref="photoInput" type="file" accept="image/png,image/jpeg,image/jpg"
                                    style="display: none" @change="handlePhotoChange" />
                            </div>
                            <div class="upload-tip">最多 1 张 · ≤50M</div>
                        </el-form-item>
                    </div>
                </div>
            </section>

            <!-- ========== 02 通用游戏分润：三项合计必须 100%，输入即时校验 ========== -->
            <section class="uf-block">
                <header class="uf-block__head">
                    <span class="uf-block__index">02</span>
                    <div class="uf-block__head-main">
                        <div>
                            <h3 class="uf-block__title">通用游戏分润</h3>
                            <p class="uf-block__desc">公会 / 陪陪 / 平台三项合计须为 100%</p>
                        </div>
                        <div class="uf-sum-badge" :class="{
                            'is-ok': hasGeneralRateInput && !getGeneralRateSumError(),
                            'is-error': hasGeneralRateInput && getGeneralRateSumError(),
                        }">
                            合计 {{ calculateGeneralRateSum().toFixed(2) }}%
                        </div>
                    </div>
                </header>

                <!-- percent-field：输入与 % 同一边框；focusedPercent / is-invalid 控制聚焦与错误态 -->
                <div class="uf-rate-grid">
                    <el-form-item label="公会分润" :prop="'generalRate.unionRateProportion'"
                        :rules="getGeneralRateRules('unionRateProportion')"
                        :error="getGeneralRateError('unionRateProportion')" class="uf-rate-card">
                        <div class="percent-field" :class="{
                            'is-focus': focusedPercent === 'g-union',
                            'is-invalid': !!getGeneralRateError('unionRateProportion'),
                        }">
                            <el-input v-model="form.generalRate.unionRateProportion" placeholder="0"
                                @focus="focusedPercent = 'g-union'" @blur="onGeneralPercentBlur('unionRateProportion')"
                                @input="handleGeneralRateInput('unionRateProportion')" />
                            <span class="percent-field__unit">%</span>
                        </div>
                    </el-form-item>

                    <el-form-item label="陪陪分润" :prop="'generalRate.waiterRateProportion'"
                        :rules="getGeneralRateRules('waiterRateProportion')"
                        :error="getGeneralRateError('waiterRateProportion')" class="uf-rate-card">
                        <div class="percent-field" :class="{
                            'is-focus': focusedPercent === 'g-waiter',
                            'is-invalid': !!getGeneralRateError('waiterRateProportion'),
                        }">
                            <el-input v-model="form.generalRate.waiterRateProportion" placeholder="0"
                                @focus="focusedPercent = 'g-waiter'"
                                @blur="onGeneralPercentBlur('waiterRateProportion')"
                                @input="handleGeneralRateInput('waiterRateProportion')" />
                            <span class="percent-field__unit">%</span>
                        </div>
                    </el-form-item>

                    <el-form-item label="平台分润" :prop="'generalRate.platformRateProportion'"
                        :rules="getGeneralRateRules('platformRateProportion')"
                        :error="getGeneralRateError('platformRateProportion')" class="uf-rate-card">
                        <div class="percent-field" :class="{
                            'is-focus': focusedPercent === 'g-platform',
                            'is-invalid': !!getGeneralRateError('platformRateProportion'),
                        }">
                            <el-input v-model="form.generalRate.platformRateProportion" placeholder="0"
                                @focus="focusedPercent = 'g-platform'"
                                @blur="onGeneralPercentBlur('platformRateProportion')"
                                @input="handleGeneralRateInput('platformRateProportion')" />
                            <span class="percent-field__unit">%</span>
                        </div>
                    </el-form-item>
                </div>

                <!-- 分段进度条：紫=公会 / 青绿=陪陪 / 琥珀=平台；合计≠100% 时下方提示 -->
                <div class="uf-progress" v-if="hasGeneralRateInput">
                    <div class="uf-progress__track">
                        <div class="uf-progress__seg is-union" :style="{ width: generalBar.union + '%' }" />
                        <div class="uf-progress__seg is-waiter" :style="{ width: generalBar.waiter + '%' }" />
                        <div class="uf-progress__seg is-platform" :style="{ width: generalBar.platform + '%' }" />
                    </div>
                    <div class="uf-progress__legend">
                        <span><i class="dot is-union" />公会</span>
                        <span><i class="dot is-waiter" />陪陪</span>
                        <span><i class="dot is-platform" />平台</span>
                    </div>
                    <p v-if="getGeneralRateSumError()" class="uf-sum-hint">
                        当前合计 {{ calculateGeneralRateSum().toFixed(2) }}%，需等于 100%
                    </p>
                </div>
            </section>

            <!-- ========== 03 特殊游戏分润：游戏 → 多模式；平台自动计算 ========== -->
            <section class="uf-block">
                <header class="uf-block__head">
                    <span class="uf-block__index">03</span>
                    <div class="uf-block__head-main">
                        <div>
                            <h3 class="uf-block__title">特殊游戏分润</h3>
                            <p class="uf-block__desc">按游戏配置模式；平台 = 100% − 公会 − 陪陪</p>
                        </div>
                        <button type="button" class="uf-add-chip" @click="addSpecialRateRow">
                            <i class="el-icon-plus"></i>
                            添加游戏
                        </button>
                    </div>
                </header>

                <!-- 空态可点击，等价于「添加游戏」 -->
                <div v-if="!form.specialRates.length" class="uf-empty" @click="addSpecialRateRow">
                    <i class="el-icon-s-opportunity"></i>
                    <p>暂无特殊配置，点击添加游戏类型</p>
                </div>

                <!-- 每个游戏一块；切换游戏会清空并重拉该游戏下的模式选项 -->
                <div v-for="(item, sIndex) in form.specialRates" :key="'special-' + sIndex" class="uf-game">
                    <div class="uf-game__head">
                        <div class="uf-game__title">
                            <span class="uf-game__tag">游戏 {{ sIndex + 1 }}</span>
                            <el-form-item class="uf-game__select" label-width="0">
                                <el-select v-model="item.productId" placeholder="选择游戏类型" filterable clearable
                                    style="width: 100%" :loading="productLoading"
                                    @change="handleSpecialGameChange(sIndex)">
                                    <el-option v-for="row in getAvailableGames(sIndex)" :key="row.id"
                                        :label="row.productName" :value="row.id" />
                                </el-select>
                            </el-form-item>
                        </div>
                        <button type="button" class="uf-game__remove" @click="removeSpecialRateRow(sIndex)">
                            删除
                        </button>
                    </div>

                    <!-- 模式行：De 删除 / In 新增；平台芯片实时展示 100-公会-陪陪 -->
                    <div v-for="(mode, mIndex) in item.modeRows" :key="mode._key" class="uf-mode">
                        <div class="uf-mode__bar">
                            <span class="uf-mode__label">模式 {{ mIndex + 1 }}</span>
                            <div class="uf-mode__actions">
                                <img src="@/assets/De.png" alt="" class="op-icon"
                                    :class="{ disabled: item.modeRows.length <= 1 }"
                                    @click="removeModeRow(sIndex, mIndex)" />
                                <img v-if="mIndex === item.modeRows.length - 1" src="@/assets/In.png" alt=""
                                    class="op-icon" @click="addModeRow(sIndex)" />
                            </div>
                        </div>

                        <el-form-item label="游戏模式" :prop="`specialRates.${sIndex}.modeRows.${mIndex}.relationId`"
                            :rules="modeRelationRules(sIndex, mIndex)">
                            <el-select v-model="mode.relationId" placeholder="请选择游戏模式" filterable clearable
                                style="width: 100%" :loading="item.modeLoading" :disabled="!item.productId">
                                <el-option v-for="opt in getAvailableModes(sIndex, mIndex)" :key="opt.id"
                                    :label="opt.fieldName" :value="opt.id" />
                            </el-select>
                        </el-form-item>

                        <div class="uf-mode__rates">
                            <el-form-item label="公会分润"
                                :prop="`specialRates.${sIndex}.modeRows.${mIndex}.unionRateProportion`"
                                :rules="modeRateRules">
                                <div class="percent-field"
                                    :class="{ 'is-focus': focusedPercent === `s-${sIndex}-${mIndex}-u` }">
                                    <el-input v-model="mode.unionRateProportion" placeholder="0"
                                        @focus="focusedPercent = `s-${sIndex}-${mIndex}-u`" @blur="focusedPercent = ''"
                                        @input="sanitizeModeRate(mode, 'unionRateProportion')" />
                                    <span class="percent-field__unit">%</span>
                                </div>
                            </el-form-item>

                            <el-form-item label="陪陪分润"
                                :prop="`specialRates.${sIndex}.modeRows.${mIndex}.waiterRateProportion`"
                                :rules="modeRateRules">
                                <div class="percent-field"
                                    :class="{ 'is-focus': focusedPercent === `s-${sIndex}-${mIndex}-w` }">
                                    <el-input v-model="mode.waiterRateProportion" placeholder="0"
                                        @focus="focusedPercent = `s-${sIndex}-${mIndex}-w`" @blur="focusedPercent = ''"
                                        @input="sanitizeModeRate(mode, 'waiterRateProportion')" />
                                    <span class="percent-field__unit">%</span>
                                </div>
                            </el-form-item>

                            <div class="uf-platform-chip" :class="{ 'is-error': getModeSumError(mode) }">
                                <span class="uf-platform-chip__label">平台</span>
                                <strong>{{ calcModePlatform(mode) }}%</strong>
                            </div>
                        </div>

                        <p v-if="getModeSumError(mode)" class="uf-mode__error">
                            {{ getModeSumError(mode) }}
                        </p>
                    </div>
                </div>
            </section>
        </div>

        <!-- 底部操作：取消 → emit cancel；提交 → handleSubmit -->
        <div class="union-form__footer">
            <el-button class="union-form__btn union-form__btn--ghost" @click="handleCancel">取消</el-button>
            <el-button type="primary" class="union-form__btn union-form__btn--primary" :loading="submitting"
                @click="handleSubmit">
                提交
            </el-button>
        </div>

        <el-dialog :visible.sync="previewVisible" title="图片预览" width="500px" append-to-body>
            <img :src="previewUrl" style="width: 100%" />
        </el-dialog>
    </el-form>
</template>

<script>
/**
 * 依赖说明：
 * - fileUpload：上传 Logo / 封面，拿到 url + ossId
 * - productSelect：特殊分润可选游戏列表
 * - productFieldRelationList：某游戏下的模式（moduleType=6，取一级 parentId）
 */
import { fileUpload } from '@/api/user'
import { productSelect } from '@/api/goodsList'
import { productFieldRelationList } from '@/api/goodsAreaRelation'

/** 模式行唯一 key 种子（避免 v-for key 冲突） */
let modeRowSeed = 1

/**
 * 创建一条「游戏模式」行
 * @param {Object} payload
 * @param {string|number} [payload.relationId] 模式字段关系 ID
 * @param {string|number} [payload.unionRateProportion] 公会分润（百分数）
 * @param {string|number} [payload.waiterRateProportion] 陪陪分润（百分数）
 */
const createModeRow = (payload = {}) => ({
    _key: `mode-${Date.now()}-${modeRowSeed++}`,
    relationId: payload.relationId ? String(payload.relationId) : '',
    unionRateProportion:
        payload.unionRateProportion !== undefined && payload.unionRateProportion !== null
            ? String(payload.unionRateProportion)
            : '',
    waiterRateProportion:
        payload.waiterRateProportion !== undefined && payload.waiterRateProportion !== null
            ? String(payload.waiterRateProportion)
            : '',
})
/**
 * 创建一块「特殊游戏」配置
 * modeOptions / modeLoading 为前端态，不提交给后端
 */
const createSpecialRate = (payload = {}) => ({
    productId: payload.productId || '',
    tradeUnionRateId: payload.tradeUnionRateId || '',
    modeRows: Array.isArray(payload.modeRows) && payload.modeRows.length
        ? payload.modeRows.map((row) => createModeRow(row))
        : [createModeRow()],
    modeOptions: payload.modeOptions || [],
    modeLoading: false,
})

/** 特殊分润模式比例校验：必填、正数、0 < x ≤ 100 */
const modeRateValidator = (rule, value, callback) => {
    if (value === '' || value === null || value === undefined) {
        callback(new Error('请输入分润比例'))
        return
    }
    if (!/^\d+(\.\d+)?$/.test(String(value))) {
        callback(new Error('仅支持正数'))
        return
    }
    const num = Number(value)
    if (!(num > 0 && num <= 100)) {
        callback(new Error('取值范围为 0 < 比例 ≤ 100'))
        return
    }
    callback()
}

/**
 * 详情小数比例 → 页面百分数
 * 例：0.70 → 70；已是百分数（>1）则原样保留两位
 */
const toDisplayPercent = (value) => {
    if (value === '' || value === null || value === undefined) return ''
    const n = Number(value)
    if (!Number.isFinite(n)) return ''
    const percent = n >= 0 && n <= 1 ? n * 100 : n
    return String(Number(percent.toFixed(2)))
}

/**
 * 详情里的分润主键：接口字段为 unionRateId，提交特殊类型时需带 tradeUnionRateId
 */
const pickUnionRateId = (item = {}) =>
    item.tradeUnionRateId || item.unionRateId || ''


export default {
    name: "AddTradeUnion",
    props: {
        /** 预留：父组件也可通过 prop 传入编辑数据（当前主流程走 fillFormData） */
        editData: { type: Object, default: () => ({}) },
        /** 父组件提交中状态，用于提交按钮 loading */
        submitting: { type: Boolean, default: false },
    },
    data() {
        return {
            /** 是否编辑态（影响手机号是否可改等） */
            isEditMode: false,
            /** 编辑态禁用手机号输入 */
            phoneDisabled: false,
            /** Logo 的 OSS ID（提交用）；form.logo 存预览 URL */
            ossId: '',
            uploading: false,
            photoUploading: false,
            uploadingIndex: -1,
            /** 俱乐部图片 OSS ID 列表，与 form.photos（URL）下标一一对应 */
            photoOssIds: [],
            previewVisible: false,
            previewUrl: '',
            productLoading: false,
            /** 特殊分润可选游戏下拉数据 */
            productListData: [],

            /**
             * 表单模型
             * - generalRate：通用三项分润（百分数字符串）
             * - specialRates：特殊游戏数组，见 createSpecialRate
             */
            form: {
                tradeName: "",
                tradeNamePerson: "",
                phone: "",
                logo: "",
                introduction: "",
                photos: [],
                sortValue: 0,
                generalRate: {
                    unionRateProportion: '',
                    waiterRateProportion: '',
                    platformRateProportion: '',
                },
                specialRates: [],
            },

            rules: {
                tradeName: [
                    { required: true, message: '请输入公会名称', trigger: 'blur' },
                    { max: 8, message: '公会名称不能超过8个字符', trigger: 'blur' }
                ],
                tradeNamePerson: [
                    { required: true, message: '请输入公会负责人', trigger: 'blur' }
                ],
                phone: [
                    { required: true, message: '请输入联系方式', trigger: 'blur' },
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
                ],
                logo: [
                    { required: true, message: '请上传公会logo', trigger: 'change' }
                ],
                introduction: [
                    { required: true, message: '请输入俱乐部简介', trigger: 'blur' },
                    { max: 70, message: '俱乐部简介不能超过70个字符', trigger: 'blur' }
                ],
                photos: [
                    { required: true, type: 'array', min: 1, message: '请上传俱乐部图片', trigger: 'change' }
                ],
                sortValue: [
                    { required: true, message: '请输入排序值', trigger: 'blur' }
                ]
            },

            /** 特殊模式比例的 el-form rules */
            modeRateRules: [{ required: true, validator: modeRateValidator, trigger: 'blur' }],

            /**
             * 通用分润自定义错误文案（与 :error 绑定）
             * 输入过程中即时写入，用于 percent-field 的 is-invalid 态
             */
            generalRateErrors: {
                unionRateProportion: '',
                waiterRateProportion: '',
                platformRateProportion: ''
            },
            /** 历史标记：是否已触发过通用分润完整校验（提交前会清零再校验） */
            generalRateValidated: false,
            /**
             * 当前聚焦的百分比输入标识
             * 通用：g-union / g-waiter / g-platform
             * 特殊：s-{游戏下标}-{模式下标}-u|w
             */
            focusedPercent: '',
        }
    },
    computed: {
        /** 通用三项是否有任一输入（用于展示进度条 / 合计徽章态） */
        hasGeneralRateInput() {
            const g = this.form.generalRate || {}
            return !!(g.unionRateProportion || g.waiterRateProportion || g.platformRateProportion)
        },
        /**
         * 进度条三段宽度
         * 若合计 > 100，按比例缩放到满格，避免溢出；是否等于 100% 由 getGeneralRateSumError 判断
         */
        generalBar() {
            const union = Number(this.form.generalRate.unionRateProportion) || 0
            const waiter = Number(this.form.generalRate.waiterRateProportion) || 0
            const platform = Number(this.form.generalRate.platformRateProportion) || 0
            const sum = union + waiter + platform
            if (sum <= 0) {
                return { union: 0, waiter: 0, platform: 0 }
            }
            const scale = sum > 100 ? 100 / sum : 1
            return {
                union: Number((union * scale).toFixed(2)),
                waiter: Number((waiter * scale).toFixed(2)),
                platform: Number((platform * scale).toFixed(2)),
            }
        },
    },
    created() {
        this.fetchProductList()
    },
    methods: {
        // -------------------- 通用分润交互 --------------------

        /** 通用百分比失焦：取消聚焦态，并做一次完整字段校验（含必填） */
        onGeneralPercentBlur(field) {
            this.focusedPercent = ''
            this.validateGeneralRateField(field)
        },

        /**
         * 父组件设置新增 / 编辑模式
         * 编辑态锁定手机号，避免误改登录相关联系方式
         */
        setEditMode(isEdit) {
            this.isEditMode = !!isEdit
            this.phoneDisabled = !!isEdit
        },

        // -------------------- 游戏 / 模式选项 --------------------

        /** 拉取启用中的游戏商品列表，供特殊分润下拉使用 */
        async fetchProductList() {
            this.productLoading = true
            try {
                const res = await productSelect({ pageNum: 1, pageSize: 999, status: '1' })
                if (res.code == 200) {
                    this.productListData = Array.isArray(res.data) ? res.data : (res.data && res.data.rows) || []
                }
            } catch (e) {
                console.error('获取游戏列表失败', e)
            } finally {
                this.productLoading = false
            }
        },

        /** 可选游戏：排除其它特殊块已选中的 productId（同一游戏不可重复配置） */
        getAvailableGames(sIndex) {
            const selected = new Set(
                this.form.specialRates
                    .filter((_, i) => i !== sIndex)
                    .map((item) => String(item.productId))
                    .filter(Boolean)
            )
            return this.productListData.filter((row) => !selected.has(String(row.id)))
        },

        /** 可选模式：排除同游戏下其它行已选 relationId */
        getAvailableModes(sIndex, mIndex) {
            const special = this.form.specialRates[sIndex]
            if (!special) return []
            const selected = new Set(
                (special.modeRows || [])
                    .filter((_, i) => i !== mIndex)
                    .map((row) => String(row.relationId))
                    .filter(Boolean)
            )
            return (special.modeOptions || []).filter((opt) => !selected.has(String(opt.id)))
        },

        /** 模式选择 rules：必选 + 同游戏内不可重复 */
        modeRelationRules(sIndex, mIndex) {
            return [
                { required: true, message: '请选择游戏模式', trigger: 'change' },
                {
                    validator: (rule, value, callback) => {
                        if (!value) {
                            callback(new Error('请选择游戏模式'))
                            return
                        }
                        const rows = this.form.specialRates[sIndex].modeRows || []
                        const duplicated = rows.some(
                            (row, i) => i !== mIndex && String(row.relationId) === String(value)
                        )
                        if (duplicated) {
                            callback(new Error('游戏模式不可重复'))
                            return
                        }
                        callback()
                    },
                    trigger: 'change',
                },
            ]
        },

        /** 特殊模式比例输入清洗：仅保留数字与一个小数点 */
        sanitizeModeRate(mode, field) {
            mode[field] = String(mode[field] || '')
                .replace(/[^\d.]/g, '')
                .replace(/^\./, '')
                .replace(/(\..*)\./g, '$1')
        },

        /** 平台分润 = 100 - 公会 - 陪陪（保留两位） */
        calcModePlatform(mode) {
            const union = Number(mode.unionRateProportion) || 0
            const waiter = Number(mode.waiterRateProportion) || 0
            const platform = 100 - union - waiter
            return Number(platform.toFixed(2))
        },

        /** 公会+陪陪 ≥ 100 时返回错误文案，否则空串 */
        getModeSumError(mode) {
            const union = Number(mode.unionRateProportion)
            const waiter = Number(mode.waiterRateProportion)
            if (!Number.isFinite(union) || !Number.isFinite(waiter)) return ''
            if (!(union > 0) || !(waiter > 0)) return ''
            const platform = 100 - union - waiter
            if (platform <= 0) return '（公会 + 陪陪不可 ≥ 100%）'
            return ''
        },

        /** 新增一块特殊游戏 */
        addSpecialRateRow() {
            this.form.specialRates.push(createSpecialRate())
        },

        /** 删除整块特殊游戏 */
        removeSpecialRateRow(sIndex) {
            this.form.specialRates.splice(sIndex, 1)
        },

        /** 在指定游戏下新增模式行 */
        addModeRow(sIndex) {
            this.form.specialRates[sIndex].modeRows.push(createModeRow())
        },

        /** 删除模式行（至少保留 1 行） */
        removeModeRow(sIndex, mIndex) {
            const special = this.form.specialRates[sIndex]
            if (special.modeRows.length <= 1) return
            special.modeRows.splice(mIndex, 1)
        },

        /**
         * 切换游戏类型：
         * 1) 清空已填模式行
         * 2) 按 productId 拉取一级模式选项（businessType=1, moduleType=6）
         */
        async handleSpecialGameChange(sIndex) {
            const special = this.form.specialRates[sIndex]
            special.modeRows = [createModeRow()]
            special.modeOptions = []
            if (!special.productId) return
            special.modeLoading = true
            try {
                const res = await productFieldRelationList({
                    productId: special.productId,
                    businessType: '1',
                    moduleType: '6',
                })
                const list = (res.success && res.data) || res.data || []
                const rows = Array.isArray(list) ? list : []
                special.modeOptions = rows
                    .filter((item) => item.parentId === 0 || item.parentId === '0' || item.parentId == null)
                    .map((item) => ({
                        id: String(item.id),
                        fieldName: item.fieldName,
                    }))
            } catch (e) {
                console.error('获取游戏模式失败', e)
                this.$message.error('获取游戏模式失败')
            } finally {
                special.modeLoading = false
            }
        },

        // -------------------- 通用分润校验 --------------------

        /**
         * 通用分润字段 rules（blur + change）
         * 与 generalRateErrors 双通道：rules 驱动 el-form，errors 驱动自定义 percent 样式
         */
        getGeneralRateRules(field) {
            return [
                {
                    validator: (rule, value, callback) => {
                        if (value === '' || value === null || value === undefined) {
                            callback(new Error('请填写此项'))
                            return
                        }
                        if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
                            callback(new Error('请输入合法数字，最多两位小数'))
                            return
                        }
                        const num = Number(value)
                        if (!(num > 0 && num <= 100)) {
                            callback(new Error('需满足 0 < 比例 ≤ 100'))
                            return
                        }
                        callback()
                    },
                    trigger: ['blur', 'change'],
                },
            ]
        },

        getGeneralRateError(field) {
            return this.generalRateErrors[field] || ''
        },

        /**
         * 通用分润输入：
         * - 先清洗非法字符
         * - 空值：不立刻报必填，并清掉校验态（输入体验更好）
         * - 有值：即时校验范围，并触发 validateField
         */
        handleGeneralRateInput(field) {
            this.form.generalRate[field] = String(this.form.generalRate[field] || '')
                .replace(/[^\d.]/g, '')
                .replace(/^\./, '')
                .replace(/(\..*)\./g, '$1')

            const value = this.form.generalRate[field]
            // 输入中：空值不立刻报必填，有内容则即时校验范围
            if (value === '') {
                this.generalRateErrors[field] = ''
                this.$nextTick(() => {
                    if (this.$refs.addFormRef) {
                        this.$refs.addFormRef.clearValidate(`generalRate.${field}`)
                    }
                })
                return
            }

            this.validateGeneralRateField(field, { requireFilled: true })
            this.$nextTick(() => {
                if (this.$refs.addFormRef) {
                    this.$refs.addFormRef.validateField(`generalRate.${field}`)
                }
            })
        },

        /**
         * 校验单个通用分润字段
         * @param {string} field unionRateProportion | waiterRateProportion | platformRateProportion
         * @param {{ requireFilled?: boolean }} options requireFilled=false 时允许空（仅格式校验）
         */
        validateGeneralRateField(field, options = {}) {
            const requireFilled = options.requireFilled !== false
            const value = this.form.generalRate[field]
            if (value === '' || value === null || value === undefined) {
                if (requireFilled) {
                    this.generalRateErrors[field] = '请填写此项'
                    return false
                }
                this.generalRateErrors[field] = ''
                return true
            }
            if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
                this.generalRateErrors[field] = '请输入合法数字，最多两位小数'
                return false
            }
            const num = Number(value)
            if (!(num > 0 && num <= 100)) {
                this.generalRateErrors[field] = '需满足 0 < 比例 ≤ 100'
                return false
            }
            this.generalRateErrors[field] = ''
            return true
        },

        /** 通用三项合计（数字） */
        calculateGeneralRateSum() {
            const { unionRateProportion, waiterRateProportion, platformRateProportion } = this.form.generalRate
            return (
                (Number(unionRateProportion) || 0) +
                (Number(waiterRateProportion) || 0) +
                (Number(platformRateProportion) || 0)
            )
        },

        /** 是否有输入且合计与 100 偏差超过 0.01 */
        getGeneralRateSumError() {
            const sum = this.calculateGeneralRateSum()
            const hasAny =
                this.form.generalRate.unionRateProportion ||
                this.form.generalRate.waiterRateProportion ||
                this.form.generalRate.platformRateProportion
            if (!hasAny) return false
            return Math.abs(sum - 100) > 0.01
        },

        // -------------------- 媒体上传 --------------------

        /** 触发隐藏的 Logo file input */
        triggerLogoUpload() {
            if (this.uploading) return
            this.$refs.logoInput && this.$refs.logoInput.click()
        },

        /**
         * Logo 上传：校验类型/大小 → fileUpload
         * form.logo = 预览 URL；ossId = 提交用文件 ID
         */
        async handleLogoChange(e) {
            const file = e.target.files && e.target.files[0]
            e.target.value = ''
            if (!file || this.uploading) return
            if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                this.$message.error('仅支持 png、jpg 格式')
                return
            }
            if (file.size > 2 * 1024 * 1024) {
                this.$message.error('logo 大小不能超过 2M')
                return
            }
            this.uploading = true
            try {
                const formData = new FormData()
                formData.append('file', file)
                const res = await fileUpload(formData)
                if (res.code == 200 && res.data) {
                    this.form.logo = res.data.url || res.data
                    this.ossId = res.data.ossId || ''
                    this.$refs.addFormRef && this.$refs.addFormRef.validateField('logo')
                } else {
                    this.$message.error(res.msg || '上传失败')
                }
            } catch (err) {
                console.error(err)
                this.$message.error('上传失败')
            } finally {
                this.uploading = false
            }
        },

        handleRemoveLogo() {
            this.form.logo = ''
            this.ossId = ''
        },

        previewLogo() {
            this.previewUrl = this.form.logo
            this.previewVisible = true
        },

        triggerPhotoUpload() {
            if (this.photoUploading || this.form.photos.length >= 1) return
            this.$refs.photoInput && this.$refs.photoInput.click()
        },

        /**
         * 俱乐部封面上传（最多 1 张）
         * form.photos 存 URL，photoOssIds 存对应 ossId
         */
        async handlePhotoChange(e) {
            const file = e.target.files && e.target.files[0]
            e.target.value = ''
            if (!file || this.photoUploading || this.form.photos.length >= 1) return
            if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                this.$message.error('仅支持 png、jpg 格式')
                return
            }
            if (file.size > 50 * 1024 * 1024) {
                this.$message.error('图片大小不能超过 50M')
                return
            }
            this.photoUploading = true
            this.uploadingIndex = this.form.photos.length
            try {
                const formData = new FormData()
                formData.append('file', file)
                const res = await fileUpload(formData)
                if (res.code == 200 && res.data) {
                    this.form.photos.push(res.data.url || res.data)
                    if (res.data.ossId) this.photoOssIds.push(res.data.ossId)
                    this.$refs.addFormRef && this.$refs.addFormRef.validateField('photos')
                } else {
                    this.$message.error(res.msg || '上传失败')
                }
            } catch (err) {
                console.error(err)
                this.$message.error('上传失败')
            } finally {
                this.photoUploading = false
                this.uploadingIndex = -1
            }
        },

        removePhoto(index) {
            this.form.photos.splice(index, 1)
            this.photoOssIds.splice(index, 1)
        },

        previewPhoto(index) {
            this.previewUrl = this.form.photos[index]
            this.previewVisible = true
        },

        /** 取消：由父组件关抽屉 */
        handleCancel() {
            this.$emit('cancel')
        },

        // -------------------- 提交前校验 / 提交 / 回填 --------------------

        /**
         * 特殊分润完整性校验（有配置时才约束）
         * 逐游戏、逐模式检查：游戏、模式、比例合法性、平台 > 0
         */
        validateSpecialRates() {
            for (let i = 0; i < this.form.specialRates.length; i++) {
                const item = this.form.specialRates[i]
                if (!item.productId) {
                    this.$message.warning(`请选择第 ${i + 1} 个特殊游戏类型`)
                    return false
                }
                if (!item.modeRows || !item.modeRows.length) {
                    this.$message.warning(`请为第 ${i + 1} 个游戏配置模式`)
                    return false
                }
                for (let j = 0; j < item.modeRows.length; j++) {
                    const mode = item.modeRows[j]
                    if (!mode.relationId) {
                        this.$message.warning(`请选择第 ${i + 1} 个游戏的第 ${j + 1} 个模式`)
                        return false
                    }
                    if (this.getModeSumError(mode)) {
                        this.$message.warning(`第 ${i + 1} 个游戏第 ${j + 1} 个模式分润比例不合法`)
                        return false
                    }
                    const platform = this.calcModePlatform(mode)
                    if (!(platform > 0)) {
                        this.$message.warning(`第 ${i + 1} 个游戏第 ${j + 1} 个模式平台分润须大于 0`)
                        return false
                    }
                }
            }
            return true
        },

        /** 提交前：三项必填 + 合计 100% */
        validateAllGeneralRates() {
            const fields = ['unionRateProportion', 'waiterRateProportion', 'platformRateProportion']
            let ok = true
            fields.forEach((field) => {
                if (!this.validateGeneralRateField(field)) ok = false
            })
            if (this.getGeneralRateSumError()) {
                this.$message.warning('通用游戏类型分润比例总和必须等于 100%')
                return false
            }
            return ok
        },

        validateAllSpecialRates() {
            return this.validateSpecialRates()
        },

        /**
         * 提交总入口
         * 1) el-form 基础校验
         * 2) 通用 / 特殊分润业务校验
         * 3) 组装 submitData 后 $emit('submit')
         *
         * 注意：logo / photos 提交的是 OSS ID，不是预览地址
         */
        handleSubmit() {
            if (this.uploading || this.photoUploading) {
                this.$message.warning('图片正在上传，请稍后再提交')
                return
            }
            this.generalRateErrors = {
                unionRateProportion: '',
                waiterRateProportion: '',
                platformRateProportion: '',
            }
            this.generalRateValidated = false

            this.$refs.addFormRef.validate((valid) => {
                if (!valid) {
                    this.$message.error('请检查表单填写是否正确')
                    return
                }
                if (!this.validateAllGeneralRates()) return
                if (!this.validateAllSpecialRates()) return

                // type=1 通用
                const tradeUnionRateList = [
                    {
                        type: '1',
                        unionRateProportion: parseFloat(this.form.generalRate.unionRateProportion),
                        waiterRateProportion: parseFloat(this.form.generalRate.waiterRateProportion),
                        platformRateProportion: parseFloat(this.form.generalRate.platformRateProportion),
                    },
                ]

                // type=2 特殊：每个游戏一条，模式放进 specialProfitSharingBos
                // 编辑时必须带回 tradeUnionRateId（详情字段为 unionRateId）
                this.form.specialRates.forEach((item) => {
                    if (!item.productId) return
                    const payload = {
                        type: '2',
                        productId: item.productId,
                        specialProfitSharingBos: (item.modeRows || []).map((mode) => {
                            const union = parseFloat(mode.unionRateProportion)
                            const waiter = parseFloat(mode.waiterRateProportion)
                            const platform = Number((100 - union - waiter).toFixed(2))
                            return {
                                relationId: String(mode.relationId),
                                unionRateProportion: String(union),
                                waiterRateProportion: String(waiter),
                                platformRateProportion: String(platform),
                            }
                        }),
                    }
                    if (item.tradeUnionRateId) {
                        payload.tradeUnionRateId = String(item.tradeUnionRateId)
                    }
                    tradeUnionRateList.push(payload)
                })

                const submitData = {
                    tradeName: this.form.tradeName,
                    tradeNamePerson: this.form.tradeNamePerson,
                    phone: this.form.phone,
                    logo: this.ossId,
                    introduction: this.form.introduction,
                    photos: this.photoOssIds.filter((id) => id).join(','),
                    sortValue: this.form.sortValue,
                    tradeUnionRateList,
                }

                this.$emit('submit', submitData)
            })
        },

        /**
         * 详情回填（父组件编辑时调用）
         * - logo：接口常返回 logo(ID) + logoUrl(预览)
         * - photos：逗号 ID 串；photosUrl：逗号预览串
         * - tradeUnionRateList：优先；否则兼容 tradeUnionSpecialRateList
         * - 回填特殊游戏后，按 productId 异步加载模式选项
         */
        async fillFormData(data) {
            this.ossId = data.logo || data.logoOssId || ''
            const logoUrl = data.logoUrl || ''

            let photosArray = []
            let photoOssIdsArray = []
            if (data.photos) {
                photoOssIdsArray = String(data.photos)
                    .split(',')
                    .filter((id) => id && String(id).trim())
            }
            if (data.photosUrl) {
                photosArray = String(data.photosUrl)
                    .split(',')
                    .filter((url) => url && String(url).trim())
            } else if (Array.isArray(data.photoUrls)) {
                photosArray = data.photoUrls
            }
            this.photoOssIds = photoOssIdsArray

            this.form.tradeName = data.tradeName || ''
            this.form.tradeNamePerson = data.tradeNamePerson || ''
            this.form.phone = data.phone || ''
            this.form.logo = logoUrl
            this.form.introduction = data.introduction || ''
            this.form.photos = photosArray
            this.form.sortValue = data.sortValue != null ? Number(data.sortValue) : 0

            // ---- 通用分润回填 ----
            const rateList = Array.isArray(data.tradeUnionRateList) ? data.tradeUnionRateList : []
            const general =
                rateList.find((item) => String(item.type) === '1') ||
                rateList.find(
                    (item) => !item.productId && !item.specialProfitSharingVoList && !item.specialProfitSharingBos
                )

            if (general) {
                this.form.generalRate = {
                    unionRateProportion: toDisplayPercent(general.unionRateProportion),
                    waiterRateProportion: toDisplayPercent(general.waiterRateProportion),
                    platformRateProportion: toDisplayPercent(general.platformRateProportion),
                }
            } else {
                this.form.generalRate = {
                    unionRateProportion: '',
                    waiterRateProportion: '',
                    platformRateProportion: '',
                }
            }

            // ---- 特殊分润回填 ----
            // 详情特殊配置主要在 tradeUnionSpecialRateList；tradeUnionRateList 里 type=2 作兼容
            // 主键字段：详情 unionRateId → 表单 tradeUnionRateId → 提交 tradeUnionRateId
            const specialFromRateList = rateList.filter(
                (item) =>
                    String(item.type) === '2' ||
                    item.productId ||
                    item.specialProfitSharingVoList ||
                    item.specialProfitSharingBos
            )
            const specialFromLegacy = Array.isArray(data.tradeUnionSpecialRateList)
                ? data.tradeUnionSpecialRateList
                : []
            const source = specialFromLegacy.length ? specialFromLegacy : specialFromRateList

            this.form.specialRates = []
            for (const item of source) {
                const modeSource = item.specialProfitSharingVoList || item.specialProfitSharingBos || []
                const modeRows = modeSource.length
                    ? modeSource.map((mode) =>
                          createModeRow({
                              relationId: mode.relationId,
                              // 特殊模式接口常返回小数（0.7），页面按百分数编辑
                              unionRateProportion: toDisplayPercent(mode.unionRateProportion),
                              waiterRateProportion: toDisplayPercent(mode.waiterRateProportion),
                          })
                      )
                    : [
                          createModeRow({
                              relationId: item.relationId,
                              unionRateProportion: toDisplayPercent(item.unionRateProportion),
                              waiterRateProportion: toDisplayPercent(item.waiterRateProportion),
                          }),
                      ]

                const special = createSpecialRate({
                    productId: item.productId || '',
                    tradeUnionRateId: pickUnionRateId(item),
                    modeRows,
                })
                this.form.specialRates.push(special)
                if (special.productId) {
                    await this.loadModesForSpecial(this.form.specialRates.length - 1)
                }
            }

            this.phoneDisabled = true
            this.generalRateErrors = {
                unionRateProportion: '',
                waiterRateProportion: '',
                platformRateProportion: '',
            }
            this.generalRateValidated = false
            this.$nextTick(() => {
                this.$refs.addFormRef && this.$refs.addFormRef.clearValidate()
            })
        },

        /** 编辑回填后，为某一特殊游戏块加载模式下拉选项 */
        async loadModesForSpecial(sIndex) {
            const special = this.form.specialRates[sIndex]
            if (!special || !special.productId) return
            special.modeLoading = true
            try {
                const res = await productFieldRelationList({
                    productId: special.productId,
                    businessType: '1',
                    moduleType: '6',
                })
                const list = (res.success && res.data) || res.data || []
                const rows = Array.isArray(list) ? list : []
                special.modeOptions = rows
                    .filter((item) => item.parentId === 0 || item.parentId === '0' || item.parentId == null)
                    .map((item) => ({
                        id: String(item.id),
                        fieldName: item.fieldName,
                    }))
            } catch (e) {
                console.error('获取游戏模式失败', e)
            } finally {
                special.modeLoading = false
            }
        },

        /**
         * 重置为新增空白态（父组件打开「新增」或提交成功关抽屉前可调用）
         */
        resetForm() {
            this.isEditMode = false
            this.phoneDisabled = false
            this.ossId = ''
            this.photoOssIds = []
            this.form = {
                tradeName: '',
                tradeNamePerson: '',
                phone: '',
                logo: '',
                introduction: '',
                photos: [],
                sortValue: 0,
                generalRate: {
                    unionRateProportion: '',
                    waiterRateProportion: '',
                    platformRateProportion: '',
                },
                specialRates: [],
            }
            this.generalRateErrors = {
                unionRateProportion: '',
                waiterRateProportion: '',
                platformRateProportion: '',
            }
            this.generalRateValidated = false
            this.$nextTick(() => {
                this.$refs.addFormRef && this.$refs.addFormRef.clearValidate()
            })
        },
    }
}
</script>

<style lang="scss" scoped>
/*
  样式分区说明：
  - .uf-block*        三大步骤卡片
  - .uf-basic*        基础资料左右分栏
  - .percent-field*   百分比一体输入框
  - .uf-rate-grid*    通用分润三卡 + 进度条
  - .uf-game* / .uf-mode*  特殊游戏与模式行
  - .media-upload*    Logo / 封面上传
  - .union-form__footer 吸底操作栏
*/
.union-form {
    --uf-purple: #6a35ff;
    --uf-purple-2: #8f03ff;
    --uf-ink: #1f2533;
    --uf-muted: #8a94a6;
    --uf-line: #e8ecf3;
    --uf-soft: #f6f7fb;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.union-form__panel {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 8px 6px 20px;
}

.uf-block {
    margin-bottom: 16px;
    padding: 20px 20px 12px;
    border-radius: 18px;
    background: #fff;
    border: 1px solid var(--uf-line);
    box-shadow: 0 8px 24px rgba(47, 58, 84, 0.04);
    transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.uf-block:hover {
    border-color: rgba(106, 53, 255, 0.18);
    box-shadow: 0 12px 28px rgba(106, 53, 255, 0.06);
}

.uf-block__head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
}

.uf-block__index {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--uf-purple);
    background: linear-gradient(180deg, #f4efff 0%, #ebe4ff 100%);
    border: 1px solid rgba(106, 53, 255, 0.12);
}

.uf-block__title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--uf-ink);
    line-height: 1.3;
}

.uf-block__desc {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--uf-muted);
    line-height: 1.5;
}

.uf-block__head-main {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
}

.uf-basic {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.8fr);
    gap: 20px;
    align-items: start;
}

@media (max-width: 1100px) {
    .uf-basic {
        grid-template-columns: 1fr;
    }
}

.uf-basic__media {
    padding: 16px;
    border-radius: 14px;
    background: #fafbfe;
    border: 1px solid #e8ebf2;
}

.uf-media-item {
    margin-bottom: 12px !important;
}

.uf-media-item:last-child {
    margin-bottom: 0 !important;
}

::v-deep .el-form-item {
    margin-bottom: 16px;
}

::v-deep .el-form-item__label {
    padding: 0 0 6px;
    line-height: 1.2;
    font-weight: 600;
    font-size: 13px;
    color: #3d4556;
}

/* 校验提示：柔和、不抢戏 */
::v-deep .el-form-item__error {
    position: static;
    padding-top: 6px;
    margin-left: 0;
    font-size: 12px;
    line-height: 1.4;
    color: #c45c4a;
    background: transparent;
}

::v-deep .el-form-item.is-error .el-input__inner,
::v-deep .el-form-item.is-error .el-textarea__inner {
    border-color: #f0b8ae !important;
    background: #fff9f8 !important;
    box-shadow: none !important;
}

::v-deep .el-form-item.is-error .el-input__inner:focus,
::v-deep .el-form-item.is-error .el-textarea__inner:focus {
    border-color: #e89284 !important;
    box-shadow: 0 0 0 3px rgba(228, 120, 100, 0.1) !important;
}

::v-deep .el-input__inner,
::v-deep .el-textarea__inner {
    border-radius: 12px;
    border-color: #e2e8f2;
    background: #fcfcff;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

::v-deep .el-input__inner {
    height: 40px;
    line-height: 40px;
}

::v-deep .el-input__inner:focus,
::v-deep .el-textarea__inner:focus {
    border-color: var(--uf-purple-2);
    box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

::v-deep .el-select .el-input.is-focus .el-input__inner {
    border-color: var(--uf-purple-2);
    box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

::v-deep .el-input-number {
    width: 100%;
}

::v-deep .el-input-number .el-input__inner {
    text-align: left;
}

/* 百分比一体框：输入与 % 同边框 */
.percent-field {
    display: flex;
    align-items: center;
    width: 100%;
    height: 40px;
    border: 1px solid #e2e8f2;
    border-radius: 12px;
    background: #fcfcff;
    overflow: hidden;
    box-sizing: border-box;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.percent-field.is-focus {
    border-color: var(--uf-purple-2);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.percent-field.is-invalid {
    border-color: #f0b8ae;
    background: #fff9f8;
    box-shadow: none;
}

.percent-field.is-invalid.is-focus {
    border-color: #e89284;
    box-shadow: 0 0 0 3px rgba(228, 120, 100, 0.1);
}

.uf-rate-card ::v-deep .el-form-item__error {
    padding: 6px 2px 2px;
}

.uf-rate-card.is-error {
    background: #fff7f5;
    border-color: rgba(228, 120, 100, 0.18);
}

.percent-field ::v-deep .el-input {
    flex: 1 1 0;
    width: auto !important;
    min-width: 0 !important;
}

.percent-field ::v-deep .el-input__inner {
    width: 100% !important;
    height: 38px !important;
    line-height: 38px !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    padding-right: 2px !important;
}

.percent-field__unit {
    flex: 0 0 auto;
    padding: 0 12px 0 2px;
    color: #909399;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    user-select: none;
}

.uf-rate-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

@media (max-width: 900px) {
    .uf-rate-grid {
        grid-template-columns: 1fr;
    }
}

.uf-rate-card {
    margin-bottom: 8px !important;
    padding: 12px 12px 4px;
    border-radius: 14px;
    background: var(--uf-soft);
    border: 1px solid transparent;
    transition: border-color 0.2s ease, background 0.2s ease;
}

.uf-rate-card:focus-within {
    background: #fff;
    border-color: rgba(106, 53, 255, 0.22);
}

.uf-sum-badge {
    flex-shrink: 0;
    padding: 7px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: #5d6678;
    background: #f0f2f7;
    transition: all 0.2s ease;
}

.uf-sum-badge.is-ok {
    color: #1f9d63;
    background: rgba(31, 157, 99, 0.1);
}

.uf-sum-badge.is-error {
    color: #d63d28;
    background: rgba(214, 61, 40, 0.1);
}

.uf-progress {
    margin: 8px 0 8px;
}

.uf-progress__track {
    display: flex;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: #eef1f6;
}

.uf-progress__seg {
    height: 100%;
    transition: width 0.35s ease;
}

.uf-progress__seg.is-union {
    background: #6a35ff;
}

.uf-progress__seg.is-waiter {
    background: #22c3a6;
}

.uf-progress__seg.is-platform {
    background: #f5a524;
}

.uf-progress__legend {
    display: flex;
    gap: 14px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--uf-muted);

    span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .dot.is-union {
        background: #6a35ff;
    }

    .dot.is-waiter {
        background: #22c3a6;
    }

    .dot.is-platform {
        background: #f5a524;
    }
}

.uf-sum-hint {
    margin: 10px 0 0;
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.4;
    color: #b4533f;
    background: rgba(228, 120, 100, 0.08);
    border: 1px solid rgba(228, 120, 100, 0.14);
}

.uf-add-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 7px 12px;
    border: none;
    border-radius: 999px;
    background: rgba(106, 53, 255, 0.08);
    color: var(--uf-purple);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;

    &:hover {
        background: rgba(106, 53, 255, 0.14);
        transform: translateY(-1px);
    }
}

.uf-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 120px;
    margin-bottom: 8px;
    border-radius: 14px;
    border: 1px dashed #d5dbeb;
    background: linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
    color: var(--uf-muted);
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease;

    i {
        font-size: 22px;
        color: #a78bfa;
    }

    p {
        margin: 0;
        font-size: 13px;
    }

    &:hover {
        border-color: rgba(106, 53, 255, 0.45);
        color: var(--uf-purple);
    }
}

.uf-game {
    margin-bottom: 12px;
    padding: 14px;
    border-radius: 14px;
    background: var(--uf-soft);
    border: 1px solid #e6ebf4;
}

.uf-game__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
}

.uf-game__title {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.uf-game__tag {
    flex-shrink: 0;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--uf-purple);
    background: rgba(106, 53, 255, 0.08);
}

.uf-game__select {
    flex: 1;
    margin-bottom: 0 !important;
    min-width: 0;
}

.uf-game__remove {
    border: none;
    background: transparent;
    color: #d63d28;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 4px;
}

.uf-mode {
    margin-top: 10px;
    padding: 12px 12px 4px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid #eef1f6;
}

.uf-mode__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.uf-mode__label {
    font-size: 12px;
    font-weight: 700;
    color: #6a4ce0;
}

.uf-mode__actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.op-icon {
    width: 20px;
    height: 20px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;

    &:hover {
        opacity: 0.8;
        transform: scale(1.05);
    }

    &.disabled {
        opacity: 0.28;
        cursor: not-allowed;
        pointer-events: none;
    }
}

.uf-mode__rates {
    display: grid;
    grid-template-columns: 1fr 1fr minmax(88px, 0.7fr);
    gap: 12px;
    align-items: end;
}

@media (max-width: 900px) {
    .uf-mode__rates {
        grid-template-columns: 1fr;
    }
}

.uf-platform-chip {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    min-height: 64px;
    margin-bottom: 16px;
    padding: 10px 12px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1f2433 0%, #34435f 100%);
    color: #fff;
    box-shadow: 0 8px 18px rgba(44, 58, 88, 0.16);

    &.is-error {
        background: linear-gradient(135deg, #6b2430 0%, #a13a3a 100%);
    }
}

.uf-platform-chip__label {
    font-size: 11px;
    opacity: 0.72;
}

.uf-platform-chip strong {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0.02em;
}

.uf-mode__error {
    margin: -6px 0 10px;
    font-size: 12px;
    color: #d63d28;
}

.media-upload {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.media-upload__item,
.media-upload__trigger {
    border-radius: 10px;
}

.media-upload__item.is-logo {
    width: 84px;
    height: 84px;
}

.media-upload__item.is-cover {
    width: 140px;
    height: 84px;
}

.media-upload__trigger.is-logo,
.media-upload__trigger.is-cover {
    width: 100%;
    height: 72px;
}

.media-upload__item {
    position: relative;
    overflow: hidden;
    border: 1px solid #e6eaf2;
    background: #fff;
    box-shadow: 0 6px 16px rgba(90, 105, 132, 0.08);
}

.media-upload__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.media-upload__mask {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    background: rgba(31, 37, 51, 0.55);
    opacity: 0;
    transition: opacity 0.2s ease;

    i {
        font-size: 16px;
        color: #fff;
        cursor: pointer;
    }
}

.media-upload__item:hover .media-upload__mask {
    opacity: 1;
}

.media-upload__loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.78);

    i {
        font-size: 20px;
        color: var(--uf-purple-2);
    }
}

.media-upload__trigger {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    box-sizing: border-box;
    padding: 0 14px;
    overflow: hidden;
    border: 1px solid #e3e6ef;
    background: #fff;
    color: #465166;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(45, 55, 78, 0.04);
    transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;

    i {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: #f1edff;
        color: #6a35ff;
        font-size: 17px;
        font-weight: 600;
        transition: background 0.2s ease, color 0.2s ease;
    }

    span {
        font-size: 13px;
        font-weight: 600;
    }

    &:hover {
        border-color: rgba(106, 53, 255, 0.42);
        color: #6a35ff;
        box-shadow: 0 6px 16px rgba(106, 53, 255, 0.09);

        i {
            background: #6a35ff;
            color: #fff;
        }
    }

    &.is-uploading {
        pointer-events: none;
        cursor: not-allowed;
    }
}

.upload-tip {
    margin-top: 7px;
    padding-left: 2px;
    font-size: 11px;
    color: #939cad;
}

.union-form__footer {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 14px 6px 2px;
    border-top: 1px solid var(--uf-line);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), #fff);
}

.union-form__btn {
    min-width: 96px;
    height: 40px;
    border-radius: 999px;
    font-weight: 600;
}

.union-form__btn--ghost {
    border-color: #dbe1ec;
    background: #fff;
    color: #566174;
}

.union-form__btn--ghost:hover,
.union-form__btn--ghost:focus {
    color: #566174;
    border-color: #c8d1e0;
    background: #f8faff;
}

.union-form__btn--primary {
    border: none;
    background: linear-gradient(135deg, #8f03ff 0%, #5c67ff 100%);
    box-shadow: 0 10px 22px rgba(108, 95, 255, 0.22);
}

.union-form__btn--primary:hover,
.union-form__btn--primary:focus {
    background: linear-gradient(135deg, #7b00df 0%, #4f58eb 100%);
}
</style>
