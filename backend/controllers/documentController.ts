import { Response } from 'express';
import { Database } from '../db/database.js';
import { AuthenticatedRequest, checkBranchAccess, checkDepartmentAccess } from '../auth/authMiddleware.js';
import { StorageService } from '../storage/StorageService.js';
import {
  AuditAction,
  DocumentRecord,
  DocumentStatus,
  DocumentVersion,
  DocumentVerification,
  RejectionReasonCode,
  UserRole,
} from '../types/index.js';

export class DocumentController {
  public static async listDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const user = req.user!;
    let docs = db.getDocuments();

    // Enforce branch tenancy isolation
    if (user.role === UserRole.BRANCH_MANAGER && user.branchId) {
      docs = docs.filter((d) => d.branchId === user.branchId);
    } else if (user.role === UserRole.DEPARTMENT_USER && user.branchId && user.departmentId) {
      docs = docs.filter((d) => d.branchId === user.branchId && d.departmentId === user.departmentId);
    }

    // Query parameters
    const { status, branchId, departmentId, employeeId, search, expiringDays, category, page = '1', limit = '20' } = req.query;

    if (status) {
      docs = docs.filter((d) => d.status === status);
    }
    if (branchId && checkBranchAccess(user, branchId as string)) {
      docs = docs.filter((d) => d.branchId === branchId);
    }
    if (departmentId && checkDepartmentAccess(user, departmentId as string)) {
      docs = docs.filter((d) => d.departmentId === departmentId);
    }
    if (employeeId) {
      docs = docs.filter((d) => d.employeeId === employeeId);
    }
    if (category) {
      docs = docs.filter((d) => d.category === category);
    }

    if (expiringDays) {
      const days = Number(expiringDays);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetIso = targetDate.toISOString().split('T')[0];
      const todayIso = new Date().toISOString().split('T')[0];

      docs = docs.filter(
        (d) => d.expiryDate && d.expiryDate >= todayIso && d.expiryDate <= targetIso
      );
    }

