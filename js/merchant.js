const vibes = ['Solo & Quiet', 'Local Artisans', 'Hidden Food', 'Culture & Heritage', 'Nightlife'];
const API_BASE_URL = '/api';
const USE_REMOTE_API = true;
const app = document.querySelector('#merchant-app');
app.innerHTML = `<div class="app-shell"><div class="folk-pattern top-pattern"></div><div class="folk-pattern side-pattern"></div><div class="marigold marigold-one">✿</div><div class="marigold marigold-two">✿</div><nav class="topbar"><a class="brand" href="customer.html"><span class="gem">◆</span><span>HiddenGems<span>AI</span></span></a><div class="context">⌖ <span>Downtown Quarter</span><i></i><span>☀ Clear 26°C</span></div><div class="nav-actions"><button class="rain-button" onclick="location.href='customer.html'">← <span>Traveler view</span></button><button class="notification" aria-label="Notifications">♧<b></b></button><div class="mode-toggle"><button onclick="location.href='customer.html'">Traveler</button><button class="active">Merchant</button></div><button class="mobile-menu" aria-label="Menu">☰</button></div></nav><main class="merchant"><header class="merchant-hero"><p class="eyebrow">⚡ MERCHANT PORTAL</p><h1>Turn nearby intent into <em>footfall.</em></h1><p>Surface the right offer to travelers who are ready to discover something special.</p></header><section class="merchant-grid"><div class="footfall glass"><p class="eyebrow">RIGHT NOW, NEAR YOU</p><div class="footfall-title"><div class="pulse"><span></span></div><div><h2>High traveler footfall</h2><p>Downtown Quarter · 500m radius</p></div></div><div class="metric-row"><div><b data-analytics="nearbyTravelers">—</b><span>active explorers</span></div><div><b data-analytics="potentialVisitors">—</b><span>seeking local picks</span></div><div><b data-analytics="activeOffers">—</b><span>active offers</span></div></div><div class="activity-chart">${[31, 48, 39, 65, 58, 82, 72, 94, 86, 100, 89, 96].map(height => `<i style="height:${height}%"></i>`).join('')}</div></div><form class="offer-form glass"><div><p class="eyebrow">MAKE AN OFFER</p><h2>Create a flash micro-offer</h2></div><label>Discount <div class="input-wrap"><input name="discount" value="20" inputmode="numeric"><span>% OFF</span></div></label><label>Available for <select name="duration"><option>1 hour</option><option selected>2 hours</option><option>Until closing</option></select></label><label>Target vibe <select name="vibe">${vibes.map(vibe => `<option>${vibe}</option>`).join('')}</select></label><button class="broadcast" type="submit">⚡ Broadcast to idle travelers</button></form></section></main></div>`;

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

async function loadActiveOffer() {
  if (!USE_REMOTE_API) return;
  try {
    const response = await fetch(`${API_BASE_URL}/offers`);
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || `Offer request failed: ${response.status}`);
    const offer = data.data?.offers && data.data.offers[data.data.offers.length - 1];
    if (offer) updateOfferStatus(offer, { status: offer.status });
  } catch (error) {
    console.error('Unable to load active offers', error);
    offerStatus.textContent = error.message || 'Unable to load offers. Please try again.';
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
function updateOfferStatus(offer, result) {
  offerStatus.textContent = `${offer.discount}% off · ${offer.duration} · ${offer.targetVibe} · ${result.status === 'demo' ? 'Demo offer active' : 'Live'}`;
}

const offerForm = document.querySelector('.offer-form');
const discountInput = offerForm.querySelector('[name="discount"]');
discountInput.type = 'number';
discountInput.min = '1';
discountInput.max = '100';
discountInput.required = true;
const offerStatus = document.createElement('p');
offerStatus.className = 'offer-status';
offerStatus.textContent = 'No live offer yet';
offerForm.append(offerStatus);

offerForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('.broadcast');
  const formData = new FormData(event.currentTarget);
  const discount = Number(formData.get('discount'));
  const offer = { discount, duration: formData.get('duration'), targetVibe: formData.get('vibe') };
  if (!validateOffer(offer)) {
    discountInput.setCustomValidity('Enter a discount from 1 to 100 percent.');
    discountInput.reportValidity();
    return;
  }
  discountInput.setCustomValidity('');
  button.disabled = true;
  button.textContent = 'Broadcasting offer...';
  try {
    const result = await broadcastOffer(offer);
    button.classList.add('sent');
    button.textContent = '✓ Broadcast live';
    updateOfferStatus(result.data.offer, result);
    loadAnalytics();
  } catch (error) {
    console.error('Unable to broadcast offer', error);
    button.textContent = 'Try broadcast again';
    offerStatus.textContent = 'Offer could not be broadcast. Please try again.';
  } finally {
    button.disabled = false;
  }
});

document.querySelector('.notification').onclick = () => {
  offerStatus.textContent = 'No new merchant notifications.';
};
document.querySelector('.mobile-menu').onclick = () => {
  offerStatus.textContent = 'Use the Traveler and Merchant controls to switch views.';
};
loadActiveOffer();
loadAnalytics();
