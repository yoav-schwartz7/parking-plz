import logging

import certifi
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

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
    response = requests.get(LOT_LIST_URL, timeout=10, verify=certifi.where())
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    lots = {}
    links = soup.find_all("a", href=lambda href: href and "ParkingDetails" in href)

    for link in links:
        name = link.get_text(strip=True)
        if not name:
            continue
        if name.startswith("חניון "):
            name = name[len("חניון "):]

        website_id = link["href"].split("ID=")[-1]
        full_text = link.parent.get_text(strip=True)
        address = full_text.replace(link.get_text(strip=True), "").strip()

        lots[name] = {
            "name": name,
            "website_id": website_id,
            "address": address,
        }

    return lots


def scrape_lot_details(website_id: str) -> str | None:
    """
    Scrapes the detail page for a single lot and returns its tariff image URL,
    or None if the image cannot be found.
    """
    url = f"{LOT_DETAIL_URL}?ID={website_id}"
    response = requests.get(url, timeout=10, verify=certifi.where())
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    tariff_link = soup.find("a", title=lambda t: t and "תעריף החניון" in t)
    if tariff_link:
        return tariff_link["href"]
    logger.warning("No tariff image found for website_id=%s", website_id)
    return None


def scrape_all_lots() -> dict[str, dict]:
    """
    Runs the full startup scrape:
      1. scrape_lot_list() → base lot records
      2. scrape_lot_details() for each lot → adds tariff_image_url

    Returns a dict keyed by lot name with fields:
      name, website_id, address, tariff_image_url
    """
    lots = scrape_lot_list()
    total = len(lots)
    logger.debug("Scraped %d lots from list page. Fetching detail pages...", total)

    for i, (name, lot) in enumerate(lots.items(), 1):
        tariff_url = scrape_lot_details(lot["website_id"])
        lot["tariff_image_url"] = tariff_url
        logger.debug("[%d/%d] %s", i, total, name)

    return lots


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG, format="%(name)s - %(levelname)s - %(message)s")
    lots = scrape_all_lots()
    print(f"\n{'=' * 60}")
    print(f"Total: {len(lots)} lots")
    print(f"{'=' * 60}\n")
    for lot in lots.values():
        print(f"Name:    {lot['name']}")
        print(f"Address: {lot['address']}")
        print(f"Tariff:  {lot['tariff_image_url']}")
        print()
