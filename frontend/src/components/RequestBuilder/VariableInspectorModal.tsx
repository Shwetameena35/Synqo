import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Eye, EyeOff, Key, Sparkles, AlertCircle, Save, ExternalLink, Shield, CheckCircle2 } from 'lucide-react';
import { Environment, VariableItem } from '../../types';
import { api } from '../../services/api';

interface VariableInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  variableName: string;
  currentEnvironment?: Environment | null;
  onEnvironmentUpdated?: (updated: Environment) => void;
  onOpenEnvModal?: () => void;
}

export const VariableInspectorModal: React.FC<VariableInspectorModalProps> = ({
  isOpen,
  onClose,
  variableName,
  currentEnvironment,
  onEnvironmentUpdated,
  onOpenEnvModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New variable creation state if missing
  const [newValue, setNewValue] = useState('');
  const [newIsSecret, setNewIsSecret] = useState(false);

  const cleanName = variableName.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();

  // Parse variables from current environment
  const envVars: VariableItem[] = React.useMemo(() => {
    if (!currentEnvironment?.variables) return [];
    try {
      const parsed = JSON.parse(currentEnvironment.variables);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [currentEnvironment]);

  const matchedVar = envVars.find((v) => v.key.toLowerCase() === cleanName.toLowerCase());

  useEffect(() => {
    if (matchedVar) {
      setEditValue(matchedVar.value);
    } else {
      setEditValue('');
      setNewValue('');
    }
    setSaveSuccess(false);
    setShowSecret(false);
    setCopied(false);
  }, [matchedVar, cleanName, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = matchedVar?.value || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveExisting = async () => {
    if (!currentEnvironment || !matchedVar || isSaving) return;
    setIsSaving(true);
    try {
      const updatedList = envVars.map((v) =>
        v.key.toLowerCase() === cleanName.toLowerCase() ? { ...v, value: editValue } : v
      );
      const updatedEnv = await api.updateEnvironment(currentEnvironment.id, {
        variables: JSON.stringify(updatedList),
      });
      onEnvironmentUpdated?.(updatedEnv);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update variable:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewVariable = async () => {
    if (!currentEnvironment || isSaving) return;
    setIsSaving(true);
    try {
      const updatedList: VariableItem[] = [
        ...envVars,
        { key: cleanName, value: newValue, isSecret: newIsSecret, enabled: true },
      ];
      const updatedEnv = await api.updateEnvironment(currentEnvironment.id, {
        variables: JSON.stringify(updatedList),
      });
      onEnvironmentUpdated?.(updatedEnv);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to add variable:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="bg-[#1C1C1C] border border-[#333333] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-neutral-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#2B2B2B] flex items-center justify-between bg-[#171717]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#FF6C37]/10 text-[#FF6C37] border border-[#FF6C37]/20">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">Dynamic Variable Inspector</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FF6C37]/20 text-[#FF6C37] font-semibold border border-[#FF6C37]/30">
                  &#123;&#123;{cleanName}&#125;&#125;
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Environment: <span className="text-emerald-400 font-semibold">{currentEnvironment?.name || 'None'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#2B2B2B] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {matchedVar ? (
            <>
              {/* Variable Status Meta Pill */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-neutral-400">Status:</span>
                  {matchedVar.enabled ? (
                    <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px] font-bold uppercase">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                      Disabled
                    </span>
                  )}
                  {matchedVar.isSecret && (
                    <span className="flex items-center space-x-1 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[10px] font-bold uppercase">
                      <Shield className="h-3 w-3" />
                      <span>Secret</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-xs text-[#FF6C37] hover:text-[#FF8555] font-semibold cursor-pointer transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Value</span>
                    </>
                  )}
                </button>
              </div>

              {/* Resolved Value Display */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                  <span>Current Resolved Value</span>
                  {matchedVar.isSecret && (
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-[11px] text-neutral-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{showSecret ? 'Mask Secret' : 'Reveal Secret'}</span>
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={matchedVar.isSecret && !showSecret ? 'password' : 'text'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333333] text-xs font-mono text-neutral-100 focus:outline-none focus:border-[#FF6C37] shadow-inner"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1 font-medium">
                    <Check className="h-3.5 w-3.5" />
                    <span>Saved to {currentEnvironment?.name}!</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-500">
                    Edit value above and save to update workspace environment.
                  </span>
                )}
                {editValue !== matchedVar.value && (
                  <button
                    onClick={handleSaveExisting}
                    disabled={isSaving}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FF6C37] hover:bg-[#FF8555] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Value'}</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Undefined Variable Notice & Quick Add Form */
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start space-x-2.5 text-xs text-amber-300">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Variable <span className="font-mono text-amber-200">&#123;&#123;{cleanName}&#125;&#125;</span> is not defined in "{currentEnvironment?.name || 'active'}" environment.
                  </p>
                  <p className="text-neutral-400 text-[11px]">
                    Requests using this variable will send the literal text <code className="text-neutral-300">&#123;&#123;{cleanName}&#125;&#125;</code> until defined.
                  </p>
                </div>
              </div>

              {currentEnvironment ? (
                <div className="space-y-3 p-3.5 rounded-lg bg-[#141414] border border-[#2B2B2B]">
                  <span className="text-xs font-semibold text-neutral-200 flex items-center space-x-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#FF6C37]" />
                    <span>Define &#123;&#123;{cleanName}&#125;&#125; Now:</span>
                  </span>
                  <div>
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder={`Enter value for ${cleanName}...`}
                      className="w-full px-3 py-2 rounded-lg bg-[#1D1D1D] border border-[#333333] text-xs font-mono text-neutral-100 focus:outline-none focus:border-[#FF6C37]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-1.5 text-xs text-neutral-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newIsSecret}
                        onChange={(e) => setNewIsSecret(e.target.checked)}
                        className="rounded bg-neutral-800 border-neutral-700 text-[#FF6C37] focus:ring-0"
                      />
                      <span>Mask as Secret (API Key / Token)</span>
                    </label>
                    <button
                      onClick={handleAddNewVariable}
                      disabled={!newValue.trim() || isSaving}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FF6C37] hover:bg-[#FF8555] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{isSaving ? 'Adding...' : 'Add Variable'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">
                  No environment is currently active. Select or create an environment in the top navbar first.
                </p>
              )}
            </div>
          )}

          {/* Quick List of Other Available Variables */}
          {envVars.length > 0 && (
            <div className="pt-2 border-t border-[#262626]">
              <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                Other variables in {currentEnvironment?.name}:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {envVars
                  .filter((v) => v.key.toLowerCase() !== cleanName.toLowerCase())
                  .map((v, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#252525] border border-[#333] text-neutral-300 flex items-center space-x-1"
                    >
                      <span className="text-[#FF6C37]">&#123;&#123;{v.key}&#125;&#125;</span>
                      <span className="text-neutral-500">=</span>
                      <span className="text-neutral-400 truncate max-w-[100px]">
                        {v.isSecret ? '••••' : v.value || '""'}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2B2B2B] bg-[#171717] flex items-center justify-between text-xs">
          {onOpenEnvModal ? (
            <button
              onClick={() => {
                onClose();
                onOpenEnvModal();
              }}
              className="text-[#FF6C37] hover:text-[#FF8555] font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>Manage All Environments</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#282828] hover:bg-[#333] text-neutral-300 hover:text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
