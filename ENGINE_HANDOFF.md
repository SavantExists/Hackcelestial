# HiddenGemsAI: Engine Handoff

This document describes the current repository as implemented. Treat the source files as authoritative if this document and code ever differ.

## Project At A Glance

HiddenGemsAI is a small full-stack local-discovery prototype. Travelers select available time, budget, and interests, then receive a ranked list and itinerary. Merchants can publish time-limited discounts targeted to an interest group and view simple analytics.

- Frontend: plain HTML, CSS, and browser JavaScript. UI is generated in JavaScript, not a component framework; the traveler page uses Leaflet with OpenStreetMap tiles.
- Backend: Node.js with Express 5.
- Persistence: JSON files for experience catalog, offers, and bookings. Weather simulation is held only in server memory.
- No database, authentication, user-session system, build step, or test suite is configured.
- Images in the experience catalog are remote Unsplash URLs. The server exposes `/images`, but there is no `images/` directory in the current project.

## Full Project Structure

```text
Hackcelestial/
|-- .git/                              Git metadata (not application source)
|-- .gitignore                         Ignored files and generated artifacts
|-- ENGINE_HANDOFF.md                  This engine-facing project guide
|-- README.md                          Brief setup instructions and API overview
|-- package.json                       npm scripts and dependency declarations
|-- package-lock.json                  Locked npm dependency tree
|-- index.html                         Redirects the browser to customer.html
|-- customer.html                      Traveler page shell and script/style loading
|-- merchant.html                      Merchant page shell and script/style loading
|-- css/
|   |-- styles.css                     Shared application styling and responsive rules
|   `-- maximalist.css                 Currently comment-only stylesheet placeholder
|-- js/
|   |-- customer.js                    Traveler UI, state, API calls, and interactions
|   `-- merchant.js                    Merchant UI, offer form, and analytics calls
`-- server/
    |-- server.js                      Express setup, static pages, middleware, API mounts
    |-- controllers/
    |   |-- bookingController.js        Validates and persists traveler bookings
    |   |-- experienceController.js     Reads, enriches, filters, and scores catalog items
    |   |-- itineraryController.js      Generates/validates itineraries and confirmations
    |   |-- merchantController.js       Produces merchant analytics
    |   |-- offerController.js          Reads, validates, creates, and deletes offers
    |   |-- recommendationController.js Validates preferences and ranks recommendations
    |   `-- weatherController.js        Reads and mutates simulated weather state
    |-- data/
    |   |-- bookings.json              Persisted booking records
    |   |-- experiences.json           50 supplied Ratnagiri experience records
    |   |-- offers.json                Seeded merchant-offer records
    |   `-- users.json                  Example traveler/merchant records; currently unused
    `-- routes/
        |-- bookingRoutes.js           Booking endpoint declarations
        |-- experienceRoutes.js        Experience endpoint declarations
        |-- itineraryRoutes.js         Itinerary endpoint declarations
        |-- merchantRoutes.js          Merchant analytics endpoint declarations
        |-- offerRoutes.js              Offer endpoint declarations
        |-- recommendationRoutes.js    Recommendation endpoint declaration
        `-- weatherRoutes.js            Weather endpoint declarations
```

## Run It

Requirements: Node.js and npm.

```sh
npm install
npm start
```

The server listens on `PORT` when configured, otherwise port `3000`. Open `http://localhost:3000/`, `/customer.html`, or `/merchant.html`. `npm run dev` starts the same server with nodemon. dotenv loads `.env` from the repository root; currently `PORT` is the only application setting read from the environment.

## File Responsibilities And Variables

### Root files

- `package.json`: package name `hiddengems-ai`; scripts are `start` (`node server/server.js`) and `dev` (`nodemon server/server.js`). Runtime packages are Express, CORS, and dotenv; nodemon is a development dependency.
- `package-lock.json`: npm lockfile, version 3. Do not edit by hand.
- `.gitignore`: excludes dependencies, environment files, logs, editor/OS files, temporary output, and build/coverage output.
- `README.md`: short installation/start instructions and a partial API list.
- `index.html`: immediate meta-refresh redirect to `customer.html`.
- `customer.html`: defines `#customer-app`; loads `css/styles.css`, `css/maximalist.css`, the Lucide CDN script, then `js/customer.js`.
- `merchant.html`: defines `#merchant-app`; loads the same styles and Lucide, then `js/merchant.js`.

