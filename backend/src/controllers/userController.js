import * as userService from '../services/userService.js';
import User from '../models/User.js';

export const getUsers = async (req, res, next) => {
  try {
    const result = await userService.fetchUsers(req.query, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    if (!(await canManageUsers(req.user?.id))) return res.status(403).json({ message: 'Only Admin or Super Admin can create users.' });
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    if (!(await canManageUsers(req.user?.id))) return res.status(403).json({ message: 'Only Admin or Super Admin can update users.' });
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

async function canManageUsers(userId) {
  const user = await User.findById(userId).populate('roleId').lean();
  const roleName = String(user?.roleId?.roleName || '').toLowerCase();
  return roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin';
}

export const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};
