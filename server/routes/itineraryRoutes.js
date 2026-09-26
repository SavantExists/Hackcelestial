const express = require('express');
const { generateItinerary, bookItinerary, createItinerary, removeFromItinerary } = require('../controllers/itineraryController');

const router = express.Router();
router.post('/generate', generateItinerary);
router.post('/book', bookItinerary);

router.post('/', createItinerary);
router.delete('/:experienceId', removeFromItinerary);

module.exports = router;
