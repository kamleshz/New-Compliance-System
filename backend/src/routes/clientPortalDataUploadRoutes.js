import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getManagerPurchaseReviews,
  getClientPortalDataUpload,
  saveClientPortalDataUpload,
} from '../controllers/clientPortalDataUploadController.js';

const router = express.Router();

router.use(authenticate);
router.get('/manager-purchase-reviews', getManagerPurchaseReviews);
router.get('/:ccpClientId', getClientPortalDataUpload);
router.put('/:ccpClientId', saveClientPortalDataUpload);

export default router;
