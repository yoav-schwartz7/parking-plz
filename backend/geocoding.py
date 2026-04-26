import json
import os

import certifi
import requests

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
COORDS_CACHE_FILE = "lot_coordinates.json"

# Tel Aviv metro bounding box for sanity checks
TA_LAT_MIN, TA_LAT_MAX = 31.95, 32.20
TA_LNG_MIN, TA_LNG_MAX = 34.70, 34.90


def geocode(address: str, api_key: str) -> tuple[float, float] | None:
    """
    Returns (lat, lng) for the given address, or None if geocoding fails.
    Uses region=il and language=iw to bias results toward Israel.
    Logs a warning if the result falls outside the Tel Aviv metro bounding box.
    """
    ...


def load_or_geocode_coordinates(
    lots: dict[str, dict],
    api_key: str,
    force_refresh: bool = False,
) -> dict[str, dict]:
    """
    Returns a dict mapping lot name → {"lat": float, "lng": float}.

    If COORDS_CACHE_FILE exists and force_refresh is False, loads from file.
    Otherwise geocodes every lot's address and saves the result to COORDS_CACHE_FILE.
    """
    ...
