import { useApi } from '@directus/extensions-sdk';
import useCollection from './useCollection';

// Collection storing lists
const COLLECTION_NAME = 'extension_mailing_lists';
const COLLECTION_VERSION = '4';
const COLLECTION_FIELDS = [
  {
    "field": "id",
    "type": "integer",
    "meta": {
      "hidden": true,
      "interface": "input",
      "readonly": true
    },
    "schema": {
      "is_primary_key": true,
      "has_auto_increment": true
    }
  },
  {
    "field": "list_name",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {
      "is_unique": true
    }
  },
  {
    "field": "collection_name",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  },
  {
    "field": "fields",
    "type": "json",
    "meta": {},
    "schema": {}
  },
  {
    "field": "filter",
    "type": "json",
    "meta": {},
    "schema": {}
  },
  {
    "field": "email_field",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  },
  {
    "field": "default_template",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  },
  {
    "field": "default_body_prop",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  },
  {
    "field": "default_reply_to",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  }
];

export default () => {
  const { createCollection } = useCollection()
  const api = useApi();

  /**
   * Lists Collection Setup
   * - check if the lists collection exists
   * - create the collection if missing or out-of-date
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   */
  const setupLists = async () => {
    try {
      const { error } = await createCollection(COLLECTION_NAME, COLLECTION_VERSION, COLLECTION_FIELDS);
      if ( error ) return { error };
    }
    catch (err) {
      return { error: `Could not setup the lists collection [${err}]` };
    }
    return {};
  }

  /**
   * Get the Existing Mailing Lists
   * - optionally get a specific list by name or id
   * @param {Object} [params]
   * @param {String} [param.name] List Name
   * @param {Integer} [param.id] List Id  
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {Object|Object[]} rtn.data - Lists (or one list, if filtered)
   */
  const getLists = async ({ name:list_name, id:list_id } = {}) => {
    try {

      // Get the lists
      const filter = {};
      if ( list_name )  filter.list_name = { '_eq': list_name };
      if ( list_id ) filter.id = { '_eq': list_id };
      const resp = await api.get(`/items/${COLLECTION_NAME}`, { params: { filter } } );
      const lists = resp?.data?.data || [];

      // Get the item count for each list
      for ( let i = 0; i < lists.length; i++ ) {
        const { error, data } = await getListItems(lists[i].list_name, lists[i].collection_name, lists[i].fields, lists[i].email_field, lists[i].filter);
        if ( error ) return { error };

        const items = data && Array.isArray(data) ? data : [];
        lists[i].count = items.length;
        lists[i].items = items;
      }

      return { data: list_name || list_id ? lists[0] : lists }
    }
    catch (err) {
      console.log(err);
      return { error: err?.message || err }
    }
  }

  /**
   * Remove the specified Mailing List, by ID
   * @param {Integer} list_id List ID
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   */
  const removeList = async (list_id) => {
    try {
      await api.delete(`/items/${COLLECTION_NAME}/${list_id}`);
    }
    catch (err) {
      return { error: err?.message || err }
    }
  }

  /**
   * Verify the mailing list arguments
   * - make sure required arguments are set
   * - make sure fields is an array with at least 1 item
   * - make sure filter can be parsed into an object
   * @param {String} list_name List Name
   * @param {String} collection_name Collection Name
   * @param {String[]} fields List of field values
   * @param {String} email_field Field containing email address
   * @param {String} filter JSON String of Filter Object
   * @returns {String} error message, if there is a problem with one of the arguments
   */
  const checkListArguments = (list_name, collection_name, fields, email_field, filter) => {
    if ( !list_name || list_name === '' ) {
      return "List Name is required";
    }
    if ( !collection_name || collection_name === '' ) {
      return "Collection Name is required";
    }
    if ( !fields || !Array.isArray(fields) || fields.length === 0 ) {
      return "One more fields are required";
    }
    if ( !email_field || email_field === '' ) {
      return "Email Field is required";
    }
    if ( !filter || filter === '' ) {
      filter = {};
    }

    try {
      if ( !Array.isArray(fields) ) throw new Error('Not an array');
      if ( fields.length < 1 ) throw new Error('Must have at least one item.');
    }
    catch (err) {
      return `Could not parse fields.  This must be an array of field names to include. [${err}]`;
    }

    try {
      filter = typeof filter === 'string' || filter instanceof String ? JSON.parse(filter) : filter;
      if ( typeof filter !== 'object' || filter === null || Array.isArray(filter) ) throw new Error('Not an object');
    }
    catch (err) {
      return `Could not parse filter.  This must be an object of filter criteria. [${err}]`;
    }
  }

  /**
   * Create a new Mailing List
   * - check the list arguments (fields must be parsed to array, filter must be parsed to object)
   * - add an item to the extension lists collection
   * @param {String} list_name List Name
   * @param {String} collection_name Collection Name
   * @param {String[]} fields List of field values
   * @param {String} email_field Field containing email address
   * @param {String} filter JSON String of Filter Object
   * @param {String} default_template Name of default email template
   * @param {String} default_body_prop Name of default data prop for body content
   * @param {String} default_reply_to Default Reply-To email address
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {Object[]} rtn.data - New List Properties
   */
  const createList = async (list_name, collection_name, fields, email_field, filter, default_template, default_body_prop, default_reply_to) => {
    try {

      // Test List Arguments
      const check = checkListArguments(list_name, collection_name, fields, email_field, filter);
      if ( check ) return { error: check };

      // Create item in collection
      const data = {
        list_name,
        collection_name,
        fields,
        email_field,
        filter: filter ? JSON.parse(filter) : {},
        default_template,
        default_body_prop,
        default_reply_to
      }
      const resp = await api.post(`/items/${COLLECTION_NAME}`, data);
      return resp?.data?.data ? { data: resp?.data?.data } : { error: "Could not create list" };

    }
    catch (err) {
      return { error: err?.message || err }
    }
  }

  /**
   * Update an existing Mailing List
   * - check the list arguments (fields must be parsed to array, filter must be parsed to object)
   * - update the item in the extension lists collection
   * @param {Integer} list_id 
   * @param {String} list_name List Name
   * @param {String} collection_name Collection Name
   * @param {String[]} fields List of field values
   * @param {String} email_field Field containing email address
   * @param {String} filter JSON String of Filter Object
   * @param {String} default_template Name of default email template
   * @param {String} default_body_prop Name of default data prop for body content
   * @param {String} default_reply_to Default Reply-To email address
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {Object[]} rtn.data - Updated List Properties
   */
  const editList = async (list_id, { list_name, collection_name, fields, email_field, filter, default_template, default_body_prop, default_reply_to }) => {
    try {

      // Test List Arguments
      const check = checkListArguments(list_name, collection_name, fields, email_field, filter);
      if ( check ) return { error: check };

      // Edit item in collection
      const data = {
        list_name,
        collection_name,
        fields,
        email_field,
        filter: filter ? JSON.parse(filter) : undefined,
        default_template,
        default_body_prop,
        default_reply_to
      }
      const resp = await api.patch(`/items/${COLLECTION_NAME}/${list_id}`, data);
      return resp?.data?.data ? { data: resp?.data?.data } : { error: "Could not edit list" };

    }
    catch (err) {
      return { error: err?.message || err }
    }
  }

  /**
   * Get List Items
   * - check the list arguments
   * - make a query on the collection with the specified fields, filter, and limit
   * @param {String} list_name List Name
   * @param {String} collection_name Collection Name
   * @param {String[]} fields List of field values
   * @param {String} email_field Field containing email address
   * @param {String} filter JSON String of Filter Object
   * @param {Integer} [limit] Maximum number of items to return 
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {Object[]} rtn.data - Matching data items
   */
  const getListItems = async (list_name, collection_name, fields, email_field, filter, limit=null) => {
    try {

      // Test List Arguments
      const check = checkListArguments(list_name, collection_name, fields, email_field, filter);
      if ( check ) return { error: check };

      // Get Items
      const params = {
        fields: fields || [],
        filter: filter || {},
        limit: limit
      }
      const resp = await api.get(`/items/${collection_name}`, { params });
      return { data: resp?.data?.data || [] };

    }
    catch (err) {
      return { error: err?.message || err };
    }
  }

  return { setupLists, getLists, removeList, createList, editList, getListItems }
}