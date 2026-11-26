<script setup>
defineProps({
  pc: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <nav v-if="pc.subtabs[pc.tab]" class="subnav" aria-label="页面分类">
    <button
      v-for="item in pc.subtabs[pc.tab]"
      :key="item.id"
      type="button"
      :class="{ active: pc.section === item.id }"
      :aria-current="pc.section === item.id ? 'page' : undefined"
      @click="pc.navigate(pc.tab, item.id)"
    >
      {{ item.name }}
    </button>
  </nav>
</template>
