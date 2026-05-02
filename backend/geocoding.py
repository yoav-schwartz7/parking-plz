import json
import logging
import os
import sys

import certifi
import redis
import requests

logger = logging.getLogger(__name__)

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
REDIS_COORDS_KEY = "lot_coordinates"

# Tel Aviv metro bounding box for sanity checks
TA_LAT_MIN, TA_LAT_MAX = 31.95, 32.20
TA_LNG_MIN, TA_LNG_MAX = 34.70, 34.90


def geocode(address: str, api_key: str) -> tuple[float, float] | None:
    """
    Returns (lat, lng) for the given address, or None if geocoding fails.
    Uses region=il and language=iw to bias results toward Israel.
    Logs a warning if the result falls outside the Tel Aviv metro bounding box.
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
        logger.warning("Geocoding failed for '%s': status=%s", address, data.get("status"))
        return None

    loc = data["results"][0]["geometry"]["location"]
    lat, lng = loc["lat"], loc["lng"]

    if not (TA_LAT_MIN <= lat <= TA_LAT_MAX and TA_LNG_MIN <= lng <= TA_LNG_MAX):
        logger.warning("Coordinates for '%s' outside Tel Aviv bounds: (%.4f, %.4f)", address, lat, lng)

    return lat, lng


def load_or_geocode_coordinates(
    lots: dict[str, dict],
    api_key: str,
    redis_url: str,
    force_refresh: bool = False,
) -> dict[str, dict]:
    """
    Returns a dict mapping lot name → {"lat": float, "lng": float}.

    Checks Redis for a cached result first. If found and force_refresh is False,
    returns the cached value. Otherwise geocodes all lots and stores the result in Redis.
    """
    client = redis.from_url(redis_url, ssl_cert_reqs=None)

    if not force_refresh:
        cached = client.get(REDIS_COORDS_KEY)
        if cached:
            logger.info("Loading coordinates from Redis cache")
            return json.loads(cached)

    if force_refresh:
        client.delete(REDIS_COORDS_KEY)

    logger.info("Geocoding %d lots...", len(lots))
    coords = {}
    total = len(lots)
    for i, (name, lot) in enumerate(lots.items(), 1):
        result = geocode(lot["address"], api_key)
        if result:
            coords[name] = {"lat": result[0], "lng": result[1]}
            logger.debug("[%d/%d] %s → (%.4f, %.4f)", i, total, name, result[0], result[1])
        else:
            logger.warning("[%d/%d] %s → geocoding failed, skipping", i, total, name)

    client.set(REDIS_COORDS_KEY, json.dumps(coords, ensure_ascii=False))
    logger.info("Saved coordinates for %d/%d lots to Redis", len(coords), total)

    return coords


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    redis_url = os.environ.get("REDIS_URL")
    if not api_key:
        logger.error("GOOGLE_MAPS_API_KEY environment variable is not set")
        sys.exit(1)
    if not redis_url:
        logger.error("REDIS_URL environment variable is not set")
        sys.exit(1)

    from scraper import scrape_all_lots

    lots = scrape_all_lots()
    coords = load_or_geocode_coordinates(lots, api_key, redis_url)

    print(f"\nTotal lots geocoded: {len(coords)}/{len(lots)}")
    print("\nSample (first 5):")
    for name, c in list(coords.items())[:5]:
        print(f"  {name}: lat={c['lat']:.4f}, lng={c['lng']:.4f}")
