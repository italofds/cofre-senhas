<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import { store, openRecord, newRecord, copyText, formatStamp } from '../lib/store.js';
import { passwordStrength } from '../lib/strength.js';

const counts = computed(() => {
  const c = {};
  store.records.forEach((r) => { c[r.folder] = (c[r.folder] || 0) + 1; });
  return c;
});

const chips = computed(() => {
  const all = { name: 'Todas', label: `Todas · ${store.records.length}` };
  const rest = store.folders.map((f) => ({ name: f, label: `${f} · ${counts.value[f] || 0}` }));
  return [all, ...rest];
});

const filtered = computed(() => {
  const term = store.search.trim().toLowerCase();
  let list = store.records;
  if (store.activeFolder !== 'Todas') list = list.filter((r) => r.folder === store.activeFolder);
  if (term) {
    list = list.filter((r) =>
      [r.title, r.login, r.password, r.url, r.notes, r.folder].some((v) => (v || '').toLowerCase().includes(term))
    );
  }
  return list.map((r) => ({
    ...r,
    initial: (r.title || '?').trim().charAt(0).toUpperCase() || '?',
    color: passwordStrength(r.password).color
  }));
});

const isEmpty = computed(() => store.records.length === 0);
const noResults = computed(() => store.records.length > 0 && filtered.value.length === 0);
</script>

<template>
  <div class="screen" data-screen-label="Cofre">
    <div class="vault-head">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="min-width:0;">
          <div class="vault-title">{{ store.vaultName }}</div>
          <div class="vault-date">
            <span v-if="store.dirty" class="dirty-dot"></span>
            <span v-if="store.dirty">Modificado (não salvo)</span>
            <span v-else-if="store.modified">Modificado em {{ formatStamp(store.modified) }}</span>
            <span v-else>Não salvo ainda</span>
          </div>
        </div>
        <button class="icon-btn" @click="store.showMenu = true"><Icon name="more-vertical" :size="22" /></button>
      </div>

      <div class="field" style="margin-top: 14px;">
        <span class="icn"><Icon name="search" :size="20" /></span>
        <input class="flat" v-model="store.search" placeholder="Buscar por título, login, senha, URL…" />
      </div>

      <div class="chips" style="margin-top: 12px;">
        <button
          v-for="c in chips"
          :key="c.name"
          class="chip"
          :class="{ active: store.activeFolder === c.name }"
          @click="store.activeFolder = c.name"
        >{{ c.label }}</button>
      </div>
    </div>

    <div class="screen-scroll scroll" style="position: static; flex: 1; padding: 4px 16px 120px;">
      <div v-if="isEmpty" class="empty-state">
        <div class="empty-ico"><Icon name="key-off" :size="36" /></div>
        <div class="empty-title">Cofre vazio</div>
        <div class="empty-sub">Toque no botão <strong>+</strong> para adicionar seu primeiro registro de login.</div>
      </div>

      <div v-else-if="noResults" class="empty-state" style="padding-top: 60px;">
        <div class="empty-ico"><Icon name="search" :size="34" /></div>
        <div class="empty-title">Nenhum registro encontrado</div>
      </div>

      <div class="list">
        <div v-for="r in filtered" :key="r.id" class="rec-card">
          <button class="rec-open" @click="openRecord(r.id)">
            <div class="rec-avatar">{{ r.initial }}</div>
            <div class="grow">
              <div class="rec-titly">
                <span class="rec-title">{{ r.title }}</span>
                <span class="rec-dot" :style="{ background: r.color }"></span>
              </div>
              <div class="rec-login">{{ r.login || 'sem login' }}</div>
            </div>
          </button>
          <button class="rec-copy" @click="copyText(r.password, 'Senha copiada')" title="Copiar senha">
            <Icon name="copy" :size="19" />
          </button>
        </div>
      </div>
    </div>

    <button class="fab" @click="newRecord"><Icon name="plus" :size="30" /></button>
  </div>
</template>
