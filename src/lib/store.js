import { reactive } from 'vue';
import { generatePassword, DEFAULT_SYMBOLS } from './generator.js';

const DEFAULT_FOLDERS = ['Pessoal', 'Trabalho', 'Financeiro'];

function emptyDraft(folder = 'Pessoal') {
  return { title: '', login: '', password: '', url: '', notes: '', folder };
}

export const store = reactive({
  // navegação
  screen: 'start',
  history: [],

  // dados do cofre (SOMENTE em memória — nunca persistidos em disco/local)
  records: [],
  folders: [...DEFAULT_FOLDERS],
  vaultName: '',
  modified: null,
  dirty: false,
  fileHandle: null,

  // UI
  search: '',
  activeFolder: 'Todas',
  draft: emptyDraft(),
  editingId: null,
  showPassword: false,
  showMenu: false,
  showGenerator: false,
  gen: { length: 16, lower: true, upper: true, numbers: true, symbols: true, symbolSet: DEFAULT_SYMBOLS, value: '' },

  // fluxo de abertura
  pendingOpen: null, // { name, envelope, handle }
  unlockError: '',

  toast: ''
});

/* ---------- navegação ---------- */
export function navigate(screen) {
  store.history.push(store.screen);
  store.screen = screen;
}
export function back() {
  store.screen = store.history.pop() || 'start';
}

/* ---------- toast ---------- */
let toastTimer;
export function showToast(msg) {
  store.toast = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { store.toast = ''; }, 1800);
}

/* ---------- zera tudo (ao fechar o app ou bloquear) ---------- */
export function wipe() {
  store.records = [];
  store.folders = [...DEFAULT_FOLDERS];
  store.vaultName = '';
  store.modified = null;
  store.dirty = false;
  store.fileHandle = null;
  store.search = '';
  store.activeFolder = 'Todas';
  store.draft = emptyDraft();
  store.editingId = null;
  store.showPassword = false;
  store.showMenu = false;
  store.showGenerator = false;
  store.pendingOpen = null;
  store.unlockError = '';
  store.history = [];
  store.screen = 'start';
}

/* ---------- carregar dados descriptografados ---------- */
export function loadData(data, name, handle, modified) {
  const recs = Array.isArray(data && data.records) ? data.records : [];
  store.records = recs.map((r, i) => ({
    id: Date.now() + i,
    title: r.title || '',
    login: r.login || '',
    password: r.password || '',
    url: r.url || '',
    notes: r.notes || '',
    folder: r.folder || 'Pessoal'
  }));
  const seen = new Set();
  const folders = [];
  store.records.forEach((r) => { if (r.folder && !seen.has(r.folder)) { seen.add(r.folder); folders.push(r.folder); } });
  if (folders.length === 0) folders.push('Pessoal');
  store.folders = folders;
  store.vaultName = name || 'Nova lista';
  store.fileHandle = handle || null;
  store.modified = modified || null;
  store.dirty = false;
  store.activeFolder = 'Todas';
  store.search = '';
}

/* ---------- exportação (schema fixo do projeto) ---------- */
export function toVaultData() {
  return {
    records: store.records.map(({ title, login, password, url, notes, folder }) => ({
      title, login, password, url, notes, folder
    }))
  };
}
// JSON sem senha (mantém o schema, com password vazio)
export function toExportDataNoPasswords() {
  return {
    records: store.records.map(({ title, login, url, notes, folder }) => ({
      title, login, password: '', url, notes, folder
    }))
  };
}

/* ---------- registros ---------- */
export function openRecord(id) {
  const r = store.records.find((x) => x.id === id);
  if (!r) return;
  store.draft = { ...r };
  store.editingId = id;
  store.showPassword = false;
  navigate('record');
}
export function newRecord() {
  const f = store.activeFolder !== 'Todas' ? store.activeFolder : (store.folders[0] || 'Pessoal');
  store.draft = emptyDraft(f);
  store.editingId = null;
  store.showPassword = false;
  navigate('record');
}
export function saveDraft() {
  if (!store.draft.title.trim()) { showToast('Informe um título'); return; }
  if (store.editingId != null) {
    const i = store.records.findIndex((r) => r.id === store.editingId);
    if (i >= 0) store.records[i] = { ...store.draft, id: store.editingId };
  } else {
    store.records.push({ ...store.draft, id: Date.now() });
  }
  store.dirty = true;
  back();
  showToast('Registro salvo');
}
export function removeRecord() {
  store.records = store.records.filter((r) => r.id !== store.editingId);
  store.dirty = true;
  back();
  showToast('Registro excluído');
}

/* ---------- pastas ---------- */
export function addFolder(name) {
  const n = (name || '').trim();
  if (!n) return false;
  if (store.folders.includes(n)) { showToast('Pasta já existe'); return false; }
  store.folders.push(n);
  showToast('Pasta criada');
  return true;
}
export function renameFolder(oldName, newName) {
  const nn = (newName || '').trim();
  if (!nn || nn === oldName) return;
  if (store.folders.includes(nn)) { showToast('Nome já existe'); return; }
  store.folders = store.folders.map((f) => (f === oldName ? nn : f));
  store.records.forEach((r) => { if (r.folder === oldName) r.folder = nn; });
  if (store.activeFolder === oldName) store.activeFolder = nn;
  store.dirty = true;
  showToast('Pasta renomeada');
}
export function deleteFolder(name) {
  store.folders = store.folders.filter((f) => f !== name);
  const fallback = store.folders[0] || 'Sem pasta';
  store.records.forEach((r) => { if (r.folder === name) r.folder = fallback; });
  if (store.activeFolder === name) store.activeFolder = 'Todas';
  store.dirty = true;
  showToast('Pasta excluída');
}

/* ---------- gerador ---------- */
export function regenerate() {
  store.gen.value = generatePassword(store.gen);
}
export function toggleGenOption(key) {
  const g = store.gen;
  g[key] = !g[key];
  if (!g.lower && !g.upper && !g.numbers && !g.symbols) g[key] = true;
  regenerate();
}
export function applyGenerated() {
  store.draft.password = store.gen.value;
  store.showPassword = true;
  store.showGenerator = false;
  showToast('Senha aplicada');
}

/* ---------- utilidades ---------- */
export function copyText(text, label) {
  const done = () => showToast(label || 'Copiado');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text || '').then(done).catch(done);
  } else {
    done();
  }
}
export function suggestedFileName() {
  const base = (store.vaultName || 'meu-cofre').replace(/\.cofre$/i, '');
  if (/\.cofre$/i.test(store.vaultName)) return store.vaultName;
  return base.trim().replace(/\s+/g, '-').toLowerCase() + '.cofre';
}
export function formatStamp(iso) {
  const d = iso ? new Date(iso) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}
