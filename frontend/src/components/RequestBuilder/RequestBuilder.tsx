import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  MessageSquare,
  CornerDownRight,
  CheckCircle,
  RefreshCw,
  Terminal,
  X,
} from 'lucide-react';
import { RequestItem, HeaderParamItem, FormDataItem, AssertionRule, RequestComment, ExecuteResponsePayload, Environment, VariableItem } from '../../types';
import { api } from '../../services/api';
import { CodeSnippetModal } from './CodeSnippetModal';
import { CurlImportModal } from './CurlImportModal';
import { VariableInspectorModal } from './VariableInspectorModal';
import { parseCurl, ParsedCurl } from '../../utils/curlParser';

function getVariableAtPosition(text: string, position: number): string | null {
  const regex = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    if (position >= start && position <= end) {
      return match[1].trim();
    }
  }
  return null;
}

function extractAllVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const vars: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim();
    if (!vars.includes(name)) {
      vars.push(name);
    }
  }
  return vars;
}

function parseUrlTokens(url: string) {
  if (!url) return [];
  const regex = /(\{\{[^}]+\}\})/g;
  const parts: { text: string; isVar: boolean; varName: string | null }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(url)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: url.slice(lastIndex, match.index),
        isVar: false,
        varName: null,
      });
    }
    parts.push({
      text: match[0],
      isVar: true,
      varName: match[1].slice(2, -2).trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < url.length) {
    parts.push({
      text: url.slice(lastIndex),
      isVar: false,
      varName: null,
    });
  }

  return parts;
}

interface RequestBuilderProps {
  request: RequestItem | null;
  onSend: (data: any) => void;
  onSave: (req: Partial<RequestItem>) => Promise<void> | void;
  isLoading: boolean;
  response?: ExecuteResponsePayload | null;
  currentEnvironment?: Environment | null;
  onOpenSdkModal: () => void;
  collections?: any[];
  onDraftChange?: (updates: Partial<RequestItem>) => void;
  onOpenEnvModal?: () => void;
  onEnvironmentUpdated?: (updated: Environment) => void;
}

