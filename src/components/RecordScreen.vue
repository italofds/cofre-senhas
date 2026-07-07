<script setup>
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import { store, back, saveDraft, removeRecord, copyText, regenerate, addFolder } from '../lib/store.js';
import { passwordStrength } from '../lib/strength.js';

const strength = computed(() => passwordStrength(store.draft.password));
const title = computed(() => (store.editingId != null ? 'Editar registro' : 'Novo registro'));

const creatingFolder = ref(false);
const newFolderName = ref('');

function openGenerator() {
  regenerate();
  store.showGenerator = true;
}
function startCreateFolder() {
  creatingFolder.value = true;
  newFolderName.value = '';
}
function confirmCreateFolder() {
  const name = newFolderName.value.trim();
  if (!addFolder(name)) return;
  store.draft.folder = name;
  creatingFolder.value = false;
  newFolderName.value = '';
}
function cancelCreateFolder() {
  creatingFolder.value = false;
  newFolderName.value = '';
}
</script>

<template>
  <div class="screen" data-screen-label="Registro">
    <div class="topbar">
      <button class="top-back" @click="back"><Icon name="arrow-left" :size="24" /></button>
      <div class="top-title">{{ title }}</div>
      <button class="top-link" @click="saveDraft">Salvar</button>
    </div>

    <div class="screen-scroll scroll" style="position: static; flex: 1; padding: 10px 18px 40px;">
      <div class="field-label" style="margin-top: 6px;">TÍTULO</div>
      <input class="input-block" v-model="store.draft.title" placeholder="Ex.: Gmail" style="margin-bottom: 16px;" />

      <div class="field-label">LOGIN / USUÁRIO</div>
      <div class="field" style="margin-bottom: 16px;">
        <input class="flat" v-model="store.draft.login" placeholder="email@exemplo.com" />
        <button class="mini" @click="copyText(store.draft.login, 'Login copiado')" style="color: var(--muted);">
          <Icon name="copy" :size="18" />
        </button>
      </div>

      <div class="field-label">SENHA</div>
      <div class="field">
        <input
          class="flat"
          style="font-family: var(--mono); letter-spacing: .3px;"
          :type="store.showPassword ? 'text' : 'password'"
          v-model="store.draft.password"
          placeholder="Senha"
        />
        <button class="mini" @click="store.showPassword = !store.showPassword" style="color: var(--muted);">
          <Icon :name="store.showPassword ? 'eye-off' : 'eye'" :size="19" />
        </button>
        <button class="mini" @click="copyText(store.draft.password, 'Senha copiada')" style="color: var(--accent-bright);">
          <Icon name="copy" :size="19" />
        </button>
      </div>
      <div class="strength-row">
        <div class="strength-track">
          <div class="strength-fill" :style="{ width: strength.pct + '%', background: strength.color }"></div>
        </div>
        <span class="strength-label" :style="{ color: strength.color }">{{ strength.label }}</span>
      </div>
      <button class="ghost-accent" style="margin-top: 12px;" @click="openGenerator">
        <Icon name="dice" :size="19" /> Gerar senha forte
      </button>

      <div class="field-label" style="margin-top: 22px;">URL</div>
      <div class="field" style="margin-bottom: 16px;">
        <span class="icn"><Icon name="globe" :size="18" /></span>
        <input class="flat" v-model="store.draft.url" placeholder="exemplo.com" />
      </div>

      <div class="field-label">PASTA</div>
      <div class="chips-wrap" :style="{ marginBottom: creatingFolder ? '10px' : '18px' }">
        <button
          v-for="f in store.folders"
          :key="f"
          class="chip"
          :class="{ active: store.draft.folder === f }"
          @click="store.draft.folder = f"
        >{{ f }}</button>
        <button v-if="!creatingFolder" class="chip" @click="startCreateFolder">
          <Icon name="plus" :size="13" style="vertical-align: -2px;" /> Nova pasta
        </button>
      </div>
      <div v-if="creatingFolder" class="field" style="margin-bottom: 18px;">
        <input
          class="flat"
          v-model="newFolderName"
          placeholder="Nome da nova pasta"
          autofocus
          @keyup.enter="confirmCreateFolder"
          @keyup.esc="cancelCreateFolder"
        />
        <button class="mini" style="color: var(--accent-bright);" :disabled="!newFolderName.trim()" @click="confirmCreateFolder">
          <Icon name="check" :size="20" />
        </button>
        <button class="mini" style="color: var(--muted);" @click="cancelCreateFolder">
          <Icon name="x" :size="18" />
        </button>
      </div>

      <div class="field-label">OBSERVAÇÕES</div>
      <textarea class="input-block" v-model="store.draft.notes" placeholder="Notas, perguntas de segurança, etc."></textarea>

      <button v-if="store.editingId != null" class="danger-btn" style="margin-top: 20px;" @click="removeRecord">
        <Icon name="trash" :size="19" /> Excluir registro
      </button>
    </div>
  </div>
</template>
