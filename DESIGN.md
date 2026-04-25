# Parking Plz — System Design

## Overview

Parking Plz is a fullstack web app that lets a user enter a Tel Aviv address and find the
nearest Ahuzat HaHof municipal parking lots, with real-time availability, distance, and
pricing information.

**Tech stack:**
- Frontend: React
- Backend: Python + FastAPI
- External APIs: Tel Aviv Municipality Parking API, Google Maps Geocoding API

---

## Data Sources

There are two external data sources, serving different purposes:

### 1. Ahuzot HaHof Website (Static Data)
**Base URL:** `https://www.ahuzot.co.il`

The website contains static information about all 87 parking lots — addresses, tariff images,
hours, capacity, etc. This data changes infrequently (pricing/address updates happen rarely),
so it is scraped **once at server startup** and cached in memory.

Two pages are scraped per startup:

**Page 1 — Lot list:** `https://www.ahuzot.co.il/Parking/All`
- Scraped to get the full list of all 87 lots
- Provides: lot name (Hebrew), website ID, and street address
- The lot name has the prefix "חניון " stripped so it matches the REST API's `Name` field

**Page 2 — Detail pages:** `https://www.ahuzot.co.il/Parking/ParkingDetails/?ID={website_id}`
- One request per lot (87 requests total, done sequentially at startup)
- Provides: the tariff image URL, extracted via an `<a>` tag with title containing `"תעריף החניון"`
- The tariff image URL is dynamic (filename contains a timestamp) so it must be scraped
  fresh each startup — it cannot be hardcoded
- Every lot has been verified to have a tariff image

**Result after startup scrape:**
A dictionary keyed by lot name, containing:
```python
{
  "בזל": {
    "website_id": "3",
    "name": "בזל",
    "address": "אשתורי הפרחי 5 תל-אביב יפו",
    "tariff_image_url": "https://www.ahuzot.co.il/Parking/Tariff/אחוזות החוף__14042026092309.png",
    "coordinates": { "lat": 32.0853, "lng": 34.7818 }  # added after geocoding
  },
  ...
}
```

### 2. Tel Aviv Municipality REST API (Live Data)
**Endpoint:** `GET https://api.tel-aviv.gov.il/parking/StationsStatus`

