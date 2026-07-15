import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roleController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getRoles);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
