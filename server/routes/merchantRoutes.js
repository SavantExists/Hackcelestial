const express = require('express');
const { getAnalytics } = require('../controllers/merchantController');

const router = express.Router();
router.get('/analytics', getAnalytics);

module.exports = router;
