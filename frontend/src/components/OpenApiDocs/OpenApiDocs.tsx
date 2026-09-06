import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Play,
  Copy,
  Check,
  Search,
  ExternalLink,
  Code2,
  Upload,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CollectionWithTree } from '../../types';
import { api } from '../../services/api';

interface OpenApiDocsProps {
  collections: CollectionWithTree[];
  onTryInRunner: (method: string, url: string, body?: string) => void;
  onOpenImportModal: () => void;
}

export const OpenApiDocs: React.FC<OpenApiDocsProps> = ({
  collections,
  onTryInRunner,
  onOpenImportModal,
}) => {
  const [selectedColId, setSelectedColId] = useState<string>(collections[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSnippetLang, setActiveSnippetLang] = useState<Record<string, string>>({});
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

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
    const fullUrl = url.replace('{{baseUrl}}', 'https://api.nexus-cloud.io/v1');
    switch (lang) {
      case 'curl':
        return body
          ? `curl -X ${method} "${fullUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/\n/g, '')}'`
          : `curl -X ${method} "${fullUrl}" \\\n  -H "Accept: application/json"`;
      case 'javascript':
        return `const response = await fetch("${fullUrl}", {\n  method: "${method}",\n  headers: { "Content-Type": "application/json" }${
          body ? `,\n  body: JSON.stringify(${body.trim()})` : ''
        }\n});\nconst data = await response.json();`;
      case 'go':
        return `req, _ := http.NewRequest("${method}", "${fullUrl}", ${
          body ? 'bytes.NewBuffer([]byte(payload))' : 'nil'
        })\nresp, err := http.DefaultClient.Do(req)`;
      case 'python':
        return `import requests\n\nresponse = requests.${method.toLowerCase()}("${fullUrl}"${
          body ? `, json=${body.trim()}` : ''
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-[#2B2B2B] bg-[#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
        <div>
          <div className="text-sm font-bold text-neutral-100 flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-[#FF6C37]" />
            <span>Interactive API Documentation</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30 font-semibold">
              Swagger / OpenAPI
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Rendered interactive specs with schemas, code snippets, and live try-it-out testing.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
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
                  {c.name}
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
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {selectedCol && (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-lg font-bold text-white tracking-tight">{selectedCol.name}</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {selectedCol.description || 'Production API specification.'}
            </p>
            <div className="text-xs text-slate-500 font-mono pt-1">
              Base URL: <span className="text-cyan-400">https://api.nexus-cloud.io/v1</span>
            </div>
          </div>
        )}

        {/* Endpoints */}
        <div className="space-y-4">
          {(selectedCol?.requests || [])
            .filter(
              (r) =>
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.url.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((req) => {
              const currentLang = activeSnippetLang[req.id] || 'curl';
              const snippetCode = generateSnippet(req.method, req.url, currentLang, req.bodyContent);

              return (
                <div
                  key={req.id}
                  className="rounded-xl bg-[#1C1C1C] border border-[#2B2B2B] overflow-hidden shadow-lg"
                >
                  {/* Endpoint Header Bar */}
                  <div className="p-4 border-b border-[#2B2B2B] flex items-center justify-between bg-[#1E1E1E]">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getMethodBadgeClass(
                          req.method
                        )}`}
                      >
                        {req.method}
                      </span>
                      <span className="text-xs font-mono font-semibold text-neutral-200">{req.url}</span>
                    </div>

                    <button
                      onClick={() => onTryInRunner(req.method, req.url, req.bodyContent)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#FF6C37]/15 hover:bg-[#FF6C37]/25 border border-[#FF6C37]/40 text-xs font-bold text-[#FF6C37] transition-all cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Try in Runner</span>
                    </button>
                  </div>

                  {/* Endpoint Body */}
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="text-xs font-bold text-slate-300">{req.name}</div>
                      {req.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{req.description}</p>
                      )}
                    </div>

                    {/* Request Body Example if present */}
                    {req.bodyType === 'json' && req.bodyContent && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Request Body (application/json)
                        </span>
                        <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono text-cyan-300 whitespace-pre-wrap">
                          {req.bodyContent}
                        </pre>
                      </div>
                    )}

                    {/* Code Snippets Box */}
                    <div className="rounded-lg bg-slate-950 border border-slate-800/80 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs">
                          {['curl', 'javascript', 'go', 'python'].map((lang) => (
                            <button
                              key={lang}
                              onClick={() =>
                                setActiveSnippetLang((prev) => ({ ...prev, [req.id]: lang }))
                              }
                              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer ${
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
                          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
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
    </div>
  );
};
