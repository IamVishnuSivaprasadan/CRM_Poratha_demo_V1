import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Database } from '../db/database.js';
import { User, UserRole } from '../types/index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'poratha_corp_super_secret_jwt_key_2026_production';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      departmentId: user.departmentId,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing or malformed Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const db = Database.getInstance();
    const user = db.getUsers().find((u) => u.id === payload.id && u.isActive);

    if (!user) {
      res.status(401).json({ error: 'User account not found or deactivated.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

export function checkBranchAccess(user: User, targetBranchId?: string | null): boolean {
  if (!targetBranchId) return true;
  // Super Admin and Head Office Admin have global branch visibility
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.HEAD_OFFICE_ADMIN || user.role === UserRole.VIEW_ONLY) {
    return true;
  }
  // Branch Managers and Department Users are strictly isolated to their own branch
  return user.branchId === targetBranchId;
}

export function checkDepartmentAccess(user: User, targetDeptId?: string | null): boolean {
  if (!targetDeptId) return true;
  // Super Admin, Head Office Admin, Branch Manager, and View Only have visibility across all departments in authorized branch
  if (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.HEAD_OFFICE_ADMIN ||
    user.role === UserRole.BRANCH_MANAGER ||
    user.role === UserRole.VIEW_ONLY
  ) {
    return true;
  }
  // Department Users are restricted to their own department
  return user.departmentId === targetDeptId;
}
