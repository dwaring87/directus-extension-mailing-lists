<template>
  <VProgressCircular v-if="loading" style="margin: 0 auto" indeterminate />
  <VNotice v-else-if="listsError" type="danger" icon="error">{{ listsError }}</VNotice>
  <VInfo v-else-if="!lists || lists.length === 0" title="No Mailing Lists" icon="group_off">
    <p>You don't have any mailing lists saved.</p>
    <br />
    <p>A mailing list is a stored database query (with optional filters) that returns the email 
      addresses to use along with additional properties that can be included in the message.</p>
    <br />
    <p>Create your first mailing list below.</p>
  </VInfo>

  <VTable v-else show-resize
    v-model:headers="tableHeaders"
    :items="lists"
    @click:row="edit"
  >
    <template #item.fields="{ item }">
      <div style="display: flex; flex-wrap: no-wrap; gap: 5px; overflow: scroll">
        <VChip v-for="field in item.fields">{{ field }}</VChip>
      </div>
    </template>
    <template #item.email_field="{ item }">
      <VChip>{{ item.email_field }}</VChip>
    </template>
    <template #item-append="{ item }">
      <div style="display: flex; flex-direction: row; gap: 15px; justify-content: center; justify-items: center;">
        <VButton @click="edit({ item })" outlined small icon>
          <VIcon name="edit" />
        </VButton>
        <VButton @click="() => remove({ item })" outlined small danger icon>
          <VIcon name="delete" />
        </VButton>
      </div>
    </template>
  </VTable>
</template>

<script setup>
  import { ref, watch, onMounted } from 'vue';
  import useLists from '../../composables/useLists';
  const { getLists, removeList } = useLists();

  const emits = defineEmits([ 'editedList' ]);
  const props = defineProps({ updatedLists: String });
  watch(() => props.updatedLists, () => update());

  const tableHeaders = ref([
    {
      text: 'List',
      value: 'list_name',
    },
    {
      text: 'Collection',
      value: 'collection_name',
    },
    {
      text: 'Fields',
      value: 'fields',
    },
    {
      text: 'Email Field',
      value: 'email_field',
    },
    {
      text: 'Filter',
      value: 'filter',
    },
    {
      text: 'Recipients',
      value: 'count'
    }
  ]);

  const loading = ref(false);
  const lists = ref([]);
  const listsError = ref();
  const update = async () => {
    loading.value = true;
    const { error, data } = await getLists();
    loading.value = false;
    listsError.value = error;
    lists.value = data;
  }

  const edit = ({ item: list }) => {
    emits('editedList', { name: list.list_name, id: list.id });
  }

  const remove = async ({ item: list }) => {
    if ( confirm("Are you sure you want to delete the mailing list named " + list.list_name + "?") ) {
      await removeList(list.id);
      update();
    }
  }

  onMounted(() => {
    update();
  });
</script>