### Frontend

`js/customer.js` owns traveler UI and client state.

- Top-level constants: `initialExperiences` and `rainExperiences` (both empty fallback arrays), `API_BASE_URL` (`/api`), `USE_REMOTE_API` (`true`), `vibes` (allowed interest labels), `iconNames` (glyph-to-Lucide names), `icon` (glyph markup helper), and `app` (`#customer-app`).
- `state` fields: `hours` (default `2.5`), `budget` (default `$$`), `chosenVibes` (initially Local Artisans and Culture & Heritage), `rain`, `itinerary` (initial IDs `[2, 1, 3]`), `originalItinerary`, `saved` (saved experience IDs), `currentExperiences`, `weather` (`condition`, `temperature`), and `itinerarySummary` (last API validation summary).
- `initializeIcons(root)`: replaces icon glyphs under a DOM root and asks Lucide to render them. Locals: `icons`, `markup`.
- `requestJson(endpoint, fallback, options)`: fetch wrapper; checks HTTP and API success, reports an alert on errors, and returns `fallback` on failure. Locals: `response`, `payload`, `error`.
- `getExperiences()`: requests `/experiences?rain=...`; locals `fallback`, `data`. `getMerchantOffers()`: requests `/offers`; local `data`; currently unused.
- `refreshWeather()`: reads `/weather` and updates `state.weather`; local `data`.
- `generateRoute()`: posts the current traveler preferences to `/recommendations`, then updates `currentExperiences` and itinerary. Locals: `fallback`, `route`.
- `header()`: builds nav/header markup; local `weatherIcon`.
- `card(item, index)`: builds one experience card; local `added`.
- `map()`: builds the Leaflet map panel and `#map-container` mount point.
- `renderMap(experiences)`: initializes Leaflet centered on Ratnagiri, constrains panning/zooming to configured bounds, loads OpenStreetMap tiles, and creates vibe-colored markers from coordinates. Locals include `mapContainer`, `ratnagiriBounds`, `primaryVibe`, `pinColor`, `customIcon`, and `marker`.
- `updateMapItineraryHighlights()`: dims unselected markers and draws a dashed polyline through selected marker coordinates in itinerary order; locals include `activeItineraryIds`, `selectedPoints`, `numericId`, `marker`, and `latLng`.
- `updateItinerary(experiences)`: computes selected items, elapsed minutes, and remaining minutes. Locals: `items`, `used`, `remaining`.
- `calculateFeasibility(experience, preferences)`: computes fit from budget, matching vibes, visit time, weather, venue status, merchant discount, and base score. Locals include `budgetLevels`, `matchingVibes`, `visitMinutes`, `budgetScore`, `timeScore`, `weatherScore`, `venueScore`, and `offerScore`.
- `getScoredExperiences(source)`: adds/normalizes `fit` and `match`, then sorts descending by fit. Locals: `experiences`, `fit`, `item`.
- `render(source)`: generates the full traveler UI, including experience cards, controls, map, and itinerary; initializes icons and binds handlers.
- `addToItinerary(id, button)`: posts proposed IDs to `/itinerary`; local `result`; updates itinerary and summary when valid.
- `removeFromItinerary(id)`: deletes one itinerary ID through `/itinerary/:experienceId`; local `result`; updates itinerary and summary.
- `simulateRain(button)`: snapshots the current itinerary, posts rain simulation, refreshes weather and recommendations. Locals: `weather`, `error`.
- `restoreRoute(button)`: restores clear weather, restores the saved itinerary, refreshes weather and recommendations. Locals: `weather`, `error`.
- `bookItinerary(button)`: posts `{ experiences, totalTime }` to `/bookings`; derives `totalTime` from `itinerarySummary` or experience duration plus travel. Local: `result`.
- `bindEvents()`: wires range, budget, vibe, add/remove/save, booking, weather, alert, and collapse interactions. Relevant locals/handler values include `button`, `experiences`, `items`, `used`, `capacity`, `remaining`, `saved`, `bookButton`, and `timeline`.
- `showAlert(message)`: displays and auto-removes an alert; locals `alerts`, `alert`, `title`, `detail`.
- `initializeCustomer()`: checks `/health`, refreshes weather, generates a route; local `health`. Called at module load.