- Returns real-time availability for 61 parking lots that have physical sensors
- Called **on every user request** (not cached, since it's live data)
- Each lot in the response looks like:
```python
{
  "AhuzotCode": "10",
  "Name": "בזל",
  "InformationToShow": "פעיל",  # availability status
  "LastUpdateFromDambach": "2026-04-25T15:51:10.473"
}
```
- Only 53 of the 61 API lots overlap with the 87 website lots
- Lots that appear in the API but not in the website static data are included with
  partial information (no tariff image, no address)
- Lots that appear only on the website (no sensor) are shown with availability marked
  as "unknown"

---

## Name Matching (Fuzzy Join)

The website and the REST API use **different naming conventions** for the same lots.
Examples of mismatches found during testing:

| Website name | API name | Issue |
|---|---|---|
| `חוף תל ברוך` | `חוף תל-ברוך` | hyphen difference |
| `כרמל 2` | `כרמל 2 ` | trailing space in API |
| `קצה השדרה (רוטשילד 1)` | `קצה השדרה (רוטשילד1)` | missing space |

**Solution:** Use fuzzy string matching (`thefuzz` library) to join the two datasets by name.
A match with score ≥ 80 is considered a valid match. Anything below is flagged and logged
for manual review.

```python
from thefuzz import process

best_match, score = process.extractOne(api_name, website_names)
if score >= 80:
    # merge the two records
```

---

## Geocoding

Each lot's street address (scraped from the website) is geocoded to `(lat, lng)` coordinates
using the **Google Maps Geocoding API**. This happens **once at startup**, after scraping,
and the result is stored alongside the lot's static data.

Geocoding is done at startup (not per user request) because:
- Addresses don't change
- Geocoding every request would be slow and expensive

If geocoding fails for a lot, that lot is still included in results but distance calculation
is skipped for it.

### API Details

**Endpoint:** `GET https://maps.googleapis.com/maps/api/geocode/json`

**Required parameters:**
- `address` — the Hebrew address string
- `region=il` — biases results toward Israel; prevents ambiguous Hebrew names resolving elsewhere
- `language=iw` — returns Hebrew in the formatted address (useful for logging)
- `key` — API key, loaded from the `GOOGLE_MAPS_API_KEY` environment variable

**HTTP stack:** `requests` + `certifi` (stdlib `urllib` has macOS SSL issues with Hebrew URLs)

```python
import requests
import certifi

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"

def geocode(address: str, api_key: str) -> tuple[float, float] | None:
    """
    Returns (lat, lng) for the given address, or None if geocoding fails.
    """
    params = {
        "address": address,
        "region": "il",
        "language": "iw",
        "key": api_key,
    }
    resp = requests.get(GEOCODING_URL, params=params, timeout=10, verify=certifi.where())
    resp.raise_for_status()
    data = resp.json()

    if data.get("status") != "OK" or not data.get("results"):
        return None

    loc = data["results"][0]["geometry"]["location"]
    return loc["lat"], loc["lng"]
```

### Tested Address Formats

Both address formats used in this app were tested and confirmed to geocode successfully:

**Lot addresses** (scraped from ahuzot.co.il, passed through `region=il`):
```
אשתורי הפרחי 5 תל-אביב יפו
הירקון 2 תל-אביב יפו
הרברט סמואל 40 תל-אביב יפו
דיזנגוף 68 תל-אביב יפו
אלנבי 90 תל-אביב יפו
רוטשילד 1 תל-אביב יפו
```

**User-submitted addresses** (free-form input from the search box):
```
בן יהודה 50, תל אביב
שוק הכרמל
שדרות רוטשילד 22
פלורנטין, תל אביב
```

Landmark and neighborhood inputs (no street number) resolve successfully, though with
`location_type: APPROXIMATE` rather than `ROOFTOP`. This is acceptable for distance ranking.

### Coordinate Caching (Cost Control)

Geocoding 87 lots costs ~$0.43 per server restart (87 requests × $5/1,000). To avoid
paying this on every restart, lot coordinates are persisted to a local file after the
first successful geocoding run.

**File:** `lot_coordinates.json` in the project root
**Format:** a flat dict mapping lot name → `{lat, lng}`

```json
{
  "בזל": { "lat": 32.0853, "lng": 34.7818 },
  "הירקון": { "lat": 32.0891, "lng": 34.7732 },
  ...
}
```

**Startup logic:**

```python
COORDS_CACHE_FILE = "lot_coordinates.json"

def load_or_geocode_coordinates(lots: dict, api_key: str, force_refresh: bool = False) -> dict:
    if not force_refresh and os.path.exists(COORDS_CACHE_FILE):
        with open(COORDS_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)  # skip all 87 API calls

    # Cache miss or forced refresh — geocode everything
    coords = {}
    for name, lot in lots.items():
        result = geocode(lot["address"], api_key)
        if result:
            coords[name] = {"lat": result[0], "lng": result[1]}

    with open(COORDS_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(coords, f, ensure_ascii=False, indent=2)

    return coords
```

**To force a refresh** (e.g. after lot addresses change), restart the server with:

```bash
python main.py --refresh-coords
```

Or simply delete `lot_coordinates.json` and restart normally.

`lot_coordinates.json` should be added to `.gitignore` — it is a local cache, not
source-controlled data.

### Sanity Check

Results should fall within the Tel Aviv metro bounding box:
- Latitude: 31.95 – 32.20
- Longitude: 34.70 – 34.90

Log a warning for any lot that geocodes outside this range.

---

## Per-Request Flow

When a user submits an address:

```
1. Geocode user's address → (user_lat, user_lng)
2. Call Tel Aviv REST API → get live availability for 61 lots
3. For each API lot:
   a. Fuzzy-match its name to the static lookup
   b. If matched: enrich with address, tariff_image_url, coordinates
   c. Calculate distance from user coordinates using Haversine formula
4. For lots in static data but NOT in API response:
   a. Include them with availability = "unknown"
   b. Still calculate distance if coordinates are available
5. Sort all lots by distance
6. Return top N closest lots to the frontend
```

---

## Backend API

A single endpoint exposed by the FastAPI server:

```
GET /api/parking?address=<user address string>
```

**Response shape (per lot):**
```json
{
  "name": "בזל",
  "address": "אשתורי הפרחי 5 תל-אביב יפו",
  "distance_meters": 340,
  "availability": "פעיל",
  "availability_updated_at": "2026-04-25T15:51:10.473",
  "tariff_image_url": "https://www.ahuzot.co.il/Parking/Tariff/...",
  "coordinates": { "lat": 32.0853, "lng": 34.7818 }
}
```

---

## Startup Sequence

```
Server starts
  → Scrape /Parking/All (1 request) → 87 lots with names + addresses
  → Scrape each detail page (87 requests, sequential) → tariff image URLs
  → Load lot_coordinates.json if it exists  ← skip geocoding on warm restarts
      → if missing or --refresh-coords flag: geocode all 87 addresses → save to file
  → Merge coordinates into static lookup dict
  → Server is ready to accept requests
```

Estimated startup time:
- **Warm restart** (coordinates cached): ~2-3 minutes (dominated by the 87 scrape requests)
- **Cold start / refresh** (no cache): ~3-4 minutes (scrape + 87 geocoding requests)

The server should not accept user requests until startup is complete.

---

## What Is NOT Yet Designed

The following will be added to this document once tested and confirmed:

- Frontend component structure
- Waze / Google Maps navigation deep links
- Deployment setup