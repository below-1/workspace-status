import { HorizontalStatusChart } from '@/components/charts/HorizontalStatusChart';

export function UnitBar({
  rows,
  labelKey = 'unit',
  tall = false,
}: {
  rows: { total: number; processed: number; belum: number }[];
  labelKey?: string;
  tall?: boolean;
}) {
  return (
    <HorizontalStatusChart
      rows={rows}
      labelKey={labelKey}
      labelWidth={260}
      height={tall ? 'h-[620px]' : 'h-72'}
      truncate={42}
    />
  );
}

export default UnitBar;
