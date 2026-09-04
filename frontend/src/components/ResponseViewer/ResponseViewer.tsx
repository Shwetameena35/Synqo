import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ExecuteResponsePayload } from '../../types';

interface ResponseViewerProps {
  response: ExecuteResponsePayload | null;
  isLoading: boolean;
}

type TabType = 'body' | 'headers' | 'tests';

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response, isLoading }) => {
  const [activeTab, setActiveTab] = useState<TabType>('body');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!response?.body) return;
    navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!response?.body) return;
    const blob = new Blob([response.body], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatBody = (raw: string) => {
    if (!raw) return '';
    try {
      let unescaped = raw;
      if (unescaped.includes('\\n') && !unescaped.includes('\n')) {
        unescaped = unescaped.replace(/\\n/g, '\n').replace(/\\t/g, '  ').replace(/\\"/g, '"');
      }
      const parsed = JSON.parse(unescaped);
      if (typeof parsed === 'string') {
        try {
          return JSON.stringify(JSON.parse(parsed), null, 2);
        } catch {
          return parsed;
        }
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw.replace(/\\n/g, '\n');
    }
  };

  const getStatusBadge = (code: number, text: string) => {
    const cleanText = text && text.startsWith(String(code)) ? text.replace(String(code), '').trim() : (text || '');
    const displayText = cleanText ? `${code} ${cleanText}` : `${code}`;

    if (code >= 200 && code < 300) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center space-x-1 shrink-0 whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>{displayText}</span>
        </span>
      );
    }
    if (code >= 400 && code < 500) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold flex items-center space-x-1 shrink-0 whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span>{displayText}</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold flex items-center space-x-1 shrink-0 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        <span>{displayText}</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#181818]">
      {/* Response Header Info Bar */}
      <div className="min-h-12 py-2 px-3 border-b border-[#2B2B2B] bg-[#1E1E1E] flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="font-game text-xs font-bold text-neutral-200 uppercase tracking-wider">Response</span>
          {response && getStatusBadge(response.statusCode, response.statusText)}
        </div>

        {response && (
          <div className="flex items-center flex-wrap gap-2.5 text-xs font-mono text-neutral-400 shrink-0">
            <div className="flex items-center space-x-1 whitespace-nowrap">
              <Clock className="h-3.5 w-3.5 text-[#FF6C37]" />
              <span>{response.latencyMs} ms</span>
            </div>
            <div className="flex items-center space-x-1 whitespace-nowrap">
              <HardDrive className="h-3.5 w-3.5 text-purple-400" />
              <span>{(response.responseSize / 1024).toFixed(2)} KB</span>
            </div>
            {response.assertionsTotal > 0 && (
              <div
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-full font-sans font-semibold text-[11px] whitespace-nowrap ${
                  response.assertionsPassed === response.assertionsTotal
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  {response.assertionsPassed}/{response.assertionsTotal} Passed
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response Tabs Header */}
      {response && (
        <div className="flex items-center justify-between px-4 border-b border-[#2B2B2B] bg-[#181818] text-xs select-none">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('body')}
              className={`px-3 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'body'
                  ? 'border-[#FF6C37] text-[#FF6C37] font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Body
            </button>

            <button
              onClick={() => setActiveTab('headers')}
              className={`px-3 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'headers'
                  ? 'border-[#FF6C37] text-[#FF6C37] font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Headers ({Object.keys(response.headers || {}).length})
            </button>

            <button
              onClick={() => setActiveTab('tests')}
              className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center space-x-1 ${
                activeTab === 'tests'
                  ? 'border-[#FF6C37] text-[#FF6C37] font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Test Results</span>
              {response.assertionsTotal > 0 && (
                <span className="text-[10px] px-1 rounded-full bg-[#FF6C37]/20 text-[#FF6C37]">
                  {response.assertionsPassed}/{response.assertionsTotal}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-1 py-1">
            <button
              onClick={handleCopy}
              title="Copy Response Body"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleDownload}
              title="Download Response JSON"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-neutral-400">
            <div className="h-8 w-8 border-2 border-[#FF6C37] border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-medium">Executing request and measuring latency...</div>
          </div>
        ) : !response ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-500 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#212121] border border-[#333333] flex items-center justify-center text-[#FF6C37] shadow-inner">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-200">No Response Yet</div>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Enter an API endpoint URL or select a collection request, then click "Send" or press Ctrl+Enter to test.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* BODY TAB */}
            {activeTab === 'body' && (
              <pre className="text-xs font-mono text-neutral-200 whitespace-pre-wrap break-all p-3 rounded-lg bg-[#141414] border border-[#2B2B2B] shadow-inner leading-relaxed">
                {formatBody(response.body)}
              </pre>
            )}

            {/* HEADERS TAB */}
            {activeTab === 'headers' && (
              <div className="border border-[#2B2B2B] rounded-lg overflow-hidden bg-[#1E1E1E]">
                <div className="grid grid-cols-12 bg-[#141414] px-3 py-2 text-[11px] font-semibold text-neutral-400 border-b border-[#2B2B2B]">
                  <div className="col-span-5">Header Key</div>
                  <div className="col-span-7">Header Value</div>
                </div>
                {Object.entries(response.headers || {}).map(([k, v], idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 px-3 py-1.5 text-xs font-mono border-b border-[#2B2B2B]/60 items-center"
                  >
                    <div className="col-span-5 text-[#FF6C37] font-medium truncate">{k}</div>
                    <div className="col-span-7 text-neutral-200 break-all">{v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* TESTS TAB */}
            {activeTab === 'tests' && (
              <div className="space-y-2">
                {response.assertionDetails && response.assertionDetails.length > 0 ? (
                  response.assertionDetails.map((ar, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                        ar.passed
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {ar.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold">{ar.message}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Expected: {ar.expected} | Actual: {ar.actual}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          ar.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {ar.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No assertions were defined for this request. Add assertions in the "Tests & Assertions" tab before sending.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
