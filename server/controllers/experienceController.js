const Experience = require('../models/mongoose/Experience');
const budgetLevels = { '$': 1, '$$': 2, '$$$': 3 };

function withoutMongoId(document) {
  const { _id, ...data } = document;
  return data;
}

async function readExperiences() {
  const experiences = await Experience.find().lean();
  return experiences.map(withoutMongoId);
}

async function getPublicExperiences() {
  const experiences = await Experience.find({ verified: true }).lean();
  return experiences.map(withoutMongoId).filter(experience => experience.verified === true);
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

async function getExperiences(req, res) {
  const { budget, vibe } = req.query;
  const time = Number(req.query.time);
  const rain = req.query.rain === 'true' || req.query.weather === 'rain';
  const offers = await req.app.locals.readOffers();
  let experiences = applyOffers(await getPublicExperiences(), offers);

  if (rain) experiences = experiences.filter(experience => experience.indoor && experience.venueStatus === 'open');
  else experiences = experiences.filter(experience => experience.featuredInClear !== false);
  if (budget && budgetLevels[budget]) experiences = experiences.filter(experience => budgetLevels[experience.budget] <= budgetLevels[budget]);
  if (vibe) experiences = experiences.filter(experience => experience.vibe.includes(vibe));
  if (Number.isFinite(time) && time > 0) experiences = experiences.filter(experience => minutes(experience.duration) + minutes(experience.travel) <= time * 60);
  experiences = experiences
    .map(experience => ({ ...experience, fit: queryScore(experience, { budget, vibe, time, rain }) }))
    .sort((first, second) => second.fit - first.fit);

  res.json({ success: true, data: { experiences, count: experiences.length } });
}

async function getExperienceById(req, res) {
  const id = Number(req.params.id);
  const experiences = await getPublicExperiences();
  const offers = await req.app.locals.readOffers();
  const experience = applyOffers(experiences, offers).find(item => item.id === id);
  if (!experience) return res.status(404).json({ success: false, message: 'Experience not found.' });
  res.json({ success: true, data: { experience } });
}

module.exports = { getExperiences, getExperienceById, readExperiences, getPublicExperiences, applyOffers, budgetLevels };
