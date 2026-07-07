<script setup>
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import { store, back, showToast, toVaultData, suggestedFileName, formatStamp } from '../lib/store.js';
import { passwordStrength } from '../lib/strength.js';
import { encryptVault } from '../lib/crypto.js';
import { saveCofre } from '../lib/files.js';

const master = ref('');
const confirm = ref('');
const busy = ref(false);

const fileName = computed(() => suggestedFileName());
const strength = computed(() => passwordStrength(master.value));
const mismatch = computed(() => confirm.value.length > 0 && master.value !== confirm.value);
const canSave = computed(() => !!master.value && master.value === confirm.value && !busy.value);

async function save() {
  if (!canSave.value) return;
  busy.value = true;
  try {
    const envelope = await encryptVault(toVaultData(), master.value);
    const res = await saveCofre(envelope, fileName.value, store.fileHandle);
    if (!res.saved) { busy.value = false; return; }
    if (res.handle) store.fileHandle = res.handle;
    if (res.name) store.vaultName = res.name;
    store.modified = new Date().toISOString();
    store.dirty = false;
    master.value = '';
    confirm.value = '';
    back();
    showToast('Cofre .cofre salvo');
  } catch (e) {
    showToast('Falha ao salvar');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="screen" data-screen-label="Salvar cofre">
    <div class="topbar">
      <button class="top-back" @click="back"><Icon name="arrow-left" :size="24" /></button>
      <div class="top-title">Salvar cofre criptografado</div>
      <span style="width: 40px;"></span>
    </div>

    <div class="screen-scroll scroll" style="position: static; flex: 1; padding: 16px 22px 40px;">
      <div class="file-card">
        <div class="file-card-ico"><Icon name="save" :size="21" /></div>
        <div class="grow">
          <div class="action-title">{{ fileName }}</div>
          <div class="action-sub">Será marcado com a data da modificação</div>
        </div>
      </div>

      <div class="field-label" style="margin: 24px 2px 8px;">SENHA MESTRA</div>
      <div class="field">
        <span class="icn"><Icon name="key" :size="19" /></span>
        <input class="flat" type="password" v-model="master" placeholder="Crie uma senha mestra forte" />
      </div>
      <div class="strength-row">
        <div class="strength-track">
          <div class="strength-fill" :style="{ width: strength.pct + '%', background: strength.color }"></div>
        </div>
        <span class="strength-label" :style="{ color: strength.color }">{{ strength.label }}</span>
      </div>

      <div class="field-label" style="margin: 18px 2px 8px;">CONFIRMAR SENHA MESTRA</div>
      <div class="field">
        <span class="icn"><Icon name="key" :size="19" /></span>
        <input class="flat" type="password" v-model="confirm" placeholder="Repita a senha mestra" @keyup.enter="save" />
      </div>
      <div v-if="mismatch" class="error-text"><Icon name="alert-circle" :size="16" /> As senhas não coincidem</div>

      <div class="info-box" style="margin-top: 22px;">
        <span class="icn"><Icon name="lock" :size="18" /></span>
        <div>
          Os dados serão criptografados com <strong>AES-256-GCM</strong> usando uma chave derivada por
          <strong>PBKDF2</strong> (salt + IV aleatórios) e salvos em <strong>{{ fileName }}</strong>.
        </div>
      </div>

      <button class="primary-btn" style="margin-top: 24px;" :disabled="!canSave" @click="save">
        <Icon name="save" :size="20" /> {{ busy ? 'Criptografando…' : 'Salvar arquivo .cofre' }}
      </button>
    </div>
  </div>
</template>
