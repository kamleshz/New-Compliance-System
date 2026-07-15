import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getEprTargetCalculation } from '../controllers/eprTargetController.js';

const router = express.Router();

router.use(authenticate);

router.get('/:ccpClientId', getEprTargetCalculation);

export default router;

