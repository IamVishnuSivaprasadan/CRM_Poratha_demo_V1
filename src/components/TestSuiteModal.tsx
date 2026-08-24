import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CheckCircle2, XCircle, Play, RefreshCw, X, Shield, Lock, Activity, FileCheck, Layers } from 'lucide-react';

interface TestSuiteModalProps {
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const res = await api.runTestSuite();
      setSummary(res.summary);
      setTests(res.tests);
    } catch (err: any) {
      alert('Test suite execution error: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">PORATHA Automated Validation Suite</h2>
                {summary && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold border ${
                      summary.allPassed
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {summary.allPassed ? 'ALL TESTS GREEN' : 'FAILURES DETECTED'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Verifying RBAC, Branch Tenancy Isolation, Upload State Invariants, and Lifecycle Steps (Section 37 & 40).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Summary KPIs */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Tests</span>
                <span className="text-lg font-black text-slate-900">{summary.totalTests}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Passed</span>
                <span className="text-lg font-black text-emerald-600">{summary.passedCount}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Failed</span>
                <span className={`text-lg font-black ${summary.failedCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {summary.failedCount}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Execution Latency</span>
                <span className="text-lg font-black text-blue-600">{summary.totalDurationMs} ms</span>
              </div>
            </div>
          )}

          {/* Test Cases List */}
          <div className="space-y-2">
            {isRunning ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600" />
                <p className="font-semibold text-slate-800">Executing verification tests against backend...</p>
              </div>
            ) : (
              tests.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition flex flex-col space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {t.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-bold text-slate-900 text-xs">{t.name}</span>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                        {t.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500">{t.durationMs}ms</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          t.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {t.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px] pl-6 leading-relaxed">{t.details}</p>

                  {t.evidence && (
                    <div className="ml-6 mt-1 p-2 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600 overflow-x-auto">
                      {JSON.stringify(t.evidence, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Poratha Verification Suite • Built for Production Ingress
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>Re-run Suite</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
