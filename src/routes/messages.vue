<template>
  <Page title="Messages" icon="mail">
    <MessagesManage
      :updatedMessages="updatedMessages"
      @editedMessage="(v) => editedMessage = v" />
    <MessagesCreate 
      @updateMessages="(m) => onUpdateMessages(m)"
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

  const onUpdateMessages = (m) => {
    updatedMessages.value = new Date().getTime();;
    if ( m.id && m.name ) editedMessage.value = m;
  }
</script>
