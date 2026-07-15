import mongoose from 'mongoose';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { getTeamUserIdsForOperationHead } from '../services/userService.js';

const clientPopulate = [
  { path: 'selectedLead', select: 'company status emails mobileNo1' },
  { path: 'adminControls.assignedTo', select: 'name email role avatarUrl' },
];

export const getClients = async (req, res, next) => {
  try {
    const filter = await buildClientVisibilityFilter(req.user?.id);
    const clients = await Client.find(filter)
      .sort({ createdAt: -1 })
      .populate(clientPopulate)
      .lean();

    res.json({ ok: true, clients });
  } catch (error) {
    next(error);
  }
};

async function buildClientVisibilityFilter(userId) {
  if (!userId) return {};
  const user = await User.findById(userId).populate('roleId').lean();
  const roleName = String(user?.roleId?.roleName || '').toLowerCase();

  if (roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin') return {};

  if (roleName === 'operation') {
    const teamUserIds = await getTeamUserIdsForOperationHead(userId);
    return {
      $or: [
        { 'adminControls.assignedTo': { $in: teamUserIds } },
        { createdBy: { $in: teamUserIds } },
      ],
    };
  }

  return {
    $or: [
      { 'adminControls.assignedTo': userId },
      { createdBy: userId },
    ],
  };
}

export const getClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate(clientPopulate)
      .lean();

    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ ok: true, client });
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req, res, next) => {
  try {
    const { selectedLead, adminControls, data = {}, workflowStatus = 'draft' } = req.body;
    const assignedTo = normalizeObjectId(adminControls?.assignedTo);

    if (workflowStatus === 'submitted' && !data?.basic?.clientLegalName) {
      return res.status(400).json({ message: 'Client legal name is required before submission' });
    }

    const client = await Client.create({
      selectedLead: normalizeObjectId(selectedLead),
      adminControls: adminControls ? { ...adminControls, assignedTo } : undefined,
      data,
      workflowStatus,
      createdBy: req.user?.id,
    });

    const populatedClient = await Client.findById(client._id)
      .populate(clientPopulate)
      .lean();

    res.status(201).json({ ok: true, client: populatedClient });
  } catch (error) {
    next(error);
  }
};

function normalizeObjectId(value) {
  const candidate = value?._id || value?.id || value;
  return mongoose.isValidObjectId(candidate) ? candidate : undefined;
}
