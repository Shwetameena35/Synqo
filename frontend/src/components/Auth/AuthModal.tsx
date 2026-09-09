import React, { useState } from 'react';
import { LogIn, UserPlus, Sparkles, X, Lock, Mail, User as UserIcon, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        onLoginSuccess(res.user);
        onClose();
      } else {
        const res = await api.register({ name, email, password });
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email: demoEmail, password: 'password123' });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <div className="w-[420px] rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] shadow-2xl text-[#e0e0e0] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#242424] flex items-center justify-between bg-[#181818]">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-lg bg-[#FF6C37] flex items-center justify-center text-white">
              {isLogin ? <LogIn className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            </div>
            <h3 className="text-sm font-bold text-white">
              {isLogin ? 'Sign In to Synqo' : 'Create Synqo Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-[#242424] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Quick Demo Section */}
          <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#FF6C37] flex items-center space-x-1">
                <Sparkles className="h-3 w-3" />
                <span>Instant Demo Access</span>
              </span>
              <span className="text-[10px] text-neutral-500">1-click</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('demo@apihub.dev')}
                className="p-2 rounded-md bg-[#1a1a1a] hover:bg-[#222] border border-[#2e2e2e] text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-white flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF6C37]" />
                  <span>Demo Admin</span>
                </div>
                <div className="text-[10px] text-neutral-400">Admin Workspace</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('alex@apihub.dev')}
                className="p-2 rounded-md bg-[#1a1a1a] hover:bg-[#222] border border-[#2e2e2e] text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-white flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>Alex Chen</span>
                </div>
                <div className="text-[10px] text-neutral-400">Developer Role</div>
              </button>
            </div>
          </div>

          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#262626]" />
            </div>
            <span className="relative px-2 bg-[#1a1a1a] text-[11px] text-neutral-500 font-medium">
              or credentials
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-md bg-[#121212] border border-[#333] hover:border-[#444] focus:border-[#FF6C37] text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="email"
                  required
                  placeholder="demo@apihub.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-[#121212] border border-[#333] hover:border-[#444] focus:border-[#FF6C37] text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-[#121212] border border-[#333] hover:border-[#444] focus:border-[#FF6C37] text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2 px-4 rounded-md bg-[#FF6C37] hover:bg-[#FF5216] active:bg-[#E5450B] text-white text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login / Register */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-xs text-neutral-400 hover:text-[#FF6C37] transition-colors cursor-pointer"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
