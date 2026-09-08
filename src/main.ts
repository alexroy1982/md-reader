import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'highlight.js/styles/github.min.css'
import 'katex/dist/katex.min.css'
import './styles/main.css'

performance.mark('app:main-entry')
createApp(App).use(createPinia()).mount('#app')
