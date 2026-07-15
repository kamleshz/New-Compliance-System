import Notification from '../models/Notification.js';

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user?.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const unreadCount = await Notification.countDocuments({ recipientId: req.user?.id, isRead: false });
    res.json({ ok: true, notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user?.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, recipientId: req.user?.id },
      { $set: { isRead: true, readAt: new Date() } },
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};
