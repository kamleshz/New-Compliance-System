import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ccpClientId: { type: String, required: true, index: true },
  financialYear: { type: String, default: '' },
  section: { type: String, default: '' },
  sectionLabel: { type: String, default: '' },
  workflowStage: { type: String, default: '' },
  eventType: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  link: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.Notification
  || mongoose.model('Notification', notificationSchema);
