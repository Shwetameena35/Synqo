import React, { useState } from 'react';
import {
  BookOpen,
  Play,
  Copy,
  Check,
  Search,
  Upload,
  Layers,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  Edit3,
} from 'lucide-react';
import { CollectionWithTree, DocMetadata, RequestItem } from '../../types';
import {
  generateCollectionMarkdownDoc,
  generateMarkdownDoc,
  parsePayloadToDocFields,
  parseHeaderParamToDocFields,
} from '../../utils/schemaParser';
import { ApiDocModal } from '../RequestBuilder/ApiDocModal';

interface OpenApiDocsProps {
  collections: CollectionWithTree[];
  onTryInRunner: (method: string, url: string, body?: string) => void;
  onOpenImportModal: () => void;
  onUpdateRequest?: (reqData: Partial<RequestItem>) => Promise<void> | void;
}

export const OpenApiDocs: React.FC<OpenApiDocsProps> = ({
  collections,
  onTryInRunner,
  onOpenImportModal,
  onUpdateRequest,
}) => {
  const [selectedColId, setSelectedColId] = useState<string>(collections[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSnippetLang, setActiveSnippetLang] = useState<Record<string, string>>({});
  const [activeResponseTab, setActiveResponseTab] = useState<Record<string, 'success' | 'error'>>({});
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [copiedCollectionDoc, setCopiedCollectionDoc] = useState(false);

  // Edit Doc Modal State
  const [editingRequest, setEditingRequest] = useState<RequestItem | null>(null);

  const selectedCol = collections.find((c) => c.id === selectedColId) || collections[0];

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'badge-get';
      case 'POST':
        return 'badge-post';
      case 'PUT':
        return 'badge-put';
      case 'PATCH':
        return 'badge-patch';
      case 'DELETE':
        return 'badge-delete';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  const generateSnippet = (method: string, url: string, lang: string, body?: string) => {
    const fullUrl = url.replace('{{baseUrl}}', 'http://localhost:8080');
    switch (lang) {
      case 'curl':
        return body && method !== 'GET' && method !== 'HEAD'
          ? `curl -X ${method} "${fullUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/\n/g, '')}'`
          : `curl -X ${method} "${fullUrl}" \\\n  -H "Accept: application/json"`;
      case 'javascript':
        return `// Frontend JavaScript Fetch Integration\nconst response = await fetch("${fullUrl}", {\n  method: "${method}",\n  headers: { "Content-Type": "application/json" }${
          body && method !== 'GET' && method !== 'HEAD' ? `,\n  body: JSON.stringify(${body.trim()})` : ''
        }\n});\nconst data = await response.json();`;
      case 'go':
        return `req, _ := http.NewRequest("${method}", "${fullUrl}", ${
          body ? 'bytes.NewBuffer([]byte(payload))' : 'nil'
        })\nresp, err := http.DefaultClient.Do(req)`;
      case 'python':
        return `import requests\n\nresponse = requests.${method.toLowerCase()}("${fullUrl}"${
          body && method !== 'GET' && method !== 'HEAD' ? `, json=${body.trim()}` : ''
        })\nprint(response.json())`;
      default:
        return `curl -X ${method} "${fullUrl}"`;
    }
  };

  const handleCopySnippet = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const handleCopyEndpointDoc = (req: RequestItem) => {
    let doc: DocMetadata = {};
    if (req.docsMetadata) {
      try {
        doc = JSON.parse(req.docsMetadata);
      } catch {
        doc = {};
      }
    }
    const md = generateMarkdownDoc(req, doc);
    navigator.clipboard.writeText(md);
    setCopiedDocId(req.id);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleCopyFullCollectionDocs = () => {
    if (!selectedCol) return;
    const md = generateCollectionMarkdownDoc(
      selectedCol.name,
      selectedCol.description,
      selectedCol.requests || []
    );
    navigator.clipboard.writeText(md);
    setCopiedCollectionDoc(true);
    setTimeout(() => setCopiedCollectionDoc(false), 2000);
  };

  const handleDownloadFullCollectionDocs = () => {
    if (!selectedCol) return;
    const md = generateCollectionMarkdownDoc(
      selectedCol.name,
      selectedCol.description,
      selectedCol.requests || []
    );
    const filename = `${selectedCol.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-api-docs.md`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDocFromModal = async (docMetadata: DocMetadata) => {
    if (!editingRequest || !onUpdateRequest) return;
    const docStr = JSON.stringify(docMetadata);
    await onUpdateRequest({
      ...editingRequest,
      docsMetadata: docStr,
    });
    setEditingRequest(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-[#2B2B2B] bg-[#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
        <div>
          <div className="text-sm font-bold text-neutral-100 flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-[#FF6C37]" />
            <span>Interactive API Documentation & Schema Hub</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30 font-semibold">
              Live Team Specs
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Auto-generated payload schemas, mandatory/optional field tables, success & error response examples, and code snippets.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopyFullCollectionDocs}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] border border-[#383838] text-xs font-bold text-white cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            {copiedCollectionDoc ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied Collection Docs!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#FF6C37]" />
                <span>Copy Collection Markdown</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadFullCollectionDocs}
            title="Download complete collection documentation as Markdown"
            className="p-2 rounded-lg bg-[#242424] hover:bg-[#303030] border border-[#383838] text-neutral-300 hover:text-white cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onOpenImportModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] border border-[#383838] text-xs font-semibold text-neutral-200 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-[#FF6C37]" />
            <span>Import Spec</span>
          </button>
        </div>
      </div>

      {/* Collection Switcher & Search Bar */}
      <div className="px-4 py-3 border-b border-[#2B2B2B] bg-[#181818] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-neutral-400">Documentation for:</span>
            <select
              value={selectedColId}
              onChange={(e) => setSelectedColId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#333333] text-xs font-bold text-neutral-200 focus:outline-none focus:border-[#FF6C37]"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.requests?.length || 0} APIs)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search endpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#141414] border border-[#333333] text-xs text-neutral-200 focus:outline-none focus:border-[#FF6C37]"
          />
        </div>
      </div>

      {/* Docs Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
        {selectedCol && (
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-white tracking-tight">{selectedCol.name}</div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30">
                {selectedCol.requests?.length || 0} Endpoints Documented
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              {selectedCol.description || 'Production API specification for frontend developers and client consumers.'}
            </p>
          </div>
        )}

        {/* Endpoints */}
        <div className="space-y-6">
          {(selectedCol?.requests || [])
            .filter(
              (r) =>
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.url.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((req) => {
              // Parse existing doc metadata or auto-infer on the fly
              let doc: DocMetadata = {};
              if (req.docsMetadata) {
                try {
                  doc = JSON.parse(req.docsMetadata);
                } catch {
                  doc = {};
                }
              }

              const fields =
                doc.fields && doc.fields.length > 0
                  ? doc.fields
                  : parsePayloadToDocFields(req.bodyContent || '', req.bodyType || 'none');

              const headerFields =
                doc.headerFields && doc.headerFields.length > 0
                  ? doc.headerFields
                  : parseHeaderParamToDocFields(req.headers || '');

              const successExample = doc.successResponse || {
                statusCode: 200,
                statusText: 'OK',
                description: 'Success response',
                body: '{\n  "success": true\n}',
              };

              const errorExample = (doc.errorResponses && doc.errorResponses[0]) || {
                statusCode: 400,
                statusText: 'Bad Request',
                description: 'Validation failed',
                body: '{\n  "error": "Validation failed",\n  "message": "Required fields missing"\n}',
              };

              const currentResTab = activeResponseTab[req.id] || 'success';
              const currentLang = activeSnippetLang[req.id] || 'curl';
              const snippetCode = generateSnippet(req.method, req.url, currentLang, req.bodyContent);

              return (
                <div
                  key={req.id}
                  className="rounded-2xl bg-[#1C1C1C] border border-[#2B2B2B] overflow-hidden shadow-xl"
                >
                  {/* Endpoint Header Bar */}
                  <div className="p-4 border-b border-[#2B2B2B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1E1E1E]">
                    <div className="flex items-center space-x-3 min-w-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getMethodBadgeClass(
                          req.method
                        )}`}
                      >
                        {req.method}
                      </span>
                      <span className="text-xs font-mono font-semibold text-neutral-200 truncate">{req.url}</span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleCopyEndpointDoc(req)}
                        title="Copy complete Markdown documentation for this endpoint"
                        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer transition-colors"
                      >
                        {copiedDocId === req.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400 text-[11px]">Copied Doc!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-[#FF6C37]" />
                            <span className="text-[11px]">Copy Markdown</span>
                          </>
                        )}
                      </button>

                      {onUpdateRequest && (
                        <button
                          onClick={() => setEditingRequest(req)}
                          title="Edit schema fields, descriptions, and response examples"
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer transition-colors"
                        >
                          <Edit3 className="h-3 w-3 text-neutral-400" />
                          <span className="text-[11px]">Edit Doc</span>
                        </button>
                      )}

                      <button
                        onClick={() => onTryInRunner(req.method, req.url, req.bodyContent)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FF6C37]/15 hover:bg-[#FF6C37]/25 border border-[#FF6C37]/40 text-xs font-bold text-[#FF6C37] transition-all cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Try in Runner</span>
                      </button>
                    </div>
                  </div>

                  {/* Endpoint Body */}
                  <div className="p-5 space-y-5">
                    {/* Name & Summary */}
                    <div>
                      <div className="text-sm font-bold text-white tracking-tight">{req.name}</div>
                      <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                        {doc.summary || req.description || 'Endpoint handles requests for this route.'}
                      </p>
                    </div>

                    {/* Required Headers (if any) */}
                    {headerFields.length > 0 && (
                      <div className="rounded-xl bg-[#171717] border border-[#292929] p-3 space-y-2">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          Required Request Headers
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {headerFields.map((h, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#222222] border border-[#333333] text-xs font-mono"
                            >
                              <span className="text-white font-bold">{h.name}:</span>
                              <span className="text-neutral-400">{h.example || 'value'}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Payload Fields Schema Table */}
                    {fields.length > 0 && (
                      <div className="rounded-xl bg-[#171717] border border-[#292929] overflow-hidden">
                        <div className="px-4 py-2.5 bg-[#1F1F1F] border-b border-[#2B2B2B] flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                            Request Body Schema ({req.bodyType || 'json'})
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {fields.filter((f) => f.required).length} Mandatory, {fields.filter((f) => !f.required).length} Optional
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-[#282828] bg-[#1A1A1A] text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">
                                <th className="py-2 px-4">Field</th>
                                <th className="py-2 px-3">Type</th>
                                <th className="py-2 px-3">Mandatory</th>
                                <th className="py-2 px-3">Description</th>
                                <th className="py-2 px-3">Example Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#242424]">
                              {fields.map((f, idx) => (
                                <tr key={idx} className="hover:bg-[#202020] transition-colors">
                                  <td className="py-2.5 px-4 font-mono font-bold text-cyan-400">
                                    {f.name}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-neutral-300">
                                    <span className="px-1.5 py-0.5 rounded bg-[#262626] border border-[#383838] text-[10px]">
                                      {f.type}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {f.required ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                        🔴 Yes (Required)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                                        ⚪ Optional
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-neutral-300">
                                    {f.description}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-neutral-400">
                                    {f.example || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Interactive Response Tabs (Success 200 vs Error 400) */}
                    <div className="rounded-xl bg-[#161616] border border-[#2B2B2B] overflow-hidden">
                      <div className="px-4 py-2 bg-[#1C1C1C] border-b border-[#292929] flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs">
                          <button
                            onClick={() =>
                              setActiveResponseTab((prev) => ({ ...prev, [req.id]: 'success' }))
                            }
                            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              currentResTab === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Success ({successExample.statusCode} {successExample.statusText})</span>
                          </button>

                          <button
                            onClick={() =>
                              setActiveResponseTab((prev) => ({ ...prev, [req.id]: 'error' }))
                            }
                            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              currentResTab === 'error'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                            <span>Error ({errorExample.statusCode} {errorExample.statusText})</span>
                          </button>
                        </div>

                        <span className="text-[11px] text-neutral-500">
                          {currentResTab === 'success'
                            ? successExample.description
                            : errorExample.description}
                        </span>
                      </div>

                      <pre
                        className={`p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-64 ${
                          currentResTab === 'success'
                            ? 'text-emerald-300 bg-[#0E1511]'
                            : 'text-rose-300 bg-[#170E0E]'
                        }`}
                      >
                        {currentResTab === 'success' ? successExample.body : errorExample.body}
                      </pre>
                    </div>

                    {/* Code Snippets Box */}
                    <div className="rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs">
                          {['curl', 'javascript', 'go', 'python'].map((lang) => (
                            <button
                              key={lang}
                              onClick={() =>
                                setActiveSnippetLang((prev) => ({ ...prev, [req.id]: lang }))
                              }
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                                currentLang === lang
                                  ? 'bg-[#FF6C37] text-white shadow-sm'
                                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#262626]'
                              }`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => handleCopySnippet(req.id, snippetCode)}
                          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          {copiedSnippetId === req.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400 text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span className="text-[11px]">Copy Snippet</span>
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="p-3 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                        {snippetCode}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Edit Doc Modal */}
      {editingRequest && (
        <ApiDocModal
          isOpen={true}
          onClose={() => setEditingRequest(null)}
          request={editingRequest}
          onSaveDoc={handleSaveDocFromModal}
        />
      )}
    </div>
  );
};
