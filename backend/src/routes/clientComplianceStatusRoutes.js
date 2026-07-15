import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getClientComplianceStatus,
  saveClientComplianceStatus,
} from '../controllers/clientComplianceStatusController.js';

const router = express.Router();

router.use(authenticate);
router.get('/:ccpClientId', getClientComplianceStatus);
router.put('/:ccpClientId', saveClientComplianceStatus);

export default router;
