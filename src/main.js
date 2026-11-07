import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './styles.css'

// Ссылки старой версии вида #s12 → #/s12
if (/^#s\d+$/.test(location.hash)) history.replaceState(null, '', '#/' + location.hash.slice(1))

createApp(App).use(router).mount('#app')