`js/merchant.js` owns the merchant dashboard.

- Top-level constants: `vibes`, `API_BASE_URL` (`/api`), `USE_REMOTE_API` (`true`), and `app` (`#merchant-app`). The five vibes are `Solo & Quiet`, `Local Artisans`, `Hidden Food`, `Culture & Heritage`, and `Nightlife`.
- `initializeIcons(root)`: replaces glyphs and initializes Lucide; locals `icons`, `markup`.
- `initializeMerchant()`: calls icon initialization.
- `broadcastOffer(offer)`: posts an offer to `/offers`; locals `response`, `payload`.
- `loadActiveOffer()`: reads active offers and shows the last one in the status line; locals `response`, `data`, `offer`, `error`.
- `loadAnalytics()`: reads `/merchant/analytics` and fills matching data hooks; locals `response`, `responseData`, `analytics`, `key`, `value`, `metric`, `error`.
- `validateOffer(offer)`: requires integer discount 1-100 and non-empty duration/targetVibe.
- `updateOfferStatus(offer, result)`: builds status text from `discount`, `duration`, `targetVibe`, and result status.
- DOM references: `offerForm`, `discountInput`, and dynamically created `offerStatus`.
- Form submit derives `button`, `formData`, `discount`, and `offer` (`discount`, `duration`, `targetVibe`), broadcasts it, then refreshes analytics. Notifications and menu controls only change status text.

`css/styles.css` provides shared layouts, typography, controls, map, experience cards, itinerary, alerts, merchant dashboard, and responsive rules at 1080px, 850px, and 700px. Font imports are DM Mono, Manrope, and Playfair Display. There are no CSS custom properties; customer cards set an inline `--delay` value for animation timing. `css/maximalist.css` currently contains only a comment and adds no rules.

### Backend and routes

`server/server.js` configures the app. Top-level imports/constants are dotenv, `express`, `cors`, `path`, `readOffers`, all route modules, `app`, and `port` (`Number(process.env.PORT) || 3000`). `app.locals.readOffers` exposes offer-file access to controllers; `app.locals.weatherCondition` starts as `clear`. Middleware enables CORS, JSON and URL-encoded request parsing, and static `/css`, `/js`, `/images`. It serves traveler pages at `/`, `/customer`, `/customer.html`; merchant pages at `/merchant`, `/merchant.html`; returns health at `/api/health`; and has API 404 and JSON/error handlers. Error-handler parameters are `error`, `req`, `res`, `next`.

Route modules create an Express `router`, import their controller handlers, register methods/paths, and export `router`:

- `bookingRoutes.js`: `POST /` -> `createBooking`.
- `experienceRoutes.js`: `GET /` -> `getExperiences`; `GET /:id` -> `getExperienceById`.
- `itineraryRoutes.js`: `POST /generate` -> `generateItinerary`; `POST /book` -> `bookItinerary`; `POST /` -> `createItinerary`; `DELETE /:experienceId` -> `removeFromItinerary`.
- `merchantRoutes.js`: `GET /analytics` -> `getAnalytics`.
- `offerRoutes.js`: `GET /` -> `getOffers`; `POST /` -> `createOffer`; `DELETE /:id` -> `deleteOffer`.
- `recommendationRoutes.js`: `POST /` -> `getRecommendations`.
- `weatherRoutes.js`: `GET /` -> `getWeather`; `POST /simulate` -> `simulateWeather`; `POST /restore` -> `restoreWeather`.

Route prefixes are registered in `server.js`: `/api/bookings`, `/api/experiences`, `/api/itineraries`, `/api/itinerary` (same itinerary router alias), `/api/merchant`, `/api/offers`, `/api/recommendations`, `/api/weather`.

Controller-specific variables and behavior:

