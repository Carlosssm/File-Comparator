/*
 * File-Comparator
 * @Carlosssm
 * 22/10/2026
 */

import { SchemaNode, UnifiedSchema } from '../types/schema';
import { MultiFileComparisonOutput, MatrixRow, FieldFileStatus } from '../types/comparison';

export interface FileInput {
  id: string;
  name: string;
  schema: UnifiedSchema;
}

export class StructureComparator {
  public static compare(files: FileInput[]): MultiFileComparisonOutput {
    if (files.length === 0) {
      return {
        fileList: [],
        rows: [],
        summary: { totalFields: 0, unanimousFields: 0, discrepancyFields: 0 },
      };
    }

    const fileList = files.map(f => ({ id: f.id, name: f.name }));
    const baseFile = files[0];

    const baseFieldsMap = new Map<string, { type?: any }>();
    this.extractPaths(baseFile.schema.root, '', baseFieldsMap);

    const otherFilesMaps = new Map<string, Map<string, { type?: any }>>();
    files.slice(1).forEach(file => {
      const fieldMap = new Map<string, { type?: any }>();
      this.extractPaths(file.schema.root, '', fieldMap);
      otherFilesMaps.set(file.id, fieldMap);
    });

    const rows: MatrixRow[] = [];
    let unanimousCount = 0;
    let discrepancyCount = 0;

    baseFieldsMap.forEach((baseInfo, fieldPath) => {
      const fileStatuses: Record<string, FieldFileStatus> = {};
      let presentInAll = true;

      fileStatuses[baseFile.id] = {
        fileId: baseFile.id,
        fileName: baseFile.name,
        present: true,
        type: baseInfo.type,
      };

      files.slice(1).forEach(file => {
        const fileMap = otherFilesMaps.get(file.id);
        const isPresent = fileMap ? this.checkPresence(fieldPath, fileMap) : false;

        fileStatuses[file.id] = {
          fileId: file.id,
          fileName: file.name,
          present: isPresent,
        };

        if (!isPresent) {
          presentInAll = false;
        }
      });

      if (presentInAll) {
        unanimousCount++;
      } else {
        discrepancyCount++;
      }

      rows.push({
        fieldPath,
        fileStatuses,
        isUnanimous: presentInAll,
      });
    });

    rows.sort((a, b) => a.fieldPath.localeCompare(b.fieldPath));

    return {
      fileList,
      rows,
      summary: {
        totalFields: rows.length,
        unanimousFields: unanimousCount,
        discrepancyFields: discrepancyCount,
      },
    };
  }

  private static checkPresence(basePath: string, targetMap: Map<string, any>): boolean {
    if (targetMap.has(basePath)) return true;

    const baseLeaf = basePath.split('.').pop()?.toLowerCase();
    
    for (const targetPath of targetMap.keys()) {
      const targetLeaf = targetPath.split('.').pop()?.toLowerCase();
      if (baseLeaf && targetLeaf && baseLeaf === targetLeaf) {
        return true;
      }
    }

    return false;
  }

  private static extractPaths(
    node: SchemaNode,
    parentPath: string,
    result: Map<string, { type?: any }>
  ) {
    let currentPath = parentPath;

    if (node.name) {
      currentPath = parentPath ? `${parentPath}.${node.name}` : node.name;
      result.set(currentPath, { type: node.type });
    }

    if (node.attributes) {
      node.attributes.forEach(attr => {
        const attrPath = currentPath ? `${currentPath}.@${attr.name}` : `@${attr.name}`;
        result.set(attrPath, { type: attr.type });
      });
    }

    if (node.children) {
      node.children.forEach(child => {
        this.extractPaths(child, currentPath, result);
      });
    }
  }
}