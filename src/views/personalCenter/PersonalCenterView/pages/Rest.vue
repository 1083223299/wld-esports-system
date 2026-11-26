<script setup>
import PersonalCenterShell from '../components/PersonalCenterShell.vue';
import RecordsTable from '../components/RecordsTable.vue';
import { forms } from '../forms/index.js';
import { usePersonalCenterPage } from '../usePersonalCenterPage';

const pc = usePersonalCenterPage();
</script>

<template>
  <PersonalCenterShell :pc="pc">
    <p v-if="!pc.hasLinkedEmployee" class="banner">
      请先完成员工建档、个人中心账号关联并绑定班次，之后即可使用休班日历和申请休班。
    </p>

    <section v-if="pc.hasLinkedEmployee && !pc.loading" class="card">
      <div class="toolbar">
        <h3>休班日历</h3>
        <el-date-picker
          v-model="pc.filterDate"
          type="date"
          format="YYYY年MM月DD日"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          aria-label="选择月份中的日期"
          :clearable="false"
          popper-class="personal-center-date-popper"
          @change="pc.load"
        />
      </div>
      <div class="calendar">
        <button
          v-for="day in pc.calendar"
          :key="day.date"
          type="button"
          :disabled="!day.allowed"
          :title="day.allowed ? '可申请休班' : day.reasons.map(pc.restReason).join('、')"
          :aria-label="`${day.date}，${day.allowed ? '可申请休班' : day.reasons.map(pc.restReason).join('、')}`"
          :class="{ available: day.allowed }"
          @click="pc.open({ ...forms.rest[0] }, { restDate: day.date })"
        >
          <strong>{{ day.date.slice(-2) }}</strong>
          <small>{{ day.allowed ? '可申请' : day.reasons.map(pc.restReason).join('、') }}</small>
        </button>
      </div>
    </section>

    <div v-if="pc.hasLinkedEmployee" class="toolbar">
      <button class="btn btn-primary" @click="pc.defaultForm">{{ forms.rest[0].title }}</button>
    </div>
    <RecordsTable :pc="pc" />
  </PersonalCenterShell>
</template>
