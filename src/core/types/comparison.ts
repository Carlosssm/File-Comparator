import { DataType } from './schema';

export type ComparisonStatus = 'PRESENT' | 'MISSING' | 'TYPE_MISMATCH';

export interface FieldFileStatus {
  fileId: string;
  fileName: string;
  present: boolean;
  type?: DataType;
}

export interface MatrixRow {
  fieldPath: string; // Ej: "shipping_orders.shipping_order.status"
  fileStatuses: Record<string, FieldFileStatus>; // Estado del campo por cada fileId
  isUnanimous: boolean; // true si está presente en TODOS los archivos subidos
}

export interface MultiFileComparisonOutput {
  fileList: Array<{ id: string; name: string }>;
  rows: MatrixRow[];
  summary: {
    totalFields: number;
    unanimousFields: number;
    discrepancyFields: number;
  };
}