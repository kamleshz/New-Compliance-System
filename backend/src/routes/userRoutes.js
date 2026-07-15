import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getUsers, getUser, createUser, updateUser, deleteUser } from '../controllers/userController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
