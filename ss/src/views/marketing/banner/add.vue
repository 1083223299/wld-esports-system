<template>
    <div class="banner-detail-page">
        <!-- 头部返回 -->
        <div class="page-header" @click="goBack">
            <i class="el-icon-arrow-left"></i>
            <div class="page-title">{{ isEdit ? '编辑Banner' : '新增Banner' }}</div>
        </div>

        <!-- 表单区域 -->
        <el-card shadow="never" class="form-card">
            <el-form ref="bannerForm" :model="formData" :rules="formRules" label-width="120px" class="banner-form"
                :validate-on-rule-change="false">
                <!-- 标题 -->
                <el-form-item label="标题" prop="title">
                    <div class="input-with-tip">
                        <el-input v-model="formData.title" placeholder="请输入标题" :maxlength="15" show-word-limit
                            style="width: 400px;">
                        </el-input>
                        <el-tooltip content="标题上限15个字，注意唯一性校验" placement="right">
                            <i class="el-icon-info tip-icon"></i>
                        </el-tooltip>
                    </div>
                </el-form-item>

                <!-- 关联活动 -->
                <el-form-item label="关联活动" prop="activityId">
                    <el-select v-model="formData.activityId" placeholder="请选择关联活动" style="width: 400px;"
                        filterable clearable :loading="activityLoading"
                        @change="handleActivityChange">
                        <el-option v-for="item in activityOptions" :key="item.id"
                            :label="`${item.activityName} ${item.id}`"
                            :value="item.id" />
                    </el-select>
                </el-form-item>

                <!-- 展示位置 -->
                <el-form-item label="展示位置" prop="displayPosition">
                    <el-cascader v-model="displayPositionCascaderValue" :options="displayPositionCascaderOptions"
                        :props="displayPositionCascaderProps" placeholder="请选择展示位置" clearable filterable
                        collapse-tags style="width: 400px;">
                    </el-cascader>
                </el-form-item>
                <el-form-item label="适用人群" prop="userLabelIds">
                    <el-select v-model="formData.userLabelIds" multiple filterable clearable
                        placeholder="请选择适用人群" style="width: 400px;" :loading="labelLoading">
                        <el-option v-for="item in labelOptions" :key="item.id" :label="item.labelName"
                            :value="item.id" />
                    </el-select>
                </el-form-item>
                <!-- 入口图 -->
                <el-form-item label="入口图" prop="entranceImage">
                    <div class="input-with-tip">
                        <ImageUpload v-model="formData.entranceImageUrl" :oss-id="formData.entranceImage"
                            @change="handleImageChange">
                        </ImageUpload>
                        <el-tooltip content="仅支持上传一张图，建议尺寸 750x360" placement="right">
                            <i class="el-icon-info tip-icon"></i>
                        </el-tooltip>
                    </div>
                </el-form-item>

                <!-- 展示端口 -->
                <el-form-item label="展示端口" prop="displayPort">
                    <div class="input-with-tip">
                        <el-checkbox-group v-model="displayPortList" @change="handleDisplayPortChange">
                            <el-checkbox label="android">安卓</el-checkbox>
                            <el-checkbox label="ios">IOS</el-checkbox>
                            <el-checkbox label="tb_xcx">未来洞小程序</el-checkbox>
                            <el-checkbox label="sh_xcx">商户小程序</el-checkbox>
                        </el-checkbox-group>
                        <el-tooltip content="可多选，至少选择一个端口" placement="right">
                            <i class="el-icon-info tip-icon"></i>
                        </el-tooltip>
                    </div>
                </el-form-item>

                <!-- 展示版本号（仅当勾选安卓或IOS时显示） -->
                <el-form-item v-if="showVersionRange" label="展示版本号" prop="versionRange">
                    <div class="input-with-tip">
                        <div class="version-range">
                            <el-select v-model="formData.minVersion" placeholder="最低版本" style="width: 140px;"
                                @change="onVersionChange">
                                <el-option v-for="item in versionOptions" :key="item.value" :label="item.label"
                                    :value="item.value">
                                </el-option>
                            </el-select>
                            <span class="range-separator">至</span>
                            <el-select v-model="formData.maxVersion" placeholder="最高版本" style="width: 140px;"
                                @change="onVersionChange">
                                <el-option v-for="item in maxVersionOptions" :key="item.value" :label="item.label"
                                    :value="item.value">
                                </el-option>
                            </el-select>
                        </div>
                        <el-tooltip content="默认最低版本取最后一条，最高版本取第一条最新版" placement="right">
                            <i class="el-icon-info tip-icon"></i>
                        </el-tooltip>
                    </div>
                </el-form-item>

                <!-- 排序值 -->
                <el-form-item label="排序值" prop="sortValue">
                    <div class="input-with-tip">
                        <el-input-number v-model="formData.sortValue" :min="0" :max="999" :step="1" :precision="0"
                            placeholder="请输入排序值" style="width: 200px;">
                        </el-input-number>
                        <el-tooltip content="仅支持输入自然数（0至正整数）" placement="right">
                            <i class="el-icon-info tip-icon"></i>
                        </el-tooltip>
                    </div>
                </el-form-item>

                <!-- 展示周期 -->
                <el-form-item label="展示周期" prop="dateRange">
                    <div class="input-with-tip">
                        <el-date-picker v-model="formData.dateRange" type="datetimerange" range-separator="至"
                            start-placeholder="开始时间" end-placeholder="结束时间" value-format="yyyy-MM-dd HH:mm:ss"
                            :picker-options="datePickerOptions" :default-time="['00:00:00', '23:59:59']"
                            style="width: 360px;">
                        </el-date-picker>
                        <el-tooltip content="结束时间不得小于系统当前时间，且不得小于开始时间" placement="right">
                            <i class="el-icon-info tip-icon"></i>
                        </el-tooltip>
                    </div>
                </el-form-item>

                <!-- APP跳转路径（选择了安卓或IOS时显示） -->
                <el-form-item v-if="showAppJumpPath" label="APP跳转路径" prop="appJumpPath">
                    <div class="input-with-tip">
                        <el-input v-model="formData.appJumpPath" placeholder="请输入APP跳转路径" style="width: 400px;"
                            @input="clearValidateOnInput('appJumpPath')">
                        </el-input>
                        <el-tooltip content="请输入APP内部跳转路径，如：/pages/index/index" placement="right">
                            <i class="el-icon-info tip-icon"></i>
                        </el-tooltip>
                    </div>
                </el-form-item>

                <!-- 小程序跳转路径（选择了小程序端口时显示） -->
                <el-form-item v-if="showMiniProgramJumpPath" label="小程序跳转路径" prop="miniProgramJumpPath">
                    <div class="input-with-tip">
                        <el-input v-model="formData.miniProgramJumpPath" placeholder="请输入小程序跳转路径" style="width: 400px;"
                            @input="clearValidateOnInput('miniProgramJumpPath')">
                        </el-input>
                        <el-tooltip content="请输入小程序页面路径，如：pages/index/index" placement="right">
                            <i class="el-icon-info tip-icon"></i>
                        </el-tooltip>
                    </div>
                </el-form-item>

                <!-- 备注 -->
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="formData.remark" type="textarea" :rows="3" :maxlength="200" show-word-limit
                        placeholder="请输入备注" style="width: 500px;">
                    </el-input>
                </el-form-item>
            </el-form>
        </el-card>

        <!-- 底部操作按钮 -->
        <div class="footer-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitForm" :loading="submitLoading">保存</el-button>
        </div>
    </div>
