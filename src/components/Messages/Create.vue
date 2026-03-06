<template>
  <VDivider class="divider" large :inline-title="false">
    <template #icon><VIcon name="add_box" /></template>
    {{ editedMessage ? 'Edit Existing' : 'Create New' }} Message
  </VDivider>

  <VProgressCircular v-if="loading" indeterminate />
  <div v-else>

    <div class="section" v-if="editedMessage">
      <VNotice type="info">
        <p style="font-size: 105%; margin: 15px 0">Editing the Existing Message: <strong>{{ editedMessage.name }}</strong></p>
        <VButton @click="() => { editedMessage = undefined; list_id = undefined }" small outline>Cancel</VButton>
      </VNotice>
    </div>

    <div style="display: flex; flex-wrap: wrap; justify-content: space-around; gap: 15px">
      <VSheet class="section">
        <div class="field-group">
          <div class="field-label">
            Mailing List
          </div>
          <VFancySelect v-if="lists && lists.length > 0" v-model="list_id" :items="lists.map((e) => ({ icon: 'people', value: e.id, 'text': e.list_name }))" />
          <VNotice v-else type="danger" icon="error">You must create a Mailing List first.  Go to the <strong>Lists</strong> panel to create a new mailing list.</VNotice>
          <small class="type-note">
            <p>The mailing list to send this message to</p>
          </small>
        </div>

        <div class="field-group">
          <div class="field-label">
            Message Name
          </div>
          <VInput v-model="message_name" />
          <small class="type-note">
            <p>A unique name for this message (this is not sent to the recipients)</p>
          </small>
        </div>

        <div style="display: flex; gap: 10px">
          <div class="field-group">
            <div class="field-label">
              Template
            </div>
            <VInput v-model="template" />
            <small class="type-note">
              <p>The email template to use for this message</p>
            </small>
          </div>

          <div class="field-group">
            <div class="field-label">
              Body Data Prop
            </div>
            <VInput v-model="body_prop" />
            <small class="type-note">
              <p>The data property to add the message body/content to.</p>
            </small>
          </div>
        </div>
      </VSheet>

      <VSheet class="section">
        <div class="field-group">
          <div class="field-label">
            Reply To
          </div>
          <VInput v-model="reply_to" />
          <small class="type-note">
            <p>The email address that will be used if the recipient replies to your message (defaults to the sender's email)</p>
          </small>
        </div>

        <div class="field-group">
          <div class="field-label">
            Subject
          </div>
          <VInput v-model="subject" />
          <small class="type-note">
            <p>The subject line of the message</p>
          </small>
        </div>

        <div class="field-group">
          <div class="field-label">
            Body
          </div>
          <VTextarea v-model="body" @blur="onUpdateBody" placeholder='Hi {{ name }},&#10;&#10;This is the body of the message.' />
          <small class="type-note">
            <p>The content of the message.  Use curly brackets to include field values that will be replaced for each recipient, such as <code v-pre>{{ name }}</code>.</p>
          </small>
        </div>

        <div class="field-group">
          <div style="display: flex; justify-content: space-between;">
            <VButton v-if="editedMessage" @click="edit" :disabled="updating">Update</VButton>
            <VButton v-else @click="create" :disabled="updating">Save</VButton>
            <VButton @click="() => send()" warning :disabled="updating">Send</VButton>
          </div>
        </div>

        <VDivider />

        <div class="field-group">
          <div class="field-label">Test Message</div>
          <small class="type-note">Send a test message to yourself to preview the final message.</small>
          <div style="display: flex; justify-content: space-between; gap: 15px">
            <VInput v-model="test_email" />
            <VButton @click="() => sendTest()" warning :disabled="updating">Send Test</VButton>
          </div>
        </div>
      </VSheet>
    </div>

    <div class="section">
      <VNotice v-if="errorMessage" type="danger" icon="error">{{ errorMessage }}</VNotice>
      <VNotice v-else-if="successMessage" type="success">{{ successMessage }}</VNotice>
      <VNotice v-else-if="sendPercentage && sendPercentage > 0" type="success" icon="outbox">
        <VProgressLinear style="width: 100%" :value="sendPercentage" rounded />
        Sending Messages...
      </VNotice>
    </div>

  </div>
</template>

<script setup>
  import { ref, watch, onMounted } from 'vue';
  import useLists from '../../composables/useLists.js';
  import useMessages from '../../composables/useMessages.js';
  import useUser from '../../composables/useUser.js';
  const { getLists } = useLists();
  const { getMessages, createMessage, editMessage, sendMessage } = useMessages();
  const { getUser } = useUser();

  const props = defineProps({ editedMessage: Object });
  watch(() => props.editedMessage, (m) => {
    if ( m ) load(m.name)
  });

  const emit = defineEmits(['updateMessages']);
  const onUpdateMessages = (m) => emit('updateMessages', m);

  // Initial new message data
  const list_id = ref();
  const message_name = ref();
  const reply_to = ref();
  const subject = ref();
  const body = ref();
  const template = ref("base");
  const body_prop = ref("html");
  
  // Set test email address from user
  const test_email = ref();

  // Message data watchers
  watch(list_id, (l) => {
    selected_list.value = l ? lists.value?.filter((e) => e.id === l)[0] : undefined;
    if ( !props.editedMessage ) template.value = selected_list.value?.default_template || 'base';
    if ( !props.editedMessage ) body_prop.value = selected_list.value?.default_body_prop || 'html';
  });

  // Load Lists
  const loading = ref(false);
  const lists = ref([]);
  const selected_list = ref();
  const updateLists = async () => {
    loading.value = true;
    errorMessage.value = undefined;
    const { error, data } = await getLists();
    loading.value = false;
    errorMessage.value = error;
    lists.value = data;
  }

  // Message update props
  const updating = ref(false);
  const errorMessage = ref();
  const successMessage = ref();
  const sendPercentage = ref(0);

  // Load message by name
  const load = async (messageName) => {
    const { data } = await getMessages({ name: messageName });
    if ( data ) {
      list_id.value = data.list_id;
      message_name.value = data.message_name;
      reply_to.value = data.reply_to;
      subject.value = data.subject;
      body.value = data.body;
      template.value = data.template;
      body_prop.value = data.body_prop;
    }
  }

  // Create new message
  const create = async () => {
    updating.value = true;
    errorMessage.value = undefined;
    successMessage.value = undefined;
    sendPercentage.value = 0;
    const { error, data } = await createMessage({
      list_id: list_id.value,
      message_name: message_name.value,
      reply_to: reply_to.value,
      subject: subject.value,
      body: body.value,
      template: template.value,
      body_prop: body_prop.value
    });
    updating.value = false;
    errorMessage.value = error;
    successMessage.value = `${data.message_name} created!`;
    onUpdateMessages({ id: data.id, name: data.message_name });
  }

  // Edit existing message
  const edit = async () => {
    updating.value = true;
    errorMessage.value = undefined;
    successMessage.value = undefined;
    sendPercentage.value = 0;
    const { error, data } = await editMessage(props.editedMessage.id, {
      list_id: list_id.value,
      message_name: message_name.value,
      reply_to: reply_to.value,
      subject: subject.value,
      body: body.value,
      template: template.value,
      body_prop: body_prop.value
    });
    updating.value = false;
    errorMessage.value = error;
    successMessage.value = `${data.message_name} updated!`;
    onUpdateMessages({ id: data.id, name: data.message_name });
  }

  // Send Message
  const onSendMessage = (status, count, total) => {
    console.log(`${status} [${count}/${total}]`);
    sendPercentage.value = (count/total)*100;
  }
  const send = async (test=false) => {
    if ( !!test || confirm("Are you sure you want to send this message now?") ) {
      updating.value = true;
      errorMessage.value = undefined;
      successMessage.value = undefined;
      sendPercentage.value = 0;
      const { error, message } = await sendMessage({
        message_id: props.editedMessage?.id,
        list_id: list_id.value,
        message_name: message_name.value,
        test_email: test ? test_email.value : undefined,
        reply_to: reply_to.value,
        subject: subject.value,
        body: body.value,
        template: template.value,
        body_prop: body_prop.value,
        updateCallback: onUpdateMessages,
        sendCallback: onSendMessage
      });
      updating.value = false;
      errorMessage.value = error;
      successMessage.value = !error ? 'Messages Sent!' : undefined;
      onUpdateMessages({ id: message.id, name: message.name });
    }
  }
  const sendTest = async () => {
    await send(true);
  }

  onMounted(async () => {
    await updateLists();
    const { data:user } = await getUser();
    test_email.value = user?.email;
  });
</script>

<style scoped>
  .section {
    margin: 25px auto;
    max-width: 500px;
  }
  .field-group {
    max-width: 800px;
    margin: 15px 25px;
  }
  .field-label {
    font-size: 16px;
    font-weight: bold;
  }
</style>