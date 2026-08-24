import { Response } from 'express';
import { Database } from '../db/database.js';
import { AuthenticatedRequest, checkDepartmentAccess } from '../auth/authMiddleware.js';
import { ComplianceService } from '../services/complianceService.js';
import { AuditAction, Department, UserRole } from '../types/index.js';

export class DepartmentController {
  public static async listDepartments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const user = req.user!;
    let departments = db.getDepartments();

    if (user.role === UserRole.DEPARTMENT_USER && user.departmentId) {
      departments = departments.filter((d) => d.id === user.departmentId);
    }

    const branchFilter = (req.query.branchId as string) || (user.branchId || null);

    const deptsWithStats = departments.map((dept) => {
      const stats = ComplianceService.calculateDepartmentCompliance(branchFilter, dept.id);
      const employeeCount = db
        .getEmployees()
        .filter((e) => e.departmentId === dept.id && (!branchFilter || e.branchId === branchFilter) && e.status !== 'INACTIVE').length;
      const documentCount = db
        .getDocuments()
        .filter((d) => d.departmentId === dept.id && (!branchFilter || d.branchId === branchFilter)).length;

      return {
        ...dept,
        stats,
        employeeCount,
        documentCount,
      };
    });

    res.json({ departments: deptsWithStats });
  }

  public static async getDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;

    if (!checkDepartmentAccess(user, id)) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view this department.' });
      return;
    }

    const db = Database.getInstance();
    const department = db.getDepartments().find((d) => d.id === id);

    if (!department) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }

    const branchFilter = (req.query.branchId as string) || (user.branchId || null);
    const stats = ComplianceService.calculateDepartmentCompliance(branchFilter, department.id);

    res.json({
      department: {
        ...department,
        stats,
      },
    });
  }

  public static async createDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { code, name, description, headOfDepartment } = req.body;

    if (!code || !name) {
      res.status(400).json({ error: 'Code and name are required.' });
      return;
    }

    const db = Database.getInstance();
    const existing = db.getDepartments().find((d) => d.code.toLowerCase() === code.toLowerCase().trim());
    if (existing) {
      res.status(400).json({ error: `Department code '${code}' already exists.` });
      return;
    }

    const newDept: Department = {
      id: 'dept_' + Date.now().toString(36),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description || '',
      headOfDepartment: headOfDepartment || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.getDepartments().push(newDept);
    db.saveDatabase();

    db.addAuditLog({
      id: 'audit_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: AuditAction.DEPARTMENT_CREATED,
      entity: 'Department',
      entityId: newDept.id,
      details: `Created new department: ${newDept.name} (${newDept.code})`,
      newValue: newDept,
    });

    res.status(201).json({ department: newDept });
  }
}
