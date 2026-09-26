const vibes = ['Solo & Quiet', 'Local Artisans', 'Hidden Food', 'Culture & Heritage', 'Nightlife'];
const API_BASE_URL = '/api';
const USE_REMOTE_API = true;

// Current authenticated merchant user
let currentMerchantUser = null;
try { currentMerchantUser = JSON.parse(localStorage.getItem('hgai_user') || '{}'); } catch (e) {}

// Business details captured on merchant-details.html (name/location/category/contact/hours), if any.
let merchantDetails = {};
try { merchantDetails = JSON.parse(localStorage.getItem('hgai_merchant') || '{}'); } catch (error) { merchantDetails = {}; }
const merchantLocation = merchantDetails.location || 'Ratnagiri, Maharashtra';
const merchantCategory = vibes.includes(merchantDetails.category) ? merchantDetails.category : vibes[1];
const merchantName = merchantDetails.businessName || currentMerchantUser.businessName || currentMerchantUser.name || 'Ratnagiri Merchant';

const app = document.querySelector('#merchant-app');
app.innerHTML = `
  <div class="app-shell">
    <div class="folk-pattern top-pattern"></div>
    <div class="folk-pattern side-pattern"></div>
    <div class="marigold marigold-one">✿</div>
    <div class="marigold marigold-two">✿</div>

    <nav class="topbar">
      <a class="brand" href="merchant.html"><span class="gem">◆</span><span>HiddenGems<span>AI</span></span></a>
      <div class="context">⌖ <span>${merchantLocation}</span><i></i><span>☀ Clear 28°C · Ratnagiri</span></div>
      <div class="nav-actions">
        <div class="user-profile-pill" id="merchant-user-pill">
          <span id="merchant-user-name">${merchantName}</span>
          <span class="user-role">Merchant</span>
          <button type="button" class="btn-logout" id="logout-button" title="Log out of merchant account">Log out</button>
        </div>
        <button class="notification" aria-label="Notifications">♧<b></b></button>
        <button class="mobile-menu" aria-label="Menu">☰</button>
      </div>
    </nav>

    <main class="merchant" style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
      <header class="merchant-hero" style="margin-bottom: 2rem; border-bottom: 2px solid var(--border); padding-bottom: 2rem;">
        <p class="eyebrow">⚡ MERCHANT DASHBOARD</p>
        <h1 style="font-size: 2.5rem; color: var(--text-dark);">Welcome back, <em>${merchantName}</em></h1>
        <p style="font-size: 1.1rem; color: var(--text-light);">${merchantLocation} • <a href="merchant-details.html" style="color: var(--brand-pop);">Edit Business Profile</a></p>
      </header>

      <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="glass" style="padding: 1.5rem; text-align: center; border-radius: 12px;">
          <h3 style="margin: 0; font-size: 0.9rem; color: var(--text-light); text-transform: uppercase;">Total Experiences</h3>
          <p style="margin: 0.5rem 0 0; font-size: 2.5rem; font-weight: 800; color: var(--brand-dark);" data-analytics="totalExperiences">—</p>
        </div>
        <div class="glass" style="padding: 1.5rem; text-align: center; border-radius: 12px;">
          <h3 style="margin: 0; font-size: 0.9rem; color: var(--text-light); text-transform: uppercase;">Active Offers</h3>
          <p style="margin: 0.5rem 0 0; font-size: 2.5rem; font-weight: 800; color: var(--brand-pop);" data-analytics="activeOffers">—</p>
        </div>
        <div class="glass" style="padding: 1.5rem; text-align: center; border-radius: 12px;">
          <h3 style="margin: 0; font-size: 0.9rem; color: var(--text-light); text-transform: uppercase;">Total Bookings</h3>
          <p style="margin: 0.5rem 0 0; font-size: 2.5rem; font-weight: 800; color: var(--brand-dark);" data-analytics="totalBookings">—</p>
        </div>
        <div class="glass" style="padding: 1.5rem; text-align: center; border-radius: 12px;">
          <h3 style="margin: 0; font-size: 0.9rem; color: var(--text-light); text-transform: uppercase;">Total Discounts Created</h3>
          <p style="margin: 0.5rem 0 0; font-size: 2.5rem; font-weight: 800; color: var(--brand-dark);" data-analytics="discountOffers">—</p>
        </div>
      </section>

      <section class="merchant-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        
        <div style="display: flex; flex-direction: column; gap: 2rem;">
          <form class="offer-form glass" style="padding: 2rem; border-radius: 16px;">
            <div style="margin-bottom: 1.5rem;">
              <p class="eyebrow" style="color: var(--brand-pop);">MAKE AN OFFER</p>
              <h2 style="margin: 0; font-size: 1.5rem;">Create a flash discount</h2>
            </div>
            
            <label style="display: block; margin-bottom: 1rem;">Experience
              <select name="experienceId" id="offer-experience-select" style="width: 100%; padding: 0.8rem; margin-top: 0.5rem; border: 2px solid var(--border); border-radius: 8px;">
                <option value="">Loading your experiences...</option>
              </select>
            </label>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <label>Discount
                <div class="input-wrap" style="display: flex; align-items: center; background: #fff; border: 2px solid var(--border); border-radius: 8px; overflow: hidden; margin-top: 0.5rem;">
                  <input name="discount" value="20" inputmode="numeric" style="border: none; padding: 0.8rem; width: 100%;">
                  <span style="padding: 0 1rem; background: var(--bg-alt); font-weight: bold;">% OFF</span>
                </div>
              </label>
              <label>Available for
                <select name="duration" style="width: 100%; padding: 0.8rem; margin-top: 0.5rem; border: 2px solid var(--border); border-radius: 8px;">
                  <option>1 hour</option>
                  <option selected>2 hours</option>
                  <option>Until closing</option>
                </select>
              </label>
            </div>
            
            <label style="display: block; margin-bottom: 1rem;">Target vibe
              <select name="vibe" style="width: 100%; padding: 0.8rem; margin-top: 0.5rem; border: 2px solid var(--border); border-radius: 8px;">
                ${vibes.map(vibe => `<option ${vibe === merchantCategory ? 'selected' : ''}>${vibe}</option>`).join('')}
              </select>
            </label>
            
            <button class="broadcast" type="submit" style="width: 100%; padding: 1rem; background: var(--brand-pop); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem; margin-top: 1rem;">⚡ Broadcast Offer</button>
          </form>

          <div class="glass" style="padding: 2rem; border-radius: 16px;">
            <p class="eyebrow">YOUR ACTIVE OFFERS</p>
            <h2 style="margin: 0 0 1rem; font-size: 1.5rem;">Live Discounts</h2>
            <div id="active-offers-list" style="display: flex; flex-direction: column; gap: 1rem;">
              <p style="color: var(--text-light); font-style: italic;">Loading active offers...</p>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 2rem;">
          <div class="map-panel merchant-map glass" style="border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; height: 100%; min-height: 400px;">
            <div class="map-header" style="padding: 1rem; background: var(--bg-card); border-bottom: 1px solid var(--border); z-index: 10;"><span>⌖ YOUR LOCATIONS · ${merchantLocation}</span></div>
            <div id="merchant-leaflet-map" style="flex: 1; min-height: 300px;"></div>
          </div>
        </div>
      </section>
    </main>
  </div>
`;

