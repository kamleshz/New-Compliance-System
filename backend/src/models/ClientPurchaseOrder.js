import mongoose from 'mongoose';

const poUploadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dataUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const paymentProofSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dataUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const paymentSchema = new mongoose.Schema({
  paymentDate: { type: Date, required: true },
  paymentMode: { type: String, enum: ['', 'Bank Transfer', 'NEFT', 'UTR'], default: '' },
  amount: { type: Number, min: 0, required: true },
  tdsAmount: { type: Number, min: 0, default: 0 },
  reference: { type: String, default: '' },
  proofFiles: { type: [paymentProofSchema], default: [] },
  remarks: { type: String, default: '' },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: true, timestamps: true });

const poYearRecordSchema = new mongoose.Schema({
  fyYear: { type: String, required: true },
  poNumber: { type: String, required: true },
  poUpload: { type: poUploadSchema, required: true },
  service: { type: String, trim: true, default: '' },
  services: { type: [{ type: String, trim: true }], default: [] },
  poAmount: { type: Number, min: 0, default: 0 },
  payments: { type: [paymentSchema], default: [] },
  accountsRemarks: { type: String, default: '' },
}, { _id: true });

const specialApprovalFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dataUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const clientPurchaseOrderSchema = new mongoose.Schema({
  ccpClientId: { type: String, required: true, unique: true, index: true },
  poReceived: { type: Boolean, default: true },
  poYearRecords: { type: [poYearRecordSchema], default: [] },
  specialApprovalEmail: { type: String, default: '' },
  specialApprovalFiles: { type: [specialApprovalFileSchema], default: [] },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.ClientPurchaseOrder
  || mongoose.model('ClientPurchaseOrder', clientPurchaseOrderSchema);
