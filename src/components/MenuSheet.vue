<script setup>
import Icon from './Icon.vue';
import { store, navigate, showToast, toExportDataNoPasswords, toVaultData, wipe } from '../lib/store.js';
import { saveJson } from '../lib/files.js';

function close() { store.showMenu = false; }

function gotoSave() {
  close();
  navigate('save');
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
  if (store.dirty) {
    const sure = window.confirm(
      'Você tem alterações não salvas. Ao bloquear e sair, tudo o que não foi salvo em um arquivo .cofre será perdido.\n\n' +
      'Deseja continuar mesmo assim?'
    );
    if (!sure) return;
  }
  close();
  wipe();
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
