import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Check, ArrowRight, Lock, Mail, User as UserIcon, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

interface JoinInvitePageProps {
  inviteCode: string;
  currentUser: User | null;
  onJoinSuccess: (workspaceId: string) => void;
  onLoginSuccess: (user: User, token: string) => void;
  onGoHome: () => void;
}

export const JoinInvitePage: React.FC<JoinInvitePageProps> = ({
  inviteCode,
  currentUser,
  onJoinSuccess,
  onLoginSuccess,
  onGoHome,
}) => {
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Auth form state for unauthenticated users
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getInviteDetails(inviteCode)
      .then((data) => {
        setInvite(data);
        if (data.targetEmail) {
          setEmail(data.targetEmail);
        }
      })
      .catch((err) => {
        setError(err.message || 'Invitation link is invalid or has expired.');
      })
      .finally(() => setLoading(false));
  }, [inviteCode]);

  const handleAcceptInvite = async () => {
    setJoining(true);
    setError(null);
    try {
      const res = await api.acceptInvite(inviteCode);
      onJoinSuccess(res.workspaceId);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setJoining(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      let res: { user: User; token: string };
      if (authMode === 'register') {
        res = await api.register({ name, email, password });
      } else {
        res = await api.login({ email, password });
      }

      // Save credentials
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onLoginSuccess(res.user, res.token);

      // Immediately accept the invite with the new session
      const joinRes = await api.acceptInvite(inviteCode);
      onJoinSuccess(joinRes.workspaceId);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mb-4" />
        <p className="text-sm font-medium">Validating workspace invitation...</p>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Invalid or Expired Invite</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={onGoHome}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Go to Synqo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Workspace Card Header */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl text-center space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Workspace Team Invitation</span>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              {invite?.workspaceName}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Invited by <span className="text-cyan-300 font-semibold">{invite?.inviterName}</span> as{' '}
              <span className="text-purple-300 font-semibold uppercase">{invite?.role}</span>
            </p>
          </div>

          {invite?.workspaceDescription && (
            <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-left">
              {invite.workspaceDescription}
            </p>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2 text-left">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* If already logged in */}
          {currentUser ? (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-left flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[11px]">Accepting as:</div>
                  <div className="font-semibold text-white">{currentUser.name}</div>
                  <div className="text-slate-400 font-mono text-[10px]">{currentUser.email}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                  Active
                </span>
              </div>

              <button
                onClick={handleAcceptInvite}
                disabled={joining}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {joining ? (
                  <span>Joining Workspace...</span>
                ) : (
                  <>
                    <span>Accept Invitation & Open Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* If unauthenticated: Require Sign In or Sign Up first */
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-left flex items-start space-x-2">
                <Shield className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Please sign in or create an account to verify your identity and accept this workspace invitation.
                </span>
              </div>

              {/* Tabs */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-left">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3 text-left">
                {authMode === 'register' && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Chen"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {authLoading ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <span>{authMode === 'register' ? 'Register & Accept Invite' : 'Sign In & Accept Invite'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
