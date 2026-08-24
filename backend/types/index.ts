export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HEAD_OFFICE_ADMIN = 'HEAD_OFFICE_ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  DEPARTMENT_USER = 'DEPARTMENT_USER',
  VIEW_ONLY = 'VIEW_ONLY',
}

export enum DocumentStatus {
  NOT_UPLOADED = 'NOT_UPLOADED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export enum RejectionReasonCode {
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED',
  INCORRECT_DOCUMENT = 'INCORRECT_DOCUMENT',
  MISSING_PAGE = 'MISSING_PAGE',
  POOR_SCAN_QUALITY = 'POOR_SCAN_QUALITY',
  NAME_MISMATCH = 'NAME_MISMATCH',
  INCORRECT_INFORMATION = 'INCORRECT_INFORMATION',
  INVALID_CERTIFICATE = 'INVALID_CERTIFICATE',
  DUPLICATE_DOCUMENT = 'DUPLICATE_DOCUMENT',
  OTHER = 'OTHER',
}

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VIEWED = 'DOCUMENT_VIEWED',
  DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  DOCUMENT_REPLACED = 'DOCUMENT_REPLACED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  DOCUMENT_RESTORED = 'DOCUMENT_RESTORED',
  USER_CREATED = 'USER_CREATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  BRANCH_CREATED = 'BRANCH_CREATED',
  DEPARTMENT_CREATED = 'DEPARTMENT_CREATED',
  REQUIREMENT_CREATED = 'REQUIREMENT_CREATED',
}

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  name: string;
  role: UserRole;
  branchId?: string | null;
  branchName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  location: string;
  state: string;
  contactPerson: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  headOfDepartment: string;
  isActive: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  icOrPassport: string;
  designation: string;
  branchId: string;
  departmentId: string;
  joiningDate: string;
  contactNumber: string;
  email: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  createdAt: string;
}

export interface DocumentRequirement {
  id: string;
  code: string;
  name: string;
  category: string;
  departmentId: string;
  isRequired: boolean;
  applicableBranchId?: string | null; // null means all branches
  expiryRequired: boolean;
  renewalPeriodDays: number;
  verificationRequired: boolean;
  description?: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  notes?: string;
  ocrText?: string;
}

export interface DocumentVerification {
  id: string;
  documentId: string;
  documentVersionId: string;
  action: 'VERIFIED' | 'REJECTED';
  verifiedById: string;
  verifiedByName: string;
  comments?: string;
  reasonCode?: RejectionReasonCode;
  reasonText?: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  documentNumber: string;
  title: string;
  requirementId: string;
  requirementName: string;
  category: string;
  branchId: string;
  branchName: string;
  departmentId: string;
  departmentName: string;
  employeeId?: string | null;
  employeeName?: string | null;
  employeeNumber?: string | null;
  status: DocumentStatus;
  currentVersionId?: string | null;
  currentVersionNumber: number;
  expiryDate?: string | null;
  issueDate?: string | null;
  lastVerifiedAt?: string | null;
  lastVerifiedById?: string | null;
  lastVerifiedByName?: string | null;
  lastRejectionReason?: string | null;
  lastRejectionComments?: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId?: string | null; // null means broadcast / role-based
  targetRole?: UserRole | null;
  targetBranchId?: string | null;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  documentId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userBranchId?: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  previousValue?: any;
  newValue?: any;
}
