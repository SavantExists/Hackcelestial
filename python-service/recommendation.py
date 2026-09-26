from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util
import math
from datetime import datetime, timedelta

app = Flask(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)

def experience_text(experience):
    name = experience.get("name") or experience.get("title") or ""
    vibes = experience.get("vibes") or experience.get("vibe") or []
    if not isinstance(vibes, list):
        vibes = [str(vibes)]
    description = experience.get("description") or ""
    return f"{name}. Vibe keywords: {', '.join(vibes)}. Description: {description}"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) * math.sin(dLat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) * math.sin(dLon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_coords(exp):
    if "latitude" in exp and "longitude" in exp:
        if exp["latitude"] is not None and exp["longitude"] is not None:
            return float(exp["latitude"]), float(exp["longitude"])
    if "lat" in exp and "lon" in exp:
         if exp["lat"] is not None and exp["lon"] is not None:
             return float(exp["lat"]), float(exp["lon"])
    if "lat" in exp and "lng" in exp:
         if exp["lat"] is not None and exp["lng"] is not None:
             return float(exp["lat"]), float(exp["lng"])
    return None

def parse_time(time_str):
    try:
        return datetime.strptime(time_str.strip(), "%I:%M %p")
    except ValueError:
        return datetime.strptime("09:00 AM", "%I:%M %p")

@app.route("/predict", methods=["POST"])
def predict():
    payload = request.json
    start_time_str = payload.get("start_time", "09:00 AM")
    time_available_hours = float(payload.get("time_available_hours", 5))
    budget_limit = float(payload.get("budget_limit", 1500))
    user_vibes = payload.get("user_vibes", [])
    experiences = payload.get("experiences", [])
    
    start_time = parse_time(start_time_str)
    end_time = start_time + timedelta(hours=time_available_hours)
    
    preference_text = "User vibe preferences: " + ", ".join(user_vibes)
    texts = [preference_text] + [experience_text(exp) for exp in experiences]
    
    if len(experiences) > 0:
        embeddings = model.encode(texts, convert_to_tensor=True, normalize_embeddings=True)
        similarities = util.cos_sim(embeddings[0], embeddings[1:])[0].tolist()
    else:
        similarities = []
        
    for idx, exp in enumerate(experiences):
        exp["vibe_score"] = float(similarities[idx]) * 100
        
    itinerary = []
    total_spent = 0
    current_time = start_time
    current_location = None
    available_candidates = [exp for exp in experiences]
    
    while True:
        best_candidate = None
        best_score = -float("inf")
        best_distance = 0
        best_travel_time = 0
        
        for exp in available_candidates:
            cost = float(exp.get("cost", 0) or 0)
            if total_spent + cost > budget_limit:
                continue
                
            coords = get_coords(exp)
            if current_location is None or coords is None:
                distance_km = 0
            else:
                distance_km = haversine(current_location[0], current_location[1], coords[0], coords[1])
                
            travel_hours = (distance_km / 20) + 0.15 if current_location is not None else 0
            duration_hours = float(exp.get("duration_hours", 1.0))
            
            if current_time + timedelta(hours=travel_hours + duration_hours) > end_time:
                continue
                
            combined_score = exp["vibe_score"] - (distance_km * 0.05)
            
            if combined_score > best_score:
                best_score = combined_score
                best_candidate = exp
                best_distance = distance_km
                best_travel_time = travel_hours
                
        if best_candidate is None:
            break
            
        cost = float(best_candidate.get("cost", 0) or 0)
        total_spent += cost
        arrival_time = current_time + timedelta(hours=best_travel_time)
        departure_time = arrival_time + timedelta(hours=float(best_candidate.get("duration_hours", 1.0)))
        time_slot = f"{arrival_time.strftime('%I:%M %p')} - {departure_time.strftime('%I:%M %p')}"
        
        itinerary.append({
            "id": best_candidate.get("id"),
            "timeSlot": time_slot,
            "placeName": best_candidate.get("name") or best_candidate.get("title") or "Unknown",
            "dlVibeMatch": round(best_candidate["vibe_score"], 1),
            "cost": cost,
            "description": best_candidate.get("description", ""),
            "duration_hours": best_candidate.get("duration_hours"),
            "distance": f"{round(best_distance, 1)} km",
            "image": best_candidate.get("image", ""),
            "kind": best_candidate.get("kind", ""),
            "fit": round(best_candidate["vibe_score"], 1),
            "match": round(best_candidate["vibe_score"], 1),
            "duration": best_candidate.get("duration", ""),
            "travel": f"{int(best_travel_time * 60)} min",
            "budget": best_candidate.get("budget", "$")
        })
        
        current_time = departure_time
        coords = get_coords(best_candidate)
        if coords is not None:
            current_location = coords
        available_candidates.remove(best_candidate)
        
    return jsonify({
        "itinerary": itinerary,
        "totalSpent": total_spent,
        "budgetLimit": budget_limit,
        "startTime": start_time.strftime("%I:%M %p"),
        "endTime": current_time.strftime("%I:%M %p"),
        "experiences": experiences
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

