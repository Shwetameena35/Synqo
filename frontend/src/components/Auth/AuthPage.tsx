import React, { useState } from 'react';
import { Layers, Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

interface AuthPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  onExploreDemo: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onExploreDemo }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        onLoginSuccess(res.user, res.token);
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }
        const res = await api.register({ name: name.trim(), email, password });
        onLoginSuccess(res.user, res.token);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSelect = async (demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email: demoEmail, password: 'password123' });
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#121212] text-[#e0e0e0] flex flex-col justify-between font-sans">
      {/* Simple Clean Header */}
      <header className="px-6 py-4 border-b border-[#242424] flex items-center justify-between bg-[#181818]">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#FF6C37] flex items-center justify-center text-white shadow-sm">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-wide text-white">SYNQO</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30">
              API Studio
            </span>
          </div>
        </div>

        <button
          onClick={onExploreDemo}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#242424] hover:bg-[#2e2e2e] border border-[#333] text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#FF6C37]" />
          <span>Try Demo</span>
        </button>
      </header>

      {/* Main Centered Login Box */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl p-6 sm:p-8">
          {/* Logo & Welcome */}
          <div className="text-center mb-6">
            <div className="inline-flex h-11 w-11 rounded-xl bg-[#FF6C37]/10 border border-[#FF6C37]/30 items-center justify-center text-[#FF6C37] mb-3">
              <Layers className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isLogin ? 'Sign in to Synqo' : 'Create your account'}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              {isLogin
                ? 'Enter your email and password to access your workspaces'
                : 'Start building, testing, and mocking APIs with your team'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-[#141414] p-1 mb-5 border border-[#262626]">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                isLogin
                  ? 'bg-[#262626] text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                !isLogin
                  ? 'bg-[#262626] text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full bg-[#121212] border border-[#333] hover:border-[#444] focus:border-[#FF6C37] rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@apihub.dev"
                  className="w-full bg-[#121212] border border-[#333] hover:border-[#444] focus:border-[#FF6C37] rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#121212] border border-[#333] hover:border-[#444] focus:border-[#FF6C37] rounded-md pl-9 pr-9 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button in Synqo Orange */}
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

          {/* Clean Simple Divider */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#262626]" />
            </div>
            <span className="relative px-2 bg-[#1a1a1a] text-[11px] text-neutral-500 font-medium">
              or quick demo
            </span>
          </div>

          {/* Quick Demo Options */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoSelect('demo@apihub.dev')}
                className="p-2 rounded-md bg-[#141414] hover:bg-[#222] border border-[#2b2b2b] text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-white flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF6C37]" />
                  <span>Demo Admin</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Admin Workspace</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoSelect('alex@apihub.dev')}
                className="p-2 rounded-md bg-[#141414] hover:bg-[#222] border border-[#2b2b2b] text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-white flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>Alex Chen</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Developer Role</div>
              </button>
            </div>

            <button
              type="button"
              onClick={onExploreDemo}
              className="w-full py-2 px-3 rounded-md bg-[#141414] hover:bg-[#222] border border-[#2b2b2b] text-xs font-medium text-neutral-300 hover:text-white transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#FF6C37]" />
              <span>Explore without signing in</span>
            </button>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="px-6 py-3 border-t border-[#242424] text-center text-xs text-neutral-500 bg-[#141414]">
        <span>Synqo &bull; API Development &amp; Testing Studio</span>
      </footer>
    </div>
  );
};
