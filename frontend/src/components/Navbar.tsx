import React, { useState, useEffect } from 'react';
import {
  Layers,
  Globe,
  Radio,
  Plus,
  FileCode2,
  Sparkles,
  Users,
  ChevronDown,
  Settings,
  Bell,
  Check,
  UserPlus,
} from 'lucide-react';
import { Workspace, Environment } from '../types';

import { User } from '../types';

interface NavbarProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: (name: string, description: string) => void;
  environments: Environment[];
  currentEnvironment: Environment | null;
  onSelectEnvironment: (env: Environment) => void;
  onOpenEnvModal: () => void;
  onOpenImportModal: () => void;
  onNewRequest: () => void;
  isConnected: boolean;
  onlineUsers: { userId: string; userName: string }[];
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onOpenTeamModal: () => void;
  onLogout: () => void;
  membersCount: number;
  invitations?: any[];
  onAcceptInvite?: (inviteCode: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  environments,
  currentEnvironment,
  onSelectEnvironment,
  onOpenEnvModal,
  onOpenImportModal,
  onNewRequest,
  isConnected,
  onlineUsers,
  currentUser,
  onOpenAuthModal,
  onOpenTeamModal,
  onLogout,
  membersCount,
  invitations = [],
  onAcceptInvite,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<'workspace' | 'environment' | 'notifications' | 'user' | null>(null);
  const [newWsName, setNewWsName] = useState('');
  const [showNewWsModal, setShowNewWsModal] = useState(false);

  const closeDropdowns = () => setActiveDropdown(null);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateWs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    onCreateWorkspace(newWsName.trim(), 'Custom Workspace');
    setNewWsName('');
    setShowNewWsModal(false);
  };

  return (
    <header className="h-14 bg-[#181818] border-b border-[#2B2B2B] px-2.5 sm:px-4 flex items-center justify-between select-none z-30 min-w-0 relative">
      {/* Global Transparent Backdrop to dismiss dropdowns on clicking anywhere on screen */}
      {activeDropdown !== null && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={closeDropdowns}
        />
      )}
      {/* Left: Brand & Workspace Switcher */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
        <div className="flex items-center space-x-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-[#FF6C37] via-[#FF5216] to-[#E5450B] flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-game text-xs sm:text-sm font-black tracking-wider text-white flex items-center space-x-1.5">
              <span>SYNQO</span>
              <span className="font-game text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30 tracking-widest">
                PRO
              </span>
            </div>
            {/* <div className="hidden 2xl:block text-[11px] text-neutral-400 font-semibold tracking-wide">API Development, Mocking & Collaboration</div> */}
          </div>
        </div>

        <div className="hidden sm:block h-5 w-[1px] bg-neutral-800" />

        {/* Team Workspace Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'workspace' ? null : 'workspace')}
            className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <Users className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="max-w-[100px] sm:max-w-[130px] md:max-w-[160px] truncate">
              {currentWorkspace?.name || 'Select Team'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </button>

          {activeDropdown === 'workspace' && (
            <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Select Team Workspace
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 py-1">
                {workspaces.map((ws) => {
                  const isDemo = ws.id === 'ws_demo_ecommerce';
                  const isOwner = currentUser && ws.ownerId === currentUser.id;
                  const isSelected = currentWorkspace?.id === ws.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        onSelectWorkspace(ws);
                        closeDropdowns();
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${isSelected
                          ? 'bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20'
                          : 'text-slate-300 hover:bg-slate-800/80'
                        }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="truncate">{ws.name}</span>
                        {isDemo ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Demo
                          </span>
                        ) : isOwner ? (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            Owner
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Member
                          </span>
                        )}
                      </div>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 mt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    closeDropdowns();
                    if (!currentUser) {
                      onOpenAuthModal();
                    } else {
                      setShowNewWsModal(true);
                    }
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/10 flex items-center space-x-2 font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Create New Team Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Demo Team Mode Banner */}
        {currentWorkspace?.id === 'ws_demo_ecommerce' && (
          <div className="hidden 2xl:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-medium">Preloaded Demo Team</span>
            <span className="text-slate-500">•</span>
            <button
              onClick={() => {
                if (!currentUser) onOpenAuthModal();
                else setShowNewWsModal(true);
              }}
              className="text-cyan-400 hover:text-cyan-300 underline font-semibold ml-0.5 cursor-pointer"
            >
              Make Your Own Team
            </button>
          </div>
        )}

        {/* Environment Dropdown */}
        <div className="relative">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'environment' ? null : 'environment')}
              className="flex items-center space-x-1.5 px-2 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-medium text-emerald-400 transition-colors shrink-0 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">
                {currentEnvironment ? currentEnvironment.name : 'No Env'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                closeDropdowns();
                onOpenEnvModal();
              }}
              title="Manage Environment Variables"
              className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-slate-400 hover:text-slate-200 shrink-0 cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>

          {activeDropdown === 'environment' && (
            <div className="absolute left-0 mt-1.5 w-52 rounded-lg bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50">
              <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Environments
              </div>
              {environments.map((env) => {
                const isActive = currentEnvironment?.id === env.id;
                return (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() => {
                      onSelectEnvironment(env);
                      closeDropdowns();
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {isActive ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{env.name}</span>
                    </div>
                    {env.isDefault && (
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                        Default
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="pt-1 mt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    closeDropdowns();
                    onOpenEnvModal();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-slate-800 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Manage Variables</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Actions & Live Collaboration */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* WebSocket Real-time Status Badge */}
        <div className="hidden 2xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] shrink-0">
          <span
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 pulse-active' : 'bg-amber-400'
              }`}
          />
          <span className="text-neutral-400">
            {isConnected ? 'Sync Active' : 'Connecting...'}
          </span>
        </div>

        {/* Live Collaborators Presence */}
        <div className="hidden xl:flex items-center -space-x-1.5 pl-1 shrink-0" title="Active collaborators in this workspace">
          {onlineUsers.length > 0 ? (
            onlineUsers.slice(0, 3).map((user, idx) => (
              <div
                key={user.userId || idx}
                className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-[#141414] flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                title={`${user.userName} (Active)`}
              >
                {user.userName.charAt(0).toUpperCase()}
              </div>
            ))
          ) : (
            <div className="h-6 w-6 rounded-full bg-cyan-600 border-2 border-[#141414] flex items-center justify-center text-[10px] font-bold text-white">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
            </div>
          )}
        </div>

        {/* Team Members Button */}
        <button
          onClick={onOpenTeamModal}
          className="flex items-center space-x-1.5 px-2 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors cursor-pointer shrink-0"
          title="Manage Workspace Team"
        >
          <Users className="h-3.5 w-3.5 text-purple-400" />
          <span className="hidden xl:inline">Team</span>
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 rounded-full font-bold">
            {membersCount}
          </span>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications')}
            className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Workspace Invitations & Alerts"
          >
            <Bell className="h-3.5 w-3.5" />
            {invitations && invitations.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-rose-500/50">
                {invitations.length}
              </span>
            )}
          </button>

          {activeDropdown === 'notifications' && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Bell className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Workspace Invitations</span>
                </span>
                {invitations && invitations.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 font-bold">
                    {invitations.length} pending
                  </span>
                )}
              </div>

              {invitations && invitations.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pt-1">
                  {invitations.map((inv) => (
                    <div
                      key={inv.inviteCode}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{inv.workspaceName}</div>
                        <div className="text-[11px] text-slate-400">
                          Invited by <strong className="text-cyan-300">{inv.inviterName}</strong> as{' '}
                          <span className="text-purple-300 font-semibold uppercase">{inv.role}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          closeDropdowns();
                          onAcceptInvite && onAcceptInvite(inv.inviteCode);
                        }}
                        className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept & Switch</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 space-y-1">
                  <div>No pending invitations</div>
                  <div className="text-[10px] text-slate-600">You're all caught up!</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <button
          type="button"
          onClick={onOpenImportModal}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-200 transition-colors cursor-pointer shrink-0"
          title="Import OpenAPI / Swagger Spec"
        >
          <FileCode2 className="h-3.5 w-3.5 text-[#FF6C37]" />
          <span className="hidden xl:inline">Import OpenAPI</span>
          <span className="xl:hidden hidden sm:inline">Import</span>
        </button>

        <button
          type="button"
          onClick={onNewRequest}
          className="font-game flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#FF6C37] hover:bg-[#FF5216] text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-600/30 transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span>New Request</span>
        </button>

        {/* User Account / Auth Dropdown */}
        <div className="relative shrink-0">
          {currentUser ? (
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'user' ? null : 'user')}
              className="flex items-center space-x-2 pl-1 pr-2 py-1 rounded-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 transition-colors cursor-pointer shrink-0"
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#FF6C37] to-amber-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[70px] sm:max-w-[90px] truncate text-xs font-semibold">{currentUser.name}</span>
              <ChevronDown className="h-3 w-3 text-neutral-400 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-cyan-400 transition-colors cursor-pointer"
            >
              <span>Sign In</span>
            </button>
          )}

          {activeDropdown === 'user' && currentUser && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
              <div className="px-2 py-2 border-b border-slate-800 mb-1">
                <div className="text-xs font-bold text-white">{currentUser.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                <div className="mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  closeDropdowns();
                  onOpenTeamModal();
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 flex items-center space-x-2 cursor-pointer"
              >
                <Users className="h-3.5 w-3.5 text-purple-400" />
                <span>Manage Team Members</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDropdowns();
                  onOpenAuthModal();
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 flex items-center space-x-2 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Switch Account / Demo</span>
              </button>

              <div className="border-t border-slate-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  closeDropdowns();
                  onLogout();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 cursor-pointer"
              >
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Team Workspace Modal */}
      {showNewWsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-[420px] rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Create Team Workspace</h3>
                <p className="text-[11px] text-slate-400">Start a new space and invite your team</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              You will be the <span className="text-cyan-400 font-semibold">Team Owner</span> with full permissions to design APIs, create mock servers, generate SDKs, and invite teammates with custom roles.
            </p>

            <form onSubmit={handleCreateWs} className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Team Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Banking APIs or Mobile Team"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewWsModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 cursor-pointer"
                >
                  Create Team Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
