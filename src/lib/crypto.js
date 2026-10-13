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

/* ---------- Formato binário compacto (exportação em QR codes) ---------- */
// "CFR"(3) | versão(1) | flags(1) | iterações (uint32 BE) | salt(16) | iv(12) | ciphertext + tag GCM
// O cabeçalho entra como dado autenticado (AAD) do AES-GCM: qualquer alteração invalida a leitura.
const BIN_MAGIC = [0x43, 0x46, 0x52];
const BIN_VERSION = 1;
const BIN_FLAG_DEFLATE = 1;
const BIN_HEADER = 37;

async function pipeBytes(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function isBinaryVault(bytes) {
  return !!bytes && bytes.length > BIN_HEADER + 16 && BIN_MAGIC.every((b, i) => bytes[i] === b);
}

// dataObj -> Uint8Array (conteúdo comprimido quando possível, depois cifrado)
export async function encryptVaultBinary(dataObj, password) {
  if (!password) throw new Error('Senha mestra vazia');
  let plaintext = enc.encode(JSON.stringify(dataObj));
  let flags = 0;
  if (typeof CompressionStream !== 'undefined') {
    try {
      const packed = await pipeBytes(plaintext, new CompressionStream('deflate-raw'));
      if (packed.length < plaintext.length) { plaintext = packed; flags |= BIN_FLAG_DEFLATE; }
    } catch (e) { /* sem suporte a deflate-raw: segue sem compressão */ }
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = PBKDF2_ITERATIONS;
  const header = new Uint8Array(BIN_HEADER);
  header.set(BIN_MAGIC, 0);
  header[3] = BIN_VERSION;
  header[4] = flags;
  new DataView(header.buffer).setUint32(5, iterations);
  header.set(salt, 9);
  header.set(iv, 25);
  const key = await deriveKey(password, salt, iterations);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: header }, key, plaintext)
  );
  const out = new Uint8Array(BIN_HEADER + cipher.length);
  out.set(header, 0);
  out.set(cipher, BIN_HEADER);
  return out;
}

// Uint8Array + senha -> objeto JSON descriptografado
export async function decryptVaultBinary(bytes, password) {
  if (!isBinaryVault(bytes) || bytes[3] !== BIN_VERSION) {
    throw new Error('QR codes não formam um cofre válido');
  }
  const header = bytes.slice(0, BIN_HEADER);
  const flags = header[4];
  const iterations = new DataView(header.buffer).getUint32(5);
  const salt = header.slice(9, 25);
  const iv = header.slice(25, 37);
  const key = await deriveKey(password, salt, iterations);
  let plain;
  try {
    plain = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: header }, key, bytes.slice(BIN_HEADER))
    );
  } catch (e) {
    throw new Error('Senha mestra incorreta ou dados corrompidos');
  }
  if (flags & BIN_FLAG_DEFLATE) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Este navegador não consegue descomprimir o cofre');
    }
    plain = await pipeBytes(plain, new DecompressionStream('deflate-raw'));
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
