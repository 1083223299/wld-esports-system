<template>

    <el-dialog :title="title" :visible.sync="visible" width="600px" @close="handleClose">
        <!-- 
            字段关联配置弹窗组件
            功能：用于新增/编辑字段关联配置
            支持两种模式：
            1. 普通模式：单条配置
            2. 批量模式：当父级类型为筛选项(4)时，支持批量添加多条配置
        -->

        <!-- 表单 -->
        <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">

            <!-- ==================== 批量添加模式 ==================== -->
            <template v-if="isBatchMode">
                <div v-for="(item, index) in form.items" :key="index" class="batch-item-wrapper">
                    <div class="batch-item-header">
                        <span class="batch-item-index">第 {{ index + 1 }} 项</span>
                        <div class="batch-actions">
                            <el-button v-if="index === form.items.length - 1 && form.items.length < 50" type="text"
                                icon="el-icon-plus" class="batch-add" @click="addBatchItem" />
                            <el-button v-if="form.items.length > 1" type="text" icon="el-icon-minus"
                                class="batch-remove" @click="removeBatchItem(index)" />
                        </div>
                    </div>

                    <el-form-item :label="`字段名称`" :prop="`items.${index}.productFieldId`" :rules="batchFieldRules">
                        <el-select v-model="item.productFieldId" placeholder="请选择字段" style="width: 100%" clearable
                            filterable>
                            <el-option v-for="field in fields" :key="field.id" :label="field.fieldName"
                                :value="field.id" />
                        </el-select>
                    </el-form-item>

                    <el-form-item :label="`类型`" :prop="`items.${index}.fieldType`" :rules="batchTypeRules">
                        <el-select v-model="item.fieldType" placeholder="请选择类型" style="width: 100%"
                            @change="() => handleBatchFieldTypeChange(item)">
                            <el-option v-for="option in filteredTypeOptions" :key="option.value" :label="option.label"
                                :value="option.value" />
                        </el-select>
                    </el-form-item>

                    <el-form-item :label="`排序值`" :prop="`items.${index}.orderNum`" :rules="batchOrderRules">
                        <el-input-number v-model="item.orderNum" :min="0" :max="9999" placeholder="请输入排序值" />
                    </el-form-item>

                    <el-form-item :label="`是否必填`" :prop="`items.${index}.isRequired`">
                        <el-radio-group v-model="item.isRequired">
                            <el-radio label="0">非必填</el-radio>
                            <el-radio label="1">必填</el-radio>
                        </el-radio-group>
                    </el-form-item>

                    <el-form-item :label="`展示模式`" v-if="item.fieldType == '3' || item.fieldType == '4'">
                        <el-radio-group v-model="item.showMode" v-loading="showModeLoading">
                            <el-radio v-for="mode in showModeList" :key="mode.code" :label="String(mode.code)">
                                {{ mode.name }}
                                <span class="example-link" @click.prevent.stop="previewModeImage(mode.value)">示例</span>
                            </el-radio>
                        </el-radio-group>
                    </el-form-item>

                    <el-form-item :label="`价格区间`" v-if="item.fieldType == '9'">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <el-form-item :prop="`items.${index}.priceRangeMin`" :rules="batchPriceRangeMinRules"
                                style="margin-bottom: 0;">
                                <el-input-number v-model="item.priceRangeMin" :precision="2" :min="0" placeholder="下限"
                                    @change="validateBatchRangeField(index, 'priceRangeMax')" />
                            </el-form-item>
                            <span>至</span>
                            <el-form-item :prop="`items.${index}.priceRangeMax`"
                                :rules="getBatchPriceRangeMaxRules(index)" style="margin-bottom: 0;">
                                <el-input-number v-model="item.priceRangeMax" :precision="2" :min="0" placeholder="上限"
                                    @change="validateBatchRangeField(index, 'priceRangeMax')" />
                            </el-form-item>
                        </div>
                    </el-form-item>

                    <el-divider v-if="index !== form.items.length - 1" />
                </div>
            </template>

            <!-- ==================== 普通模式（非批量添加） ==================== -->
            <template v-else>
                <el-form-item label="字段名称" prop="productFieldId">
                    <el-select v-model="form.productFieldId" placeholder="请选择字段" style="width: 100%" clearable
                        filterable>
                        <el-option v-for="field in fields" :key="field.id" :label="field.fieldName" :value="field.id" />
                    </el-select>
                </el-form-item>

                <el-form-item label="类型" prop="fieldType">
                    <el-select v-model="form.fieldType" placeholder="请选择类型" style="width: 100%">
                        <el-option v-for="option in filteredTypeOptions" :key="option.value" :label="option.label"
                            :value="option.value" />
                    </el-select>
                </el-form-item>

                <el-form-item label="排序" prop="orderNum">
                    <el-input-number v-model="form.orderNum" :min="0" :max="9999" placeholder="请输入排序值" />
                </el-form-item>


                <el-form-item label="是否必填" prop="isRequired">
                    <el-radio-group v-model="form.isRequired">
                        <el-radio label="0">非必填</el-radio>
                        <el-radio label="1">必填</el-radio>
                    </el-radio-group>
                </el-form-item>

                <!-- ========== 展示模式：仅输入项(3)和筛选项(4)时显示 ========== -->
                <el-form-item label="展示模式" prop="showMode" v-if="form.fieldType == '3' || form.fieldType == '4'">
                    <el-radio-group v-model="form.showMode" v-loading="showModeLoading">
                        <el-radio v-for="mode in showModeList" :key="mode.code" :label="String(mode.code)">
                            {{ mode.name }}
                            <span class="example-link" @click.prevent.stop="previewModeImage(mode.value)">示例</span>
                        </el-radio>
                    </el-radio-group>
                </el-form-item>

                <!-- ========== 数字限制：仅数字类型(2)时显示 ========== -->
                <el-form-item label="数字限制" v-if="form.fieldType == '2'">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <el-form-item prop="minNum" style="margin-bottom: 0;">
                            <el-input-number v-model="form.minNum" :min="0" :max="9999.98" :step="1"
                                controls-position="right" placeholder="最小值" style="width: 120px"
                                @change="validateField('maxNum')" />
                        </el-form-item>
                        <span>至</span>
                        <el-form-item prop="maxNum" style="margin-bottom: 0;">
                            <el-input-number v-model="form.maxNum" :min="1" :max="10000" :step="1"
                                controls-position="right" placeholder="最大值" style="width: 120px"
                                @change="validateField('maxNum')" />
                        </el-form-item>
                    </div>
                </el-form-item>

                <!-- ========== 字符上限：无限制类型(3)时显示 ========== -->
                <el-form-item label="字符上限" v-if="form.fieldType == '3'">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <el-form-item prop="charMin" style="margin-bottom: 0;">
                            <el-input v-model.number="form.charMin" type="number" :min="0" :max="9998" placeholder="最小值"
                                style="width: 120px" @change="validateField('charMax')" />
                        </el-form-item>
                        <span>至</span>
                        <el-form-item prop="charMax" style="margin-bottom: 0;">
                            <el-input v-model.number="form.charMax" type="number" :min="1" :max="9999" placeholder="最大值"
                                style="width: 120px" @change="validateField('charMax')" />
                        </el-form-item>
                    </div>
                </el-form-item>

                <!-- 提示词 -->
                <el-form-item label="提示词" prop="placeholder" v-if="form.fieldType == '2' || form.fieldType == '3'">
                    <el-input v-model="form.placeholder" type="textarea" :rows="3" maxlength="200" show-word-limit
                        placeholder="请输入提示词" />
                </el-form-item>

                <!-- ========== 图片配置：仅图片类型(6)时显示 ========== -->
                <el-form-item label="上传数量限制" prop="imageLimitNum" v-if="form.fieldType == '6'">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <el-input-number v-model="form.imageLimitNum" :min="0" :max="10" placeholder="请输入数量" />
                        <span>张</span>
                    </div>
                </el-form-item>

                <el-form-item label="上传示例图" prop="demoImage" v-if="form.fieldType == '6'">
                    <el-upload class="avatar-uploader" action="#" :show-file-list="false"
                        :before-upload="beforeAvatarUpload" :http-request="handleAvatarUpload" :disabled="uploading">
                        <div class="upload-container">
                            <div v-if="form.demoImage" class="avatar-wrapper">
                                <img :src="form.demoImage" alt="" class="avatar"
                                    @click="handlePictureCardPreview({ url: form.demoImage })" />
                                <div class="avatar-actions">
                                    <el-button type="danger" icon="el-icon-delete" circle size="mini"
                                        @click.stop="handleRemoveLogo" title="删除图片" />
                                </div>
                            </div>
                            <div v-else-if="!uploading" class="upload-placeholder">
                                <i class="el-icon-plus"></i>
                                <span class="upload-text">上传</span>
                            </div>
                            <div v-if="uploading" class="uploading-overlay">
                                <div class="uploading-content">
                                    <i class="el-icon-loading"></i>
                                    <span class="uploading-text">上传中...</span>
                                    <el-progress v-if="uploadProgress > 0" :percentage="uploadProgress"
                                        :stroke-width="6" :show-text="false" class="upload-progress" />
                                </div>
                            </div>
                        </div>
                        <div class="el-upload__tip" slot="tip">仅支持上传png、jpg格式，图片大小不得超过2M</div>
                    </el-upload>
                    <el-dialog :visible.sync="dialogVisible">
                        <img width="100%" :src="dialogImageUrl" alt="">
                    </el-dialog>
                </el-form-item>

                <!-- ========== 自定义商品配置：仅自定义商品类型(8)时显示 ========== -->
                <el-form-item label="商品数上限" prop="productLimitNum" v-if="form.fieldType == '8'">
                    <el-input-number v-model="form.productLimitNum" :min="0" :max="9999" placeholder="请输入商品数上限" />
                </el-form-item>

                <el-form-item label="价格上下限" v-if="form.fieldType == '8'">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <el-form-item prop="priceMin" style="margin-bottom: 0;">
                            <el-input-number v-model.number="form.priceMin" :precision="2" type="number" :min="0"
                                :max="9998" placeholder="最小值" @change="validateField('priceMax')" />
                        </el-form-item>
                        <span>至</span>
                        <el-form-item prop="priceMax" style="margin-bottom: 0;">
                            <el-input-number v-model.number="form.priceMax" :precision="2" type="number" :min="0"
                                :max="9999" placeholder="最大值" @change="validateField('priceMax')" />
                        </el-form-item>
                    </div>
                </el-form-item>
                <!-- ========== 价格区间：仅选项值(价格)类型(9)时显示 ========== -->
                <el-form-item label="价格区间" v-if="form.fieldType == '9'">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <el-form-item prop="priceRangeMin" style="margin-bottom: 0;">
                            <el-input-number v-model.number="form.priceRangeMin" :precision="2" type="number" :min="0"
                                placeholder="下限" @change="validateField('priceRangeMax')" />
                        </el-form-item>
                        <span>至</span>
                        <el-form-item prop="priceRangeMax" style="margin-bottom: 0;">
                            <el-input-number v-model.number="form.priceRangeMax" :precision="2" type="number" :min="0"
                                placeholder="上限" @change="validateField('priceRangeMax')" />
                        </el-form-item>
                    </div>
                </el-form-item>
            </template>
        </el-form>

        <span slot="footer">
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="submit" :loading="submitting">确定</el-button>
        </span>
        <!-- 展示模式示例图片预览弹窗 -->
        <el-dialog title="示例图片" :visible.sync="modeImagePreviewVisible" width="600px" append-to-body
            @close="closeModeImagePreview">
            <div style="text-align: center;">
                <img :src="modeImagePreviewUrl" alt="示例图片" style="max-width: 100%; max-height: 500px;" />
            </div>
            <span slot="footer">
                <el-button @click="closeModeImagePreview">关闭</el-button>
            </span>
        </el-dialog>
    </el-dialog>

