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
  → Geocode each address via Google Maps API (87 requests) → coordinates
  → Store everything in memory as static lookup dict
  → Server is ready to accept requests
```

Estimated startup time: ~2-3 minutes (dominated by the 87 sequential scrape requests).
The server should not accept user requests until startup is complete.

---

## What Is NOT Yet Designed

The following will be added to this document once tested and confirmed:

- Google Maps Geocoding API integration (pending API key setup and testing)
- Frontend component structure
- Waze / Google Maps navigation deep links
- Deployment setup
