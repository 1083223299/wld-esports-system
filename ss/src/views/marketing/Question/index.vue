<template>
    <div class="claim-record-wrapper">
        <div class="hero-tabs" role="tablist">
            <button type="button" class="hero-tab" :class="{ 'is-active': activeTab === 'faq' }" role="tab"
                :aria-selected="activeTab === 'faq'" @click="switchTab('faq')">
                <div class="hero-tab__icon">
                    <i class="el-icon-question" />
                </div>
                <div class="hero-tab__body">
                    <div class="hero-tab__title">
                        问答配置
                        <em v-if="activeTab === 'faq'">当前</em>
                    </div>
                    <div class="hero-tab__desc">问题内容与常见问题</div>
                </div>
                <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
            </button>
            <button type="button" class="hero-tab" :class="{ 'is-active': activeTab === 'category' }" role="tab"
                :aria-selected="activeTab === 'category'" @click="switchTab('category')">
                <div class="hero-tab__icon">
                    <i class="el-icon-menu" />
                </div>
                <div class="hero-tab__body">
                    <div class="hero-tab__title">
                        分类配置
                        <em v-if="activeTab === 'category'">当前</em>
                    </div>
                    <div class="hero-tab__desc">分类名称与展示顺序</div>
                </div>
                <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
            </button>
        </div>

        <div v-if="activeTab === 'faq'" ref="responsiveModule">
            <SearchForm ref="faqSearchForm" :fields="faqSearchItems" :initial-values="faqQueryForm" :gutter="20"
                label-width="100px" @search="handleFaqSearch" @reset="handleFaqReset" />
        </div>

        <el-card class="list-card" shadow="never">
            <div class="action-bar">
                <el-button type="primary" icon="el-icon-plus"
                    @click="activeTab === 'faq' ? handleFaqAdd() : handleCategoryAdd()">
                    {{ activeTabActionText }}
                </el-button>
            </div>

            <div class="table-wrapper">
                <el-table v-if="activeTab === 'faq'" :data="faqTableData" stripe row-key="id" v-loading="faqLoading"
                    :border="false" :header-row-style="{ backgroundColor: '#F6F6FB' }"
                    :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }">
                    <el-table-column label="问题信息" min-width="280" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            <div class="info-block">
                                <div class="info-title">{{ row.title || "-" }}</div>
                                <div class="info-sub">问题ID：{{ row.id || "-" }}</div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column label="所属分类" min-width="180" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            <div class="info-block">
                                <div class="info-title">{{ row.categoryName || "-" }}</div>
                                <div class="info-sub">分类ID：{{ row.categoryId || "-" }}</div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column prop="sort" label="排序值" width="100">
                        <template slot-scope="{ row }">
                            {{ row.sort || 0 }}
                        </template>
                    </el-table-column>
                    <el-table-column label="是否为常见问题" width="150">
                        <template slot-scope="{ row }">
                            <el-switch :value="Number(row.isCommon)" :active-value="1" :inactive-value="0"
                                active-color="#8F03FF" :disabled="!!row.switchLoading"
                                @change="(value) => handleFaqCommonChange(row, value)" />
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="120" fixed="right" align="center">
                        <template slot-scope="{ row }">
                            <el-button type="text" style="color: #409EFF" @click="handleFaqEdit(row)">编辑</el-button>
                            <el-button type="text" style="color: #F56C6C" @click="handleFaqDelete(row)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>

                <el-table v-else :data="categoryTableData" stripe row-key="id" v-loading="categoryLoading"
                    :border="false" :header-row-style="{ backgroundColor: '#F6F6FB' }"
                    :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }">
                    <el-table-column label="分类信息" min-width="240" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            <div class="info-block">
                                <div class="info-title">{{ row.categoryName || "-" }}</div>
                                <div class="info-sub">分类ID：{{ row.id || "-" }}</div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column prop="sort" label="排序值" width="120">
                        <template slot-scope="{ row }">
                            {{ row.sort || 0 }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="createTime" label="创建时间" min-width="180">
                        <template slot-scope="{ row }">
                            {{ row.createTime || "-" }}
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="120" fixed="right" align="center">
                        <template slot-scope="{ row }">
                            <el-button type="text" style="color: #409EFF"
                                @click="handleCategoryEdit(row)">编辑</el-button>
                            <el-button type="text" style="color: #F56C6C"
                                @click="handleCategoryDelete(row)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <div v-if="activeTab === 'faq'" class="pagination-fixed">
                <PaginationSimple :current-page="faqPagination.pageNum" :page-size="faqPagination.pageSize"
                    :total="faqPagination.total" @current-change="handleFaqCurrentChange" />
            </div>
        </el-card>

        <el-dialog :title="faqDialogTitle" :visible.sync="faqDialogVisible" width="900px" :close-on-click-modal="false"
            :close-on-press-escape="false" @opened="bindFaqEditorHandlers" @close="handleFaqDialogClose">
            <el-form ref="faqFormRef" :model="faqForm" :rules="faqFormRules" label-width="120px"
                v-loading="faqDialogLoading" :validate-on-rule-change="false">
                <el-form-item label="标题" prop="title">
                    <el-input v-model.trim="faqForm.title" placeholder="请输入标题" maxlength="15" show-word-limit />
                </el-form-item>
                <el-form-item label="所属分类" prop="categoryId">
                    <el-select v-model="faqForm.categoryId" placeholder="请选择所属分类" style="width: 100%">
                        <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="排序值" prop="sort">
                    <el-input v-model="faqForm.sort" placeholder="请输入自然数" maxlength="9"
                        @input="faqForm.sort = sanitizeInteger(faqForm.sort)" />
                </el-form-item>
                <el-form-item label="是否为常见问题" prop="isCommon">
                    <el-switch v-model="faqForm.isCommon" :active-value="1" :inactive-value="0"
                        active-color="#8F03FF" />
                </el-form-item>
                <el-form-item label="内容" prop="content">
                    <div class="editor-wrapper">
                        <QuillEditor ref="faqEditor" v-model="faqForm.content" :options="editorOptions" />
                    </div>
                    <div class="form-tip">图片、视频会单独成行展示；建议先写文字，再插入媒体</div>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="faqDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="faqSubmitting" @click="handleFaqSubmit">确定</el-button>
            </div>
        </el-dialog>

        <el-dialog :title="categoryDialogTitle" :visible.sync="categoryDialogVisible" width="500px"
            :close-on-click-modal="false" :close-on-press-escape="false" @close="handleCategoryDialogClose">
            <el-form ref="categoryFormRef" :model="categoryForm" :rules="categoryFormRules" label-width="100px"
                v-loading="categoryDialogLoading" :validate-on-rule-change="false">
                <el-form-item label="分类名称" prop="categoryName">
                    <el-input v-model.trim="categoryForm.categoryName" placeholder="请输入分类名称" maxlength="15"
                        show-word-limit />
                </el-form-item>
                <el-form-item label="排序值" prop="sort">
                    <el-input v-model="categoryForm.sort" placeholder="请输入自然数" maxlength="9"
                        @input="categoryForm.sort = sanitizeInteger(categoryForm.sort)" />
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="categoryDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="categorySubmitting" @click="handleCategorySubmit">确定</el-button>
            </div>
        </el-dialog>
    </div>
</template>


<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { quillEditor } from "vue-quill-editor";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "quill/dist/quill.bubble.css";
import { fileUpload } from "@/api/user";
import {
    faqPage,
    faqAdd,
    faqEdit,
    faqRemove,
    faqDetail,
    toggleCommon,
    faqCategoryList,
    faqCategoryAdd,
    faqCategoryEdit,
    faqCategoryRemove,
    faqCategoryDetail,
} from "@/api/faq";

function registerHtml5VideoBlot(quill) {
    if (!quill || !quill.constructor) return;
    const QuillCtor = quill.constructor;
    if (QuillCtor.__html5VideoRegistered) return;
    const BlockEmbed = QuillCtor.import("blots/block/embed");
    class Html5VideoBlot extends BlockEmbed {
        static create(value) {
            const node = super.create();
            node.setAttribute("src", String(value || "").trim());
            node.setAttribute("controls", "controls");
            node.setAttribute("preload", "metadata");
            node.setAttribute("controlsList", "nodownload");
            node.setAttribute("playsinline", "true");
            node.setAttribute("class", "faq-editor-video");
            return node;
        }
        static value(node) {
            return node.getAttribute("src") || "";
        }
    }
    Html5VideoBlot.blotName = "video";
    Html5VideoBlot.tagName = "VIDEO";
    Html5VideoBlot.className = "faq-editor-video";
    QuillCtor.register(Html5VideoBlot, true);
    QuillCtor.__html5VideoRegistered = true;
}

function createEmptyFaqForm() {
    return {
        id: null,
        title: "",
        categoryId: "",
        sort: "",
        isCommon: 0,
        content: "",
    };
}

function createEmptyCategoryForm() {
    return {
        id: null,
        categoryName: "",
        sort: "",
    };
}

function normalizeEditorHtml(html) {
    const content = String(html || "").trim();
    return content === "<p><br></p>" ? "" : content;
}

export default {
    name: "MarketingQuestion",
    components: {
        SearchForm,
        PaginationSimple,
        QuillEditor: quillEditor,
    },
    data() {
        const validateFaqTitle = (rule, value, callback) => {
            const title = String(value || "").trim();
            if (!title) {
                callback(new Error("请输入标题"));
                return;
            }
            if (title.length > 15) {
                callback(new Error("标题最多15个字"));
                return;
            }
            const duplicate = this.faqTableData.some(
                (item) => String(item.title || "").trim() === title && Number(item.id) !== Number(this.faqForm.id || 0)
            );
            if (duplicate) {
                callback(new Error("标题已存在"));
                return;
            }
            callback();
        };

        const validateNaturalNumber = (fieldLabel) => (rule, value, callback) => {
            const current = String(value === null || value === undefined ? "" : value).trim();
            if (!current) {
                callback(new Error(`请输入${fieldLabel}`));
                return;
            }
            if (!/^\d+$/.test(current)) {
                callback(new Error(`${fieldLabel}仅支持自然数`));
                return;
            }
            callback();
        };

        const validateFaqContent = (rule, value, callback) => {
            if (!normalizeEditorHtml(value)) {
                callback(new Error("请输入内容"));
                return;
            }
            callback();
        };

        return {
            activeTab: "faq",
            faqSearchItems: [
                {
                    type: "input",
                    prop: "title",
                    label: "标题",
                    placeholder: "请输入标题",
                    clearable: true,
                },
                {
                    type: "select",
                    prop: "categoryId",
                    label: "所属分类",
                    placeholder: "全部",
                    options: [{ label: "全部", value: "" }],
                    clearable: true,
                },
                {
                    type: "select",
                    prop: "isCommon",
                    label: "是否常见问题",
                    placeholder: "全部",
                    options: [
                        { label: "全部", value: "" },
                        { label: "是", value: 1 },
                        { label: "否", value: 0 },
                    ],
                    clearable: true,
                },
            ],
            faqQueryForm: {
                title: "",
                categoryId: "",
                isCommon: "",
            },
            faqTableData: [],
            faqLoading: false,
            faqPagination: {
                pageNum: 1,
                pageSize: 10,
                total: 0,
            },
            categoryTableData: [],
            categoryLoading: false,
            faqDialogVisible: false,
            faqDialogTitle: "新增问题",
            faqDialogLoading: false,
            faqSubmitting: false,
            faqForm: createEmptyFaqForm(),
            categoryDialogVisible: false,
            categoryDialogTitle: "新增分类",
            categoryDialogLoading: false,
            categorySubmitting: false,
            categoryForm: createEmptyCategoryForm(),
            editorUploading: false,
            editorOptions: {
                theme: "snow",
                placeholder: "请输入问题答案，可用列表、图片和视频说明...",
                modules: {
                    toolbar: {
                        container: [
                            ["bold", "italic", "underline"],
                            [{ header: 1 }, { header: 2 }],
                            [{ list: "ordered" }, { list: "bullet" }],
                            [{ color: [] }],
                            ["link", "image", "video"],
                            ["clean"],
                        ],
                        handlers: {},
                    },
                },
            },
            faqFormRules: {
                title: [{ required: true, validator: validateFaqTitle, trigger: "blur" }],
                categoryId: [{ required: true, message: "请选择所属分类", trigger: "change" }],
                sort: [{ required: true, validator: validateNaturalNumber("排序值"), trigger: "blur" }],
                content: [{ required: true, validator: validateFaqContent, trigger: "blur" }],
            },
            categoryFormRules: {
                categoryName: [
                    { required: true, message: "请输入分类名称", trigger: "blur" },
                    { max: 15, message: "分类名称最多15个字", trigger: "blur" },
                ],
                sort: [{ required: true, validator: validateNaturalNumber("排序值"), trigger: "blur" }],
            },
        };
    },
    computed: {
        categoryOptions() {
            return this.categoryTableData.map((item) => ({
                label: item.categoryName,
                value: item.id,
            }));
        },
        activeTabActionText() {
            return this.activeTab === "faq" ? "新增问题" : "新增分类";
        },
    },
    created() {
        this.editorOptions.modules.toolbar.handlers.image = this.handleEditorImageSelect;
        this.editorOptions.modules.toolbar.handlers.video = this.handleEditorVideoSelect;
        this.initializePage();
    },
    methods: {
        async initializePage() {
            await Promise.all([this.fetchCategoryList(), this.fetchFaqList()]);
        },
        switchTab(tab) {
            this.activeTab = tab;
        },
        syncCategorySearchOptions() {
            const categorySearchItem = this.faqSearchItems.find((item) => item.prop === "categoryId");
            if (categorySearchItem) {
                categorySearchItem.options = [{ label: "全部", value: "" }].concat(this.categoryOptions);
            }
        },
        sanitizeInteger(value) {
            return String(value === null || value === undefined ? "" : value).replace(/\D/g, "");
        },
        getFaqPayload(form = this.faqForm) {
            return {
                title: String(form.title || "").trim(),
                categoryId: Number(form.categoryId),
                sort: Number(form.sort),
                isCommon: Number(form.isCommon || 0),
                content: normalizeEditorHtml(form.content),
            };
        },
        async fetchFaqList() {
            this.faqLoading = true;
            try {
                const params = {
                    pageNum: this.faqPagination.pageNum,
                    pageSize: this.faqPagination.pageSize,
                    title: this.faqQueryForm.title || undefined,
                    categoryId: this.faqQueryForm.categoryId || undefined,
                    isCommon: this.faqQueryForm.isCommon === "" ? undefined : this.faqQueryForm.isCommon,
                };
                const res = await faqPage(params);
                if (res.success) {
                    const rows = (res.data && res.data.rows) || [];
                    this.faqTableData = rows.map((item) => ({
                        ...item,
                        isCommon: Number(item.isCommon || 0),
                        switchLoading: false,
                    }));
                    this.faqPagination.total = (res.data && res.data.total) || 0;
                } else {
                    this.faqTableData = [];
                    this.faqPagination.total = 0;
                    this.$message.error(res.errorMessage || "获取问题列表失败");
                }
            } catch (error) {
                this.faqTableData = [];
                this.faqPagination.total = 0;
                this.$message.error("获取问题列表失败");
            } finally {
                this.faqLoading = false;
            }
        },
        async fetchCategoryList() {
            this.categoryLoading = true;
            try {
                const res = await faqCategoryList();
                if (res.success) {
                    this.categoryTableData = Array.isArray(res.data)
                        ? res.data.map((item) => ({
                            ...item,
                            sort: Number(item.sort || 0),
                        }))
                        : [];
                    this.syncCategorySearchOptions();
                } else {
                    this.categoryTableData = [];
                    this.syncCategorySearchOptions();
                    this.$message.error(res.errorMessage || "获取分类列表失败");
                }
            } catch (error) {
                this.categoryTableData = [];
                this.syncCategorySearchOptions();
                this.$message.error("获取分类列表失败");
            } finally {
                this.categoryLoading = false;
            }
        },
        handleFaqSearch(form) {
            this.faqQueryForm = {
                title: form.title || "",
                categoryId: form.categoryId || "",
                isCommon: form.isCommon === "" || form.isCommon === undefined ? "" : Number(form.isCommon),
            };
            this.faqPagination.pageNum = 1;
            this.fetchFaqList();
        },
        handleFaqReset() {
            this.faqQueryForm = {
                title: "",
                categoryId: "",
                isCommon: "",
            };
            this.faqPagination.pageNum = 1;
            this.fetchFaqList();
        },
        handleFaqCurrentChange(page) {
            this.faqPagination.pageNum = page;
            this.fetchFaqList();
        },
        handleFaqAdd() {
            this.faqDialogTitle = "新增问题";
            this.faqForm = createEmptyFaqForm();
            this.faqDialogVisible = true;
            this.$nextTick(() => {
                if (this.$refs.faqFormRef) {
                    this.$refs.faqFormRef.clearValidate();
                }
            });
        },
        async handleFaqEdit(row) {
            this.faqDialogTitle = "编辑问题";
            this.faqDialogVisible = true;
            this.faqDialogLoading = true;
            try {
                const res = await faqDetail(row.id);
                if (!res.success || !res.data) {
                    throw new Error(res.errorMessage || "获取详情失败");
                }
                this.faqForm = {
                    id: res.data.id,
                    title: res.data.title || "",
                    categoryId: res.data.categoryId || "",
                    sort: String(res.data.sort === undefined || res.data.sort === null ? "" : res.data.sort),
                    isCommon: Number(res.data.isCommon || 0),
                    content: res.data.content || "",
                };
                this.$nextTick(() => {
                    if (this.$refs.faqFormRef) {
                        this.$refs.faqFormRef.clearValidate();
                    }
                });
            } catch (error) {
                this.$message.error(error.message || "获取详情失败");
                this.faqDialogVisible = false;
            } finally {
                this.faqDialogLoading = false;
            }
        },
        async handleFaqDelete(row) {
            this.$confirm("确定要删除该问题吗？", "提示", { type: "warning" })
                .then(async () => {
                    await faqRemove(row.id);
                    this.$message.success("删除成功");
                    if (this.faqTableData.length === 1 && this.faqPagination.pageNum > 1) {
                        this.faqPagination.pageNum -= 1;
                    }
                    this.fetchFaqList();
                })
                .catch(() => { });
        },
        async handleFaqCommonChange(row, value) {
            if (!row || row.switchLoading) return;
            const next = Number(value) === 1 ? 1 : 0;
            const prev = Number(row.isCommon) === 1 ? 1 : 0;
            if (next === prev) return;

            this.$set(row, "switchLoading", true);
            try {
                const res = await toggleCommon(row.id);
                // 拦截器失败会 reject；这里只处理成功返回但 success=false 的情况，不再 throw 避免二次报错
                if (!res || res.success === false) {
                    this.$set(row, "isCommon", prev);
                    return;
                }
                this.$set(row, "isCommon", next);
                this.$message.success(next === 1 ? "已设为常见问题" : "已取消常见问题");
            } catch (error) {
                // 错误提示由 request 拦截器统一弹出
                this.$set(row, "isCommon", prev);
            } finally {
                this.$set(row, "switchLoading", false);
            }
        },
        handleFaqDialogClose() {
            this.faqDialogLoading = false;
            this.faqSubmitting = false;
            this.faqForm = createEmptyFaqForm();
            this.$nextTick(() => {
                if (this.$refs.faqFormRef) {
                    this.$refs.faqFormRef.clearValidate();
                }
            });
        },
        handleFaqSubmit() {
            this.$refs.faqFormRef.validate(async (valid) => {
                if (!valid) return;
                this.faqSubmitting = true;
                try {
                    const payload = this.getFaqPayload();
                    let res;
                    if (this.faqForm.id) {
                        res = await faqEdit({
                            id: this.faqForm.id,
                            ...payload,
                        });
                    } else {
                        res = await faqAdd(payload);
                    }
                    if (!res.success) {
                        throw new Error(res.errorMessage || "保存失败");
                    }
                    this.$message.success(this.faqForm.id ? "编辑成功" : "新增成功");
                    this.faqDialogVisible = false;
                    this.fetchFaqList();
                } catch (error) {
                    this.$message.error(error.message || "保存失败");
                } finally {
                    this.faqSubmitting = false;
                }
            });
        },
        handleCategoryAdd() {
            this.categoryDialogTitle = "新增分类";
            this.categoryForm = createEmptyCategoryForm();
            this.categoryDialogVisible = true;
            this.$nextTick(() => {
                if (this.$refs.categoryFormRef) {
                    this.$refs.categoryFormRef.clearValidate();
                }
            });
        },
        async handleCategoryEdit(row) {
            this.categoryDialogTitle = "编辑分类";
            this.categoryDialogVisible = true;
            this.categoryDialogLoading = true;
            try {
                const res = await faqCategoryDetail(row.id);
                if (!res.success || !res.data) {
                    throw new Error(res.errorMessage || "获取详情失败");
                }
                this.categoryForm = {
                    id: res.data.id,
                    categoryName: res.data.categoryName || "",
                    sort: String(res.data.sort === undefined || res.data.sort === null ? "" : res.data.sort),
                };
                this.$nextTick(() => {
                    if (this.$refs.categoryFormRef) {
                        this.$refs.categoryFormRef.clearValidate();
                    }
                });
            } catch (error) {
                this.$message.error(error.message || "获取详情失败");
                this.categoryDialogVisible = false;
            } finally {
                this.categoryDialogLoading = false;
            }
        },
        async handleCategoryDelete(row) {
            this.$confirm("确定要删除该分类吗？", "提示", { type: "warning" })
                .then(async () => {
                    await faqCategoryRemove(row.id);
                    this.$message.success("删除成功");
                    await this.fetchCategoryList();
                    await this.fetchFaqList();
                })
                .catch(() => { });
        },
        handleCategoryDialogClose() {
            this.categoryDialogLoading = false;
            this.categorySubmitting = false;
            this.categoryForm = createEmptyCategoryForm();
            this.$nextTick(() => {
                if (this.$refs.categoryFormRef) {
                    this.$refs.categoryFormRef.clearValidate();
                }
            });
        },
        handleCategorySubmit() {
            this.$refs.categoryFormRef.validate(async (valid) => {
                if (!valid) return;
                this.categorySubmitting = true;
                try {
                    const payload = {
                        categoryName: String(this.categoryForm.categoryName || "").trim(),
                        sort: Number(this.categoryForm.sort),
                    };
                    let res;
                    if (this.categoryForm.id) {
                        res = await faqCategoryEdit({
                            id: this.categoryForm.id,
                            ...payload,
                        });
                    } else {
                        res = await faqCategoryAdd(payload);
                    }
                    if (!res.success) {
                        throw new Error(res.errorMessage || "保存失败");
                    }
                    this.$message.success(this.categoryForm.id ? "编辑成功" : "新增成功");
                    this.categoryDialogVisible = false;
                    await this.fetchCategoryList();
                    await this.fetchFaqList();
                } catch (error) {
                    this.$message.error(error.message || "保存失败");
                } finally {
                    this.categorySubmitting = false;
                }
            });
        },
        getQuillInstance() {
            const quill = (this.$refs.faqEditor && this.$refs.faqEditor.quill) || null;
            registerHtml5VideoBlot(quill);
            return quill;
        },
        bindFaqEditorHandlers() {
            this.$nextTick(() => {
                const quill = this.getQuillInstance();
                if (!quill) return;
                const toolbar = quill.getModule("toolbar");
                if (!toolbar || typeof toolbar.addHandler !== "function") return;
                toolbar.addHandler("image", this.handleEditorImageSelect);
                toolbar.addHandler("video", this.handleEditorVideoSelect);
            });
        },
        handleEditorImageSelect() {
            if (this.editorUploading) return;
            this.pickEditorFile("image/png,image/jpeg,image/jpg,image/webp,image/gif", (file) =>
                this.uploadEditorMedia(file, "image")
            );
        },
        handleEditorVideoSelect() {
            if (this.editorUploading) return;
            this.pickEditorFile("video/mp4,video/webm", (file) =>
                this.uploadEditorMedia(file, "video")
            );
        },
        pickEditorFile(accept, onFile) {
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            input.setAttribute("accept", accept);
            input.click();
            input.onchange = async () => {
                const file = input.files && input.files[0];
                if (!file) return;
                await onFile(file);
            };
        },
        resolveUploadUrl(res) {
            const data =
                (res && res.data && res.data.data) ||
                (res && res.data) ||
                res ||
                {};
            if (typeof data === "string") return data;
            return (
                data.url ||
                data.fileUrl ||
                data.ossUrl ||
                data.fullUrl ||
                data.urlLink ||
                data.link ||
                ""
            );
        },
        getMediaInsertIndex(quill) {
            const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
            let index = range.index;
            if (typeof quill.getLine === "function") {
                const lineInfo = quill.getLine(index);
                const line = Array.isArray(lineInfo) ? lineInfo[0] : null;
                if (line && typeof quill.getIndex === "function") {
                    index = quill.getIndex(line) + (line.length ? line.length() : 0);
                }
            }
            return index;
        },
        insertEditorEmbed(type, url) {
            const quill = this.getQuillInstance();
            if (!quill) {
                throw new Error("编辑器未初始化");
            }
            const index = this.getMediaInsertIndex(quill);
            quill.focus();
            quill.insertText(index, "\n", "user");
            quill.insertEmbed(index + 1, type, url, "user");
            quill.insertText(index + 2, "\n", "user");
            quill.setSelection(index + 3, 0, "user");
        },
        async uploadEditorMedia(file, type) {
            const isVideo = type === "video";
            const okType = isVideo
                ? file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name || "")
                : file.type.startsWith("image/");
            if (!okType) {
                this.$message.error(isVideo ? "只能上传 mp4/webm 视频" : "只能上传图片文件");
                return;
            }
            const maxMb = isVideo ? 50 : 10;
            if (file.size / 1024 / 1024 > maxMb) {
                this.$message.error(isVideo ? "视频不能超过 50MB" : "图片不能超过 10MB");
                return;
            }
            this.editorUploading = true;
            const formData = new FormData();
            formData.append("file", file);
            try {
                const res = await fileUpload(formData);
                const uploadUrl = this.resolveUploadUrl(res);
                if (!uploadUrl) {
                    throw new Error(
                        (res && (res.errorMessage || res.message)) ||
                        (isVideo ? "未获取到视频地址" : "未获取到图片地址")
                    );
                }
                this.insertEditorEmbed(type, uploadUrl);
                this.$message.success(isVideo ? "视频已插入" : "图片已插入");
            } catch (error) {
                this.$message.error(error.message || (isVideo ? "视频上传失败" : "图片上传失败"));
            } finally {
                this.editorUploading = false;
            }
        },
    },
};
</script>

