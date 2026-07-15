import AuditLog from '../models/AuditLog.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().populate('userId', 'name email').sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (error) {
    next(error);
  }
};
