import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { store, wipe } from './lib/store.js';

// Requisito: ao fechar o app, todos os dados em memória são zerados.
window.addEventListener('pagehide', wipe);

// Avisa antes de fechar/recarregar se houver alterações não salvas.
window.addEventListener('beforeunload', (e) => {
  if (!store.dirty) return;
  e.preventDefault();
  e.returnValue = '';
});

createApp(App).mount('#app');
