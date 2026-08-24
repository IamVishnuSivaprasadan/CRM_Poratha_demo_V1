import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ShieldCheck, Building2, Lock, ArrowRight, UserCheck, CheckCircle2, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchUser, demoAccounts, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (userId: string) => {
    setError(null);
    try {
      await switchUser(userId);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900">
      
      {/* Corporate Branding Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="font-black text-2xl tracking-wider text-white">P</span>
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase text-slate-900 mt-2">
              PORATHA CORPORATION
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Centralized Document Verification & Compliance Platform
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Quick Demo Personas / Fast Evaluator Switcher */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <div className="flex items-center gap-1.5 text-blue-600">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Select Demo Persona to Sign In</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => handleQuickLogin(acc.id)}
                disabled={isLoading}
                className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between group text-xs shadow-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-blue-600 flex items-center gap-1.5">
                    <span>{acc.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({acc.role.replace(/_/g, ' ')})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {acc.branchName || 'Head Office HQ'}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200" />
          <span className="flex-shrink mx-3 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Or Standard Email Sign In
          </span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        {/* Standard Sign-In Form */}
        <form onSubmit={handleManualLogin} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Corporate Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@poratha.com"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Security Notice */}
        <div className="text-center text-[10px] text-slate-400">
          Enforced by Poratha Role-Based Tenancy & Auditing Engine
        </div>

      </div>

    </div>
  );
};
