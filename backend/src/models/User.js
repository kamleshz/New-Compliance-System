import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  normalizedName: { type: String, index: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  mobile: { type: String },
  password: { type: String, required: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  teamName: { type: String },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  operationHeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  designation: { type: String },
  avatar: { type: String },
  avatarUrl: { type: String },
  ccpUserId: { type: String },
  lastCcpSyncAt: { type: Date },
  ccpSyncError: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
