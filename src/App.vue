<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { store, navigate, back, showToast, confirmExitVault } from './lib/store.js';
import { addRecent } from './lib/files.js';
import StartScreen from './components/StartScreen.vue';
import UnlockScreen from './components/UnlockScreen.vue';
import VaultScreen from './components/VaultScreen.vue';
import RecordScreen from './components/RecordScreen.vue';
import SaveScreen from './components/SaveScreen.vue';
import CloudScreen from './components/CloudScreen.vue';
import QrExportScreen from './components/QrExportScreen.vue';
import QrScanScreen from './components/QrScanScreen.vue';
import FoldersScreen from './components/FoldersScreen.vue';
import MenuSheet from './components/MenuSheet.vue';
import GeneratorSheet from './components/GeneratorSheet.vue';
import Toast from './components/Toast.vue';

/* ---------- botão voltar do navegador / dispositivo ----------
   Mantém uma entrada extra ("sentinela") no histórico do navegador: o voltar
   consome essa entrada, disparando `popstate`, e a navegação é tratada pelo app.
   A sentinela é recolocada, exceto quando o usuário confirma sair do app. */
function pushGuard() {
  history.pushState({ cofreGuard: true }, '');
}

function onBackButton() {
  if (store.showGenerator) {
    store.showGenerator = false;
  } else if (store.showMenu) {
    store.showMenu = false;
  } else if (store.screen === 'vault') {
    confirmExitVault('Deseja sair deste cofre?');
  } else if (store.screen === 'start') {
    if (window.confirm('Deseja sair do aplicativo?')) {
      history.back(); // sai da página (no app instalado, fecha o app)
      return;
    }
  } else {
    back();
  }
  pushGuard();
}

onMounted(() => {
  if (!history.state || !history.state.cofreGuard) pushGuard();
  window.addEventListener('popstate', onBackButton);
});
onBeforeUnmount(() => window.removeEventListener('popstate', onBackButton));

onMounted(() => {
  if (!('launchQueue' in window)) return;
  window.launchQueue.setConsumer(async (launchParams) => {
    if (!launchParams.files || launchParams.files.length === 0) return;
    const handle = launchParams.files[0];
    try {
      const file = await handle.getFile();
      const envelope = JSON.parse(await file.text());
      await addRecent(file.name, handle);
      store.pendingOpen = { name: file.name, envelope, handle };
      store.unlockError = '';
      navigate('unlock');
    } catch {
      showToast('Arquivo inválido ou não é um cofre');
    }
  });
});
</script>

<template>
  <div class="app-shell">
    <div class="screen-area">
      <StartScreen v-if="store.screen === 'start'" />
      <UnlockScreen v-else-if="store.screen === 'unlock'" />
      <VaultScreen v-else-if="store.screen === 'vault'" />
      <RecordScreen v-else-if="store.screen === 'record'" />
      <SaveScreen v-else-if="store.screen === 'save'" />
      <CloudScreen v-else-if="store.screen === 'cloud'" />
      <QrExportScreen v-else-if="store.screen === 'exportQr'" />
      <QrScanScreen v-else-if="store.screen === 'scan'" />
      <FoldersScreen v-else-if="store.screen === 'folders'" />
    </div>

    <MenuSheet v-if="store.showMenu" />
    <GeneratorSheet v-if="store.showGenerator" />
    <Toast />
  </div>
</template>
