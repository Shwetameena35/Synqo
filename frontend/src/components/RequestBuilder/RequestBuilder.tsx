import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Save,
  Play,
  Plus,
  Trash2,
  Check,
  FileCode,
  Sparkles,
  Key,
  Shield,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { RequestItem, HeaderParamItem, AssertionRule } from '../../types';
import { CodeSnippetModal } from './CodeSnippetModal';

interface RequestBuilderProps {
  request: RequestItem | null;
  onSend: (data: any) => void;
  onSave: (req: Partial<RequestItem>) => Promise<void> | void;
  isLoading: boolean;
  onOpenSdkModal: () => void;
  collections?: any[];
  onDraftChange?: (updates: Partial<RequestItem>) => void;
}

type TabType = 'params' | 'headers' | 'body' | 'auth' | 'tests';

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  request,
  onSend,
  onSave,
  isLoading,
  onOpenSdkModal,
  collections,
  onDraftChange,
}) => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('Untitled Request');
  const [selectedColId, setSelectedColId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('params');
  const [showSnippetModal, setShowSnippetModal] = useState(false);

  // Params & Headers
  const [params, setParams] = useState<HeaderParamItem[]>([]);
  const [headers, setHeaders] = useState<HeaderParamItem[]>([]);

  // Body
  const [bodyType, setBodyType] = useState('none');
  const [bodyContent, setBodyContent] = useState('');

  // Auth
  const [authType, setAuthType] = useState('none');
  const [authToken, setAuthToken] = useState('');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');
  const [apiKeyName, setApiKeyName] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('');

  // Tests / Assertions
  const [tests, setTests] = useState<AssertionRule[]>([]);

  // Save Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Prettify Status State
  const [prettifyStatus, setPrettifyStatus] = useState<'idle' | 'success' | 'repaired' | 'error'>('idle');
  const [prettifyErrorMsg, setPrettifyErrorMsg] = useState('');

  // Load request state on selection
  useEffect(() => {
    if (request) {
      setMethod(request.method || 'GET');
      setUrl(request.url || '');
      setName(request.name || 'Untitled Request');
      setSelectedColId(request.collectionId || (collections && collections.length > 0 ? collections[0].id : ''));

      try {
        const parsedParams = JSON.parse(request.params || '[]');
        setParams(Array.isArray(parsedParams) ? parsedParams : []);
      } catch {
        setParams([]);
      }

      try {
        const parsedHeaders = JSON.parse(request.headers || '[]');
        setHeaders(Array.isArray(parsedHeaders) ? parsedHeaders : []);
      } catch {
        setHeaders([]);
      }

      setBodyType(request.bodyType || 'none');
      let rawBody = request.bodyContent || '';
      if (rawBody.includes('\\n')) {
        rawBody = rawBody.replace(/\\n/g, '\n').replace(/\\t/g, '  ').replace(/\\"/g, '"');
      }
      try {
        const parsed = JSON.parse(rawBody);
        rawBody = JSON.stringify(parsed, null, 2);
      } catch {
        // keep raw
      }
      setBodyContent(rawBody);

      setAuthType(request.authType || 'none');
      try {
        const authCfg = JSON.parse(request.authConfig || '{}');
        setAuthToken(authCfg.token || '');
        setBasicUser(authCfg.username || '');
        setBasicPass(authCfg.password || '');
        setApiKeyName(authCfg.key || 'X-API-Key');
        setApiKeyValue(authCfg.value || '');
      } catch {
        // ignore
      }

      try {
        const parsedTests = JSON.parse(request.tests || '[]');
        setTests(Array.isArray(parsedTests) ? parsedTests : []);
      } catch {
        setTests([]);
      }
    }
  }, [request]);

  const handleSend = () => {
    const authConfig: any = {};
    if (authType === 'bearer') authConfig.token = authToken;
    if (authType === 'basic') {
      authConfig.username = basicUser;
      authConfig.password = basicPass;
    }
    if (authType === 'apikey') {
      authConfig.key = apiKeyName;
      authConfig.value = apiKeyValue;
      authConfig.addTo = 'header';
    }

    onSend({
      requestItemId: request?.id,
      requestName: name,
      method,
      url,
      headers,
      params,
      bodyType,
      bodyContent,
      authType,
      authConfig,
      tests,
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus('saving');

    const authConfig: any = {};
    if (authType === 'bearer') authConfig.token = authToken;
    if (authType === 'basic') {
      authConfig.username = basicUser;
      authConfig.password = basicPass;
    }
    if (authType === 'apikey') {
      authConfig.key = apiKeyName;
      authConfig.value = apiKeyValue;
    }

    try {
      await onSave({
        id: request?.id,
        collectionId: selectedColId || request?.collectionId,
        name,
        method,
        url,
        headers: JSON.stringify(headers),
        params: JSON.stringify(params),
        bodyType,
        bodyContent,
        authType,
        authConfig: JSON.stringify(authConfig),
        tests: JSON.stringify(tests),
      });
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S to Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, method, url, headers, params, bodyType, bodyContent, authType, authToken, basicUser, basicPass, apiKeyName, apiKeyValue, tests, request, isSaving]);

  const getJsonErrorDetails = (raw: string, errMsg: string) => {
    if (errMsg.includes('line') && errMsg.includes('column')) {
      return errMsg;
    }
    const posMatch = errMsg.match(/at position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const before = raw.slice(0, pos);
      const lines = before.split('\n');
      const lineNum = lines.length;
      const colNum = lines[lines.length - 1].length + 1;
      return `${errMsg} (at line ${lineNum}, column ${colNum})`;
    }
    return errMsg;
  };

  const tryRepairJSON = (raw: string): string | null => {
    let s = raw.trim();
    if (s.includes('\\n')) {
      s = s.replace(/\\n/g, '\n').replace(/\\t/g, '  ').replace(/\\"/g, '"');
    }

    try {
      JSON.parse(s);
      return s;
    } catch {
      // Continue to smart repairs
    }

    // Remove single-line comments // and multi-line comments /* */
    s = s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Replace single quotes with double quotes around keys and values
    s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

    // Wrap unquoted object keys in double quotes: { key: "val" } -> { "key": "val" }
    s = s.replace(/([{,]\s*)([a-zA-Z0-9_$-]+)\s*:/g, '$1"$2":');

    // Remove trailing commas before } or ]
    s = s.replace(/,\s*([\]}])/g, '$1');

    try {
      JSON.parse(s);
      return s;
    } catch {
      return null;
    }
  };

  // Real-time JSON validation
  const jsonError = useMemo(() => {
    if (bodyType !== 'json' || !bodyContent.trim()) return null;
    try {
      let text = bodyContent;
      if (text.includes('\\n')) {
        text = text.replace(/\\n/g, '\n').replace(/\\t/g, '  ').replace(/\\"/g, '"');
      }
      JSON.parse(text);
      return null;
    } catch (err: any) {
      return getJsonErrorDetails(bodyContent, err.message || 'Invalid JSON syntax');
    }
  }, [bodyType, bodyContent]);

  const formatJSONBody = () => {
    if (!bodyContent.trim()) return;

    // First try smart repair & parse
    const repaired = tryRepairJSON(bodyContent);
    if (repaired) {
      try {
        const parsed = JSON.parse(repaired);
        const pretty = JSON.stringify(parsed, null, 2);
        setBodyContent(pretty);
        const isRepaired = repaired !== bodyContent.trim();
        setPrettifyStatus(isRepaired ? 'repaired' : 'success');
        setPrettifyErrorMsg('');
        setTimeout(() => setPrettifyStatus('idle'), 2500);
        return;
      } catch {
        // continue to error reporting
      }
    }

    // If parsing / repair fails completely, extract exact error
    let rawError = 'Invalid JSON syntax';
    try {
      let unescaped = bodyContent;
      if (unescaped.includes('\\n')) {
        unescaped = unescaped.replace(/\\n/g, '\n').replace(/\\t/g, '  ').replace(/\\"/g, '"');
      }
      JSON.parse(unescaped);
    } catch (err: any) {
      rawError = getJsonErrorDetails(bodyContent, err.message || 'Invalid JSON syntax');
    }

    setPrettifyStatus('error');
    setPrettifyErrorMsg(rawError);
    setTimeout(() => {
      setPrettifyStatus('idle');
    }, 3500);
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] border-r border-[#2B2B2B]">
      {/* Request Title & Actions */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-[#2B2B2B] flex items-center justify-between bg-[#1E1E1E] gap-2 min-w-0">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            const newName = e.target.value;
            setName(newName);
            onDraftChange?.({ name: newName });
          }}
          placeholder="Request Name"
          className="bg-transparent text-sm font-semibold text-neutral-100 focus:outline-none focus:border-b border-[#FF6C37] flex-1 min-w-[80px] max-w-xs truncate"
        />

        {/* Collection Selector Dropdown */}
        {collections && collections.length > 0 && (
          <div className="flex items-center space-x-1.5 shrink-0 bg-[#262626] px-2 py-1 rounded border border-[#383838] text-xs">
            <Folder className="h-3.5 w-3.5 text-[#FF6C37] shrink-0" />
            <select
              value={selectedColId}
              onChange={(e) => {
                const newColId = e.target.value;
                setSelectedColId(newColId);
                onDraftChange?.({ collectionId: newColId });
              }}
              className="bg-transparent text-neutral-300 focus:outline-none text-[11px] font-medium cursor-pointer max-w-[120px] sm:max-w-[160px] truncate"
              title="Collection this request belongs to"
            >
              {collections.map((col) => (
                <option key={col.id} value={col.id} className="bg-[#1E1E1E] text-neutral-200">
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            onClick={() => setShowSnippetModal(true)}
            title="Generate code snippet in cURL, JavaScript, Python, Go, or Java"
            className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#383838] text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <FileCode className="h-3.5 w-3.5 text-[#FF6C37]" />
            <span className="hidden sm:inline">Generate Code</span>
            <span className="sm:hidden">Code</span>
          </button>

          {/* Save Button with Dynamic Visual Feedback */}
          {saveStatus === 'saving' ? (
            <button
              disabled
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded bg-[#262626] border border-[#FF6C37]/50 text-xs text-[#FF6C37] cursor-wait shrink-0 transition-all font-game"
            >
              <div className="h-3.5 w-3.5 border-2 border-[#FF6C37] border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="font-bold tracking-wider uppercase text-[11px]">Saving...</span>
            </button>
          ) : saveStatus === 'saved' ? (
            <button
              disabled
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/50 text-xs text-emerald-400 shrink-0 transition-all font-game"
            >
              <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3] shrink-0" />
              <span className="font-bold tracking-wider uppercase text-[11px]">Saved!</span>
            </button>
          ) : saveStatus === 'error' ? (
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded bg-rose-500/20 border border-rose-500/50 text-xs text-rose-400 shrink-0 transition-all font-game cursor-pointer"
            >
              <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="font-bold tracking-wider uppercase text-[11px]">Failed</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#383838] text-xs text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0 active:scale-95 font-game"
              title="Save Request Configuration (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5 text-[#FF6C37] shrink-0" />
              <span className="font-bold tracking-wider uppercase text-[11px]">Save</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Address Bar */}
      <div className="p-2.5 sm:p-4 border-b border-[#2B2B2B] bg-[#1E1E1E]">
        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          {/* Method Select */}
          <select
            value={method}
            onChange={(e) => {
              const newMethod = e.target.value;
              setMethod(newMethod);
              onDraftChange?.({ method: newMethod });
            }}
            className="font-game px-2 sm:px-3 py-2 rounded-lg bg-[#141414] border border-[#333333] text-xs font-black text-[#FF6C37] focus:outline-none focus:border-[#FF6C37] uppercase tracking-wider shadow-inner shrink-0"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* URL Input */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/v1/users or {{baseUrl}}/users"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleSend();
                }
              }}
              className="w-full px-2.5 sm:px-3.5 py-2 rounded-lg bg-[#141414] border border-[#333333] text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#FF6C37] shadow-inner truncate"
            />
            {url.includes('{{') && (
              <span className="font-game hidden md:inline absolute right-3 top-2 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-wider">
                Env Var Active
              </span>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="font-game flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-6 py-2 rounded-lg bg-[#FF6C37] hover:bg-[#FF5216] active:bg-[#E5450B] text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/30 disabled:opacity-50 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            {isLoading ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center px-4 border-b border-[#2B2B2B] bg-[#181818] text-xs select-none">
        <button
          onClick={() => setActiveTab('params')}
          className={`font-game px-3 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 uppercase text-[11px] tracking-wider cursor-pointer ${
            activeTab === 'params'
              ? 'border-[#FF6C37] text-[#FF6C37] font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span>Params</span>
          {Array.isArray(params) && params.filter((p) => p.enabled).length > 0 && (
            <span className="text-[10px] px-1 rounded-full bg-[#FF6C37]/20 text-[#FF6C37]">
              {params.filter((p) => p.enabled).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('headers')}
          className={`font-game px-3 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 uppercase text-[11px] tracking-wider cursor-pointer ${
            activeTab === 'headers'
              ? 'border-[#FF6C37] text-[#FF6C37] font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span>Headers</span>
          {Array.isArray(headers) && headers.filter((h) => h.enabled).length > 0 && (
            <span className="text-[10px] px-1 rounded-full bg-[#FF6C37]/20 text-[#FF6C37]">
              {headers.filter((h) => h.enabled).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('body')}
          className={`font-game px-3 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 uppercase text-[11px] tracking-wider cursor-pointer ${
            activeTab === 'body'
              ? 'border-[#FF6C37] text-[#FF6C37] font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span>Body</span>
          {bodyType !== 'none' && (
            bodyType === 'json' && jsonError ? (
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500/50" title="Invalid JSON syntax in body" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF6C37]" />
            )
          )}
        </button>

        <button
          onClick={() => setActiveTab('auth')}
          className={`font-game px-3 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 uppercase text-[11px] tracking-wider cursor-pointer ${
            activeTab === 'auth'
              ? 'border-[#FF6C37] text-[#FF6C37] font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span>Auth</span>
          {authType !== 'none' && <span className="h-1.5 w-1.5 rounded-full bg-[#FF6C37]" />}
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`font-game px-3 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 uppercase text-[11px] tracking-wider cursor-pointer ${
            activeTab === 'tests'
              ? 'border-[#FF6C37] text-[#FF6C37] font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span>Tests</span>
          {tests.length > 0 && (
            <span className="text-[10px] px-1 rounded-full bg-[#FF6C37]/20 text-[#FF6C37]">
              {tests.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* PARAMS TAB */}
        {activeTab === 'params' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Query Parameters</span>
              <button
                onClick={() => setParams([...params, { key: '', value: '', enabled: true }])}
                className="text-xs text-[#FF6C37] hover:text-[#FF8555] flex items-center space-x-1 font-semibold cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Param</span>
              </button>
            </div>

            <div className="border border-[#2E2E2E] rounded-lg overflow-hidden bg-[#1E1E1E]">
              <div className="grid grid-cols-12 bg-[#141414] px-3 py-1.5 text-[11px] font-semibold text-neutral-400 border-b border-[#2E2E2E]">
                <div className="col-span-1 text-center">Use</div>
                <div className="col-span-5">Key</div>
                <div className="col-span-5">Value</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {(params || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No query parameters. Click "Add Param" to configure.
                </div>
              ) : (
                (params || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 px-3 py-1.5 items-center border-b border-slate-800/60 text-xs"
                  >
                    <div className="col-span-1 text-center">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => {
                          const copy = [...params];
                          copy[idx].enabled = e.target.checked;
                          setParams(copy);
                        }}
                        className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                      />
                    </div>
                    <div className="col-span-5 pr-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={item.key}
                        onChange={(e) => {
                          const copy = [...params];
                          copy[idx].key = e.target.value;
                          setParams(copy);
                        }}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="col-span-5 pr-2">
                      <input
                        type="text"
                        placeholder="Value (or {{var}})"
                        value={item.value}
                        onChange={(e) => {
                          const copy = [...params];
                          copy[idx].value = e.target.value;
                          setParams(copy);
                        }}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => setParams(params.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* HEADERS TAB */}
        {activeTab === 'headers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Request Headers</span>
              <button
                onClick={() => setHeaders([...headers, { key: '', value: '', enabled: true }])}
                className="text-xs text-[#FF6C37] hover:text-[#FF8555] flex items-center space-x-1 font-semibold cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Header</span>
              </button>
            </div>

            <div className="border border-[#2E2E2E] rounded-lg overflow-hidden bg-[#1E1E1E]">
              <div className="grid grid-cols-12 bg-[#141414] px-3 py-1.5 text-[11px] font-semibold text-neutral-400 border-b border-[#2E2E2E]">
                <div className="col-span-1 text-center">Use</div>
                <div className="col-span-5">Header Key</div>
                <div className="col-span-5">Header Value</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {(headers || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No custom headers configured.
                </div>
              ) : (
                (headers || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 px-3 py-1.5 items-center border-b border-slate-800/60 text-xs"
                  >
                    <div className="col-span-1 text-center">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => {
                          const copy = [...headers];
                          copy[idx].enabled = e.target.checked;
                          setHeaders(copy);
                        }}
                        className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                      />
                    </div>
                    <div className="col-span-5 pr-2">
                      <input
                        type="text"
                        placeholder="Content-Type"
                        value={item.key}
                        onChange={(e) => {
                          const copy = [...headers];
                          copy[idx].key = e.target.value;
                          setHeaders(copy);
                        }}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="col-span-5 pr-2">
                      <input
                        type="text"
                        placeholder="application/json"
                        value={item.value}
                        onChange={(e) => {
                          const copy = [...headers];
                          copy[idx].value = e.target.value;
                          setHeaders(copy);
                        }}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* BODY TAB */}
        {activeTab === 'body' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-3 text-xs">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyType"
                    checked={bodyType === 'none'}
                    onChange={() => setBodyType('none')}
                    className="text-cyan-500"
                  />
                  <span className="text-slate-300">none</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyType"
                    checked={bodyType === 'json'}
                    onChange={() => setBodyType('json')}
                    className="text-[#FF6C37]"
                  />
                  <span className="text-neutral-300">JSON</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyType"
                    checked={bodyType === 'raw'}
                    onChange={() => setBodyType('raw')}
                    className="text-cyan-500"
                  />
                  <span className="text-slate-300">Raw Text</span>
                </label>
              </div>

              {bodyType === 'json' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={formatJSONBody}
                    disabled={!bodyContent.trim()}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded border text-xs transition-all cursor-pointer ${
                      prettifyStatus === 'success' || prettifyStatus === 'repaired'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : prettifyStatus === 'error'
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                        : 'bg-[#262626] border-[#383838] hover:border-[#444] text-[#FF6C37] disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                    title="Prettify and auto-fix JSON syntax"
                  >
                    {prettifyStatus === 'success' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Prettified!</span>
                      </>
                    ) : prettifyStatus === 'repaired' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Fixed & Prettified!</span>
                      </>
                    ) : prettifyStatus === 'error' ? (
                      <>
                        <AlertCircle className="h-3 w-3 text-rose-400" />
                        <span>Syntax Error</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        <span>Prettify JSON</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {bodyType !== 'none' ? (
              <textarea
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                placeholder={
                  bodyType === 'json'
                    ? '{\n  "key": "value"\n}'
                    : 'Enter raw request body content...'
                }
                rows={12}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                title={bodyType === 'json' && jsonError ? `JSON Error: ${jsonError}` : undefined}
                style={{
                  textDecoration: bodyType === 'json' && jsonError ? 'underline wavy #ef4444' : 'none',
                  textUnderlineOffset: '4px',
                  textDecorationThickness: '1.5px',
                }}
                className={`w-full p-3 rounded-lg bg-[#141414] border text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none shadow-inner leading-relaxed transition-colors ${
                  bodyType === 'json' && jsonError
                    ? 'border-rose-500/50 focus:border-rose-500'
                    : 'border-[#2E2E2E] focus:border-[#FF6C37]'
                }`}
              />
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                This request has no body payload. Select "JSON" or "Raw Text" above to configure.
              </div>
            )}
          </div>
        )}

        {/* AUTH TAB */}
        {activeTab === 'auth' && (
          <div className="space-y-4 max-w-lg">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Authentication Type</label>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth (Username / Password)</option>
                <option value="apikey">API Key</option>
              </select>
            </div>

            {authType === 'bearer' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Bearer Token</label>
                <input
                  type="text"
                  placeholder="e.g. eyJhbGciOi... or {{authToken}}"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {authType === 'basic' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Username</label>
                  <input
                    type="text"
                    value={basicUser}
                    onChange={(e) => setBasicUser(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Password</label>
                  <input
                    type="password"
                    value={basicPass}
                    onChange={(e) => setBasicPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {authType === 'apikey' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Header Name</label>
                  <input
                    type="text"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">API Key Value</label>
                  <input
                    type="text"
                    value={apiKeyValue}
                    onChange={(e) => setApiKeyValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TESTS & ASSERTIONS TAB */}
        {activeTab === 'tests' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300">Automated Assertions</span>
                <p className="text-[11px] text-slate-500">
                  Verify response criteria like status codes, latency thresholds, and content.
                </p>
              </div>
              <button
                onClick={() =>
                  setTests([
                    ...tests,
                    { type: 'status_code', operator: 'equals', value: '200' },
                  ])
                }
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium"
              >
                <Plus className="h-3 w-3" />
                <span>Add Assertion</span>
              </button>
            </div>

            <div className="space-y-2">
              {tests.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/30 rounded-lg border border-slate-800/80">
                  No assertions added yet. Click "Add Assertion" to test status code or response time.
                </div>
              ) : (
                tests.map((test, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <select
                      value={test.type}
                      onChange={(e) => {
                        const copy = [...tests];
                        copy[idx].type = e.target.value as any;
                        setTests(copy);
                      }}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none text-xs"
                    >
                      <option value="status_code">Status Code</option>
                      <option value="response_time">Response Time (ms)</option>
                      <option value="body_contains">Body Contains</option>
                      <option value="header_exists">Header Exists</option>
                    </select>

                    <select
                      value={test.operator}
                      onChange={(e) => {
                        const copy = [...tests];
                        copy[idx].operator = e.target.value as any;
                        setTests(copy);
                      }}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none text-xs"
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">does not equal</option>
                      <option value="less_than">is less than</option>
                      <option value="greater_than">is greater than</option>
                      <option value="contains">contains</option>
                      <option value="is_2xx">is 2xx success</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Expected Value"
                      value={test.value}
                      onChange={(e) => {
                        const copy = [...tests];
                        copy[idx].value = e.target.value;
                        setTests(copy);
                      }}
                      className="flex-1 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />

                    <button
                      onClick={() => setTests(tests.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* In-Place Code Snippet Modal */}
      <CodeSnippetModal
        isOpen={showSnippetModal}
        onClose={() => setShowSnippetModal(false)}
        method={method}
        url={url}
        headers={headers}
        params={params}
        body={bodyContent}
        onOpenSdkStudio={onOpenSdkModal}
      />
    </div>
  );
};
