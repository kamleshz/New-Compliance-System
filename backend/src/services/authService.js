import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password, hashed) => {
  return bcrypt.compare(password, hashed);
};

export const generateTokens = (user) => {
  const payload = { id: user._id, roleId: user.roleId };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN });
  return { accessToken, refreshToken };
};

export const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, token, expiresAt });
};

export const revokeRefreshToken = async (token) => {
  await RefreshToken.findOneAndDelete({ token });
};

export const findUserByEmail = async (email) => {
  return User.findOne({ email }).populate('roleId departmentId');
};
