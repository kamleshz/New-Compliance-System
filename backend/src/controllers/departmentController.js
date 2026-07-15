import Department from '../models/Department.js';
import User from '../models/User.js';
import { normalizeName, normalizeNameKey } from '../services/userService.js';
import { normalizeReferenceIds } from '../utils/teamAssignments.js';

const teamPopulate = 'manager operationHead operationHeads members createdBy';

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate(teamPopulate, 'name email roleId avatarUrl')
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
    const populated = await Department.findById(department._id).populate(teamPopulate, 'name email roleId avatarUrl');
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
    const populated = await Department.findById(department._id).populate(teamPopulate, 'name email roleId avatarUrl');
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
  const operationHeadIds = normalizeReferenceIds(
    data.operationHeads || data.operationHeadIds,
    data.operationHead || data.operationHeadId,
  );
  if (!operationHeadIds.length && !updating) throwValidation('At least one compliance manager is required.');

  const memberIds = normalizeReferenceIds(data.members || data.memberIds, data.manager || data.managerId, operationHeadIds);
  if (!memberIds.length && !updating) throwValidation('At least one member is required.');

  const payload = {
    description: data.description || '',
  };

  if (departmentName) {
    payload.departmentName = departmentName;
    payload.normalizedName = normalizeNameKey(departmentName);
  }
  if (data.manager || data.managerId) payload.manager = data.manager || data.managerId;
  if (operationHeadIds.length) {
    payload.operationHeads = operationHeadIds;
    payload.operationHead = operationHeadIds[0];
  }
  if (memberIds.length) payload.members = memberIds;
  if (createdBy && !updating) payload.createdBy = createdBy;
  return payload;
}

async function applyTeamToUsers(team) {
  const operationHeadIds = normalizeReferenceIds(team.operationHeads, team.operationHead);
  const memberIds = normalizeReferenceIds(team.members, team.manager, operationHeadIds);
  await User.updateMany(
    { _id: { $in: memberIds } },
    {
      $set: {
        departmentId: team._id,
        teamId: team._id,
        teamName: team.departmentName,
        managerId: team.manager,
        operationHeadId: operationHeadIds[0],
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
