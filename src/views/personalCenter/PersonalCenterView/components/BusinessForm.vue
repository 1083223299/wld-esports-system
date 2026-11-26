<script setup>
import { computed, onBeforeUnmount, reactive, ref, toRaw, watch } from 'vue';
import { createRequestId, upload } from '../api';
import { assessmentMetrics } from '../forms/assessment.js';
const props = defineProps({
    form: { type: Object, required: true },
    sources: { type: Object, required: true },
    initial: { type: Object, default: undefined },
    busy: { type: Boolean, required: true }
});
const emit = defineEmits(['submit', 'dirty']);
const model = reactive({});
const error = ref('');
const uploading = ref(false);
const attachmentInput = ref(null);
const mediaInput = ref(null);
const attachmentPreviews = ref([]);
const mediaPreviews = ref([]);
const attachmentImageUrls = computed(() => attachmentPreviews.value.filter(file => file.src).map(file => file.src));
const mediaImageUrls = computed(() => mediaPreviews.value.filter(file => file.src).map(file => file.src));
let attachmentKey = createRequestId();
const aclRightLabels = {
    view: '全体查看',
    download: '全体下载 / 预览',
    upload: '全体上传',
};
const activeMetrics = computed(() => {
    const p = props.sources.periods?.find(x => x.id === model.periodId); const definitions = p?.templateSnapshot?.metrics; if (!definitions)
        return assessmentMetrics; return definitions.map((m) => [m.id, assessmentMetrics.find(x => x[0] === m.id)?.[1] || m.id]);
});
function reset() {
    releasePreviews(attachmentPreviews.value);
    releasePreviews(mediaPreviews.value);
    Object.keys(model).forEach(k => delete model[k]); Object.assign(model, structuredClone(toRaw(props.form.defaults || {})), props.initial ? structuredClone(toRaw(props.initial)) : {}); for (const f of props.form.fields) {
        if (!(f.key in model))
            model[f.key] = ['metrics', 'evidence', 'adjustments', 'acl'].includes(f.type || '') ? {} : f.type === 'assignments' ? [] : f.type === 'checkbox' ? false : '';
    } emit('dirty', false); attachmentKey = createRequestId();
}
watch(() => [props.form, props.initial], reset, { immediate: true });
onBeforeUnmount(() => {
    releasePreviews(attachmentPreviews.value);
    releasePreviews(mediaPreviews.value);
});
function releasePreviews(previews) {
    for (const file of previews) {
        if (file.src)
            URL.revokeObjectURL(file.src);
    }
    previews.splice(0, previews.length);
}
function filePreview(file, id) {
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
    return {
        id,
        name: file.name,
        src: isImage ? URL.createObjectURL(file) : '',
        type: isImage ? '图片' : 'PDF',
    };
}
function openFilePicker(inputRef) {
    const input = Array.isArray(inputRef.value) ? inputRef.value.find(Boolean) : inputRef.value;
    input?.click();
}
function chooseAttachments() {
    openFilePicker(attachmentInput);
}
function chooseMedia() {
    openFilePicker(mediaInput);
}
function changed() { emit('dirty', true); }
async function files(event) {
    const input = event.target; const selected = Array.from(input.files || []); const ids = Array.isArray(model.attachmentIds) ? model.attachmentIds : []; if (ids.length + selected.length > 3) {
        error.value = '一张请假单最多3个附件';
        input.value = '';
        return;
    } uploading.value = true; try {
        for (const file of selected) {
            if (file.size > 5 * 1024 * 1024)
                throw new Error('单个附件不能超过5MB');
            const item = await upload('attachment', file, { businessKey: attachmentKey });
            ids.push(item.id);
            attachmentPreviews.value.push(filePreview(file, item.id));
        }
        model.attachmentIds = ids;
        changed();
    }
    catch (e) {
        error.value = e.message;
    }
    finally {
        uploading.value = false;
        input.value = '';
    }
}
async function mediaFiles(event) {
    const input = event.target; uploading.value = true; try {
        const ids = Array.isArray(model.mediaIds) ? model.mediaIds : [];
        for (const file of Array.from(input.files || [])) {
            const item = await upload('media', file, {});
            ids.push(item.id);
            mediaPreviews.value.push(filePreview(file, item.id));
        }
        model.mediaIds = ids;
        changed();
    }
        catch (e) {
            error.value = e.message;
        }
        finally {
        uploading.value = false;
        input.value = '';
    }
}
function aclChanged(subject, right, checked) {
    if (!model.acl)
        model.acl = {};
    const list = new Set(model.acl[subject] || []); if (checked)
        list.add(right);
    else
        list.delete(right); model.acl[subject] = [...list]; changed();
}
function adjustmentChanged(id, key, value) {
    if (!model.adjustments[id])
        model.adjustments[id] = {};
    model.adjustments[id][key] = value;
}
function submit() {
    error.value = '';
    const hiddenFields = ['expectedVersion', 'previewToken', 'confirmationId'];
    const missingHiddenField = props.form.fields.find(
        field => hiddenFields.includes(field.key) && field.required && (model[field.key] === '' || model[field.key] == null)
    );
    if (missingHiddenField) {
        error.value = `${missingHiddenField.label}未自动获取，无法提交此操作。`;
        return;
    }
    const missingDate = props.form.fields.find(
        field => field.type === 'date' && field.required && !model[field.key]
    );
    if (missingDate) {
        error.value = `请选择${missingDate.label}`;
        return;
    }
    emit('submit', structuredClone(toRaw(model)));
}
</script>
<template>
    <form class="business-form" @submit.prevent="submit" @input="changed">
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <div v-for="f in form.fields" :key="f.key" class="form-field"
            v-show="!['expectedVersion', 'previewToken', 'confirmationId'].includes(f.key)"
            :class="{ 'wide': ['textarea', 'metrics', 'assignments', 'acl', 'adjustments'].includes(f.type || '') }">
            <label :for="'field-' + f.key">{{ f.label }}<span v-if="f.required" aria-hidden="true"> *</span></label>
            <textarea v-if="f.type === 'textarea'" :id="'field-' + f.key" v-model="model[f.key]" :required="f.required"
                rows="4" maxlength="50000" />
            <select v-else-if="f.type === 'select'" :id="'field-' + f.key" v-model="model[f.key]" :required="f.required">
                <option value="">请选择</option>
                <option
                    v-for="o in f.options || (sources[f.source || ''] || []).map(x => ({ value: x.id, label: x.name || x.title || x.ownerId || x.id }))"
                    :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <el-date-picker
                v-else-if="f.type === 'date'"
                :id="'field-' + f.key"
                v-model="model[f.key]"
                type="date"
                format="YYYY年MM月DD日"
                value-format="YYYY-MM-DD"
                :placeholder="`请选择${f.label}`"
                :clearable="!f.required"
                :aria-label="f.label"
                :aria-required="f.required"
                popper-class="personal-center-date-popper"
                @change="changed"
            />
            <input v-else-if="f.type === 'checkbox'" :id="'field-' + f.key" v-model="model[f.key]" type="checkbox">
            <div v-else-if="f.type === 'attachments'" class="pc-file-field">
                <div class="pc-file-picker-row">
                    <button class="btn btn-plain" type="button" :disabled="uploading || busy"
                        @click="chooseAttachments">选择文件</button>
                    <small>支持图片或 PDF，单个不超过 5MB</small>
                </div>
                <input :id="'field-' + f.key" ref="attachmentInput" class="pc-file-input" type="file"
                    accept=".png,.jpg,.jpeg,.gif,.webp,.pdf" multiple :disabled="uploading || busy"
                    :aria-label="`选择${f.label}`" @change="files">
                <p class="pc-upload-count">已上传 {{ model.attachmentIds?.length || 0 }} / 3</p>
                <div v-if="attachmentPreviews.length" class="pc-upload-list" aria-label="已上传文件">
                    <div v-for="file in attachmentPreviews" :key="file.id" class="pc-upload-item">
                        <el-image v-if="file.src" class="pc-upload-thumbnail" :src="file.src"
                            :preview-src-list="attachmentImageUrls" :initial-index="attachmentImageUrls.indexOf(file.src)"
                            :alt="file.name" :aria-label="`放大查看${file.name}`" fit="cover" preview-teleported />
                        <div v-else class="pc-upload-file-icon" aria-hidden="true">PDF</div>
                        <span class="pc-upload-name" :title="file.name">{{ file.name }}</span>
                    </div>
                </div>
            </div>
            <div v-else-if="f.type === 'media'" class="pc-file-field">
                <div class="pc-file-picker-row">
                    <button class="btn btn-plain" type="button" :disabled="uploading || busy"
                        @click="chooseMedia">选择图片</button>
                    <small>图片上传后可点击缩略图放大查看</small>
                </div>
                <input :id="'field-' + f.key" ref="mediaInput" class="pc-file-input" type="file"
                    accept=".png,.jpg,.jpeg,.gif,.webp" multiple :disabled="uploading || busy"
                    :aria-label="`选择${f.label}`" @change="mediaFiles">
                <p class="pc-upload-count">已上传 {{ model.mediaIds?.length || 0 }} 张内部图片</p>
                <div v-if="mediaPreviews.length" class="pc-upload-list" aria-label="已上传图片">
                    <div v-for="file in mediaPreviews" :key="file.id" class="pc-upload-item">
                        <el-image class="pc-upload-thumbnail" :src="file.src"
                            :preview-src-list="mediaImageUrls" :initial-index="mediaImageUrls.indexOf(file.src)"
                            :alt="file.name" :aria-label="`放大查看${file.name}`" fit="cover" preview-teleported />
                        <span class="pc-upload-name" :title="file.name">{{ file.name }}</span>
                    </div>
                </div>
            </div>
            <div v-else-if="f.type === 'metrics'" class="metric-inputs"><label v-for="[id, label] in activeMetrics"
                    :key="id">{{ label }}<input v-model="model.values[id]" type="number" min="0" step="any"></label></div>
            <div v-else-if="f.type === 'evidence'"><textarea :id="'field-' + f.key" v-model="model.evidence.platform_risk"
                    placeholder="平台风险分的事实、材料位置及核验说明" rows="3" /></div>
            <div v-else-if="f.type === 'adjustments'" class="adjustment-list">
                <details v-for="[id, label] in activeMetrics" :key="id">
                    <summary>{{ label }}</summary><label>调整后分数<input type="number" min="0" step="0.01"
                            :value="model.adjustments[id]?.score ?? ''"
                            @input="adjustmentChanged(id, 'score', $event.target.value)"></label><label>调整原因<input
                            :value="model.adjustments[id]?.reason ?? ''"
                            @input="adjustmentChanged(id, 'reason', $event.target.value)"></label><label>证据<input
                            :value="model.adjustments[id]?.evidence ?? ''"
                            @input="adjustmentChanged(id, 'evidence', $event.target.value)"></label>
                </details>
            </div>
            <div v-else-if="f.type === 'assignments'">
                <div v-for="(row, i) in model.assignments" :key="i" class="inline-fields"><select
                        v-model="row.employeeId" aria-label="员工">
                        <option value="">选择员工</option>
                        <option v-for="x in sources.employees" :key="x.id" :value="x.id">{{ x.name }}</option>
                    </select><select v-model="row.seatId" aria-label="工位">
                        <option value="">选择工位</option>
                        <option v-for="x in sources.seats" :key="x.id" :value="x.id">{{ x.name }}</option>
                    </select><button type="button" class="btn"
                        @click="model.assignments.splice(i, 1); changed()">移除</button></div><button type="button"
                    class="btn" @click="model.assignments.push({ employeeId: '', seatId: '' }); changed()">添加安排</button>
            </div>
            <div v-else-if="f.type === 'acl'" class="acl">
                <p>显式授权替换继承集合；下载必须同时允许查看。</p>
                <label v-for="right in ['view', 'download', 'upload']" :key="right">
                    <input
                        type="checkbox"
                        :checked="model.acl?.all?.includes(right)"
                        @change="aclChanged('all', right, $event.target.checked)"
                    >
                    {{ aclRightLabels[right] }}
                </label>
            </div>
            <input v-else :id="'field-' + f.key" v-model="model[f.key]" :type="f.type || 'text'"
                :required="f.required && !['expectedVersion', 'previewToken', 'confirmationId'].includes(f.key)"
                :min="f.type === 'number' ? 0 : undefined" :step="f.type === 'number' ? 'any' : undefined">
            <small v-if="f.help">{{ f.help }}</small>
        </div>
        <footer><button class="btn btn-primary" :disabled="busy || uploading"
                type="submit">{{ busy ? '正在处理…' : form.title }}</button><button class="btn" type="button" :disabled="busy || uploading"
                @click="reset">重置输入</button></footer>
    </form>
</template>
