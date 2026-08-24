import { Response } from 'express';
import { Database } from '../db/database.js';
import { AuthenticatedRequest } from '../auth/authMiddleware.js';
import { AuditAction, DocumentRequirement } from '../types/index.js';

export class RequirementController {
  public static async listRequirements(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const { departmentId, branchId } = req.query;
    let requirements = db.getRequirements();

    if (departmentId) {
      requirements = requirements.filter((r) => r.departmentId === departmentId);
    }
    if (branchId) {
      requirements = requirements.filter((r) => !r.applicableBranchId || r.applicableBranchId === branchId);
    }

    const departments = db.getDepartments();
    const branches = db.getBranches();

    const withNames = requirements.map((r) => {
      const dept = departments.find((d) => d.id === r.departmentId);
      const branch = r.applicableBranchId ? branches.find((b) => b.id === r.applicableBranchId) : null;

      return {
        ...r,
        departmentName: dept ? dept.name : r.departmentId,
        applicableBranchName: branch ? branch.name : 'All Branches (Company-wide)',
      };
    });

    res.json({ requirements: withNames });
  }

  public static async createRequirement(req: AuthenticatedRequest, res: Response): Promise<void> {
    const {
      name,
      code,
      category,
      departmentId,
      isRequired,
      applicableBranchId,
      expiryRequired,
      renewalPeriodDays,
      verificationRequired,
      description,
    } = req.body;

    if (!name || !category || !departmentId) {
      res.status(400).json({ error: 'Name, category, and department are required.' });
      return;
    }

    const db = Database.getInstance();
    const generatedCode = code ? code.trim().toUpperCase() : `REQ-${Date.now().toString(36).toUpperCase()}`;

    const newReq: DocumentRequirement = {
      id: 'req_' + Date.now().toString(36),
      code: generatedCode,
      name: name.trim(),
      category: category.trim(),
      departmentId,
      isRequired: isRequired !== undefined ? Boolean(isRequired) : true,
      applicableBranchId: applicableBranchId || null,
      expiryRequired: expiryRequired !== undefined ? Boolean(expiryRequired) : false,
      renewalPeriodDays: Number(renewalPeriodDays) || 365,
      verificationRequired: verificationRequired !== undefined ? Boolean(verificationRequired) : true,
      description: description || '',
      createdAt: new Date().toISOString(),
    };

    db.getRequirements().push(newReq);
    db.saveDatabase();

    db.addAuditLog({
      id: 'audit_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: AuditAction.REQUIREMENT_CREATED,
      entity: 'DocumentRequirement',
      entityId: newReq.id,
      details: `Created new document requirement rule: ${newReq.name} (${newReq.code})`,
      newValue: newReq,
    });

    res.status(201).json({ requirement: newReq });
  }

  public static async updateRequirement(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const db = Database.getInstance();
    const reqItem = db.getRequirements().find((r) => r.id === id);

    if (!reqItem) {
      res.status(404).json({ error: 'Requirement not found.' });
      return;
    }

    const previousValue = { ...reqItem };
    const { name, category, isRequired, applicableBranchId, expiryRequired, renewalPeriodDays, verificationRequired, description } = req.body;

    if (name !== undefined) reqItem.name = name;
    if (category !== undefined) reqItem.category = category;
    if (isRequired !== undefined) reqItem.isRequired = Boolean(isRequired);
    if (applicableBranchId !== undefined) reqItem.applicableBranchId = applicableBranchId || null;
    if (expiryRequired !== undefined) reqItem.expiryRequired = Boolean(expiryRequired);
    if (renewalPeriodDays !== undefined) reqItem.renewalPeriodDays = Number(renewalPeriodDays);
    if (verificationRequired !== undefined) reqItem.verificationRequired = Boolean(verificationRequired);
    if (description !== undefined) reqItem.description = description;

    db.saveDatabase();

    db.addAuditLog({
      id: 'audit_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: AuditAction.REQUIREMENT_CREATED,
      entity: 'DocumentRequirement',
      entityId: reqItem.id,
      details: `Updated requirement rule: ${reqItem.name}`,
      previousValue,
      newValue: reqItem,
    });

    res.json({ requirement: reqItem });
  }
}
