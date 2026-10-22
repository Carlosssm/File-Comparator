export type DataType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'array' 
  | 'object' 
  | 'null' 
  | 'unknown';

export interface SchemaNode {
  name: string;
  type: DataType;
  optional?: boolean;
  children?: SchemaNode[];
  attributes?: SchemaNode[];
}

export interface UnifiedSchema {
  format: string;
  root: SchemaNode;
}