import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  ClipboardCheck,
  Files,
  Building2,
  Network,
  Users,
  FileCheck2,
  ClockAlert,
  BarChart3,
  History,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'verification-queue'
  | 'documents'
  | 'branches'
  | 'departments'
  | 'employees'
  | 'requirements'
  | 'expiring'
  | 'reports'
  | 'audit-logs'
  | 'test-suite';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingCount?: number;
  rejectedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, pendingCount = 0, rejectedCount = 0 }) => {
  const { user } = useAuth();
  const role = user?.role || UserRole.VIEW_ONLY;

  const isHeadOfficeOrAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.HEAD_OFFICE_ADMIN;
  const isBranchUser = role === UserRole.BRANCH_MANAGER || role === UserRole.DEPARTMENT_USER;

  const navigationItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.BRANCH_MANAGER, UserRole.DEPARTMENT_USER, UserRole.VIEW_ONLY],
    },
    {
      id: 'verification-queue' as TabType,
      label: 'Verification Queue',
      icon: ClipboardCheck,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN],
    },
    {
      id: 'documents' as TabType,
      label: 'Document Registry',
      icon: Files,
      badge: isBranchUser && rejectedCount > 0 ? `${rejectedCount} Action` : undefined,
      badgeColor: 'bg-rose-500 text-white font-bold',
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.BRANCH_MANAGER, UserRole.DEPARTMENT_USER, UserRole.VIEW_ONLY],
    },
    {
      id: 'branches' as TabType,
      label: 'Branches & Yards',
      icon: Building2,
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.VIEW_ONLY],
    },
    {
      id: 'departments' as TabType,
      label: 'Departments',
      icon: Network,
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.BRANCH_MANAGER, UserRole.VIEW_ONLY],
    },
    {
      id: 'employees' as TabType,
      label: 'Employee Profiles',
      icon: Users,
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.BRANCH_MANAGER, UserRole.DEPARTMENT_USER, UserRole.VIEW_ONLY],
    },
    {
      id: 'requirements' as TabType,
      label: 'Document Rules',
      icon: FileCheck2,
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN],
    },
    {
      id: 'expiring' as TabType,
      label: 'Expiry Forecast',
      icon: ClockAlert,
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.BRANCH_MANAGER, UserRole.DEPARTMENT_USER, UserRole.VIEW_ONLY],
    },
    {
      id: 'reports' as TabType,
      label: 'Compliance Reports',
      icon: FileSpreadsheet,
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.BRANCH_MANAGER, UserRole.VIEW_ONLY],
    },
    {
      id: 'audit-logs' as TabType,
      label: 'Audit Trail',
      icon: History,
      roles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.VIEW_ONLY],
    },
  ];

  const filteredNav = navigationItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Scope Banner */}
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
          Active Workspace
        </div>
        <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
          {isHeadOfficeOrAdmin ? (
            <>
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Head Office (Corporate HQ)</span>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">{user?.branchName || 'Branch Portal'}</span>
            </>
          )}
        </div>
        {user?.departmentName && (
          <div className="text-[10px] text-slate-500 mt-1 truncate pl-5">
            {user.departmentName}
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                    isActive ? 'bg-white text-blue-700 font-bold' : item.badgeColor || 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-500 bg-slate-50">
        <div className="flex items-center justify-between">
          <span>Security Layer</span>
          <span className="text-emerald-600 font-semibold">Enforced (RBAC)</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400 font-medium">
          Poratha ISO 9001 / DOSH Compliant
        </div>
      </div>
    </aside>
  );
};