</template>

<script>
import ImageUpload from "@/components/ImageUpload/index.vue";
import { getProductCategory, addBanner, UpdateBanner, bannerProductOptions } from "@/api/marketing";
import { versionList as fetchVersionList } from "@/api/versionList";
import { activityPage } from "@/api/activity";
import { queryUserLabel } from "@/api/label";

export default {
    name: 'BannerDetail',
    components: {
        ImageUpload,
    },
    inject: ['switchToList', 'getSharedData'],
    data() {
        return {
            isEdit: false,
            submitLoading: false,
            sharedData: {},
            displayPortList: [], // 展示端口多选列表
            hasSubmitted: false, // 是否已提交过表单
            displayPositionOptions: [
                { label: '首页Banner', value: 'home_banner' },
                { label: '首页防诈提醒', value: 'fraud_reminder' },
                { label: '首页活动悬浮窗', value: 'home_floating_window' },
                { label: '首页活动弹窗', value: 'home_popup' },
                { label: '游戏专区', value: 'game_zone' },
            ],
            displayPositionCascaderProps: {
                multiple: true,
                emitPath: true,
            },

            // 版本号列表
            // 真实版本列表：直接读取 system/versionList 的版本管理数据
            // value 直接使用版本号名称本身，提交时也按"名字"传给后端
            versionOptions: [],

            // 关联活动
            activityOptions: [],
            activityLoading: false,
            labelOptions: [],
            labelLoading: false,
            productOptions: [],
            productLoading: false,

            formData: {
                bannerId: null,
                title: '',
                displayPosition: '',
                entranceImage: '',// OSS ID，用于提交
                entranceImageUrl: '',// 预览 URL，用于显示
                displayPort: '',
                minVersion: '',
                maxVersion: '',
                sortValue: 0,
                dateRange: [],
                startTime: '',
                endTime: '',
                appJumpPath: '',
                miniProgramJumpPath: '',
                remark: '',
                activityId: '',
                activityName: '',
                userLabelIds: [],
                productIds: [],
            },

            // 日期选择器配置
            datePickerOptions: {
                disabledDate(time) {
                    return time.getTime() < Date.now() - 8.64e7;
                }
            }
        }
    },

    computed: {
        // 入口图列表
        entranceImageList() {
            if (this.formData.entranceImageUrl) {
                return [{
                    url: this.formData.entranceImageUrl,
                    uid: this.formData.entranceImage
                }];
            }
            return [];
        },

        // 是否显示版本号（选择了安卓或IOS时显示）
        showVersionRange() {
            return this.displayPortList.includes('android') || this.displayPortList.includes('ios');
        },

        // 是否显示APP跳转路径（选择了安卓或IOS时显示）
        showAppJumpPath() {
            return this.displayPortList.includes('android') || this.displayPortList.includes('ios');
        },

        // 是否显示小程序跳转路径（选择了小程序端口时显示）
        showMiniProgramJumpPath() {
            return this.displayPortList.includes('tb_xcx') || this.displayPortList.includes('sh_xcx');
        },

        showProductSelect() {
            return this.formData.displayPosition === 'game_zone';
        },

        displayPositionCascaderValue: {
            get() {
                if (!this.formData.displayPosition) {
                    return [];
                }

                if (this.formData.displayPosition === 'game_zone') {
                    return this.formData.productIds.map(productId => ['game_zone', productId]);
                }

                return [[this.formData.displayPosition]];
            },
            set(value) {
                this.applyDisplayPositionCascaderValue(value);
            }
        },

        displayPositionCascaderOptions() {
            return this.displayPositionOptions.map((item) => {
                if (item.value !== 'game_zone') {
                    return item;
                }

                return {
                    ...item,
                    children: this.productOptions.map(product => ({
                        label: product.productName,
                        value: this.normalizeProductId(product.productId)
                    }))
                };
            });
        },

        // 最高版本在第一条补一个“最新版”选项
        // 这样列表第一项就是“最新版本”语义，和当前后端返回顺序保持一致
        maxVersionOptions() {
            if (!this.versionOptions.length) {
                return [];
            }

            return [
                { label: '最新版', value: '最新版' },
                ...this.versionOptions
            ];
        },

        // 动态表单验证规则 - 只在提交后才显示错误
        formRules() {
            const rules = {
                title: [
                    { required: true, message: '请输入标题', trigger: this.hasSubmitted ? 'blur' : 'submit' },
                    { max: 15, message: '标题不能超过15个字', trigger: this.hasSubmitted ? 'blur' : 'submit' }
                ],
                displayPosition: [
                    {
                        required: true,
                        trigger: this.hasSubmitted ? 'change' : 'submit',
                        validator: (rule, value, callback) => {
                            if (!value) {
                                callback(new Error('请选择展示位置'));
                                return;
                            }

                            if (value === 'game_zone' && this.formData.productIds.length === 0) {
                                callback(new Error('请至少选择一个游戏'));
                                return;
                            }

                            callback();
                        }
                    }
                ],
                entranceImage: [
                    { required: true, message: '请上传入口图', trigger: this.hasSubmitted ? 'change' : 'submit' }
                ],
                displayPort: [
                    {
                        required: true,
                        trigger: this.hasSubmitted ? 'change' : 'submit',
                        validator: (rule, value, callback) => {
                            if (this.displayPortList.length === 0) {
                                callback(new Error('请至少选择一个展示端口'));
                            } else {
                                callback();
                            }
                        }
                    }
                ],
                sortValue: [
                    { required: true, message: '请输入排序值', trigger: this.hasSubmitted ? 'blur' : 'submit' }
                ],
                dateRange: [
                    {
                        required: true,
                        trigger: this.hasSubmitted ? 'change' : 'submit',
                        validator: (rule, value, callback) => {
                            if (!value || value.length !== 2) {
                                callback(new Error('请选择展示周期'));
                                return;
                            }
                            const now = new Date();
                            const endTime = new Date(value[1]);
                            const startTime = new Date(value[0]);

                            if (endTime <= now) {
                                callback(new Error('结束时间不得小于系统当前时间'));
                                return;
                            }
                            if (endTime <= startTime) {
                                callback(new Error('结束时间不得小于开始时间'));
                                return;
                            }
                            callback();
                        }
                    }
                ]
            };

            // 动态添加版本号验证
            if (this.showVersionRange) {
                rules.versionRange = [
                    {
                        required: true,
                        trigger: this.hasSubmitted ? 'change' : 'submit',
                        validator: (rule, value, callback) => {
                            if (!this.formData.minVersion || !this.formData.maxVersion) {
                                callback(new Error('请选择版本号范围'));
                            } else {
                                callback();
                            }
                        }
                    }
                ];
            }

            // 动态添加APP跳转路径验证
            if (this.showAppJumpPath) {
                rules.appJumpPath = [
                    { required: true, message: '请输入APP跳转路径', trigger: this.hasSubmitted ? 'blur' : 'submit' }
                ];
            }

            // 动态添加小程序跳转路径验证
            if (this.showMiniProgramJumpPath) {
                rules.miniProgramJumpPath = [
                    { required: true, message: '请输入小程序跳转路径', trigger: this.hasSubmitted ? 'blur' : 'submit' }
                ];
            }

            return rules;
        }
    },

    watch: {
        // 监听展示端口变化，清除不显示的字段的验证错误
        displayPortList: {
            handler() {
                this.$nextTick(() => {
                    if (this.$refs.bannerForm) {
                        if (!this.showVersionRange) {
                            this.$refs.bannerForm.clearValidate('versionRange');
                        }
                        if (!this.showAppJumpPath) {
                            this.$refs.bannerForm.clearValidate('appJumpPath');
                        }
                        if (!this.showMiniProgramJumpPath) {
                            this.$refs.bannerForm.clearValidate('miniProgramJumpPath');
                        }
                    }
                });
            },
            deep: true
        }
    },

    created() {
        this.sharedData = this.getSharedData();
        this.isEdit = !!this.sharedData.bannerId;
        this.loadVersionOptions();
        this.fetchActivityOptions();
        this.fetchLabelOptions();
        this.fetchProductOptions();

        if (this.isEdit) {
            this.fetchBannerDetail();
        }
    },

    methods: {
        handleImageChange({ url, ossId }) {
            this.formData.entranceImage = ossId;      // 保存 OSS ID
            this.formData.entranceImageUrl = url;      // 保存预览 URL
        },
        goBack() {
            // 重置提交状态
            this.hasSubmitted = false;
            this.switchToList();
        },

        // 输入时清除当前字段的验证错误
        clearValidateOnInput(field) {
            if (this.$refs.bannerForm && !this.hasSubmitted) {
                this.$refs.bannerForm.clearValidate(field);
            }
        },
        handleActivityChange(activityId) {
            const activity = this.activityOptions.find(item => item.id === activityId);
            this.formData.activityName = activity ? activity.activityName : '';
            this.clearValidateOnInput('activityId');
        },

        applyDisplayPositionCascaderValue(value) {
            const selectedPaths = Array.isArray(value)
                ? value.filter(path => Array.isArray(path) && path.length > 0)
                : [];

            if (selectedPaths.length === 0) {
                this.formData.displayPosition = '';
                this.formData.productIds = [];
                this.refreshDisplayPositionValidate();
                return;
            }

            const previousPathKeys = new Set(this.displayPositionCascaderValue.map(path => path.join('__')));
            const addedPath = selectedPaths.find(path => !previousPathKeys.has(path.join('__')));
            const gamePaths = selectedPaths.filter(path => path[0] === 'game_zone' && path.length > 1);

            if (addedPath && addedPath[0] !== 'game_zone') {
                this.formData.displayPosition = addedPath[0];
                this.formData.productIds = [];
                this.refreshDisplayPositionValidate();
                return;
            }

            if (gamePaths.length > 0) {
                this.formData.displayPosition = 'game_zone';
                this.formData.productIds = gamePaths.map(path => path[1]);
                this.refreshDisplayPositionValidate();
                return;
            }

            const normalPath = selectedPaths.find(path => path[0] !== 'game_zone');
            this.formData.displayPosition = normalPath ? normalPath[0] : '';
            this.formData.productIds = [];
            this.refreshDisplayPositionValidate();
        },

        refreshDisplayPositionValidate() {
            this.$nextTick(() => {
                if (!this.$refs.bannerForm) {
                    return;
                }

                if (this.hasSubmitted) {
                    this.$refs.bannerForm.validateField('displayPosition');
                } else {
                    this.$refs.bannerForm.clearValidate('displayPosition');
                }
            });
        },

        // 版本号变化时清除验证错误
        onVersionChange() {
            if (!this.hasSubmitted && this.$refs.bannerForm) {
                this.$refs.bannerForm.clearValidate('versionRange');
            }
        },

        // 读取版本管理列表，作为 Banner 版本范围选择的唯一数据源
        async loadVersionOptions() {
            try {
                const res = await fetchVersionList({
                    pageNum: 1,
                    pageSize: 999
                });

                const rows = res && res.data && Array.isArray(res.data.rows)
                    ? res.data.rows
                    : [];

                // 保持后端返回顺序不变：
                // 后端当前返回是按新到旧排列，所以最后一条真实版本用作最低版本默认值
                // 最高版本则额外在第一条补“最新版”
                const versionMap = new Map();
                rows.forEach((item) => {
                    const versionName = item && item.versionCode ? String(item.versionCode).trim() : '';
                    if (versionName && !versionMap.has(versionName)) {
                        versionMap.set(versionName, {
                            label: versionName,
                            value: versionName
                        });
                    }
                });

                this.versionOptions = Array.from(versionMap.values());
                this.applyDefaultVersionRange();
            } catch (error) {
                console.error("获取版本号列表失败:", error);
                this.versionOptions = [];
                this.$message.error("获取版本号列表失败，请稍后重试");
            }
        },

        // 兼容历史数据里可能还保存着 all 的情况
        // 新规则统一改成使用“最新版”这个名称来展示和提交
        normalizeVersionValue(versionValue) {
            return versionValue === 'all' ? '最新版' : versionValue;
        },

        // 当版本号区域出现时，自动补默认值
        // 最低版本取最后一条真实版本，最高版本取第一条可选项（最新版）
        // 只在字段为空时填充，避免覆盖用户手动选择或编辑回显值
        applyDefaultVersionRange() {
            if (!this.showVersionRange || !this.versionOptions.length) {
                return;
            }

            if (!this.formData.minVersion) {
                this.formData.minVersion = this.versionOptions[this.versionOptions.length - 1].value;
            }

            if (!this.formData.maxVersion) {
                this.formData.maxVersion = this.maxVersionOptions[0].value;
            }
        },

        // 获取关联活动选项
        async fetchActivityOptions() {
            this.activityLoading = true;
            try {
                const res = await activityPage({ pageNum: 1, pageSize: 999 });
                if (res.success) {
                    this.activityOptions = res.data?.rows || [];
                }
            } catch {
                /* ignore */
            } finally {
                this.activityLoading = false;
            }
        },

        async fetchLabelOptions() {
            this.labelLoading = true;
            try {
                const res = await queryUserLabel({});
                if (res.success) {
                    this.labelOptions = Array.isArray(res.data) ? res.data : [];
                }
            } catch {
                this.labelOptions = [];
            } finally {
                this.labelLoading = false;
            }
        },

        async fetchProductOptions() {
            this.productLoading = true;
            try {
                const res = await bannerProductOptions();
                if (res.success) {
                    const currentOptions = this.productOptions;
                    this.productOptions = this.normalizeProductOptions(res.data);
                    this.mergeProductOptions(currentOptions);
                }
            } catch {
                /* 保留详情回显合入的选项，避免接口失败时清空已选游戏名称 */
            } finally {
                this.productLoading = false;
            }
        },

        normalizeProductOptions(productList) {
            return Array.isArray(productList)
                ? productList.map(item => ({
                    ...item,
                    productId: this.normalizeProductId(item.productId)
                }))
                : [];
        },

        mergeProductOptions(productList) {
            const normalizedOptions = this.normalizeProductOptions(productList);
            const optionMap = new Map(this.productOptions.map(item => [String(item.productId), item]));

            normalizedOptions.forEach((item) => {
                const productId = String(item.productId);
                if (!optionMap.has(productId)) {
                    optionMap.set(productId, item);
                }
            });

            this.productOptions = Array.from(optionMap.values());
        },

        getDetailProductIds(data) {
            const productIds = this.normalizeProductIds(data && data.productIds);
            if (productIds.length > 0) {
                return productIds;
            }

            return Array.isArray(data && data.productList)
                ? this.normalizeProductIds(data.productList.map(item => item.productId))
                : [];
        },

        normalizeProductIds(productIds) {
            if (Array.isArray(productIds)) {
                return productIds.map(this.normalizeProductId).filter(Boolean);
            }

            if (typeof productIds === 'string') {
                return productIds.split(',').map(this.normalizeProductId).filter(Boolean);
            }

            const normalizedId = this.normalizeProductId(productIds);
            return normalizedId ? [normalizedId] : [];
        },

        normalizeProductId(productId) {
            if (productId === null || productId === undefined) {
                return '';
            }

            return String(productId).trim();
        },

        normalizeUserLabelIds(userLabelIds) {
            if (Array.isArray(userLabelIds)) {
                return userLabelIds.filter(item => item !== null && item !== undefined && item !== '');
            }

            if (typeof userLabelIds === 'string') {
                return userLabelIds
                    .split(',')
                    .map(item => item.trim())
                    .filter(item => item !== '');
            }

            return [];
        },

        // 展示端口变化处理
        handleDisplayPortChange() {
            // 如果不选择安卓和IOS，清空APP相关字段
            if (!this.showAppJumpPath) {
                this.formData.appJumpPath = '';
                this.formData.minVersion = '';
                this.formData.maxVersion = '';
            }

            // 如果不选择小程序，清空小程序相关字段
            if (!this.showMiniProgramJumpPath) {
                this.formData.miniProgramJumpPath = '';
            }

            // 当版本号区域重新出现时，自动补齐默认值
            this.applyDefaultVersionRange();
        },

        // 获取Banner详情
        async fetchBannerDetail() {
            try {
                const res = await getProductCategory(this.sharedData.bannerId);
                if (res.success) {
                    const data = res.data;
                    this.mergeProductOptions(data.productList);
                    this.formData = {
                        ...data,
                        minVersion: this.normalizeVersionValue(data.minVersion),
                        maxVersion: this.normalizeVersionValue(data.maxVersion),
                        dateRange: [data.startTime, data.endTime],
                        userLabelIds: this.normalizeUserLabelIds(data.userLabelIds),
                        productIds: this.getDetailProductIds(data)
                    };

                    // 解析展示端口
                    if (data.displayPort) {
                        this.displayPortList = data.displayPort.split(',');
                    }

                    // 编辑场景下如果版本范围为空，且当前满足展示条件，则自动补默认值
                    this.applyDefaultVersionRange();
                } else {
                    this.$message.error(res.errorMessage || '获取Banner详情失败');
                }
            } catch (error) {
                console.error("获取Banner详情失败:", error);
                this.$message.error("获取Banner详情失败");
            }
        },

        // 提交表单
        submitForm() {
            // 标记已提交，之后才显示实时验证
            this.hasSubmitted = true;

            this.$nextTick(() => {
                this.$refs.bannerForm.validate(async (valid) => {
                    if (!valid) return;

                    // 组装提交数据
                    const submitData = {
                        ...this.formData,
                        displayPort: this.displayPortList.join(','),
                        startTime: this.formData.dateRange?.[0] || '',
                        endTime: this.formData.dateRange?.[1] || '',
                        userLabelIds: this.normalizeUserLabelIds(this.formData.userLabelIds),
                        productIds: this.showProductSelect ? this.normalizeProductIds(this.formData.productIds) : []
                    };

                    // 移除不需要的字段
                    delete submitData.dateRange;
                    delete submitData.entranceImageUrl;
                    delete submitData.activityName;

                    // 如果不需要版本号，清空版本号字段
                    if (!this.showVersionRange) {
                        submitData.minVersion = '';
                        submitData.maxVersion = '';
                    }

                    // 如果是编辑模式，添加bannerId
                    if (this.isEdit) {
                        submitData.bannerId = this.sharedData.bannerId;
                    }

                    this.submitLoading = true;
                    try {
                        const apiMethod = this.isEdit ? UpdateBanner : addBanner;
                        const res = await apiMethod(submitData);

                        if (res.success) {
                            this.$message.success(this.isEdit ? '编辑成功' : '新增成功');
                            this.hasSubmitted = false;
                            this.$emit('refresh-list');
                            this.goBack();
                        } else {
                            this.$message.error(res.errorMessage || '操作失败');
                        }
                    } catch (error) {
                        console.error("提交失败:", error);
                        this.$message.error("操作失败，请稍后重试");
                    } finally {
                        this.submitLoading = false;
                    }
                });
            });
        }
    }
}
</script>
<style scoped lang="scss">
.banner-detail-page {
    height: 100%;
    padding: 20px;
    background: #ffffff;
    border-radius: 24px;
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
        font-size: 20px;
        margin-right: 8px;
        color: #606266;
    }

    .page-title {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
    }
}

.form-card {
    flex: 1;
    border-radius: 8px;
    border: none;
    margin-bottom: 16px;

    ::v-deep .el-card__body {
        padding: 20px;
    }
}

.banner-form {
    max-width: 700px;

    ::v-deep .el-form-item {
        margin-bottom: 18px;
    }

    ::v-deep .el-form-item__error {
        padding-top: 2px;
    }
}

.input-with-tip {
    display: flex;
    align-items: center;
    gap: 8px;

    .tip-icon {
        color: #909399;
        font-size: 16px;
        cursor: pointer;
        transition: color 0.3s;

        &:hover {
            color: #8F03FF;
        }
    }
}

.version-range {
    display: flex;
    align-items: center;
    gap: 8px;

    .range-separator {
        color: #606266;
    }
}

.footer-actions {
    flex-shrink: 0;
    padding: 16px 0;
    border-top: 1px solid #EBEEF5;
    display: flex;
    justify-content: center;
    gap: 16px;

    .el-button {
        min-width: 100px;
    }
}
</style>
