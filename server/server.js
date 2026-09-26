require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { readOffers } = require('./controllers/offerController');
const experienceRoutes = require('./routes/experienceRoutes');
const itineraryRoutes = require('./routes/itineraryRoutes');
const offerRoutes = require('./routes/offerRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const merchantRoutes = require('./routes/merchantRoutes');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.locals.readOffers = readOffers;
app.locals.weatherCondition = 'clear';
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { message: 'HiddenGemsAI backend is running' } });
});

app.use('/api/experiences', experienceRoutes);
app.use('/api/itineraries', itineraryRoutes);
app.use('/api/itinerary', itineraryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/merchant', merchantRoutes);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'customer.html')));
app.get('/customer', (req, res) => res.sendFile(path.join(__dirname, '..', 'customer.html')));
app.get('/customer.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'customer.html')));
app.get('/merchant', (req, res) => res.sendFile(path.join(__dirname, '..', 'merchant.html')));
app.get('/merchant.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'merchant.html')));

app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API endpoint not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  const status = error.statusCode === 400 || error.type === 'entity.parse.failed' ? 400 : 500;
  const message = status === 400 ? 'Request body must contain valid JSON.' : 'An unexpected server error occurred.';
  res.status(status).json({ success: false, message });
});

app.listen(port, () => console.log(`HiddenGemsAI is running at http://localhost:${port}`));
