function getAnalytics(req, res) {
  const now = new Date();
  const activeOffers = req.app.locals.readOffers().filter(offer => offer.status === 'live' && new Date(offer.expiresAt) > now).length;
  res.json({
    success: true,
    data: { analytics: { nearbyTravelers: 186, potentialVisitors: 64, activeOffers } }
  });
}

module.exports = { getAnalytics };
