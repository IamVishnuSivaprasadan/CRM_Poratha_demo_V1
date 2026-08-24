import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Branch, UserRole } from '../types';
import {
  Building2,
  Plus,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  FileText,
  Users,
  ShieldCheck,
  X,
  TrendingUp,
} from 'lucide-react';

interface BranchesPageProps {
  onSelectBranch: (branchId: string) => void;
}

export const BranchesPage: React.FC<BranchesPageProps> = ({ onSelectBranch }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [state, setState] = useState('Johor');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBranches();
      setBranches(res.branches);
    } catch (err) {
      console.error('Error loading branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createBranch({
        code,
        name,
        location,
        state,
        contactPerson,
        email,
        phone,
      });
      setShowCreateModal(false);
      setCode('');
      setName('');
      setLocation('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      await loadBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to create branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
              REGIONAL BRANCHES & FABRICATION YARDS
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
              {branches.length} OPERATIONAL SITES
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Poratha Corporation's industrial fabrication, engineering, and plant turnaround yards across Malaysia.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Branch Yard</span>
          </button>
        )}
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading branch facilities...</span>
          </div>
        ) : (
          branches.map((branch) => {
            const stats = branch.stats || {
              complianceRate: 0,
              verified: 0,
              totalRequired: 0,
              pending: 0,
              rejected: 0,
            };

            return (
              <div
                key={branch.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition shadow-sm space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {branch.code}
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{stats.complianceRate}% Compliance</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2.5">{branch.name}</h3>

                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{branch.location}, {branch.state}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{branch.employeeCount || 0} Registered Personnel</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{branch.email}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Verified: {stats.verified}/{stats.totalRequired}</span>
                    <span className="text-blue-600 font-semibold">{stats.pending} Pending</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.complianceRate}%` }}
                    />
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => onSelectBranch(branch.id)}
                  className="w-full py-2 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Open Branch Workspace</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE BRANCH MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Register New Regional Branch / Yard</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Branch Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. BR-PEN"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Penang Fabrication Yard"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Location Address</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Butterworth"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Johor">Johor</option>
                    <option value="Terengganu">Terengganu</option>
                    <option value="Sarawak">Sarawak</option>
                    <option value="Pahang">Pahang</option>
                    <option value="Penang">Penang</option>
                    <option value="Selangor">Selangor</option>
                    <option value="Sabah">Sabah</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Branch Manager"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +60 7-251 9000"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. penang.branch@poratha.com"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
