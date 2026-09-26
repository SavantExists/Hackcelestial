Run `npm install` and `npm start`, then open `http://localhost:3000/customer.html` or `http://localhost:3000/merchant.html`.

The Express API is available under `/api`, including `/api/health`, `/api/experiences`, `/api/itineraries`, `/api/offers`, and `/api/weather`.

Merchant ownership is stored explicitly in `server/data/merchant-experiences.json` as
`{ "experienceId": <catalog id>, "merchantId": <user id> }`. Add a link only after
the merchant has been confirmed as the owner; unlinked catalog entries remain unowned.
Authenticated merchants can retrieve their verified listings from `GET /api/merchant/experiences`.

## Semantic recommendations

Install the Python model dependency once with `py -3 -m pip install -r server/ml/requirements.txt`.
The recommendation endpoints use `SentenceTransformer('all-MiniLM-L6-v2')` to return a `vibe_score` cosine similarity for verified, weather-safe, group-safe, and budget-safe experiences. They accept both the legacy preference payload and the canonical fields: `time_available_hours`, `group_size`, `budget_limit`, `weather_condition`, `user_vibes`, and `start_time`.
