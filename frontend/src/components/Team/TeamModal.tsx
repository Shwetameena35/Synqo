import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, X, Check, Mail, UserCheck, Link, Copy, Sparkles } from 'lucide-react';
import { WorkspaceMember, User } from '../../types';
import { api } from '../../services/api';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  currentUser: User | null;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  currentUser,
}) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Shareable invite link
  const [inviteLink, setInviteLink] = useState<string>('');
  const [linkRole, setLinkRole] = useState<'editor' | 'viewer'>('editor');
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const fetchMembers = () => {
    if (!workspaceId) return;
    api.getMembers(workspaceId).then(setMembers).catch(console.error);
  };

  const generateInviteLink = async (targetRole: 'editor' | 'viewer' = linkRole) => {
    if (!workspaceId) return;
    setGeneratingLink(true);
    try {
      const res = await api.createInvite(workspaceId, { role: targetRole });
      const fullUrl = `${window.location.origin}/join/${res.inviteCode}`;
      setInviteLink(fullUrl);
    } catch (err: any) {
      console.error('Failed to generate invite link', err);
    } finally {
      setGeneratingLink(false);
    }
  };

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchMembers();
      generateInviteLink(linkRole);
    }
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // Create targeted invite and add member
      await api.createInvite(workspaceId, { role, targetEmail: email });
      await api.addMember(workspaceId, {
        email,
        name,
        role,
      });
      setSuccessMsg(`Invitation registered for ${email}. They can sign in to accept or use the invite link!`);
      setEmail('');
      setName('');
      fetchMembers();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Remove this member from the workspace?')) {
      try {
        await api.removeMember(workspaceId, memberId);
        fetchMembers();
      } catch (err: any) {
        alert(err.message || 'Failed to remove member');
      }
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      await api.updateMemberRole(workspaceId, memberId, newRole);
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to update member role');
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r.toLowerCase()) {
      case 'owner':
        return (
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold uppercase">
            Owner
          </span>
        );
      case 'editor':
        return (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-bold uppercase">
            Editor
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
            Viewer
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-[620px] max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center text-white">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Workspace Team & Collaborators</h3>
              <p className="text-[11px] text-slate-400">Manage team access and permissions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Shareable Invite Link Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 to-slate-950 border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                <Link className="h-4 w-4 text-cyan-400" />
                <span>Shareable Workspace Invite Link</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                100% Free • No SMTP Needed
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Anyone with this link can join. Users will be required to <strong className="text-slate-200">Sign In or Register</strong> to verify their identity before gaining workspace access.
            </p>

            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  readOnly
                  value={inviteLink || 'Generating link...'}
                  className="w-full pl-3 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-mono text-cyan-200 focus:outline-none select-all"
                />
              </div>

              <select
                value={linkRole}
                onChange={(e) => {
                  const newRole = e.target.value as 'editor' | 'viewer';
                  setLinkRole(newRole);
                  generateInviteLink(newRole);
                }}
                className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-purple-400 focus:outline-none cursor-pointer"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!inviteLink || generatingLink}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Email Invite Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
              <UserPlus className="h-4 w-4 text-cyan-400" />
              <span>Or Invite By Specific Email</span>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  placeholder="Full Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="col-span-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-purple-400 focus:outline-none cursor-pointer"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  {loading ? 'Adding...' : 'Invite'}
                </button>
              </div>
            </form>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
              <span>Current Members ({members.length})</span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 bg-slate-950/50">
              {members.map((member) => {
                const isCurrent = currentUser?.email === member.userEmail;
                return (
                  <div
                    key={member.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                        {member.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                          <span>{member.userName}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{member.userEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      {member.role === 'owner' ? (
                        getRoleBadge(member.role)
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer transition-all ${
                            member.role === 'editor'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:border-purple-400'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                          title="Click to change team member permission"
                        >
                          <option value="editor" className="bg-slate-900 text-purple-300 font-semibold">Editor</option>
                          <option value="viewer" className="bg-slate-900 text-slate-300 font-semibold">Viewer</option>
                        </select>
                      )}

                      {member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          title="Remove member"
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
