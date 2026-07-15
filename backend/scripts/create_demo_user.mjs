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

const email = 'demo.admin@compliance.local';
const employeeCode = 'EMP999';
const passwordPlain = 'Demo@12345';
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
  password: passwordPlain,
  role: role.roleName,
  userId: String(user._id),
}));

await mongoose.disconnect();
