import { Pie, PieChart, Tooltip } from 'recharts';

import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { fmtInt, fmtPct } from '@/lib/format';

const config: ChartConfig = {
  processed: { label: 'Sudah masuk', color: 'var(--chart-1)' },
  belum: { label: 'Belum', color: 'var(--chart-4)' },
};

export function RatioDonut({ processed, belum }: { processed: number; belum: number }) {
  const data = [
    { key: 'processed', value: processed, fill: 'var(--color-processed)' },
    { key: 'belum', value: belum, fill: 'var(--color-belum)' },
  ];
  const total = processed + belum;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ChartContainer config={config} className="h-52 w-52">
          <PieChart>
            <Tooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              strokeWidth={0}
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{fmtPct(total ? (processed / total) * 100 : 0)}</span>
          <span className="text-xs text-muted-foreground">sudah masuk</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Sudah masuk</span>
          <span className="ml-auto font-medium tabular-nums">{fmtInt(processed)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-danger/40" />
          <span className="text-muted-foreground">Belum</span>
          <span className="ml-auto font-medium tabular-nums">{fmtInt(belum)}</span>
        </div>
      </div>
    </div>
  );
}

export default RatioDonut;
