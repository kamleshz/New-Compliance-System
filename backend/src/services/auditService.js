import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({ userId, action, module, oldData, newData, ipAddress }) => {
  return AuditLog.create({ userId, action, module, oldData, newData, ipAddress });
};
