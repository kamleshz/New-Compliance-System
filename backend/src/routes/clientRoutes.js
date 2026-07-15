import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { createClient, getClient, getClients } from '../controllers/clientController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getClients);
router.get('/:id', getClient);
router.post('/', createClient);

export default router;
