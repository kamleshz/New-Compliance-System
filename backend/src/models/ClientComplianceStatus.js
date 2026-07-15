import mongoose from 'mongoose';

const complianceStatusRowSchema = new mongoose.Schema({
  sr: { type: Number, required: true },
  complianceStatus: { type: String, required: true },
  status: {
    type: String,
    enum: ['', 'Complete', 'pending', 'Partailly Complete'],
    default: '',
  },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  userRemarks: { type: [String], default: [] },
  managerRemarks: { type: [String], default: [] },
  complianceRemarks: { type: [String], default: [] },
}, { _id: false });

const financialYearComplianceSchema = new mongoose.Schema({
  rows: { type: [complianceStatusRowSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const clientComplianceStatusSchema = new mongoose.Schema({
  ccpClientId: { type: String, required: true, unique: true, index: true },
  rows: { type: [complianceStatusRowSchema], default: [] },
  financialYears: { type: Map, of: financialYearComplianceSchema, default: {} },
  activeFinancialYear: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.ClientComplianceStatus
  || mongoose.model('ClientComplianceStatus', clientComplianceStatusSchema);
