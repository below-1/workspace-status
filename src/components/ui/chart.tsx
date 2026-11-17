import * as React from 'react';
import { ResponsiveContainer } from 'recharts';

import { fmtInt } from '@/lib/format';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<string, { label: string; color?: string }>;

type ChartContextValue = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextValue | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('useChart must be used inside ChartContainer');
  return context;
}

interface ChartContainerProps extends React.ComponentProps<'div'> {
  config: ChartConfig;
  children: React.ReactElement;
}

export function ChartContainer({ config, className, children, style, ...props }: ChartContainerProps) {
  const cssVars = Object.fromEntries(
    Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color ?? 'var(--chart-1)']),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        className={cn(
          'h-64 w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-legend-item-text]:text-muted-foreground',
          className,
        )}
        style={{ ...cssVars, ...style }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

type TooltipItem = { name?: string | number; value?: string | number; color?: string; dataKey?: string | number };

export function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label !== undefined && <div className="mb-1 font-medium">{label}</div>}
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const labelText = config[key]?.label ?? String(item.name ?? key);
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: item.color }} />
                {labelText}
              </span>
              <span className="font-medium tabular-nums">
                {typeof item.value === 'number' ? fmtInt(item.value) : String(item.value ?? '')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