// Initialize browser Lucide icons after the dashboard markup exists.
function initializeIcons(root = app) {
  const icons = { '⌖': 'map-pin', '☀': 'sun', '←': 'arrow-left', '♧': 'bell', '☰': 'menu', '⚡': 'zap', '◆': 'gem', '✓': 'check' };
  let markup = root.innerHTML;
  Object.entries(icons).forEach(([character, name]) => { markup = markup.replaceAll(character, `<i data-lucide="${name}" aria-hidden="true"></i>`); });
  root.innerHTML = markup;
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
}

function initializeMerchant() {
  initializeIcons();
  setupAuthHandlers();
}

// --- Merchant map: merchant's approximate location + its verified experiences ---
// Same free stack as the traveler map (Leaflet + OpenStreetMap tiles, no API key).
const RATNAGIRI_CENTER = [16.9902, 73.3120];
let merchantMapInstance = null;

function getExperienceCoords(item) {
  const lat = Number(item.latitude ?? item.lat);
  const lng = Number(item.longitude ?? item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

// Geocode the merchant's free-text location (from merchant-details.html) via the free
// OpenStreetMap Nominatim API - a one-time lookup, no key. Never invented: falls back
// to the fixed Ratnagiri-town center if geocoding fails, times out, or finds nothing.
function geocodeMerchantLocation(locationText) {
  return new Promise(resolve => {
    const query = /india/i.test(locationText) ? locationText : `${locationText}, India`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const timeout = setTimeout(() => resolve(null), 6000);
    fetch(url)
      .then(res => (res.ok ? res.json() : null))
      .then(results => {
        clearTimeout(timeout);
        const first = Array.isArray(results) ? results[0] : null;
        if (first && Number.isFinite(Number(first.lat)) && Number.isFinite(Number(first.lon))) {
          resolve({ lat: Number(first.lat), lng: Number(first.lon) });
        } else {
          resolve(null);
        }
      })
      .catch(() => { clearTimeout(timeout); resolve(null); });
  });
}

async function loadNearbyVerifiedExperiences() {
  try {
    // The merchant endpoint is authenticated and is scoped by the session's
    // merchant id. Do not use the public catalog here: it contains listings
    // belonging to other merchants as well.
    const response = await fetch(`${API_BASE_URL}/merchant/experiences`);
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || `Experiences request failed: ${response.status}`);
    return data.data?.experiences || [];
  } catch (error) {
    console.error('Unable to load this merchant\'s experiences for merchant map', error);
    return [];
  }
}

function renderMerchantMap(center, experiences) {
  const container = document.getElementById('merchant-leaflet-map');
  if (!container || typeof L === 'undefined') return;

  if (merchantMapInstance) { merchantMapInstance.remove(); merchantMapInstance = null; }

  const map = L.map(container, { zoomControl: false }).setView(center, 13);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  const boundsPoints = [center];
  const merchantIcon = L.divIcon({ className: '', html: '<div class="hg-marker-user"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
  L.marker(center, { icon: merchantIcon }).addTo(map).bindPopup('Your business (approximate location)');

  experiences.forEach(item => {
    const coords = getExperienceCoords(item);
    if (!coords) return; // never invent a coordinate for an experience that doesn't have one
    const markerIcon = L.divIcon({
      className: '',
      html: `<div class="hg-marker-pin"><span>${item.pin || '★'}</span></div>`,
      iconSize: [29, 29],
      iconAnchor: [14, 29],
      popupAnchor: [0, -26]
    });
    const marker = L.marker([coords.lat, coords.lng], { icon: markerIcon }).addTo(map);
    marker.bindPopup(`<div class="hg-popup"><h4>${item.title}</h4><p>${item.kind || ''} · ${item.budget || ''}</p></div>`);
    boundsPoints.push([coords.lat, coords.lng]);
  });

  if (boundsPoints.length > 1) map.fitBounds(boundsPoints, { padding: [28, 28] });
  merchantMapInstance = map;
}

async function loadMerchantMap() {
  const [center, experiences] = await Promise.all([
    geocodeMerchantLocation(merchantLocation),
    loadNearbyVerifiedExperiences()
  ]);
  renderMerchantMap(center || RATNAGIRI_CENTER, experiences);
}

async function verifyAuth() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`);
    if (!res.ok) {
      window.location.href = 'login.html?redirect=merchant.html&role=merchant';
      return false;
    }
    const data = await res.json();
    if (!data.success || !data.data?.user || data.data.user.role !== 'merchant') {
      window.location.href = 'login.html?redirect=merchant.html&role=merchant';
      return false;
    }
    currentMerchantUser = data.data.user;
    localStorage.setItem('hgai_user', JSON.stringify(currentMerchantUser));
    const nameEl = document.querySelector('#merchant-user-name');
    if (nameEl) nameEl.textContent = currentMerchantUser.businessName || currentMerchantUser.name || 'Merchant';
    return true;
  } catch (err) {
    console.error('Merchant auth check failed:', err);
    window.location.href = 'login.html?redirect=merchant.html&role=merchant';
    return false;
  }
}

function setupAuthHandlers() {
  const logoutBtn = document.querySelector('#logout-button');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Logging out...';
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
      } catch (e) {}
      localStorage.removeItem('hgai_user');
      window.location.href = 'login.html';
    };
  }
}

initializeMerchant();

async function broadcastOffer(offer) {
  if (!USE_REMOTE_API) return { ...offer, status: 'demo' };
  const response = await fetch(`${API_BASE_URL}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(offer)
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(payload.message || `Offer request failed: ${response.status}`);
  return payload;
}

async function loadMerchantData() {
  try {
    const response = await fetch(`${API_BASE_URL}/merchant/experiences`);
    const data = await response.json();
    const experiences = data.data?.experiences || [];
    const select = document.getElementById('offer-experience-select');
    if (select) {
      if (experiences.length === 0) {
        select.innerHTML = '<option value="">No experiences found</option>';
      } else {
        select.innerHTML = experiences.map(e => `<option value="${e.id}">${e.name} (${e.vibes.join(', ')})</option>`).join('');
      }
    }
    return experiences;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function loadActiveOffer() {
  if (!USE_REMOTE_API) return;
  try {
    const response = await fetch(`${API_BASE_URL}/offers/active`);
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || `Offer request failed: ${response.status}`);
    
    // Filter to show only this merchant's offers
    const myOffers = (data.data?.offers || []).filter(o => o.merchantId === currentMerchantUser.id);
    const listEl = document.getElementById('active-offers-list');
    
    if (listEl) {
      if (myOffers.length === 0) {
        listEl.innerHTML = '<p style="color: var(--text-light); font-style: italic;">No active offers. Broadcast one above!</p>';
      } else {
        listEl.innerHTML = myOffers.map(offer => `
          <div style="border: 1px solid var(--border); padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; background: #fff;">
            <div>
              <h4 style="margin: 0; color: var(--brand-pop);">${offer.title}</h4>
              <p style="margin: 0.2rem 0 0; font-size: 0.9rem;">${offer.experience?.name || 'All Experiences'} • ${offer.targetVibe}</p>
              <p style="margin: 0; font-size: 0.8rem; color: var(--text-light);">Expires: ${new Date(offer.expiresAt).toLocaleTimeString()}</p>
            </div>
            <button onclick="deleteOffer('${offer.id}')" style="background: none; border: none; color: #ff4444; cursor: pointer; text-decoration: underline;">End</button>
          </div>
        `).join('');
      }
    }
  } catch (error) {
    console.error('Unable to load active offers', error);
  }
}

async function deleteOffer(id) {
  if (!confirm('Are you sure you want to end this offer?')) return;
  try {
    await fetch(`${API_BASE_URL}/offers/${id}`, { method: 'DELETE' });
    loadActiveOffer();
    loadAnalytics();
  } catch (err) {
    console.error(err);
  }
}

async function loadAnalytics() {
  try {
    const response = await fetch(`${API_BASE_URL}/merchant/analytics`);
    const responseData = await response.json();
    if (!response.ok || responseData.success === false) throw new Error(responseData.message || `Analytics request failed: ${response.status}`);
    const analytics = responseData.data.analytics;
    Object.entries(analytics).forEach(([key, value]) => {
      const metric = document.querySelector(`[data-analytics="${key}"]`);
      if (metric) metric.textContent = key === 'potentialVisitors' ? `${value}%` : value;
    });
  } catch (error) {
    console.error('Unable to load analytics', error);
    offerStatus.textContent = error.message || 'Unable to load live analytics. Please try again.';
  }
}

function validateOffer(offer) {
  return Number.isInteger(offer.discount) && offer.discount >= 1 && offer.discount <= 100 && Boolean(offer.duration) && Boolean(offer.targetVibe);
}

const offerForm = document.querySelector('.offer-form');
const discountInput = offerForm.querySelector('[name="discount"]');
discountInput.type = 'number';
discountInput.min = '1';
discountInput.max = '100';
discountInput.required = true;

offerForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('.broadcast');
  const formData = new FormData(event.currentTarget);
  const discount = Number(formData.get('discount'));
  const offer = { 
    discount, 
    duration: formData.get('duration'), 
    targetVibe: formData.get('vibe'),
    experienceId: formData.get('experienceId')
  };
  
  if (!validateOffer(offer)) {
    discountInput.setCustomValidity('Enter a discount from 1 to 100 percent.');
    discountInput.reportValidity();
    return;
  }
  discountInput.setCustomValidity('');
  button.disabled = true;
  button.textContent = 'Broadcasting offer...';
  try {
    await broadcastOffer(offer);
    button.classList.add('sent');
    button.textContent = '✓ Broadcast live';
    setTimeout(() => {
      button.classList.remove('sent');
      button.textContent = '⚡ Broadcast Offer';
    }, 3000);
    loadActiveOffer();
    loadAnalytics();
  } catch (error) {
    console.error('Unable to broadcast offer', error);
    button.textContent = 'Try broadcast again';
    alert(error.message || 'Offer could not be broadcast. Please try again.');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('.notification').onclick = () => {
  alert('No new merchant notifications.');
};
document.querySelector('.mobile-menu').onclick = () => {
  alert('Ratnagiri merchant console active.');
};

// Verify authentication and load data
verifyAuth().then(authenticated => {
  if (authenticated) {
    loadMerchantData();
    loadActiveOffer();
    loadAnalytics();
    loadMerchantMap();
  }
});
