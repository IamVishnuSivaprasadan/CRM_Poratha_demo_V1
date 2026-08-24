import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Department } from '../types';
import { Network, FileText, CheckCircle2, Clock, Users, TrendingUp } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDepartments();
      setDepartments(res.departments);
    } catch (err) {
      console.error('Error loading departments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
              CORPORATE DEPARTMENTS & DISCIPLINES
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
              {departments.length} FUNCTIONAL DISCIPLINES
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Departmental document controls for Health, Safety & Environment (HSE), Quality Assurance (QA/QC), and Site Engineering.
          </p>
        </div>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading departments...</span>
          </div>
        ) : (
          departments.map((dept) => {
            const stats = dept.stats || {
              complianceRate: 0,
              verified: 0,
              totalRequired: 0,
              pending: 0,
              rejected: 0,
              notUploaded: 0,
            };

            return (
              <div
                key={dept.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition shadow-sm space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {dept.code}
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{stats.complianceRate}% Compliance</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2.5">{dept.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{dept.description}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                    <div>
                      <span className="text-slate-400">Discipline Lead: </span>
                      <span className="text-slate-800 font-semibold">{dept.headOfDepartment}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Personnel Assigned: </span>
                      <span className="text-slate-800 font-semibold">{dept.employeeCount || 0} Employees</span>
                    </div>
                  </div>
                </div>

                {/* Progress & Stats */}
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

                  <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-slate-100 text-[10px] text-center">
                    <div>
                      <span className="text-slate-400 block">Verified</span>
                      <span className="font-bold text-emerald-600">{stats.verified}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Pending</span>
                      <span className="font-bold text-blue-600">{stats.pending}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Missing</span>
                      <span className="font-bold text-slate-600">{stats.notUploaded}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
