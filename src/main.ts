import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setHttpErrorListener } from './api/client'
import { reportHttpError } from './composables/toast'
import './styles/main.css'

setHttpErrorListener(reportHttpError)

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
