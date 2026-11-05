import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import './style.css';
import { httpsUrlFor } from './utils/httpsRedirect.js';

const httpsUrl = httpsUrlFor(window.location);

if (httpsUrl) window.location.replace(httpsUrl);
else createApp(App).use(router).mount('#app');
