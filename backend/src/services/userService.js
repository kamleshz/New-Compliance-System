import User from '../models/User.js';
import Department from '../models/Department.js';
import { hashPassword } from './authService.js';
import { syncUserToCcp } from './ccpUserSyncService.js';

export const normalizeName = (value = '') => String(value).trim().replace(/\s+/g, ' ');
export const normalizeNameKey = (value = '') => normalizeName(value).toLowerCase();
const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

export const fetchUsers = async (query = {}, options = {}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const skip = (page - 1) * limit;
  const filter = {};

  if (query.search) {
    filter.$or = [
      { name: new RegExp(query.search, 'i') },
      { email: new RegExp(query.search, 'i') },
      { employeeCode: new RegExp(query.search, 'i') }
    ];
  }

  if (query.roleId) filter.roleId = query.roleId;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate('roleId departmentId teamId managerId operationHeadId')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

export const createUser = async (data) => {
  const payload = await buildUserPayload(data, { creating: true });
  const existingEmail = await User.findOne({ email: payload.email }).lean();
  if (existingEmail) {
    const error = new Error('Email already exists.');
    error.status = 409;
    throw error;
  }

  const user = await User.create(payload);
  await syncAndStampUser(user._id);
  return getUserById(user._id);
};

export const getUserById = async (id) => {
  return User.findById(id).populate('roleId departmentId teamId managerId operationHeadId');
};

export const updateUser = async (id, data) => {
  const payload = await buildUserPayload(data, { creating: false, userId: id });
  if (payload.email) {
    const existingEmail = await User.findOne({ email: payload.email, _id: { $ne: id } }).lean();
    if (existingEmail) {
      const error = new Error('Email already exists.');
      error.status = 409;
      throw error;
    }
  }

  const user = await User.findByIdAndUpdate(id, payload, { new: true }).populate('roleId departmentId teamId managerId operationHeadId');
  if (user) await syncAndStampUser(user._id);
  return getUserById(id);
};

export const deleteUser = async (id) => {
  return User.findByIdAndDelete(id);
};

export const getTeamUserIdsForOperationHead = async (operationHeadId) => {
  const teams = await Department.find({
    $or: [
      { operationHead: operationHeadId },
      { operationHeads: operationHeadId },
    ],
  }).select('_id members manager operationHead operationHeads').lean();
  const ids = new Set([String(operationHeadId)]);
  teams.forEach((team) => {
    if (team.manager) ids.add(String(team.manager));
    if (team.operationHead) ids.add(String(team.operationHead));
    (team.operationHeads || []).forEach((headId) => ids.add(String(headId)));
    (team.members || []).forEach((memberId) => ids.add(String(memberId)));
  });
  return [...ids];
};

export const getTeamUserIdsForManager = async (managerId) => {
  const [teams, directReports] = await Promise.all([
    Department.find({ manager: managerId }).select('_id members manager operationHead').lean(),
    User.find({ managerId }).select('_id').lean(),
  ]);
  const ids = new Set([String(managerId)]);

  directReports.forEach((user) => ids.add(String(user._id)));
  teams.forEach((team) => {
    if (team.manager) ids.add(String(team.manager));
    (team.members || []).forEach((memberId) => ids.add(String(memberId)));
  });

  return [...ids];
};

async function buildUserPayload(data, { creating, userId } = {}) {
  const payload = { ...data };
  if (payload.name !== undefined) {
    payload.name = normalizeName(payload.name);
    payload.normalizedName = normalizeNameKey(payload.name);
  }
  if (!payload.name && creating) throwValidation('Name is required.');
  if (payload.email !== undefined) payload.email = normalizeEmail(payload.email);
  if (!payload.email && creating) throwValidation('Email is required.');
  if (!payload.roleId && creating) throwValidation('Role is required.');
  if (!payload.teamId && payload.departmentId) payload.teamId = payload.departmentId;
  if (!payload.departmentId && payload.teamId) payload.departmentId = payload.teamId;
  if (payload.status) {
    payload.isActive = payload.status === 'active';
  } else if (payload.isActive !== undefined) {
    payload.status = payload.isActive ? 'active' : 'inactive';
  }
  if (payload.avatarUrl && !payload.avatar) payload.avatar = payload.avatarUrl;
  if (payload.avatar && !payload.avatarUrl) payload.avatarUrl = payload.avatar;

  const teamId = payload.teamId || payload.departmentId;
  if (teamId) {
    const team = await Department.findById(teamId).lean();
    if (!team) throwValidation('Selected team was not found.');
    payload.teamId = team._id;
    payload.departmentId = team._id;
    payload.teamName = team.departmentName;
    payload.managerId = payload.managerId || team.manager;
    payload.operationHeadId = payload.operationHeadId || team.operationHead;
  }

  if (!payload.password) {
    delete payload.password;
    if (creating) throwValidation('Password is required for a new user.');
  } else {
    payload.password = await hashPassword(payload.password);
  }

  delete payload.firstName;
  delete payload.lastName;
  if (!creating && !userId) delete payload.employeeCode;
  return payload;
}

async function syncAndStampUser(userId) {
  const user = await User.findById(userId).populate('roleId departmentId teamId managerId operationHeadId');
  if (!user) return;
  try {
    const result = await syncUserToCcp(user);
    if (!result.skipped) {
      user.ccpUserId = result.userId || result.id || result._id || user.ccpUserId;
      user.lastCcpSyncAt = new Date();
      user.ccpSyncError = '';
      await user.save();
    }
  } catch (error) {
    user.ccpSyncError = error.message;
    await user.save();
  }
}

function throwValidation(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}
