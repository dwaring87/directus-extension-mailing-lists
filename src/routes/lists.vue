<template>
  <Page title="Lists" icon="people">
    <ListsManage 
      :updatedLists="updatedLists"
      @editedList="(v) => editedList = v" />
    <ListsCreate
      @updatedLists="(v) => updatedLists = v"
      :editedList="editedList" />
  </Page>
</template>

<script setup>
  import { ref } from 'vue';
  import Page from '../components/Page.vue';
  import ListsCreate from '../components/Lists/Create.vue';
  import ListsManage from '../components/Lists/Manage.vue';

  const updatedLists = ref();
  const editedList = ref();
</script>