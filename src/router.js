import { createRouter, createWebHashHistory, START_LOCATION } from 'vue-router';
import { store, confirmExitVault } from './lib/store.js';
import StartScreen from './components/StartScreen.vue';
import UnlockScreen from './components/UnlockScreen.vue';
import VaultScreen from './components/VaultScreen.vue';
import RecordScreen from './components/RecordScreen.vue';
import SaveScreen from './components/SaveScreen.vue';
import CloudScreen from './components/CloudScreen.vue';
import QrExportScreen from './components/QrExportScreen.vue';
import QrScanScreen from './components/QrScanScreen.vue';
import FoldersScreen from './components/FoldersScreen.vue';

// meta.vault: a tela só existe com um cofre aberto (os dados ficam apenas em memória)
const routes = [
  // '/' é a entrada "base", onde o app é aberto. A tela inicial fica em '/inicio', logo
  // depois dela no histórico: assim o voltar na tela inicial cai em '/', ainda dentro
  // do app, e dá para pedir confirmação antes de sair (ver App.vue).
  { path: '/', name: 'base', component: StartScreen },
  { path: '/inicio', name: 'start', component: StartScreen },
  { path: '/desbloquear', name: 'unlock', component: UnlockScreen },
  { path: '/qr', name: 'scan', component: QrScanScreen },
  { path: '/nuvem', name: 'cloudOpen', component: CloudScreen },
  { path: '/cofre', name: 'vault', component: VaultScreen, meta: { vault: true } },
  { path: '/cofre/novo', name: 'newRecord', component: RecordScreen, meta: { vault: true } },
  { path: '/cofre/editar', name: 'editRecord', component: RecordScreen, meta: { vault: true } },
  { path: '/cofre/salvar', name: 'save', component: SaveScreen, meta: { vault: true } },
  { path: '/cofre/nuvem', name: 'cloudSave', component: CloudScreen, meta: { vault: true } },
  { path: '/cofre/qr', name: 'exportQr', component: QrExportScreen, meta: { vault: true } },
  { path: '/cofre/pastas', name: 'folders', component: FoldersScreen, meta: { vault: true } },
  { path: '/:rest(.*)*', redirect: '/' }
];

export const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to, from) => {
  // telas que dependem de dados em memória (ex.: após recarregar a página ou "avançar")
  if ((to.meta.vault && !store.vaultName) || (to.name === 'unlock' && !store.pendingOpen)) {
    return from === START_LOCATION ? { path: '/', replace: true } : { name: 'start', replace: true };
  }

  // voltar com o menu ou o gerador aberto apenas fecha a janela
  if (store.showGenerator || store.showMenu) {
    store.showGenerator = false;
    store.showMenu = false;
    return false;
  }

  // saindo do cofre aberto
  if (from.meta.vault && !to.meta.vault && store.vaultName) {
    return confirmExitVault('Deseja sair deste cofre?');
  }

  // voltar na tela inicial
  if (from.name === 'start' && to.name === 'base') {
    if (!window.confirm('Deseja sair do aplicativo?')) return false;
    window.history.back(); // sai da página (no app instalado, fecha o app)
  }
});
