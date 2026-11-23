export function readQueryParam(name: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

export function writeQueryParam(name: string, value: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const trimmed = value.trim();
  if (trimmed) url.searchParams.set(name, trimmed);
  else url.searchParams.delete(name);
  window.history.replaceState(window.history.state, '', url);
}
