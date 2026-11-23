import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmtInt } from '@/lib/format';

interface Finding {
  code: string;
  active: number;
  fixed: number;
}

interface InvalidNip {
  nip: string;
  defects: string[];
}

interface NipLookupRecord {
  nip: string;
  nama: string;
  unit: string;
  satuan_kerja: string;
  jenjang: string;
  status: string;
  errors: string[];
}

interface EmailRecord {
  id: string;
  received_on: string;
  received_at?: string;
  sender_email: string;
  outcome: string;
  reasons: string[];
  excel_count: number;
  pdf_count: number;
  rows_parsed: number;
  active_findings: number;
  fixed_findings: number;
  findings: Finding[];
  invalid_nips: InvalidNip[];
  mixed_unit_count: number;
}

interface EmailLogResponse {
  records: EmailRecord[];
}

const OUTCOME_LABELS: Record<string, string> = {
  valid: 'Berkas valid',
  no_excel: 'Tanpa lampiran Excel',
  excel_unreadable: 'Excel tidak terbaca',
  template: 'Excel tidak sesuai template',
  nip: 'NIP tidak valid',
  pdf: 'PDF tidak valid',
};

const REASON_LABELS: Record<string, string> = {
  ...OUTCOME_LABELS,
  missing_ni: 'NIP kosong',
  non_numeric_ni: 'NIP bukan angka',
  wrong_length_ni: 'Panjang NIP salah',
  trailing_000_ni: 'NIP berakhiran 000',
  unregistered_ni: 'NIP tidak terdaftar',
  numeric_cell_ni: 'NIP tersimpan sebagai angka',
  duplicate_ni_diff_name: 'NIP ganda beda nama',
};

const TEMPLATE_URL = 'https://s.id/usulperpanjangan2026';

const nipLookupCache = new Map<string, Promise<Record<string, NipLookupRecord>>>();

