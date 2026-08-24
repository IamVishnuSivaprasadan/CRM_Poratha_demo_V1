import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { Database } from './backend/db/database.js';
import { authMiddleware, requireRole } from './backend/auth/authMiddleware.js';
import { UserRole } from './backend/types/index.js';

import { AuthController } from './backend/controllers/authController.js';
import { BranchController } from './backend/controllers/branchController.js';
import { DepartmentController } from './backend/controllers/departmentController.js';
import { EmployeeController } from './backend/controllers/employeeController.js';
import { RequirementController } from './backend/controllers/requirementController.js';
import { DocumentController } from './backend/controllers/documentController.js';
import { DashboardController } from './backend/controllers/dashboardController.js';
import { ReportController } from './backend/controllers/reportController.js';
import { NotificationController } from './backend/controllers/notificationController.js';
import { AuditController } from './backend/controllers/auditController.js';
import { TestController } from './backend/controllers/testController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Database & seed data
  Database.getInstance();

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Poratha Document Control API',
      timestamp: new Date().toISOString(),
    });
  });

  // Automated Test Suite Runner (Section 37 & 40)
  app.get('/api/test/run-suite', TestController.runAllTests);

  // Authentication endpoints
  app.post('/api/auth/login', AuthController.login);
  app.get('/api/auth/me', authMiddleware, AuthController.me);
  app.get('/api/auth/demo-accounts', AuthController.getDemoAccounts);
  app.post('/api/auth/switch-demo', AuthController.switchDemoUser);

  // Branches
  app.get('/api/branches', authMiddleware, BranchController.listBranches);
  app.get('/api/branches/:id', authMiddleware, BranchController.getBranch);
  app.post('/api/branches', authMiddleware, requireRole([UserRole.SUPER_ADMIN]), BranchController.createBranch);
  app.put('/api/branches/:id', authMiddleware, requireRole([UserRole.SUPER_ADMIN]), BranchController.updateBranch);

  // Departments
  app.get('/api/departments', authMiddleware, DepartmentController.listDepartments);
  app.get('/api/departments/:id', authMiddleware, DepartmentController.getDepartment);
  app.post('/api/departments', authMiddleware, requireRole([UserRole.SUPER_ADMIN]), DepartmentController.createDepartment);

  // Employees
  app.get('/api/employees', authMiddleware, EmployeeController.listEmployees);
  app.get('/api/employees/:id', authMiddleware, EmployeeController.getEmployeeProfile);
  app.post(
    '/api/employees',
    authMiddleware,
    requireRole([UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.BRANCH_MANAGER]),
    EmployeeController.createEmployee
  );

  // Document Requirements
  app.get('/api/requirements', authMiddleware, RequirementController.listRequirements);
  app.post('/api/requirements', authMiddleware, requireRole([UserRole.SUPER_ADMIN]), RequirementController.createRequirement);
  app.put('/api/requirements/:id', authMiddleware, requireRole([UserRole.SUPER_ADMIN]), RequirementController.updateRequirement);

  // Documents Management & Workflow
  app.get('/api/documents', authMiddleware, DocumentController.listDocuments);
  app.get('/api/documents/:id', authMiddleware, DocumentController.getDocument);
  app.post('/api/documents', authMiddleware, upload.single('file'), DocumentController.uploadDocument);
  app.post('/api/documents/:id/versions', authMiddleware, upload.single('file'), DocumentController.uploadReplacementVersion);
  app.post('/api/documents/:id/verify', authMiddleware, DocumentController.verifyDocument);
  app.post('/api/documents/:id/reject', authMiddleware, DocumentController.rejectDocument);
  app.post('/api/documents/bulk-verify', authMiddleware, DocumentController.bulkVerify);
  app.get('/api/documents/:id/versions/:versionId/file', authMiddleware, DocumentController.getFile);

  // Dashboards
  app.get('/api/dashboard/head-office', authMiddleware, DashboardController.getHeadOfficeDashboard);
  app.get('/api/dashboard/branch/:branchId', authMiddleware, DashboardController.getBranchDashboard);
  app.get('/api/dashboard/department/:departmentId', authMiddleware, DashboardController.getDepartmentDashboard);

  // Reports & CSV Exports
  app.get('/api/reports/compliance', authMiddleware, ReportController.getComplianceReport);
  app.get('/api/reports/pending', authMiddleware, ReportController.getPendingReport);
  app.get('/api/reports/rejected', authMiddleware, ReportController.getRejectedReport);
  app.get('/api/reports/expiring', authMiddleware, ReportController.getExpiringReport);

  // Notifications
  app.get('/api/notifications', authMiddleware, NotificationController.listNotifications);
  app.put('/api/notifications/:id/read', authMiddleware, NotificationController.markAsRead);
  app.post('/api/notifications/read-all', authMiddleware, NotificationController.markAllAsRead);

  // Audit Logs
  app.get(
    '/api/audit-logs',
    authMiddleware,
    requireRole([UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE_ADMIN, UserRole.VIEW_ONLY]),
    AuditController.listAuditLogs
  );

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`PORATHA DOCUMENT CONTROL & VERIFICATION SYSTEM`);
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log(`=======================================================`);
  });
}

startServer();
