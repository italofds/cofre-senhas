<script setup>
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import { store, back, addFolder, renameFolder, deleteFolder } from '../lib/store.js';

const newName = ref('');
const editing = ref(null);
const editName = ref('');

const counts = computed(() => {
  const c = {};
  store.records.forEach((r) => { c[r.folder] = (c[r.folder] || 0) + 1; });
  return c;
});

function create() {
  if (addFolder(newName.value)) newName.value = '';
}
function startEdit(f) {
  editing.value = f;
  editName.value = f;
}
function commit() {
  renameFolder(editing.value, editName.value);
  editing.value = null;
}
function countLabel(f) {
  const c = counts.value[f] || 0;
  return c === 1 ? '1 registro' : `${c} registros`;
}
</script>

<template>
  <div class="screen" data-screen-label="Pastas">
    <div class="topbar">
      <button class="top-back" @click="back"><Icon name="arrow-left" :size="24" /></button>
      <div class="top-title">Gerenciar pastas</div>
      <span style="width: 40px;"></span>
    </div>

    <div class="screen-scroll scroll" style="position: static; flex: 1; padding: 14px 18px 40px;">
      <div class="field" style="margin-bottom: 20px;">
        <span class="icn" style="color: var(--accent-bright);"><Icon name="folder-plus" :size="20" /></span>
        <input class="flat" v-model="newName" placeholder="Nome da nova pasta" @keyup.enter="create" />
        <button class="mini-btn accent" :disabled="!newName.trim()" @click="create" style="margin-right: 4px;">
          <Icon name="plus" :size="20" />
        </button>
      </div>

      <div class="section-label" style="margin: 0 2px 10px;">Suas pastas</div>
      <div class="list" style="margin-top: 0;">
        <div v-for="f in store.folders" :key="f" class="folder-item">
          <Icon name="folder" :size="22" style="color: var(--muted);" />
          <template v-if="editing === f">
            <input class="edit-input" v-model="editName" @keyup.enter="commit" autofocus />
            <button class="mini-btn accent" @click="commit"><Icon name="check" :size="20" /></button>
          </template>
          <template v-else>
            <div class="grow">
              <div class="folder-name">{{ f }}</div>
              <div class="folder-count">{{ countLabel(f) }}</div>
            </div>
            <button class="mini-btn" @click="startEdit(f)"><Icon name="edit" :size="18" /></button>
            <button class="mini-btn danger" @click="deleteFolder(f)"><Icon name="trash" :size="18" /></button>
          </template>
        </div>
      </div>

      <div class="hint" style="margin-top: 16px; padding: 0 2px;">
        Ao excluir uma pasta, os registros dentro dela são movidos para a primeira pasta disponível.
      </div>
    </div>
  </div>
</template>
