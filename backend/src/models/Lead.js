import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  company: { type: String },
  status: { type: String },
  emails: [{ type: String }],
  mobileNo1: { type: String },
}, { timestamps: true, strict: false });

export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);
