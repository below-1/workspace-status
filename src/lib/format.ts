const id = new Intl.NumberFormat('id-ID');
const pct = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtInt(value: number): string {
  return id.format(value);
}

export function fmtPct(value: number): string {
  return `${pct.format(value)}%`;
}

export function fmtRatio(processed: number, total: number): string {
  return fmtPct(total ? (processed / total) * 100 : 0);
}
