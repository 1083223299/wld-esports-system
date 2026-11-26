<script setup>
import PersonalCenterShell from '../components/PersonalCenterShell.vue';
import RecordsTable from '../components/RecordsTable.vue';
import { forms } from '../forms/index.js';
import { usePersonalCenterPage } from '../usePersonalCenterPage';

const pc = usePersonalCenterPage();
</script>

<template>
  <PersonalCenterShell :pc="pc">
    <div class="toolbar seat-toolbar">
      <template v-if="pc.manager">
        <button class="btn btn-primary" @click="pc.defaultForm">{{ forms.seating[0].title }}</button>
      </template>
      <template v-else>
        <el-date-picker
          v-model="pc.filterDate"
          type="date"
          format="YYYY年MM月DD日"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          aria-label="座次日期"
          :clearable="false"
          popper-class="personal-center-date-popper"
        />
        <select v-model="pc.filterShift" class="seat-shift-select" aria-label="座次班次">
          <option value="EARLY">早班</option>
          <option value="MIDDLE">中班</option>
          <option value="LATE">晚班</option>
        </select>
        <button class="btn btn-plain" @click="pc.currentSeats">查看已发布座次</button>
      </template>
    </div>
    <RecordsTable :pc="pc" />
  </PersonalCenterShell>
</template>
