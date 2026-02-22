<template>
  <div>
    <VDivider class="divider" large :inline-title="false">
      <template #icon><VIcon name="people" /></template>
      Mailing Lists
    </VDivider>
    <div style="margin: 25px">
      <ListsTable :updatedLists="updatedLists" @editedList="(v) => $emit('editedList', v)" />
    </div>
  </div>
</template>

<script setup>
  import ListsTable from '../Lists/Table.vue';
  
  const emits = defineEmits(['editedList']);
  const props = defineProps({ updatedLists: String });
</script>