</template>

<script>
import { ProductFieldRelationId, getShowModeList } from '@/api/goodsAreaRelation';
import { fileUpload } from '@/api/user';

const ALL_TYPE_OPTIONS = [
    { label: '标题', value: '1' },
    { label: '输入项(仅数字)', value: '2' },
    { label: '输入项(无限制)', value: '3' },
    { label: '筛选项', value: '4' },
    { label: '图片', value: '6' },
    { label: '选项值', value: '7' },
    { label: '自定义商品', value: '8' },
    { label: '选项值(价格)', value: '9' }
];

export default {
    name: 'RelationFormDialog',
    props: {
        title: { type: String, default: '' },
        fields: { type: Array, default: () => [] },
        moduleType: { type: String, default: '' } // 模块类型
    },
    data() {
        const validateGreaterThan = (leftKey, message) => (rule, value, callback) => {
            if (value === '' || value === null || value === undefined) {
                callback();
                return;
            }
            const leftValue = this.form[leftKey];
            if (leftValue === '' || leftValue === null || leftValue === undefined) {
                callback();
                return;
            }
            if (Number(value) <= Number(leftValue)) {
                callback(new Error(message));
                return;
            }
            callback();
        };

        return {
            visible: false,
            submitting: false,
            uploading: false,
            uploadProgress: 0,
            cancelUpload: null,
            isBatchMode: false,
            parentFieldType: null,
            showModeList: [],
            showModeLoading: false,
            form: {
                id: '',
                productFieldId: '',
                fieldType: '',
                Type: '',
                orderNum: 0,
                isRequired: '1',
                showMode: '',           // 展示模式
                minNum: 0,
                maxNum: 0,
                charMin: 0,
                charMax: 0,
                placeholder: '',
                demoImage: '',
                imageLimitNum: 0,
                productLimitNum: 0,
                priceMin: 0,
                priceMax: 0,
                priceRangeMin: '',      // 新增：价格区间下限
                priceRangeMax: '',      // 新增：价格区间上限
                items: [{
                    productFieldId: '',
                    fieldType: '',
                    orderNum: 0,
                    isRequired: '1',
                    showMode: '',
                    priceRangeMin: '',   // 新增：批量模式价格区间下限
                    priceRangeMax: ''    // 新增：批量模式价格区间上限
                }]
            },
            dialogVisible: false,
            dialogImageUrl: '',
            rules: {
                productFieldId: [{ required: true, message: '请选择字段', trigger: 'change' }],
                fieldType: [{ required: true, message: '请选择类型', trigger: 'change' }],
                orderNum: [{ required: true, message: '请输入排序值', trigger: 'blur' }],
                isRequired: [{ required: true, message: '请选择是否必填', trigger: 'change' }],
                showMode: [{ required: true, message: '请选择展示模式', trigger: 'change' }],
                minNum: [{ required: true, message: '请输入最小值', trigger: 'blur' }],
                maxNum: [
                    { required: true, message: '请输入最大值', trigger: 'blur' },
                    { validator: validateGreaterThan('minNum', '最大值必须大于最小值'), trigger: 'blur' }
                ],
                charMin: [{ required: true, message: '请输入最小字符数', trigger: 'blur' }],
                charMax: [
                    { required: true, message: '请输入最大字符数', trigger: 'blur' },
                    { validator: validateGreaterThan('charMin', '最大字符数必须大于最小字符数'), trigger: 'blur' }
                ],
                placeholder: [{ required: true, message: '请输入提示词', trigger: 'blur' }],
                imageLimitNum: [{ required: true, message: '请输入上传数量限制', trigger: 'blur' }],
                demoImage: [{ required: true, message: '请上传示例图', trigger: 'change' }],
                productLimitNum: [{ required: true, message: '请输入商品数上限', trigger: 'blur' }],
                priceMin: [{ required: true, message: '请输入价格最小值', trigger: 'blur' }],
                priceMax: [
                    { required: true, message: '请输入价格最大值', trigger: 'blur' },
                    { validator: validateGreaterThan('priceMin', '价格最大值必须大于价格最小值'), trigger: 'blur' }
                ],
                priceRangeMin: [{ required: true, message: '请输入价格区间下限', trigger: 'blur' }],  // 新增
                priceRangeMax: [
                    { required: true, message: '请输入价格区间上限', trigger: 'blur' },
                    { validator: validateGreaterThan('priceRangeMin', '价格区间上限必须大于下限'), trigger: 'blur' }
                ]   // 新增
            },
            batchFieldRules: [{ required: true, message: '请选择字段', trigger: 'change' }],
            batchTypeRules: [{ required: true, message: '请选择类型', trigger: 'change' }],
            batchOrderRules: [{ required: true, message: '请输入排序值', trigger: 'blur' }],
            batchPriceRangeMinRules: [{ required: true, message: '请输入价格区间下限', trigger: 'change' }],
            businessConfig: null,
            currentDepth: 1,
            maxDepth: null,
            ossId: '',

            modeImagePreviewVisible: false,  // 展示模式图片预览弹窗
            modeImagePreviewUrl: '',         // 展示模式图片预览URL
        };
    },
    watch: {
        'form.fieldType': {
            handler(newVal) {
                if (newVal === '2' || newVal === '3' || newVal === '4') {
                    this.fetchShowModeList(newVal);
                } else {
                    this.showModeList = [];
                    this.form.showMode = '';
                }
            },
            immediate: true
        }
    },
    computed: {
        filteredTypeOptions() {
            if (!this.businessConfig || !this.businessConfig.supportedTypes) {
                return ALL_TYPE_OPTIONS;
            }
            let options = ALL_TYPE_OPTIONS.filter(option =>
                this.businessConfig.supportedTypes.includes(option.value)
            );
            if (this.businessConfig.maxDepth && this.currentDepth >= this.businessConfig.maxDepth) {
                options = options.filter(option => option.value === '7' || option.value === '9');
            }
            return options;
        },

    },
    methods: {
        isEmptyValue(value) {
            return value === '' || value === null || value === undefined;
        },

        validateField(prop) {
            this.$nextTick(() => {
                if (this.$refs.formRef) {
                    this.$refs.formRef.validateField(prop, () => { });
                }
            });
        },

        validateBatchRangeField(index, rightKey) {
            this.$nextTick(() => {
                if (this.$refs.formRef) {
                    this.$refs.formRef.validateField(`items.${index}.${rightKey}`, () => { });
                }
            });
        },

        getBatchPriceRangeMaxRules(index) {
            return [
                { required: true, message: '请输入价格区间上限', trigger: 'change' },
                {
                    validator: (rule, value, callback) => {
                        if (this.isEmptyValue(value)) {
                            callback();
                            return;
                        }
                        const leftValue = this.form.items[index] && this.form.items[index].priceRangeMin;
                        if (this.isEmptyValue(leftValue)) {
                            callback();
                            return;
                        }
                        if (Number(value) <= Number(leftValue)) {
                            callback(new Error('价格区间上限必须大于下限'));
                            return;
                        }
                        callback();
                    },
                    trigger: 'change'
                }
            ];
        },

        validateCurrentRange() {
            const rangeMap = {
                '2': { leftKey: 'minNum', rightKey: 'maxNum', message: '最大值必须大于最小值' },
                '3': { leftKey: 'charMin', rightKey: 'charMax', message: '最大字符数必须大于最小字符数' },
                '8': { leftKey: 'priceMin', rightKey: 'priceMax', message: '价格最大值必须大于价格最小值' },
                '9': { leftKey: 'priceRangeMin', rightKey: 'priceRangeMax', message: '价格区间上限必须大于下限' }
            };
            const currentRange = rangeMap[this.form.fieldType];
            if (!currentRange) {
                return true;
            }
            const leftValue = this.form[currentRange.leftKey];
            const rightValue = this.form[currentRange.rightKey];
            if (this.isEmptyValue(leftValue) || this.isEmptyValue(rightValue)) {
                return true;
            }
            if (Number(rightValue) <= Number(leftValue)) {
                this.$message.error(currentRange.message);
                this.validateField(currentRange.rightKey);
                return false;
            }
            return true;
        },

        isTypeSelectable(typeValue) {
            return this.filteredTypeOptions.some(opt => opt.value === typeValue);
        },

        handleBatchFieldTypeChange(item) {
            item.showMode = '';
            if (item.fieldType === '2' || item.fieldType === '3' || item.fieldType === '4') {
                this.fetchShowModeList(item.fieldType);
            } else {
                this.showModeList = [];
            }
        },

        // 预览展示模式示例图片
        previewModeImage(imageUrl) {
            if (!imageUrl) {
                this.$message.warning('暂无示例图片');
                return;
            }
            this.modeImagePreviewUrl = imageUrl;
            this.modeImagePreviewVisible = true;
        },

        // 关闭展示模式图片预览
        closeModeImagePreview() {
            this.modeImagePreviewVisible = false;
            this.modeImagePreviewUrl = '';
        },
        // 获取展示模式列表
        async fetchShowModeList(fieldType) {
            this.showModeLoading = true;
            try {
                const params = {
                    fieldType: fieldType,
                    moduleType: this.moduleType,
                }
                const res = await getShowModeList(params);
                if (res.code === 200 && res.data) {
                    this.showModeList = res.data;
                }
            } catch (error) {
                console.error('获取展示模式列表失败:', error);
                this.showModeList = [];
            } finally {
                this.showModeLoading = false;
            }
        },

        openAdd(businessConfig = null) {
            this.isBatchMode = false;
            this.parentFieldType = null;
            this.businessConfig = businessConfig;
            this.currentDepth = 1;
            this.resetForm();
            this.visible = true;
            this.$nextTick(() => {
                if (this.$refs.formRef) {
                    this.$refs.formRef.clearValidate();
                }
            });
        },

        openAddChild(data) {
            this.parentFieldType = data.Type;
            this.businessConfig = data.businessConfig || null;
            this.currentDepth = (data.currentDepth || 1) + 1;
            this.maxDepth = this.businessConfig?.maxDepth || null;
            this.isBatchMode = (data.Type == 1 || data.Type == 4 || data.Type == 5);

            if (this.isBatchMode) {
                this.resetBatchForm();
            } else {
                this.resetForm();
            }

            this.visible = true;
            this.$nextTick(() => {
                if (this.$refs.formRef) {
                    this.$refs.formRef.clearValidate();
                }
            });
        },
        async openEdit(data) {
            this.isBatchMode = false;
            this.parentFieldType = null;
            this.businessConfig = data.businessConfig || null;
            this.currentDepth = 1;
            this.uploading = false;
            this.uploadProgress = 0;
            this.ossId = '';

            try {
                const res = await ProductFieldRelationId(data.id);
                const detail = res.data;

                const fieldType = String(detail.fieldType || '1');
                if (!this.isTypeSelectable(fieldType)) {
                    this.$message.warning(`当前业务场景不支持 "${this.getFieldTypeName(fieldType)}" 类型，无法编辑`);
                    return;
                }

                let showModeValue = '';
                if (fieldType === '4') {
                    showModeValue = detail.filterShowMode ? String(detail.filterShowMode) : '';
                } else if (fieldType === '2' || fieldType === '3') {
                    showModeValue = detail.inputShowMode ? String(detail.inputShowMode) : '';
                }

                this.form = {
                    id: detail.id,
                    productFieldId: detail.productFieldId || '',
                    fieldType: fieldType,
                    Type: '',
                    orderNum: detail.orderNum || 0,
                    isRequired: detail.isRequired !== undefined && detail.isRequired !== null ? String(detail.isRequired) : '1',
                    showMode: showModeValue,
                    minNum: detail.minNum || 0,
                    maxNum: detail.maxNum || 0,
                    charMin: detail.charMin || 0,
                    charMax: detail.charMax || 0,
                    placeholder: detail.placeholder || '',
                    demoImage: detail.demoImageUrl || '',
                    imageLimitNum: detail.imageLimitNum || 0,
                    productLimitNum: detail.productLimitNum || 0,
                    priceMin: detail.priceMin || 0,
                    priceMax: detail.priceMax || 0,
                    priceRangeMin: detail.priceRangeMin || '',    // 新增：回显价格区间下限
                    priceRangeMax: detail.priceRangeMax || '',    // 新增：回显价格区间上限
                    items: [{
                        productFieldId: '',
                        fieldType: '',
                        orderNum: 0,
                        isRequired: '1',
                        showMode: '',
                        priceRangeMin: '',   // 新增
                        priceRangeMax: ''    // 新增
                    }]
                };
                this.ossId = detail.demoImage || '';

            } catch (error) {
                console.error('获取字段关联详情失败:', error);
                this.$message.error('获取详情失败');
            }

            this.visible = true;
            this.$nextTick(() => {
                if (this.$refs.formRef) {
                    this.$refs.formRef.clearValidate();
                }
            });
        },
        getFieldTypeName(value) {
            const typeMap = {
                '1': '标题',
                '2': '输入项(仅数字)',
                '3': '输入项(无限制)',
                '4': '筛选项',
                '6': '图片',
                '7': '选项值',
                '8': '自定义商品',
                '9': '选项值(价格)',
            };
            return typeMap[value] || value;
        },

        resetForm() {
            this.form = {
                id: '',
                productFieldId: '',
                fieldType: '',
                Type: '',
                orderNum: 0,
                isRequired: '1',
                showMode: '',
                minNum: '',
                maxNum: '',
                charMin: '',
                charMax: '',
                placeholder: '',
                demoImage: '',
                imageLimitNum: 0,
                productLimitNum: 0,
                priceMin: '',
                priceMax: '',
                priceRangeMin: '',    // 新增
                priceRangeMax: '',    // 新增
                items: [{
                    productFieldId: '',
                    fieldType: '',
                    orderNum: 0,
                    isRequired: '1',
                    showMode: '',
                    priceRangeMin: '',  // 新增
                    priceRangeMax: ''   // 新增
                }]
            };
            this.showModeList = [];
            this.uploading = false;
            this.uploadProgress = 0;
        },

        resetBatchForm() {
            this.form = {
                id: '',
                productFieldId: '',
                fieldType: '',
                Type: '',
                orderNum: 0,
                isRequired: '1',
                showMode: '',
                minNum: 0,
                maxNum: 0,
                charMin: 0,
                charMax: 0,
                placeholder: '',
                demoImage: '',
                imageLimitNum: 0,
                productLimitNum: 0,
                priceMin: 0,
                priceMax: 0,
                priceRangeMin: '',    // 新增
                priceRangeMax: '',    // 新增
                items: [{
                    productFieldId: '',
                    fieldType: '',
                    orderNum: 0,
                    isRequired: '1',
                    showMode: '',
                    priceRangeMin: '',  // 新增
                    priceRangeMax: ''   // 新增
                }]
            };
            this.showModeList = [];
            this.uploading = false;
            this.uploadProgress = 0;
        },

        addBatchItem() {
            this.form.items.push({
                productFieldId: '',
                fieldType: '',
                orderNum: 0,
                isRequired: '1',
                showMode: ''
            });
        },

        removeBatchItem(index) {
            this.form.items.splice(index, 1);
        },

        submit() {
            if (this.isBatchMode) {
                // ==================== 批量模式验证 ====================
                for (let i = 0; i < this.form.items.length; i++) {
                    const item = this.form.items[i];

                    // 验证字段名称
                    if (!item.productFieldId) {
                        this.$message.error(`第 ${i + 1} 项：请选择字段`);
                        return;
                    }

                    // 验证类型
                    if (!item.fieldType) {
                        this.$message.error(`第 ${i + 1} 项：请选择类型`);
                        return;
                    }

                    // 验证排序值
                    if (item.orderNum === undefined || item.orderNum === null || item.orderNum === '') {
                        this.$message.error(`第 ${i + 1} 项：请输入排序值`);
                        return;
                    }

                    // 验证是否必填
                    if (!item.isRequired) {
                        this.$message.error(`第 ${i + 1} 项：请选择是否必填`);
                        return;
                    }

                    // 验证展示模式（类型2、3、4需要）
                    if ((item.fieldType == '3' || item.fieldType == '4') && !item.showMode) {
                        this.$message.error(`第 ${i + 1} 项：请选择展示模式`);
                        return;
                    }

                    if (item.fieldType == '9') {
                        if (item.priceRangeMin === '' || item.priceRangeMin === null || item.priceRangeMin === undefined) {
                            this.$message.error(`第 ${i + 1} 项：请输入价格区间下限`);
                            return;
                        }
                        if (item.priceRangeMax === '' || item.priceRangeMax === null || item.priceRangeMax === undefined) {
                            this.$message.error(`第 ${i + 1} 项：请输入价格区间上限`);
                            return;
                        }
                        if (Number(item.priceRangeMax) <= Number(item.priceRangeMin)) {
                            this.$message.error(`第 ${i + 1} 项：价格区间上限必须大于下限`);
                            return;
                        }
                    }

                    // 验证类型是否支持
                    if (!this.isTypeSelectable(item.fieldType)) {
                        this.$message.error(`第 ${i + 1} 项：当前业务场景不支持该类型`);
                        return;
                    }
                }

                // 构建批量提交数据
                const submitItems = this.form.items.map((item) => ({
                    productFieldId: item.productFieldId,
                    fieldType: item.fieldType,
                    orderNum: item.orderNum,
                    isRequired: item.isRequired,
                    showMode: (item.fieldType == '2' || item.fieldType == '3' || item.fieldType == '4') ? item.showMode : undefined,
                    priceRangeMin: item.fieldType == '9' ? item.priceRangeMin : undefined,
                    priceRangeMax: item.fieldType == '9' ? item.priceRangeMax : undefined,
                }));

                this.$emit('confirm', {
                    mode: 'batch',
                    items: submitItems
                });
                this.visible = false;
            } else {
                this.$refs.formRef.validate(valid => {
                    if (valid) {
                        if (!this.validateCurrentRange()) {
                            return;
                        }
                        if (!this.isTypeSelectable(this.form.fieldType)) {
                            this.$message.error('当前业务场景不支持该类型');
                            return;
                        }

                        const baseData = {
                            mode: 'single',
                            id: this.form.id,
                            productFieldId: this.form.productFieldId,
                            fieldType: this.form.fieldType,
                            orderNum: this.form.orderNum,
                            isRequired: this.form.isRequired,
                            showMode: this.form.showMode
                        };

                        if (this.form.fieldType == '2') {
                            baseData.minNum = this.form.minNum;
                            baseData.maxNum = this.form.maxNum;
                            baseData.placeholder = this.form.placeholder;
                        } else if (this.form.fieldType == '3') {
                            baseData.charMin = this.form.charMin;
                            baseData.charMax = this.form.charMax;
                            baseData.placeholder = this.form.placeholder;
                        } else if (this.form.fieldType == '6') {
                            baseData.imageLimitNum = this.form.imageLimitNum;
                            baseData.demoImage = this.ossId;
                        } else if (this.form.fieldType == '8') {
                            baseData.productLimitNum = this.form.productLimitNum;
                            baseData.priceMin = this.form.priceMin;
                            baseData.priceMax = this.form.priceMax;
                        } else if (this.form.fieldType == '9') {   // 新增
                            baseData.priceRangeMin = this.form.priceRangeMin;
                            baseData.priceRangeMax = this.form.priceRangeMax;
                        }

                        this.$emit('confirm', baseData);
                        this.visible = false;
                    }
                });
            }
        },

        handleClose() {
            this.isBatchMode = false;
            this.parentFieldType = null;
            this.resetForm();
            this.dialogVisible = false;
            this.dialogImageUrl = '';
            this.uploading = false;
            this.uploadProgress = 0;
        },

        handleRemoveLogo() {
            this.$confirm('确定要删除图片吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                this.form.demoImage = '';
                this.ossId = '';
                this.$message.success('图片已删除');
            }).catch(() => { });
        },

        beforeAvatarUpload(file) {
            const isImage = file.type === 'image/png' || file.type === 'image/jpg' || file.type === 'image/jpeg';
            if (!isImage) {
                this.$message.error("只能上传png、jpg、jpeg格式的图片文件");
                return false;
            }
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
                this.$message.error("图片大小不能超过 2MB");
                return false;
            }
            return true;
        },

        async handleAvatarUpload({ file, onSuccess, onProgress }) {
            try {
                this.uploading = true;
                this.uploadProgress = 0;

                const progressInterval = setInterval(() => {
                    if (this.uploadProgress < 90) {
                        this.uploadProgress += 10;
                        onProgress({ percent: this.uploadProgress });
                    }
                }, 200);

                const formData = new FormData();
                formData.append('file', file);

                const controller = new AbortController();
                this.cancelUpload = () => {
                    controller.abort();
                    clearInterval(progressInterval);
                    this.uploading = false;
                    this.uploadProgress = 0;
                };

                const response = await fileUpload(formData, {
                    signal: controller.signal,
                    onUploadProgress: (progressEvent) => {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        this.uploadProgress = percent;
                        onProgress({ percent });
                    }
                });

                clearInterval(progressInterval);
                this.uploadProgress = 100;

                if (response.code === 200) {
                    const ossId = response.data.ossId;
                    const previewUrl = URL.createObjectURL(file);
                    this.form.demoImage = previewUrl;
                    this.ossId = ossId;

                    setTimeout(() => {
                        onSuccess("success");
                        this.$message.success("图片上传成功");
                        this.uploading = false;
                        this.uploadProgress = 0;
                    }, 300);
                } else {
                    throw new Error(response.message || '上传失败');
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.$message.error(error.message || '上传失败');
                }
                this.uploading = false;
                this.uploadProgress = 0;
            }
        },

        handlePictureCardPreview(file) {
            this.dialogImageUrl = file.url;
            this.dialogVisible = true;
        }
    }
};
</script>

