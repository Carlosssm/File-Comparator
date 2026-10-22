import React, { useState } from 'react';
import { CustomXMLParser } from './core/parsers/xml.parser';
import { CustomCSVParser } from './core/parsers/csv.parser';
import { CustomTXTParser } from './core/parsers/txt.parser';
import { CustomJSONParser } from './core/parsers/json.parser';
import { CustomXLSXParser } from './core/parsers/xlsx.parser';
import { StructureComparator, FileInput } from './core/comparator/engine';
import { MultiFileComparisonOutput } from './core/types/comparison';

export default function App() {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [compareFiles, setCompareFiles] = useState<File[]>([]);
  const [comparisonResult, setComparisonResult] = useState<MultiFileComparisonOutput | null>(null);

  const xmlParser = new CustomXMLParser();
  const csvParser = new CustomCSVParser();
  const txtParser = new CustomTXTParser();
  const jsonParser = new CustomJSONParser();
  const xlsxParser = new CustomXLSXParser();

  const parseFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      return xlsxParser.parse(buffer, file.name);
    }

    const text = await file.text();

    if (ext === 'csv') {
      return csvParser.parse(text, file.name);
    }
    if (ext === 'txt') {
      return txtParser.parse(text, file.name);
    }
    if (ext === 'json') {
      return jsonParser.parse(text, file.name);
    }
    return xmlParser.parse(text, file.name);
  };

  const handleBaseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBaseFile(e.target.files[0]);
    }
  };

  const handleCompareFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCompareFiles(Array.from(e.target.files));
    }
  };

  const handleCompare = async () => {
    if (!baseFile || compareFiles.length === 0) return;

    const processedFiles: FileInput[] = [];

    const baseSchema = await parseFile(baseFile);
    processedFiles.push({
      id: `base-${baseFile.name}`,
      name: `[BASE] ${baseFile.name}`,
      schema: baseSchema,
    });

    for (let i = 0; i < compareFiles.length; i++) {
      const file = compareFiles[i];
      const schema = await parseFile(file);

      processedFiles.push({
        id: `file-${i}-${file.name}`,
        name: file.name,
        schema,
      });
    }

    const result = StructureComparator.compare(processedFiles);
    setComparisonResult(result);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '100%', margin: '0 auto' }}>
      <h1 style={{ color: '#1a1a1a', marginBottom: '4px', fontSize: '24px' }}>Universal Diff</h1>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>Comparación de 1 Archivo Base contra N Archivos</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{ border: '2px solid #0066cc', padding: '16px', borderRadius: '8px', backgroundColor: '#f0f7ff' }}>
          <h3 style={{ marginTop: 0, color: '#0066cc', marginBottom: '6px', fontSize: '16px' }}>1. Archivo Base (Plantilla / Pivote)</h3>
          <p style={{ fontSize: '12px', color: '#555', marginTop: 0, marginBottom: '10px' }}>Soporta XML, CSV, TXT, JSON y XLSX.</p>
          <input 
            type="file" 
            accept=".xml,.csv,.txt,.json,.xlsx,.xls" 
            onChange={handleBaseFileChange} 
          />
          {baseFile && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#0066cc', fontWeight: 'bold' }}>
              📄 {baseFile.name}
            </div>
          )}
        </div>

        <div style={{ border: '2px dashed #ccc', padding: '16px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
          <h3 style={{ marginTop: 0, marginBottom: '6px', fontSize: '16px' }}>2. Archivos a Comparar (N Archivos)</h3>
          <p style={{ fontSize: '12px', color: '#555', marginTop: 0, marginBottom: '10px' }}>Soporta XML, CSV, TXT, JSON y XLSX.</p>
          <input 
            type="file" 
            accept=".xml,.csv,.txt,.json,.xlsx,.xls" 
            multiple
            onChange={handleCompareFilesChange} 
          />
          {compareFiles.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#333' }}>
              <strong>Archivos seleccionados ({compareFiles.length}):</strong>
              <ul style={{ marginTop: '4px', marginBottom: 0, paddingLeft: '18px', maxHeight: '80px', overflowY: 'auto' }}>
                {compareFiles.map((f, idx) => (
                  <li key={idx}>{f.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={handleCompare} 
        disabled={!baseFile || compareFiles.length === 0}
        style={{ 
          padding: '10px 20px', 
          fontSize: '14px', 
          fontWeight: 'bold',
          color: '#fff',
          backgroundColor: (!baseFile || compareFiles.length === 0) ? '#ccc' : '#0066cc',
          border: 'none',
          borderRadius: '6px',
          cursor: (!baseFile || compareFiles.length === 0) ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '20px'
        }}
      >
        Comparar Base contra {compareFiles.length} Archivo{compareFiles.length !== 1 ? 's' : ''}
      </button>

      {comparisonResult && (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', margin: 0 }}>Matriz de Comparación</h2>

            <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
              <span style={{ background: '#f5f5f5', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                Total Campos: <strong>{comparisonResult.summary.totalFields}</strong>
              </span>
              <span style={{ background: '#e8f5e9', padding: '6px 10px', borderRadius: '4px', border: '1px solid #c8e6c9', color: '#2e7d32' }}>
                Coincidencias: <strong>{comparisonResult.summary.unanimousFields}</strong>
              </span>
              <span style={{ background: '#ffebee', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ffcdd2', color: '#c62828' }}>
                Discrepancias: <strong>{comparisonResult.summary.discrepancyFields}</strong>
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ backgroundColor: '#f0f4f8', borderBottom: '2px solid #d0d7de' }}>
                  <th style={{ padding: '6px 10px', border: '1px solid #d0d7de', minWidth: '220px', backgroundColor: '#f0f4f8' }}>
                    Campo / Ruta
                  </th>
                  {comparisonResult.fileList.map((file, idx) => (
                    <th 
                      key={file.id} 
                      title={file.name}
                      style={{ 
                        padding: '6px 8px', 
                        border: '1px solid #d0d7de', 
                        maxWidth: '120px',
                        width: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        backgroundColor: idx === 0 ? '#dbeafe' : '#f0f4f8',
                        color: idx === 0 ? '#1e40af' : '#1f2937',
                        fontSize: '11px',
                        textAlign: 'center'
                      }}
                    >
                      {idx === 0 ? '📌 ' : ''}{file.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonResult.rows.map((row) => (
                  <tr key={row.fieldPath} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ 
                      padding: '4px 8px', 
                      border: '1px solid #e5e7eb', 
                      fontFamily: 'monospace', 
                      fontWeight: '600', 
                      color: '#374151',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}>
                      {row.fieldPath}
                    </td>
                    {comparisonResult.fileList.map((file) => {
                      const status = row.fileStatuses[file.id];
                      const isPresent = status?.present;
                      
                      return (
                        <td 
                          key={file.id} 
                          style={{ 
                            padding: '4px 6px', 
                            border: '1px solid #e5e7eb',
                            textAlign: 'center',
                            backgroundColor: isPresent ? '#dcfce7' : '#fee2e2',
                            color: isPresent ? '#166534' : '#991b1b',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            width: '80px'
                          }}
                        >
                          {isPresent ? 'SÍ' : 'NO'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}