const express = require('express');
const { createBooking, getMyBookings } = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/my', authenticate, requireRole('traveler'), getMyBookings);
router.post('/', authenticate, requireRole('traveler'), createBooking);

module.exports = router;
