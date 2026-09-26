const initialExperiences = [];
const rainExperiences = [];
const API_BASE_URL = '/api';
const USE_REMOTE_API = true;
const vibes = ['Solo & Quiet', 'Local Artisans', 'Hidden Food', 'Culture & Heritage', 'Nightlife'];
// Store traveler preferences and the current route in plain JavaScript.
const state = { hours: 2.5, budget: '$$', chosenVibes: ['Local Artisans', 'Culture & Heritage'], rain: false, itinerary: [2, 1, 3], originalItinerary: [2, 1, 3], saved: [], currentExperiences: initialExperiences, weather: { condition: 'Clear', temperature: 26 }, itinerarySummary: null };
const iconNames = { '⌖': 'map-pin', '☂': 'cloud-rain', '☀': 'sun', '♧': 'bell', '◷': 'clock-3', '＋': 'plus', '↗': 'arrow-up-right', '◆': 'gem', '←': 'arrow-left', '⚡': 'zap', '✦': 'sparkles', '×': 'x', '⌄': 'chevron-down', '★': 'star', '✓': 'check', '☰': 'menu' };
const icon = value => `<i data-lucide="${iconNames[value] || value}" aria-hidden="true"></i>`;
const app = document.querySelector('#customer-app');

// Convert the original icon characters to browser Lucide icons after each render.
function initializeIcons(root = document) {
  const icons = iconNames;
  let markup = root.innerHTML;
  Object.entries(icons).forEach(([character, name]) => { markup = markup.replaceAll(character, `<i data-lucide="${name}" aria-hidden="true"></i>`); });
  root.innerHTML = markup;
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
}

async function requestJson(endpoint, fallback, options = {}) {
  if (!USE_REMOTE_API) return fallback;
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const payload = await response.json();
    if (!response.ok || payload.success === false) throw new Error(payload.message || `Request failed: ${response.status}`);
    return payload;
  } catch (error) {
    console.error(`HiddenGemsAI API fallback for ${endpoint}`, error);
    showAlert(error.message.startsWith('Request failed') ? 'Unable to reach HiddenGemsAI right now. Please try again.' : error.message);
    return fallback;
  }
}
async function getExperiences() {
  const fallback = state.rain ? rainExperiences : initialExperiences;
  const data = await requestJson(`/experiences?rain=${state.rain}`, { experiences: fallback });
  return data.data?.experiences || fallback;
}
async function getMerchantOffers() {
  const data = await requestJson('/offers', { offers: [] });
  return data.data?.offers || [];
}
async function refreshWeather() {
  const data = await requestJson(`/weather?rain=${state.rain}`, null);
  if (data && data.data?.weather) state.weather = data.data.weather;
}
async function generateRoute() {
  const fallback = { experiences: await getExperiences(), itinerary: state.itinerary };
  const route = await requestJson('/recommendations', fallback, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availableTime: state.hours, budget: state.budget, vibes: state.chosenVibes, weather: state.rain ? 'rain' : 'clear' })
  });
  state.currentExperiences = route.data?.recommendations || fallback.experiences;
  state.itinerary = route.data?.itinerary || state.itinerary;
  render(state.currentExperiences);
}

