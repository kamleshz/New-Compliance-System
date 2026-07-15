import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getCcpClient, getCcpClientDashboardStats, getCcpClients } from '../controllers/ccpClientController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getCcpClients);
router.get('/dashboard-stats', getCcpClientDashboardStats);
router.get('/:id', getCcpClient);

export default router;
