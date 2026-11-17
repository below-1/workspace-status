import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const config: ChartConfig = {
  processed: { label: 'Sudah masuk', color: 'var(--chart-1)' },
  belum: { label: 'Belum', color: 'var(--chart-4)' },
};

export type StatusRow = {
  total: number;
  processed: number;
  belum: number;
};

export function HorizontalStatusChart({
  rows,
  labelKey,
  labelWidth = 220,
  height = 'h-72',
  truncate = 40,
}: {
  rows: (StatusRow & Record<string, string | number>)[];
  labelKey: string;
  labelWidth?: number;
  height?: string;
  truncate?: number;
}) {
  const tickFormatter = (value: string) =>
    value.length > truncate ? `${value.slice(0, truncate - 1)}…` : value;

  return (
    <ChartContainer config={config} className={height}>
      <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={labelWidth}
          tickLine={false}
          axisLine={false}
          tickFormatter={tickFormatter}
        />
        <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'var(--muted)' }} />
        <Bar dataKey="processed" stackId="total" fill="var(--color-processed)" maxBarSize={22} />
        <Bar
          dataKey="belum"
          stackId="total"
          fill="var(--color-belum)"
          fillOpacity={0.35}
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ChartContainer>
  );
}
