import bcrypt from 'bcryptjs';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import Department from '../models/Department.js';
import User from '../models/User.js';

const defaultPermissions = [
  { module: 'Dashboard', actions: ['read'] },
  { module: 'User Management', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'Roles', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'Permissions', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'Departments', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'Compliance', actions: ['create', 'read', 'update', 'delete', 'approve'] },
  { module: 'Reports', actions: ['read'] },
  { module: 'Notifications', actions: ['read'] },
  { module: 'Settings', actions: ['read'] },
];

const defaultRoles = [
  'Admin',
  'Operation',
  'Manager',
  'Compliance',
  'Account',
  'Super Admin',
];

export const seedDatabase = async () => {
  try {
    const existingPermissions = await Permission.countDocuments();
    let permissionDocs = [];

    if (!existingPermissions) {
      permissionDocs = await Permission.insertMany(defaultPermissions);
      console.log('Seeded default permissions');
    } else {
      permissionDocs = await Permission.find();
    }

    let adminRole;
    for (const roleName of defaultRoles) {
      const role = await Role.findOneAndUpdate(
        { roleName },
        {
          $setOnInsert: {
            roleName,
            description: roleName === 'Admin'
              ? 'Full system administrator with all permissions'
              : `${roleName} access role`,
            permissions: permissionDocs.map((permission) => permission._id),
          },
        },
        { new: true, upsert: true }
      );
      if (roleName === 'Admin') adminRole = role;
    }
    console.log('Seeded default roles');

    let complianceDepartment = await Department.findOne({ departmentName: 'Compliance' });
    if (!complianceDepartment) {
      complianceDepartment = await Department.create({
        departmentName: 'Compliance',
        description: 'Compliance and risk management department',
      });
      console.log('Seeded compliance department');
    }

    const existingAdmin = await User.findOne({ email: 'admin@company.com' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Passw0rd!', 10);
      await User.create({
        employeeCode: 'EMP001',
        name: 'System Admin',
        email: 'admin@company.com',
        mobile: '+1234567890',
        password: hashedPassword,
        roleId: adminRole._id,
        departmentId: complianceDepartment._id,
        designation: 'Compliance Administrator',
        isActive: true,
      });
      console.log('Seeded default admin user: admin@company.com / Passw0rd!');
    }
  } catch (error) {
    console.error('Seed database error:', error.message);
  }
};
