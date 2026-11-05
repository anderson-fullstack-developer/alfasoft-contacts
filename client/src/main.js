import { createApp } from 'vue';
import App from './App.vue';
import { httpsUrlFor } from './httpsRedirect.js';
import router from './router.js';
import './style.css';

const httpsUrl = httpsUrlFor(window.location);

if (httpsUrl) window.location.replace(httpsUrl);
else createApp(App).use(router).mount('#app');
