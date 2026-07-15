export function normalizeApiBaseUrl(rawValue) {
  const fallbackUrl = 'http://localhost:5000/api';
  const value = String(rawValue || '').trim();
  if (!value) return fallbackUrl;

  const trimmed = value.replace(/\/+$/, '');
  if (/\/api$/i.test(trimmed)) return trimmed;
  return `${trimmed}/api`;
}

