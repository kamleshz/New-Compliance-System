import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  module: { type: String, required: true },
  actions: [{ type: String, enum: ['create', 'read', 'update', 'delete', 'approve'] }],
}, { timestamps: true });

export default mongoose.model('Permission', permissionSchema);
