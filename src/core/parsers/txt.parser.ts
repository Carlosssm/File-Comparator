import { SchemaNode, UnifiedSchema, DataType } from '../types/schema';

export class CustomTXTParser {
  public parse(txtContent: string, fileName: string): UnifiedSchema {
    const lines = txtContent.split(/\r?\n/).filter(line => line.trim() !== '');
    const detectedKeys = new Set<string>();

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (trimmed.includes('=')) {
        const key = trimmed.split('=')[0].trim();
        if (key) detectedKeys.add(key);
      } else if (trimmed.includes(':')) {
        const key = trimmed.split(':')[0].trim();
        if (key) detectedKeys.add(key);
      } else if (trimmed.includes('\t')) {
        const key = trimmed.split('\t')[0].trim();
        if (key) detectedKeys.add(key);
      } else {
        const words = trimmed.split(/\s+/);
        if (words.length > 0 && words[0]) {
          detectedKeys.add(words[0]);
        }
      }
    });

    const children: SchemaNode[] = Array.from(detectedKeys).map((key) => ({
      name: key,
      type: 'string' as DataType,
    }));

    return {
      format: 'txt',
      root: {
        name: '',
        type: 'object',
        children,
      },
    };
  }
}