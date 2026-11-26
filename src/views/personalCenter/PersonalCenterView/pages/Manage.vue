<script setup>
import PersonalCenterShell from '../components/PersonalCenterShell.vue';
import PersonalCenterSubnav from '../components/PersonalCenterSubnav.vue';
import RecordsTable from '../components/RecordsTable.vue';
import { forms } from '../forms/index.js';
import { usePersonalCenterPage } from '../usePersonalCenterPage';

const pc = usePersonalCenterPage();
</script>

<template>
  <PersonalCenterShell :pc="pc">
    <PersonalCenterSubnav :pc="pc" />
    <div class="toolbar">
      <button v-if="pc.manager && forms[pc.section]?.length" class="btn btn-primary" @click="pc.defaultForm">
        {{ forms[pc.section][0].title }}
      </button>
      <button
        v-if="pc.selected.length"
        class="btn btn-primary"
        :disabled="pc.busy"
        @click="pc.batchApprove"
      >
        批准所选 {{ pc.selected.length }} 项
      </button>
    </div>
    <RecordsTable :pc="pc" />
  </PersonalCenterShell>
</template>