- `experienceController.js`: `experiencesPath`, `budgetLevels` (`$`=1, `$$`=2, `$$$`=3). `readExperiences()` reads catalog. `activeOfferForExperience(experience, offers)` finds the largest live, unexpired offer whose target vibe belongs to the experience. `applyOffers(experiences, offers)` adds computed `merchantOffer`; `minutes(value)` parses the leading integer; `queryScore(experience, { budget, vibe, time, rain })` scores query matches. `getExperiences(req,res)` reads query fields, filters for weather/budget/vibe/time, adds `fit`, sorts, responds; locals include `budget`, `vibe`, `time`, `rain`, `offers`, `experiences`, `first`, `second`. `getExperienceById(req,res)` loads enriched catalog and matches numeric `id`.
- `recommendationController.js`: `allowedVibes` set; `minutes(value)` parses leading integer; `suitability(experience, preferences)` calculates `visitMinutes`, `matchingVibes`, budget/nearby/weather/offer/venue scores and final score. `getRecommendations(req,res)` validates `availableTime`, `budget`, `vibes`, `weather`; constructs `preferences`; enriches, filters, scores, and sorts `recommendations`; greedily selects IDs into `itinerary` and accumulates `usedMinutes`. Exports `getRecommendations`.
- `itineraryController.js`: imports `readExperiences`, `budgetLevels`. `minutes(value)` parses duration; `scoreExperience(experience, preferences)` scores vibe, budget, weather, available time, and offer. `generateItinerary(req,res)` builds `preferences` from body fields `hours`, `budget`, `vibes`, `rain`; reads `offers`; maps catalog into `experiences` with `activeOffer`, `enriched`, `fit`, `match`; builds `itinerary` and `usedMinutes`. `validateItinerary(experienceIds, availableTime)` uses `ids`, `capacity`, `catalog`, `selected`, `totalMinutes`, `availableMinutes`, returns a validation object or `error`. `formatItinerary(validation)` returns `remainingMinutes`, `success`, `totalTime`, `availableTime`, `remainingTime`, `stops`, `feasible`, `itinerary`, and selected `experiences`. `createItinerary(req,res)` validates request and feasibility. `removeFromItinerary(req,res)` uses path `id`, filters request `experiences`, handles empty route, validates and formats. `bookItinerary(req,res)` validates `experienceIds` against `available` catalog and returns a non-persisted confirmation.
- `bookingController.js`: `bookingsPath`; `readBookings()` and `writeBookings(bookings)` access JSON. `createBooking(req,res)` reads `experienceIds` from body `experiences`, `totalTime`, and `catalog`; validates 1-3 unique integer catalog IDs and time, computes `expectedMinutes`, builds `booking` (`bookingId`, `experiences`, `totalTime`, `createdAt`), appends to `bookings`, persists, and returns confirmation.
- `offerController.js`: `offersPath`, `allowedDurations` map (`1 hour` -> 1, `2 hours` -> 2, `Until closing` -> 8), `allowedVibes` set. `readOffers()` / `writeOffers(offers)` access JSON. `getOffers(req,res)` filters using `now`. `createOffer(req,res)` reads `discount`, `duration`, `targetVibe`; validates; computes `createdAt`, `offer` (`id`, `discount`, `duration`, `targetVibe`, `status`, `createdAt`, `expiresAt`), appends and writes `offers`. `deleteOffer(req,res)` locates `req.params.id` using `index`, removes `offer`, persists, returns removed and remaining offers.
- `merchantController.js`: `getAnalytics(req,res)` derives `now` and counts `activeOffers`; returns fixed `nearbyTravelers: 186`, `potentialVisitors: 64` plus that count.
- `weatherController.js`: `getWeather(req,res)` derives boolean `rain` from query or app-local simulated condition and returns a weather object. `simulateWeather(req,res)` accepts only body `condition: "rain"`, sets local `condition` and app state. `restoreWeather(req,res)` sets state to `clear`.

## Data Schemas

The JSON catalog stores the source dataset fields. The server's `normalizeExperience()` in `experienceController.js` preserves each source field and adds the app-facing fields used by current UI/controllers.

```json
{
  "id": 1,
  "name": "Hotel Amantran",
  "category": "food",
  "vibes": "food seafood malvani local cuisine traditional",
  "cost": 400,
  "duration_hours": 1.5,
  "weather_type": "indoor",
  "max_group_size": 6,
  "lat": 16.9947,
  "lon": 73.3,
  "description": "Popular Ratnagiri seafood restaurant serving Malvani-style local food and fish thali."
}
```

