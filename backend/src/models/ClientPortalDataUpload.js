import mongoose from 'mongoose';

const uploadFileSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  dataUrl: { type: String, default: '' },
  rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
  uploadedAt: { type: Date },
}, { _id: false });

const reviewMessageSchema = new mongoose.Schema({
  decision: { type: String, default: '' },
  message: { type: String, default: '' },
  by: { type: String, default: '' },
  at: { type: Date },
}, { _id: false });

const progressRowSchema = new mongoose.Schema({
  particular: { type: String, default: '' },
  yesNo: { type: String, default: '' },
  date: { type: String, default: '' },
  files: { type: [uploadFileSchema], default: [] },
  remarks: { type: String, default: '' },
}, { _id: false });

const purchaseUploadSchema = new mongoose.Schema({
  baseData: { type: uploadFileSchema, default: () => ({}) },
  portalUpload: { type: uploadFileSchema, default: () => ({}) },
  images: { type: [uploadFileSchema], default: [] },
  progressRows: { type: [progressRowSchema], default: [] },
  gst1aFiles: { type: [uploadFileSchema], default: [] },
  gst2aFiles: { type: [uploadFileSchema], default: [] },
  reusePlanFiles: { type: [uploadFileSchema], default: [] },
  homePageTargetFiles: { type: [uploadFileSchema], default: [] },
  walletFiles: { type: [uploadFileSchema], default: [] },
  creditTransferFiles: { type: [uploadFileSchema], default: [] },
  stateWiseCurrentYearFiles: { type: [uploadFileSchema], default: [] },
  annualConsumptionFiles: { type: [uploadFileSchema], default: [] },
  annualFilingBeforeFiles: { type: [uploadFileSchema], default: [] },
  annualFilingAfterFiles: { type: [uploadFileSchema], default: [] },
  eprCreditSummary: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  remarks: { type: [String], default: [] },
  revisedStartDate: { type: String, default: '' },
  revisedEndDate: { type: String, default: '' },
  managerVerificationStatus: { type: String, default: '' },
  managerReview: { type: String, default: '' },
  managerReviewThread: { type: [reviewMessageSchema], default: [] },
  managerVerifiedAt: { type: Date },
  managerVerifiedBy: { type: String, default: '' },
  complianceVerificationStatus: { type: String, default: '' },
  complianceReview: { type: String, default: '' },
  complianceReviewThread: { type: [reviewMessageSchema], default: [] },
  complianceVerifiedAt: { type: Date },
  complianceVerifiedBy: { type: String, default: '' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  managerNotificationSentAt: { type: Date },
  complianceNotificationSentAt: { type: Date },
}, { _id: false });

const financialYearPortalDataUploadSchema = new mongoose.Schema({
  purchase: { type: purchaseUploadSchema, default: () => ({}) },
  sales: { type: purchaseUploadSchema, default: () => ({}) },
  prePost: { type: purchaseUploadSchema, default: () => ({}) },
  eprTarget: { type: purchaseUploadSchema, default: () => ({}) },
  eprCredit: { type: purchaseUploadSchema, default: () => ({}) },
  gst: { type: purchaseUploadSchema, default: () => ({}) },
  reusePlan: { type: purchaseUploadSchema, default: () => ({}) },
  allScreenshots: { type: purchaseUploadSchema, default: () => ({}) },
  preConsumer: { type: purchaseUploadSchema, default: () => ({}) },
  state: { type: purchaseUploadSchema, default: () => ({}) },
  annualConsumption: { type: purchaseUploadSchema, default: () => ({}) },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const clientPortalDataUploadSchema = new mongoose.Schema({
  ccpClientId: { type: String, required: true, unique: true, index: true },
  purchase: { type: purchaseUploadSchema, default: () => ({}) },
  sales: { type: purchaseUploadSchema, default: () => ({}) },
  prePost: { type: purchaseUploadSchema, default: () => ({}) },
  eprTarget: { type: purchaseUploadSchema, default: () => ({}) },
  eprTargetCalculation: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  eprTargetCalculationUpdatedAt: { type: Date },
  eprTargetCalculationOptions: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  eprCredit: { type: purchaseUploadSchema, default: () => ({}) },
  gst: { type: purchaseUploadSchema, default: () => ({}) },
  reusePlan: { type: purchaseUploadSchema, default: () => ({}) },
  allScreenshots: { type: purchaseUploadSchema, default: () => ({}) },
  preConsumer: { type: purchaseUploadSchema, default: () => ({}) },
  state: { type: purchaseUploadSchema, default: () => ({}) },
  annualConsumption: { type: purchaseUploadSchema, default: () => ({}) },
  financialYears: { type: Map, of: financialYearPortalDataUploadSchema, default: {} },
  activeFinancialYear: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.ClientPortalDataUpload
  || mongoose.model('ClientPortalDataUpload', clientPortalDataUploadSchema);
