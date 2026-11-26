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
      <button v-if="pc.section === 'category' && pc.manager" class="btn btn-primary" @click="pc.defaultForm">
        {{ forms.categories[0].title }}
      </button>
      <button v-if="pc.manager" class="btn btn-plain" @click="pc.showTrash = !pc.showTrash; pc.load()">
        {{ pc.showTrash ? '返回文件中心' : '回收站' }}
      </button>
      <template v-if="pc.section !== 'category'">
        <select v-model="pc.fileCategory" aria-label="上传目标分类">
          <option value="">选择上传分类</option>
          <option v-for="category in pc.sources.categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
        <label class="btn btn-plain">
          上传文件
          <input type="file" :disabled="pc.busy || !pc.fileCategory" @change="pc.uploadFile">
        </label>
      </template>
    </div>
    <RecordsTable :pc="pc" />
  </PersonalCenterShell>
</template>
