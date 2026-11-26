<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import { imageUrl } from '../api';
const props = defineProps({
    id: { type: String, required: true }
});
const url = ref(''), error = ref('');
let generation = 0;
watch(() => props.id, async (id) => { const current = ++generation; error.value = ''; if (url.value)
    URL.revokeObjectURL(url.value); url.value = ''; try {
    const value = await imageUrl(id);
    if (current !== generation) {
        URL.revokeObjectURL(value);
        return;
    }
    url.value = value;
}
catch (e) {
    if (current === generation)
        error.value = e.message;
} }, { immediate: true });
onBeforeUnmount(() => { generation++; if (url.value)
    URL.revokeObjectURL(url.value); });
</script>
<template>
    <el-image
        v-if="url"
        class="post-image"
        :src="url"
        alt="公司内部图片"
        fit="contain"
        :preview-src-list="[url]"
        preview-teleported
    />
    <small v-else>{{ error || '图片加载中…' }}</small>
</template>
