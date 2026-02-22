import { useApi } from '@directus/extensions-sdk';
import useCollection from './useCollection';
import useFlow from './useFlow';
import useLists from './useLists';
import useMessageStatusCodes from './useMessageStatusCodes';

// Collection for storing messages
const COLLECTION_NAME = 'extension_mailing_list_messages';
const COLLECTION_VERSION = '3';
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
    "field": "status",
    "type": "string",
    "meta": {
      "interface": "input"
    },
    "schema": {}
  },
  {
    "field": "list_id",
    "type": "integer",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  },
  {
    "field": "message_name",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {
      "is_unique": true
    }
  },
  {
    "field": "reply_to",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  },
  {
    "field": "subject",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  },
  {
    "field": "body",
    "type": "text",
    "meta": {
      "interface": "input-multiline",
    },
    "schema": {}
  },
  {
    "field": "template",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  },
  {
    "field": "body_prop",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  },
  {
    "field": "items",
    "type": "json",
    "meta": {},
    "schema": {}
  },
  {
    "field": "flow_id",
    "type": "string",
    "meta": {
      "interface": "input",
    },
    "schema": {}
  }
];

export default () => {
  const { createCollection } = useCollection();
  const { createFlow, updateOperation, triggerFlow, deactivateFlow } = useFlow();
  const { getLists } = useLists();
  const MESSAGE_STATUS_CODES= useMessageStatusCodes();
  const api = useApi();

  /**
   * Messages Collection Setup
   * - check if the messages collection exists
   * - create the collection if missing or out-of-date
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   */
  const setupMessages = async () => {
    try {
      const { error } = await createCollection(COLLECTION_NAME, COLLECTION_VERSION, COLLECTION_FIELDS);
      if ( error ) return { error };
    }
    catch (err) {
      return { error: `Could not setup the messages collection [${err}]` };
    }
    return {};
  }

  /**
   * Get the Existing Messages
   * - optionally get a specific message by name or id
   * @param {Object} [params]
   * @param {String} [param.name] Message Name
   * @param {Integer} [param.id] Message Id  
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {Object|Object[]} rtn.data - Messages (or one message, if filtered)
   */
  const getMessages = async ({ name:message_name, id:message_id } = {}) => {
    try {
      const filter = {};
      if ( message_name )  filter.message_name = { '_eq': message_name };
      if ( message_id ) filter.id = { '_eq': message_id };
      const resp = await api.get(`/items/${COLLECTION_NAME}`);
      const messages = resp?.data?.data || [];

      // Add the list name to each message
      for ( let i = 0; i < messages.length; i++ ) {
        const { data:list } = await getLists({ id: messages[i].list_id });
        messages[i].list_name = list.list_name;
      }

      return { data: message_name || message_id ? messages[0] : messages }
    }
    catch (err) {
      return { error: err?.message || err }
    }
  }

  /**
   * Remove the specified Message, by ID
   * @param {Integer} message_id List ID
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   */
  const removeMessage = async (message_id) => {
    try {
      await api.delete(`/items/${COLLECTION_NAME}/${message_id}`);
    }
    catch (err) {
      return { error: err?.message || err }
    }
  }

  /**
   * Create a new Message
   * - add an item to the extension messages collection
   * @param {String} status Current status of the message (default: draft)
   * @param {Integer} list_id ID of Mailing List
   * @param {String} message_name Message Name (must be unique)
   * @param {String} reply_to Reply to email address
   * @param {String} subject Email Subject
   * @param {String} body Body content of the message (as HTML string)
   * @param {String} template Name of the email template
   * @param {String} body_prop Name of the data prop for body content
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {Object[]} rtn.data - New Message Properties
   */
  const createMessage = async ({ status = MESSAGE_STATUS_CODES.draft, list_id, message_name, reply_to, subject, body, template = "base", body_prop = "html" }) => {
    try {
      const data = {
        status,
        list_id,
        message_name,
        reply_to,
        subject,
        body,
        template,
        body_prop
      }
      const resp = await api.post(`/items/${COLLECTION_NAME}`, data);
      return resp?.data?.data ? { data: resp?.data?.data } : { error: "Could not create message" };
    }
    catch (err) {
      return { error: err?.message || err }
    }
  }

  /**
   * Edit an existing Message
   * - update the item in extension messages collection
   * @param {Integer} message_id ID of the Message
   * @param {Integer} list_id ID of Mailing List
   * @param {String} message_name Message Name (must be unique)
   * @param {String} reply_to Reply to email address
   * @param {String} subject Email Subject
   * @param {String} body Body content of the message (as HTML string)
   * @param {String} template Name of the email template
   * @param {String} body_prop Name of the data prop for body content
   * @param {Object[]} items Items / Recipients that were active when the message was sent
   * @param {String} flow_id The ID of the flow used to send the message
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {Object[]} rtn.data - New Message Properties
   */
  const editMessage = async (message_id, { status = MESSAGE_STATUS_CODES.draft, list_id, message_name, reply_to, subject, body, template = "base", body_prop = "html", items, flow_id }) => {
    try {
      const data = {
        status,
        list_id,
        message_name,
        reply_to,
        subject,
        body,
        template,
        body_prop,
        items,
        flow_id
      }
      const resp = await api.patch(`/items/${COLLECTION_NAME}/${message_id}`, data);
      return resp?.data?.data ? { data: resp?.data?.data } : { error: "Could not edit message" };
    }
    catch (err) {
      return { error: err?.message || err }
    }
  }

  /**
   * Generate the HTML of the body content
   * - Wrap content separated by newlines in <p></p> tags
   * - Replace curly brace variables with item properties
   * @param {String} body Body Template
   * @param {Object} item Properties to replace in the template
   * @returns {Object} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {String} rtn.data - HTML string of body content
   */
  const buildBody = (body = "", item = {}) => {
    try {
      let html = body.replaceAll(/\n+/g, '\n')
      html = '<p>' + html.split('\n').join('</p><br /><p>') + '</p>';
      Object.keys(item).forEach((k) => {
        var regex = new RegExp("{{\\s*" + k + "\\s*}}", "gi");
        html = html.replace(regex, item[k]);
      });
      return { data: html };
    }
    catch (err) {
      return { error: `Could not generate body html [${err}]` };
    }
  }

  /**
   * Send the message to the recipients
   * - Create / Save the message
   * - Update the status of the message - active
   * - Get the list and its items
   * - Create the flow
   * - Process each recipient - update operation, trigger flow
   * - Update the status of the message - sent
   * @param {Integer} list_id ID of Mailing List
   * @param {String} message_name Message Name (must be unique)
   * @param {String} reply_to Reply to email address
   * @param {String} subject Email Subject
   * @param {String} body Body content of the message (as HTML string)
   * @param {String} template Name of the email template
   * @param {String} body_prop Name of the data prop for body content
   * @param {Function} updateCallback Callback function() to update the message table
   * @param {Function} sendCallback Callback function(message, count, total) reporting progress of sending messages
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   */
  const sendMessage = async ({ message_id, list_id, message_name, reply_to, subject, body, template, body_prop, updateCallback, sendCallback }) => {

    // Update the message, if already exists, or create new message
    if ( message_id ) {
      const { error:updateError } = await editMessage(message_id, { status: MESSAGE_STATUS_CODES.active, list_id, message_name, reply_to, subject, body, template, body_prop });
      if ( updateError ) return { error: `Could not update message before sending [${updateError}]` };
    }
    else {
      const { data, error:createError } = await createMessage({ status: MESSAGE_STATUS_CODES.active, list_id, message_name, reply_to, subject, body, template, body_prop });
      if ( createError ) return { error: `Could not create message before sending [${createError}]` };
      message_id = data.id;
    }
    if ( updateCallback ) updateCallback();

    // Get list
    const { error:listError, data:list } = await getLists({ id: list_id });
    if ( listError ) return { error: listError };
    if ( !list || Array.isArray(list) ) return { error: `Could not find selected mailing list` };

    // Create the flow
    const { error:flowError, data: { flow, operation } } = await createFlow(message_name);
    if ( flowError ) return { error: flowError };

    // Process each recipient
    for ( let i = 0; i < list.items.length; i++ ) {
      const item = list.items[i];
      const email = item[list.email_field];
      if ( sendCallback ) sendCallback(`Sending to: ${email}`, (i+1), list.items.length);

      // Generate the body
      const { error:bodyError, data:body_html } = buildBody(body, item);
      if ( bodyError ) return { error: bodyError };

      // Update operation
      const { error:updatedOperationError } = await updateOperation(
        operation.id, email, reply_to, subject, body_html, body_prop, item, template
      );
      if ( updatedOperationError ) return { error: updatedOperationError };
      
      // Trigger Flow
      const { error:triggerError } = await triggerFlow(flow.id);
      if ( triggerError ) return { error: triggerError };

      // Pause before sending the next message...
      await new Promise(r => setTimeout(r, 1500));
    }

    // Update the status of the message
    const { error:updateError2 } = await editMessage(message_id, { status: MESSAGE_STATUS_CODES.sent, items: list.items, flow: flow.id });
    if ( updateError2 ) return { error: `Could not update message after sending messages [${updateError2}]` };
    if ( updateCallback ) updateCallback();

    // Deactivate the flow
    const { error:deactivateFlowError } = await deactivateFlow(flow.id);
    if ( deactivateFlowError ) return { error: deactivateFlowError };

    return { }
  }

  return { setupMessages, createMessage, removeMessage, editMessage, getMessages, buildBody, sendMessage }
}