There are 50 supplied records (IDs 1-50) covering food, solo activities, adventure, nightlife, and cultural places. Source fields are `id`, `name`, `category`, free-text `vibes`, numeric `cost`, `duration_hours`, `weather_type`, `max_group_size`, `lat`, `lon`, and `description`. The API preserves those and adds `title`, `kind`, normalized `vibe` labels, `lng`, duration/travel strings, budget tier, approximate distance, score/match, indoor/weather flags, unknown `venueStatus`, merchant discount, display image/search metadata, map pin, and clear-weather availability.

Derived travel time is an estimate calculated from straight-line distance to Ratnagiri center with a road-distance multiplier and assumed 25 km/h driving speed; it is not routing data. Costs map to `$` through 350, `$$` through 700, and `$$$` above 700. `weather_type: "indoor"` maps to covered; `mixed` is treated as covered for rain filtering. Venue opening status is unknown unless a future record explicitly marks it `closed`. `lon` remains the source coordinate and `lng` is its Leaflet/API alias. Supplied `image_url` values were Google image-search result pages rather than direct image files, so normalized API records generate a search URL and use category-level Unsplash imagery for cards.

- `offers.json`: array of `{ id, discount, duration, targetVibe, status, createdAt, expiresAt }`. IDs/status/labels/timestamps are strings, discount is numeric. Seed offer expiry is `2026-09-24T17:56:10.822Z`; as of 2026-09-26 it is expired and excluded from active offer logic.
- `bookings.json`: array of `{ bookingId, experiences, totalTime, createdAt }`; `experiences` is an array of numeric experience IDs, `totalTime` is hours as a number.
- `users.json`: array of `{ id, role, name }`; seeded roles are `traveler` and `merchant`. Currently no route/controller reads it.

## API Reference

Success responses generally use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`. The itinerary summary itself also contains a `success` field. JSON request bodies require `Content-Type: application/json`.

| Method and path | Request fields | Result / behavior |
|---|---|---|
| `GET /api/health` | None | `data.message` indicates server is running. |
| `GET /api/experiences` | Query: `budget`, `vibe`, `time` (hours), `rain=true`, or `weather=rain` | `data.experiences`, `data.count`; filters/sorts catalog and includes computed `fit`. |
| `GET /api/experiences/:id` | Path `id` | `data.experience`; 404 when absent. |
| `POST /api/recommendations` | `{ availableTime, budget, vibes, weather }`; availableTime 1-8, valid budget, non-empty valid vibe list, weather `rain` or `clear` | `data.recommendations`, `data.itinerary` (IDs), `data.usedMinutes`, `data.preferences`. |
| `POST /api/itinerary/generate` or `/api/itineraries/generate` | `{ hours, budget, vibes, rain }` | Generates scored catalog, itinerary IDs, used minutes, and preferences. This older route is not used by current customer UI. |
| `POST /api/itinerary` or `/api/itineraries` | `{ experiences: [id, ...], availableTime }` | Validates 1-3 unique IDs and time; returns itinerary IDs, selected records, total/remaining hours, stops, feasibility. |
| `DELETE /api/itinerary/:experienceId` or `/api/itineraries/:experienceId` | Body `{ experiences: [id, ...], availableTime }` | Removes ID and returns updated summary. |
| `POST /api/itinerary/book` or `/api/itineraries/book` | `{ experienceIds: [id, ...] }` | Returns `data.booking` with `confirmationId`, `experienceIds`, `status: "reserved-for-review"`; does not persist. |
| `POST /api/bookings` | `{ experiences: [id, ...], totalTime }` | Validates totalTime against catalog duration + travel and persists booking. Returns `data.bookingId`, `data.message`. This is the endpoint used by customer UI. |
| `GET /api/offers` | None | Active, unexpired `data.offers` and `data.count`. |
| `POST /api/offers` | `{ discount, duration, targetVibe }` | Discount must be integer 1-100; duration and vibe must be allowed. Creates/persists an offer; returns `data.offer`. |
| `DELETE /api/offers/:id` | Path `id` | Removes offer; returns removed `data.offer` and remaining `data.offers`; 404 if absent. |
| `GET /api/weather` | Optional query `rain=true` | Returns `data.weather` with `condition`, `temperature`, `icon`, `alert`. Explicit `rain=false` produces clear weather; no query uses simulated server state. |
| `POST /api/weather/simulate` | `{ condition: "rain" }` | Sets in-memory weather state to rain and returns condition. |
| `POST /api/weather/restore` | None | Resets in-memory weather state to clear. |
| `GET /api/merchant/analytics` | None | `data.analytics`: `nearbyTravelers`, `potentialVisitors`, `activeOffers`. |

Allowed vibes everywhere: `Solo & Quiet`, `Local Artisans`, `Hidden Food`, `Culture & Heritage`, `Nightlife`. Allowed budgets: `$`, `$$`, `$$$`. Allowed offer durations: `1 hour`, `2 hours`, `Until closing`.

## Browser UI Hooks

- Customer mount: `#customer-app`. IDs: `#hours`, `#hours-value`, `#rain-toggle`. Data attributes: `data-budget`, `data-vibe`, `data-add`, `data-remove`, `data-lucide`. Event binding also targets `.generate`, `.save`, `.itinerary-footer button`, `.notification`, `.mobile-menu`, `.map-header button`, `.text-button`, and `.itinerary-top button`.
- Merchant mount: `#merchant-app`. Form fields: `name="discount"`, `name="duration"`, `name="vibe"`. Analytics hooks: `data-analytics="nearbyTravelers|potentialVisitors|activeOffers"`. Buttons/classes include `.broadcast`, `.notification`, `.mobile-menu`.
- Both pages use `app-shell`, `topbar`, `brand`, `nav-actions`, `mode-toggle`, pattern decorations, and Lucide glyph replacement.
- Customer-facing vibe controls show the five allowed vibe strings listed above. The Leaflet map uses `lat`, `lng`, `vibe`, `pin`, and itinerary IDs; cards consume `image`, `title`, `kind`, `distance`, `duration`, `budget`, and `fit`.

