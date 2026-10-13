// Nuvem opcional (repositório `cloud-blob-api`).
// O cofre é cifrado aqui, no navegador. A senha mestra nunca sai do dispositivo: a API
// recebe apenas `authKey` (para provar quem está pedindo) e um blob que ela não consegue ler.

export class CloudError extends Error {
  // code: 'auth' | 'taken' | 'conflict' | 'limit' | 'invalid' | 'network'
  // rev: revisão guardada na nuvem, quando code é 'conflict'
  constructor(code, rev) {
    super(code);
    this.name = 'CloudError';
    this.code = code;
    this.rev = rev;
  }
}

export const MIN_PASSWORD = 8;
export const normalizeId = (id) => (id || '').trim().toLowerCase();
export const isValidId = (id) => /^[a-z0-9_.-]{3,32}$/.test(id);

/* ---------- Ids recentes (só o id, nunca a senha) ---------- */
const RECENT_IDS_KEY = 'cofre-cloud-ids';
const RECENT_IDS_MAX = 5;

export function recentCloudIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_IDS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : [];
  } catch { return []; }
}
function rememberCloudId(id) {
  try {
    const ids = [id, ...recentCloudIds().filter((other) => other !== id)].slice(0, RECENT_IDS_MAX);
    localStorage.setItem(RECENT_IDS_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

const apiUrl = () => (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const cloudEnabled = () => apiUrl() !== '';

// A API é compartilhada com outros apps; o prefixo evita que dois apps colidam no mesmo
// documento se o usuário usar o mesmo id nos dois. O id da sessão nunca leva o prefixo.
const WIRE_PREFIX = 'pwd-';
const wireId = (id) => `${WIRE_PREFIX}${id}`;

const MESSAGES = {
  auth: 'Id ou senha incorretos',
  taken: 'Este id já está em uso. Escolha outro',
  conflict: 'A nuvem tem uma versão mais recente deste cofre',
  limit: 'Muitas tentativas. Aguarde alguns minutos',
  invalid: 'Não foi possível ler os dados salvos na nuvem',
  network: 'Não foi possível conectar à nuvem'
};
export const cloudMessage = (e) => MESSAGES[e instanceof CloudError ? e.code : 'network'];

/* ---------- base64url ---------- */
function toB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
const utf8 = (s) => new TextEncoder().encode(s);

/* ---------- chaves e cifra ---------- */
// Mudar a derivação ou o formato do blob torna ilegíveis os cofres já salvos na nuvem:
// crie uma nova versão (`v`) e continue lendo a anterior.
async function deriveKeys(id, password) {
  const subtle = crypto.subtle;
  const salt = utf8(`cofre-senhas:v1:${id}`);
  const pass = await subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const master = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 },
    pass,
    256
  );
  // duas chaves independentes da mesma senha: conhecer authKey não revela encKey
  const hkdf = await subtle.importKey('raw', master, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const params = (info) => ({ name: 'HKDF', hash: 'SHA-256', salt, info: utf8(info) });
  const authKey = toB64(new Uint8Array(await subtle.deriveBits(params('auth'), hkdf, 256)));
  const encKey = await subtle.deriveKey(
    params('enc'),
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return { authKey, encKey };
}

async function encrypt(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(JSON.stringify(data)));
  return { v: 1, iv: toB64(iv), data: toB64(new Uint8Array(cipher)) };
}

async function decrypt(key, blob) {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(blob.iv) },
      key,
      fromB64(blob.data)
    );
    const data = JSON.parse(new TextDecoder().decode(plain));
    if (!data || !Array.isArray(data.records)) throw new Error('Conteúdo inesperado');
    return data;
  } catch {
    throw new CloudError('invalid');
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new CloudError('network');
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;
  if (res.status === 401) throw new CloudError('auth');
  if (res.status === 429) throw new CloudError('limit');
  if (res.status === 409) {
    throw data.error === 'taken' ? new CloudError('taken') : new CloudError('conflict', data.rev);
  }
  throw new CloudError('network');
}

/* ---------- API pública ---------- */
// Sessão: { id, authKey, encKey, rev } — existe somente em memória.
// `vault` é o schema do projeto ({ records }) acrescido de `modified`.

export async function openCloud(rawId, password) {
  const id = normalizeId(rawId);
  const keys = await deriveKeys(id, password);
  const { blob, rev } = await request('POST', `/v1/profiles/${encodeURIComponent(wireId(id))}/open`, {
    authKey: keys.authKey
  });
  rememberCloudId(id);
  return { data: await decrypt(keys.encKey, blob), session: { id, ...keys, rev } };
}

export async function createCloud(rawId, password, vault) {
  const id = normalizeId(rawId);
  const keys = await deriveKeys(id, password);
  const blob = await encrypt(keys.encKey, vault);
  const { rev } = await request('POST', '/v1/profiles', { id: wireId(id), authKey: keys.authKey, blob });
  rememberCloudId(id);
  return { id, ...keys, rev };
}

// Falha com CloudError 'conflict' quando o cofre foi salvo de outro lugar depois de
// `session.rev`; salvar de novo com a revisão que o erro carrega sobrescreve essa versão.
export async function saveCloud(session, vault) {
  const blob = await encrypt(session.encKey, vault);
  const { rev } = await request('PUT', `/v1/profiles/${encodeURIComponent(wireId(session.id))}`, {
    authKey: session.authKey,
    blob,
    rev: session.rev
  });
  return { ...session, rev };
}
