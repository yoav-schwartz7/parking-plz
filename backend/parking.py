import logging
import math
from typing import Any

import certifi
import requests
from thefuzz import process

logger = logging.getLogger(__name__)

LIVE_API_URL = "https://api.tel-aviv.gov.il/parking/StationsStatus"
FUZZY_THRESHOLD = 80


def fetch_live_availability() -> list[dict[str, Any]]:
    """
    Calls the Tel Aviv Municipality REST API and returns the raw list of lot
    availability records. Each record contains at minimum:
      - Name: str
      - InformationToShow: str   (availability status)
      - LastUpdateFromDambach: str
    """
    resp = requests.get(LIVE_API_URL, timeout=10, verify=certifi.where())
    resp.raise_for_status()
    data = resp.json()
    logger.debug("Fetched live availability for %d lots", len(data))
    return data


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns the distance in meters between two (lat, lng) coordinates."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def find_nearest_lots(
    user_lat: float,
    user_lng: float,
    static_lots: dict[str, dict],
    live_data: list[dict[str, Any]],
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """
    Joins live_data with static_lots via fuzzy name matching, calculates
    distance from (user_lat, user_lng) using Haversine, and returns the
    top_n lots sorted by distance ascending.

    Lots in static_lots with no matching live entry get availability="unknown".
    Lots in live_data with no fuzzy match get partial info (no address/tariff).
    """
    website_names = list(static_lots.keys())

    # Start with all static lots, default availability to unknown
    merged: dict[str, dict] = {}
    for name, lot in static_lots.items():
        merged[name] = {
            "name": lot["name"],
            "address": lot.get("address"),
            "tariff_image_url": lot.get("tariff_image_url"),
            "coordinates": lot.get("coordinates"),
            "availability": "unknown",
            "availability_updated_at": None,
        }

    # Merge live data via fuzzy join
    for live_lot in live_data:
        api_name = live_lot["Name"].strip()
        best_match, score = process.extractOne(api_name, website_names)

        if score >= FUZZY_THRESHOLD:
            if score < 100:
                logger.debug("Fuzzy match: '%s' → '%s' (score=%d)", api_name, best_match, score)
            merged[best_match].update({
                "availability": live_lot.get("InformationToShow"),
                "availability_updated_at": live_lot.get("LastUpdateFromDambach"),
            })
        else:
            logger.warning("No match for API lot '%s' (best: '%s', score=%d) — excluded from results", api_name, best_match, score)

    # Calculate distance and build result list
    results = []
    for lot in merged.values():
        coords = lot.get("coordinates")
        if coords:
            distance = haversine(user_lat, user_lng, coords["lat"], coords["lng"])
        else:
            distance = None
        results.append({**lot, "distance_meters": round(distance) if distance is not None else None})

    # Lots with a known distance first, sorted ascending; unknowns at the end
    results.sort(key=lambda x: (x["distance_meters"] is None, x["distance_meters"] or 0))

    return results[:top_n]


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    from scraper import scrape_lot_list

    logger.info("Fetching static lot list (1 request)...")
    static_lots = scrape_lot_list()
    logger.info("Got %d static lots", len(static_lots))

    logger.info("Fetching live availability...")
    live_data = fetch_live_availability()
    logger.info("Got %d live lots", len(live_data))

    website_names = list(static_lots.keys())

    print(f"\n{'API Name':<35} {'Website Match':<35} {'Score':>5}  {'Availability'}")
    print("-" * 95)
    for live_lot in live_data:
        api_name = live_lot["Name"].strip()
        best_match, score = process.extractOne(api_name, website_names)
        availability = live_lot.get("InformationToShow", "N/A")
        match_display = best_match if score >= FUZZY_THRESHOLD else f"NO MATCH ({best_match})"
        flag = " ⚠" if score < FUZZY_THRESHOLD else ("" if score == 100 else " ~")
        print(f"{api_name:<35} {match_display:<35} {score:>5}  {availability}{flag}")
