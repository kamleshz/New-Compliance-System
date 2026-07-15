import mongoose from 'mongoose';
import './Lead.js';

const clientSchema = new mongoose.Schema({
  selectedLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  adminControls: {
    approvalStatus: { type: String, default: 'PENDING' },
    visibilityStatus: { type: String, default: 'LIVE' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  workflowStatus: { type: String, enum: ['draft', 'submitted'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Client || mongoose.model('Client', clientSchema);
