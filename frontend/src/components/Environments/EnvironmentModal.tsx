import React, { useState } from 'react';
import { Globe, Plus, Trash2, Eye, EyeOff, Check, X, Shield } from 'lucide-react';
import { Environment, VariableItem } from '../../types';
import { api } from '../../services/api';

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  environments: Environment[];
  currentEnvironment: Environment | null;
  onRefreshEnvironments: () => void;
  onSelectEnvironment: (env: Environment) => void;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  environments,
  currentEnvironment,
  onRefreshEnvironments,
  onSelectEnvironment,
}) => {
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(
    currentEnvironment || environments[0] || null
  );
  const [variables, setVariables] = useState<VariableItem[]>([]);
  const [showSecret, setShowSecret] = useState<Record<number, boolean>>({});
  const [newEnvName, setNewEnvName] = useState('');
  const [showNewEnvInput, setShowNewEnvInput] = useState(false);

  React.useEffect(() => {
    if (selectedEnv) {
      try {
        setVariables(JSON.parse(selectedEnv.variables || '[]'));
      } catch {
        setVariables([]);
      }
    }
  }, [selectedEnv]);

  if (!isOpen) return null;

  const handleSaveVariables = async () => {
    if (!selectedEnv) return;
    try {
      const updated = await api.updateEnvironment(selectedEnv.id, {
        variables: JSON.stringify(variables),
      });
      onRefreshEnvironments();
      setSelectedEnv(updated);
      alert('Variables saved successfully!');
    } catch (err: any) {
      alert('Error saving variables: ' + err.message);
    }
  };

  const handleCreateEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;
    try {
      const created = await api.createEnvironment(workspaceId, {
        name: newEnvName.trim(),
        isDefault: false,
        variables: `[{"key": "baseUrl", "value": "https://api.example.com", "isSecret": false, "enabled": true}]`,
      });
      setNewEnvName('');
      setShowNewEnvInput(false);
      onRefreshEnvironments();
      setSelectedEnv(created);
    } catch (err: any) {
      alert('Error creating environment: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-[720px] max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Environment & Variable Manager</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content: Left environments list + Right variables table */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* Environments Sidebar */}
          <div className="col-span-4 border-r border-slate-800 p-4 space-y-2 bg-slate-950/40">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              <span>Environments</span>
              <button
                onClick={() => setShowNewEnvInput(true)}
                className="text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {showNewEnvInput && (
              <form onSubmit={handleCreateEnvironment} className="space-y-1.5 pb-2">
                <input
                  type="text"
                  placeholder="e.g. Staging"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex justify-end space-x-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowNewEnvInput(false)}
                    className="px-2 py-0.5 text-slate-400"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-2 py-0.5 rounded bg-emerald-600 text-white font-medium">
                    Add
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1">
              {environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => setSelectedEnv(env)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    selectedEnv?.id === env.id
                      ? 'bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{env.name}</span>
                  {env.isDefault && (
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Variables Table */}
          <div className="col-span-8 p-5 flex flex-col h-full overflow-hidden bg-slate-950/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-200">{selectedEnv?.name} Variables</span>
                  {selectedEnv?.id === currentEnvironment?.id && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center space-x-1">
                      <Check className="h-2.5 w-2.5" />
                      <span>Active</span>
                    </span>
                  )}
                  {selectedEnv?.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use in requests as <code className="text-cyan-400 font-mono">&#123;&#123;variable&#125;&#125;</code>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {selectedEnv && selectedEnv.id !== currentEnvironment?.id && (
                  <button
                    type="button"
                    onClick={() => onSelectEnvironment(selectedEnv)}
                    className="text-xs px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Switch active workspace environment to this one"
                  >
                    <Check className="h-3 w-3" />
                    <span>Set Active</span>
                  </button>
                )}
                {selectedEnv && !selectedEnv.isDefault && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.updateEnvironment(selectedEnv.id, { isDefault: true });
                        onRefreshEnvironments();
                      } catch (err: any) {
                        alert('Failed to set default: ' + err.message);
                      }
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold cursor-pointer transition-colors"
                    title="Set this as the default environment for the workspace"
                  >
                    <span>Set as Default</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    setVariables([
                      ...variables,
                      { key: '', value: '', isSecret: false, enabled: true },
                    ])
                  }
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-semibold cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Variable</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {variables.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No variables defined in this environment.
                </div>
              ) : (
                variables.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={v.enabled}
                      onChange={(e) => {
                        const copy = [...variables];
                        copy[idx].enabled = e.target.checked;
                        setVariables(copy);
                      }}
                      className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
                    />

                    <input
                      type="text"
                      placeholder="key (e.g. baseUrl)"
                      value={v.key}
                      onChange={(e) => {
                        const copy = [...variables];
                        copy[idx].key = e.target.value;
                        setVariables(copy);
                      }}
                      className="w-36 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-emerald-500"
                    />

                    <div className="relative flex-1">
                      <input
                        type={v.isSecret && !showSecret[idx] ? 'password' : 'text'}
                        placeholder="value"
                        value={v.value}
                        onChange={(e) => {
                          const copy = [...variables];
                          copy[idx].value = e.target.value;
                          setVariables(copy);
                        }}
                        className="w-full px-2 py-1 pr-7 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      {v.isSecret && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowSecret((prev) => ({ ...prev, [idx]: !prev[idx] }))
                          }
                          className="absolute right-2 top-1.5 text-slate-400 hover:text-white"
                        >
                          {showSecret[idx] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...variables];
                        copy[idx].isSecret = !copy[idx].isSecret;
                        setVariables(copy);
                      }}
                      title={v.isSecret ? 'Masked Secret' : 'Public Variable'}
                      className={`p-1 rounded ${
                        v.isSecret ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500'
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setVariables(variables.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
              <button
                onClick={handleSaveVariables}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-600/20"
              >
                Save Variables
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