<style scoped>
::v-deep .el-dialog__body {
    max-height: 65vh;
    overflow-y: auto;
}

/* ==================== 图片上传组件样式 ==================== */
.upload-container {
    position: relative;
    width: 100px;
    height: 100px;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    overflow: hidden;
    background: #fafafa;
}

.avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
    cursor: pointer;
}

/* 图片操作按钮（悬浮显示） */
.avatar-actions {
    position: absolute;
    top: 5px;
    right: 5px;
    opacity: 0;
    transition: opacity 0.3s;
}

.avatar-wrapper:hover .avatar-actions {
    opacity: 1;
}

/* 删除按钮样式 */
.avatar-actions .el-button {
    background: rgba(255, 0, 0, 0.7);
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.avatar-actions .el-button:hover {
    background: #f56c6c;
}

/* 上传占位符 */
.upload-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #8c939d;
    font-size: 14px;
}

.upload-placeholder .el-icon-plus {
    font-size: 18px;
    color: #1D2129;
    font-weight: 700;
    margin-bottom: 5px;
}

/* 上传中遮罩层 */
.uploading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.uploading-content {
    text-align: center;
    color: #409eff;
}

.uploading-content .el-icon-loading {
    font-size: 24px;
    margin-bottom: 8px;
    display: block;
}

