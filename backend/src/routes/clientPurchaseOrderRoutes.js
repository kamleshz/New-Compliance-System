import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getAccountsPurchaseOrders,
  getClientPurchaseOrder,
  getPurchaseOrderDashboardStatus,
  saveClientPurchaseOrder,
  updatePurchaseOrderAccounts,
} from '../controllers/clientPurchaseOrderController.js';

const router = express.Router();

router.use(authenticate);
router.get('/dashboard-status', getPurchaseOrderDashboardStatus);
router.get('/accounts', getAccountsPurchaseOrders);
router.put('/:ccpClientId/years/:yearRecordId/accounts', updatePurchaseOrderAccounts);
router.get('/:ccpClientId', getClientPurchaseOrder);
router.put('/:ccpClientId', saveClientPurchaseOrder);

export default router;