function header() {
  const weatherIcon = state.rain ? '☂' : '☀';
  return `<nav class="topbar"><a class="brand" href="customer.html"><span class="gem">◆</span><span>HiddenGems<span>AI</span></span></a><div class="context">${icon('⌖')}<span>Downtown Quarter</span><i></i><span>${weatherIcon} ${state.weather.condition} ${state.weather.temperature}°C</span></div><div class="nav-actions"><button class="rain-button" id="rain-toggle">☂ <span>${state.rain ? 'Restore original route' : 'Simulate rain / closure'}</span></button><button class="notification" aria-label="Notifications">♧<b></b></button><div class="mode-toggle"><button class="active">Traveler</button><button onclick="location.href='merchant.html'">Merchant</button></div><button class="mobile-menu" aria-label="Menu">☰</button></div></nav>`;
}
function card(item, index) {
  const added = state.itinerary.includes(item.id);
  return `<article class="experience-card" style="--delay:${index * 70}ms"><div class="card-image"><img src="${item.image}" alt="${item.title}"><div class="auth-badge">★ 95% authentic</div><button class="save" aria-label="Save ${item.title}">＋</button></div><div class="card-body"><p class="category">${item.kind}</p><h3>${item.title}</h3><div class="meta"><span>⌖ ${item.distance}</span><span>◷ ${item.duration}</span><span>${item.budget}</span></div><div class="fit"><div><span>AI feasibility</span><b>${item.fit}% fit</b></div><div class="progress"><i style="width:${item.fit}%"></i></div></div><button class="action ${added ? 'added' : ''}" data-add="${item.id}">${added ? '✓ Added to route' : 'Add to itinerary ＋'}</button></div></article>`;
}
function map(experiences) {
  return `<div class="map-panel"><div class="map-header"><span>⌖ LIVE DISCOVERY MAP</span><button>♧ 186 exploring nearby</button></div><div class="water water-a"></div><div class="water water-b"></div><span class="street s1">MERIDIAN ST</span><span class="street s2">SABLE AVE</span><span class="street s3">CATHEDRAL WAY</span>${experiences.map((item, i) => `<div class="pin pin-${i}"><span>${item.pin}</span><div class="pin-label"><b>${item.match}% match</b><small>${item.title}</small></div></div>`).join('')}<div class="you-are-here"><span></span><div><b>You are here</b><small>Downtown Quarter</small></div></div><div class="map-brand">HiddenGems<span>AI</span></div></div>`;
}
function updateItinerary(experiences) {
  const items = state.itinerary.map(id => experiences.find(item => item.id === id) || initialExperiences.find(item => item.id === id)).filter(Boolean);
  const used = items.reduce((total, item) => total + parseInt(item.duration, 10) + parseInt(item.travel, 10), 0);
  const remaining = Math.max(state.hours * 60 - used, 0);
  return `<aside class="itinerary glass"><div class="itinerary-top"><div><p class="eyebrow">⚡ YOUR MICRO-ITINERARY</p><h2>Afternoon of small wonders</h2></div><button aria-label="Collapse itinerary">⌄</button></div><div class="route-progress"><div><span>${Math.floor(used / 60)} hrs ${used % 60} mins used · ${Math.floor(remaining / 60)} hrs ${remaining % 60} mins left</span><b>of ${state.hours} hrs</b></div><div class="progress"><i style="width:${Math.min(used / (state.hours * 60) * 100, 100)}%"></i></div></div><div class="timeline">${items.map((item, index) => `<div class="timeline-item"><div class="step"><span>${index + 1}</span>${index < items.length - 1 ? '<i></i>' : ''}</div><div><p>${item.duration} · ${item.travel}</p><h3>${item.title} <button class="remove-stop" data-remove="${item.id}" aria-label="Remove ${item.title}">×</button></h3><small>${item.kind}</small></div></div>`).join('')}</div><div class="itinerary-footer"><div><span>Total value</span><b>$${items.length ? items.length * 18 + 14 : 0}</b></div><button>Book all & save ↗</button></div></aside>`;
}
function calculateFeasibility(experience, preferences) {
  const budgetLevels = { '$': 1, '$$': 2, '$$$': 3 };
  const matchingVibes = experience.vibe.filter(vibe => preferences.chosenVibes.includes(vibe)).length;
  const visitMinutes = parseInt(experience.duration, 10) + parseInt(experience.travel, 10);
  const budgetScore = budgetLevels[experience.budget] <= budgetLevels[preferences.budget] ? 5 : -4;
  const timeScore = visitMinutes <= preferences.hours * 60 ? 4 : -8;
  const weatherScore = preferences.rain ? (experience.weather === 'covered' ? 10 : -18) : 2;
  const venueScore = experience.venueStatus === 'open' ? 3 : -20;
  const offerScore = Math.min(experience.merchantOffer || 0, 20) / 4;
  return Math.max(20, Math.min(99, Math.round(experience.score + matchingVibes * 3 + budgetScore + timeScore + weatherScore + venueScore + offerScore)));
}
function getScoredExperiences(source) {
  const experiences = source || state.currentExperiences || (state.rain ? rainExperiences : initialExperiences);
  return experiences.map(item => {
    const fit = Number.isFinite(item.fit) ? item.fit : calculateFeasibility(item, state);
    return { ...item, fit, match: Math.min(99, fit + 2) };
  }).sort((first, second) => second.fit - first.fit);
}
function render(source) {
  const experiences = getScoredExperiences(source);
  app.innerHTML = `<div class="app-shell"><div class="folk-pattern top-pattern"></div><div class="folk-pattern side-pattern"></div><div class="marigold marigold-one">✿</div><div class="marigold marigold-two">✿</div>${header()}<header class="hero"><div><p class="eyebrow">✦ AI LOCAL CONCIERGE</p><h1>Your time is short.<br><em>Make it unforgettable.</em></h1><p class="subtitle">We find the little places that turn a free afternoon into a story worth keeping.</p><div class="hand-painted-note">Made for happy wandering <span>✦</span></div></div><div class="hero-art" aria-hidden="true"><div class="hero-sun">☼</div><div class="hero-flower f-one">✿</div><div class="hero-flower f-two">❋</div><div class="hero-flower f-three">✽</div><p>Ghoomo<br>Phiro</p></div><button class="generate">✦ Generate my route ↗</button></header><section class="control-bar glass"><div class="time-control"><div class="control-label">◷ Available time <b id="hours-value">${state.hours} hrs</b></div><input id="hours" type="range" min="1" max="8" step="0.5" value="${state.hours}"><div class="range-labels"><span>1 hr</span><span>8 hrs</span></div></div><div class="divider"></div><div class="budget-control"><div class="control-label">Your budget</div><div class="budget-buttons">${['$', '$$', '$$$'].map(value => `<button class="${state.budget === value ? 'selected' : ''}" data-budget="${value}">${value}</button>`).join('')}</div></div><div class="divider"></div><div class="vibe-control"><div class="control-label">What’s your vibe?</div><div class="vibe-chips">${vibes.map(vibe => `<button class="${state.chosenVibes.includes(vibe) ? 'selected' : ''}" data-vibe="${vibe}">${state.chosenVibes.includes(vibe) ? '✓ ' : ''}${vibe}</button>`).join('')}</div></div></section><main class="content"><section class="discover"><div class="section-head"><div><p class="eyebrow">CURATED FOR YOU</p><h2>${state.rain ? 'A weather-proof adventure' : 'Your hidden gems nearby'}</h2></div><button class="text-button">See all gems ↗</button></div><div class="feed-grid">${map(experiences)}<div class="cards-grid">${experiences.map(card).join('')}</div></div></section>${updateItinerary(experiences)}</main></div>`;
  initializeIcons(app);
  bindEvents();
}
// Add selected experience to the itinerary without allowing duplicates or a fourth stop.
async function addToItinerary(id, button) {
  if (button) { button.disabled = true; button.textContent = 'Adding...'; }
  const result = await requestJson('/itinerary', { success: false, message: 'The itinerary could not be updated.' }, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availableTime: state.hours, experiences: [...state.itinerary, id] })
  });
  if (!result.success) {
    if (button) { button.disabled = false; button.textContent = 'Add to itinerary ＋'; }
    return showAlert(result.message || 'This stop cannot be added to your itinerary.');
  }
  state.itinerary = result.data.itinerary;
  state.itinerarySummary = result.data;
  render(state.currentExperiences);
}
async function removeFromItinerary(id) {
  const result = await requestJson(`/itinerary/${id}`, { success: false, message: 'The itinerary could not be updated.' }, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availableTime: state.hours, experiences: state.itinerary })
  });
  if (!result.success) return showAlert(result.message || 'This stop could not be removed.');
  state.itinerary = result.data.itinerary;
  state.itinerarySummary = result.data;
  render(state.currentExperiences);
}
async function simulateRain(button) {
  if (button) { button.disabled = true; button.querySelector('span').textContent = 'Simulating rain...'; }
  try {
    state.originalItinerary = [...state.itinerary];
    const weather = await requestJson('/weather/simulate', { success: false }, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ condition: 'rain' }) });
    if (!weather.success) return showAlert('Weather simulation could not be started.');
    state.rain = weather.data.condition === 'rain';
    await refreshWeather();
    await generateRoute();
    showAlert();
  } catch (error) {
    console.error('Unable to simulate rain', error);
    showAlert('Weather simulation could not be started.');
  } finally {
    if (button) { button.disabled = false; button.querySelector('span').textContent = 'Simulate rain / closure'; }
  }
}
async function restoreRoute(button) {
  if (button) { button.disabled = true; button.querySelector('span').textContent = 'Restoring route...'; }
  try {
    document.querySelectorAll('.weather-alert').forEach(alert => alert.remove());
    const weather = await requestJson('/weather/restore', { success: false }, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!weather.success) return showAlert('Weather simulation could not be restored.');
    state.rain = false;
    state.itinerary = [...state.originalItinerary];
    await refreshWeather();
    await generateRoute();
    showAlert();
  } catch (error) {
    console.error('Unable to restore weather', error);
    showAlert('Weather simulation could not be restored.');
  } finally {
    if (button) { button.disabled = false; button.querySelector('span').textContent = 'Restore original route'; }
  }
}
async function bookItinerary(button) {
  if (button) { button.disabled = true; button.textContent = 'Saving route...'; }
  const totalTime = state.itinerarySummary ? state.itinerarySummary.totalTime : Number((state.itinerary.reduce((total, id) => {
    const item = state.currentExperiences.find(experience => experience.id === id);
    return total + (item ? parseInt(item.duration, 10) + parseInt(item.travel, 10) : 0);
  }, 0) / 60).toFixed(2));
  const result = await requestJson('/bookings', null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ experiences: state.itinerary, totalTime })
  });
  if (button) { button.disabled = false; button.textContent = 'Book all & save ↗'; }
  showAlert(result && result.success ? `Route saved — confirmation ${result.data.bookingId}` : 'Booking could not be saved. Please try again.');
}
function bindEvents() {
  document.querySelector('#rain-toggle').onclick = event => state.rain ? restoreRoute(event.currentTarget) : simulateRain(event.currentTarget);
  document.querySelector('.generate').onclick = async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Generating route...';
    try {
      await generateRoute();
      showAlert('Route refreshed from your current time, budget, and vibe selections.');
    } catch (error) {
      console.error('Unable to generate route', error);
      showAlert('The route could not be generated. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = '✦ Generate my route ↗';
    }
  };
  document.querySelector('#hours').oninput = event => {
    state.hours = Number(event.target.value);
    const experiences = state.currentExperiences;
    const items = state.itinerary.map(id => experiences.find(item => item.id === id) || initialExperiences.find(item => item.id === id)).filter(Boolean);
    const used = items.reduce((total, item) => total + parseInt(item.duration, 10) + parseInt(item.travel, 10), 0);
    const capacity = state.hours * 60;
    document.querySelector('#hours-value').textContent = `${state.hours} hrs`;
    const remaining = Math.max(capacity - used, 0);
    document.querySelector('.route-progress span').textContent = `${Math.floor(used / 60)} hrs ${used % 60} mins used · ${Math.floor(remaining / 60)} hrs ${remaining % 60} mins left`;
    document.querySelector('.route-progress b').textContent = `of ${state.hours} hrs`;
    document.querySelector('.route-progress .progress i').style.width = `${Math.min(used / capacity * 100, 100)}%`;
  };
  document.querySelectorAll('[data-budget]').forEach(button => button.onclick = () => { state.budget = button.dataset.budget; render(); });
  document.querySelectorAll('[data-vibe]').forEach(button => button.onclick = () => { state.chosenVibes = state.chosenVibes.includes(button.dataset.vibe) ? state.chosenVibes.filter(vibe => vibe !== button.dataset.vibe) : [...state.chosenVibes, button.dataset.vibe]; render(); });
  document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => addToItinerary(Number(button.dataset.add), button));
  document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => removeFromItinerary(Number(button.dataset.remove)));
  document.querySelectorAll('.save').forEach((button, index) => button.onclick = () => {
    const experience = state.currentExperiences[index];
    if (!experience) return;
    const saved = state.saved.includes(experience.id);
    state.saved = saved ? state.saved.filter(id => id !== experience.id) : [...state.saved, experience.id];
    showAlert(saved ? `${experience.title} removed from saved gems.` : `${experience.title} saved for later.`);
  });
  const bookButton = document.querySelector('.itinerary-footer button');
  bookButton.onclick = event => bookItinerary(event.currentTarget);
  document.querySelector('.notification').onclick = () => showAlert('You are all caught up — nearby updates will appear here.');
  document.querySelector('.mobile-menu').onclick = () => showAlert('Use the Traveler and Merchant controls to switch views.');
  document.querySelector('.map-header button').onclick = () => showAlert('186 explorers are discovering Downtown Quarter right now.');
  document.querySelector('.text-button').onclick = async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Loading gems...';
    try {
      await generateRoute();
      showAlert('Showing the gems best matched to your current preferences.');
    } catch (error) {
      console.error('Unable to load all gems', error);
      showAlert('The gems could not be loaded. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = 'See all gems ↗';
    }
  };
  document.querySelector('.itinerary-top button').onclick = event => {
    const timeline = document.querySelector('.timeline');
    timeline.hidden = !timeline.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!timeline.hidden));
  };
}
function showAlert(message) { document.querySelectorAll('.weather-alert').forEach(alert => alert.remove()); const alert = document.createElement('div'); alert.className = 'weather-alert'; const title = message || (state.rain ? 'Weather alert: Rain expected in 15 mins' : 'Route restored: Clear skies ahead'); const detail = message ? 'Your itinerary and recommendations stay synced with your current selections.' : (state.rain ? 'AI is replacing your outdoor walk with a nearby covered artisan market.' : 'Your original outdoor discoveries are back on the route.'); alert.innerHTML = `<div class="alert-icon">☂</div><div><strong>${title}</strong><p>${detail}</p></div><button aria-label="Close">×</button>`; document.body.append(alert); initializeIcons(alert); alert.querySelector('button').onclick = () => alert.remove(); setTimeout(() => alert.remove(), 5000); }
async function initializeCustomer() {
  const health = await requestJson('/health', null);
  if (!health || !health.success) showAlert('The backend is unavailable. Showing the last available recommendations.');
  await refreshWeather();
  await generateRoute();
}
initializeCustomer();
