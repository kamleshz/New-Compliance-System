import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { hashPassword, verifyPassword, generateTokens, saveRefreshToken, revokeRefreshToken } from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, employeeCode, roleId, departmentId, designation, mobile, isActive } = req.body;
    
    const hashed = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashed,
      employeeCode,
      roleId,
      departmentId,
      designation,
      mobile,
      isActive: isActive !== undefined ? isActive : true,
    });
    
    const populatedUser = await user.populate('roleId departmentId');
    res.status(201).json({ user: populatedUser, message: 'User registered successfully' });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email })
      .populate({ path: 'roleId', populate: { path: 'permissions' } })
      .populate('departmentId');

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokens = generateTokens(user);
    await saveRefreshToken(user._id, tokens.refreshToken);

    user.lastLogin = new Date();
    await user.save();

    const roleName = user.roleId?.roleName || 'Administrator';
    const permissions = [
      'dashboard.read',
      ...(user.roleId?.permissions?.flatMap((permission) =>
        permission.actions.map((action) => `${permission.module.toLowerCase().replace(/\s+/g, '_')}.${action}`)
      ) || []),
    ];

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: roleName,
        department: user.departmentId?.departmentName,
        permissions,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored) return res.status(401).json({ message: 'Refresh token invalid' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const tokens = generateTokens(user);
    await revokeRefreshToken(refreshToken);
    await saveRefreshToken(user._id, tokens.refreshToken);

    res.json(tokens);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await revokeRefreshToken(refreshToken);
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};
