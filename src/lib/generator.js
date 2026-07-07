// Gerador de senha randômica usando crypto.getRandomValues (CSPRNG).
export const DEFAULT_SYMBOLS = '!@#$%&_-+=?';

function randInt(max) {
  // amostragem sem viés de módulo
  const limit = Math.floor(0xffffffff / max) * max;
  const a = new Uint32Array(1);
  let x;
  do { crypto.getRandomValues(a); x = a[0]; } while (x >= limit);
  return x % max;
}

export function generatePassword(opts = {}) {
  const {
    length = 16,
    lower = true,
    upper = true,
    numbers = true,
    symbols = true,
    symbolSet = DEFAULT_SYMBOLS
  } = opts;

  const low = 'abcdefghijklmnopqrstuvwxyz';
  const up = low.toUpperCase();
  const num = '0123456789';

  const sets = [];
  if (lower) sets.push(low);
  if (upper) sets.push(up);
  if (numbers) sets.push(num);
  if (symbols) sets.push(symbolSet);
  if (!sets.length) return '';

  const all = sets.join('');
  const out = [];
  // garante ao menos 1 de cada conjunto escolhido
  for (const s of sets) out.push(s[randInt(s.length)]);
  while (out.length < length) out.push(all[randInt(all.length)]);
  out.length = Math.min(out.length, length);
  // embaralha (Fisher-Yates)
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out.join('');
}