.uploading-text {
    display: block;
    font-size: 12px;
    margin-bottom: 8px;
}

.upload-progress {
    width: 80px;
}

.upload-text {
    font-size: 14px;
    color: #1D2129;
    line-height: 22px;
}

::v-deep .el-upload__tip {
    font-size: 12px;
    color: #C9CDD4;
    line-height: 17px !important;
}

/* ==================== 批量模式样式 ==================== */
.batch-item-wrapper {
    margin-bottom: 24px;
    padding: 16px;
    background: #f8f9fc;
    border-radius: 8px;
}

.batch-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e4e7ed;
}

.batch-item-index {
    font-size: 14px;
    font-weight: 600;
    color: #6A35FF;
}

.batch-actions {
    display: flex;
    gap: 8px;
}

/* 添加按钮 */
.batch-add,
.batch-remove {
    width: 28px;
    height: 28px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
}

.batch-add {
    color: #fff;
    background-color: #6A35FF;
}

.batch-add:hover {
    background-color: #5a2ad9;
}

/* 删除按钮 */
.batch-remove {
    color: #fff;
    background-color: #ff4d4f;
}

.batch-remove:hover {
    background-color: #e04345;
}
</style>
<style lang="scss">
.example-link {
    color: #409eff;
    cursor: pointer;
    margin-left: 8px;
    font-size: 12px;

    &:hover {
        text-decoration: underline;
        color: #66b1ff;
    }
}
</style>
