import { createApp } from 'vue';
import { createWebHashHistory, createRouter } from 'vue-router';
import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import store from './store';
import '@/utils/fathom';

import App from './App.vue';

import Swap from './views/Swap.vue';

const routerHistory = createWebHashHistory();
const router = createRouter({
  history: routerHistory,
  routes: [
    { path: '/', redirect: '/swap' },
    { path: '/swap/:assetIn?/:assetOut?', name: 'swap', component: Swap }
  ]
});

const app = createApp(App);

app.directive('autofocus', {
  mounted(el) {
    el.focus();
  }
});

app.use(router);
app.use(store);

const requireComponent = require.context('@/components', true, /[\w-]+\.vue$/);
requireComponent.keys().forEach(fileName => {
  const componentConfig = requireComponent(fileName);
  const componentName = upperFirst(
    camelCase(fileName.replace(/^\.\//, '').replace(/\.\w+$/, ''))
  );
  app.component(componentName, componentConfig.default || componentConfig);
});

app.mount('#app');

export { routerHistory, router, store };
