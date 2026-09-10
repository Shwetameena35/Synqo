import React, { useState, useEffect, useMemo } from 'react';
import { X, Terminal, ArrowRight, Sparkles, CheckCircle2, Shield, Code, ListFilter } from 'lucide-react';
import { parseCurl, ParsedCurl } from '../../utils/curlParser';

interface CurlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parsed: ParsedCurl) => void;
}

const SAMPLE_CURLS = [
  {
    label: 'JSON POST',
    curl: `curl -X POST "https://api.example.com/v1/users" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer my_jwt_token" \\
  -d '{"name": "Alice Smith", "role": "admin", "active": true}'`,
  },
  {
    label: 'GET with Params',
    curl: `curl -X GET "https://api.example.com/v1/products?category=electronics&limit=25&sort=desc" \\
  -H "Accept: application/json" \\
  -H "X-Client-Version: 2.4.0"`,
  },
  {
    label: 'Form Data Upload',
    curl: `curl -X POST "https://api.example.com/v1/documents/upload" \\
  -H "Authorization: Bearer secret_key" \\
  -F "file=@annual_report.pdf" \\
  -F "department=finance" \\
  -F "priority=high"`,
  },
  {
    label: 'Basic Auth',
    curl: `curl -u "admin:secret123" \\
  -X PUT "https://api.example.com/v1/settings" \\
  -H "Content-Type: application/json" \\
  -d '{"maintenance": false}'`,
  },
];

export const CurlImportModal: React.FC<CurlImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [curlText, setCurlText] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Don't wipe if user re-opens, or reset if desired. Keeping fresh empty state or retaining text is fine.
    }
  }, [isOpen]);

  const parsed = useMemo<ParsedCurl | null>(() => {
    if (!curlText.trim()) return null;
    return parseCurl(curlText);
  }, [curlText]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (parsed) {
      onImport(parsed);
      onClose();
      setCurlText('');
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'POST':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PUT':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'PATCH':
        return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      case 'DELETE':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E1E1E] border border-[#2B2B2B] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2B2B2B] flex items-center justify-between bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#FF6C37]/10 text-[#FF6C37] border border-[#FF6C37]/20">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Import cURL Command
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#FF6C37]/20 text-[#FF6C37] px-2 py-0.5 rounded-full border border-[#FF6C37]/30">
                  Instant Parser
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Paste any cURL from Chrome DevTools, Postman, or Terminal to auto-populate the request.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#2B2B2B] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Templates Rail */}
        <div className="px-6 pt-3 pb-2 border-b border-[#2B2B2B] bg-[#141414] flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-neutral-400 mr-1">Quick Samples:</span>
          {SAMPLE_CURLS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurlText(s.curl)}
              className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-[#252525] hover:bg-[#303030] text-neutral-300 hover:text-white border border-[#353535] transition-colors cursor-pointer"
            >
              {s.label}
            </button>
          ))}
          {curlText && (
            <button
              onClick={() => setCurlText('')}
              className="ml-auto text-[11px] text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Input Textarea Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="relative">
            <textarea
              rows={8}
              value={curlText}
              onChange={(e) => setCurlText(e.target.value)}
              placeholder="curl -X POST &quot;https://api.example.com/v1/resource&quot; \
  -H &quot;Content-Type: application/json&quot; \
  -d '{&quot;key&quot;: &quot;value&quot;}'"
              className="w-full p-3.5 rounded-lg bg-[#141414] border border-[#333333] text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#FF6C37] leading-relaxed shadow-inner resize-none selection:bg-[#FF6C37]/30"
              autoFocus
            />
            <div className="text-[10px] text-neutral-500 mt-1 flex items-center justify-between">
              <span>Tip: You can also paste directly into the main address bar!</span>
              <span>{curlText.length} characters</span>
            </div>
          </div>

          {/* Live Parsed Preview */}
          {parsed && parsed.url ? (
            <div className="rounded-lg border border-[#333333] bg-[#171717] p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Parsed Request Preview
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getMethodColor(parsed.method)}`}>
                  {parsed.method}
                </span>
              </div>

              {/* Endpoint Preview */}
              <div className="p-2.5 rounded bg-[#111] border border-[#262626] font-mono text-xs text-neutral-200 break-all select-all">
                {parsed.url}
              </div>

              {/* Badges Breakdown */}
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222] border border-[#333] text-neutral-300">
                  <ListFilter className="h-3 w-3 text-sky-400" />
                  <span>{parsed.params.length} Query Params</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222] border border-[#333] text-neutral-300">
                  <Code className="h-3 w-3 text-emerald-400" />
                  <span>{parsed.headers.length} Headers</span>
                </div>
                {parsed.authType !== 'none' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222] border border-[#333] text-amber-300">
                    <Shield className="h-3 w-3 text-amber-400" />
                    <span>Auth: {parsed.authType.toUpperCase()}</span>
                  </div>
                )}
                {parsed.bodyType !== 'none' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222] border border-[#333] text-purple-300">
                    <Sparkles className="h-3 w-3 text-purple-400" />
                    <span>Body: {parsed.bodyType.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          ) : curlText.trim() ? (
            <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400/90 text-xs flex items-center space-x-2">
              <Terminal className="h-4 w-4 shrink-0" />
              <span>Enter a valid cURL command with an endpoint URL to parse.</span>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#2B2B2B] bg-[#181818] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-[#252525] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!parsed || !parsed.url}
            className="px-5 py-2 rounded-lg bg-[#FF6C37] hover:bg-[#FF8555] active:bg-[#E5450B] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-orange-600/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Import into Request</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
