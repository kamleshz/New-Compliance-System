import mongoose from 'mongoose';

const portalImageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dataUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const financialYearPortalAssetSchema = new mongoose.Schema({
  email: { type: String, default: '' },
  images: { type: [portalImageSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const clientPortalAssetSchema = new mongoose.Schema({
  ccpClientId: { type: String, required: true, unique: true, index: true },
  email: { type: String, default: '' },
  images: { type: [portalImageSchema], default: [] },
  financialYears: { type: Map, of: financialYearPortalAssetSchema, default: {} },
  activeFinancialYear: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.ClientPortalAsset
  || mongoose.model('ClientPortalAsset', clientPortalAssetSchema);
