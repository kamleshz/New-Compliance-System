import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  departmentName: { type: String, required: true, unique: true },
  normalizedName: { type: String, unique: true, sparse: true },
  description: { type: String },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  operationHead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Department', departmentSchema);
