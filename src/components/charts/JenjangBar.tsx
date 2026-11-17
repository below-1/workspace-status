import { HorizontalStatusChart } from '@/components/charts/HorizontalStatusChart';

export function JenjangBar({ rows }: { rows: { name: string; total: number; processed: number; belum: number }[] }) {
  return <HorizontalStatusChart rows={rows} labelKey="name" labelWidth={130} height="h-64" truncate={20} />;
}

export default JenjangBar;
