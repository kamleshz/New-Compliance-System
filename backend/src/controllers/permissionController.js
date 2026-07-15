import Permission from '../models/Permission.js';

export const getPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.find();
    res.json(permissions);
  } catch (error) {
    next(error);
  }
};

export const createPermission = async (req, res, next) => {
  try {
    const permission = await Permission.create(req.body);
    res.status(201).json(permission);
  } catch (error) {
    next(error);
  }
};

export const updatePermission = async (req, res, next) => {
  try {
    const permission = await Permission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!permission) return res.status(404).json({ message: 'Permission not found' });
    res.json(permission);
  } catch (error) {
    next(error);
  }
};

export const deletePermission = async (req, res, next) => {
  try {
    await Permission.findByIdAndDelete(req.params.id);
    res.json({ message: 'Permission deleted' });
  } catch (error) {
    next(error);
  }
};
