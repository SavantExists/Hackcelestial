const fs = require('fs');
const path = require('path');

const experiencesPath = path.join(__dirname, '..', 'data', 'experiences.json');
const budgetLevels = { '$': 1, '$$': 2, '$$$': 3 };
const ratnagiriCenter = { lat: 16.9902, lng: 73.312 };

function distanceBetween(lat, lng) {
  const radians = degrees => degrees * Math.PI / 180;
  const latitudeDelta = radians(lat - ratnagiriCenter.lat);
  const longitudeDelta = radians(lng - ratnagiriCenter.lng);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(ratnagiriCenter.lat)) * Math.cos(radians(lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function normalizedVibes(experience) {
  const text = `${experience.category} ${experience.vibes}`.toLowerCase();
  const result = [];
  if (/food|seafood|restaurant|cafe|coffee|cuisine|dining|snack|vegetarian/.test(text)) result.push('Hidden Food');
  if (/culture|history|fort|heritage|temple|palace|museum|lighthouse|literature|poetry/.test(text)) result.push('Culture & Heritage');
  if (/solo|peaceful|nature|beach|sunset|sunrise|photography|coastal|scenic|outdoor|adventure|trek|cycling|boating|kayak|swimming|camping|waterfall/.test(text)) result.push('Solo & Quiet');
  if (/nightlife|bar|evening|night drive/.test(text)) result.push('Nightlife');
  if (/artisan|craft|maker|handmade/.test(text)) result.push('Local Artisans');
  return result.length ? [...new Set(result)] : ['Solo & Quiet'];
}

function normalizeExperience(experience) {
  if (experience.title) return experience;

  const distanceKm = distanceBetween(experience.lat, experience.lon);
  const estimatedRoadKm = distanceKm * 1.35;
  const travelMinutes = Math.max(2, Math.round(estimatedRoadKm / 25 * 60));
  const durationMinutes = Math.round(experience.duration_hours * 60);
  const budget = experience.cost <= 350 ? '$' : experience.cost <= 700 ? '$$' : '$$$';
  const categoryImages = {
    food: 'photo-1555939594-58d7cb561ad1',
    solo: 'photo-1500375592092-40eb2168fd21',
    adventure: 'photo-1470770841072-f978cf4d019e',
    nightlife: 'photo-1514933651103-005eec06c04b',
    cultural: 'photo-1511818966892-d7d671e672a2'
  };
  const imageId = categoryImages[experience.category] || categoryImages.solo;
  const imageQuery = encodeURIComponent(`${experience.name} Ratnagiri Maharashtra`);
  const weather = experience.weather_type === 'outdoor' ? 'outdoor' : 'covered';
  const distanceLabel = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
  const score = Math.max(70, Math.min(98, Math.round(96 - distanceKm * 0.45)));

  return {
    ...experience,
    title: experience.name,
    kind: experience.category[0].toUpperCase() + experience.category.slice(1),
    distance: `${distanceLabel} from Ratnagiri center`,
    travel: `${travelMinutes} min estimated drive`,
    duration: `${durationMinutes} min`,
    budget,
    vibe: normalizedVibes(experience),
    score,
    match: Math.min(99, score + 2),
    lng: experience.lon,
    weather,
    indoor: experience.weather_type !== 'outdoor',
    venueStatus: experience.venueStatus || 'unknown',
    merchantOffer: experience.merchantOffer || 0,
    image: `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=900&q=80`,
    image_url: experience.image_url || `https://www.google.com/search?tbm=isch&q=${imageQuery}`,
    image_source: experience.image_source || 'Web image search',
    image_alt: experience.image_alt || `${experience.name} in Ratnagiri, Maharashtra`,
    pin: String.fromCharCode(65 + ((experience.id - 1) % 26)),
    featuredInClear: true
  };
}

function readExperiences() {
  return JSON.parse(fs.readFileSync(experiencesPath, 'utf8')).map(normalizeExperience);
}

function activeOfferForExperience(experience, offers) {
  return offers
    .filter(offer => offer.status === 'live' && new Date(offer.expiresAt) > new Date())
    .filter(offer => offer.targetVibe === experience.vibe.find(vibe => vibe === offer.targetVibe))
    .reduce((highest, offer) => Math.max(highest, offer.discount), experience.merchantOffer || 0);
}

function applyOffers(experiences, offers) {
  return experiences.map(experience => ({
    ...experience,
    merchantOffer: activeOfferForExperience(experience, offers)
  }));
}

function minutes(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function queryScore(experience, { budget, vibe, time, rain }) {
  let score = experience.score;
  if (vibe && experience.vibe.includes(vibe)) score += 8;
  if (budget && budgetLevels[experience.budget] <= budgetLevels[budget]) score += 5;
  if (time && minutes(experience.duration) + minutes(experience.travel) <= time * 60) score += 4;
  if (Number.parseFloat(experience.distance) <= 1) score += 3;
  if (rain && experience.indoor) score += 10;
  score += Math.min(experience.merchantOffer || 0, 20) / 4;
  return Math.min(99, Math.round(score));
}

function getExperiences(req, res) {
  const { budget, vibe } = req.query;
  const time = Number(req.query.time);
  const rain = req.query.rain === 'true' || req.query.weather === 'rain';
  const offers = req.app.locals.readOffers();
  let experiences = applyOffers(readExperiences(), offers);

  if (rain) experiences = experiences.filter(experience => experience.indoor && experience.venueStatus !== 'closed');
  else experiences = experiences.filter(experience => experience.featuredInClear !== false);
  if (budget && budgetLevels[budget]) experiences = experiences.filter(experience => budgetLevels[experience.budget] <= budgetLevels[budget]);
  if (vibe) experiences = experiences.filter(experience => experience.vibe.includes(vibe));
  if (Number.isFinite(time) && time > 0) experiences = experiences.filter(experience => minutes(experience.duration) + minutes(experience.travel) <= time * 60);
  experiences = experiences
    .map(experience => ({ ...experience, fit: queryScore(experience, { budget, vibe, time, rain }) }))
    .sort((first, second) => second.fit - first.fit);

  res.json({ success: true, data: { experiences, count: experiences.length } });
}

function getExperienceById(req, res) {
  const id = Number(req.params.id);
  const experience = applyOffers(readExperiences(), req.app.locals.readOffers()).find(item => item.id === id);
  if (!experience) return res.status(404).json({ success: false, message: 'Experience not found.' });
  res.json({ success: true, data: { experience } });
}

module.exports = { getExperiences, getExperienceById, readExperiences, applyOffers, budgetLevels };
