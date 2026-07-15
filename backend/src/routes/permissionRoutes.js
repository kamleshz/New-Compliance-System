import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getPermissions, createPermission, updatePermission, deletePermission } from '../controllers/permissionController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getPermissions);
router.post('/', createPermission);
router.put('/:id', updatePermission);
router.delete('/:id', deletePermission);

export default router;
