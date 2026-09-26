const express = require('express');
const { getAnalytics, getMerchantExperiences } = require('../controllers/merchantController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/analytics', authenticate, requireRole('merchant'), getAnalytics);
router.get('/experiences', authenticate, requireRole('merchant'), getMerchantExperiences);

module.exports = router;
