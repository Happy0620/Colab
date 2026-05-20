import express from 'express';
import Notification from '../models/Notification';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get notifications
router.get('/', authenticateToken, async (req: AuthRequest, res: any) => {
  try {
    let query: any = {};
    if (req.user.role === 'admin') {
      query.isAdmin = true;
    } else {
      query.userId = req.user.id;
      query.isAdmin = false;
    }
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all as read
router.patch('/read-all', authenticateToken, async (req: AuthRequest, res: any) => {
  try {
    let query: any = { read: false };
    if (req.user.role === 'admin') {
      query.isAdmin = true;
    } else {
      query.userId = req.user.id;
      query.isAdmin = false;
    }
    await Notification.updateMany(query, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Mark a specific notification as read
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: any) => {
  try {
    let query: any = { _id: req.params.id };
    if (req.user.role === 'admin') {
      query.isAdmin = true;
    } else {
      query.userId = req.user.id;
    }
    const notification = await Notification.findOneAndUpdate(
      query,
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
