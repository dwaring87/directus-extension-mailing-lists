<template>
  <VProgressCircular v-if="loading" style="margin: 0 auto" indeterminate />
  <VNotice v-else-if="messagesError" type="danger" icon="error">{{ messagesError }}</VNotice>
  <VInfo v-else-if="!messages || messages.length === 0" title="No Messages" icon="mail_off">
    <p>You don't have any messages saved.</p>
    <br />
    <p>A message is an email sent to each recipient defined in the mailing list.</p>
    <br />
    <p>Create your first message below.</p>
  </VInfo>

  <VTable v-else show-resize
    v-model:headers="tableHeaders"
    :items="messages"
    @click:row="edit"
  >
    <template #item.message_name="{ item }">
      <div style="display: flex; gap: 5px">
        <VIcon v-if="item.status === MESSAGE_STATUS_CODES.draft" name="edit" />
        <VIcon v-else-if="item.status === MESSAGE_STATUS_CODES.active" name="hourglass_bottom" />
        <VIcon v-else-if="item.status === MESSAGE_STATUS_CODES.sent" name="mark_email_read" />
        <VIcon v-else-if="item.status === MESSAGE_STATUS_CODES.previewed" name="preview" />
        <span>{{ item.message_name }}</span>
      </div>
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
  import useMessages from '../../composables/useMessages';
  import useMessageStatusCodes from '../../composables/useMessageStatusCodes';
  const { getMessages, removeMessage } = useMessages();
  const MESSAGE_STATUS_CODES= useMessageStatusCodes();

  const emits = defineEmits([ 'editedMessage' ]);
  const props = defineProps({ updatedMessages: String });
  watch(() => props.updatedMessages, () => update());

  const tableHeaders = ref([
    {
      text: 'Message',
      value: 'message_name',
    },
    {
      text: 'List',
      value: 'list_name',
    },
    {
      text: 'Reply To',
      value: 'reply_to',
    },
    {
      text: 'Subject',
      value: 'subject',
    },
    {
      text: 'Body',
      value: 'body'
    }
  ]);

  const loading = ref(false);
  const messages = ref([]);
  const messagesError = ref();
  const update = async () => {
    loading.value = true;
    const { error, data } = await getMessages();
    loading.value = false;
    messagesError.value = error;
    messages.value = data;
  }

  const edit = ({ item: message }) => {
    emits('editedMessage', { name: message.message_name, id: message.id });
  }

  const remove = async ({ item: message }) => {
    if ( confirm("Are you sure you want to delete the message named " + message.message_name + "?") ) {
      await removeMessage(message.id);
      update();
    }
  }

  onMounted(() => {
    update();
  });
</script>