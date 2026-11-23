import * as React from "react";

import { Button } from "@/components/ui/button";
import { readQueryParam, writeQueryParam } from "@/lib/query";

interface DefectDetail {
  code: string;
  raw: string;
  detail: string;
}

interface LookupRecord {
  nip: string;
  nama: string;
  nama_berkas: string;
  unit: string;
  satuan_kerja: string;
  jenjang: string;
  status: string;
  errors: string[];
  fixed_errors: string[];
  active_details?: DefectDetail[];
  fixed_details?: DefectDetail[];
  received_on: string;
}

interface LookupResponse {
  records: LookupRecord[];
}

const NIP_LENGTH = 18;
const NIP_PARAM = "nip";

const ERROR_LABELS: Record<string, string> = {
  missing_ni: "NIP kosong pada berkas",
  non_numeric_ni: "NIP memuat karakter selain angka",
  wrong_length_ni: "Panjang NIP tidak 18 digit",
  trailing_000_ni: "NIP berakhiran 000",
  unregistered_ni: "NIP tidak terdaftar pada data master",
  numeric_cell_ni: "NIP tersimpan sebagai sel angka",
  duplicate_ni_diff_name: "NIP dipakai dengan nama berbeda",
};

const ERROR_ACTIONS: Record<string, string> = {
  missing_ni: "Isi kolom NI dengan NIP 18 digit.",
  non_numeric_ni:
    "Hapus spasi, huruf, dan tanda baca; gunakan 18 digit angka.",
  wrong_length_ni: "Periksa kembali NIP; panjang NIP harus 18 digit.",
  trailing_000_ni:
    "Gunakan NIP asli; NIP yang berakhiran 000 tidak dipakai.",
  unregistered_ni:
    "Periksa NIP atau hubungi operator untuk mencocokkan data master.",
  numeric_cell_ni:
    "Ubah format kolom NI menjadi Teks, lalu isi ulang NIP.",
  duplicate_ni_diff_name:
    "Pastikan NIP dan nama pada berkas usulan sudah benar.",
};

function formatDate(value: string): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    parsed,
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value || "—"}</dd>
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-dashed bg-card p-6">
      <p className="font-medium text-foreground">{children}</p>
    </section>
  );
}

