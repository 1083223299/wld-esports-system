<script setup>
import PersonalCenterShell from '../components/PersonalCenterShell.vue';
import { usePersonalCenterPage } from '../usePersonalCenterPage';

const pc = usePersonalCenterPage();
const metricLabels = {
  dispatch: '派单',
  success: '成功',
  hold: '存单',
  transfer: '转单',
  partialRefund: '部分退款',
  fullRefund: '全额退款',
  afterSale: '售后',
};
</script>

<template>
  <PersonalCenterShell :pc="pc">
    <section class="card">
      <div class="toolbar">
        <label>
          开始日期
          <el-date-picker
            v-model="pc.filterDate"
            type="date"
            format="YYYY年MM月DD日"
            value-format="YYYY-MM-DD"
            placeholder="选择开始日期"
            aria-label="开始日期"
            :clearable="false"
            popper-class="personal-center-date-popper"
          />
        </label>
        <label>
          结束日期
          <el-date-picker
            v-model="pc.filterEnd"
            type="date"
            format="YYYY年MM月DD日"
            value-format="YYYY-MM-DD"
            placeholder="选择结束日期"
            aria-label="结束日期"
            :clearable="false"
            popper-class="personal-center-date-popper"
          />
        </label>
        <label v-if="pc.manager">
          人员
          <select v-model="pc.filterEmployee">
            <option value="">全公司</option>
            <option v-for="item in pc.sources.employees" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <button class="btn btn-primary" @click="pc.load">查询</button>
      </div>
      <p class="muted">派单、转单、退款、售后按事件日；成功按创建日当前结果；存单取结束日库存。</p>
    </section>

    <div v-if="pc.data?.metrics" class="dashboard-cards">
      <section v-for="(label, key) in metricLabels" :key="key" class="card">
        <span>{{ label }}</span>
        <strong>{{ pc.data.metrics[key] }}</strong>
        <small v-if="key === 'hold'">结束日库存</small>
      </section>
    </div>

    <section class="card">
      <p v-if="pc.data?.dataStatus === 'notIntegrated'" class="banner">尚未接入订单事实，暂无可展示的业务数据。</p>
      <p v-if="pc.data?.dataStatus === 'partial'" class="banner">当前数据覆盖不完整，请结合覆盖日期查看。</p>
      <p v-if="pc.data?.source === 'isolated-test'" class="muted">以下仅为隔离测试事实，不能作为正式经营数据。</p>
      <p>数据状态：{{ pc.data?.dataStatus || '加载中' }} · 覆盖起点：{{ pc.data?.coverageStart || '未接入' }}</p>
      <table v-if="pc.data?.daily?.length">
        <thead>
          <tr>
            <th>业务日期</th>
            <th v-for="(label, key) in metricLabels" :key="key">{{ label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="day in pc.data.daily" :key="day.date">
            <td>{{ day.date }}</td>
            <td v-for="key in Object.keys(metricLabels)" :key="key">{{ day.metrics[key] }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </PersonalCenterShell>
</template>
