const express = require('express');
const { generateItinerary, bookItinerary, createItinerary, removeFromItinerary } = require('../controllers/itineraryController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/generate', generateItinerary);
router.post('/book', authenticate, requireRole('traveler'), bookItinerary);

router.post('/', authenticate, requireRole('traveler'), createItinerary);
router.delete('/:experienceId', authenticate, requireRole('traveler'), removeFromItinerary);

module.exports = router;
