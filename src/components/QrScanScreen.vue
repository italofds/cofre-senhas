<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Icon from './Icon.vue';
import { store, back, showToast } from '../lib/store.js';
import { isBinaryVault } from '../lib/crypto.js';
import { parseQrText, joinParts } from '../lib/qr.js';

const video = ref(null);
const starting = ref(true);
const error = ref('');
const setId = ref('');
const got = ref([]); // uma posição por parte: true = já lida

const total = computed(() => got.value.length);
const count = computed(() => got.value.filter(Boolean).length);

let scanner = null;
let parts = [];
let alive = true;
let lastWarn = 0;

function warn(msg) {
  const now = Date.now();
  if (now - lastWarn < 2500) return;
  lastWarn = now;
  showToast(msg);
}

function reset() {
  parts = [];
  setId.value = '';
  got.value = [];
}

function onResult(text) {
  const p = parseQrText(text);
  if (!p) { warn('Este QR code não é de um cofre'); return; }
  if (!setId.value) {
    setId.value = p.setId;
    parts = new Array(p.total).fill(null);
  } else if (p.setId !== setId.value || p.total !== parts.length) {
    warn('Este QR code é de outra exportação');
    return;
  }
  if (parts[p.index]) return;
  parts[p.index] = p.data;
  got.value = parts.map(Boolean);
  if (navigator.vibrate) navigator.vibrate(60);
  if (parts.every(Boolean)) finish();
}

function finish() {
  const bytes = joinParts(parts);
  if (!isBinaryVault(bytes)) {
    reset();
    showToast('QR codes inválidos — leia novamente');
    return;
  }
  if (scanner) scanner.stop();
  store.pendingOpen = { name: 'Cofre (QR code)', bytes, handle: null };
  store.unlockError = '';
  // troca direta de tela: "voltar" no desbloqueio retorna ao início, não à câmera
  store.screen = 'unlock';
}

// Lê o quadrado central do vídeo (o mesmo que aparece no visor), com resolução
// suficiente para QR codes densos — o padrão da biblioteca (400 px) é pouco.
function scanRegion(v) {
  const s = Math.min(v.videoWidth, v.videoHeight);
  const d = Math.min(s, 1000);
  return {
    x: Math.round((v.videoWidth - s) / 2),
    y: Math.round((v.videoHeight - s) / 2),
    width: s,
    height: s,
    downScaledWidth: d,
    downScaledHeight: d
  };
}

onMounted(async () => {
  try {
    const { default: QrScanner } = await import('qr-scanner');
    if (!alive) return;
    scanner = new QrScanner(video.value, (res) => onResult(res.data), {
      preferredCamera: 'environment',
      maxScansPerSecond: 12,
      calculateScanRegion: scanRegion,
      returnDetailedScanResult: true,
      onDecodeError: () => {}
    });
    await scanner.start();
    if (!alive) scanner.destroy();
  } catch (e) {
    error.value = window.isSecureContext
      ? 'Não foi possível acessar a câmera. Verifique a permissão do navegador e tente novamente.'
      : 'A câmera só funciona em HTTPS ou em localhost.';
  } finally {
    starting.value = false;
  }
});

onBeforeUnmount(() => {
  alive = false;
  if (scanner) scanner.destroy();
  scanner = null;
});
</script>

<template>
  <div class="screen" data-screen-label="Abrir por QR code">
    <div class="topbar">
      <button class="top-back" @click="back"><Icon name="arrow-left" :size="24" /></button>
      <div class="top-title">Abrir por QR code</div>
      <span style="width: 40px;"></span>
    </div>

    <div class="screen-scroll scroll" style="position: static; flex: 1; padding: 10px 22px 40px;">
      <div class="scan-box">
        <video ref="video" class="scan-video" muted playsinline></video>
        <div v-if="starting || error" class="scan-msg">
          <Icon :name="error ? 'alert-circle' : 'camera'" :size="30" />
          <div>{{ error || 'Abrindo a câmera…' }}</div>
        </div>
      </div>

      <template v-if="!error">
        <div class="scan-status">
          <template v-if="total">{{ count }} de {{ total }} QR codes lidos</template>
          <template v-else>Aponte a câmera para um dos QR codes</template>
        </div>

        <div v-if="total" class="chips-wrap" style="justify-content: center;">
          <span v-for="(ok, i) in got" :key="i" class="scan-part" :class="{ done: ok }">{{ i + 1 }}</span>
        </div>

        <button v-if="total" class="ghost-accent" style="margin-top: 20px;" @click="reset">
          <Icon name="refresh" :size="18" /> Recomeçar leitura
        </button>

        <div class="hint" style="margin-top: 18px; text-align: center;">
          Leia todos os códigos do PDF, em qualquer ordem. Ao final, será pedida a senha mestra.
        </div>
      </template>
    </div>
  </div>
</template>
