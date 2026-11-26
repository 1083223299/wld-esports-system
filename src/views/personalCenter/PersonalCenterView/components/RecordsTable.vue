<script setup>
import RecordActions from './RecordActions.vue';
import RecordSummary from './RecordSummary.vue';

defineProps({
  pc: {
    type: Object,
    required: true,
  },
});

function employeeAuthor(row, pc) {
  const name =
    row.authorName ||
    row.employeeName ||
    row.creatorName ||
    row.createdByName ||
    row.ownerName ||
    row.creator?.name ||
    row.employee?.name;
  if (name) return name;

  const id =
    row.employeeId ??
    row.ownerId ??
    row.creatorId ??
    row.createdBy ??
    row.createdByAccountId ??
    row.accountId;
  return id != null && id !== '' ? pc.name(id) : '—';
}
</script>

<template>
  <section class="card records">
    <p v-if="pc.loading" role="status" class="empty">正在加载…</p>
    <p v-else-if="!pc.rows.length" class="empty">
      当前没有可查看的记录{{ pc.tab === 'files' ? '，可选择授权分类上传文件。' : '。' }}
    </p>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th v-if="pc.section.startsWith('approval')">选择</th>
            <th>记录</th>
            <th>员工 / 作者</th>
            <th>日期 / 班次</th>
            <th>状态</th>
            <th v-if="pc.section !== 'shifts'">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pc.rows" :key="row.id">
            <td v-if="pc.section.startsWith('approval')">
              <input
                type="checkbox"
                :checked="pc.selected.includes(row)"
                :disabled="row.state !== 'pending'"
                :aria-label="'选择' + row.id"
                @change="pc.selected = $event.target.checked ? [...pc.selected, row] : pc.selected.filter((item) => item !== row)"
              >
            </td>
            <td><RecordSummary :pc="pc" :row="row" /></td>
            <td>{{ employeeAuthor(row, pc) }}</td>
            <td>
              {{ row.date || row.createdAt?.slice(0, 10) || '—' }}
              <small v-if="row.shiftId">{{ pc.label(row.shiftId) }}</small>
            </td>
            <td>
              <span class="status" :class="row.state">{{ pc.label(row.decision || row.state) }}</span>
              <small v-if="row.version != null">版本 {{ row.version }}</small>
            </td>
            <td v-if="pc.section !== 'shifts'"><RecordActions :pc="pc" :row="row" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="pc.data?.total > 50" class="pagination">
      <button class="btn" :disabled="pc.currentPage === 1" @click="pc.currentPage--; pc.load()">上一页</button>
      <span>第 {{ pc.currentPage }} 页 / 共 {{ pc.data.total }} 条</span>
      <button class="btn" :disabled="pc.currentPage * 50 >= pc.data.total" @click="pc.currentPage++; pc.load()">下一页</button>
    </div>
  </section>
</template>
