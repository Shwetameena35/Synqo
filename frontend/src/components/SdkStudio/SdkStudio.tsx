import React, { useState, useEffect } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  Terminal,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { CollectionWithTree } from '../../types';
import { api } from '../../services/api';

interface SdkStudioProps {
  collections: CollectionWithTree[];
}

export const SdkStudio: React.FC<SdkStudioProps> = ({ collections }) => {
  const [selectedColId, setSelectedColId] = useState<string>(collections[0]?.id || '');
  const [language, setLanguage] = useState<'go' | 'typescript' | 'python' | 'java'>('go');
  const [code, setCode] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (collections.length > 0 && !selectedColId) {
      setSelectedColId(collections[0].id);
    }
  }, [collections, selectedColId]);

  useEffect(() => {
    if (selectedColId) {
      setLoading(true);
      api
        .generateSDK(selectedColId, language)
        .then((data) => {
          setCode(data.code);
          setFilename(data.filename);
        })
        .catch((err) => {
          setCode(`// Error generating SDK: ${err.message}`);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedColId, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'client.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 border-b border-[#2B2B2B] bg-[#1C1C1C] flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-neutral-100 flex items-center space-x-2">
            <Code2 className="h-4 w-4 text-[#FF6C37]" />
            <span>Multi-Language SDK Generator</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30 font-semibold">
              Ready to Embed
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Auto-generate idiomatic, type-safe API client code for Go, TypeScript, Python, and Java.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] border border-[#383838] text-xs font-semibold text-neutral-200 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-neutral-300" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF6C37] hover:bg-[#FF5216] active:bg-[#E5450B] text-xs font-bold text-white shadow-lg shadow-orange-600/25 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download {filename}</span>
          </button>
        </div>
      </div>

      {/* Selector Bar */}
      <div className="px-4 py-3 border-b border-[#2B2B2B] bg-[#181818] flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-neutral-400">Collection:</span>
            <select
              value={selectedColId}
              onChange={(e) => setSelectedColId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#333333] text-xs font-semibold text-neutral-200 focus:outline-none focus:border-[#FF6C37]"
            >
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name} ({col.requests?.length || 0} requests)
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-[1px] bg-[#2E2E2E]" />

          {/* Language Tabs */}
          <div className="flex items-center space-x-1 bg-[#141414] p-1 rounded-lg border border-[#2E2E2E]">
            {(['go', 'typescript', 'python', 'java'] as const).map((lang) => {
              const isSelected = language === lang;
              const labels: Record<string, string> = {
                go: 'Go',
                typescript: 'TypeScript',
                python: 'Python',
                java: 'Java',
              };
              return (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF6C37] text-white shadow-md shadow-orange-600/25'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#212121]'
                  }`}
                >
                  {labels[lang]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-neutral-500 font-mono">
          File: <span className="text-neutral-300 font-semibold">{filename}</span>
        </div>
      </div>

      {/* Code Editor Preview */}
      <div className="flex-1 overflow-auto p-4 bg-[#141414] font-mono text-xs">
        {loading ? (
          <div className="h-full flex items-center justify-center text-neutral-400 space-x-2">
            <div className="h-5 w-5 border-2 border-[#FF6C37] border-t-transparent rounded-full animate-spin" />
            <span>Compiling SDK syntax...</span>
          </div>
        ) : (
          <pre className="text-neutral-200 bg-[#181818] p-4 rounded-xl border border-[#2B2B2B] shadow-inner leading-relaxed overflow-x-auto">
            {code}
          </pre>
        )}
      </div>
    </div>
  );
};
