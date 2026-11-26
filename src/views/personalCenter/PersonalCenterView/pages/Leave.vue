<script setup>
import PersonalCenterShell from '../components/PersonalCenterShell.vue';
import RecordsTable from '../components/RecordsTable.vue';
import { forms } from '../forms/index.js';
import { usePersonalCenterPage } from '../usePersonalCenterPage';

const pc = usePersonalCenterPage();
</script>

<template>
  <PersonalCenterShell :pc="pc">
    <div class="toolbar">
      <button class="btn btn-primary" @click="pc.defaultForm">{{ forms.leave[0].title }}</button>
    </div>
    <RecordsTable :pc="pc" />
  </PersonalCenterShell>
</template>
