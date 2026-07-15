import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getNotifications);
router.put('/read-all', markAllNotificationsRead);
router.put('/:id/read', markNotificationRead);

export default router;
