<script setup>
import { onMounted } from 'vue';
import { store, navigate, showToast } from './lib/store.js';
import { addRecent } from './lib/files.js';
import StartScreen from './components/StartScreen.vue';
import UnlockScreen from './components/UnlockScreen.vue';
import VaultScreen from './components/VaultScreen.vue';
import RecordScreen from './components/RecordScreen.vue';
import SaveScreen from './components/SaveScreen.vue';
import FoldersScreen from './components/FoldersScreen.vue';
import MenuSheet from './components/MenuSheet.vue';
import GeneratorSheet from './components/GeneratorSheet.vue';
import Toast from './components/Toast.vue';

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
      <FoldersScreen v-else-if="store.screen === 'folders'" />
    </div>

    <MenuSheet v-if="store.showMenu" />
    <GeneratorSheet v-if="store.showGenerator" />
    <Toast />
  </div>
</template>
