import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Department, DocumentRequirement, UserRole } from '../types';
import { FileCheck2, Plus, X, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export const RequirementsPage: React.FC = () => {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('HSE & Safety Certification');
  const [departmentId, setDepartmentId] = useState('dept_01');
  const [isRequired, setIsRequired] = useState(true);
  const [expiryRequired, setExpiryRequired] = useState(true);
  const [renewalPeriodDays, setRenewalPeriodDays] = useState(365);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reqRes, deptRes] = await Promise.all([api.getRequirements(), api.getDepartments()]);
      setRequirements(reqRes.requirements);
      setDepartments(deptRes.departments);
    } catch (err) {
      console.error('Error loading requirements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createRequirement({
        code,
        name,
        category,
        departmentId,
        isRequired,
        expiryRequired,
        renewalPeriodDays: Number(renewalPeriodDays),
        description,
      });
      setShowCreateModal(false);
      setCode('');
      setName('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create requirement');
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
              DOCUMENT REQUIREMENTS RULEBOOK
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
              {requirements.length} STATUTORY RULES
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Corporate compliance matrix defining mandatory certifications, validity cycles, and department applicability.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Compliance Requirement</span>
          </button>
        )}
      </div>

      {/* Requirements Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Rule Code</th>
                <th className="py-3 px-3">Requirement Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Governing Department</th>
                <th className="py-3 px-3">Mandatory</th>
                <th className="py-3 px-3">Expiry Cycle</th>
                <th className="py-3 px-3">Verification Rule</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading compliance matrix...</span>
                  </td>
                </tr>
              ) : requirements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No requirements defined.
                  </td>
                </tr>
              ) : (
                requirements.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{req.code}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{req.name}</div>
                      {req.description && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{req.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{req.category}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{req.departmentName}</td>
                    <td className="py-3 px-3">
                      {req.isRequired ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[10px]">
                          MANDATORY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px]">
                          OPTIONAL
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {req.expiryRequired ? (
                        <span className="text-orange-600 font-mono text-[11px] font-semibold">
                          Every {req.renewalPeriodDays} Days
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Permanent / No Expiry</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Head Office Sign-Off</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE REQUIREMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Compliance Requirement Rule</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequirement} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Requirement Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. REQ-MED-FIT"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Requirement Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Medical Fitness for Work"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="HSE & Safety Certification">HSE & Safety Certification</option>
                    <option value="QAQC & Technical Accreditation">QAQC & Technical Accreditation</option>
                    <option value="Engineering & Statutory Machinery">Engineering & Statutory Machinery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Governing Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expiry Required?</label>
                  <select
                    value={expiryRequired ? 'yes' : 'no'}
                    onChange={(e) => setExpiryRequired(e.target.value === 'yes')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="yes">Yes (Time-limited Validity)</option>
                    <option value="no">No (Permanent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Renewal Cycle (Days)</label>
                  <input
                    type="number"
                    value={renewalPeriodDays}
                    onChange={(e) => setRenewalPeriodDays(Number(e.target.value))}
                    disabled={!expiryRequired}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 disabled:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Statutory Reference</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Mandatory under DOSH Occupational Safety & Health Act (OSHA 1994)."
                  rows={2}
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
                  {isSubmitting ? 'Saving...' : 'Save Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
