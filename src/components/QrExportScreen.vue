<script setup>
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import { store, back, showToast, toCloudData, formatStamp } from '../lib/store.js';
import { passwordStrength } from '../lib/strength.js';
import { encryptVaultBinary } from '../lib/crypto.js';
import { splitToQrTexts } from '../lib/qr.js';
import { savePdf } from '../lib/files.js';

const master = ref('');
const confirm = ref('');
const busy = ref(false);

const vaultTitle = computed(() => (store.vaultName || 'Cofre').replace(/\.cofre$/i, '').trim() || 'Cofre');
const fileName = computed(() => vaultTitle.value.replace(/\s+/g, '-').toLowerCase() + '-qrcodes.pdf');
const strength = computed(() => passwordStrength(master.value));
const mismatch = computed(() => confirm.value.length > 0 && master.value !== confirm.value);
const canExport = computed(() => !!master.value && master.value === confirm.value && !busy.value);

async function exportPdf() {
  if (!canExport.value) return;
  busy.value = true;
  try {
    const data = { ...toCloudData(), name: vaultTitle.value };
    const bytes = await encryptVaultBinary(data, master.value);
    const texts = splitToQrTexts(bytes);
    if (!texts) { showToast('Cofre grande demais para QR codes'); return; }
    const { buildQrPdf } = await import('../lib/qrpdf.js');
    const blob = buildQrPdf(texts, { name: vaultTitle.value, stamp: formatStamp(data.modified) });
    if (!(await savePdf(blob, fileName.value))) return;
    master.value = '';
    confirm.value = '';
    back();
    showToast(texts.length > 1 ? `PDF gerado com ${texts.length} QR codes` : 'PDF gerado com 1 QR code');
  } catch {
    showToast('Falha ao gerar o PDF');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="screen" data-screen-label="Exportar QR codes">
    <div class="topbar">
      <button class="top-back" @click="back"><Icon name="arrow-left" :size="24" /></button>
      <div class="top-title">Exportar PDF com QR codes</div>
      <span style="width: 40px;"></span>
    </div>

    <div class="screen-scroll scroll" style="position: static; flex: 1; padding: 16px 22px 40px;">
      <div class="file-card">
        <div class="file-card-ico"><Icon name="qr" :size="21" /></div>
        <div class="grow">
          <div class="action-title">{{ fileName }}</div>
          <div class="action-sub">Para imprimir e guardar em papel</div>
        </div>
      </div>

      <div class="field-label" style="margin: 24px 2px 8px;">SENHA MESTRA</div>
      <div class="field">
        <span class="icn"><Icon name="key" :size="19" /></span>
        <input class="flat" type="password" v-model="master" placeholder="Senha para cifrar os QR codes" />
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
        <input class="flat" type="password" v-model="confirm" placeholder="Repita a senha mestra" @keyup.enter="exportPdf" />
      </div>
      <div v-if="mismatch" class="error-text"><Icon name="alert-circle" :size="16" /> As senhas não coincidem</div>

      <div class="info-box" style="margin-top: 22px;">
        <span class="icn"><Icon name="lock" :size="18" /></span>
        <div>
          Os dados serão criptografados com <strong>AES-256-GCM</strong> (chave derivada por <strong>PBKDF2</strong>)
          e divididos em um ou mais <strong>QR codes</strong>. Para reabrir, use <strong>Abrir por QR code</strong>
          na tela inicial e informe esta mesma senha.
        </div>
      </div>

      <button class="primary-btn" style="margin-top: 24px;" :disabled="!canExport" @click="exportPdf">
        <Icon name="qr" :size="20" /> {{ busy ? 'Gerando PDF…' : 'Gerar PDF' }}
      </button>
    </div>
  </div>
</template>
