<template>
  <div>
    <VDivider class="divider" large :inline-title="false">
      <template #icon><VIcon name="mail" /></template>
      Messages
    </VDivider>
    <div style="margin: 25px">
      <MessagesTable :updatedMessages="updatedMessages" @editedMessage="(v) => $emit('editedMessage', v)" />
    </div>
  </div>
</template>

<script setup>
  import MessagesTable from '../Messages/Table.vue';
  
  const emits = defineEmits([ 'editedMessage' ]);
  const props = defineProps({ updatedMessages: String });
</script>