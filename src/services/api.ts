import { DocumentStatus, RejectionReasonCode, UserRole } from '../types';

const API_BASE = 'https://crm-poratha-demo-v1.onrender.com/api';

function getAuthToken(): string | null {
  return localStorage.getItem('poratha_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('poratha_auth_token', token);
  } else {
    localStorage.removeItem('poratha_auth_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clear token if expired
    if (!endpoint.includes('/auth/login')) {
      localStorage.removeItem('poratha_auth_token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      // Use fallback errorMsg
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<{ user: any }>('/auth/me'),
  getDemoAccounts: () => request<{ users: any[] }>('/auth/demo-accounts'),
  switchDemoUser: (userId: string) =>
    request<{ token: string; user: any }>('/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  // Branches
  getBranches: () => request<{ branches: any[] }>('/branches'),
  getBranch: (id: string) => request<{ branch: any }>(`/branches/${id}`),
  createBranch: (data: any) =>
    request<{ branch: any }>('/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBranch: (id: string, data: any) =>
    request<{ branch: any }>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Departments
  getDepartments: (branchId?: string) =>
    request<{ departments: any[] }>(`/departments${branchId ? `?branchId=${branchId}` : ''}`),
  getDepartment: (id: string, branchId?: string) =>
    request<{ department: any }>(`/departments/${id}${branchId ? `?branchId=${branchId}` : ''}`),
  createDepartment: (data: any) =>
    request<{ department: any }>('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Employees
  getEmployees: (params: { branchId?: string; departmentId?: string; search?: string; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.branchId) q.append('branchId', params.branchId);
    if (params.departmentId) q.append('departmentId', params.departmentId);
    if (params.search) q.append('search', params.search);
    if (params.status) q.append('status', params.status);
    return request<{ employees: any[] }>(`/employees?${q.toString()}`);
  },
  getEmployeeProfile: (id: string) => request<{ profile: any }>(`/employees/${id}`),
  createEmployee: (data: any) =>
    request<{ employee: any }>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Requirements
  getRequirements: (params: { departmentId?: string; branchId?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.departmentId) q.append('departmentId', params.departmentId);
    if (params.branchId) q.append('branchId', params.branchId);
    return request<{ requirements: any[] }>(`/requirements?${q.toString()}`);
  },
  createRequirement: (data: any) =>
    request<{ requirement: any }>('/requirements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRequirement: (id: string, data: any) =>
    request<{ requirement: any }>(`/requirements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Documents
  getDocuments: (params: {
    status?: string;
    branchId?: string;
    departmentId?: string;
    employeeId?: string;
    category?: string;
    expiringDays?: number;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.branchId) q.append('branchId', params.branchId);
    if (params.departmentId) q.append('departmentId', params.departmentId);
    if (params.employeeId) q.append('employeeId', params.employeeId);
    if (params.category) q.append('category', params.category);
    if (params.expiringDays) q.append('expiringDays', params.expiringDays.toString());
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());
    return request<{ documents: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/documents?${q.toString()}`
    );
  },
  getDocument: (id: string) => request<{ document: any; versions: any[]; verifications: any[]; requirement: any }>(`/documents/${id}`),
  uploadDocument: (formData: FormData) =>
    request<{ document: any; version: any; message: string }>('/documents', {
      method: 'POST',
      body: formData,
    }),
  uploadReplacementVersion: (docId: string, formData: FormData) =>
    request<{ document: any; version: any; message: string }>(`/documents/${docId}/versions`, {
      method: 'POST',
      body: formData,
    }),
  verifyDocument: (docId: string, comments?: string) =>
    request<{ document: any; verification: any; message: string }>(`/documents/${docId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    }),
  rejectDocument: (docId: string, reasonCode: RejectionReasonCode, comments: string) =>
    request<{ document: any; verification: any; message: string }>(`/documents/${docId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode, comments }),
    }),
  bulkVerify: (documentIds: string[], comments?: string) =>
    request<{ verifiedCount: number; documents: any[]; message: string }>('/documents/bulk-verify', {
      method: 'POST',
      body: JSON.stringify({ documentIds, comments }),
    }),

  // Dashboards
  getHeadOfficeDashboard: () => request<any>('/dashboard/head-office'),
  getBranchDashboard: (branchId: string) => request<any>(`/dashboard/branch/${branchId}`),
  getDepartmentDashboard: (deptId: string, branchId?: string) =>
    request<any>(`/dashboard/department/${deptId}${branchId ? `?branchId=${branchId}` : ''}`),

  // Reports
  getComplianceReport: () => request<any>('/reports/compliance'),
  getPendingReport: () => request<any>('/reports/pending'),
  getRejectedReport: () => request<any>('/reports/rejected'),
  getExpiringReport: () => request<any>('/reports/expiring'),

  // Notifications
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request<{ success: boolean }>('/notifications/read-all', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: (params: { action?: string; userId?: string; search?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.action) q.append('action', params.action);
    if (params.userId) q.append('userId', params.userId);
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());
    return request<{ logs: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/audit-logs?${q.toString()}`
    );
  },

  // Test Suite
  runTestSuite: () => request<{ summary: any; tests: any[] }>('/test/run-suite'),
};
