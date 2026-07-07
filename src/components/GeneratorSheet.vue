<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import { store, regenerate, toggleGenOption, applyGenerated } from '../lib/store.js';
import { passwordStrength } from '../lib/strength.js';

const strength = computed(() => passwordStrength(store.gen.value));
const options = [
  { key: 'lower', label: 'a-z' },
  { key: 'upper', label: 'A-Z' },
  { key: 'numbers', label: '0-9' },
  { key: 'symbols', label: '!@#' }
];

function onLen(e) {
  store.gen.length = +e.target.value;
  regenerate();
}
function close() { store.showGenerator = false; }
</script>

<template>
  <div>
    <div class="sheet-overlay" @click="close"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <div class="sheet-title">Gerador de senha</div>
        <button class="icon-btn" style="width:34px;height:34px;border:none;background:var(--card-2);" @click="close">
          <Icon name="x" :size="19" />
        </button>
      </div>

      <div class="gen-display">
        <div class="gen-value">{{ store.gen.value }}</div>
        <button class="gen-refresh" @click="regenerate"><Icon name="refresh" :size="22" /></button>
      </div>
      <div class="strength-row">
        <div class="strength-track">
          <div class="strength-fill" :style="{ width: strength.pct + '%', background: strength.color }"></div>
        </div>
        <span class="strength-label" :style="{ color: strength.color }">{{ strength.label }}</span>
      </div>

      <div class="gen-len-row">
        <span style="font-size: 13.5px; color: var(--text-2); font-weight: 600;">Tamanho</span>
        <span class="gen-len-val">{{ store.gen.length }}</span>
      </div>
      <input type="range" min="8" max="40" :value="store.gen.length" @input="onLen" />

      <div class="opt-row">
        <button
          v-for="o in options"
          :key="o.key"
          class="opt-btn"
          :class="{ on: store.gen[o.key] }"
          @click="toggleGenOption(o.key)"
        >{{ o.label }}</button>
      </div>

      <button class="primary-btn" style="margin-top: 20px;" @click="applyGenerated">
        <Icon name="check" :size="20" /> Usar esta senha
      </button>
    </div>
  </div>
</template>
