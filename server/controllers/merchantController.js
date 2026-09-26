const { getPublicExperiences, applyOffers } = require('./experienceController');

async function getMerchantExperiences(req, res) {
  const merchantId = Number(req.user.id);
  const offers = await req.app.locals.readOffers();
  const experiences = applyOffers(await getPublicExperiences(), offers)
    .filter(experience => Number(experience.merchantId) === merchantId)
    .map(experience => ({ ...experience, merchantId }));

  res.json({ success: true, data: { experiences, count: experiences.length } });
}

async function getAnalytics(req, res) {
  const now = new Date();
  const merchantId = Number(req.user.id);
  const offers = await req.app.locals.readOffers();
  const merchantOffers = offers.filter(o => o.merchantId === merchantId);
  const activeOffers = merchantOffers.filter(offer => offer.status === 'live' && new Date(offer.expiresAt) > now).length;
  
  const { getPublicExperiences } = require('./experienceController');
  const allExperiences = await getPublicExperiences();
  const merchantExperiences = allExperiences.filter(e => Number(e.merchantId) === merchantId);
  
  res.json({
    success: true,
    data: { 
      analytics: { 
        totalExperiences: merchantExperiences.length,
        activeOffers,
        totalBookings: Math.floor(Math.random() * 50) + 10, // Mock bookings
        discountOffers: merchantOffers.length
      } 
    }
  });
}

const Merchant = require('../models/mongoose/Merchant');

async function getPublicMerchants(req, res) {
  try {
    const merchants = await Merchant.find({}).lean();
    const publicMerchants = merchants.map(m => ({
      id: m.userId || m._id,
      name: m.name,
      businessName: m.businessName,
      address: m.address,
      latitude: m.latitude,
      longitude: m.longitude
    }));
    res.json({ success: true, data: publicMerchants });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch merchants.' });
  }
}

module.exports = { getAnalytics, getMerchantExperiences, getPublicMerchants };
