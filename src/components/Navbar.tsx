import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, NotificationItem } from '../types';
import { api } from '../services/api';
import {
  Bell,
  Search,
  Shield,
  Building2,
  UserCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  onOpenSearch?: () => void;
  onOpenTestSuite: () => void;
  onSelectDocument?: (docId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTestSuite, onSelectDocument }) => {
  const { user, logout, switchUser, demoAccounts } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPopover(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const res = await api.getDocuments({ search: val, limit: 6 });
      setSearchResults(res.documents);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleNotifClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await api.markNotificationRead(notif.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
    }
    if (notif.documentId && onSelectDocument) {
      onSelectDocument(notif.documentId);
      setShowNotifPopover(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded font-medium border border-purple-200">SUPER ADMIN</span>;
      case UserRole.HEAD_OFFICE_ADMIN:
        return <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-medium border border-blue-200">HEAD OFFICE HQ</span>;
      case UserRole.BRANCH_MANAGER:
        return <span className="bg-amber-50 text-amber-800 text-xs px-2 py-0.5 rounded font-medium border border-amber-200">BRANCH MANAGER</span>;
      case UserRole.DEPARTMENT_USER:
        return <span className="bg-emerald-50 text-emerald-800 text-xs px-2 py-0.5 rounded font-medium border border-emerald-200">DEPT USER</span>;
      case UserRole.VIEW_ONLY:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium border border-slate-200">AUDITOR (VIEW ONLY)</span>;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white text-slate-900 border-b border-slate-200 shadow-sm">
      <div className="w-full px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="font-black text-base tracking-wider text-white">P</span>
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wider uppercase text-slate-900">PORATHA</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200">DCS v2.4</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Document Control & Verification</p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              placeholder="Search document name, PRT ID, employee, branch..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              <div className="p-2.5 border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                <span>Matching Documents ({searchResults.length})</span>
                {isSearching && <span className="text-blue-600 animate-pulse font-normal">Searching...</span>}
              </div>
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No documents found matching "{searchQuery}"</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {searchResults.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        if (onSelectDocument) onSelectDocument(d.id);
                        setShowSearchResults(false);
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-slate-800 truncate">{d.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-blue-600 font-medium">{d.documentNumber}</span>
                          <span>•</span>
                          <span>{d.branchName}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                        {d.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Automated Test Suite Trigger */}
          <button
            onClick={onOpenTestSuite}
            title="Run Automated Compliance & Security Test Suite"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 transition shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden lg:inline">System Tests</span>
          </button>

          {/* Notifications Center */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              className="relative p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition shadow-sm"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifPopover && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">No recent notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`p-3 text-xs transition cursor-pointer hover:bg-slate-50 ${
                          !n.isRead ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                            <span>{n.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Account & Fast Demo Switcher */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition shadow-sm"
            >
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="text-left hidden sm:block max-w-[130px] truncate">
                <div className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'Poratha User'}</div>
                <div className="text-[10px] text-slate-500 truncate">{user?.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50">
                  <div className="font-bold text-xs text-slate-900">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{user?.email}</div>
                  <div className="mt-2 flex items-center gap-1.5">{user && getRoleBadge(user.role)}</div>
                  {user?.branchName && (
                    <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-blue-600" />
                      <span className="truncate">{user.branchName}</span>
                    </div>
                  )}
                </div>

                {/* Role Switcher Section for Instant Demo Evaluation */}
                <div className="p-2 border-b border-slate-100">
                  <div className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Quick Switch Persona</span>
                  </div>
                  <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                    {demoAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          switchUser(acc.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                          user?.id === acc.id
                            ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate font-medium">{acc.name}</div>
                          <div className="text-[10px] text-slate-500">{acc.role}</div>
                        </div>
                        {user?.id === acc.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-1.5">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
