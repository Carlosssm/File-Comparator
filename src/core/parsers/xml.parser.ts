import { XMLParser } from 'fast-xml-parser';
import { SchemaNode, UnifiedSchema, DataType } from '../types/schema';

export class CustomXMLParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      ignoreDeclaration: true,
      parseTagValue: true,
    });
  }

  public parse(xmlContent: string, fileName: string): UnifiedSchema {
    const parsedObj = this.parser.parse(xmlContent);
    const keys = Object.keys(parsedObj).filter(k => !k.startsWith('?'));
    const rootKey = keys[0] || 'root';

    return {
      format: 'xml',
      root: this.buildSchemaNode(rootKey, parsedObj[rootKey]),
    };
  }

  private buildSchemaNode(name: string, value: any): SchemaNode {
    const type = this.inferType(value);

    if (type === 'object' && value !== null) {
      const children: SchemaNode[] = [];
      const attributes: SchemaNode[] = [];

      for (const key of Object.keys(value)) {
        if (key.startsWith('@_')) {
          attributes.push({
            name: key.replace('@_', ''),
            type: this.inferType(value[key]),
          });
        } else {
          children.push(this.buildSchemaNode(key, value[key]));
        }
      }

      return {
        name,
        type: 'object',
        children: children.length > 0 ? children : undefined,
        attributes: attributes.length > 0 ? attributes : undefined,
      };
    }

    if (type === 'array' && Array.isArray(value)) {
      const firstItem = value[0];
      const itemNode = this.buildSchemaNode(name, firstItem);
      return {
        ...itemNode,
        type: 'array',
      };
    }

    return { name, type };
  }

  private inferType(value: any): DataType {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    
    if (!isNaN(Number(value)) && String(value).trim() !== '') return 'number';
    if (String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'false') return 'boolean';

    return 'string';
  }
}