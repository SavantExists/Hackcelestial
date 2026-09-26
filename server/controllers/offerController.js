const fs = require('fs');
const path = require('path');

const offersPath = path.join(__dirname, '..', 'data', 'offers.json');
const allowedDurations = new Map([['1 hour', 1], ['2 hours', 2], ['Until closing', 8]]);
const allowedVibes = new Set(['Solo & Quiet', 'Local Artisans', 'Hidden Food', 'Culture & Heritage', 'Nightlife']);

function readOffers() {
  return JSON.parse(fs.readFileSync(offersPath, 'utf8'));
}

function writeOffers(offers) {
  fs.writeFileSync(offersPath, `${JSON.stringify(offers, null, 2)}\n`);
}

function getOffers(req, res) {
  const now = new Date();
  const offers = readOffers().filter(offer => offer.status === 'live' && new Date(offer.expiresAt) > now);
  res.json({ success: true, data: { offers, count: offers.length } });
}

function createOffer(req, res) {
  const discount = Number(req.body.discount);
  const { duration, targetVibe } = req.body;
  if (!Number.isInteger(discount) || discount < 1 || discount > 100) return res.status(400).json({ success: false, message: 'Discount must be between 1 and 100' });
  if (!allowedDurations.has(duration)) return res.status(400).json({ success: false, message: 'Duration is invalid.' });
  if (typeof targetVibe !== 'string' || !allowedVibes.has(targetVibe.trim())) return res.status(400).json({ success: false, message: 'Target vibe is invalid.' });
  const createdAt = new Date();
  const offer = {
    id: `OFF-${Date.now().toString(36).toUpperCase()}`,
    discount,
    duration,
    targetVibe: targetVibe.trim(),
    status: 'live',
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + allowedDurations.get(duration) * 60 * 60 * 1000).toISOString()
  };
  const offers = readOffers();
  offers.push(offer);
  writeOffers(offers);
  res.status(201).json({ success: true, data: { offer } });
}

function deleteOffer(req, res) {
  const offers = readOffers();
  const index = offers.findIndex(offer => offer.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Offer not found.' });
  const [offer] = offers.splice(index, 1);
  writeOffers(offers);
  res.json({ success: true, data: { offer, offers } });
}

module.exports = { getOffers, createOffer, deleteOffer, readOffers };