## Important Behavior And Caveats

- The user interface calls `POST /api/recommendations`, `POST /api/itinerary`, `DELETE /api/itinerary/:experienceId`, `POST /api/bookings`, weather endpoints, and merchant offer/analytics endpoints. The separate generate-itinerary and non-persisting itinerary-book endpoints are available but not used by current UI.
- Merchant offers and bookings are synchronously read/written to local JSON files. Concurrent writes are not coordinated; this is suitable for a demo, not multi-user production use.
- Weather is process-local memory. Restarting the server resets it to clear; multiple server processes would not share weather state.
- The traveler page has a real interactive Leaflet street map with OpenStreetMap tiles, but no live user location or road-routing service; the itinerary route is a straight dashed polyline between seeded coordinates. The displayed traveler count and merchant analytics are demo values. There is no authentication or payment flow.
- Customer offline fallback arrays are empty, so a failed recommendation call leaves discovery without fallback records. `getMerchantOffers()` is currently unused.
- `state.itinerarySummary` can become stale when `generateRoute()` replaces itinerary IDs; booking prefers its `totalTime` when present. Verify this if changing route/booking behavior.
- Recommendation itinerary generation accumulates `usedMinutes` while selecting all fitting recommendations, then limits IDs to three; with more than three fitting entries the reported minutes can include entries not in the returned itinerary.
- The older itinerary generator uses `Boolean(req.body.rain)`, so a string value `"false"` is truthy. The current customer UI uses the recommendation endpoint instead.
- `USE_REMOTE_API` is true in both frontends. Merchant demo mode returns an offer shape that the current submit handler does not consume correctly if the flag is switched to false.
- `css/maximalist.css` and `server/data/users.json` are placeholders/unused in current execution.

## Guidance For A Downstream Engine

Preserve the existing plain-JavaScript/Express structure unless a migration is explicitly requested. Keep endpoint request and response shapes synchronized between `js/`, `server/routes/`, and `server/controllers/`. Treat JSON data fields above as the current domain contract. Do not assume mock analytics or itinerary confirmations represent persisted, authenticated, or paid transactions.