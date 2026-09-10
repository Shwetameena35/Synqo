import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  FileText,
  Copy,
  Check,
  Download,
  Save,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Code2,
  Eye,
  Sliders,
  Share2,
} from 'lucide-react';
import {
  DocField,
  DocMetadata,
  DocResponseExample,
  ExecuteResponsePayload,
  RequestItem,
} from '../../types';
import {
  parsePayloadToDocFields,
  parseHeaderParamToDocFields,
  generateDefaultErrorResponse,
  generateMarkdownDoc,
} from '../../utils/schemaParser';

interface ApiDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Partial<RequestItem>;
  activeResponse?: ExecuteResponsePayload | null;
  onSaveDoc: (docMetadata: DocMetadata) => Promise<void> | void;
}

export const ApiDocModal: React.FC<ApiDocModalProps> = ({
  isOpen,
  onClose,
  request,
  activeResponse,
  onSaveDoc,
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'responses' | 'preview'>('fields');
  const [summary, setSummary] = useState('');
  const [fields, setFields] = useState<DocField[]>([]);
  const [headerFields, setHeaderFields] = useState<DocField[]>([]);
  const [queryFields, setQueryFields] = useState<DocField[]>([]);
  const [successResponse, setSuccessResponse] = useState<DocResponseExample>({
    statusCode: 200,
    statusText: 'OK',
    description: 'Successful execution response.',
    body: '{\n  "success": true,\n  "message": "Operation completed successfully"\n}',
  });
  const [errorResponses, setErrorResponses] = useState<DocResponseExample[]>([
    generateDefaultErrorResponse(400, 'payload'),
  ]);

  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize or re-parse data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let existingDoc: DocMetadata | null = null;
    if (request.docsMetadata) {
      try {
        existingDoc = JSON.parse(request.docsMetadata);
      } catch {
        existingDoc = null;
      }
    }

    if (existingDoc && existingDoc.fields && existingDoc.fields.length > 0) {
      setSummary(existingDoc.summary || request.description || '');
      setFields(existingDoc.fields);
      setHeaderFields(existingDoc.headerFields || parseHeaderParamToDocFields(request.headers || ''));
      setQueryFields(existingDoc.queryFields || parseHeaderParamToDocFields(request.params || ''));
      if (existingDoc.successResponse) setSuccessResponse(existingDoc.successResponse);
      if (existingDoc.errorResponses && existingDoc.errorResponses.length > 0) {
        setErrorResponses(existingDoc.errorResponses);
      }
    } else {
      // Auto-scan on initial doc creation
      handleAutoScan();
    }

    // Auto-capture latest response if available and not set
    if (activeResponse && activeResponse.statusCode >= 200 && activeResponse.statusCode < 300) {
      setSuccessResponse({
        statusCode: activeResponse.statusCode,
        statusText: activeResponse.statusText || 'OK',
        description: 'Auto-captured from latest successful run in Synqo Runner.',
        body: formatBody(activeResponse.body),
      });
    }
  }, [isOpen, request.id]);

  const formatBody = (bodyStr: string) => {
    try {
      return JSON.stringify(JSON.parse(bodyStr), null, 2);
    } catch {
      return bodyStr || '{}';
    }
  };

  const handleAutoScan = () => {
    setSummary(request.description || `Handles ${request.method || 'GET'} operations for ${request.name || 'this endpoint'}.`);

    // Auto-parse payload fields
    const parsedFields = parsePayloadToDocFields(
      request.bodyContent || '',
      request.bodyType || 'none'
    );
    setFields(parsedFields);

    // Auto-parse headers & query params
    setHeaderFields(parseHeaderParamToDocFields(request.headers || ''));
    setQueryFields(parseHeaderParamToDocFields(request.params || ''));

    // Set sample error response based on first field if any
    const firstField = parsedFields[0]?.name || 'body';
    setErrorResponses([
      generateDefaultErrorResponse(400, firstField),
      generateDefaultErrorResponse(401, 'Authorization'),
    ]);
  };

  const handleCaptureFromRunner = () => {
    if (!activeResponse) return;
    if (activeResponse.statusCode >= 200 && activeResponse.statusCode < 300) {
      setSuccessResponse({
        statusCode: activeResponse.statusCode,
        statusText: activeResponse.statusText || 'OK',
        description: `Live response from runner (${activeResponse.latencyMs}ms)`,
        body: formatBody(activeResponse.body),
      });
      setActiveTab('responses');
    } else {
      // Add as error response
      const newErr: DocResponseExample = {
        statusCode: activeResponse.statusCode || 500,
        statusText: activeResponse.statusText || 'Error',
        description: `Captured failing response from runner`,
        body: formatBody(activeResponse.body),
      };
      setErrorResponses((prev) => [newErr, ...prev]);
      setActiveTab('responses');
    }
  };

  const handleToggleRequired = (index: number) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, required: !f.required } : f))
    );
  };

  const handleFieldChange = (index: number, patch: Partial<DocField>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  };

  const handleAddField = () => {
    const newField: DocField = {
      name: `field_${fields.length + 1}`,
      type: 'string',
      required: true,
      description: 'Field description',
      example: 'value',
    };
    setFields((prev) => [...prev, newField]);
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const buildCurrentDocMetadata = (): DocMetadata => {
    return {
      summary,
      description: request.description || '',
      fields,
      headerFields,
      queryFields,
      successResponse,
      errorResponses,
      updatedAt: new Date().toISOString(),
    };
  };

  const currentMarkdown = generateMarkdownDoc(
    request as RequestItem,
    buildCurrentDocMetadata()
  );

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(currentMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const filename = `${(request.name || 'api-doc')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-doc.md`;
    const blob = new Blob([currentMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToSynqo = async () => {
    setIsSaving(true);
    try {
      const doc = buildCurrentDocMetadata();
      await onSaveDoc(doc);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl bg-[#181818] border border-[#2F2F2F] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-neutral-100">
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-[#292929] bg-[#1E1E1E] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#FF6C37]/15 border border-[#FF6C37]/30 text-[#FF6C37]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Smart API Documentation Generator
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6C37]/20 text-[#FF6C37] font-mono font-bold border border-[#FF6C37]/30">
                  Instant 1-Click
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-0.5">
                <span className="font-bold text-[#FF6C37] uppercase">{request.method || 'GET'}</span>
                <span className="text-neutral-500">•</span>
                <span className="font-mono text-neutral-300 truncate max-w-sm sm:max-w-md">
                  {request.url || 'http://localhost:...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#2A2A2A] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="px-5 py-2.5 bg-[#141414] border-b border-[#262626] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#1E1E1E] border border-[#2B2B2B]">
            <button
              onClick={() => setActiveTab('fields')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'fields'
                  ? 'bg-[#FF6C37] text-white shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Payload Schema & Mandatory</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-white font-mono">
                {fields.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('responses')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'responses'
                  ? 'bg-[#FF6C37] text-white shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Success & Error Responses</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#FF6C37] text-white shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Markdown Preview</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {activeResponse && (
              <button
                onClick={handleCaptureFromRunner}
                title="Populate success or error response using latest runner output"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold text-emerald-400 cursor-pointer transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Capture Latest Response</span>
                <span className="sm:hidden">Capture</span>
              </button>
            )}

            <button
              onClick={handleAutoScan}
              title="Re-scan JSON payload and re-detect fields"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#242424] hover:bg-[#2F2F2F] border border-[#383838] text-xs font-semibold text-neutral-300 cursor-pointer transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#FF6C37]" />
              <span className="hidden sm:inline">Auto-Detect Schema</span>
              <span className="sm:hidden">Rescan</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: PAYLOAD SCHEMA & MANDATORY FIELDS */}
          {activeTab === 'fields' && (
            <div className="space-y-5">
              {/* Endpoint Overview Description */}
              <div className="p-4 rounded-xl bg-[#1D1D1D] border border-[#2B2B2B] space-y-2">
                <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                  <span>API Summary / Instructions for Frontend Dev</span>
                  <span className="text-[11px] font-normal text-neutral-500">
                    Displayed at top of documentation
                  </span>
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="e.g. Creates a new user profile. Requires Authorization Bearer token in header."
                  className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333333] text-xs text-neutral-200 focus:outline-none focus:border-[#FF6C37]"
                />
              </div>

              {/* Payload Fields Table */}
              <div className="rounded-xl bg-[#1D1D1D] border border-[#2B2B2B] overflow-hidden">
                <div className="px-4 py-3 bg-[#222222] border-b border-[#2E2E2E] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Request Payload Fields ({request.bodyType || 'json'})
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Click the badge to toggle between <strong>Required (Mandatory)</strong> and <strong>Optional</strong>.
                    </p>
                  </div>

                  <button
                    onClick={handleAddField}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#2A2A2A] hover:bg-[#383838] border border-[#404040] text-xs font-semibold text-neutral-200 cursor-pointer transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#FF6C37]" />
                    <span>Add Field</span>
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <FileText className="h-8 w-8 text-neutral-600 mx-auto" />
                    <div className="text-xs text-neutral-400">
                      No payload fields detected for this request.
                    </div>
                    <button
                      onClick={handleAutoScan}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FF6C37]/15 border border-[#FF6C37]/30 text-xs font-bold text-[#FF6C37] cursor-pointer hover:bg-[#FF6C37]/25 transition-all"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Scan Body Content Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#2A2A2A] bg-[#1A1A1A] text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-4">Field Name</th>
                          <th className="py-2.5 px-3">Data Type</th>
                          <th className="py-2.5 px-3 text-center">Mandatory / Optional</th>
                          <th className="py-2.5 px-3">Description for Frontend</th>
                          <th className="py-2.5 px-3">Example Value</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#262626]">
                        {fields.map((f, idx) => (
                          <tr key={idx} className="hover:bg-[#222222] transition-colors">
                            {/* Field Name */}
                            <td className="py-2.5 px-4 font-mono font-bold text-cyan-400">
                              <input
                                type="text"
                                value={f.name}
                                onChange={(e) => handleFieldChange(idx, { name: e.target.value })}
                                className="w-28 sm:w-36 px-2 py-1 rounded bg-[#141414] border border-[#333333] font-mono text-cyan-300 focus:outline-none focus:border-[#FF6C37]"
                              />
                            </td>

                            {/* Data Type */}
                            <td className="py-2.5 px-3">
                              <select
                                value={f.type}
                                onChange={(e) =>
                                  handleFieldChange(idx, {
                                    type: e.target.value as DocField['type'],
                                  })
                                }
                                className="px-2 py-1 rounded bg-[#141414] border border-[#333333] text-neutral-200 font-mono text-[11px] focus:outline-none focus:border-[#FF6C37]"
                              >
                                <option value="string">string</option>
                                <option value="number">number</option>
                                <option value="boolean">boolean</option>
                                <option value="array">array</option>
                                <option value="object">object</option>
                              </select>
                            </td>

                            {/* 1-Click Mandatory Toggle */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleRequired(idx)}
                                title="Click to toggle Mandatory (Required) vs Optional"
                                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm ${
                                  f.required
                                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/50'
                                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700'
                                }`}
                              >
                                {f.required ? '🔴 Required' : '⚪ Optional'}
                              </button>
                            </td>

                            {/* Description */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={f.description}
                                onChange={(e) =>
                                  handleFieldChange(idx, { description: e.target.value })
                                }
                                placeholder="Explain field purpose..."
                                className="w-full min-w-[160px] px-2.5 py-1 rounded bg-[#141414] border border-[#333333] text-neutral-200 focus:outline-none focus:border-[#FF6C37]"
                              />
                            </td>

                            {/* Example */}
                            <td className="py-2.5 px-3 font-mono text-neutral-400">
                              <input
                                type="text"
                                value={f.example}
                                onChange={(e) =>
                                  handleFieldChange(idx, { example: e.target.value })
                                }
                                placeholder="Sample value"
                                className="w-24 sm:w-32 px-2 py-1 rounded bg-[#141414] border border-[#333333] font-mono text-neutral-300 focus:outline-none focus:border-[#FF6C37]"
                              />
                            </td>

                            {/* Delete */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleRemoveField(idx)}
                                className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete field"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Required Request Headers */}
              {headerFields.length > 0 && (
                <div className="rounded-xl bg-[#1D1D1D] border border-[#2B2B2B] p-4 space-y-2">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Required Headers ({headerFields.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {headerFields.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#141414] border border-[#2B2B2B] text-xs font-mono"
                      >
                        <span className="text-neutral-200 font-bold">{h.name}</span>
                        <span className="text-neutral-400 truncate max-w-[160px]">{h.example || 'value'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUCCESS & ERROR RESPONSES */}
          {activeTab === 'responses' && (
            <div className="space-y-5">
              {/* Success Response 200/201 */}
              <div className="rounded-xl bg-[#1D1D1D] border border-emerald-500/30 overflow-hidden shadow-lg">
                <div className="px-4 py-3 bg-emerald-950/30 border-b border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Success Response (200 / 201)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-neutral-400">Status Code:</span>
                    <input
                      type="number"
                      value={successResponse.statusCode}
                      onChange={(e) =>
                        setSuccessResponse((prev) => ({
                          ...prev,
                          statusCode: parseInt(e.target.value, 10) || 200,
                        }))
                      }
                      className="w-16 px-2 py-0.5 rounded bg-[#141414] border border-[#333333] text-xs font-bold font-mono text-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={successResponse.description}
                    onChange={(e) =>
                      setSuccessResponse((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Success description (e.g. User created successfully and returns JWT auth token)"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#141414] border border-[#333333] text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  />

                  <textarea
                    rows={7}
                    value={successResponse.body}
                    onChange={(e) =>
                      setSuccessResponse((prev) => ({ ...prev, body: e.target.value }))
                    }
                    className="w-full p-3 rounded-lg bg-[#121212] border border-[#2E2E2E] font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* Error Responses 400 / 401 / 500 */}
              <div className="rounded-xl bg-[#1D1D1D] border border-rose-500/30 overflow-hidden shadow-lg">
                <div className="px-4 py-3 bg-rose-950/30 border-b border-rose-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                      Error Response Examples ({errorResponses.length})
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      setErrorResponses((prev) => [
                        ...prev,
                        generateDefaultErrorResponse(400, fields[0]?.name || 'field'),
                      ])
                    }
                    className="flex items-center space-x-1 px-2 py-1 rounded bg-[#262626] hover:bg-[#333333] text-[11px] font-bold text-neutral-200 cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-rose-400" />
                    <span>Add Error Example</span>
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {errorResponses.map((err, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-[#141414] border border-[#2B2B2B] space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-neutral-400">Status Code:</span>
                          <input
                            type="number"
                            value={err.statusCode}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 400;
                              setErrorResponses((prev) =>
                                prev.map((item, idx) =>
                                  idx === i ? { ...item, statusCode: val } : item
                                )
                              );
                            }}
                            className="w-16 px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#333333] text-xs font-bold font-mono text-rose-400 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={err.statusText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setErrorResponses((prev) =>
                                prev.map((item, idx) =>
                                  idx === i ? { ...item, statusText: val } : item
                                )
                              );
                            }}
                            placeholder="Status text"
                            className="w-32 px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#333333] text-xs text-neutral-300 focus:outline-none"
                          />
                        </div>

                        {errorResponses.length > 1 && (
                          <button
                            onClick={() =>
                              setErrorResponses((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="p-1 text-neutral-500 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={4}
                        value={err.body}
                        onChange={(e) => {
                          const val = e.target.value;
                          setErrorResponses((prev) =>
                            prev.map((item, idx) =>
                              idx === i ? { ...item, body: val } : item
                            )
                          );
                        }}
                        className="w-full p-2.5 rounded bg-[#101010] border border-[#282828] font-mono text-xs text-rose-300 focus:outline-none leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE MARKDOWN PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300">
                  Ready-to-Paste GitHub / Notion / Slack Markdown:
                </span>
                <span className="text-[11px] text-neutral-500">
                  Formatted with tables, mandatory badges, and fetch snippets
                </span>
              </div>
              <pre className="p-4 rounded-xl bg-[#121212] border border-[#2E2E2E] text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[480px]">
                {currentMarkdown}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#1C1C1C] border-t border-[#292929] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#282828] hover:bg-[#333333] border border-[#3D3D3D] text-xs font-bold text-white transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#FF6C37]" />
                  <span>Copy Markdown for Dev</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadMarkdown}
              title="Download standalone Markdown file"
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-[#222222] hover:bg-[#2C2C2C] border border-[#333333] text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Download .md</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#252525] transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleSaveToSynqo}
              disabled={isSaving}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md active:scale-95 ${
                saveSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-[#FF6C37] hover:bg-[#ff7d4d]'
              }`}
            >
              {isSaving ? (
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saveSuccess ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saveSuccess ? 'Saved in Synqo Docs!' : 'Save to Synqo Docs'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
