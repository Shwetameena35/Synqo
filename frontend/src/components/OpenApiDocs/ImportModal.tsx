import React, { useState } from 'react';
import { FileCode, Upload, Check, AlertCircle, X, Link, Code, Globe } from 'lucide-react';
import { api } from '../../services/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onImportSuccess: () => void;
}

const SAMPLE_SPEC = `{
  "openapi": "3.0.0",
  "info": {
    "title": "Payment Gateway API",
    "version": "2.1.0",
    "description": "Secure billing, tokenization, and webhooks processing."
  },
  "servers": [
    { "url": "https://api.payments.io/v2" }
  ],
  "paths": {
    "/charges": {
      "post": {
        "summary": "Create Charge",
        "description": "Create a new credit card or wallet charge.",
        "requestBody": {
          "content": {
            "application/json": {
              "example": {
                "amount": 2500,
                "currency": "usd",
                "customer": "cus_9918"
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Charge created" }
        }
      },
      "get": {
        "summary": "List Charges",
        "description": "Returns a list of recent transactions.",
        "parameters": [
          { "name": "limit", "in": "query", "schema": { "type": "integer" }, "example": "10" }
        ],
        "responses": {
          "200": { "description": "Success" }
        }
      }
    }
  }
}`;

type ImportTab = 'url' | 'raw' | 'file';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onImportSuccess,
}) => {
  const [tab, setTab] = useState<ImportTab>('url');
  const [swaggerUrl, setSwaggerUrl] = useState('');
  const [spec, setSpec] = useState(SAMPLE_SPEC);
  const [collectionName, setCollectionName] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (tab === 'url') {
        if (!swaggerUrl.trim()) {
          setError('Please enter a valid Swagger or OpenAPI URL.');
          setLoading(false);
          return;
        }
        await api.importOpenAPI(workspaceId, undefined, collectionName, swaggerUrl.trim());
      } else {
        if (!spec.trim()) {
          setError('Specification content cannot be empty.');
          setLoading(false);
          return;
        }
        await api.importOpenAPI(workspaceId, spec, collectionName);
      }
      onImportSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import Swagger / OpenAPI specification.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setSpec(ev.target.result);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-[660px] max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Import OpenAPI / Swagger Spec</h3>
              <p className="text-[11px] text-slate-400">
                Import from a live Swagger Link, uploaded file, or raw JSON / YAML
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-6 pt-2">
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`px-4 py-2 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              tab === 'url'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Swagger Link / URL</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('raw')}
            className={`px-4 py-2 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              tab === 'raw'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Raw JSON / YAML</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('file')}
            className={`px-4 py-2 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              tab === 'file'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload File</span>
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleImport} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Target Collection Name (Optional)</label>
            <input
              type="text"
              placeholder="Leave empty to use title from Swagger spec"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* TAB 1: Swagger URL */}
          {tab === 'url' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Swagger / OpenAPI Endpoint URL</label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder="https://petstore.swagger.io/v2/swagger.json"
                    value={swaggerUrl}
                    onChange={(e) => setSwaggerUrl(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-2">
                <div className="text-slate-300 font-semibold flex items-center space-x-1.5">
                  <Link className="h-3 w-3 text-cyan-400" />
                  <span>Popular examples you can try:</span>
                </div>
                <div className="space-y-1 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSwaggerUrl('https://petstore.swagger.io/v2/swagger.json')}
                    className="block text-cyan-400 hover:underline cursor-pointer"
                  >
                    https://petstore.swagger.io/v2/swagger.json (Swagger Petstore)
                  </button>
                  <p className="text-slate-500">
                    Works with FastAPI (`/openapi.json`), Spring Boot (`/v3/api-docs`), NestJS (`/api-json`), or any public Swagger URL!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Raw Spec */}
          {tab === 'raw' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Spec Definition (JSON or YAML)</label>
              <textarea
                rows={10}
                required
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* TAB 3: File Upload */}
          {tab === 'file' && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-300">Upload Swagger or OpenAPI File</label>
              <label className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-8 flex flex-col items-center justify-center space-y-2 bg-slate-950/50 hover:bg-slate-950 transition-all cursor-pointer">
                <Upload className="h-8 w-8 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-300">
                  {uploadedFileName ? uploadedFileName : 'Click to select a .json, .yaml, or .yml file'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Supported formats: OpenAPI 3.0, Swagger 2.0 (JSON / YAML)
                </span>
                <input
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedFileName && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                  <Check className="h-4 w-4" />
                  <span>File loaded successfully. Ready to import!</span>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Fetching & Importing...' : 'Import to Collections'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
