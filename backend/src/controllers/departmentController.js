import Department from '../models/Department.js';
import User from '../models/User.js';
import { normalizeName, normalizeNameKey } from '../services/userService.js';

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate('manager operationHead members createdBy', 'name email roleId avatarUrl')
      .sort({ departmentName: 1 });
    res.json(departments);
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    if (!(await canManageTeams(req.user?.id))) return res.status(403).json({ message: 'Only Admin or Super Admin can create teams.' });
    const payload = await buildDepartmentPayload(req.body, req.user?.id);
    const existing = await Department.findOne({ normalizedName: payload.normalizedName }).lean();
    if (existing) return res.status(409).json({ message: 'Team name already exists.' });

    const department = await Department.create(payload);
    await applyTeamToUsers(department);
    const populated = await Department.findById(department._id).populate('manager operationHead members createdBy', 'name email roleId avatarUrl');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    if (!(await canManageTeams(req.user?.id))) return res.status(403).json({ message: 'Only Admin or Super Admin can update teams.' });
    const payload = await buildDepartmentPayload(req.body, req.user?.id, { updating: true });
    if (payload.normalizedName) {
      const existing = await Department.findOne({ normalizedName: payload.normalizedName, _id: { $ne: req.params.id } }).lean();
      if (existing) return res.status(409).json({ message: 'Team name already exists.' });
    }

    const department = await Department.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    await applyTeamToUsers(department);
    const populated = await Department.findById(department._id).populate('manager operationHead members createdBy', 'name email roleId avatarUrl');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department deleted' });
  } catch (error) {
    next(error);
  }
};

async function buildDepartmentPayload(data, createdBy, { updating = false } = {}) {
  const departmentName = normalizeName(data.departmentName || data.teamName);
  if (!departmentName && !updating) throwValidation('Team name is required.');
  if (!data.manager && !data.managerId && !updating) throwValidation('Manager is required.');
  if (!data.operationHead && !data.operationHeadId && !updating) throwValidation('Operation head is required.');

  const memberIds = normalizeMembers(data.members || data.memberIds, data.manager || data.managerId, data.operationHead || data.operationHeadId);
  if (!memberIds.length && !updating) throwValidation('At least one member is required.');

  const payload = {
    description: data.description || '',
  };

  if (departmentName) {
    payload.departmentName = departmentName;
    payload.normalizedName = normalizeNameKey(departmentName);
  }
  if (data.manager || data.managerId) payload.manager = data.manager || data.managerId;
  if (data.operationHead || data.operationHeadId) payload.operationHead = data.operationHead || data.operationHeadId;
  if (memberIds.length) payload.members = memberIds;
  if (createdBy && !updating) payload.createdBy = createdBy;
  return payload;
}

function normalizeMembers(members = [], managerId, operationHeadId) {
  const ids = new Set();
  const add = (value) => {
    const id = value?._id || value?.id || value;
    if (id) ids.add(String(id));
  };
  (Array.isArray(members) ? members : [members]).forEach(add);
  add(managerId);
  add(operationHeadId);
  return [...ids];
}

async function applyTeamToUsers(team) {
  const memberIds = normalizeMembers(team.members, team.manager, team.operationHead);
  await User.updateMany(
    { _id: { $in: memberIds } },
    {
      $set: {
        departmentId: team._id,
        teamId: team._id,
        teamName: team.departmentName,
        managerId: team.manager,
        operationHeadId: team.operationHead,
      },
    },
  );
}

function throwValidation(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

async function canManageTeams(userId) {
  const user = await User.findById(userId).populate('roleId').lean();
  const roleName = String(user?.roleId?.roleName || '').toLowerCase();
  return roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin';
}
