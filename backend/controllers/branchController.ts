import { Response } from 'express';
import { Database } from '../db/database.js';
import { AuthenticatedRequest, checkBranchAccess } from '../auth/authMiddleware.js';
import { ComplianceService } from '../services/complianceService.js';
import { AuditAction, Branch, UserRole } from '../types/index.js';

export class BranchController {
  public static async listBranches(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const user = req.user!;
    let branches = db.getBranches();

    // If branch manager or department user, only return their branch
    if (user.role === UserRole.BRANCH_MANAGER || user.role === UserRole.DEPARTMENT_USER) {
      if (user.branchId) {
        branches = branches.filter((b) => b.id === user.branchId);
      }
    }

    const branchesWithStats = branches.map((branch) => {
      const stats = ComplianceService.calculateBranchCompliance(branch.id);
      const employeeCount = db.getEmployees().filter((e) => e.branchId === branch.id && e.status !== 'INACTIVE').length;
      const documentCount = db.getDocuments().filter((d) => d.branchId === branch.id).length;

      return {
        ...branch,
        stats,
        employeeCount,
        documentCount,
      };
    });

    res.json({ branches: branchesWithStats });
  }

  public static async getBranch(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;

    if (!checkBranchAccess(user, id)) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view this branch.' });
      return;
    }

    const db = Database.getInstance();
    const branch = db.getBranches().find((b) => b.id === id);

    if (!branch) {
      res.status(404).json({ error: 'Branch not found.' });
      return;
    }

    const stats = ComplianceService.calculateBranchCompliance(branch.id);
    const employees = db.getEmployees().filter((e) => e.branchId === branch.id);
    const documents = db.getDocuments().filter((d) => d.branchId === branch.id);

    res.json({
      branch: {
        ...branch,
        stats,
        employeeCount: employees.length,
        documentCount: documents.length,
      },
    });
  }

  public static async createBranch(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { code, name, location, state, contactPerson, email, phone } = req.body;

    if (!code || !name || !location) {
      res.status(400).json({ error: 'Code, name, and location are required.' });
      return;
    }

    const db = Database.getInstance();
    const existing = db.getBranches().find((b) => b.code.toLowerCase() === code.toLowerCase().trim());
    if (existing) {
      res.status(400).json({ error: `Branch code '${code}' already exists.` });
      return;
    }

    const newBranch: Branch = {
      id: 'br_' + Date.now().toString(36),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      location: location.trim(),
      state: state || 'Johor',
      contactPerson: contactPerson || '',
      email: email || '',
      phone: phone || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.getBranches().push(newBranch);
    db.saveDatabase();

    db.addAuditLog({
      id: 'audit_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: AuditAction.BRANCH_CREATED,
      entity: 'Branch',
      entityId: newBranch.id,
      details: `Created new regional branch: ${newBranch.name} (${newBranch.code})`,
      newValue: newBranch,
    });

    res.status(201).json({ branch: newBranch });
  }

  public static async updateBranch(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const db = Database.getInstance();
    const branch = db.getBranches().find((b) => b.id === id);

    if (!branch) {
      res.status(404).json({ error: 'Branch not found.' });
      return;
    }

    const previousValue = { ...branch };
    const { name, location, state, contactPerson, email, phone, isActive } = req.body;

    if (name !== undefined) branch.name = name;
    if (location !== undefined) branch.location = location;
    if (state !== undefined) branch.state = state;
    if (contactPerson !== undefined) branch.contactPerson = contactPerson;
    if (email !== undefined) branch.email = email;
    if (phone !== undefined) branch.phone = phone;
    if (isActive !== undefined) branch.isActive = isActive;

    db.saveDatabase();

    db.addAuditLog({
      id: 'audit_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: AuditAction.BRANCH_CREATED,
      entity: 'Branch',
      entityId: branch.id,
      details: `Updated branch details for ${branch.name}`,
      previousValue,
      newValue: branch,
    });

    res.json({ branch });
  }
}
