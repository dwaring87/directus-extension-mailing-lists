<template>
  <VDivider class="divider" style="margin-top: 50px" large :inline-title="false">
    <template #icon><VIcon name="playlist_add" /></template>
    {{ editedList ? 'Edit Existing' : 'Create New' }} List
  </VDivider>

  <div style="display: flex; flex-wrap: wrap; justify-content: space-around; gap: 15px">

    <div class="section">
      <div v-if="editedList">
        <VNotice type="info">
          <p style="font-size: 105%; margin: 15px 0">Editing the Existing List: <strong>{{ editedList.name }}</strong></p>
          <VButton @click="() => editedList = undefined" small outline>Cancel</VButton>
        </VNotice>
      </div>

      <VSheet style="margin: 15px 0">
        <div class="field-group">
          <div class="field-label">
            Mailing List Name
          </div>
          <VInput v-model="list_name" />
          <small class="type-note">
            <p>A name for this mailing list</p>
          </small>
        </div>

        <div class="field-group">
          <div class="field-label">
            Collection Name
          </div>
          <VSelect v-model="collection_name" :items="collections.map((e) => ({ text: e.collection, value: e.collection, collection: e }))" />
          <small class="type-note">
            <p>The name of the existing collection where the emails are stored</p>
          </small>
        </div>

        <div class="field-group">
          <div class="field-label">
            Fields
          </div>
          <VCheckboxTree v-if="collection_name" class="boxed" v-model="fields" :choices="available_fields" />
          <p class="boxed" v-else>Select a collection first...</p>
          <small class="type-note">
            <p>These are the fields from the collection to include when creating a message.  It must include the email, specified by the email field property below. Any additional fields can be used as variables in the message (such as the recipient's name).</p>
          </small>
        </div>

        <div class="field-group">
          <div class="field-label">
            Email Field
          </div>
          <VSelect v-model="email_field" :items="fields" />
          <small class="type-note">
            <p>This is the name of the field in the collection that is used to store the email address.  It must be included in the fields selection above.</p>
          </small>
        </div>

        <div class="field-group">
          <div class="field-label">
            Filter (JSON Object)
          </div>
          <VTextarea v-model="filter" @blur="() => filter = formatJSON(filter, 'filter')" style="font-family: monospace"></VTextarea>
          <small class="type-note">
            <p>The filter to apply to the collection when getting items for the list.  When empty, all items will be returned.</p>
          </small>
        </div>

        <VDivider />

        <div style="display: flex; gap: 10px">
          <div class="field-group">
            <div class="field-label">
              Default Template
            </div>
            <VInput v-model="default_template" />
            <small class="type-note">
              <p>The default email template to use for this list.  This can be changed for each message.</p>
            </small>
          </div>

          <div class="field-group">
            <div class="field-label">
              Default Body Data Prop
            </div>
            <VInput v-model="default_body_prop" />
            <small class="type-note">
              <p>The default data property to add the message body/content to.  This can be changed for each message.</p>
            </small>
          </div>
        </div>

        <div class="field-group">
          <div class="field-label">
            Default Reply-To
          </div>
          <VInput v-model="default_reply_to" />
          <small class="type-note">
            <p>The default email address to set as the Reply-To address.  This can be changed for each message.</p>
          </small>
        </div>

        <VDivider />

        <p class="field-group">You can optionally specify an additional <code>GET</code> request to add additional properties to the message template.  This query is made once when sending the message and it's results are added to the <code>_additional_props</code> key to each recipient's data.</p>

        <div class="field-group">
          <div class="field-label">
            Additinal Properties Query URL
          </div>
          <VInput v-model="additional_props_url" />
          <small class="type-note">
            <p>The URL to request for additional data properties.  This can be an absolute or relative URL.</p>
          </small>
        </div>

        <div class="field-group">
          <div style="display: flex; justify-content: space-between;">
            <VButton v-if="editedList" @click="edit" :disabled="creating">Update</VButton>
            <VButton v-else @click="create" :disabled="creating">Create</VButton>
            <VButton @click="test" :disabled="testing || creating" secondary>Test</VButton>
          </div>
        </div>
      </VSheet>

      <VNotice v-if="creatingError" type="danger" icon="error">{{ creatingError }}</VNotice>
      <VNotice v-else-if="creatingSuccess" type="success">Mailing List <strong>{{ creatingSuccess }}</strong> created</VNotice>
      <VNotice v-else-if="editingSuccess" type="success">Mailing List <strong>{{ editingSuccess }}</strong> updated</VNotice>
    </div>

    <div class="section">
      <div class="field-group" style="min-width: 400px; padding: 25px;">
        
        <VInfo v-if="testingError" title="Test Error" icon="error">
          {{ testingError }}
        </VInfo>

        <VInfo v-else-if="!testingResults" title="Test Results" icon="task_alt">
          Once you have the new Mailing List settings set, click the <strong>Test</strong> button to check the query.
        </VInfo>

        <VInfo v-else-if="testingResults && testingResults.length === 0" title="No Matching Items" icon="warning">
          The query did not return any items.
        </VInfo>

        <div v-else>
          <p><strong>Matching Items:</strong></p>
          <ul>
            <li v-for="(item, index) in testingResults" style="margin-top: 15px">
              <VBadge value="!" :disabled="!!item[email_field] || item[email_field] !== ''">
                <VChip clickable @click="toggleTestingResults(index)">
                  <span v-if="!!item[email_field] || item[email_field !== '']"><strong>{{ item[email_field] }}</strong></span>
                  <span v-else><em>Missing email</em></span>
                </VChip>
              </VBadge>
              <ul v-if="testingResultsVisible.includes(index)">
                <li v-for="key in Object.keys(item)"><strong>{{ key }}:</strong> {{ item[key] }}</li>
              </ul>
              <p v-if="index === (limit-1)" style="margin-top: 15px"><em>Max number of items displayed</em></p>
            </li>
          </ul>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
  import { ref, watch, computed } from 'vue';
  import { formatJSON, flattenObject } from '../../composables/useJSON.js';
  import useCollection from '../../composables/useCollection.js';
  import useLists from '../../composables/useLists.js';
  const { getCollections, getFields } = useCollection();
  const { getLists, createList, editList, getListItems } = useLists();

  const props = defineProps({ editedList: Object });
  watch(() => props.editedList, (l) => {
    if ( l ) load(l.name)
  });

  const emit = defineEmits([ 'updatedLists' ]);
  const updatedLists = () => emit('updatedLists', new Date().getTime());

  // Available selections
  const collections = ref(getCollections());
  const available_fields = computed(() => getFields(collection_name.value));

  // Initial new list data
  const list_name = ref();
  const collection_name = ref();
  const fields = ref([]);
  const email_field = ref();
  const filter = ref(formatJSON('{ "email": { "_nempty": true }}'));
  const default_template = ref("base");
  const default_body_prop = ref("html");
  const default_reply_to = ref();
  const additional_props_url = ref();
  const limit = 50;
  watch(collection_name, () => {
    fields.value = [];
    email_field.value = undefined;
  });

  const load = async (listName) => {
    const { data } = await getLists({ name: listName });
    if ( data ) {
      list_name.value = data.list_name;
      collection_name.value = data.collection_name;

      // prevent the collection_name watcher from clearing the fields
      setTimeout(() => {
        fields.value = data.fields;
        email_field.value = data.email_field;
        filter.value = formatJSON(data.filter, 'filter');
        default_template.value = data.default_template;
        default_body_prop.value = data.default_body_prop;
        default_reply_to.value = data.default_reply_to;
        additional_props_url.value = data.additional_props_url;
      }, 0);
    }
  }

  const creating = ref(false);
  const creatingError = ref();
  const creatingSuccess = ref();
  const create = async () => {
    creating.value = true;
    creatingError.value = undefined;
    const { error, data } = await createList(list_name.value, collection_name.value, fields.value, email_field.value, filter.value, default_template.value, default_body_prop.value, default_reply_to.value, additional_props_url.value);
    creating.value = false;
    creatingError.value = error;
    creatingSuccess.value = data.list_name;
    updatedLists();
  }

  const editingSuccess = ref();
  const edit = async () => {
    creating.value = true;
    creatingError.value = undefined;
    const { error, data } = await editList(props.editedList.id, {
      list_name: list_name.value,
      collection_name: collection_name.value,
      fields: fields.value,
      email_field: email_field.value,
      filter: filter.value,
      default_template: default_template.value,
      default_body_prop: default_body_prop.value,
      default_reply_to: default_reply_to.value,
      additional_props_url: additional_props_url.value
    });
    creating.value = false;
    creatingError.value = error;
    editingSuccess.value = data.list_name;
    updatedLists();
  }

  const testing = ref(false);
  const testingResults = ref();
  const testingError = ref();
  const testingResultsVisible = ref([]);
  const test = async () => {
    testing.value = true;
    testingError.value = undefined;
    testingResults.value = undefined;
    const { error, data } = await getListItems(list_name.value, collection_name.value, fields.value, email_field.value, filter.value, additional_props_url.value, limit);
    testing.value = false;
    testingError.value = error;
    testingResults.value = data.map((e) => flattenObject(e));
  }
  const toggleTestingResults = (index) => {
    if ( testingResultsVisible.value.includes(index) ) {
      testingResultsVisible.value = testingResultsVisible.value.filter((e) => e !== index);
    }
    else {
      testingResultsVisible.value.push(index);
    }
  }
</script>

<style scoped>
  .section {
    margin-top: 25px;
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
  .boxed {
    padding: 15px;
    background-color: var(--theme--background);
    border: var(--theme--border-width) solid var(--v-input-border-color, var(--theme--form--field--input--border-color));
    border-radius: var(--v-input-border-radius, var(--theme--border-radius));
    box-shadow: var(--theme--form--field--input--box-shadow);
    padding: var(--theme--form--field--input--padding);
    max-height: 250px;
  }
</style>