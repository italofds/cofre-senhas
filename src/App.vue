<script setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { store, showToast } from './lib/store.js';
import { addRecent } from './lib/files.js';
import MenuSheet from './components/MenuSheet.vue';
import GeneratorSheet from './components/GeneratorSheet.vue';
import Toast from './components/Toast.vue';

const router = useRouter();
const route = useRoute();

// Na primeira interação, sai da entrada base (rota 'base') para a tela inicial ('start'), para o
// voltar na tela inicial poder pedir confirmação. Isso é feito numa interação porque o
// Chrome pula, no voltar, entradas do histórico criadas sem interação do usuário. O
// pointerup vem antes do click, então a entrada é criada antes da ação do botão tocado.
function leaveBase() {
  if (route.name === 'base') router.push({ name: 'start' });
}

onMounted(() => {
  window.addEventListener('pointerup', leaveBase, true);
  window.addEventListener('keydown', leaveBase, true);

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
      router.push({ name: 'unlock' });
    } catch {
      showToast('Arquivo inválido ou não é um cofre');
    }
  });
});
</script>

<template>
  <div class="app-shell">
    <div class="screen-area">
      <RouterView />
    </div>

    <MenuSheet v-if="store.showMenu" />
    <GeneratorSheet v-if="store.showGenerator" />
    <Toast />
  </div>
</template>
