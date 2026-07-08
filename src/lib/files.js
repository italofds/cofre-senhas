// Camada híbrida de arquivos:
//  - File System Access API quando disponível (Chrome/Edge desktop): salva de
//    verdade no disco e permite reabrir os "recentes" com um toque.
//  - Fallback universal (Android/Firefox/etc.): download para salvar e <input
//    type=file> para abrir. Nesse modo os "recentes" guardam apenas o histórico
//    de nomes (não é possível reabrir automaticamente).

export const hasFSA =
  typeof window !== 'undefined' &&
  'showOpenFilePicker' in window &&
  'showSaveFilePicker' in window;

const COFRE_ACCEPT = [
  { description: 'Arquivo Cofre', accept: { 'application/octet-stream': ['.cofre'] } }
];
const JSON_ACCEPT = [
  { description: 'JSON', accept: { 'application/json': ['.json'] } }
];

/* ---------- IndexedDB: guarda os handles de arquivo (não guarda dados) ---------- */
const DB_NAME = 'cofre-handles';
const STORE = 'handles';

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, val) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

/* ---------- Recentes (metadados em localStorage) ---------- */
const RECENTS_KEY = 'cofre-recents';

export function getRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); }
  catch { return []; }
}
export async function addRecent(name, handle) {
  let list = getRecents().filter((r) => r.name !== name);
  list.unshift({ name, date: new Date().toISOString(), hasHandle: !!handle });
  list = list.slice(0, 6);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  if (handle) { try { await idbSet(name, handle); } catch { /* ignore */ } }
  return list;
}
export function clearRecents() {
  localStorage.removeItem(RECENTS_KEY);
}
export function removeRecent(name) {
  const list = getRecents().filter((r) => r.name !== name);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  return list;
}

/* ---------- Permissões FSA ---------- */
async function ensurePermission(handle, mode = 'read') {
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

/* ---------- Fallback: abrir via <input type=file> ---------- */
function openViaInput(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result) });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
  });
}

/* ---------- Fallback: baixar arquivo ---------- */
export function downloadText(text, filename, type = 'application/octet-stream') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------- API pública ---------- */

// Abre um arquivo .cofre (retorna {name, text, handle} ou null se cancelado)
export async function openCofre() {
  if (hasFSA) {
    let handle;
    try {
      [handle] = await window.showOpenFilePicker({ types: COFRE_ACCEPT, multiple: false });
    } catch (e) {
      if (e && e.name === 'AbortError') return null;
      throw e;
    }
    const file = await handle.getFile();
    const text = await file.text();
    await addRecent(file.name, handle);
    return { name: file.name, text, handle };
  }
  const res = await openViaInput('.cofre');
  if (!res) return null;
  await addRecent(res.name, null);
  return { name: res.name, text: res.text, handle: null };
}

// Abre um JSON descriptografado para importação
export async function openJson() {
  if (hasFSA) {
    let handle;
    try {
      [handle] = await window.showOpenFilePicker({ types: JSON_ACCEPT, multiple: false });
    } catch (e) {
      if (e && e.name === 'AbortError') return null;
      throw e;
    }
    const file = await handle.getFile();
    return { name: file.name, text: await file.text() };
  }
  return openViaInput('.json,application/json');
}

// Salva o envelope .cofre. Reusa handle existente (salvar no mesmo arquivo) quando possível.
// Se a escrita falhar (ex.: arquivo de nuvem no Android), retorna needsFallback: true
// para que a UI ofereça compartilhar via Web Share API ou baixar localmente.
export async function saveCofre(envelopeText, suggestedName, existingHandle) {
  if (hasFSA) {
    let handle = existingHandle || null;
    if (handle && !(await ensurePermission(handle, 'readwrite'))) handle = null;
    if (!handle) {
      try {
        handle = await window.showSaveFilePicker({ suggestedName, types: COFRE_ACCEPT });
      } catch (e) {
        if (e && e.name === 'AbortError') return { handle: existingHandle, name: null, saved: false };
        return { saved: false, needsFallback: true };
      }
    }
    try {
      const writable = await handle.createWritable();
      await writable.write(envelopeText);
      await writable.close();
      await addRecent(handle.name, handle);
      return { handle, name: handle.name, saved: true };
    } catch {
      return { saved: false, needsFallback: true };
    }
  }
  downloadText(envelopeText, suggestedName, 'application/octet-stream');
  await addRecent(suggestedName, null);
  return { handle: null, name: suggestedName, saved: true };
}

// Verifica se o browser suporta compartilhar arquivos via Web Share API (Android/iOS).
export function canShareFiles() {
  if (!navigator.share || !navigator.canShare) return false;
  try { return navigator.canShare({ files: [new File([''], 'test')] }); }
  catch { return false; }
}

// Compartilha o arquivo .cofre via share sheet nativo do sistema operacional.
export async function shareFile(text, filename) {
  const file = new File([text], filename, { type: 'application/octet-stream' });
  await navigator.share({ files: [file], title: filename });
}

// Exporta JSON (download em ambos os modos, é o comportamento esperado)
export async function saveJson(jsonText, suggestedName) {
  if (hasFSA) {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName, types: JSON_ACCEPT });
      const w = await handle.createWritable();
      await w.write(jsonText);
      await w.close();
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
      // se falhar, cai para download
    }
  }
  downloadText(jsonText, suggestedName, 'application/json');
  return true;
}

// Tenta reabrir um recente pelo nome. Se não houver handle utilizável, sinaliza needsManual.
export async function reopenRecent(name) {
  if (!hasFSA) return { needsManual: true };
  let handle;
  try { handle = await idbGet(name); } catch { handle = null; }
  if (!handle) return { needsManual: true };
  if (!(await ensurePermission(handle, 'read'))) return { needsManual: true };
  try {
    const file = await handle.getFile();
    return { name: file.name, text: await file.text(), handle };
  } catch (e) {
    return { needsManual: true };
  }
}
