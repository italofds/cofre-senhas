<script setup>
import { ref } from 'vue';
import Icon from './Icon.vue';
import { store, navigate, loadData, showToast, formatStamp } from '../lib/store.js';
import { openCofre, openJson, getRecents, reopenRecent, removeRecent } from '../lib/files.js';

const recents = ref(getRecents());

function newList() {
  loadData({ records: [] }, 'Nova lista', null);
  navigate('vault');
}

async function openFile() {
  try {
    const res = await openCofre();
    if (!res) return;
    store.pendingOpen = { name: res.name, envelope: JSON.parse(res.text), handle: res.handle };
    store.unlockError = '';
    recents.value = getRecents();
    navigate('unlock');
  } catch (e) {
    showToast('Arquivo inválido ou não é um cofre');
  }
}

async function importJson() {
  try {
    const res = await openJson();
    if (!res) return;
    const data = JSON.parse(res.text);
    if (!data || !Array.isArray(data.records)) { showToast('JSON fora do formato esperado'); return; }
    loadData(data, 'Importado (JSON)', null);
    store.dirty = true;
    navigate('vault');
    showToast('JSON importado');
  } catch (e) {
    showToast('JSON inválido');
  }
}

async function openRecent(name) {
  try {
    const res = await reopenRecent(name);
    if (res.needsManual) { showToast('Selecione o arquivo manualmente'); return openFile(); }
    store.pendingOpen = { name: res.name, envelope: JSON.parse(res.text), handle: res.handle };
    store.unlockError = '';
    navigate('unlock');
  } catch (e) {
    showToast('Não foi possível reabrir');
  }
}

function deleteRecent(name) {
  recents.value = removeRecent(name);
}
</script>

<template>
  <div class="screen-scroll scroll" data-screen-label="Início">
    <div class="pad">
      <div class="brand">
        <div class="brand-logo"><Icon name="shield" :size="24" /></div>
        <div>
          <div class="brand-title">Cofre</div>
          <div class="brand-sub">Senhas criptografadas, 100% offline</div>
        </div>
      </div>

      <div class="section-label" style="margin: 4px 0 12px;">Começar</div>
      <div class="action-list">
        <button class="action-card" @click="newList">
          <div class="action-ico accent"><Icon name="file-plus" :size="21" /></div>
          <div class="grow">
            <div class="action-title">Criar nova lista</div>
            <div class="action-sub">Comece um cofre do zero</div>
          </div>
          <Icon name="chevron-right" :size="20" style="color: var(--dim);" />
        </button>

        <button class="action-card" @click="openFile">
          <div class="action-ico"><Icon name="unlock" :size="21" /></div>
          <div class="grow">
            <div class="action-title">Abrir arquivo .cofre</div>
            <div class="action-sub">Desbloqueie com a senha mestra</div>
          </div>
          <Icon name="chevron-right" :size="20" style="color: var(--dim);" />
        </button>

        <button class="action-card" @click="importJson">
          <div class="action-ico"><Icon name="code" :size="21" /></div>
          <div class="grow">
            <div class="action-title">Importar JSON</div>
            <div class="action-sub">De um arquivo não criptografado</div>
          </div>
          <Icon name="chevron-right" :size="20" style="color: var(--dim);" />
        </button>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin:28px 0 12px;">
        <div class="section-label">Recentes</div>
        <Icon name="clock" :size="18" style="color: var(--dim);" />
      </div>
      <div class="recent-list">
        <template v-if="recents.length">
          <div v-for="f in recents" :key="f.name" class="recent-item">
            <button class="recent-open" @click="openRecent(f.name)">
              <Icon name="lock" :size="19" style="color: var(--accent-bright);" />
              <div class="grow">
                <div class="recent-name">{{ f.name }}</div>
                <div class="recent-date">{{ formatStamp(f.date) }}</div>
              </div>
              <Icon name="chevron-right" :size="18" style="color: var(--dim);" />
            </button>
            <button class="recent-del" @click="deleteRecent(f.name)" title="Remover do histórico">
              <Icon name="x" :size="16" />
            </button>
          </div>
        </template>
        <div v-else class="empty-mini">Nenhum arquivo aberto recentemente.</div>
      </div>

      <div class="info-box" style="margin-top: 24px;">
        <span class="icn"><Icon name="shield" :size="18" /></span>
        <div>
          Criptografia <strong>AES-256-GCM</strong> com chave derivada da senha mestra (PBKDF2).
          Ao fechar o app, a memória é totalmente apagada.
        </div>
      </div>
    </div>
  </div>
</template>
