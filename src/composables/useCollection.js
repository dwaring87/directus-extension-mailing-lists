 import { useStores } from '@directus/extensions-sdk';

 export default () => {
  const { useFieldsStore, useCollectionsStore, usePermissionsStore } = useStores();
  const fieldsStore = useFieldsStore();
  const collectionsStore = useCollectionsStore();
  const permissionsStore = usePermissionsStore(); 
  
  /**
   * Create a collection for managing extension data
   * - check for existing collection by name and version
   * - check for create permissions for the collection
   * - create the collection if not found or different version
   * @param {String} name Collection name
   * @param {String} version Current desired collection version
   * @param {Object[]} fields Fields for the collection 
   * @returns {Promise<Object>} resp
   * @returns {String} resp.error - An error message, if encountered
   * @returns {Boolean} resp.data.check - Boolean set to true if collection is created and/or exists
   * @returns {String} resp.data.version - Current version of the collection
   */
  const createCollection = async (name, version, fields) => {
    try {

      // Check for existing collection and version
      const { error:error1, check:check1, version:version1 } = checkCollection(name, 'create');
      if ( error1 ) return { error: error1 };

      // Create the collection if not found or update it if older version
      if ( !check1 || version1 !== version ) {

        // Create or update the collection
        await collectionsStore.upsertCollection(name, {
          "collection": name,
          "fields": fields,
          "schema": {},
          "meta": {
            "note": `Collection for the mailing lists extension|${version}`,
            "hidden": true,
            "singleton": false
          }
        });

        // Check again to see if creation worked
        const { error:error2, check:check2, version:version2 } = checkCollection(name, 'create');
        if ( error2 ) return { error: error2 };
        if ( !check2 || version2 !== version ) {
          return { error: `Failed to create ${name} collection needed for this extension` };
        }

        return { data: { check: !!check2, version: version2 } };
      }
      else {
        return { data: { check: !!check1, version: version1 } };
      }
    }
    catch (err) {
      return { error: `Could not create ${name} collection [${err}]` };
    }
  }

  /**
   * Check the existence and user's permissions on a collection
   * - check if the collection exists for the specified name
   * - check if the user has the specified permissions (read, create, etc)
   * - get the collection version (number stored in the collection note, after a | character)
   * @param {string} name Collection name 
   * @param {string} [permission] Desired user's permission (default: read) 
   * @returns {Object} resp
   * @returns {String} resp.error - An error message, if encountered
   * @returns {Boolean} resp.check - True if the collection exists
   * @returns {String} resp.version - Version of the current collection
   */
  const checkCollection = (name, permission='read') => {
    const check = collectionsStore.getCollection(name);
    if ( !permissionsStore.hasPermission(name, permission) ) return { error: `You do not have ${permission} permissions on collection [${name}]` };
    return {
      check: check?.collection === name,
      version: (check?.meta?.note?.split('|') || [])[1]
    }
  }

  /**
   * Get all of the available collections
   * @returns {Object[]} List of all of the collections
   */
  const getCollections = () => {
    return collectionsStore.collections;
  }

  /**
   * Get all of the (nested, up to 3 levels deep) of the fields for the specified collection
   * - Get all of the direct fields for the specified location
   * - If a field is linked to a foreign table, get all of those fields as well, up to 3 levels deep
   * @param {String} collection_name Collection name
   * @param {String[]} parent_text Texts of collection parents (initially empty)
   * @param {String[]} parent_value Values of collection parents (initially empty)
   * @returns {Object[]}
   * @returns {string} [].text - human-readable name of field
   * @returns {string} [].long - nested path, using names and delimited by ' > '
   * @returns {string} [].value - nested path, using values and delimited by '.'
   * @returns {Object[]} [].children - descendent related fields
   */
  const getFields = (collection_name, parent_text = [], parent_value = []) => {
    if ( parent_text.length > 2 ) return [];
    const fields = fieldsStore.getFieldsForCollection(collection_name);

    const rtn = [];
    fields.forEach((f) => {
      const text = f.name;
      const long = parent_text.length > 0 ? `${parent_text.join(' > ')} > ${f.name}` : f.name;
      const value = parent_value.length > 0 ? `${parent_value.join('.')}.${f.field}` : f.field;
      let children = [];
      if ( f.schema?.foreign_key_table ) {
        children = getFields(f.schema.foreign_key_table, [ ...parent_text, text ], [ ...parent_value, value ]);
      }
      rtn.push({ text, long, value, children });
    })

    return rtn;
  }

  return { createCollection, getCollections, getFields }
}