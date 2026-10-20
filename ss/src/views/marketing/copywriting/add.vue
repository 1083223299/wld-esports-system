<template>
    <div class="copywriting-detail-page" v-loading="pageLoading">
        <el-card shadow="never" class="form-card">
            <div class="page-header" @click="goBack">
                <i class="el-icon-arrow-left"></i>
                <div class="page-title">{{ pageTitle }}</div>
            </div>

            <el-form
                ref="copywritingForm"
                :model="formData"
                :rules="formRules"
                label-width="100px"
                class="copywriting-form"
            >
                <el-form-item label="展示区域" prop="displayArea">
                    <el-select
                        v-model="formData.displayArea"
                        placeholder="请选择展示区域"
                        style="width: 300px;"
                        :disabled="isEdit"
                    >
                        <el-option
                            v-for="item in displayAreaOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </el-form-item>

                <el-form-item label="商品名称" prop="productId">
                    <el-select
                        v-model="formData.productId"
                        placeholder="请选择商品"
                        filterable
                        clearable
                        style="width: 400px;"
                        :loading="productLoading"
                        @change="handleProductChange"
                    >
                        <el-option
                            v-for="item in productOptions"
                            :key="item.id"
                            :label="item.productName"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>

                <el-form-item label="商品图片" prop="productImage">
                    <div class="product-image-wrapper">
                        <img
                            v-if="formData.productImageUrl"
                            :src="formData.productImageUrl"
                            class="product-image"
                            @click="previewImage"
                        />
                        <div v-else class="image-placeholder">
                            <i class="el-icon-picture-outline"></i>
                            <span>选择商品后自动带出</span>
                        </div>
                    </div>
                </el-form-item>

                <el-form-item label="文案内容" prop="copywritingContent">
                    <div class="editor-wrapper">
                        <QuillEditor
                            :key="editorKey"
                            ref="quillEditor"
                            :options="editorOptions"
                            @ready="handleEditorReady"
                            @change="handleEditorChange"
                            @blur="handleEditorBlur"
                        >
                        </QuillEditor>
                    </div>
                </el-form-item>
            </el-form>

            <div class="footer-actions">
                <el-button class="cancel-btn" @click="goBack">取消</el-button>
                <el-button
                    type="primary"
                    class="submit-btn"
                    :loading="submitLoading"
                    @click="submitForm"
                >
                    保存
                </el-button>
            </div>
        </el-card>

        <ImgZoom v-model="imageDialogVisible" :img-list="[previewImageUrl]" />
    </div>
</template>

<script>
import ImgZoom from "@/components/ImgZoom/index.vue";
import { quillEditor } from "vue-quill-editor";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "quill/dist/quill.bubble.css";
import { fileUpload } from "@/api/user";
import { getCopywriting, EditCopywriting, updataCopywriting } from "@/api/copywriting";
import { productSelect } from "@/api/goodsList";

