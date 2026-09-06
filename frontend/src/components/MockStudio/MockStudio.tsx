import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Play,
  Copy,
  Check,
  Zap,
  Clock,
  Trash2,
  Edit2,
  Activity,
  Globe,
  Radio,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { MockEndpoint, MockRequestLog } from '../../types';
import { api } from '../../services/api';
import { realtime, WSMessage } from '../../services/websocket';

interface MockStudioProps {
  workspaceId: string;
  mocks: MockEndpoint[];
  onRefreshMocks: () => void;
  onTryInRunner: (method: string, url: string) => void;
}

export const MockStudio: React.FC<MockStudioProps> = ({
  workspaceId,
  mocks,
  onRefreshMocks,
  onTryInRunner,
}) => {
  const [selectedMock, setSelectedMock] = useState<MockEndpoint | null>(mocks[0] || null);
  const [logs, setLogs] = useState<MockRequestLog[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for creating / editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMethod, setFormMethod] = useState('GET');
  const [formPath, setFormPath] = useState('/api/example');
  const [formStatusCode, setFormStatusCode] = useState(200);
  const [formDelayMs, setFormDelayMs] = useState(50);
  const [formBody, setFormBody] = useState('{\n  "message": "Hello from mock endpoint!"\n}');

  useEffect(() => {
    if (mocks.length > 0 && !selectedMock) {
      setSelectedMock(mocks[0]);
    }
  }, [mocks, selectedMock]);

  // Load initial logs
  useEffect(() => {
    if (workspaceId) {
      api.getMockLogs(workspaceId).then(setLogs).catch(console.error);
    }
  }, [workspaceId]);

  // Subscribe to live mock hits via WebSocket!
  useEffect(() => {
    const unsubscribe = realtime.subscribe((msg: WSMessage) => {
      if (msg.type === 'mock_hit' && msg.payload) {
        setLogs((prev) => [msg.payload as MockRequestLog, ...prev.slice(0, 49)]);
        onRefreshMocks();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [onRefreshMocks]);

  const handleCopyUrl = (mock: MockEndpoint) => {
    const origin = (import.meta.env.VITE_API_URL || (window.location.port === '5173' ? 'http://localhost:8080' : window.location.origin)).replace(/\/$/, '');
    const cleanPath = mock.path.startsWith('/') ? mock.path : '/' + mock.path;
    const fullUrl = `${origin}/api/v1/mock/${workspaceId}${cleanPath}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(mock.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateMock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMock(workspaceId, {
        name: formName,
        method: formMethod,
        path: formPath,
        statusCode: formStatusCode,
        delayMs: formDelayMs,
        responseBody: formBody,
        isActive: true,
      });
      setIsModalOpen(false);
      onRefreshMocks();
    } catch (err: any) {
      alert('Failed to create mock: ' + err.message);
    }
  };

  const handleDeleteMock = async (id: string) => {
    if (confirm('Delete this mock endpoint?')) {
      await api.deleteMock(id);
      onRefreshMocks();
      if (selectedMock?.id === id) {
        setSelectedMock(null);
      }
    }
  };

  const origin = (import.meta.env.VITE_API_URL || (window.location.port === '5173' ? 'http://localhost:8080' : window.location.origin)).replace(/\/$/, '');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 border-b border-[#2B2B2B] bg-[#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
        <div>
          <div className="text-sm font-bold text-neutral-100 flex items-center space-x-2">
            <Radio className="h-4 w-4 text-[#FF6C37]" />
            <span>Dynamic Mock Server Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30 font-semibold">
              Live WS Engine
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Spin up instant mock endpoints with custom latency simulation and stream live incoming traffic.
          </p>
        </div>

        <button
          onClick={() => {
            setFormName('');
            setFormMethod('GET');
            setFormPath('/users');
            setFormStatusCode(200);
            setFormDelayMs(100);
            setFormBody('{\n  "id": 1,\n  "name": "Palak Sharma"\n}');
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF6C37] hover:bg-[#FF5216] active:bg-[#E5450B] text-xs font-bold text-white shadow-lg shadow-orange-600/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Mock Endpoint</span>
        </button>
      </div>

      {/* Main Grid: Endpoints + Live Traffic */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
        {/* Endpoints List */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#2B2B2B] flex flex-col shrink-0 min-h-[260px] lg:h-full bg-[#181818]">
          <div className="p-3 border-b border-[#2B2B2B] text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span>Configured Mocks ({mocks.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {mocks.map((mock) => {
              const cleanPath = mock.path.startsWith('/') ? mock.path : '/' + mock.path;
              const fullUrl = `${origin}/api/v1/mock/${workspaceId}${cleanPath}`;
              const isSelected = selectedMock?.id === mock.id;

              return (
                <div
                  key={mock.id}
                  onClick={() => setSelectedMock(mock)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-[#FF6C37]/15 border-[#FF6C37]/45 shadow-md'
                      : 'bg-[#1C1C1C] border-[#2E2E2E] hover:border-[#444]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          mock.method === 'GET'
                            ? 'badge-get'
                            : mock.method === 'POST'
                            ? 'badge-post'
                            : 'badge-put'
                        }`}
                      >
                        {mock.method}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{mock.name}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                        {mock.statusCode} OK
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMock(mock.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono text-cyan-400 bg-slate-950/80 px-2.5 py-1.5 rounded-md border border-slate-800/80 truncate">
                    <span className="truncate flex-1">{fullUrl}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyUrl(mock);
                      }}
                      className="text-slate-400 hover:text-white shrink-0"
                      title="Copy Public URL"
                    >
                      {copiedId === mock.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-cyan-400" />
                        <span>{mock.delayMs}ms delay</span>
                      </span>
                      <span className="flex items-center space-x-1 text-purple-400 font-mono">
                        <Zap className="h-3 w-3" />
                        <span>{mock.hitCount} hits</span>
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTryInRunner(mock.method, fullUrl);
                      }}
                      className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      <Play className="h-3 w-3" />
                      <span>Test in Runner</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Traffic Stream & Inspection Panel */}
        <div className="lg:col-span-7 flex flex-col flex-1 min-h-[300px] h-full bg-[#141414]">
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-active" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Live Traffic Stream (Real-Time WebSocket Feed)
              </span>
            </div>
            {logs.length > 0 && (
              <button
                onClick={() => api.clearMockLogs(workspaceId).then(() => setLogs([]))}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear Stream
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                <Radio className="h-8 w-8 text-purple-400 animate-pulse" />
                <div className="text-xs font-semibold text-slate-300">Listening for Mock Requests...</div>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Copy a mock endpoint URL or click "Test in Runner". Any request hitting the endpoint will stream here in real time.
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs space-y-1 font-mono transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase">
                        {log.method}
                      </span>
                      <span className="text-slate-200 font-semibold">{log.path}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        log.statusCode >= 200 && log.statusCode < 300
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-rose-400 bg-rose-500/10'
                      }`}
                    >
                      {log.statusCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Client IP: {log.clientIp}</span>
                    <span>{log.durationMs}ms duration</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {log.body && (
                    <div className="mt-1 p-2 rounded bg-slate-950 border border-slate-800/60 text-[11px] text-cyan-300">
                      Payload: {log.body}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Mock Endpoint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-[520px] rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Server className="h-4 w-4 text-purple-400" />
              <span>Create Mock Endpoint</span>
            </h3>

            <form onSubmit={handleCreateMock} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-300">Endpoint Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. List Active Users"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Method</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-purple-400 focus:outline-none focus:border-purple-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Route Path</label>
                <input
                  type="text"
                  required
                  placeholder="/users"
                  value={formPath}
                  onChange={(e) => setFormPath(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">HTTP Status Code</label>
                  <input
                    type="number"
                    value={formStatusCode}
                    onChange={(e) => setFormStatusCode(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Latency Delay ({formDelayMs} ms)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={formDelayMs}
                    onChange={(e) => setFormDelayMs(Number(e.target.value))}
                    className="w-full mt-2 accent-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Response Body (JSON)</label>
                <textarea
                  rows={6}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/20"
                >
                  Create Mock Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
