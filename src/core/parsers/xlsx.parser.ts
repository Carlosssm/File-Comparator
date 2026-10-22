import * as XLSX from 'xlsx';
import { SchemaNode, UnifiedSchema, DataType } from '../types/schema';

export class CustomXLSXParser {
  public parse(arrayBuffer: ArrayBuffer, fileName: string): UnifiedSchema {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      return {
        format: 'xlsx',
        root: { name: '', type: 'object', children: [] },
      };
    }

    const headers = (jsonData[0] as string[]) || [];
    const sampleRow = (jsonData[1] as any[]) || [];

    const children: SchemaNode[] = headers.map((header, idx) => {
      const sampleVal = sampleRow[idx];
      return {
        name: String(header).trim(),
        type: this.inferType(sampleVal),
      };
    });

    return {
      format: 'xlsx',
      root: {
        name: '',
        type: 'object',
        children,
      },
    };
  }

  private inferType(value: any): DataType {
    if (value === null || value === undefined || value === '') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
  }
}