function NeedFixDetail({ record }: { record: LookupRecord }) {
  const details = record.active_details?.length
    ? record.active_details
    : record.errors.map((code) => ({ code, raw: "", detail: "" }));

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <h2 className="text-base font-semibold">Data anda belum valid.</h2>
        {record.received_on && (
          <span className="text-xs text-muted-foreground">
            Berkas terakhir: {formatDate(record.received_on)}
          </span>
        )}
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Nama" value={record.nama} />
        <Detail label="NIP" value={record.nip} />
        <Detail label="OPD" value={record.unit} />
        <Detail label="Unit kerja" value={record.satuan_kerja} />
        {record.nama_berkas && (
          <Detail label="Nama pada berkas" value={record.nama_berkas} />
        )}
      </dl>

      <div className="mt-6">
        <h3 className="text-sm font-semibold">Temuan aktif</h3>
        {details.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {details.map((item, index) => {
              const digits = item.raw.replace(/\D/g, "");
              const label = ERROR_LABELS[item.code] ?? item.code;
              return (
                <li
                  key={`${item.code}-${index}`}
                  className="rounded-lg border bg-muted/30 p-4 text-sm"
                >
                  <p className="font-semibold">{label}</p>
                  {item.raw && (
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      NIP pada berkas:{" "}
                      <span className="font-mono text-foreground">
                        {item.raw}
                      </span>
                    </p>
                  )}
                  {digits && digits !== record.nip && (
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      NIP dikenali:{" "}
                      <span className="font-mono text-foreground">
                        {record.nip}
                      </span>
                    </p>
                  )}
                  {item.detail && item.detail !== label && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.detail}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Tindakan:{" "}
                    </span>
                    {ERROR_ACTIONS[item.code] ??
                      "Perbaiki data pada berkas usulan."}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Rincian temuan belum tersedia. Hubungi operator unit kerja.
          </p>
        )}
      </div>
    </section>
  );
}

interface Props {
  dataUrl: string;
}

export default function NipStatusSearch({ dataUrl }: Props) {
  const [query, setQuery] = React.useState("");
  const [record, setRecord] = React.useState<LookupRecord | null>(null);
  const [searched, setSearched] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const cache = React.useRef<LookupRecord[] | null>(null);

  async function loadRecords(): Promise<LookupRecord[]> {
    if (cache.current) return cache.current;
    const response = await fetch(dataUrl, { cache: "no-cache" });
    if (!response.ok)
      throw new Error(`Gagal memuat data (${response.status}).`);
    const payload = (await response.json()) as LookupResponse;
    cache.current = payload.records ?? [];
    return cache.current;
  }

  async function runSearch(rawInput: string, updateUrl = true) {
    const raw = rawInput.trim();
    if (updateUrl) writeQueryParam(NIP_PARAM, raw);
    setQuery(raw);
    if (!raw) {
      setError("Masukkan NIP terlebih dahulu.");
      setRecord(null);
      setSearched(false);
      return;
    }
    if (!/^[\d\s.-]+$/.test(raw)) {
      setError("NIP hanya boleh berisi angka.");
      setRecord(null);
      setSearched(false);
      return;
    }

    const digits = raw.replace(/\D/g, "");
    if (digits.length !== NIP_LENGTH) {
      setError(`NIP harus ${NIP_LENGTH} digit.`);
      setRecord(null);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const records = await loadRecords();
      setRecord(records.find((item) => item.nip === digits) ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat data.");
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query);
  }

  React.useEffect(() => {
    const initial = readQueryParam(NIP_PARAM);
    if (initial) void runSearch(initial, false);
  }, []);

  React.useEffect(() => {
    function onPopState() {
      const value = readQueryParam(NIP_PARAM);
      if (value) void runSearch(value, false);
      else clearSearch();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function clearSearch() {
    setQuery("");
    setRecord(null);
    setSearched(false);
    setError("");
  }

  function reset() {
    clearSearch();
    writeQueryParam(NIP_PARAM, "");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Cari NIP
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="Masukkan 18 digit NIP"
              className="h-10 rounded-md border border-input bg-card px-3 text-base text-foreground placeholder:font-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? "Mencari…" : "Cari"}
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
          Pencarian berdasarkan NIP secara persis. Nama tidak digunakan untuk
          mencari data.
        </p>
        {error && <p className="mt-3 text-sm text-muted-foreground">{error}</p>}
      </section>

      {loading && (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          Memuat data status NIP…
        </div>
      )}

      {!loading && searched && !error && !record && (
        <Message>NIP tidak ditemukan.</Message>
      )}

      {!loading && record?.status === "not_paruh" && (
        <Message>NIP bukan PPPK paruh waktu.</Message>
      )}

      {!loading && record?.status === "needs_fix" && (
        <NeedFixDetail record={record} />
      )}

      {!loading &&
        record &&
        record.status !== "valid" &&
        record.status !== "needs_fix" &&
        record.status !== "not_paruh" && <Message>Data anda belum valid.</Message>}

      {!loading && record?.status === "valid" && (
        <section className="rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 border-b pb-5">
            <span className="inline-flex shrink-0 items-center rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-soft-foreground">
              Berkas valid
            </span>
            {record.received_on && (
              <span className="text-xs text-muted-foreground">
                Email terakhir: {formatDate(record.received_on)}
              </span>
            )}
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Nama" value={record.nama} />
            <Detail label="NIP" value={record.nip} />
            <Detail label="OPD" value={record.unit} />
            <Detail label="Unit kerja" value={record.satuan_kerja} />
            <Detail label="Jenjang" value={record.jenjang} />
          </dl>
        </section>
      )}
    </div>
  );
}
