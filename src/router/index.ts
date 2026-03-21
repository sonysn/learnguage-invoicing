import { createRouter, createWebHistory } from 'vue-router';
import InvoiceList from '../views/InvoiceList.vue';
import InvoiceForm from '../views/InvoiceForm.vue';
import Login from '../views/Login.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/',
    name: 'InvoiceList',
    component: InvoiceList,
    meta: { requiresAuth: true }
  },
  {
    path: '/new',
    name: 'InvoiceForm',
    component: InvoiceForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/edit/:id',
    name: 'InvoiceEdit',
    component: InvoiceForm,
    props: true,
    meta: { requiresAuth: true }
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const isAuthenticated = !!localStorage.getItem('access_token');

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' });
  } else if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'InvoiceList' });
  } else {
    next();
  }
});

export default router;
