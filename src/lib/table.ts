export interface TableColumn {
  key: string;
  label: string;
  format?: 'text' | 'int' | 'pct';
  align?: 'left' | 'right';
}
