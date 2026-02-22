<template>
  <Page title="Messages" icon="mail">
    <MessagesManage
      :updatedMessages="updatedMessages"
      @editedMessage="(v) => editedMessage = v" />
    <MessagesCreate 
      @updateMessages="(t) => updatedMessages = t"
      :editedMessage="editedMessage"/>
  </Page>
</template>

<script setup>
  import { ref } from 'vue';
  import Page from '../components/Page.vue';
  import MessagesManage from '../components/Messages/Manage.vue';
  import MessagesCreate from '../components/Messages/Create.vue';

  const updatedMessages = ref();
  const editedMessage = ref();
</script>
