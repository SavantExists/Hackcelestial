const express = require('express');
const { getWeather, simulateWeather, restoreWeather } = require('../controllers/weatherController');

const router = express.Router();
router.get('/', getWeather);
router.post('/simulate', simulateWeather);
router.post('/restore', restoreWeather);

module.exports = router;
