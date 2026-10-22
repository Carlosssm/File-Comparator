import Papa from 'papaparse';
import { SchemaNode, UnifiedSchema, DataType } from '../types/schema';

export class CustomCSVParser {
  public parse(csvContent: string, fileName: string): UnifiedSchema {
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
    });

    const headers = parsed.meta.fields || [];
    const rows = parsed.data as Record<string, any>[];

    const children: SchemaNode[] = headers.map((header) => {
      const sampleValue = rows.find((r) => r[header] !== undefined && r[header] !== '')?.[header];
      const inferredType = this.inferType(sampleValue);

      return {
        name: header.trim(),
        type: inferredType,
      };
    });

    return {
      format: 'csv',
      root: {
        name: '',
        type: 'object',
        children,
      },
    };
  }

  private inferType(value: any): DataType {
    if (value === null || value === undefined || value === '') return 'string';
    if (!isNaN(Number(value)) && String(value).trim() !== '') return 'number';
    if (String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'false') return 'boolean';

    return 'string';
  }
}