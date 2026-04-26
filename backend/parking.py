import logging
import math
from typing import Any

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
    ...


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns the distance in meters between two (lat, lng) coordinates."""
    ...


def find_nearest_lots(
    user_lat: float,
    user_lng: float,
    static_lots: dict[str, dict],
    live_data: list[dict[str, Any]],
    top_n: int = 10,
) -> list[dict[str, Any]]:
    """
    Joins live_data with static_lots via fuzzy name matching, calculates
    distance from (user_lat, user_lng) using Haversine, and returns the
    top_n lots sorted by distance ascending.

    Lots in static_lots with no matching live entry get availability="unknown".
    Lots in live_data with no fuzzy match get partial info (no address/tariff).
    """
    ...
