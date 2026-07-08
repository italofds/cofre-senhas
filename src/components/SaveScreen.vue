<script setup>
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import { store, back, showToast, toVaultData, suggestedFileName } from '../lib/store.js';
import { passwordStrength } from '../lib/strength.js';
import { encryptVault } from '../lib/crypto.js';
import { saveCofre, downloadText, addRecent, canShareFiles, shareFile } from '../lib/files.js';

const master = ref('');
const confirm = ref('');
const busy = ref(false);
const fallbackEnvelope = ref(null);
const fallbackName = ref('');

const fileName = computed(() => suggestedFileName());
const strength = computed(() => passwordStrength(master.value));
const mismatch = computed(() => confirm.value.length > 0 && master.value !== confirm.value);
const canSave = computed(() => !!master.value && master.value === confirm.value && !busy.value);
const showFallback = computed(() => !!fallbackEnvelope.value);
const hasShare = computed(() => canShareFiles());

async function save() {
  if (!canSave.value) return;
  busy.value = true;
  try {
    const envelope = await encryptVault(toVaultData(), master.value);
    const res = await saveCofre(envelope, fileName.value, store.fileHandle);
    if (res.needsFallback) {
      master.value = '';
      confirm.value = '';
      fallbackEnvelope.value = envelope;
      fallbackName.value = fileName.value;
      busy.value = false;
      return;
    }
    if (!res.saved) { busy.value = false; return; }
    applySuccess(res.handle, res.name);
    showToast('Cofre .cofre salvo');
  } catch {
    showToast('Falha ao salvar');
  } finally {
    busy.value = false;
  }
}

async function doShare() {
  busy.value = true;
  try {
    await shareFile(fallbackEnvelope.value, fallbackName.value);
    await addRecent(fallbackName.value, null);
    applySuccess(null, fallbackName.value);
    showToast('Arquivo compartilhado');
  } catch (e) {
    if (!e || e.name !== 'AbortError') showToast('Falha ao compartilhar');
  } finally {
    busy.value = false;
  }
}

async function doDownload() {
  downloadText(fallbackEnvelope.value, fallbackName.value, 'application/octet-stream');
  await addRecent(fallbackName.value, null);
  applySuccess(null, fallbackName.value);
  showToast('Arquivo baixado');
}

function applySuccess(handle, name) {
  store.fileHandle = handle || null;
  if (name) store.vaultName = name;
  store.modified = new Date().toISOString();
  store.dirty = false;
  back();
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
          <div class="action-title">{{ showFallback ? fallbackName : fileName }}</div>
          <div class="action-sub">Será marcado com a data da modificação</div>
        </div>
      </div>

      <!-- Formulário de senha (estado normal) -->
      <template v-if="!showFallback">
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
      </template>

      <!-- Fallback: FSA falhou (ex.: arquivo de nuvem no Android) -->
      <template v-else>
        <div class="info-box" style="margin-top: 20px;">
          <span class="icn"><Icon name="alert-circle" :size="18" /></span>
          <div>
            Não foi possível salvar diretamente no local de origem (ex.: OneDrive ou Google Drive).
            O arquivo foi criptografado — escolha como salvá-lo:
          </div>
        </div>

        <button v-if="hasShare" class="primary-btn" style="margin-top: 20px;" :disabled="busy" @click="doShare">
          <Icon name="share" :size="20" /> {{ busy ? 'Compartilhando…' : 'Compartilhar arquivo' }}
        </button>

        <button :class="hasShare ? 'ghost-accent' : 'primary-btn'" style="margin-top: 12px;" :disabled="busy" @click="doDownload">
          <Icon name="download" :size="20" /> Baixar para o dispositivo
        </button>

        <p class="hint" style="margin-top: 14px; text-align: center;">
          <template v-if="hasShare">
            "Compartilhar" abre o menu do sistema — selecione OneDrive, Google Drive, e-mail, etc.
          </template>
          <template v-else>
            O arquivo será baixado para o dispositivo. Envie-o manualmente ao OneDrive se necessário.
          </template>
        </p>
      </template>
    </div>
  </div>
</template>
