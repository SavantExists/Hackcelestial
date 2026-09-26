const express = require('express');
const { getOffers, createOffer, deleteOffer } = require('../controllers/offerController');

const router = express.Router();
router.get('/', getOffers);
router.post('/', createOffer);
router.delete('/:id', deleteOffer);

module.exports = router;
