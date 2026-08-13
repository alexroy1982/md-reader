import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/github.min.css'
import 'katex/dist/katex.min.css'
import './styles/main.css'

createApp(App).use(createPinia()).mount('#app')
