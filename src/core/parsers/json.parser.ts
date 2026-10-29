import { SchemaNode, UnifiedSchema, DataType } from '../types/schema';

export class CustomJSONParser {
  public parse(jsonContent: string, fileName: string): UnifiedSchema {
    const data = JSON.parse(jsonContent);
    const targetObject = Array.isArray(data) ? data[0] || {} : data;

    const children = this.buildNodes(targetObject);

    return {
      format: 'json',
      root: {
        name: '',
        type: 'object',
        children,
      },
    };
  }

  private buildNodes(obj: any): SchemaNode[] {
    if (typeof obj !== 'object' || obj === null) return [];

    return Object.keys(obj).map((key) => {
      const val = obj[key];
      const inferredType = this.inferType(val);

      if (inferredType === 'object' && val !== null && !Array.isArray(val)) {
        return {
          name: key,
          type: 'object',
          children: this.buildNodes(val),
        };
      }

      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return {
          name: key,
          type: 'array',
          children: this.buildNodes(val[0]),
        };
      }

      return {
        name: key,
        type: inferredType,
      };
    });
  }

  private inferType(value: any): DataType {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }
}