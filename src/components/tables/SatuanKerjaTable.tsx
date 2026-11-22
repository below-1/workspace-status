import * as React from 'react';
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fmtInt, fmtPct } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface SatuanKerjaRow {
  name: string;
  total: number;
  processed: number;
  belum: number;
  ratio: number;
  invalid: number;
}

type Status = 'Lengkap' | 'Sebagian' | 'Kosong';

const STATUSES: Status[] = ['Lengkap', 'Sebagian', 'Kosong'];

function statusOf(row: SatuanKerjaRow): Status {
  if (!row.total || !row.processed) return 'Kosong';
  if (row.processed >= row.total) return 'Lengkap';
  return 'Sebagian';
}

function StatusBadge({ status }: { status: Status }) {
  return <Badge variant="secondary">{status}</Badge>;
}

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    equalsString: filterFn_equalsString,
  },
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

const helper = createColumnHelper<typeof features, SatuanKerjaRow>();

const columns = helper.columns([
  helper.accessor('name', {
    id: 'name',
    header: 'Satuan kerja',
    sortFn: 'alphanumeric',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  helper.accessor('invalid', {
    id: 'invalid',
    header: 'NI tidak valid',
    cell: (info) => <span className="tabular-nums">{fmtInt(info.getValue())}</span>,
  }),
  helper.accessor('processed', {
    id: 'processed',
    header: 'Sudah masuk',
    cell: (info) => <span className="tabular-nums">{fmtInt(info.getValue())}</span>,
  }),
  helper.accessor('belum', {
    id: 'belum',
    header: 'Belum',
    cell: (info) => <span className="tabular-nums">{fmtInt(info.getValue())}</span>,
  }),
  helper.accessor('ratio', {
    id: 'ratio',
    header: 'Persentase',
    cell: (info) => {
      const ratio = info.getValue();
      return (
        <div className="flex items-center justify-end gap-2">
          <div
            className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted lg:block"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, ratio))}%` }}
            />
          </div>
          <span className="tabular-nums">{fmtPct(ratio)}</span>
        </div>
      );
    },
  }),
  helper.accessor((row) => statusOf(row), {
    id: 'status',
    header: 'Status',
    filterFn: 'equalsString',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
]);

interface Props {
  rows: SatuanKerjaRow[];
}

export default function SatuanKerjaTable({ rows }: Props) {
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'processed', desc: true }]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.name,
    state: { globalFilter, columnFilters, sorting, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => column.id === 'name',
  });

  const statusFilter = (table.getColumn('status')?.getFilterValue() as string | undefined) ?? '';
  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageRows = table.getRowModel().rows;
  const from = filteredCount ? pagination.pageIndex * pagination.pageSize + 1 : 0;
  const to = Math.min(filteredCount, (pagination.pageIndex + 1) * pagination.pageSize);
  const hasFilters = globalFilter !== '' || columnFilters.length > 0;

  function resetFilters() {
    setGlobalFilter('');
    setColumnFilters([]);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  function downloadCsv() {
    const exportRows = table.getFilteredRowModel().rows.map((row) => row.original);
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const lines = [
      ['Satuan kerja', 'NI tidak valid', 'Sudah masuk', 'Belum', 'Persentase', 'Status'],
      ...exportRows.map((row) => [
        row.name,
        row.invalid,
        row.processed,
        row.belum,
        row.ratio,
        statusOf(row),
      ]),
    ].map((cells) => cells.map(escape).join(';'));
    const blob = new Blob([`\uFEFF${lines.join('\n')}\n`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'satuan-kerja-paruh-waktu.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Cari satuan kerja
          <input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Nama satuan kerja"
            className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Status
          <select
            value={statusFilter}
            onChange={(event) => table.getColumn('status')?.setFilterValue(event.target.value || undefined)}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Semua status</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          Menampilkan <span className="font-medium text-foreground">{fmtInt(from)}</span>–
          <span className="font-medium text-foreground">{fmtInt(to)}</span> dari{' '}
          <span className="font-medium text-foreground">{fmtInt(filteredCount)}</span> satuan kerja
        </span>
        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
            Hapus filter
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={downloadCsv} className="sm:ml-auto">
          Unduh CSV
        </Button>
      </div>

      <div className="hidden rounded-lg border md:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                      }
                      className={cn(
                        ['invalid', 'processed', 'belum', 'ratio'].includes(header.column.id) && 'text-right',
                      )}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                          <span aria-hidden="true" className="text-[0.65rem]">
                            {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
                          </span>
                        </button>
                      ) : (
                        <>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        ['invalid', 'processed', 'belum', 'ratio'].includes(cell.column.id) && 'text-right',
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Tidak ada satuan kerja yang cocok dengan filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {pageRows.length ? (
          pageRows.map((row) => {
            const item = row.original;
            const ratio = Math.min(100, Math.max(0, item.ratio));
            return (
              <article key={row.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                  </div>
                  <StatusBadge status={statusOf(item)} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md bg-muted px-2 py-2">
                    <dt className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                      NI tidak valid
                    </dt>
                    <dd className="font-medium tabular-nums">{fmtInt(item.invalid)}</dd>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-2">
                    <dt className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Masuk</dt>
                    <dd className="font-medium tabular-nums">{fmtInt(item.processed)}</dd>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-2">
                    <dt className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Belum</dt>
                    <dd className="font-medium tabular-nums">{fmtInt(item.belum)}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Persentase</span>
                    <span className="font-medium text-foreground tabular-nums">{fmtPct(item.ratio)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Tidak ada satuan kerja yang cocok dengan filter.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Sebelumnya
        </Button>
        <span className="text-muted-foreground">
          Halaman {fmtInt(pagination.pageIndex + 1)} dari {fmtInt(Math.max(1, table.getPageCount()))}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Berikutnya
        </Button>
        <label className="ml-auto flex items-center gap-2 text-muted-foreground">
          Per halaman
          <select
            value={pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