<style scoped lang="scss">
.claim-record-wrapper {
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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

.list-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    border-radius: 24px;
}

.action-bar {
    flex-shrink: 0;
    margin-bottom: 20px;
}

::v-deep .el-card__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px 20px 0;
}

.table-wrapper {
    flex: 1;
    overflow-y: auto !important;
    min-height: 0;
    position: relative;
}

.pagination-fixed {
    flex-shrink: 0;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: flex-end;
}

.info-block {
    line-height: 1.6;
}

.info-title {
    color: #303133;
    font-weight: 500;
    word-break: break-all;
}

.info-sub {
    color: #909399;
    font-size: 12px;
    word-break: break-all;
}

.editor-wrapper {
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}

.form-tip {
    margin-top: 8px;
    color: #909399;
    font-size: 12px;
    line-height: 20px;
}

::v-deep .ql-toolbar.ql-snow {
    border: none;
    border-bottom: 1px solid #ebeef5;
    background: #fafafa;
    padding: 8px 10px;
}

::v-deep .ql-toolbar .ql-video {
    width: 28px;
    height: 24px;
}

::v-deep .ql-toolbar .ql-video svg {
    display: none;
}

::v-deep .ql-toolbar .ql-video::before {
    content: "";
    display: block;
    width: 16px;
    height: 16px;
    margin: 4px auto 0;
    background-color: currentColor;
    -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'><rect x='1' y='4' width='11' height='10' rx='1.5' fill='none' stroke='black' stroke-width='1.6'/><path d='M13 7.2L17 5v8l-4-2.2z' fill='black'/></svg>") center / contain no-repeat;
    mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'><rect x='1' y='4' width='11' height='10' rx='1.5' fill='none' stroke='black' stroke-width='1.6'/><path d='M13 7.2L17 5v8l-4-2.2z' fill='black'/></svg>") center / contain no-repeat;
}

::v-deep .ql-container.ql-snow {
    border: none;
    min-height: 240px;
}

::v-deep .ql-editor {
    min-height: 240px;
    max-height: 420px;
    overflow-y: auto;
    padding: 14px 16px;
    font-size: 14px;
    line-height: 1.7;
    color: #303133;
}

::v-deep .ql-editor ol,
::v-deep .ql-editor ul {
    margin: 0 0 8px;
    padding: 0;
}

::v-deep .ql-editor li {
    position: relative;
    padding-left: 1.6em;
    list-style: none;
}

::v-deep .ql-editor li::before {
    position: absolute;
    left: 0;
    width: 1.4em;
    text-align: right;
    white-space: nowrap;
}

::v-deep .ql-editor p,
::v-deep .ql-editor h1,
::v-deep .ql-editor h2 {
    margin: 0 0 8px;
}

::v-deep .ql-editor img,
::v-deep .ql-editor video,
::v-deep .ql-editor .faq-editor-video {
    display: block;
    width: auto;
    max-width: 100%;
    max-height: 280px;
    height: auto;
    margin: 12px 0;
    border-radius: 8px;
    background: #111;
    object-fit: contain;
}
</style>
