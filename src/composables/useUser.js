import { useApi } from '@directus/extensions-sdk';

export default () => {
  const api = useApi();

  /**
   * Get currently logged in user
   */
  const getUser = async () => {
    try {
      const resp = await api.get('/users/me');
      return { data: resp?.data?.data || {} };
    }
    catch (err) {
      return { error: `Could not get user [${err}]` };
    }
  }

  return { getUser }
}