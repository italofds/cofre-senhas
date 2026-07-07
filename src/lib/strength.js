// Indicador de força de senha (heurística leve, sem dependências).
export function passwordStrength(pw) {
  if (!pw) return { level: -1, pct: 0, color: '#333937', label: '—' };
  const len = pw.length;
  let score = 0;
  if (len >= 8) score++;
  if (len >= 12) score++;
  if (len >= 16) score++;
  let types = 0;
  if (/[a-z]/.test(pw)) types++;
  if (/[A-Z]/.test(pw)) types++;
  if (/[0-9]/.test(pw)) types++;
  if (/[^a-zA-Z0-9]/.test(pw)) types++;
  score += Math.max(0, types - 1);

  let level;
  if (len < 6 || score <= 1) level = 0;
  else if (score <= 2) level = 1;
  else if (score <= 4) level = 2;
  else level = 3;

  const map = [
    { pct: 26, color: '#c85c4e', label: 'Fraca' },
    { pct: 52, color: '#c99a3f', label: 'Razoável' },
    { pct: 78, color: '#2c9e82', label: 'Boa' },
    { pct: 100, color: '#37b896', label: 'Forte' }
  ];
  return { level, ...map[level] };
}