const DISPLAY_AREA_VALUE = "partner_win_rule";
const DISPLAY_AREA_LABEL = "陪陪包赢规则";
const MAX_EDITOR_IMAGE_SIZE_MB = 10;
const IMAGE_URL_PATTERN = /https?:\/\/[^\s<>"']+?\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?[^\s<>"']*)?(?=https?:\/\/|$|\s|<)/ig;
const BASE64_IMAGE_PATTERN = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+(?=data:image\/|https?:\/\/|$|\s|<)/ig;

function createDefaultFormData() {
    return {
        configId: null,
        displayArea: DISPLAY_AREA_VALUE,
        productId: "",
        productName: "",
        productImage: "",
        productImageUrl: "",
        copywritingContent: ""
    };
}

function normalizeEmptyEditorHtml(html) {
    const content = String(html || "").trim();
    return content === "<p><br></p>" ? "" : content;
}

export default {
    name: "CopywritingAdd",
    components: {
        ImgZoom,
        QuillEditor: quillEditor
    },
    inject: ["switchToList", "getSharedData", "refreshList"],
    data() {
        const validateProduct = (rule, value, callback) => {
            if (!value) {
                callback(new Error("请选择商品"));
                return;
            }
            callback();
        };

        const validateContent = (rule, value, callback) => {
            if (!normalizeEmptyEditorHtml(value)) {
                callback(new Error("请输入文案内容"));
                return;
            }
            callback();
        };

        return {
            displayAreaOptions: [
                {
                    label: DISPLAY_AREA_LABEL,
                    value: DISPLAY_AREA_VALUE
                }
            ],
            isEdit: false,
            pageLoading: false,
            submitLoading: false,
            productLoading: false,
            imageDialogVisible: false,
            previewImageUrl: "",
            sharedData: {},
            productOptions: [],
            editorKey: 0,
            editorInstance: null,
            editorTextChangeHandler: null,
            editorContent: "",
            editorImageUrlMap: {},
            formData: createDefaultFormData(),
            formRules: {
                displayArea: [
                    { required: true, message: "请选择展示区域", trigger: "change" }
                ],
                productId: [
                    { required: true, validator: validateProduct, trigger: "change" }
                ],
                copywritingContent: [
                    { required: true, validator: validateContent, trigger: "blur" }
                ]
            },
            editorOptions: {
                theme: "snow",
                placeholder: "请输入文案内容...",
                modules: {
                    toolbar: {
                        container: [
                        ["bold", "italic", "underline", "strike"],
                        ["blockquote", "code-block"],
                        [{ header: 1 }, { header: 2 }],
                        [{ list: "ordered" }, { list: "bullet" }],
                        [{ script: "sub" }, { script: "super" }],
                        [{ indent: "-1" }, { indent: "+1" }],
                        [{ direction: "rtl" }],
                        [{ size: ["small", false, "large", "huge"] }],
                        [{ header: [1, 2, 3, 4, 5, 6, false] }],
                        [{ color: [] }, { background: [] }],
                        [{ font: [] }],
                        [{ align: [] }],
                        ["clean"],
                        ["link", "image"]
                        ],
                        handlers: {}
                    }
                }
            }
        };
    },
    computed: {
        pageTitle() {
            return this.isEdit ? "编辑文案" : "新增文案";
        }
    },
    created() {
        this.editorOptions.modules.toolbar.handlers.image = this.handleEditorImageSelect;
    },
    activated() {
        this.initializePage();
    },
    beforeDestroy() {
        this.unbindEditorEvents();
        this.editorInstance = null;
    },
    methods: {
        async initializePage() {
            this.sharedData = this.getSharedData ? this.getSharedData() || {} : {};
            this.isEdit = Boolean(this.sharedData.configId);
            this.resetForm();

            this.pageLoading = true;
            try {
                const tasks = [this.fetchProductOptions()];
                if (this.isEdit && this.sharedData.configId) {
                    tasks.push(this.fetchDetail(this.sharedData.configId));
                }
                await Promise.all(tasks);
            } finally {
                this.pageLoading = false;
            }
        },
        resetForm() {
            this.unbindEditorEvents();
            this.editorInstance = null;
            this.editorKey += 1;
            this.previewImageUrl = "";
            this.editorContent = "";
            this.editorImageUrlMap = {};
            Object.assign(this.formData, createDefaultFormData());

            this.$nextTick(() => {
                if (this.$refs.copywritingForm) {
                    this.$refs.copywritingForm.clearValidate();
                }
            });
        },
        goBack() {
            this.switchToList();
        },
        async fetchProductOptions() {
            this.productLoading = true;
            try {
                const res = await productSelect({
                    pageNum: 1,
                    pageSize: 999
                });
                this.productOptions = res.data.map((item) => ({
                    ...item,
                    id: this.normalizeId(item.id),
                    productImg: item.productImg || "",
                    productImgUrl: this.sanitizeUrl(item.productImgUrl)
                }));
            } catch (error) {
                console.error("获取商品列表失败:", error);
                this.productOptions = [];
            } finally {
                this.productLoading = false;
            }
        },
        async fetchDetail(configId) {
            try {
                const res = await getCopywriting(configId);
                if (!res.success || !res.data) {
                    this.$message.error(res.errorMessage || "获取详情失败");
                    return;
                }

                const detail = res.data;
                const editorHtml = this.restoreEditorContent(detail.copywritingContent);

                Object.assign(this.formData, {
                    configId: detail.configId || null,
                    displayArea: this.normalizeDisplayArea(detail.displayArea),
                    productId: this.normalizeId(detail.productId),
                    productName: detail.productName || "",
                    productImage: detail.productImage || "",
                    productImageUrl: this.sanitizeUrl(detail.productImageUrl),
                    copywritingContent: editorHtml
                });
                this.editorContent = editorHtml;

                this.$nextTick(() => {
                    this.setEditorHtml(editorHtml);
                });
            } catch (error) {
                console.error("获取详情失败:", error);
                this.$message.error("获取详情失败");
            }
        },
        handleProductChange(productId) {
            const normalizedId = this.normalizeId(productId);
            const selectedProduct = this.productOptions.find((item) => item.id === normalizedId);

            if (!selectedProduct) {
                this.formData.productName = "";
                this.formData.productImage = "";
                this.formData.productImageUrl = "";
                return;
            }

            this.formData.productName = selectedProduct.productName || "";
            this.formData.productImage = selectedProduct.productImg || "";
            this.formData.productImageUrl = this.sanitizeUrl(selectedProduct.productImgUrl);
        },
        previewImage() {
            if (!this.formData.productImageUrl) {
                return;
            }
            this.previewImageUrl = this.formData.productImageUrl;
            this.imageDialogVisible = true;
        },
        handleEditorReady(quill) {
            this.unbindEditorEvents();
            this.editorInstance = quill;
            this.bindEditorEvents(quill);
            this.setEditorHtml(this.editorContent || this.formData.copywritingContent);
        },
        handleEditorChange(payload) {
            const html = this.normalizeEditorHtml(payload && payload.html);
            this.editorContent = html;
            this.formData.copywritingContent = html;
        },
        handleEditorBlur() {
            const html = this.getEditorHtml();
            this.editorContent = html;
            this.formData.copywritingContent = html;
            if (this.$refs.copywritingForm) {
                this.$refs.copywritingForm.validateField("copywritingContent");
            }
        },
        bindEditorEvents(quill) {
            if (!quill || typeof quill.on !== "function") {
                return;
            }

            this.editorTextChangeHandler = () => {
                const html = this.getEditorHtml();
                this.editorContent = html;
                this.formData.copywritingContent = html;
            };

            quill.on("text-change", this.editorTextChangeHandler);
        },
        unbindEditorEvents() {
            if (
                this.editorInstance &&
                this.editorTextChangeHandler &&
                typeof this.editorInstance.off === "function"
            ) {
                this.editorInstance.off("text-change", this.editorTextChangeHandler);
            }
            this.editorTextChangeHandler = null;
        },
        getQuillInstance() {
            return this.editorInstance || (this.$refs.quillEditor && this.$refs.quillEditor.quill) || null;
        },
        getEditorRoot() {
            const editorRef = this.$refs.quillEditor;
            if (!editorRef || !editorRef.$el || typeof editorRef.$el.querySelector !== "function") {
                return null;
            }
            return editorRef.$el.querySelector(".ql-editor");
        },
        normalizeEditorHtml(html) {
            return normalizeEmptyEditorHtml(html);
        },
        getEditorHtml() {
            const editorRoot = this.getEditorRoot();
            if (editorRoot) {
                return this.normalizeEditorHtml(editorRoot.innerHTML);
            }

            const quill = this.getQuillInstance();
            if (!quill || !quill.root) {
                return this.normalizeEditorHtml(this.editorContent || this.formData.copywritingContent);
            }

            return this.normalizeEditorHtml(quill.root.innerHTML);
        },
        setEditorHtml(content) {
            const normalizedContent = this.normalizeEditorHtml(content);
            this.editorContent = normalizedContent;
            this.formData.copywritingContent = normalizedContent;

            const quill = this.getQuillInstance();
            if (!quill || !quill.root) {
                return;
            }

            const currentHtml = this.getEditorHtml();
            if (currentHtml === normalizedContent) {
                return;
            }

            if (!normalizedContent) {
                quill.setText("");
                return;
            }

            quill.setText("");
            if (quill.clipboard && typeof quill.clipboard.dangerouslyPasteHTML === "function") {
                quill.clipboard.dangerouslyPasteHTML(0, normalizedContent);
                return;
            }

            if (typeof quill.pasteHTML === "function") {
                quill.pasteHTML(normalizedContent);
                return;
            }

            quill.root.innerHTML = normalizedContent;
        },
        sanitizeUrl(url) {
            if (!url) {
                return "";
            }
            return String(url).replace(/`/g, "").trim();
        },
        normalizeId(value) {
            if (value === null || value === undefined) {
                return "";
            }
            return String(value);
        },
        normalizeDisplayArea(value) {
            if (value === DISPLAY_AREA_LABEL) {
                return DISPLAY_AREA_VALUE;
            }
            return value || DISPLAY_AREA_VALUE;
        },
        isRemoteImageUrl(url) {
            return /^https?:\/\//i.test(String(url || ""));
        },
        isInlineImageUrl(url) {
            return /^(data:image\/|blob:)/i.test(String(url || ""));
        },
        extractImageSourcesFromText(text) {
            const rawText = String(text || "");
            const remoteMatches = rawText.match(IMAGE_URL_PATTERN) || [];
            const base64Matches = rawText.match(BASE64_IMAGE_PATTERN) || [];

            return Array.from(
                new Set(
                    [...remoteMatches, ...base64Matches]
                        .map((item) => this.sanitizeUrl(item))
                        .filter(Boolean)
                )
            );
        },
        collectImageSourcesFromTextNodes(root, removeMatchedText = false) {
            if (!root) {
                return [];
            }

            const imageSources = [];
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            const textNodes = [];

            while (walker.nextNode()) {
                textNodes.push(walker.currentNode);
            }

            textNodes.forEach((textNode) => {
                const rawText = textNode.textContent || "";
                const matches = this.extractImageSourcesFromText(rawText);
                if (!matches.length) {
                    return;
                }

                imageSources.push(...matches);

                if (!removeMatchedText) {
                    return;
                }

                const remainingText = rawText
                    .replace(IMAGE_URL_PATTERN, "")
                    .replace(BASE64_IMAGE_PATTERN, "")
                    .trim();

                if (remainingText) {
                    textNode.textContent = remainingText;
                } else if (textNode.parentNode) {
                    textNode.parentNode.removeChild(textNode);
                }
            });

            return imageSources;
        },
        removeEmptyBlocks(root) {
            if (!root) {
                return;
            }

            Array.from(root.querySelectorAll("p, div")).reverse().forEach((node) => {
                const html = String(node.innerHTML || "").replace(/&nbsp;/g, "").trim().toLowerCase();
                const text = String(node.textContent || "").replace(/\u200b/g, "").trim();
                const hasVisibleChildren = Array.from(node.children).some((child) => child.tagName !== "BR");

                if (!text && !hasVisibleChildren && (!html || html === "<br>")) {
                    node.remove();
                }
            });
        },
        restoreEditorContent(content) {
            const rawContent = String(content || "").trim();
            if (!rawContent) {
                return "";
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(rawContent, "text/html");

            Array.from(doc.querySelectorAll("img")).forEach((img) => {
                const src = this.sanitizeUrl(img.getAttribute("src"));
                if (src) {
                    img.setAttribute("src", src);
                } else {
                    img.remove();
                }
            });

            const appendedImageSources = this.collectImageSourcesFromTextNodes(doc.body, true);
            this.removeEmptyBlocks(doc.body);

            appendedImageSources.forEach((src) => {
                const wrapper = doc.createElement("p");
                const image = doc.createElement("img");
                image.setAttribute("src", src);
                wrapper.appendChild(image);
                doc.body.appendChild(wrapper);
            });

            return this.normalizeEditorHtml(doc.body.innerHTML);
        },
        getUploadedImageUrl(uploadData, fallbackUrl) {
            const rawUrl = (
                uploadData?.url ||
                uploadData?.fileUrl ||
                uploadData?.ossUrl ||
                uploadData?.fullUrl ||
                uploadData?.urlLink ||
                uploadData?.link ||
                (String(uploadData?.ossId || "").startsWith("http") ? uploadData.ossId : "") ||
                uploadData?.previewUrl ||
                fallbackUrl
            );

            return this.sanitizeUrl(rawUrl);
        },
        async uploadEditorAsset(file, sourceUrl = "") {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fileUpload(formData);
            if (!res.success || res.code !== 200 || !res.data) {
                throw new Error(res.errorMessage || "上传失败");
            }

            const uploadUrl = this.getUploadedImageUrl(res.data, sourceUrl);
            if (!uploadUrl) {
                throw new Error("未获取到图片地址");
            }

            if (sourceUrl) {
                this.$set(this.editorImageUrlMap, sourceUrl, uploadUrl);
            }
            this.$set(this.editorImageUrlMap, uploadUrl, uploadUrl);

            return uploadUrl;
        },
        async convertImageSourceToFile(sourceUrl) {
            const res = await fetch(sourceUrl);
            const blob = await res.blob();
            const imageType = blob.type || "image/png";
            const extension = imageType.split("/")[1] || "png";

            return new File([blob], `copywriting-editor-${Date.now()}.${extension}`, {
                type: imageType
            });
        },
        async resolveEditorImageUrl(sourceUrl) {
            const normalizedSourceUrl = this.sanitizeUrl(sourceUrl);
            if (!normalizedSourceUrl) {
                return "";
            }

            const mappedUrl = this.sanitizeUrl(this.editorImageUrlMap[normalizedSourceUrl]);
            if (mappedUrl && this.isRemoteImageUrl(mappedUrl)) {
                return mappedUrl;
            }

            if (this.isRemoteImageUrl(normalizedSourceUrl)) {
                this.$set(this.editorImageUrlMap, normalizedSourceUrl, normalizedSourceUrl);
                return normalizedSourceUrl;
            }

            if (!this.isInlineImageUrl(normalizedSourceUrl)) {
                return normalizedSourceUrl;
            }

            const imageFile = await this.convertImageSourceToFile(normalizedSourceUrl);
            return this.uploadEditorAsset(imageFile, normalizedSourceUrl);
        },
        handleEditorImageSelect() {
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            input.setAttribute("accept", "image/*");
            input.click();

            input.onchange = async () => {
                const file = input.files && input.files[0];
                if (!file) {
                    return;
                }
                await this.uploadEditorImage(file);
            };
        },
        async uploadEditorImage(file) {
            if (!file.type.startsWith("image/")) {
                this.$message.error("只能上传图片文件");
                return;
            }

            if (file.size / 1024 / 1024 > MAX_EDITOR_IMAGE_SIZE_MB) {
                this.$message.error(`图片大小不能超过 ${MAX_EDITOR_IMAGE_SIZE_MB}MB`);
                return;
            }

            const quill = this.getQuillInstance();
            if (!quill) {
                this.$message.error("编辑器未初始化");
                return;
            }

            try {
                const uploadUrl = await this.uploadEditorAsset(file);
                const range = quill.getSelection(true) || {
                    index: quill.getLength(),
                    length: 0
                };

                quill.insertEmbed(range.index, "image", uploadUrl);
                quill.setSelection(range.index + 1, 0);
                this.editorContent = this.getEditorHtml();
                this.formData.copywritingContent = this.editorContent;
                this.$message.success("图片上传成功");
            } catch (error) {
                this.$message.error(error.message || "上传失败");
            }
        },
        async buildSubmitContent(sourceHtml) {
            const editorHtml = this.normalizeEditorHtml(
                sourceHtml || this.getEditorHtml() || this.editorContent || this.formData.copywritingContent
            );
            if (!editorHtml) {
                return "";
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(editorHtml, "text/html");
            const imageUrls = [];

            for (const img of Array.from(doc.querySelectorAll("img"))) {
                const src = this.sanitizeUrl(img.getAttribute("src"));
                const finalUrl = await this.resolveEditorImageUrl(src);
                if (finalUrl) {
                    imageUrls.push(finalUrl);
                }
                img.remove();
            }

            const textImageSources = this.collectImageSourcesFromTextNodes(doc.body, true);
            for (const source of textImageSources) {
                const finalUrl = await this.resolveEditorImageUrl(source);
                if (finalUrl) {
                    imageUrls.push(finalUrl);
                }
            }

            this.removeEmptyBlocks(doc.body);

            const htmlContent = this.normalizeEditorHtml(doc.body.innerHTML);
            const uniqueImageUrls = Array.from(new Set(imageUrls));
            return `${htmlContent}${uniqueImageUrls.join("")}`;
        },
        async submitForm() {
            const latestEditorHtml = this.getEditorHtml();
            this.editorContent = latestEditorHtml;
            this.formData.copywritingContent = latestEditorHtml;

            this.$refs.copywritingForm.validate(async (valid) => {
                if (!valid) {
                    return;
                }

                this.submitLoading = true;
                try {
                    const submitData = {
                        productId: this.normalizeId(this.formData.productId),
                        productName: this.formData.productName || "",
                        productImage: this.formData.productImage || "",
                        copywritingContent: await this.buildSubmitContent(latestEditorHtml)
                    };

                    if (this.isEdit) {
                        submitData.configId = this.sharedData.configId;
                    }

                    const requestApi = this.isEdit ? updataCopywriting : EditCopywriting;
                    const res = await requestApi(submitData);

                    if (!res.success) {
                        this.$message.error(res.errorMessage || "操作失败");
                        return;
                    }

                    this.$message.success(this.isEdit ? "编辑成功" : "新增成功");
                    if (this.refreshList) {
                        this.refreshList();
                    }
                    this.goBack();
                } catch (error) {
                    console.error("提交失败:", error);
                    this.$message.error(error.message || "操作失败，请稍后重试");
                } finally {
                    this.submitLoading = false;
                }
            });
        }
    }
};
</script>

<style scoped lang="scss">
.copywriting-detail-page {
    height: 100%;
    background: #f5f7fa;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    box-sizing: border-box;
}

.form-card {
    flex: 1;
    border: none;
    border-radius: 12px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

    ::v-deep .el-card__body {
        padding: 24px;
    }
}

.page-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    cursor: pointer;

    i {
        font-size: 20px;
        margin-right: 10px;
        color: #606266;
        transition: color 0.3s;
    }

    &:hover i {
        color: #8f03ff;
    }
}

.page-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}

.copywriting-form {
    max-width: 900px;

    ::v-deep .el-form-item {
        margin-bottom: 24px;
    }
}

.product-image-wrapper {
    .product-image {
        width: 100px;
        height: 100px;
        border-radius: 8px;
        object-fit: cover;
        border: 1px solid #ebeef5;
        cursor: pointer;
    }

    .image-placeholder {
        width: 100px;
        height: 100px;
        border-radius: 8px;
        border: 1px dashed #dcdfe6;
        background: #fafafa;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #909399;
        font-size: 12px;

        i {
            font-size: 24px;
            margin-bottom: 4px;
        }
    }
}

.editor-wrapper {
    border: 1px solid #ebeef5;
    border-radius: 8px;
    overflow: hidden;

    ::v-deep .ql-toolbar {
        border: none;
        border-bottom: 1px solid #ebeef5;
        background: #fafafa;
    }

    ::v-deep .ql-container {
        border: none;
        height: 300px;
        font-size: 14px;
    }

    ::v-deep .ql-editor {
        padding: 16px;

        &.ql-blank::before {
            font-style: normal;
            color: #c0c4cc;
        }
    }
}

.footer-actions {
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
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
        background: #8f03ff;
        border-color: #8f03ff;

        &:hover,
        &:focus {
            background: #7a00e0;
            border-color: #7a00e0;
        }
    }
}
</style>
