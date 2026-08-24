import { Response } from 'express';
import { Database } from '../db/database.js';
import { AuthenticatedRequest, checkBranchAccess, checkDepartmentAccess } from '../auth/authMiddleware.js';
import { ComplianceService } from '../services/complianceService.js';
import { Employee, UserRole } from '../types/index.js';

export class EmployeeController {
  public static async listEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const user = req.user!;
    let employees = db.getEmployees();

    // Role filtering
    if (user.role === UserRole.BRANCH_MANAGER && user.branchId) {
      employees = employees.filter((e) => e.branchId === user.branchId);
    } else if (user.role === UserRole.DEPARTMENT_USER && user.branchId && user.departmentId) {
      employees = employees.filter((e) => e.branchId === user.branchId && e.departmentId === user.departmentId);
    }

    // Query params filtering
    const { branchId, departmentId, search, status } = req.query;

    if (branchId && checkBranchAccess(user, branchId as string)) {
      employees = employees.filter((e) => e.branchId === branchId);
    }
    if (departmentId && checkDepartmentAccess(user, departmentId as string)) {
      employees = employees.filter((e) => e.departmentId === departmentId);
    }
    if (status) {
      employees = employees.filter((e) => e.status === status);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      employees = employees.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.employeeNumber.toLowerCase().includes(q) ||
          e.icOrPassport.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q)
      );
    }

    const branches = db.getBranches();
    const departments = db.getDepartments();

    const employeesWithCompliance = employees.map((emp) => {
      const profile = ComplianceService.getEmployeeProfile(emp.id);
      const branch = branches.find((b) => b.id === emp.branchId);
      const dept = departments.find((d) => d.id === emp.departmentId);

      return {
        ...emp,
        branchName: branch ? branch.name : emp.branchId,
        departmentName: dept ? dept.name : emp.departmentId,
        complianceScore: profile ? profile.score.complianceRate : 0,
        totalRequired: profile ? profile.score.totalRequired : 0,
        verifiedCount: profile ? profile.score.verified : 0,
        pendingCount: profile ? profile.score.pending : 0,
        rejectedCount: profile ? profile.score.rejected : 0,
        missingCount: profile ? profile.score.notUploaded : 0,
      };
    });

    res.json({ employees: employeesWithCompliance });
  }

  public static async getEmployeeProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;

    const db = Database.getInstance();
    const employee = db.getEmployees().find((e) => e.id === id);

    if (!employee) {
      res.status(404).json({ error: 'Employee not found.' });
      return;
    }

    if (!checkBranchAccess(user, employee.branchId)) {
      res.status(403).json({ error: 'Access denied: Unauthorized branch.' });
      return;
    }
    if (!checkDepartmentAccess(user, employee.departmentId)) {
      res.status(403).json({ error: 'Access denied: Unauthorized department.' });
      return;
    }

    const profile = ComplianceService.getEmployeeProfile(employee.id);
    const branch = db.getBranches().find((b) => b.id === employee.branchId);
    const dept = db.getDepartments().find((d) => d.id === employee.departmentId);

    res.json({
      profile: {
        ...profile,
        employee: {
          ...employee,
          branchName: branch ? branch.name : employee.branchId,
          departmentName: dept ? dept.name : employee.departmentId,
        },
      },
    });
  }

  public static async createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { fullName, icOrPassport, designation, branchId, departmentId, joiningDate, contactNumber, email } = req.body;

    if (!fullName || !icOrPassport || !designation || !branchId || !departmentId) {
      res.status(400).json({ error: 'Full name, IC/Passport, Designation, Branch, and Department are required.' });
      return;
    }

    const user = req.user!;
    if (!checkBranchAccess(user, branchId)) {
      res.status(403).json({ error: 'Forbidden: Cannot create employee in another branch.' });
      return;
    }

    const db = Database.getInstance();
    const branch = db.getBranches().find((b) => b.id === branchId);
    const branchCode = branch ? branch.code.split('-')[1] || 'BR' : 'BR';
    const count = db.getEmployees().length + 100;
    const employeeNumber = `PRT-${branchCode}-${count}`;

    const newEmp: Employee = {
      id: 'emp_' + Date.now().toString(36),
      employeeNumber,
      fullName: fullName.trim(),
      icOrPassport: icOrPassport.trim(),
      designation: designation.trim(),
      branchId,
      departmentId,
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      contactNumber: contactNumber || '',
      email: email || '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    db.getEmployees().push(newEmp);
    db.saveDatabase();

    res.status(201).json({ employee: newEmp });
  }
}
