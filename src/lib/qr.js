// Divide o cofre binário em partes que cabem em QR codes e remonta na leitura.
// Cada QR carrega o texto "COFRE:" + Base45(id do conjunto(4) | índice(1) | total(1) | dados).
// Base45 usa só o alfabeto "alfanumérico" do QR (denso) e é texto puro, o que
// permite usar o leitor nativo do sistema, que não devolve bytes crus.

const B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const B45_MAP = new Map([...B45].map((c, i) => [c, i]));

export const QR_PREFIX = 'COFRE:';
// Bytes do cofre por QR code. Menor = códigos menos densos (leitura mais fácil), mais páginas.
export const CHUNK_BYTES = 500;
const FRAME_HEADER = 6;
const MAX_PARTS = 255;

export function base45Encode(bytes) {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const n = bytes[i] * 256 + bytes[i + 1];
    out += B45[n % 45] + B45[Math.floor(n / 45) % 45] + B45[Math.floor(n / 2025)];
  }
  if (bytes.length % 2) {
    const n = bytes[bytes.length - 1];
    out += B45[n % 45] + B45[Math.floor(n / 45)];
  }
  return out;
}

export function base45Decode(str) {
  if (str.length % 3 === 1) throw new Error('Base45 inválido');
  const out = new Uint8Array(Math.floor(str.length / 3) * 2 + (str.length % 3 ? 1 : 0));
  let o = 0;
  for (let i = 0; i < str.length; i += 3) {
    const c = B45_MAP.get(str[i]);
    const d = B45_MAP.get(str[i + 1]);
    if (c === undefined || d === undefined) throw new Error('Base45 inválido');
    if (i + 2 < str.length) {
      const e = B45_MAP.get(str[i + 2]);
      if (e === undefined) throw new Error('Base45 inválido');
      const n = c + d * 45 + e * 2025;
      if (n > 0xffff) throw new Error('Base45 inválido');
      out[o++] = n >> 8;
      out[o++] = n & 0xff;
    } else {
      const n = c + d * 45;
      if (n > 0xff) throw new Error('Base45 inválido');
      out[o++] = n;
    }
  }
  return out;
}

// bytes -> lista de textos (um por QR code), ou null se o cofre não couber
export function splitToQrTexts(bytes) {
  const total = Math.max(1, Math.ceil(bytes.length / CHUNK_BYTES));
  if (total > MAX_PARTS) return null;
  const size = Math.ceil(bytes.length / total); // partes equilibradas: todos os QR com a mesma densidade
  const setId = crypto.getRandomValues(new Uint8Array(4));
  const texts = [];
  for (let i = 0; i < total; i++) {
    const data = bytes.subarray(i * size, (i + 1) * size);
    const frame = new Uint8Array(FRAME_HEADER + data.length);
    frame.set(setId, 0);
    frame[4] = i;
    frame[5] = total;
    frame.set(data, FRAME_HEADER);
    texts.push(QR_PREFIX + base45Encode(frame));
  }
  return texts;
}

// texto lido de um QR -> { setId, index, total, data } ou null se não for parte de um cofre
export function parseQrText(text) {
  if (typeof text !== 'string' || !text.startsWith(QR_PREFIX)) return null;
  let frame;
  try { frame = base45Decode(text.slice(QR_PREFIX.length)); }
  catch (e) { return null; }
  if (frame.length <= FRAME_HEADER) return null;
  const index = frame[4];
  const total = frame[5];
  if (!total || index >= total) return null;
  const setId = [...frame.subarray(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { setId, index, total, data: frame.slice(FRAME_HEADER) };
}

export function qrSetId(text) {
  const p = parseQrText(text);
  return p ? p.setId : '';
}

// partes (na ordem do índice) -> bytes do cofre
export function joinParts(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
