import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Role from '../src/models/Role.js';
import Department from '../src/models/Department.js';
import User from '../src/models/User.js';

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Missing Mongo URI');
}

await mongoose.connect(uri);

let role = await Role.findOne({ roleName: 'Admin' });
if (!role) role = await Role.findOne({ roleName: 'Manager' });
if (!role) {
  throw new Error('No Admin or Manager role found');
}

let department = await Department.findOne({ departmentName: 'Compliance' });
if (!department) {
  department = await Department.create({
    departmentName: 'Compliance',
    description: 'Compliance department',
  });
}

const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
const employeeCode = process.env.BOOTSTRAP_ADMIN_EMPLOYEE_CODE || 'EMP999';
const passwordPlain = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!email || !passwordPlain) {
  throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD before running this script');
}
const password = await bcrypt.hash(passwordPlain, 10);

const user = await User.findOneAndUpdate(
  { email },
  {
    $set: {
      employeeCode,
      name: 'Demo Admin',
      normalizedName: 'demo admin',
      email,
      mobile: '+910000000000',
      password,
      roleId: role._id,
      departmentId: department._id,
      designation: 'Demo Administrator',
      status: 'active',
      isActive: true,
    },
  },
  { new: true, upsert: true, setDefaultsOnInsert: true },
);

console.log(JSON.stringify({
  ok: true,
  email,
  role: role.roleName,
  userId: String(user._id),
}));

await mongoose.disconnect();
