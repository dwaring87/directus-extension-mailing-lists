<template>
  <private-view :title="title">
    <template #headline>Mailing Lists</template>

    <template #title-outer:prepend>
      <v-button v-if="icon" class="header-icon" rounded disabled icon secondary>
        <v-icon :name="icon" />
      </v-button>
    </template>

    <template #navigation>
      <v-list nav>
        <v-list-item to="/mailing-lists/" key="messages" :active="title == 'Messages'">
          <v-list-item-icon><v-icon name="mail" /></v-list-item-icon>
          <v-list-item-content><v-text-overflow text="Messages" /></v-list-item-content>
        </v-list-item>
        <v-list-item to="/mailing-lists/lists" key="lists" :active="title == 'Lists'">
          <v-list-item-icon><v-icon name="people" /></v-list-item-icon>
          <v-list-item-content><v-text-overflow text="Lists" /></v-list-item-content>
        </v-list-item>
      </v-list>
    </template>

    <div class="mailing-lists-container">
      <v-notice v-if="loadingError" type="danger" icon="error">{{ loadingError }}</v-notice>
      <div v-else-if="loading" style="display: flex; justify-content: center; padding: 25px;">
        <v-progress-circular indeterminate />
      </div>
      <slot v-else></slot>
    </div>
  </private-view>
</template>

<script setup>
  import { ref, onMounted } from 'vue';
  import useLists from '../composables/useLists.js';
  import useMessages from '../composables/useMessages.js';
  const { setupLists } = useLists(); 
  const { setupMessages } = useMessages();

  const props = defineProps({
    title: String,
    icon: String, 
  });

  const loading = ref(false);
  const loadingError = ref();
  onMounted(async () => {
    loading.value = true;
    loadingError.value = undefined;
    const { error:errorLists } = await setupLists();
    const { error:errorMessages } = await setupMessages();
    loading.value = false;
    loadingError.value = errorLists || errorMessages;
  });

</script>

<style>
  .mailing-lists-container {
    padding: 15px;
  }
</style>