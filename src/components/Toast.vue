<script setup>
import Icon from './Icon.vue';
import { store } from '../lib/store.js';
</script>

<template>
  <div v-if="store.toast" class="toast">
    <span class="icn"><Icon name="check-circle" :size="18" /></span>
    {{ store.toast }}
  </div>
</template>