    if (search) {
      const q = (search as string).toLowerCase().trim();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.documentNumber.toLowerCase().includes(q) ||
          (d.employeeName && d.employeeName.toLowerCase().includes(q)) ||
          (d.employeeNumber && d.employeeNumber.toLowerCase().includes(q)) ||
          d.branchName.toLowerCase().includes(q) ||
          d.departmentName.toLowerCase().includes(q) ||
          d.requirementName.toLowerCase().includes(q)
      );
    }

    // Sort by updated timestamp desc
    docs.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

    const total = docs.length;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedDocs = docs.slice(startIndex, startIndex + limitNum);

    res.json({
      documents: paginatedDocs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  }

  public static async getDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;
    const db = Database.getInstance();
    const doc = db.getDocuments().find((d) => d.id === id);

    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (!checkBranchAccess(user, doc.branchId)) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view documents from this branch.' });
      return;
    }
    if (!checkDepartmentAccess(user, doc.departmentId)) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view documents from this department.' });
      return;
    }

    const versions = db.getDocumentVersions().filter((v) => v.documentId === doc.id);
    const verifications = db.getVerifications().filter((v) => v.documentId === doc.id);
    const requirement = db.getRequirements().find((r) => r.id === doc.requirementId);

    res.json({
      document: doc,
      versions,
      verifications,
      requirement,
    });
  }

  // Upload a brand new document record or initial version
  public static async uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file was uploaded.' });
      return;
    }

    const { requirementId, branchId, departmentId, employeeId, expiryDate, issueDate, notes } = req.body;

    if (!requirementId || !branchId || !departmentId) {
      res.status(400).json({ error: 'requirementId, branchId, and departmentId are required.' });
      return;
    }

    if (!checkBranchAccess(user, branchId)) {
      res.status(403).json({ error: 'Forbidden: Cannot upload document for another branch.' });
      return;
    }
    if (!checkDepartmentAccess(user, departmentId)) {
      res.status(403).json({ error: 'Forbidden: Cannot upload document for another department.' });
      return;
    }

    const db = Database.getInstance();
    const requirement = db.getRequirements().find((r) => r.id === requirementId);
    if (!requirement) {
      res.status(400).json({ error: 'Invalid requirement ID.' });
      return;
    }

    const branch = db.getBranches().find((b) => b.id === branchId);
    const department = db.getDepartments().find((d) => d.id === departmentId);
    const employee = employeeId ? db.getEmployees().find((e) => e.id === employeeId) : null;

    // Save file to storage abstraction
    const storageService = StorageService.getInstance();
    const saved = await storageService.saveFile(file.buffer, file.originalname, file.mimetype);

    // Check if an existing NOT_UPLOADED document record already exists for this employee + requirement
    let docRecord = db.getDocuments().find(
      (d) => d.requirementId === requirementId && d.employeeId === (employeeId || null) && d.branchId === branchId
    );

    const isNewRecord = !docRecord;
    const nowIso = new Date().toISOString();

    if (!docRecord) {
      const docCount = db.getDocuments().length + 1000;
      const branchCode = branch ? branch.code.split('-')[1] || 'BR' : 'BR';
      const docNumber = `PRT-DOC-${branchCode}-${docCount}`;
      const title = employee ? `${requirement.name} — ${employee.fullName}` : `${requirement.name} — ${department?.name}`;

      docRecord = {
        id: 'doc_' + Date.now().toString(36),
        documentNumber: docNumber,
        title,
        requirementId: requirement.id,
        requirementName: requirement.name,
        category: requirement.category,
        branchId,
        branchName: branch ? branch.name : branchId,
        departmentId,
        departmentName: department ? department.name : departmentId,
        employeeId: employee ? employee.id : null,
        employeeName: employee ? employee.fullName : null,
        employeeNumber: employee ? employee.employeeNumber : null,
        status: DocumentStatus.PENDING_VERIFICATION, // Always PENDING_VERIFICATION on upload!
        currentVersionId: null,
        currentVersionNumber: 1,
        expiryDate: expiryDate || null,
        issueDate: issueDate || nowIso.split('T')[0],
        createdById: user.id,
        createdByName: user.name,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.getDocuments().push(docRecord);
    } else {
      docRecord.status = DocumentStatus.PENDING_VERIFICATION;
      docRecord.currentVersionNumber = (docRecord.currentVersionNumber || 0) + 1;
      docRecord.expiryDate = expiryDate || docRecord.expiryDate;
      docRecord.issueDate = issueDate || docRecord.issueDate;
      docRecord.updatedAt = nowIso;
    }

    const versionId = 'ver_' + Date.now().toString(36);
    const newVersion: DocumentVersion = {
      id: versionId,
      documentId: docRecord.id,
      versionNumber: docRecord.currentVersionNumber,
      storageKey: saved.storageKey,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: saved.fileSize,
      checksum: saved.checksum,
      uploadedById: user.id,
      uploadedByName: user.name,
      uploadedAt: nowIso,
      notes: notes || `Uploaded ${file.originalname}`,
      ocrText: `PORATHA CORPORATION - ${requirement.name} - ${employee ? employee.fullName : ''} - ${docRecord.documentNumber}`,
    };

    db.getDocumentVersions().push(newVersion);
    docRecord.currentVersionId = versionId;
    db.saveDatabase();

    // Audit log
    db.addAuditLog({
      id: 'audit_' + Date.now(),
      timestamp: nowIso,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userBranchId: user.branchId,
      action: AuditAction.DOCUMENT_UPLOADED,
      entity: 'Document',
      entityId: docRecord.id,
      details: `Uploaded Version ${newVersion.versionNumber} of ${docRecord.title} (${docRecord.documentNumber}). Status set to PENDING_VERIFICATION.`,
      newValue: { status: DocumentStatus.PENDING_VERIFICATION, version: newVersion.versionNumber },
    });

    // Notify Head Office
    db.addNotification({
      id: 'notif_' + Date.now(),
      targetRole: UserRole.HEAD_OFFICE_ADMIN,
      title: 'New Document Awaiting Verification',
      message: `${user.name} from ${branch?.name || 'Branch'} uploaded ${docRecord.title} (${docRecord.documentNumber}).`,
      type: 'INFO',
      documentId: docRecord.id,
      isRead: false,
      createdAt: nowIso,
    });

    res.status(201).json({
      document: docRecord,
      version: newVersion,
      message: 'Document uploaded successfully. Status is now PENDING VERIFICATION.',
    });
  }

  // Upload replacement version for an existing document (e.g. after REJECTED or EXPIRED)
  public static async uploadReplacementVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No replacement file was uploaded.' });
      return;
    }

    const db = Database.getInstance();
    const doc = db.getDocuments().find((d) => d.id === id);

    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (!checkBranchAccess(user, doc.branchId)) {
      res.status(403).json({ error: 'Access denied: You cannot upload replacement for another branch.' });
      return;
    }
    if (!checkDepartmentAccess(user, doc.departmentId)) {
      res.status(403).json({ error: 'Access denied: You cannot upload replacement for another department.' });
      return;
    }

    const { expiryDate, issueDate, notes } = req.body;
    const storageService = StorageService.getInstance();
    const saved = await storageService.saveFile(file.buffer, file.originalname, file.mimetype);

    const nowIso = new Date().toISOString();
    const newVersionNumber = (doc.currentVersionNumber || 0) + 1;
    const versionId = 'ver_' + Date.now().toString(36);

    const newVersion: DocumentVersion = {
      id: versionId,
      documentId: doc.id,
      versionNumber: newVersionNumber,
      storageKey: saved.storageKey,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: saved.fileSize,
      checksum: saved.checksum,
      uploadedById: user.id,
      uploadedByName: user.name,
      uploadedAt: nowIso,
      notes: notes || `Replacement Version ${newVersionNumber} uploaded to address previous review feedback.`,
      ocrText: `PORATHA CORPORATION - ${doc.requirementName} - ${doc.employeeName || ''} - ${doc.documentNumber} - V${newVersionNumber}`,
    };

    db.getDocumentVersions().push(newVersion);

    const previousStatus = doc.status;
    doc.status = DocumentStatus.PENDING_VERIFICATION; // CRITICAL: Reset to PENDING_VERIFICATION!
    doc.currentVersionId = versionId;
    doc.currentVersionNumber = newVersionNumber;
    if (expiryDate) doc.expiryDate = expiryDate;
    if (issueDate) doc.issueDate = issueDate;
    doc.lastRejectionReason = null;
    doc.lastRejectionComments = null;
    doc.updatedAt = nowIso;

    db.saveDatabase();

    // Audit log
    db.addAuditLog({
      id: 'audit_' + Date.now(),
      timestamp: nowIso,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userBranchId: user.branchId,
      action: AuditAction.DOCUMENT_REPLACED,
      entity: 'Document',
      entityId: doc.id,
      details: `Uploaded replacement Version ${newVersionNumber} for ${doc.documentNumber} (${doc.title}). Status reset from ${previousStatus} to PENDING_VERIFICATION.`,
      previousValue: { status: previousStatus, version: newVersionNumber - 1 },
      newValue: { status: DocumentStatus.PENDING_VERIFICATION, version: newVersionNumber },
    });

    // Notify Head Office Admin
    db.addNotification({
      id: 'notif_' + Date.now(),
      targetRole: UserRole.HEAD_OFFICE_ADMIN,
      title: `Replacement Uploaded: ${doc.title}`,
      message: `${user.name} from ${doc.branchName} uploaded Version ${newVersionNumber} for review (${doc.documentNumber}).`,
      type: 'INFO',
      documentId: doc.id,
      isRead: false,
      createdAt: nowIso,
    });

    res.status(201).json({
      document: doc,
      version: newVersion,
      message: `Replacement Version ${newVersionNumber} submitted successfully. Status is now PENDING VERIFICATION.`,
    });
  }

  // Head Office Review: Verify
  public static async verifyDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { comments } = req.body;
    const user = req.user!;

    // Verification restricted to Super Admin and Head Office Admin!
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.HEAD_OFFICE_ADMIN) {
      res.status(403).json({
        error: 'Forbidden: Only Head Office Document Controllers and Super Admins have verification authority.',
      });
      return;
    }

    const db = Database.getInstance();
    const doc = db.getDocuments().find((d) => d.id === id);

    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (!doc.currentVersionId) {
      res.status(400).json({ error: 'Cannot verify a document with no uploaded files.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const previousStatus = doc.status;

    doc.status = DocumentStatus.VERIFIED;
    doc.lastVerifiedAt = nowIso;
    doc.lastVerifiedById = user.id;
    doc.lastVerifiedByName = user.name;
    doc.lastRejectionReason = null;
    doc.lastRejectionComments = null;
    doc.updatedAt = nowIso;

    // Record verification log
    const verificationRecord: DocumentVerification = {
      id: 'vrec_' + Date.now().toString(36),
      documentId: doc.id,
      documentVersionId: doc.currentVersionId,
      action: 'VERIFIED',
      verifiedById: user.id,
      verifiedByName: user.name,
      comments: comments || 'Verified and approved by Head Office Document Control.',
      createdAt: nowIso,
    };
    db.getVerifications().push(verificationRecord);

    db.saveDatabase();

    // Audit log
    db.addAuditLog({
      id: 'audit_' + Date.now(),
      timestamp: nowIso,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: AuditAction.DOCUMENT_VERIFIED,
      entity: 'Document',
      entityId: doc.id,
      details: `Head Office verified Document ${doc.documentNumber} (${doc.title}) Version ${doc.currentVersionNumber}. Comments: ${comments || 'Approved'}`,
      previousValue: { status: previousStatus },
      newValue: { status: DocumentStatus.VERIFIED, verifiedBy: user.name },
    });

    // Notify Branch
    db.addNotification({
      id: 'notif_' + Date.now(),
      targetRole: UserRole.BRANCH_MANAGER,
      targetBranchId: doc.branchId,
      title: `Document Verified: ${doc.title}`,
      message: `Document ${doc.documentNumber} Version ${doc.currentVersionNumber} has been VERIFIED by Head Office (${user.name}).`,
      type: 'SUCCESS',
      documentId: doc.id,
      isRead: false,
      createdAt: nowIso,
    });

    res.json({
      document: doc,
      verification: verificationRecord,
      message: 'Document successfully verified and marked as VERIFIED.',
    });
  }

  // Head Office Review: Reject
  public static async rejectDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { reasonCode, comments } = req.body;
    const user = req.user!;

    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.HEAD_OFFICE_ADMIN) {
      res.status(403).json({
        error: 'Forbidden: Only Head Office Document Controllers and Super Admins have rejection authority.',
      });
      return;
    }

    if (!reasonCode) {
      res.status(400).json({ error: 'Rejection reason code is mandatory.' });
      return;
    }

    const db = Database.getInstance();
    const doc = db.getDocuments().find((d) => d.id === id);

    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const previousStatus = doc.status;

    doc.status = DocumentStatus.REJECTED;
    doc.lastRejectionReason = reasonCode;
    doc.lastRejectionComments = comments || `Rejected due to ${reasonCode}`;
    doc.updatedAt = nowIso;

    const verificationRecord: DocumentVerification = {
      id: 'vrec_' + Date.now().toString(36),
      documentId: doc.id,
      documentVersionId: doc.currentVersionId || '',
      action: 'REJECTED',
      verifiedById: user.id,
      verifiedByName: user.name,
      reasonCode: reasonCode as RejectionReasonCode,
      reasonText: comments || reasonCode,
      comments: comments || reasonCode,
      createdAt: nowIso,
    };
    db.getVerifications().push(verificationRecord);

    db.saveDatabase();

    // Audit log
    db.addAuditLog({
      id: 'audit_' + Date.now(),
      timestamp: nowIso,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: AuditAction.DOCUMENT_REJECTED,
      entity: 'Document',
      entityId: doc.id,
      details: `Head Office rejected Document ${doc.documentNumber} (${doc.title}). Reason: ${reasonCode}. Comments: ${comments || 'None'}`,
      previousValue: { status: previousStatus },
      newValue: { status: DocumentStatus.REJECTED, reasonCode, comments },
    });

    // Notify Branch with urgent Action Required!
    db.addNotification({
      id: 'notif_' + Date.now(),
      targetRole: UserRole.BRANCH_MANAGER,
      targetBranchId: doc.branchId,
      title: `ACTION REQUIRED: Document Rejected (${doc.documentNumber})`,
      message: `${doc.title} was rejected by Head Office. Reason: ${reasonCode}. Please upload a replacement version.`,
      type: 'ERROR',
      documentId: doc.id,
      isRead: false,
      createdAt: nowIso,
    });

    res.json({
      document: doc,
      verification: verificationRecord,
      message: 'Document rejected. Branch notification dispatched.',
    });
  }

  // Bulk verify multiple documents
  public static async bulkVerify(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { documentIds, comments } = req.body;
    const user = req.user!;

    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.HEAD_OFFICE_ADMIN) {
      res.status(403).json({ error: 'Forbidden: Insufficient verification privileges.' });
      return;
    }

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      res.status(400).json({ error: 'documentIds array is required.' });
      return;
    }

    const db = Database.getInstance();
    const verifiedDocs: DocumentRecord[] = [];
    const nowIso = new Date().toISOString();

    documentIds.forEach((docId) => {
      const doc = db.getDocuments().find((d) => d.id === docId);
      if (doc && doc.currentVersionId && doc.status === DocumentStatus.PENDING_VERIFICATION) {
        doc.status = DocumentStatus.VERIFIED;
        doc.lastVerifiedAt = nowIso;
        doc.lastVerifiedById = user.id;
        doc.lastVerifiedByName = user.name;
        doc.lastRejectionReason = null;
        doc.lastRejectionComments = null;
        doc.updatedAt = nowIso;

        db.getVerifications().push({
          id: 'vrec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5),
          documentId: doc.id,
          documentVersionId: doc.currentVersionId,
          action: 'VERIFIED',
          verifiedById: user.id,
          verifiedByName: user.name,
          comments: comments || 'Batch verified by Head Office Review Queue.',
          createdAt: nowIso,
        });

        db.addAuditLog({
          id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          timestamp: nowIso,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: AuditAction.DOCUMENT_VERIFIED,
          entity: 'Document',
          entityId: doc.id,
          details: `Batch verified Document ${doc.documentNumber} (${doc.title})`,
          newValue: { status: DocumentStatus.VERIFIED },
        });

        verifiedDocs.push(doc);
      }
    });

    db.saveDatabase();

    res.json({
      verifiedCount: verifiedDocs.length,
      documents: verifiedDocs,
      message: `Successfully batch-verified ${verifiedDocs.length} documents.`,
    });
  }

  // Stream/Preview or Download file with authorization
  public static async getFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id, versionId } = req.params;
    const isDownload = req.query.download === 'true';
    const user = req.user!;

    const db = Database.getInstance();
    const doc = db.getDocuments().find((d) => d.id === id);

    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (!checkBranchAccess(user, doc.branchId)) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view this document.' });
      return;
    }
    if (!checkDepartmentAccess(user, doc.departmentId)) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view this document.' });
      return;
    }

    const version = db.getDocumentVersions().find((v) => v.id === versionId && v.documentId === doc.id);

    if (!version) {
      res.status(404).json({ error: 'Document version not found.' });
      return;
    }

    const storage = StorageService.getInstance();
    const exists = await storage.fileExists(version.storageKey);

    if (!exists) {
      // Fallback: return sample simulated buffer if physical file was cleared
      const samplePdfBuffer = Buffer.from(
        `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length 120>>stream\nBT /F1 18 Tf 50 700 Td (PORATHA CORPORATION - OFFICIAL VERIFIED ARCHIVE) Tj 0 -30 Td (${doc.title}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n352\n%%EOF`
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', isDownload ? `attachment; filename="${version.originalFilename}"` : 'inline');
      res.send(samplePdfBuffer);
      return;
    }

    // Audit download
    if (isDownload) {
      db.addAuditLog({
        id: 'audit_' + Date.now(),
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: AuditAction.DOCUMENT_DOWNLOADED,
        entity: 'Document',
        entityId: doc.id,
        details: `User downloaded ${version.originalFilename} (Version ${version.versionNumber})`,
      });
    }

    res.setHeader('Content-Type', version.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      isDownload ? `attachment; filename="${version.originalFilename}"` : 'inline'
    );
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const stream = storage.getFileStream(version.storageKey);
    stream.pipe(res);
  }
}
