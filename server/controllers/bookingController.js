const { readExperiences } = require('./experienceController');
const fs = require('fs');
const path = require('path');

const bookingsPath = path.join(__dirname, '..', 'data', 'bookings.json');

function readBookings() { return JSON.parse(fs.readFileSync(bookingsPath, 'utf8')); }
function writeBookings(bookings) { fs.writeFileSync(bookingsPath, `${JSON.stringify(bookings, null, 2)}\n`); }

function createBooking(req, res) {
  const experienceIds = Array.isArray(req.body.experiences) ? req.body.experiences.map(Number) : [];
  const totalTime = Number(req.body.totalTime);
  const catalog = readExperiences();
  if (!experienceIds.length || experienceIds.length > 3 || new Set(experienceIds).size !== experienceIds.length || experienceIds.some(id => !Number.isInteger(id)) || !experienceIds.every(id => catalog.some(experience => experience.id === id))) {
    return res.status(400).json({ success: false, message: 'Provide up to three valid itinerary experiences.' });
  }
  if (!Number.isFinite(totalTime) || totalTime <= 0) return res.status(400).json({ success: false, message: 'Provide a valid itinerary total time.' });
  const expectedMinutes = experienceIds.reduce((total, id) => {
    const experience = catalog.find(item => item.id === id);
    return total + Number.parseInt(experience.duration, 10) + Number.parseInt(experience.travel, 10);
  }, 0);
  if (Math.abs(totalTime - expectedMinutes / 60) > 0.01) {
    return res.status(400).json({ success: false, message: 'The itinerary total time is invalid.' });
  }

  const booking = {
    bookingId: `HG-${Date.now().toString(36).toUpperCase()}`,
    experiences: experienceIds,
    totalTime,
    createdAt: new Date().toISOString()
  };
  const bookings = readBookings();
  bookings.push(booking);
  writeBookings(bookings);
  res.status(201).json({ success: true, data: { bookingId: booking.bookingId, message: 'Itinerary saved successfully' } });
}

module.exports = { createBooking, readBookings };
