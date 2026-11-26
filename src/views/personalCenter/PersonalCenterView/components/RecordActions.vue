<script setup>
import { forms, version } from '../forms/index.js';

defineProps({
  pc: { type: Object, required: true },
  row: { type: Object, required: true },
});
</script>

<template>
  <div class="row-actions">
    <template v-if="['rest', 'leave'].includes(pc.tab) || pc.section.startsWith('approval')">
      <button v-if="row.attachmentIds?.length" class="btn btn-link" @click="pc.attachments(row)">证明材料</button>
      <button v-if="row.state === 'pending' && pc.manager" class="btn btn-link" @click="pc.actionForm(row, 'approve')">批准</button>
      <button v-if="row.state === 'pending' && pc.manager" class="btn btn-link" @click="pc.actionForm(row, 'reject')">驳回</button>
      <button v-if="row.state === 'pending' && row.ownerId === pc.identity.employeeId" class="btn btn-link" @click="pc.actionForm(row, 'cancel')">撤回</button>
      <button v-if="row.state === 'approved' && pc.manager" class="btn btn-link" @click="pc.actionForm(row, 'revoke')">撤销</button>
    </template>

    <template v-if="pc.tab === 'content'">
      <button
        v-if="row.state !== 'deleted' && (pc.manager || row.ownerId === pc.identity.accountId)"
        class="btn btn-link"
        @click="pc.open({ title: '保存内容', path: `/content/${pc.section}`, fields: [...(pc.section !== 'comment' ? [{ key: 'title', label: '标题', required: true }] : []), { key: 'text', label: '正文', type: 'textarea', required: true }, ...(pc.section === 'announcement' ? [{ key: 'state', label: '公告状态', type: 'select', required: true, options: [{ value: 'draft', label: '草稿' }, { value: 'published', label: '发布' }, { value: 'archived', label: '归档' }] }] : [])] }, { ...row, expectedVersion: row.version })"
      >
        编辑
      </button>
      <button class="btn btn-link" @click="pc.actionForm(row, 'read')">已读</button>
      <button
        v-if="row.state !== 'deleted' && (pc.manager || row.ownerId === pc.identity.accountId)"
        class="btn btn-link"
        @click="pc.actionForm(row, 'delete')"
      >
        删除
      </button>
      <button v-if="row.state === 'deleted' && pc.manager" class="btn btn-link" @click="pc.actionForm(row, 'restore')">恢复</button>
      <button
        v-if="pc.section === 'post'"
        class="btn btn-link"
        @click="pc.open({ title: '添加评论', path: '/content/comment', fields: [{ key: 'text', label: '评论内容', type: 'textarea', required: true }] }, { parentId: row.id })"
      >
        评论
      </button>
    </template>

    <template v-if="pc.tab === 'files'">
      <button v-if="pc.section !== 'category' && row.state === 'active'" class="btn btn-link" :disabled="pc.busy" @click="pc.fileDownload(row)">下载 / 预览</button>
      <button
        v-if="pc.manager && row.state === 'active' && pc.section === 'category'"
        class="btn btn-link"
        @click="pc.open({ ...forms.categories[0], title: '编辑分类授权' }, { ...row, expectedVersion: row.version })"
      >
        编辑授权
      </button>
      <button
        v-if="pc.manager && row.state === 'active' && pc.section !== 'category'"
        class="btn btn-link"
        @click="pc.open({ title: '移动文件', path: `/files/${row.id}/move`, fields: [{ key: 'categoryId', label: '目标分类', type: 'select', source: 'categories', required: true }, version] }, { expectedVersion: row.version })"
      >
        移动
      </button>
      <button v-if="pc.manager" class="btn btn-link" @click="pc.actionForm(row, row.state === 'deleted' ? 'restore' : 'delete')">
        {{ row.state === 'deleted' ? '恢复' : '删除' }}
      </button>
      <button v-if="pc.highest && row.state === 'deleted'" class="btn btn-link danger" @click="pc.actionForm(row, 'purgePreview')">永久删除预检</button>
    </template>

    <template v-if="pc.tab === 'seating' && pc.manager && row.state === 'draft'">
      <button class="btn btn-link" :disabled="pc.busy" @click="pc.previewDraft(row)">自动预览</button>
      <button
        class="btn btn-link"
        @click="pc.open({ title: '整体换座', path: `/seating/drafts/${row.id}/swap`, fields: [{ key: 'firstEmployeeId', label: '移动员工', type: 'select', source: 'employees', required: true }, { key: 'secondEmployeeId', label: '交换员工（空则移动到空位）', type: 'select', source: 'employees' }, { key: 'targetSeatId', label: '目标空位', type: 'select', source: 'seats' }, version] }, { expectedVersion: row.version })"
      >
        换座
      </button>
      <button class="btn btn-link" @click="pc.open(forms.seating[0], { ...row, expectedVersion: row.version })">编辑</button>
    </template>

    <template v-if="pc.tab === 'assessment' || (pc.tab === 'manage' && ['scores', 'vetoes'].includes(pc.section))">
      <template v-if="pc.section === 'veto' || pc.section === 'vetoes'">
        <button v-if="row.ownerId === pc.identity.employeeId" class="btn btn-link" @click="pc.actionForm(row, 'appeal')">申诉</button>
        <button v-if="pc.manager" class="btn btn-link" @click="pc.actionForm(row, 'verify')">核实</button>
      </template>
      <template v-else>
        <button v-if="row.state === 'draft' && pc.manager" class="btn btn-link" @click="pc.actionForm(row, 'submit')">提交</button>
        <button v-if="row.state === 'submitted' && row.ownerId === pc.identity.employeeId" class="btn btn-link" @click="pc.actionForm(row, 'confirm')">确认</button>
        <button v-if="['submitted', 'confirmed'].includes(row.state) && row.ownerId === pc.identity.employeeId" class="btn btn-link" @click="pc.actionForm(row, 'feedback')">异议</button>
        <button v-if="row.state === 'disputed' && pc.manager" class="btn btn-link" @click="pc.actionForm(row, 'resolve')">处理</button>
        <button v-if="row.state === 'confirmed' && pc.manager" class="btn btn-link" @click="pc.actionForm(row, 'lock')">锁定</button>
        <button v-if="row.state === 'locked' && pc.manager" class="btn btn-link" @click="pc.actionForm(row, 'revise')">修订</button>
        <button
          v-if="row.state === 'draft' && pc.manager"
          class="btn btn-link"
          @click="pc.open(forms.scores[0], { ...row, employeeId: row.ownerId, expectedVersion: row.version })"
        >
          编辑评分
        </button>
      </template>
    </template>

    <button
      v-if="pc.tab === 'manage' && pc.section === 'employees' && pc.manager"
      class="btn btn-link"
      @click="pc.open(forms.employees[0], { ...row, expectedVersion: row.version })"
    >
      编辑
    </button>
    <button
      v-if="pc.tab === 'manage' && pc.section === 'accounts' && pc.manager && row.accountId && row.version != null"
      class="btn btn-link"
      @click="pc.open(forms.accounts[0], { accountId: row.accountId, expectedVersion: row.version })"
    >
      账号操作
    </button>
    <button
      v-if="pc.tab === 'manage' && pc.section === 'seats' && pc.manager"
      class="btn btn-link"
      @click="pc.open(forms.seats[0], { ...row, enabled: row.state === 'active', expectedVersion: row.version })"
    >
      编辑
    </button>
  </div>
</template>
