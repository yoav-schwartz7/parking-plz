import requests
import certifi

BASE_URL = "https://www.ahuzot.co.il"
LOT_LIST_URL = f"{BASE_URL}/Parking/All"
LOT_DETAIL_URL = f"{BASE_URL}/Parking/ParkingDetails/"


def scrape_lot_list() -> dict[str, dict]:
    """
    Scrapes /Parking/All and returns a dict keyed by lot name.

    Each value contains:
      - name: str         (Hebrew, with "חניון " prefix stripped)
      - website_id: str
      - address: str
    """
    ...


def scrape_lot_details(website_id: str) -> str | None:
    """
    Scrapes the detail page for a single lot and returns its tariff image URL,
    or None if the image cannot be found.
    """
    ...


def scrape_all_lots() -> dict[str, dict]:
    """
    Runs the full startup scrape:
      1. scrape_lot_list() → base lot records
      2. scrape_lot_details() for each lot → adds tariff_image_url

    Returns a dict keyed by lot name with fields:
      name, website_id, address, tariff_image_url
    """
    ...
