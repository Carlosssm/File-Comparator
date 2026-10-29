/*
 * File-Comparator
 * @Carlosssm
 * 29/10/2026
 */

import React, { useState, useEffect } from 'react';
import { CustomXMLParser } from './core/parsers/xml.parser';
import { CustomCSVParser } from './core/parsers/csv.parser';
import { CustomTXTParser } from './core/parsers/txt.parser';
import { CustomJSONParser } from './core/parsers/json.parser';
import { CustomXLSXParser } from './core/parsers/xlsx.parser';
import { StructureComparator, FileInput } from './core/comparator/engine';

const xmlParser = new CustomXMLParser();
const csvParser = new CustomCSVParser();
const txtParser = new CustomTXTParser();
const jsonParser = new CustomJSONParser();
const xlsxParser = new CustomXLSXParser();

interface TemplateItem {
  name: string;
  keyName: string;
  content: string | ArrayBuffer;
}

interface FileEvaluation {
  fileName: string;
  matchedTemplateName: string;
  isValid: boolean;
  errors: string[];
}

export default function App() {
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [compareFiles, setCompareFiles] = useState<File[]>([]);
  const [evaluations, setEvaluations] = useState<FileEvaluation[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [expandedFileIndex, setExpandedFileIndex] = useState<number | null>(null);
  const [expandedSummaryIndex, setExpandedSummaryIndex] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'File Diff Tool (Genérica)';
  }, []);

  const parseContent = async (filename: string, content: string | ArrayBuffer) => {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      return xlsxParser.parse(content as ArrayBuffer, filename);
    }

    const text = content as string;
    if (ext === 'csv') return csvParser.parse(text, filename);
    if (ext === 'txt') return txtParser.parse(text, filename);
    if (ext === 'json') return jsonParser.parse(text, filename);
    return xmlParser.parse(text, filename);
  };

  const handleTemplateFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr: File[] = Array.from(e.target.files);
      setTemplateFiles(filesArr);
      
      const loaded: TemplateItem[] = [];
      for (const file of filesArr) {
        try {
          const ext = file.name.split('.').pop()?.toLowerCase();
          let content: string | ArrayBuffer;
          if (ext === 'xlsx' || ext === 'xls') {
            content = await file.arrayBuffer();
          } else {
            content = await file.text();
          }
          loaded.push({
            name: file.name,
            keyName: file.name.replace(/\.[^/.]+$/, "").toLowerCase(),
            content,
          });
        } catch (err) {
          console.error(`Error al leer la plantilla ${file.name}:`, err);
        }
      }
      setTemplates(loaded);
      setEvaluations([]);
    }
  };

  const handleCompareFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCompareFiles(Array.from(e.target.files));
      setEvaluations([]);
      setExpandedFileIndex(null);
      setExpandedSummaryIndex(null);
    }
  };

  // Algoritmo de emparejamiento garantizado (siempre encuentra plantilla si hay al menos una subida)
  const findMatchingTemplate = (fileName: string, availableTemplates: TemplateItem[]): TemplateItem => {
    const lowerName = fileName.toLowerCase();

    // 1. Prioridad estricta para archivos que contienen "ois"
    if (lowerName.includes('ois')) {
      const oisMatch = availableTemplates.find((t: TemplateItem) => 
        t.keyName.includes('ois') && lowerName.includes(t.keyName)
      );
      if (oisMatch) return oisMatch;

      const anyOisMatch = availableTemplates.find((t: TemplateItem) => t.keyName.includes('ois'));
      if (anyOisMatch) return anyOisMatch;
    }

    // 2. Coincidencia de nombre por inclusión de texto
    const textMatch = availableTemplates.find((t: TemplateItem) => 
      lowerName.includes(t.keyName) || t.keyName.includes(lowerName)
    );
    if (textMatch) return textMatch;

    // 3. FALLBACK OBLIGATORIO: Se asigna la primera plantilla cargada para forzar la comparación
    return availableTemplates[0];
  };

  const handleCompare = async () => {
    if (compareFiles.length === 0 || templates.length === 0) return;
    setIsProcessing(true);

    const results: FileEvaluation[] = [];

    for (let i = 0; i < compareFiles.length; i++) {
      const file: File = compareFiles[i];
      const fileErrors: string[] = [];

      // Selección garantizada de plantilla muestra
      const matchedTemplate = findMatchingTemplate(file.name, templates);

      try {
        const baseSchema = await parseContent(matchedTemplate.name, matchedTemplate.content);
        const baseInput: FileInput = {
          id: `base-${matchedTemplate.name}`,
          name: matchedTemplate.name,
          schema: baseSchema,
        };

        let fileSchema;
        try {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'xlsx' || ext === 'xls') {
            const buffer = await file.arrayBuffer();
            fileSchema = await parseContent(file.name, buffer);
          } else {
            const text = await file.text();
            fileSchema = await parseContent(file.name, text);
          }
        } catch (syntaxError: any) {
          fileErrors.push(`Error de formato: No se pudo leer la estructura del archivo. (${syntaxError?.message || 'Sintaxis inválida'})`);
        }

        if (fileSchema) {
          const userInput: FileInput = {
            id: `user-${i}-${file.name}`,
            name: file.name,
            schema: fileSchema,
          };

          const comparison = StructureComparator.compare([baseInput, userInput]);

          const missingFields: string[] = [];
          for (const row of comparison.rows) {
            const baseStatus = row.fileStatuses[baseInput.id];
            const userStatus = row.fileStatuses[userInput.id];

            if (baseStatus?.present && !userStatus?.present) {
              missingFields.push(row.fieldPath);
            }
          }

          if (missingFields.length > 0) {
            fileErrors.push(`Faltan ${missingFields.length} campo(s) respecto a la muestra: ${missingFields.join(', ')}`);
          }
        }

      } catch (generalError: any) {
        fileErrors.push(`Error al comparar estructura: ${generalError?.message || 'Error no especificado'}`);
      }

      const isValid = fileErrors.length === 0;

      results.push({
        fileName: file.name,
        matchedTemplateName: matchedTemplate.name,
        isValid,
        errors: fileErrors
      });
    }

    setEvaluations(results);
    setIsProcessing(false);
  };

  const toggleExpand = (idx: number) => {
    setExpandedFileIndex(expandedFileIndex === idx ? null : idx);
  };

  const toggleSummaryExpand = (idx: number) => {
    setExpandedSummaryIndex(expandedSummaryIndex === idx ? null : idx);
  };

  const totalFiles = evaluations.length;
  const validFilesCount = evaluations.filter((e: FileEvaluation) => e.isValid).length;
  const invalidEvaluations = evaluations.filter((e: FileEvaluation) => !e.isValid);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '100%', margin: '0 auto' }}>
      <h1 style={{ color: '#1a1a1a', marginBottom: '4px', fontSize: '24px' }}>File Diff Tool</h1>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>Comparación estricta de esquemas y estructuras de archivos</p>

      {/* PASO 1: Subida de Plantillas por el usuario */}
      <div style={{ border: '1px solid #0969da', padding: '16px', borderRadius: '8px', backgroundColor: '#f0f7ff', marginBottom: '16px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '6px', fontSize: '16px', color: '#0969da' }}>1. Cargar Archivos Muestra / Plantillas</h3>
        <p style={{ fontSize: '12px', color: '#555', marginTop: 0, marginBottom: '10px' }}>
          Sube tus archivos muestra base. Serán las plantillas contra las que se evaluará el contenido.
        </p>
        <input 
          type="file" 
          accept=".xml,.csv,.txt,.json,.xlsx,.xls" 
          multiple
          onChange={handleTemplateFilesChange} 
        />
        {templates.length > 0 && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#0969da' }}>
            <strong>📌 Plantillas Muestra cargadas ({templates.length}):</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '4px' }}>
              {templates.map((t: TemplateItem, idx: number) => (
                <li key={idx}><code>{t.name}</code></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* PASO 2: Input de Subida de Archivos a Evaluar */}
      <div style={{ border: '2px dashed #ccc', padding: '16px', borderRadius: '8px', backgroundColor: '#fafafa', marginBottom: '16px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '6px', fontSize: '16px' }}>2. Cargar Archivos a Comparar</h3>
        <p style={{ fontSize: '12px', color: '#555', marginTop: 0, marginBottom: '10px' }}>
          Sube los archivos que quieras evaluar contra las plantillas muestra cargadas arriba.
        </p>
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
              {compareFiles.map((f: File, idx: number) => (
                <li key={idx}>{f.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button 
        onClick={handleCompare} 
        disabled={compareFiles.length === 0 || templates.length === 0 || isProcessing}
        style={{ 
          padding: '10px 20px', 
          fontSize: '14px', 
          fontWeight: 'bold',
          color: '#fff',
          backgroundColor: (compareFiles.length === 0 || templates.length === 0 || isProcessing) ? '#ccc' : '#0066cc',
          border: 'none',
          borderRadius: '6px',
          cursor: (compareFiles.length === 0 || templates.length === 0 || isProcessing) ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '20px'
        }}
      >
        {isProcessing ? 'Procesando...' : 'Evaluar Archivos'}
      </button>

      {evaluations.length > 0 && (
        <>
          {/* TABLA DE RESUMEN DE PROCESAMIENTO */}
          <div style={{ border: '1px solid #d0d7de', borderRadius: '8px', padding: '16px', backgroundColor: '#fff', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px', color: '#111827' }}>
              📊 Resumen de Procesamiento
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#f3f4f6', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Subidos</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>{totalFiles}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#f0fdf4', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '12px', color: '#166534' }}>Procesados Correctamente</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d' }}>{validFilesCount}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#fef2f2', textAlign: 'center', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '12px', color: '#991b1b' }}>Con Errores</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>{invalidEvaluations.length}</div>
              </div>
            </div>

            {/* TABLA DE ERRORES (Exclusiva para archivos que fallaron) */}
            {invalidEvaluations.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fef2f2', borderBottom: '2px solid #fecaca' }}>
                      <th style={{ padding: '8px 10px', border: '1px solid #fecaca', color: '#991b1b' }}>Archivo con Error</th>
                      <th style={{ padding: '8px 10px', border: '1px solid #fecaca', color: '#991b1b' }}>Plantilla Muestra Coincidente</th>
                      <th style={{ padding: '8px 10px', border: '1px solid #fecaca', color: '#991b1b', textAlign: 'center' }}>Detalle de Errores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invalidEvaluations.map((ev: FileEvaluation, idx: number) => (
                      <React.Fragment key={idx}>
                        <tr style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fff5f5' }}>
                          <td style={{ padding: '8px 10px', border: '1px solid #fee2e2', fontWeight: 'bold', color: '#991b1b' }}>
                            📄 {ev.fileName}
                          </td>
                          <td style={{ padding: '8px 10px', border: '1px solid #fee2e2', color: '#0969da' }}>
                            📌 {ev.matchedTemplateName}
                          </td>
                          <td style={{ padding: '8px 10px', border: '1px solid #fee2e2', textAlign: 'center' }}>
                            <button
                              onClick={() => toggleSummaryExpand(idx)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {expandedSummaryIndex === idx ? '▲ Ocultar Motivo' : `▼ Ver Motivos (${ev.errors.length})`}
                            </button>
                          </td>
                        </tr>

                        {expandedSummaryIndex === idx && (
                          <tr>
                            <td colSpan={3} style={{ padding: '12px 14px', border: '1px solid #fca5a5', backgroundColor: '#fff5f5' }}>
                              <strong style={{ fontSize: '12px', color: '#991b1b', display: 'block', marginBottom: '6px' }}>
                                ⚠️ Motivos del error para {ev.fileName}:
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#7f1d1d' }}>
                                {ev.errors.map((err: string, errIdx: number) => (
                                  <li key={errIdx} style={{ marginBottom: '3px' }}>{err}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '13px', textAlign: 'center' }}>
                ✅ Todos los archivos procesados coinciden perfectamente con sus plantillas muestra.
              </div>
            )}
          </div>

          {/* MATRIZ DE RESULTADO DE LA EVALUACIÓN */}
          <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', backgroundColor: '#fff' }}>
            <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '16px' }}>Resultado de la Evaluación</h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f4f8', borderBottom: '2px solid #d0d7de' }}>
                    <th style={{ padding: '8px 6px', border: '1px solid #d0d7de', textAlign: 'left', minWidth: '150px', maxWidth: '200px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      Archivo del Usuario
                    </th>
                    {templates.map((tpl: TemplateItem, idx: number) => (
                      <th 
                        key={idx} 
                        title={tpl.name}
                        style={{ 
                          padding: '8px 6px', 
                          border: '1px solid #d0d7de', 
                          minWidth: '100px',
                          maxWidth: '130px',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          color: '#0969da',
                          verticalAlign: 'top'
                        }}
                      >
                        📌 {tpl.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((ev: FileEvaluation, userIdx: number) => (
                    <tr key={userIdx}>
                      <td style={{ 
                        padding: '8px 6px', 
                        border: '1px solid #e5e7eb', 
                        textAlign: 'left',
                        fontWeight: 'bold',
                        color: '#1a1a1a',
                        backgroundColor: '#f6f8fa',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal'
                      }}>
                        📄 {ev.fileName}
                      </td>

                      {templates.map((tpl: TemplateItem, tplIdx: number) => {
                        const isAssigned = ev.matchedTemplateName === tpl.name;

                        if (!isAssigned) {
                          return (
                            <td key={tplIdx} style={{ padding: '8px 6px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#9ca3af' }}>
                              -
                            </td>
                          );
                        }

                        return (
                          <td 
                            key={tplIdx} 
                            style={{ 
                              padding: '8px 6px', 
                              border: '1px solid #e5e7eb',
                              backgroundColor: ev.isValid ? '#dcfce7' : '#fee2e2',
                              color: ev.isValid ? '#166534' : '#991b1b',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}
                          >
                            <div>{ev.isValid ? 'SÍ' : 'NO'}</div>

                            {!ev.isValid && (
                              <button
                                onClick={() => toggleExpand(userIdx)}
                                style={{
                                  marginTop: '4px',
                                  padding: '3px 6px',
                                  fontSize: '10px',
                                  backgroundColor: '#b91c1c',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                {expandedFileIndex === userIdx ? 'Ocultar' : `Errores (${ev.errors.length})`}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {expandedFileIndex !== null && evaluations[expandedFileIndex] && (
              <div style={{ 
                marginTop: '16px', 
                padding: '14px 18px', 
                backgroundColor: '#fff5f5', 
                border: '1px solid #feb2b2', 
                borderRadius: '8px', 
                color: '#9b2c2c' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '14px' }}>
                    ⚠️ Detalles de Errores para: <code>{evaluations[expandedFileIndex].fileName}</code>
                  </strong>
                  <button 
                    onClick={() => setExpandedFileIndex(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#9b2c2c' }}
                  >
                    ✕ Cerrar
                  </button>
                </div>

                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.5' }}>
                  {evaluations[expandedFileIndex].errors.map((err: string, errorIdx: number) => (
                    <li key={errorIdx} style={{ marginBottom: '4px' }}>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}