type TabType = 'params' | 'headers' | 'body' | 'auth' | 'tests' | 'comments';

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  request,
  onSend,
  onSave,
  isLoading,
  response,
  currentEnvironment,
  onOpenSdkModal,
  collections,
  onDraftChange,
  onOpenEnvModal,
  onEnvironmentUpdated,
}) => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('Untitled Request');
  const [selectedColId, setSelectedColId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('params');
  const [showSnippetModal, setShowSnippetModal] = useState(false);
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [curlImportToast, setCurlImportToast] = useState<string | null>(null);
  const [inspectingVariable, setInspectingVariable] = useState<string | null>(null);

  const urlBackdropRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const activeEnvVars: VariableItem[] = useMemo(() => {
    if (!currentEnvironment?.variables) return [];
    try {
      const parsed = JSON.parse(currentEnvironment.variables);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [currentEnvironment]);

  const handleInspectVariable = (varName: string) => {
    setInspectingVariable(varName);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const val = target.value;
        const pos = target.selectionStart ?? 0;
        const varAtPos = getVariableAtPosition(val, pos);
        const allVars = extractAllVariables(val);
        const targetVar = varAtPos || (allVars.length > 0 ? allVars[0] : null);
        if (targetVar) {
          e.preventDefault();
          e.stopPropagation();
          setInspectingVariable(targetVar);
          return;
        }
      }
      const text = target.textContent || '';
      if (text.includes('{{')) {
        const allVars = extractAllVariables(text);
        if (allVars.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          setInspectingVariable(allVars[0]);
          return;
        }
      }
    }
  };

  const handleImportCurl = (parsed: ParsedCurl) => {
    setMethod(parsed.method);
    setUrl(parsed.url);
    setHeaders(parsed.headers);
    setParams(parsed.params);
    setBodyType(parsed.bodyType);
    setBodyContent(parsed.bodyContent);
    setFormDataList(parsed.formDataList);
    setUrlEncodedList(parsed.urlEncodedList);
    setAuthType(parsed.authType);
    setAuthToken(parsed.authToken);
    setBasicUser(parsed.basicUser);
    setBasicPass(parsed.basicPass);

    if (parsed.bodyType !== 'none') {
      setActiveTab('body');
    } else if (parsed.params.length > 0) {
      setActiveTab('params');
    } else if (parsed.headers.length > 0) {
      setActiveTab('headers');
    } else if (parsed.authType !== 'none') {
      setActiveTab('auth');
    }

    let effBody = parsed.bodyContent;
    if (parsed.bodyType === 'form-data') {
      effBody = JSON.stringify(parsed.formDataList);
    } else if (parsed.bodyType === 'x-www-form-urlencoded') {
      effBody = JSON.stringify(parsed.urlEncodedList);
    }

    const authCfg: any = {};
    if (parsed.authType === 'bearer') authCfg.token = parsed.authToken;
    if (parsed.authType === 'basic') {
      authCfg.username = parsed.basicUser;
      authCfg.password = parsed.basicPass;
    }

    onDraftChange?.({
      method: parsed.method,
      url: parsed.url,
      headers: JSON.stringify(parsed.headers),
      params: JSON.stringify(parsed.params),
      bodyType: parsed.bodyType,
      bodyContent: effBody,
      authType: parsed.authType,
      authConfig: JSON.stringify(authCfg),
    });

    setCurlImportToast(`Imported cURL: ${parsed.method} with ${parsed.headers.length} header(s)`);
    setTimeout(() => {
      setCurlImportToast(null);
    }, 4000);
  };

  // Params & Headers
  const [params, setParams] = useState<HeaderParamItem[]>([]);
  const [headers, setHeaders] = useState<HeaderParamItem[]>([]);

  // Body
  const [bodyType, setBodyType] = useState('none');
  const [bodyContent, setBodyContent] = useState('');
  const [formDataList, setFormDataList] = useState<FormDataItem[]>([]);
  const [urlEncodedList, setUrlEncodedList] = useState<FormDataItem[]>([]);

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

  // Comments State
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadComments = async () => {
    if (!request?.id || request.id.startsWith('req_temp_')) {
      setComments([]);
      return;
    }
    setIsLoadingComments(true);
    try {
      const data = await api.getComments(request.id);
      setComments(data || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (request?.id) {
      loadComments();
    }
  }, [request?.id]);

  const handleAddComment = async (parentId?: string, customText?: string) => {
    const content = (customText !== undefined ? customText : parentId ? replyText : newCommentText).trim();
    if (!content || !request?.id) return;

    if (request.id.startsWith('req_temp_')) {
      alert('Please save this request first before posting comments.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const statusCode = response?.statusCode;
      await api.addComment(request.id, {
        content,
        parentId,
        statusCode,
      });
      if (parentId) {
        setReplyingToId(null);
        setReplyText('');
      } else {
        setNewCommentText('');
      }
      await loadComments();
    } catch (err: any) {
      alert('Failed to post comment: ' + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleResolve = async (commentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'resolved' : 'open';
    try {
      await api.toggleResolveComment(commentId, newStatus);
      await loadComments();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.deleteComment(commentId);
      await loadComments();
    } catch (err: any) {
      alert('Failed to delete comment: ' + err.message);
    }
  };

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

      const reqBodyType = request.bodyType || 'none';
      setBodyType(reqBodyType);

      if (reqBodyType === 'form-data' || reqBodyType === 'formdata') {
        try {
          const parsed = JSON.parse(request.bodyContent || '[]');
          setFormDataList(Array.isArray(parsed) ? parsed : []);
        } catch {
          setFormDataList([]);
        }
      } else {
        setFormDataList([]);
      }

      if (reqBodyType === 'x-www-form-urlencoded') {
        try {
          const parsed = JSON.parse(request.bodyContent || '[]');
          setUrlEncodedList(Array.isArray(parsed) ? parsed : []);
        } catch {
          setUrlEncodedList([]);
        }
      } else {
        setUrlEncodedList([]);
      }

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

    const getEffectiveBodyContent = () => {
    if (bodyType === 'form-data') {
      return JSON.stringify(formDataList);
    }
    if (bodyType === 'x-www-form-urlencoded') {
      return JSON.stringify(urlEncodedList);
    }
    return bodyContent;
  };

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
      bodyContent: getEffectiveBodyContent(),
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
        bodyContent: getEffectiveBodyContent(),
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

  // Keyboard shortcuts: Ctrl+S to Save & Ctrl+Enter to Send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter -> Send API Request
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading) {
          handleSend();
        }
        return;
      }

      // Ctrl+S or Cmd+S -> Save Request Configuration
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, method, url, headers, params, bodyType, bodyContent, formDataList, urlEncodedList, authType, authToken, basicUser, basicPass, apiKeyName, apiKeyValue, tests, request, isSaving, isLoading]);

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
    <div
      className="flex flex-col h-full bg-[#181818] border-r border-[#2B2B2B]"
      onClickCapture={handleContainerClick}
    >
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
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <button
            onClick={() => setActiveTab('comments')}
            title="Team Comments & Issue Discussion"
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 rounded border text-xs transition-colors cursor-pointer shrink-0 ${
              activeTab === 'comments'
                ? 'bg-[#FF6C37]/20 border-[#FF6C37] text-[#FF6C37]'
                : 'bg-[#262626] hover:bg-[#333333] border-[#383838] text-neutral-300 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-[#FF6C37]" />
            <span className="hidden sm:inline">Comments</span>
            {comments.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none ${
                comments.some((c) => c.status === 'open')
                  ? 'bg-rose-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}>
                {comments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowCurlModal(true)}
            title="Import raw cURL command into active request"
            className="flex items-center space-x-1 px-1.5 sm:px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#383838] text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <Terminal className="h-3.5 w-3.5 text-[#FF6C37]" />
            <span className="hidden md:inline">Import cURL</span>
            <span className="md:hidden hidden xs:inline">cURL</span>
          </button>

          <button
            onClick={() => setShowSnippetModal(true)}
            title="Generate code snippet in cURL, JavaScript, Python, Go, or Java"
            className="flex items-center space-x-1 px-1.5 sm:px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#383838] text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <FileCode className="h-3.5 w-3.5 text-[#FF6C37]" />
            <span className="hidden md:inline">Generate Code</span>
            <span className="md:hidden hidden xs:inline">Code</span>
          </button>

          {/* Save Button with Dynamic Visual Feedback */}
          {saveStatus === 'saving' ? (
            <button
              disabled
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 rounded bg-[#262626] border border-[#FF6C37]/50 text-xs text-[#FF6C37] cursor-wait shrink-0 transition-all font-game"
            >
              <div className="h-3.5 w-3.5 border-2 border-[#FF6C37] border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="font-bold tracking-wider uppercase text-[11px] hidden xs:inline">Saving...</span>
            </button>
          ) : saveStatus === 'saved' ? (
            <button
              disabled
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/50 text-xs text-emerald-400 shrink-0 transition-all font-game"
            >
              <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3] shrink-0" />
              <span className="font-bold tracking-wider uppercase text-[11px] hidden xs:inline">Saved!</span>
            </button>
          ) : saveStatus === 'error' ? (
            <button
              onClick={handleSave}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 rounded bg-rose-500/20 border border-rose-500/50 text-xs text-rose-400 shrink-0 transition-all font-game cursor-pointer"
            >
              <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="font-bold tracking-wider uppercase text-[11px] hidden xs:inline">Failed</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#383838] text-xs text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0 active:scale-95 font-game"
              title="Save Request Configuration (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5 text-[#FF6C37] shrink-0" />
              <span className="font-bold tracking-wider uppercase text-[11px] hidden xs:inline">Save</span>
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

          {/* URL Input with Inline Variable Highlighting */}
          <div className="relative flex-1 min-w-0 rounded-lg bg-[#141414] border border-[#333333] focus-within:border-[#FF6C37] transition-colors shadow-inner flex items-center overflow-hidden">
            {/* Syntax Highlight Backdrop Layer */}
            <div
              ref={urlBackdropRef}
              className="w-full px-2.5 sm:px-3.5 py-2 text-xs font-mono whitespace-pre overflow-hidden flex items-center select-none pointer-events-none absolute inset-0 leading-normal"
              aria-hidden="true"
            >
              {url ? (
                parseUrlTokens(url).map((token, idx) => {
                  if (token.isVar) {
                    const isDefined = activeEnvVars.some(
                      (v) => v.key.toLowerCase() === token.varName?.toLowerCase()
                    );
                    return (
                      <span
                        key={idx}
                        className={
                          isDefined
                            ? 'text-[#FF6C37] bg-[#FF6C37]/20 font-bold rounded-xs'
                            : 'text-rose-400 bg-rose-500/20 font-bold underline decoration-rose-500/70 rounded-xs'
                        }
                      >
                        {token.text}
                      </span>
                    );
                  }
                  return (
                    <span key={idx} className="text-neutral-100">
                      {token.text}
                    </span>
                  );
                })
              ) : (
                <span className="text-neutral-500 truncate">
                  https://api.example.com/v1/users or &#123;&#123;baseUrl&#125;&#125;/users (Enter to send)
                </span>
              )}
            </div>

            {/* Interactive Real Input Layer */}
            <input
              ref={urlInputRef}
              type="text"
              value={url}
              onChange={(e) => {
                const newUrl = e.target.value;
                setUrl(newUrl);
                onDraftChange?.({ url: newUrl });
              }}
              onScroll={(e) => {
                if (urlBackdropRef.current) {
                  urlBackdropRef.current.scrollLeft = (e.target as HTMLInputElement).scrollLeft;
                }
              }}
              onKeyUp={() => {
                if (urlBackdropRef.current && urlInputRef.current) {
                  urlBackdropRef.current.scrollLeft = urlInputRef.current.scrollLeft;
                }
              }}
              onClick={(e) => {
                const input = e.currentTarget;
                const pos = input.selectionStart ?? 0;
                const varAtPos = getVariableAtPosition(input.value, pos);
                if (varAtPos) {
                  handleInspectVariable(varAtPos);
                }
              }}
              onMouseMove={(e) => {
                const input = e.currentTarget;
                const pos = input.selectionStart ?? 0;
                const varAtPos = getVariableAtPosition(input.value, pos);
                if (varAtPos) {
                  input.style.cursor = 'pointer';
                  input.title = `Dynamic Variable {{${varAtPos}}} • Click to inspect value`;
                } else {
                  input.style.cursor = 'text';
                  input.title = 'Enter endpoint URL. Press Enter in this bar to send request';
                }
              }}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData('text');
                if (pastedText && pastedText.trim().toLowerCase().startsWith('curl ')) {
                  e.preventDefault();
                  try {
                    const parsed = parseCurl(pastedText);
                    handleImportCurl(parsed);
                  } catch (err) {
                    console.error('Failed to parse pasted cURL command:', err);
                  }
                }
              }}
              placeholder=""
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!isLoading) {
                    handleSend();
                  }
                }
              }}
              className="w-full px-2.5 sm:px-3.5 py-2 bg-transparent border-0 text-xs font-mono text-transparent caret-[#FF6C37] selection:bg-[#FF6C37]/30 selection:text-white focus:outline-none leading-normal relative z-10"
            />
          </div>

          {/* Send Button with Keyboard Shortcut Tooltip */}
          <div className="relative group shrink-0">
            <button
              onClick={handleSend}
              disabled={isLoading}
              title="Send Request (Press Enter in URL bar, or Ctrl+Enter anywhere)"
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

            {/* Rich Hover Shortcut Tooltip */}
            <div className="absolute top-full right-0 mt-2 z-50 hidden group-hover:flex flex-col items-end pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
              <div className="bg-[#181818] border border-[#383838] shadow-2xl rounded-lg p-2.5 text-[11px] text-neutral-200 whitespace-nowrap flex flex-col gap-1.5 backdrop-blur-md">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Send className="h-3 w-3 text-[#FF6C37]" />
                  <span>Send Request Shortcuts</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[10px] text-neutral-400">
                  <span>URL Bar:</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#262626] border border-[#444] text-neutral-100 font-mono font-bold shadow-xs">↵ Enter</kbd>
                </div>
                <div className="flex items-center justify-between gap-3 text-[10px] text-neutral-400">
                  <span>Anywhere:</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#262626] border border-[#444] text-[#FF6C37] font-mono font-bold shadow-xs">Ctrl + Enter</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Environment Variable Resolution Preview */}
        {(() => {
          if (!currentEnvironment || !url || !url.includes('{{')) return null;
          try {
            const vars: VariableItem[] = JSON.parse(currentEnvironment.variables || '[]');
            let resolved = url;
            vars.forEach((v) => {
              if (v.enabled && v.key) {
                resolved = resolved.replaceAll(`{{${v.key}}}`, v.value);
              }
            });
            if (resolved === url) return null;
            const detectedVars = extractAllVariables(url);
            return (
              <div className="mt-2 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-300 font-mono">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="font-bold text-emerald-400">⚡ Resolves in {currentEnvironment.name}:</span>
                  <span className="truncate">{resolved}</span>
                </div>
                <span className="text-[10px] text-emerald-400/80 font-game uppercase tracking-wider font-semibold shrink-0 ml-2">
                  {currentEnvironment.name} Active
                </span>
              </div>
            );
          } catch {
            return null;
          }
        })()}

        {/* Live cURL Import Success Banner */}
        {curlImportToast && (
          <div className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400 animate-in fade-in duration-200 font-medium">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{curlImportToast}</span>
            </div>
            <button
              onClick={() => setCurlImportToast(null)}
              className="text-neutral-400 hover:text-white cursor-pointer ml-2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Smart helper banner when localhost is hardcoded on Prod */}
        {currentEnvironment &&
          (url.includes('localhost') || url.includes('127.0.0.1')) &&
          currentEnvironment.name.toLowerCase().includes('prod') && (
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-300">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  You are in <strong>{currentEnvironment.name}</strong>, but URL is hardcoded to <code>localhost</code>. Use <code>&#123;&#123;baseUrl&#125;&#125;</code> to target your Prod server.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const replaced = url.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, '{{baseUrl}}');
                  setUrl(replaced);
                  onDraftChange?.({ url: replaced });
                }}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
              >
                Switch to &#123;&#123;baseUrl&#125;&#125;
              </button>
            </div>
          )}
      </div>

      {/* Tabs Header */}
      <div className="flex items-center px-2 sm:px-4 border-b border-[#2B2B2B] bg-[#181818] text-xs select-none overflow-x-auto whitespace-nowrap">
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

        <button
          onClick={() => setActiveTab('comments')}
          className={`font-game px-3 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 uppercase text-[11px] tracking-wider cursor-pointer ${
            activeTab === 'comments'
              ? 'border-[#FF6C37] text-[#FF6C37] font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Comments</span>
          {comments.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              comments.some((c) => c.status === 'open')
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {comments.length}
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

            <div className="border border-[#2E2E2E] rounded-lg overflow-x-auto bg-[#1E1E1E]">
              <div className="min-w-[420px]">
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

            <div className="border border-[#2E2E2E] rounded-lg overflow-x-auto bg-[#1E1E1E]">
              <div className="min-w-[420px]">
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
          </div>
        )}

        {/* BODY TAB */}
        {activeTab === 'body' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyType"
                    checked={bodyType === 'none'}
                    onChange={() => setBodyType('none')}
                    className="text-cyan-500 cursor-pointer"
                  />
                  <span className="text-slate-300">none</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyType"
                    checked={bodyType === 'form-data'}
                    onChange={() => setBodyType('form-data')}
                    className="text-[#FF6C37] cursor-pointer"
                  />
                  <span className="text-neutral-300">form-data</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyType"
                    checked={bodyType === 'x-www-form-urlencoded'}
                    onChange={() => setBodyType('x-www-form-urlencoded')}
                    className="text-[#FF6C37] cursor-pointer"
                  />
                  <span className="text-neutral-300">x-www-form-urlencoded</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyType"
                    checked={bodyType === 'json'}
                    onChange={() => setBodyType('json')}
                    className="text-[#FF6C37] cursor-pointer"
                  />
                  <span className="text-neutral-300">JSON</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyType"
                    checked={bodyType === 'raw'}
                    onChange={() => setBodyType('raw')}
                    className="text-cyan-500 cursor-pointer"
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

            {/* FORM-DATA TAB PANEL */}
            {bodyType === 'form-data' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-neutral-300">Multipart Form Fields</span>
                    <span className="text-[10px] text-neutral-500 font-mono">multipart/form-data</span>
                  </div>
                  <button
                    onClick={() =>
                      setFormDataList([...formDataList, { key: '', value: '', enabled: true, type: 'text' }])
                    }
                    className="text-xs text-[#FF6C37] hover:text-[#FF8555] flex items-center space-x-1 font-semibold cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Field</span>
                  </button>
                </div>

                <div className="border border-[#2E2E2E] rounded-lg overflow-hidden bg-[#1E1E1E]">
                  <div className="grid grid-cols-12 bg-[#141414] px-3 py-1.5 text-[11px] font-semibold text-neutral-400 border-b border-[#2E2E2E]">
                    <div className="col-span-1 text-center">Use</div>
                    <div className="col-span-4">Key</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-4">Value</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>

                  {formDataList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No form fields. Click "Add Field" to configure multipart parameters.
                    </div>
                  ) : (
                    formDataList.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 px-3 py-1.5 items-center border-b border-slate-800/60 text-xs gap-2"
                      >
                        <div className="col-span-1 text-center">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => {
                              const copy = [...formDataList];
                              copy[idx].enabled = e.target.checked;
                              setFormDataList(copy);
                            }}
                            className="rounded border-slate-700 bg-slate-950 text-[#FF6C37] focus:ring-0 cursor-pointer"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Field name"
                            value={item.key}
                            onChange={(e) => {
                              const copy = [...formDataList];
                              copy[idx].key = e.target.value;
                              setFormDataList(copy);
                            }}
                            className="w-full px-2 py-1 rounded bg-[#141414] border border-[#2E2E2E] text-xs text-neutral-200 font-mono focus:outline-none focus:border-[#FF6C37]"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={item.type || 'text'}
                            onChange={(e) => {
                              const copy = [...formDataList];
                              copy[idx].type = e.target.value as 'text' | 'file';
                              setFormDataList(copy);
                            }}
                            className="w-full px-1.5 py-1 rounded bg-[#141414] border border-[#2E2E2E] text-xs text-neutral-300 font-mono focus:outline-none focus:border-[#FF6C37] cursor-pointer"
                          >
                            <option value="text">Text</option>
                            <option value="file">File</option>
                          </select>
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder={item.type === 'file' ? 'File path or binary content' : 'Field value'}
                            value={item.value}
                            onChange={(e) => {
                              const copy = [...formDataList];
                              copy[idx].value = e.target.value;
                              setFormDataList(copy);
                            }}
                            className="w-full px-2 py-1 rounded bg-[#141414] border border-[#2E2E2E] text-xs text-neutral-200 font-mono focus:outline-none focus:border-[#FF6C37]"
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => setFormDataList(formDataList.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                            title="Delete field"
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

            {/* X-WWW-FORM-URLENCODED TAB PANEL */}
            {bodyType === 'x-www-form-urlencoded' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-neutral-300">URL-Encoded Form Fields</span>
                    <span className="text-[10px] text-neutral-500 font-mono">application/x-www-form-urlencoded</span>
                  </div>
                  <button
                    onClick={() =>
                      setUrlEncodedList([...urlEncodedList, { key: '', value: '', enabled: true }])
                    }
                    className="text-xs text-[#FF6C37] hover:text-[#FF8555] flex items-center space-x-1 font-semibold cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Field</span>
                  </button>
                </div>

                <div className="border border-[#2E2E2E] rounded-lg overflow-hidden bg-[#1E1E1E]">
                  <div className="grid grid-cols-12 bg-[#141414] px-3 py-1.5 text-[11px] font-semibold text-neutral-400 border-b border-[#2E2E2E]">
                    <div className="col-span-1 text-center">Use</div>
                    <div className="col-span-5">Key</div>
                    <div className="col-span-5">Value</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>

                  {urlEncodedList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No form fields. Click "Add Field" to configure url-encoded parameters.
                    </div>
                  ) : (
                    urlEncodedList.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 px-3 py-1.5 items-center border-b border-slate-800/60 text-xs gap-2"
                      >
                        <div className="col-span-1 text-center">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => {
                              const copy = [...urlEncodedList];
                              copy[idx].enabled = e.target.checked;
                              setUrlEncodedList(copy);
                            }}
                            className="rounded border-slate-700 bg-slate-950 text-[#FF6C37] focus:ring-0 cursor-pointer"
                          />
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="e.g. grant_type or client_id"
                            value={item.key}
                            onChange={(e) => {
                              const copy = [...urlEncodedList];
                              copy[idx].key = e.target.value;
                              setUrlEncodedList(copy);
                            }}
                            className="w-full px-2 py-1 rounded bg-[#141414] border border-[#2E2E2E] text-xs text-neutral-200 font-mono focus:outline-none focus:border-[#FF6C37]"
                          />
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="value"
                            value={item.value}
                            onChange={(e) => {
                              const copy = [...urlEncodedList];
                              copy[idx].value = e.target.value;
                              setUrlEncodedList(copy);
                            }}
                            className="w-full px-2 py-1 rounded bg-[#141414] border border-[#2E2E2E] text-xs text-neutral-200 font-mono focus:outline-none focus:border-[#FF6C37]"
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => setUrlEncodedList(urlEncodedList.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                            title="Delete field"
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

            {/* JSON / RAW TEXT PANEL */}
            {(bodyType === 'json' || bodyType === 'raw') && (
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
            )}

            {/* NONE PANEL */}
            {bodyType === 'none' && (
              <div className="py-12 text-center text-xs text-slate-500">
                This request has no body payload. Select form-data, x-www-form-urlencoded, JSON, or Raw Text above to configure.
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

        {/* COMMENTS & COLLABORATION TAB */}
        {activeTab === 'comments' && (
          <div className="space-y-4 max-w-4xl">
            {/* Header / Subtitle */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2b2b2b]">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-[#FF6C37]" />
                  <span>Team Discussion & Bug Reports</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Report failed endpoints, discuss API payloads, or leave notes for other team members to fix.
                </p>
              </div>
              <button
                onClick={loadComments}
                disabled={isLoadingComments}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#383838] text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Refresh comments"
              >
                <RefreshCw className={`h-3 w-3 text-[#FF6C37] ${isLoadingComments ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Quick-Report Error Banner (shown if response failed) */}
            {response && (response.statusCode >= 400 || (response as any).isError) && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-rose-300">
                      API returned status {response.statusCode} {response.statusText || 'Error'}
                    </div>
                    <div className="text-[11px] text-rose-400/80">
                      Did this endpoint fail unexpectedly? You can report this failure directly to your team with 1 click.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const failText = `🚨 API Error [${response.statusCode} ${response.statusText || ''}]: Execution failed. Need backend team to investigate this endpoint.`;
                    handleAddComment(undefined, failText);
                  }}
                  disabled={isSubmittingComment}
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0 cursor-pointer shadow transition-colors flex items-center space-x-1.5"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Report Failure to Team</span>
                </button>
              </div>
            )}

            {/* New Comment Compose Box */}
            <div className="p-3.5 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] space-y-3">
              <label className="block text-xs font-medium text-neutral-300">
                Post a Note or Bug Report
              </label>
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={
                  request?.id?.startsWith('req_temp_')
                    ? 'Please save this request first before posting comments...'
                    : 'Describe what went wrong, expected behavior, or leave a note for your team...'
                }
                disabled={request?.id?.startsWith('req_temp_') || isSubmittingComment}
                rows={3}
                className="w-full px-3 py-2 rounded bg-[#121212] border border-[#333333] text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#FF6C37] transition-colors resize-y"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-neutral-500">
                  {request?.id?.startsWith('req_temp_')
                    ? '⚠️ Save the request to enable team comments'
                    : 'Comments are visible to all workspace team members'}
                </span>
                <button
                  onClick={() => handleAddComment()}
                  disabled={!newCommentText.trim() || isSubmittingComment || request?.id?.startsWith('req_temp_')}
                  className="px-3.5 py-1.5 rounded bg-[#FF6C37] hover:bg-[#FF8555] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  {isSubmittingComment && <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Post Comment</span>
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300">
                  Discussion Thread ({comments.length})
                </span>
                {comments.length > 0 && (
                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="text-rose-400">
                      {comments.filter((c) => c.status === 'open').length} Open
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400">
                      {comments.filter((c) => c.status === 'resolved').length} Resolved
                    </span>
                  </div>
                )}
              </div>

              {isLoadingComments ? (
                <div className="py-8 text-center text-xs text-neutral-500 flex flex-col items-center justify-center space-y-2">
                  <div className="h-5 w-5 border-2 border-[#FF6C37] border-t-transparent rounded-full animate-spin" />
                  <span>Loading comments...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-10 text-center rounded-lg border border-dashed border-[#333333] p-6 text-neutral-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
                  <p className="text-xs font-medium text-neutral-400">No comments on this request yet</p>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    If this API is broken or you have feedback for your team, leave a comment above!
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      comment.status === 'resolved'
                        ? 'bg-[#151515] border-[#262626] opacity-80 hover:opacity-100'
                        : 'bg-[#1a1a1a] border-[#333333]'
                    }`}
                  >
                    {/* Comment Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-[#FF6C37]/20 border border-[#FF6C37]/40 text-[#FF6C37] text-[11px] font-bold flex items-center justify-center shrink-0 uppercase">
                          {(comment.authorName || 'U').charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-neutral-200 truncate">
                          {comment.authorName || 'Team Member'}
                        </span>
                        <span className="text-[10px] text-neutral-500 shrink-0">
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() + ' ' + new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {comment.statusCode && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono">
                            HTTP {comment.statusCode}
                          </span>
                        )}
                        {comment.status === 'resolved' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Resolved</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-semibold flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Open Issue</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comment Content */}
                    <div className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed bg-[#141414] p-3 rounded border border-[#262626] mt-2.5 font-sans">
                      {comment.content}
                    </div>

                    {/* Comment Actions */}
                    <div className="flex items-center justify-between pt-2.5 text-xs text-neutral-400">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleToggleResolve(comment.id, comment.status)}
                          className="flex items-center space-x-1 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                          title={comment.status === 'open' ? 'Mark this issue as resolved' : 'Reopen this issue'}
                        >
                          {comment.status === 'open' ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-[11px] font-medium text-emerald-400">Mark as Resolved</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                              <span className="text-[11px] font-medium text-amber-400">Reopen Issue</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setReplyingToId(replyingToId === comment.id ? null : comment.id);
                            setReplyText('');
                          }}
                          className="flex items-center space-x-1 text-neutral-400 hover:text-[#FF6C37] transition-colors cursor-pointer"
                        >
                          <CornerDownRight className="h-3.5 w-3.5 text-[#FF6C37]" />
                          <span className="text-[11px] font-medium">Reply</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer p-1"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Threaded Replies List */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-5 pl-3 border-l-2 border-[#2f2f2f] space-y-2.5 mt-3 pt-1">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="p-2.5 rounded bg-[#151515] border border-[#2a2a2a] text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-1.5 min-w-0">
                                <div className="h-5 w-5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-bold flex items-center justify-center shrink-0 uppercase">
                                  {(reply.authorName || 'U').charAt(0)}
                                </div>
                                <span className="font-semibold text-neutral-200 truncate text-[11px]">
                                  {reply.authorName || 'Team Member'}
                                </span>
                                <span className="text-[10px] text-neutral-500">
                                  {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString() + ' ' + new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="text-neutral-600 hover:text-rose-400 p-0.5 cursor-pointer"
                                title="Delete reply"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="text-neutral-300 mt-1.5 whitespace-pre-wrap text-[11px]">
                              {reply.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input Box */}
                    {replyingToId === comment.id && (
                      <div className="ml-5 pl-3 border-l-2 border-[#FF6C37]/50 mt-3 pt-1 space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to ${comment.authorName || 'this comment'}...`}
                          rows={2}
                          autoFocus
                          className="w-full px-2.5 py-1.5 rounded bg-[#121212] border border-[#333333] text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#FF6C37] transition-colors"
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setReplyingToId(null);
                              setReplyText('');
                            }}
                            className="px-2.5 py-1 rounded text-xs text-neutral-400 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAddComment(comment.id)}
                            disabled={!replyText.trim() || isSubmittingComment}
                            className="px-3 py-1 rounded bg-[#FF6C37] hover:bg-[#FF8555] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                          >
                            Post Reply
                          </button>
                        </div>
                      </div>
                    )}
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
        body={getEffectiveBodyContent()}
        bodyType={bodyType}
        onOpenSdkStudio={onOpenSdkModal}
      />

      {/* Instant cURL Command Import Modal */}
      <CurlImportModal
        isOpen={showCurlModal}
        onClose={() => setShowCurlModal(false)}
        onImport={handleImportCurl}
      />

      {/* Dynamic Variable Inspector Modal */}
      <VariableInspectorModal
        isOpen={!!inspectingVariable}
        onClose={() => setInspectingVariable(null)}
        variableName={inspectingVariable || ''}
        currentEnvironment={currentEnvironment}
        onEnvironmentUpdated={onEnvironmentUpdated}
        onOpenEnvModal={onOpenEnvModal}
      />
    </div>
  );
};
