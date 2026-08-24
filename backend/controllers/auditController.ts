import { Response } from 'express';
import { Database } from '../db/database.js';
import { AuthenticatedRequest } from '../auth/authMiddleware.js';

export class AuditController {
  public static async listAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    let logs = db.getAuditLogs();
    const { action, userId, entity, search, page = '1', limit = '30' } = req.query;

    if (action) {
      logs = logs.filter((l) => l.action === action);
    }
    if (userId) {
      logs = logs.filter((l) => l.userId === userId);
    }
    if (entity) {
      logs = logs.filter((l) => l.entity === entity);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      logs = logs.filter(
        (l) =>
          l.details.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.entityId.toLowerCase().includes(q)
      );
    }

    const total = logs.length;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
    const paginated = logs.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      logs: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  }
}
