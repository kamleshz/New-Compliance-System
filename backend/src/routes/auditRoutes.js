import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getAuditLogs } from '../controllers/auditController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getAuditLogs);

export default router;
