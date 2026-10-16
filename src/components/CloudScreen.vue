<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Icon from './Icon.vue';
import { store, loadData, showToast, toCloudData, setCloudSession, cloudSaved } from '../lib/store.js';
import { passwordStrength } from '../lib/strength.js';
import {
  CloudError, cloudMessage, createCloud, openCloud, saveCloud,
  isValidId, normalizeId, recentCloudIds, MIN_PASSWORD
} from '../lib/cloud.js';

const router = useRouter();

const isNew = useRoute().name === 'cloudSave';
const recentIds = recentCloudIds();

const id = ref(isNew ? '' : recentIds[0] || '');
const master = ref('');
const confirm = ref('');
const show = ref(false);
const busy = ref(false);

const strength = computed(() => passwordStrength(master.value));
const mismatch = computed(() => isNew && confirm.value.length > 0 && master.value !== confirm.value);
const valid = computed(() =>
  isValidId(normalizeId(id.value)) &&
  master.value.length >= MIN_PASSWORD &&
  (!isNew || master.value === confirm.value)
);

async function open() {
  const { data, session } = await openCloud(id.value, master.value);
  loadData(data, session.id, null, data.modified);
  setCloudSession(session);
  router.replace({ name: 'vault' });
  showToast('Cofre desbloqueado');
}

async function create() {
  const data = toCloudData();
  let session;
  try {
    session = await createCloud(id.value, master.value, data);
  } catch (taken) {
    if (!(taken instanceof CloudError) || taken.code !== 'taken') throw taken;
    // o id existe: só oferece substituir se a senha for a daquela conta
    const existing = await openCloud(id.value, master.value).catch((e) => {
      throw e instanceof CloudError && e.code === 'auth' ? taken : e;
    });
    const sure = window.confirm(`Já existe um cofre salvo em "${existing.session.id}". Substituir pelo cofre atual?`);
    if (!sure) return;
    session = await saveCloud(existing.session, data);
  }
  cloudSaved(session, data);
  router.back();
  showToast('Salvo na nuvem');
}

async function submit() {
  if (!valid.value || busy.value) return;
  busy.value = true;
  try {
    await (isNew ? create() : open());
    master.value = '';
    confirm.value = '';
  } catch (e) {
    showToast(cloudMessage(e));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="screen" :data-screen-label="isNew ? 'Salvar na nuvem' : 'Abrir da nuvem'">
    <div class="topbar">
      <button class="top-back" @click="router.back()"><Icon name="arrow-left" :size="24" /></button>
      <div class="top-title">{{ isNew ? 'Salvar na nuvem' : 'Abrir da nuvem' }}</div>
      <span style="width: 40px;"></span>
    </div>

    <div class="screen-scroll scroll" style="position: static; flex: 1; padding: 16px 22px 40px;">
      <div class="field-label" style="margin: 8px 2px 8px;">ID DO USUÁRIO</div>
      <div class="field">
        <span class="icn"><Icon name="cloud" :size="19" /></span>
        <input
          class="flat"
          type="text"
          v-model="id"
          maxlength="32"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          placeholder="Ex.: maria.silva"
          :list="recentIds.length ? 'cloud-recent-ids' : undefined"
        />
        <datalist v-if="recentIds.length" id="cloud-recent-ids">
          <option v-for="recentId in recentIds" :key="recentId" :value="recentId" />
        </datalist>
      </div>
      <div v-if="isNew" class="hint" style="margin-top: 8px;">
        De 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.
      </div>

      <div class="field-label" style="margin: 18px 2px 8px;">SENHA MESTRA</div>
      <div class="field">
        <span class="icn"><Icon name="key" :size="19" /></span>
        <input
          class="flat"
          :type="show ? 'text' : 'password'"
          v-model="master"
          :autocomplete="isNew ? 'new-password' : 'current-password'"
          :placeholder="`Mínimo de ${MIN_PASSWORD} caracteres`"
          @keyup.enter="submit"
        />
        <button class="mini" @click="show = !show" style="color: var(--muted);">
          <Icon :name="show ? 'eye-off' : 'eye'" :size="20" />
        </button>
      </div>

      <template v-if="isNew">
        <div class="strength-row">
          <div class="strength-track">
            <div class="strength-fill" :style="{ width: strength.pct + '%', background: strength.color }"></div>
          </div>
          <span class="strength-label" :style="{ color: strength.color }">{{ strength.label }}</span>
        </div>

        <div class="field-label" style="margin: 18px 2px 8px;">CONFIRMAR SENHA MESTRA</div>
        <div class="field">
          <span class="icn"><Icon name="key" :size="19" /></span>
          <input
            class="flat"
            :type="show ? 'text' : 'password'"
            v-model="confirm"
            autocomplete="new-password"
            placeholder="Repita a senha mestra"
            @keyup.enter="submit"
          />
        </div>
        <div v-if="mismatch" class="error-text"><Icon name="alert-circle" :size="16" /> As senhas não coincidem</div>
      </template>

      <div class="info-box" style="margin-top: 22px;">
        <span class="icn"><Icon name="lock" :size="18" /></span>
        <div v-if="isNew">
          O cofre é criptografado com <strong>AES-256-GCM</strong> neste dispositivo antes de ser enviado.
          A senha mestra nunca sai daqui: se você esquecê-la, não há como recuperar os dados.
          Guarde também uma cópia em arquivo <strong>.cofre</strong>.
        </div>
        <div v-else>
          O cofre é baixado criptografado e aberto neste dispositivo.
          A senha mestra nunca é enviada nem armazenada.
        </div>
      </div>

      <button class="primary-btn" style="margin-top: 24px;" :disabled="!valid || busy" @click="submit">
        <Icon :name="isNew ? 'cloud-upload' : 'unlock'" :size="20" />
        {{ busy ? 'Aguarde…' : (isNew ? 'Salvar na nuvem' : 'Abrir cofre') }}
      </button>
    </div>
  </div>
</template>
