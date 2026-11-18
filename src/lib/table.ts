export interface TableColumn {
  key: string;
  label: string;
  format?: 'text' | 'int' | 'pct' | 'progress';
  align?: 'left' | 'right';
}
