const { readExperiences, applyOffers, budgetLevels } = require('./experienceController');
const allowedVibes = new Set(['Solo & Quiet', 'Local Artisans', 'Hidden Food', 'Culture & Heritage', 'Nightlife']);

function minutes(value) {
  return Number.parseInt(value, 10) || 0;
}

function suitability(experience, preferences) {
  const visitMinutes = minutes(experience.duration) + minutes(experience.travel);
  const matchingVibes = experience.vibe.filter(vibe => preferences.vibes.includes(vibe)).length;
  const withinBudget = budgetLevels[experience.budget] <= budgetLevels[preferences.budget];
  const nearby = Number.parseFloat(experience.distance) <= 1;
  let score = 50;
  score += matchingVibes * 12;
  score += withinBudget ? 12 : -8;
  score += visitMinutes <= preferences.availableTime * 60 ? 10 : -25;
  score += nearby ? 8 : 3;
  score += preferences.weather === 'rain' ? (experience.indoor ? 12 : -25) : 3;
  score += Math.min(experience.merchantOffer || 0, 20) / 2;
  score += experience.venueStatus === 'open' ? 4 : -40;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRecommendations(req, res) {
  const availableTime = Number(req.body.availableTime);
  const budget = req.body.budget;
  const vibes = req.body.vibes;
  const weather = req.body.weather;
  if (!Number.isFinite(availableTime) || availableTime < 1 || availableTime > 8) {
    return res.status(400).json({ success: false, message: 'Available time must be between 1 and 8 hours.' });
  }
  if (!budgetLevels[budget]) {
    return res.status(400).json({ success: false, message: 'Budget selection is invalid.' });
  }
  if (!Array.isArray(vibes) || vibes.length === 0 || vibes.some(vibe => typeof vibe !== 'string' || !allowedVibes.has(vibe.trim()))) {
    return res.status(400).json({ success: false, message: 'Choose at least one valid vibe.' });
  }
  if (weather !== 'rain' && weather !== 'clear') {
    return res.status(400).json({ success: false, message: 'Weather selection is invalid.' });
  }
  const preferences = {
    availableTime,
    budget,
    vibes,
    weather
  };
  const recommendations = applyOffers(readExperiences(), req.app.locals.readOffers())
    .filter(experience => experience.venueStatus === 'open')
    .filter(experience => preferences.weather === 'rain' ? experience.indoor : experience.featuredInClear !== false)
    .map(experience => {
      const fit = suitability(experience, preferences);
      return { ...experience, fit, match: Math.min(99, fit + 2) };
    })
    .sort((first, second) => second.fit - first.fit);

  let usedMinutes = 0;
  const itinerary = recommendations.filter(experience => {
    const total = minutes(experience.duration) + minutes(experience.travel);
    if (usedMinutes + total > preferences.availableTime * 60) return false;
    usedMinutes += total;
    return true;
  }).slice(0, 3).map(experience => experience.id);

  res.json({ success: true, data: { recommendations, itinerary, usedMinutes, preferences } });
}

module.exports = { getRecommendations };
