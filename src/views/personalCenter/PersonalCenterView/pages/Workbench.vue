<script setup>
import PersonalCenterShell from '../components/PersonalCenterShell.vue';
import { usePersonalCenterPage } from '../usePersonalCenterPage';

const pc = usePersonalCenterPage();

/**
 * 后端事件类型（eventType）→ 中文文案。
 * 只登记已实际收到并确认含义的类型；其余类型原样显示，等后端给出枚举清单再补，不猜测。
 */
const EVENT_LABELS = {
  'post.changed': '岗位变更',
  'leave.created': '请假申请提交',
  'leave.revoked': '请假撤销',
};

function eventLabel(type) {
  if (!type) return '系统通知';
  return EVENT_LABELS[type] || type;
}

/** 交接内容截断（保留一行摘要） */
function clip(text, max = 80) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '（无正文）';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / MM-DD HH:mm */
function formatTime(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(/-/g, '/').replace('T', ' '));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
</script>

<template>
  <PersonalCenterShell :pc="pc">
    <template v-if="pc.home">
      <section v-if="!pc.hasLinkedEmployee || !pc.home.employee" class="welcome">
        <div>
          <h2>{{ pc.identity?.name || '当前账号' }}，请先完成员工关联</h2>
          <p>完成员工建档、账号关联并绑定班次后，即可使用个人排班和休班日历。</p>
        </div>
      </section>

      <section v-else class="welcome">
        <div>
          <p>{{ pc.home.today?.date }} · {{ pc.label(pc.home.employee.shiftId) }}</p>
          <h2>{{ pc.identity?.name || '员工' }}，今天的安排在这里</h2>
          <p>
            {{ pc.home.employee.state === 'active' ? '查看班次和座次，及时处理工作申请。' : '当前业务资格已停用，可在授权范围查看历史。' }}
          </p>
        </div>
        <div class="shift-block">
          <strong>
            {{ pc.home.today?.shift?.off ? '月末班次轮休' : pc.home.today?.shift?.start && pc.home.today?.shift?.end ? `${pc.home.today.shift.start.slice(11, 16)} — ${pc.home.today.shift.end.slice(11, 16)}` : '暂无班次安排' }}
          </strong>
          <span v-if="pc.home.today?.shift?.start && pc.home.today?.shift?.end">
            {{ pc.home.today.shift.start.slice(0, 10) }} 至 {{ pc.home.today.shift.end.slice(0, 10) }}
          </span>
        </div>
      </section>

      <div v-if="pc.hasLinkedEmployee && pc.home.employee" class="home-grid">
        <section class="card">
          <h3>当前进行的班次</h3>
          <div v-for="shift in pc.home.currentShifts" :key="shift.date">
            <strong>{{ pc.label(pc.home.employee.shiftId) }} · {{ shift.date }}</strong>
            <p>{{ shift.shift.start.replace('T', ' ') }} 至 {{ shift.shift.end.replace('T', ' ') }}</p>
          </div>
          <p v-if="!pc.home.currentShifts.length" class="empty">当前没有进行中的班次</p>
          <button class="btn btn-plain" @click="pc.navigate('seating')">查看本人座位</button>
        </section>

        <section class="card">
          <h3>快捷申请</h3>
          <p>休班和请假分别审批，结果保留在记录中。</p>
          <div class="actions">
            <button class="btn btn-primary" @click="pc.navigate('rest', undefined, true)">申请休班</button>
            <button class="btn btn-plain" @click="pc.navigate('leave', undefined, true)">申请请假</button>
            <button class="btn btn-plain" @click="pc.handover">订单交接</button>
          </div>
        </section>
      </div>

      <section class="card">
        <h3>工作通知</h3>
        <div
          v-for="item in pc.pendingHandovers"
          :key="'handover-' + item.id"
          class="notification handover"
        >
          <div class="notice-main">
            <strong>{{ item.creatorName || '同事' }} 交接的事项</strong>
            <p class="notice-text">{{ clip(item.content) }}</p>
            <small v-if="item.createdAt">{{ formatTime(item.createdAt) }}</small>
          </div>
          <button class="btn btn-link" @click="pc.goHandover()">去处理</button>
        </div>
        <div v-for="item in pc.rows" :key="item.id" class="notification">
          <span>{{ eventLabel(item.eventType) }}</span>
          <button v-if="item.state === 'unread'" class="btn btn-link" @click="pc.readNotice(item)">标为已读</button>
          <span v-else class="status">已读</span>
        </div>
        <p v-if="!pc.pendingHandovers.length && !pc.rows.length" class="empty">暂无工作通知</p>
      </section>
    </template>
    <p v-else-if="pc.loading" role="status" class="empty">工作台数据加载中…</p>
    <p v-else-if="pc.identity && !pc.error" role="status" class="empty">暂无工作台数据</p>
  </PersonalCenterShell>
</template>
