import { useApi } from '@directus/extensions-sdk';

export default () => {
  const api = useApi();

  /**
   * Create the initial Flow for sending the messages
   * - create a new flow with a webhook GET trigger
   * - create the initial mail operation (updated for each recipient when sending)
   * - add the operation ot the flow
   * @param {String} message_name Message name
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {Object} rtn.data.flow - Newly created Flow
   * @returns {Object} rtn.data.operation - Newly created initial Operation
   */
  const createFlow = async (message_name) => {
    try {

      // Create the flow
      const data_flow = {
        name: `Mail Manager - ${message_name}`,
        icon: 'outgoing_mail',
        description: `Automatically created flow by the mail-manager extension to send message ${message_name}.`,
        status: 'active',
        trigger: 'webhook',
        accountability: 'all',
        options: {
          method: 'GET'
        }
      }
      const resp_flow = await api.post('/flows', data_flow);
      const flow = resp_flow?.data?.data || {};

      // Create the initial operation
      // This will be updated for each recipient (add the recipient's email and specific body)
      const data_operation = {
        name: `Send Message - ${message_name}`,
        key: `send_message_${message_name.toLowerCase().replace(' ', '_')}`,
        type: 'mail',
        position_x: 20,
        position_y: 1,
        options: {
          
        },
        flow: flow.id
      }
      const resp_operation = await api.post('/operations', data_operation);
      const operation = resp_operation?.data?.data || {};

      // Connect the operation to the flow's trigger
      await api.patch(`/flows/${flow.id}`, { operation: operation.id });

      // Return the flow and operation that were created
      return { data: { flow, operation } };

    }
    catch (err) {
      return { error: `Could not create flow [${err}]` }
    }
  }

  /**
   * Update the operation with the specifics for a single message
   * @param {String} id Operation ID
   * @param {String} email Recipient Email Address
   * @param {String} reply_to Reply To Email Address
   * @param {String} subject Email Subject
   * @param {String} body Email Body (as HTML string)
   * @param {String} body_data The data parameter key to add email body to
   * @param {Object} props Additional properties for the message, to be used by the email template
   * @param {String} template Name of email template to use
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {String} rtn.data - Updated operation
   */
  const updateOperation = async (id, email, reply_to, subject, body, body_data, props, template) => {
    try {
      const data = {
        options: {
          type: 'template',
          to: [ email ],
          replyTo: [ reply_to ],
          subject,
          data: {
            [body_data]: body,
            ...props
          },
          template
        }
      }
      const resp = await api.patch(`/operations/${id}`, data);
      return { data: resp?.data?.data || {} };
    }
    catch (err) {
      return { error: `Could not update operation [${err}]` };
    }
  }

  /**
   * Trigger the specified Flow to run
   * @param {String} id Flow ID
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   */
  const triggerFlow = async (id) => {
    try {
      await api.get(`/flows/trigger/${id}`);
      return { data: {} };
    }
    catch (err) {
      return { error: `Could not trigger flow [${err}]` };
    }
  }

  /**
   * Deactivate the specified flow
   * - Set the flow status to inactive
   * @param {String} id Flow ID
   * @returns {Promise<Object>} rtn
   * @returns {String} rtn.error - Error message, if encountered
   * @returns {Object} rtn.data - Updated flow
   */
  const deactivateFlow = async (id) => {
    try {
      return await api.patch(`/flows/${id}`, { status: 'inactive' });
    }
    catch (err) {
      return { error: `Could not deactivate flow [${err}]` };
    }
  }

  return { createFlow, updateOperation, triggerFlow, deactivateFlow };
}