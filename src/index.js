import MessagesRoute from './routes/messages.vue';
import ListsRoute from './routes/lists.vue';

export default {
  id: 'mailing-lists',
  name: 'Mailing Lists',
  icon: 'outgoing_mail',
  routes: [
    {
      path: '',
      component: MessagesRoute,
    },
    {
      path: 'lists',
      component: ListsRoute,
    },
  ],
  preRegisterCheck(user) {
    const has_admin_access = user.admin_access || user.role.admin_access;
    return has_admin_access;
  }
};
