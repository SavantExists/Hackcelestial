const { getPublicExperiences } = require('./experienceController');
const Booking = require('../models/mongoose/Booking');
const crypto = require('crypto');

async function readBookings() {
  const bookings = await Booking.find().lean();
  return bookings.map(({ _id, ...booking }) => booking);
}

async function createBooking(req, res) {
  const requestedIds = Array.isArray(req.body.experiences)
    ? req.body.experiences
    : Array.isArray(req.body.experienceIds)
      ? req.body.experienceIds
      : req.body.experienceId == null ? [] : [req.body.experienceId];
  const experienceIds = requestedIds.map(Number);
  const numberOfPeople = Number(req.body.numberOfPeople ?? 1);
  const catalog = await getPublicExperiences();
  if (!experienceIds.length || experienceIds.length > 3 || new Set(experienceIds).size !== experienceIds.length || experienceIds.some(id => !Number.isInteger(id)) || !experienceIds.every(id => catalog.some(experience => experience.id === id))) {
    return res.status(400).json({ success: false, message: 'Provide up to three valid, verified experiences.' });
  }
  if (!Number.isInteger(numberOfPeople) || numberOfPeople < 1 || numberOfPeople > 50) {
    return res.status(400).json({ success: false, message: 'Number of people must be between 1 and 50.' });
  }

  const selectedExperiences = experienceIds.map(id => catalog.find(item => item.id === id));
  const expectedMinutes = selectedExperiences.reduce((total, experience) => {
    return total + Number.parseInt(experience.duration, 10) + Number.parseInt(experience.travel, 10);
  }, 0);
  const totalTime = req.body.totalTime == null ? Number((expectedMinutes / 60).toFixed(2)) : Number(req.body.totalTime);
  if (!Number.isFinite(totalTime) || totalTime <= 0 || Math.abs(totalTime - expectedMinutes / 60) > 0.01) {
    return res.status(400).json({ success: false, message: 'The itinerary total time is invalid.' });
  }

  const bookingDate = req.body.date || new Date().toISOString().slice(0, 10);
  const dateValue = new Date(bookingDate);
  if (!Number.isFinite(dateValue.getTime())) return res.status(400).json({ success: false, message: 'Provide a valid booking date.' });
  const bookingTime = typeof req.body.time === 'string' && req.body.time.trim() ? req.body.time.trim() : '09:00';
  const merchantIds = [...new Set(selectedExperiences.map(item => Number(item.merchantId)).filter(Number.isFinite))];
  const booking = await Booking.create({
    bookingId: `HG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    userId: Number(req.user.id),
    experiences: experienceIds,
    experienceIds,
    experienceNames: selectedExperiences.map(item => item.name || item.title || 'Experience'),
    experienceId: experienceIds.length === 1 ? experienceIds[0] : undefined,
    experienceName: experienceIds.length === 1 ? selectedExperiences[0].name || selectedExperiences[0].title : undefined,
    merchantId: merchantIds.length === 1 ? merchantIds[0] : undefined,
    merchantIds,
    date: dateValue.toISOString().slice(0, 10),
    time: bookingTime,
    numberOfPeople,
    totalCost: selectedExperiences.reduce((total, item) => total + (Number(item.cost) || 0), 0) * numberOfPeople,
    status: 'confirmed',
    totalTime,
    createdAt: new Date().toISOString()
  });
  const savedBooking = booking.toObject();
  delete savedBooking._id;
  delete savedBooking.__v;
  res.status(201).json({ success: true, data: { booking: savedBooking, bookingId: savedBooking.bookingId, message: 'Booking saved successfully.' } });
}

async function getMyBookings(req, res) {
  const bookings = await Booking.find({ userId: Number(req.user.id) }).sort({ createdAt: -1 }).lean();
  const experienceIds = [...new Set(bookings.flatMap(booking => booking.experienceIds || booking.experiences || (booking.experienceId == null ? [] : [booking.experienceId])).map(Number))];
  const Experience = require('../models/mongoose/Experience');
  const experiences = await Experience.find({ id: { $in: experienceIds } }).lean();
  const experiencesById = new Map(experiences.map(experience => [Number(experience.id), experience]));
  const results = bookings.map(booking => {
    const ids = booking.experienceIds || booking.experiences || (booking.experienceId == null ? [] : [booking.experienceId]);
    return {
      ...booking,
      experienceDetails: ids.map(id => experiencesById.get(Number(id))).filter(Boolean),
      _id: undefined
    };
  });
  res.json({ success: true, data: { bookings: results, count: results.length } });
}

module.exports = { createBooking, getMyBookings, readBookings };
