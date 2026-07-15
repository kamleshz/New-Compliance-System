import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  module: { type: String, required: true },
  oldData: { type: Object },
  newData: { type: Object },
  ipAddress: { type: String },
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
