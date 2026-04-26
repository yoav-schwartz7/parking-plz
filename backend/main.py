import argparse
import sys
from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException, Query

from geocoding import load_or_geocode_coordinates
from parking import fetch_live_availability, find_nearest_lots
from scraper import scrape_all_lots


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="parking-plz backend")
    parser.add_argument(
        "--refresh-coords",
        action="store_true",
        help="Force re-geocode all lot addresses, ignoring the local cache",
    )
    return parser.parse_args()


_refresh_coords: bool = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs the startup sequence before the server accepts requests:
      1. Scrape static lot data from ahuzot.co.il
      2. Load or geocode lot coordinates
      3. Merge coordinates into static lookup and store on app.state
    """
    ...
    yield


app = FastAPI(title="parking-plz", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/parking")
async def get_parking(
    address: str = Query(..., description="User's address in Hebrew or English"),
    top_n: int = Query(5, ge=1, le=87, description="Number of nearest lots to return"),
) -> list[dict[str, Any]]:
    """
    Geocodes the user's address, fetches live availability, and returns the
    top_n nearest parking lots sorted by distance.
    """
    ...


if __name__ == "__main__":
    args = parse_args()
    _refresh_coords = args.refresh_coords
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
