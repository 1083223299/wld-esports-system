<script setup>
import RecordMediaGallery from './RecordMediaGallery.vue';

defineProps({
  pc: { type: Object, required: true },
  row: { type: Object, required: true },
});
</script>

<template>
  <div class="record-cell">
    <strong>
      {{ row.title || row.name || (row.type != null && row.type !== '' ? pc.label(row.type) : '') || row.id || '—' }}
    </strong>
    <small v-if="row.reason">{{ row.reason }}</small>
    <small v-if="row.text" class="safe-text">{{ row.text }}</small>
    <small v-if="row.score">
      总分 {{ row.score.total }} · 原始目标{{ row.score.allTargets ? '均达标' : '未全部达标' }}
    </small>
    <RecordMediaGallery :row="row" />
    <span v-if="row.override" class="status">管理特批</span>
    <small v-if="row.basisChanged" class="error">依据已变化，需管理复核</small>
  </div>
</template>
