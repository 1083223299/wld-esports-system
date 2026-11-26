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
      <button v-if="pc.section === 'post' && forms.content?.length" class="btn btn-primary" @click="pc.defaultForm">
        {{ forms.content[0].title }}
      </button>
      <button
        v-if="pc.section === 'announcement' && pc.manager"
        class="btn btn-primary"
        @click="pc.open({ title: '维护公告', path: '/content/announcement', fields: [{ key: 'title', label: '标题', required: true }, { key: 'text', label: '正文', type: 'textarea', required: true }, { key: 'state', label: '状态', type: 'select', required: true, options: [{ value: 'draft', label: '草稿' }, { value: 'published', label: '发布' }, { value: 'archived', label: '归档' }] }] })"
      >
        维护公告
      </button>
      <button v-if="pc.manager" class="btn btn-plain" @click="pc.showTrash = !pc.showTrash; pc.load()">
        {{ pc.showTrash ? '返回内容' : '内容回收站' }}
      </button>
    </div>
    <RecordsTable :pc="pc" />
  </PersonalCenterShell>
</template>