function loadNipLookup(url: string): Promise<Record<string, NipLookupRecord>> {
  let pending = nipLookupCache.get(url);
  if (!pending) {
    pending = fetch(url, { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Gagal memuat detail NIP (${response.status}).`);
        return response.json();
      })
      .then((payload: { records?: NipLookupRecord[] }) =>
        Object.fromEntries((payload.records ?? []).map((record) => [record.nip, record])),
      );
    nipLookupCache.set(url, pending);
  }
  return pending;
}

function formatDateTime(value: string): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const formatted = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Makassar',
  }).format(parsed);
  return `${formatted} WITA`;
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  return (
    <Badge variant={outcome === 'valid' ? 'default' : 'secondary'}>
      {OUTCOME_LABELS[outcome] ?? outcome}
    </Badge>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function EmailDetail({
  record,
  lookupUrl,
  nipPageUrl,
}: {
  record: EmailRecord;
  lookupUrl: string;
  nipPageUrl: string;
}) {
  const [nipDetails, setNipDetails] = React.useState<Record<string, NipLookupRecord>>({});
  const [nipLoading, setNipLoading] = React.useState(false);
  const [nipError, setNipError] = React.useState('');

  React.useEffect(() => {
    if (!record.invalid_nips.length) return;
    let active = true;
    setNipLoading(true);
    setNipError('');
    loadNipLookup(lookupUrl)
      .then((lookup) => {
        if (active) setNipDetails(lookup);
      })
      .catch((caught) => {
        if (active) {
          setNipError(caught instanceof Error ? caught.message : 'Gagal memuat detail NIP.');
        }
      })
      .finally(() => {
        if (active) setNipLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lookupUrl, record.id, record.invalid_nips.length]);

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Detail validasi email</h2>
          <p className="mt-1 break-all text-sm text-muted-foreground">{record.sender_email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OutcomeBadge outcome={record.outcome} />
          <span className="text-xs text-muted-foreground">
            {formatDateTime(record.received_at || record.received_on)}
          </span>
        </div>
      </div>

      {record.outcome === 'template' ? (
        <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">Excel tidak sesuai template.</p>
          <a
            href={TEMPLATE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex text-primary hover:underline"
          >
            Unduh template Excel yang benar →
          </a>
        </div>
      ) : null}

      <dl className="mt-5">
        <DetailRow label="Lampiran Excel" value={fmtInt(record.excel_count)} />
        <DetailRow label="Lampiran PDF" value={fmtInt(record.pdf_count)} />
        <DetailRow label="Sudah Masuk" value={`${fmtInt(record.rows_parsed)} baris`} />
        <DetailRow label="NIP Invalid" value={fmtInt(record.invalid_nips.length)} />
        <DetailRow label="Temuan sudah diperbaiki" value={fmtInt(record.fixed_findings)} />
      </dl>

      <div className="mt-5">
        <h3 className="text-sm font-medium text-foreground">Temuan</h3>
        {record.findings.length ? (
          <ul className="mt-2 space-y-2">
            {record.findings.map((finding) => (
              <li
                key={finding.code}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
              >
                <span>{REASON_LABELS[finding.code] ?? finding.code}</span>
                <span className="text-xs text-muted-foreground">
                  {finding.active ? `${fmtInt(finding.active)} aktif` : null}
                  {finding.active && finding.fixed ? ' · ' : null}
                  {finding.fixed ? `${fmtInt(finding.fixed)} diperbaiki` : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            Tidak ada temuan NIP pada berkas email ini.
          </p>
        )}
      </div>

      {record.invalid_nips.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-foreground">
            NIP invalid ({fmtInt(record.invalid_nips.length)})
          </h3>
          {nipLoading ? (
            <p className="mt-2 text-xs text-muted-foreground">Memuat detail NIP…</p>
          ) : null}
          {nipError ? <p className="mt-2 text-xs text-muted-foreground">{nipError}</p> : null}
          <ul className="mt-2 divide-y rounded-lg border bg-card">
            {record.invalid_nips.map((item, index) => {
              const lookupKey = item.nip.replace(/\D/g, '') || item.nip;
              const detail = nipDetails[lookupKey];
              return (
                <li key={`${item.nip}-${index}`} className="px-3 py-3 text-sm">
                  {item.nip ? (
                    <a
                      href={`${nipPageUrl}?nip=${encodeURIComponent(lookupKey)}`}
                      className="break-all font-mono text-xs text-primary hover:underline"
                    >
                      {item.nip}
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-foreground">NIP kosong</span>
                  )}
                  <dl className="mt-2 space-y-1 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Nama</dt>
                      <dd className="font-medium text-foreground">{detail?.nama || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Unit</dt>
                      <dd className="font-medium text-foreground">{detail?.satuan_kerja || '—'}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {record.mixed_unit_count > 0 ? (
        <div className="mt-5 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">
            NIP dari satuan lain di berkas ini: {fmtInt(record.mixed_unit_count)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Informasi saja. Jumlah ini tidak membuat email menjadi tidak valid.
          </p>
        </div>
      ) : null}

      <p className="mt-5 text-xs text-muted-foreground">
        <strong>Sudah Masuk</strong> adalah jumlah baris Excel yang berhasil dibaca dari email ini.{' '}
        <strong>NIP Invalid</strong> adalah jumlah NIP unik dengan temuan ACTIVE.
      </p>
    </section>
  );
}

interface Props {
  dataUrl: string;
  lookupUrl: string;
  nipPageUrl: string;
}

export default function EmailLogTable({ dataUrl, lookupUrl, nipPageUrl }: Props) {
  const [records, setRecords] = React.useState<EmailRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [searched, setSearched] = React.useState(false);
  const [searchError, setSearchError] = React.useState('');
  const [matches, setMatches] = React.useState<EmailRecord[]>([]);
  const [detail, setDetail] = React.useState<EmailRecord | null>(null);

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(dataUrl, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Gagal memuat data (${response.status}).`);
        const payload = (await response.json()) as EmailLogResponse;
        if (active) {
          setRecords(
            (payload.records ?? []).map((record) => ({
              ...record,
              sender_email: record.sender_email ?? '',
              findings: record.findings ?? [],
              invalid_nips: record.invalid_nips ?? [],
              mixed_unit_count: record.mixed_unit_count ?? 0,
            })),
          );
        }
      } catch (caught) {
        if (active) setLoadError(caught instanceof Error ? caught.message : 'Gagal memuat data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [dataUrl]);

  function runSearch(rawInput: string) {
    const needle = rawInput.trim().toLowerCase();
    setSearched(false);
    setMatches([]);
    setDetail(null);
    if (!needle) {
      setSearchError('Masukkan alamat email pengirim terlebih dahulu.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(needle)) {
      setSearchError('Masukkan alamat email yang valid.');
      return;
    }
    setSearchError('');
    setSearched(true);
    const found = records
      .filter((record) => record.sender_email.toLowerCase() === needle)
      .sort((left, right) => {
        const byDate = (right.received_at || right.received_on).localeCompare(
          left.received_at || left.received_on,
        );
        return byDate || right.id.localeCompare(left.id);
      });
    setMatches(found);
    setDetail(found[0] ?? null);
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(query);
  }

  function reset() {
    setQuery('');
    setSearched(false);
    setSearchError('');
    setMatches([]);
    setDetail(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Cari email pengirim
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              placeholder="nama@contoh.com"
              className="h-10 rounded-md border border-input bg-card px-3 text-base text-foreground placeholder:font-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? 'Memuat…' : 'Cari'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            disabled={!query && !searched}
          >
            Reset
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Masukkan alamat email pengirim secara lengkap. Pencarian harus sama persis.
        </p>
        {searchError && <p className="mt-3 text-sm text-muted-foreground">{searchError}</p>}
        {loadError && <p className="mt-3 text-sm text-muted-foreground">{loadError}</p>}
      </section>

      {loading ? (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          Memuat data email…
        </div>
      ) : null}

      {!loading && !loadError && searched && !searchError && matches.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Email tidak ditemukan.</p>
          <p className="mt-2">
            Periksa kembali alamat email pengirim. Jika email sudah dikirim dengan alamat ini,
            pastikan subjek email sesuai dengan ketentuan.
          </p>
        </div>
      ) : null}

      {!loading && !loadError && detail ? (
        <>
          {matches.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              Ditemukan {fmtInt(matches.length)} email dari alamat ini. Detail di bawah adalah
              email terbaru.
            </p>
          ) : null}
          <EmailDetail record={detail} lookupUrl={lookupUrl} nipPageUrl={nipPageUrl} />
        </>
      ) : null}
    </div>
  );
}
