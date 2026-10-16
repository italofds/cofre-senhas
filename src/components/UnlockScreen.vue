<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Icon from './Icon.vue';
import { store, loadData, showToast } from '../lib/store.js';
import { decryptVault, decryptVaultBinary } from '../lib/crypto.js';

const router = useRouter();

const master = ref('');
const show = ref(false);
const busy = ref(false);
const error = ref('');

async function unlock() {
  if (!master.value) { error.value = 'Digite a senha mestra'; return; }
  busy.value = true;
  error.value = '';
  try {
    const pending = store.pendingOpen;
    // cofre lido de QR codes vem em binário; nome e data estão dentro do conteúdo cifrado
    const data = pending.bytes
      ? await decryptVaultBinary(pending.bytes, master.value)
      : await decryptVault(pending.envelope, master.value);
    if (!data || !Array.isArray(data.records)) throw new Error('Conteúdo inesperado');
    if (pending.bytes) loadData(data, data.name || pending.name, null, data.modified);
    else loadData(data, pending.name, pending.handle, pending.envelope.modified);
    master.value = '';
    store.pendingOpen = null;
    router.replace({ name: 'vault' });
    showToast('Cofre desbloqueado');
  } catch (e) {
    error.value = e.message || 'Senha mestra incorreta';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="screen" data-screen-label="Desbloquear">
    <div class="topbar">
      <button class="top-back" @click="router.back()"><Icon name="arrow-left" :size="24" /></button>
    </div>
    <div class="screen-scroll scroll" style="position: static; flex: 1;">
      <div class="pad center-col" style="padding-top: 20px;">
        <div class="big-badge"><Icon name="lock" :size="32" /></div>
        <div class="big-title">Cofre bloqueado</div>
        <div class="file-pill">
          <Icon name="file-plus" :size="15" style="color: var(--muted);" />
          {{ store.pendingOpen ? store.pendingOpen.name : '' }}
        </div>

        <div style="width: 100%; margin-top: 30px;">
          <div class="field-label">SENHA MESTRA</div>
          <div class="field" :class="{ 'focus-accent': master.length }">
            <span class="icn"><Icon name="key" :size="19" /></span>
            <input
              class="flat"
              :type="show ? 'text' : 'password'"
              v-model="master"
              placeholder="Digite a senha mestra"
              @keyup.enter="unlock"
              autofocus
            />
            <button class="mini" @click="show = !show" style="color: var(--muted);">
              <Icon :name="show ? 'eye-off' : 'eye'" :size="20" />
            </button>
          </div>
          <div v-if="error" class="error-text"><Icon name="alert-circle" :size="16" /> {{ error }}</div>
        </div>

        <button class="primary-btn" style="margin-top: 22px;" :disabled="busy" @click="unlock">
          <Icon name="unlock" :size="20" /> {{ busy ? 'Descriptografando…' : 'Desbloquear' }}
        </button>

        <div class="hint" style="margin-top: 18px; text-align: center; max-width: 280px;">
          A senha mestra nunca é armazenada. Sem ela, o arquivo não pode ser descriptografado.
        </div>
      </div>
    </div>
  </div>
</template>
