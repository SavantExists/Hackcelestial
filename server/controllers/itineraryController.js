const { readExperiences, budgetLevels } = require('./experienceController');

function minutes(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreExperience(experience, preferences) {
  const selectedVibes = Array.isArray(preferences.vibes) ? preferences.vibes : [];
  const matches = experience.vibe.filter(vibe => selectedVibes.includes(vibe)).length;
  const budgetScore = budgetLevels[experience.budget] <= budgetLevels[preferences.budget] ? 5 : -4;
  const weatherScore = preferences.rain ? (experience.weather === 'covered' ? 10 : -18) : 2;
  const duration = minutes(experience.duration) + minutes(experience.travel);
  const timeScore = duration <= Number(preferences.hours || 2.5) * 60 ? 4 : -8;
  const offerScore = Math.min(experience.merchantOffer || 0, 20) / 4;
  return Math.max(20, Math.min(99, Math.round(experience.score + matches * 3 + budgetScore + weatherScore + timeScore + offerScore)));
}

function generateItinerary(req, res) {
  const preferences = {
    hours: Number(req.body.hours) || 2.5,
    budget: budgetLevels[req.body.budget] ? req.body.budget : '$$',
    vibes: Array.isArray(req.body.vibes) ? req.body.vibes : [],
    rain: Boolean(req.body.rain)
  };
  const offers = req.app.locals.readOffers();
  const experiences = readExperiences()
    .filter(item => preferences.rain ? item.weather === 'covered' : item.featuredInClear !== false)
    .map(item => {
      const activeOffer = offers.filter(offer => offer.status === 'live' && new Date(offer.expiresAt) > new Date() && item.vibe.includes(offer.targetVibe))
        .reduce((highest, offer) => Math.max(highest, offer.discount), item.merchantOffer || 0);
      const enriched = { ...item, merchantOffer: activeOffer };
      return { ...enriched, fit: scoreExperience(enriched, preferences), match: Math.min(99, scoreExperience(enriched, preferences) + 2) };
    })
    .sort((a, b) => b.fit - a.fit);

  const itinerary = [];
  let usedMinutes = 0;
  for (const experience of experiences) {
    const totalMinutes = minutes(experience.duration) + minutes(experience.travel);
    if (itinerary.length < 3 && usedMinutes + totalMinutes <= preferences.hours * 60) {
      itinerary.push(experience.id);
      usedMinutes += totalMinutes;
    }
  }
  res.json({ success: true, data: { preferences, experiences, itinerary, usedMinutes } });
}

function validateItinerary(experienceIds, availableTime) {
  const ids = Array.isArray(experienceIds) ? experienceIds.map(Number) : [];
  const capacity = Number(availableTime);
  if (!Number.isFinite(capacity) || capacity <= 0) return { error: 'Available time must be greater than zero.' };
  if (!ids.length) return { error: 'Choose at least one experience.' };
  if (ids.length > 3) return { error: 'An itinerary can contain at most 3 stops.' };
  if (new Set(ids).size !== ids.length) return { error: 'Duplicate experiences are not allowed.' };

  const catalog = readExperiences();
  const selected = ids.map(id => catalog.find(experience => experience.id === id)).filter(Boolean);
  if (selected.length !== ids.length) return { error: 'One or more experiences could not be found.' };

  const totalMinutes = selected.reduce((total, experience) => total + minutes(experience.duration) + minutes(experience.travel), 0);
  const availableMinutes = Math.round(capacity * 60);
  return {
    itinerary: ids,
    selected,
    totalMinutes,
    totalTime: Number((totalMinutes / 60).toFixed(2)),
    availableTime: capacity,
    feasible: totalMinutes <= availableMinutes
  };
}

function formatItinerary(validation) {
  const remainingMinutes = Math.max(Math.round(validation.availableTime * 60) - validation.totalMinutes, 0);
  return {
    success: validation.feasible,
    totalTime: validation.totalTime,
    availableTime: validation.availableTime,
    remainingTime: Number((remainingMinutes / 60).toFixed(2)),
    stops: validation.itinerary.length,
    feasible: validation.feasible,
    itinerary: validation.itinerary,
    experiences: validation.selected
  };
}

function createItinerary(req, res) {
  const validation = validateItinerary(req.body.experiences, req.body.availableTime);
  if (validation.error) return res.status(400).json({ success: false, message: validation.error });
  const response = formatItinerary(validation);
  if (!response.feasible) return res.status(400).json({ success: false, message: 'The selected stops exceed your available time.' });
  res.json({ success: true, data: response });
}

function removeFromItinerary(req, res) {
  const id = Number(req.params.experienceId);
  const experiences = Array.isArray(req.body.experiences) ? req.body.experiences.map(Number).filter(experienceId => experienceId !== id) : [];
  if (!experiences.length) return res.json({ success: true, data: { totalTime: 0, availableTime: Number(req.body.availableTime) || 0, remainingTime: Number(req.body.availableTime) || 0, stops: 0, feasible: true, itinerary: [], experiences: [] } });
  const validation = validateItinerary(experiences, req.body.availableTime);
  if (validation.error) return res.status(400).json({ success: false, message: validation.error });
  res.json({ success: true, data: formatItinerary(validation) });
}

function bookItinerary(req, res) {
  const ids = Array.isArray(req.body.experienceIds) ? req.body.experienceIds.map(Number) : [];
  const available = readExperiences();
  const selected = ids.map(id => available.find(experience => experience.id === id)).filter(Boolean);
  if (!selected.length) return res.status(400).json({ success: false, message: 'Choose at least one valid experience.' });
  if (selected.length !== ids.length || selected.length > 3) return res.status(400).json({ success: false, message: 'An itinerary can contain up to three valid experiences.' });
  res.status(201).json({ success: true, data: { booking: { confirmationId: `HG-${Date.now().toString(36).toUpperCase()}`, experienceIds: ids, status: 'reserved-for-review' } } });
}

module.exports = { generateItinerary, bookItinerary, createItinerary, removeFromItinerary };
