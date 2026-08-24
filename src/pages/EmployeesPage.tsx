import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Branch, Department, DocumentRecord, Employee, UserRole } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Users,
  Search,
  Building2,
  Network,
  Eye,
  Upload,
  CheckCircle2,
  X,
  FileCheck2,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  ShieldAlert,
} from 'lucide-react';

interface EmployeesPageProps {
  onOpenDocument: (docId: string) => void;
  onUploadReplacement: (doc: any) => void;
  onUploadNewDocForEmployee: (empId: string) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({
  onOpenDocument,
  onUploadReplacement,
  onUploadNewDocForEmployee,
}) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [selectedBranch, setSelectedBranch] = useState(user?.branchId || '');
  const [selectedDepartment, setSelectedDepartment] = useState(user?.departmentId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected Employee Profile Drawer
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const isBranchScoped = user?.role === UserRole.BRANCH_MANAGER || user?.role === UserRole.DEPARTMENT_USER;

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const [empRes, brRes, deptRes] = await Promise.all([
        api.getEmployees({
          branchId: selectedBranch || undefined,
          departmentId: selectedDepartment || undefined,
          search: searchQuery || undefined,
        }),
        api.getBranches(),
        api.getDepartments(),
      ]);

      setEmployees(empRes.employees);
      setBranches(brRes.branches);
      setDepartments(deptRes.departments);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [selectedBranch, selectedDepartment, searchQuery]);

  const handleOpenEmployeeProfile = async (empId: string) => {
    setIsProfileLoading(true);
    try {
      const res = await api.getEmployeeProfile(empId);
      setSelectedEmployeeProfile(res.profile);
    } catch (err) {
      console.error('Error loading employee profile:', err);
    } finally {
      setIsProfileLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
              PERSONNEL REGISTRY & COMPLIANCE PROFILES
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
              {employees.length} REGISTERED EMPLOYEES
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracking individual statutory certifications (CIDB Green Card, OGSP, Welder Qualification, Medical Fitness).
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, employee #, IC/Passport..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Branch Filter */}
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          disabled={isBranchScoped}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">All Regional Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          disabled={user?.role === UserRole.DEPARTMENT_USER}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

      </div>

      {/* Employees Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Emp ID</th>
                <th className="py-3 px-3">Full Name</th>
                <th className="py-3 px-3">IC / Passport</th>
                <th className="py-3 px-3">Designation</th>
                <th className="py-3 px-3">Branch Yard</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Compliance Score</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading personnel directory...</span>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-slate-800">No personnel records found</p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const score = emp.complianceScore || 0;
                  const isFull = score === 100;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{emp.employeeNumber}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{emp.fullName}</td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{emp.icOrPassport}</td>
                      <td className="py-3 px-3 text-slate-600">{emp.designation}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{emp.branchName}</td>
                      <td className="py-3 px-3 text-slate-500">{emp.departmentName}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                            <div
                              className={`h-2 rounded-full ${
                                isFull ? 'bg-emerald-500' : score > 50 ? 'bg-blue-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              isFull ? 'text-emerald-600' : score > 50 ? 'text-blue-600' : 'text-rose-600'
                            }`}
                          >
                            {score}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenEmployeeProfile(emp.id)}
                          className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold transition shadow-xs"
                        >
                          View Checklist
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMPLOYEE COMPLIANCE PROFILE DRAWER / MODAL */}
      {selectedEmployeeProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold shrink-0">
                  {selectedEmployeeProfile.employee.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedEmployeeProfile.employee.fullName}
                    </h2>
                    <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedEmployeeProfile.employee.employeeNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedEmployeeProfile.employee.designation} • {selectedEmployeeProfile.employee.branchName} • {selectedEmployeeProfile.employee.departmentName}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    IC/Passport: {selectedEmployeeProfile.employee.icOrPassport}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Compliance Score</span>
                  <span
                    className={`text-xl font-bold ${
                      selectedEmployeeProfile.complianceScore === 100
                        ? 'text-emerald-600'
                        : selectedEmployeeProfile.complianceScore > 50
                        ? 'text-blue-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {selectedEmployeeProfile.complianceScore}%
                  </span>
                </div>
                <button
                  onClick={() => setSelectedEmployeeProfile(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body: Checklist of Required Documents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-blue-600" />
                  <span>Statutory Document Requirements Checklist</span>
                </h3>
                <button
                  onClick={() => {
                    const empId = selectedEmployeeProfile.employee.id;
                    setSelectedEmployeeProfile(null);
                    onUploadNewDocForEmployee(empId);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Requirement</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Doc #</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedEmployeeProfile.checklist.map((item: any) => (
                      <tr key={item.requirement.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.requirement.name}</div>
                          {item.requirement.description && (
                            <div className="text-[10px] text-slate-500">{item.requirement.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{item.requirement.category}</td>
                        <td className="py-3 px-3 font-mono text-blue-600 font-bold">
                          {item.document ? item.document.documentNumber : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[11px] ${item.document?.expiryDate ? 'text-orange-600 font-mono font-medium' : 'text-slate-400'}`}>
                            {item.document?.expiryDate || 'No Expiry'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={item.status} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          {item.document ? (
                            <button
                              onClick={() => {
                                const docId = item.document.id;
                                setSelectedEmployeeProfile(null);
                                onOpenDocument(docId);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold transition shadow-xs"
                            >
                              Review
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const empId = selectedEmployeeProfile.employee.id;
                                setSelectedEmployeeProfile(null);
                                onUploadNewDocForEmployee(empId);
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition shadow-xs"
                            >
                              Upload
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedEmployeeProfile(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-xs"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
