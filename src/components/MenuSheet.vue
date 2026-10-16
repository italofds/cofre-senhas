<script setup>
import Icon from './Icon.vue';
import { ref } from 'vue';
import { store, navigate, showToast, toExportDataNoPasswords, toVaultData, toCloudData, cloudSaved, confirmExitVault } from '../lib/store.js';
import { saveJson } from '../lib/files.js';
import { CloudError, cloudEnabled, cloudMessage, saveCloud } from '../lib/cloud.js';

const cloudOn = cloudEnabled();
const busy = ref(false);

function close() { store.showMenu = false; }

function gotoSave() {
  close();
  navigate('save');
}
async function saveToCloud() {
  const session = store.cloud;
  if (!session) {
    close();
    store.cloudMode = 'create';
    navigate('cloud');
    return;
  }
  if (busy.value) return;
  busy.value = true;
  try {
    const data = toCloudData();
    try {
      cloudSaved(await saveCloud(session, data), data);
    } catch (e) {
      if (!(e instanceof CloudError) || e.code !== 'conflict' || e.rev === undefined) throw e;
      if (!window.confirm('A nuvem tem uma versão mais recente, salva em outro dispositivo. Sobrescrever?')) return;
      cloudSaved(await saveCloud({ ...session, rev: e.rev }, data), data);
    }
    close();
    showToast('Salvo na nuvem');
  } catch (e) {
    showToast(cloudMessage(e));
  } finally {
    busy.value = false;
  }
}
function gotoExportQr() {
  close();
  navigate('exportQr');
}
function gotoFolders() {
  close();
  navigate('folders');
}
async function exportJson() {
  close();
  const name = (store.vaultName || 'cofre').replace(/\.cofre$/i, '').trim().replace(/\s+/g, '-').toLowerCase() + '-sem-senhas.json';
  const text = JSON.stringify(toExportDataNoPasswords(), null, 2);
  const ok = await saveJson(text, name);
  if (ok) showToast('Exportado em JSON (sem senhas)');
}
async function exportJsonWithPasswords() {
  close();
  const sure = window.confirm(
    'Atenção: este arquivo conterá todas as suas senhas em texto puro, sem qualquer criptografia.\n\n' +
    'Qualquer pessoa com acesso a ele poderá ler suas senhas. Salve apenas em local seguro e exclua assim que possível.\n\n' +
    'Deseja continuar mesmo assim?'
  );
  if (!sure) return;
  const name = (store.vaultName || 'cofre').replace(/\.cofre$/i, '').trim().replace(/\s+/g, '-').toLowerCase() + '-com-senhas.json';
  const text = JSON.stringify(toVaultData(), null, 2);
  const ok = await saveJson(text, name);
  if (ok) showToast('Exportado em JSON (com senhas) — mantenha em local seguro');
}
function lock() {
  confirmExitVault();
}
</script>

<template>
  <div>
    <div class="sheet-overlay" @click="close"></div>
    <div class="sheet pad-narrow">
      <div class="sheet-handle"></div>
      <button class="menu-item" @click="gotoSave">
        <span class="menu-ico accent"><Icon name="save" :size="22" /></span>
        <div>
          <div class="menu-title">Salvar arquivo .cofre</div>
          <div class="menu-sub">Criptografado com senha mestra</div>
        </div>
      </button>
      <button v-if="cloudOn" class="menu-item" :disabled="busy" @click="saveToCloud">
        <span class="menu-ico accent"><Icon name="cloud-upload" :size="22" /></span>
        <div>
          <div class="menu-title">{{ busy ? 'Salvando…' : 'Salvar na nuvem' }}</div>
          <div class="menu-sub">{{ store.cloud ? 'Atualizar o cofre de ' + store.cloud.id : 'Criptografado com id e senha mestra' }}</div>
        </div>
      </button>
      <button class="menu-item" @click="gotoExportQr">
        <span class="menu-ico accent"><Icon name="qr" :size="22" /></span>
        <div>
          <div class="menu-title">Exportar PDF com QR codes</div>
          <div class="menu-sub">Criptografado, para imprimir</div>
        </div>
      </button>
      <button class="menu-item" @click="gotoFolders">
        <span class="menu-ico"><Icon name="folder-cog" :size="22" /></span>
        <div>
          <div class="menu-title">Gerenciar pastas</div>
          <div class="menu-sub">Criar, renomear ou excluir grupos</div>
        </div>
      </button>
      <button class="menu-item" @click="exportJson">
        <span class="menu-ico"><Icon name="download" :size="22" /></span>
        <div>
          <div class="menu-title">Exportar JSON</div>
          <div class="menu-sub">Sem senhas, para backup legível</div>
        </div>
      </button>
      <button class="menu-item" @click="exportJsonWithPasswords">
        <span class="menu-ico danger"><Icon name="alert-circle" :size="22" /></span>
        <div>
          <div class="menu-title">Exportar JSON com senhas</div>
          <div class="menu-sub danger">Sem criptografia — risco de exposição das senhas</div>
        </div>
      </button>
      <button class="menu-item" @click="lock">
        <span class="menu-ico"><Icon name="lock" :size="22" /></span>
        <div>
          <div class="menu-title">Bloquear e sair</div>
          <div class="menu-sub">Apaga todos os dados da memória</div>
        </div>
      </button>
    </div>
  </div>
</template>
