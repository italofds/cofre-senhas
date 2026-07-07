// Criptografia real com Web Crypto (nativa do navegador).
// Chave derivada da senha mestra via PBKDF2 (SHA-256) + salt aleatório.
// Conteúdo cifrado com AES-256-GCM (confidencialidade + integridade/autenticação).
// Não há atalho de decriptação: sem a senha mestra, o conteúdo é irrecuperável.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const PBKDF2_ITERATIONS = 310000;
export const COFRE_MAGIC = 'cofre';
export const COFRE_VERSION = 1;

function b64encode(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function b64decode(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password, salt, iterations) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// dataObj -> string JSON do "envelope" .cofre (JSON com metadados + ciphertext base64)
export async function encryptVault(dataObj, password) {
  if (!password) throw new Error('Senha mestra vazia');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = PBKDF2_ITERATIONS;
  const key = await deriveKey(password, salt, iterations);
  const plaintext = enc.encode(JSON.stringify(dataObj));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const envelope = {
    format: COFRE_MAGIC,
    version: COFRE_VERSION,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations,
    salt: b64encode(salt),
    iv: b64encode(iv),
    modified: new Date().toISOString(),
    data: b64encode(cipher)
  };
  return JSON.stringify(envelope);
}

// envelope (objeto ou string) + senha -> objeto JSON descriptografado
export async function decryptVault(envelope, password) {
  const env = typeof envelope === 'string' ? JSON.parse(envelope) : envelope;
  if (!env || env.format !== COFRE_MAGIC) {
    throw new Error('Arquivo não é um cofre válido');
  }
  const salt = b64decode(env.salt);
  const iv = b64decode(env.iv);
  const key = await deriveKey(password, salt, env.iterations || PBKDF2_ITERATIONS);
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, b64decode(env.data));
  } catch (e) {
    throw new Error('Senha mestra incorreta ou arquivo corrompido');
  }
  return JSON.parse(dec.decode(plain));
}

export function readEnvelopeMeta(text) {
  try {
    const env = JSON.parse(text);
    if (env.format === COFRE_MAGIC) return env;
  } catch (e) { /* ignore */ }
  return null;
}
