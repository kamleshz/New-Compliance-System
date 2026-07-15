import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getClientPortalAsset, saveClientPortalAsset } from '../controllers/clientPortalAssetController.js';

const router = express.Router();

router.use(authenticate);
router.get('/:ccpClientId', getClientPortalAsset);
router.put('/:ccpClientId', saveClientPortalAsset);

export default router;
