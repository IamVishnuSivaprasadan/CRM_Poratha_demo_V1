import { Response } from 'express';
import { Database } from '../db/database.js';
import { AuthenticatedRequest } from '../auth/authMiddleware.js';
import { UserRole } from '../types/index.js';

export class NotificationController {
  public static async listNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const db = Database.getInstance();
    const allNotifs = db.getNotifications();

    // Filter notifications relevant to current user
    const filtered = allNotifs.filter((n) => {
      if (n.userId && n.userId === user.id) return true;
      if (n.targetRole && n.targetRole === user.role) {
        if (n.targetBranchId && user.branchId) {
          return n.targetBranchId === user.branchId;
        }
        return true;
      }
      if (user.role === UserRole.SUPER_ADMIN) return true;
      return false;
    });

    const unreadCount = filtered.filter((n) => !n.isRead).length;

    res.json({
      notifications: filtered.slice(0, 50),
      unreadCount,
    });
  }

  public static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const db = Database.getInstance();
    const notif = db.getNotifications().find((n) => n.id === id);

    if (notif) {
      notif.isRead = true;
      db.saveDatabase();
    }

    res.json({ success: true });
  }

  public static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const db = Database.getInstance();

    db.getNotifications().forEach((n) => {
      if (n.userId === user.id || n.targetRole === user.role || user.role === UserRole.SUPER_ADMIN) {
        n.isRead = true;
      }
    });

    db.saveDatabase();
    res.json({ success: true, message: 'All notifications marked as read.' });
  }
}
