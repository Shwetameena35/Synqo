import React, { useState } from 'react';
import {
  Layers,
  Zap,
  Radio,
  FileCode2,
  Users,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Server,
  Play,
} from 'lucide-react';
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
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 font-sans relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between z-10 backdrop-blur-md bg-slate-950/70 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-game font-black text-lg tracking-wider text-white">SYNQO</span>
              <span className="font-game text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30 uppercase tracking-wider">
                Enterprise
              </span>
            </div>
            <div className="text-xs text-slate-400 font-medium">Postman + Swagger + Dynamic Mock + SDK Studio</div>
          </div>
        </div>

        <button
          onClick={onExploreDemo}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/80 text-xs font-semibold text-slate-200 transition-all shadow-sm group cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Interactive Demo</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        {/* Left Column: Feature Highlights & Value Prop */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>Unified API Development & Testing Workspace</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
              Build, test, and mock APIs <br />
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                with your entire team.
              </span>
            </h1>
            <p className="text-slate-300 text-base max-w-xl leading-relaxed">
              Eliminate context-switching between Postman, Swagger, mock endpoints, and SDK scripts.
              Synqo gives your team isolated private workspaces with nanosecond testing, real-time collaboration, and instant SDK generation.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-2.5">
                <Play className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">API Runner & Proxy</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Execute requests via high-performance Go proxy with zero CORS issues, millisecond timers, and automated assertions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2.5">
                <Radio className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Dynamic Mock Server</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create live endpoints with simulated latency, custom HTTP statuses, and inspect incoming traffic via WebSockets.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2.5">
                <FileCode2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Multi-Language SDKs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate clean, production-ready client libraries instantly for Go, TypeScript, Python, and Java.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2.5">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Team Workspace Privacy</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Each team owns isolated workspaces with member roles (owner, editor, viewer) and real-time presence sync.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 pt-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>Zero-setup local SQLite</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>Full OpenAPI 3.0 support</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>Bcrypt & JWT secure</span>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card & Demo Mode */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative">
            {/* Header Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isLogin
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
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
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isLogin
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                {isLogin ? 'Welcome back' : 'Create your workspace'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isLogin
                  ? 'Enter your credentials to access your team workspaces.'
                  : 'Get an isolated personal workspace with complete API testing tools.'}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In to Workspace' : 'Create Account & Workspace'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative px-3 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Or explore without sign up
              </span>
            </div>

            {/* Explore Live Demo Button */}
            <button
              type="button"
              onClick={onExploreDemo}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-dashed border-cyan-500/40 hover:border-cyan-400/80 hover:bg-slate-800/60 transition-all group flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center space-x-1.5">
                    <span>Explore Interactive Demo</span>
                    <span className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Live
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Preloaded e-commerce APIs, mock servers & telemetry
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Quick Demo Developer Personas */}
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <div className="text-[11px] font-medium text-slate-400 mb-2">Or test multi-user roles:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoSelect('palak@apihub.dev')}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-200">Palak Sharma</div>
                  <div className="text-[10px] text-cyan-400 font-medium">Lead Architect (Admin)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoSelect('alex@apihub.dev')}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-200">Alex Chen</div>
                  <div className="text-[10px] text-indigo-400 font-medium">Fullstack Engineer</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="px-6 py-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 z-10 bg-slate-950/80">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Private Workspace Isolation & RBAC Protection</span>
        </div>
        <div>Synqo &bull; Modern Go &amp; React Engineering</div>
      </footer>
    </div>
  );
};
