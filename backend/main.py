import argparse
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from geocoding import geocode, load_or_geocode_coordinates
from parking import fetch_live_availability, find_nearest_lots
from scraper import scrape_all_lots

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    password: str


def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> None:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        jwt.decode(credentials.credentials, request.app.state.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="parking-plz backend")
    parser.add_argument(
        "--refresh-coords",
        action="store_true",
        help="Force re-geocode all lot addresses, ignoring the local cache",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable DEBUG-level logging across all modules",
    )
    return parser.parse_args()


@asynccontextmanager
async def lifespan(app: FastAPI):
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    access_password = os.environ.get("ACCESS_PASSWORD")
    jwt_secret = os.environ.get("JWT_SECRET")

    missing = [k for k, v in {
        "GOOGLE_MAPS_API_KEY": api_key,
        "ACCESS_PASSWORD": access_password,
        "JWT_SECRET": jwt_secret,
    }.items() if not v]
    if missing:
        logger.error("Missing required environment variables: %s", ", ".join(missing))
        sys.exit(1)

    refresh_coords = getattr(app.state, "refresh_coords", False)

    logger.info("Scraping static lot data from ahuzot.co.il...")
    lots = scrape_all_lots()
    logger.info("Scraped %d lots", len(lots))

    coords = load_or_geocode_coordinates(lots, api_key, force_refresh=refresh_coords)

    for name, c in coords.items():
        if name in lots:
            lots[name]["coordinates"] = c

    app.state.static_lots = lots
    app.state.api_key = api_key
    app.state.access_password = access_password
    app.state.jwt_secret = jwt_secret
    logger.info("Startup complete — server ready")

    yield


app = FastAPI(title="parking-plz", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login")
async def login(body: LoginRequest, request: Request) -> dict[str, str]:
    if body.password != request.app.state.access_password:
        raise HTTPException(status_code=401, detail="Incorrect password")
    token = jwt.encode(
        {"exp": datetime.now(timezone.utc) + timedelta(days=7)},
        request.app.state.jwt_secret,
        algorithm="HS256",
    )
    return {"token": token}


@app.get("/api/parking")
async def get_parking(
    request: Request,
    address: str | None = Query(None, description="Address to geocode (Hebrew or English)"),
    lat: float | None = Query(None, ge=-90, le=90, description="User latitude"),
    lng: float | None = Query(None, ge=-180, le=180, description="User longitude"),
    top_n: int = Query(5, ge=1, le=87, description="Number of nearest lots to return"),
    _: None = Depends(require_auth),
) -> dict[str, Any]:
    has_address = address is not None
    has_coords = lat is not None and lng is not None
    has_partial_coords = (lat is None) != (lng is None)

    if has_partial_coords:
        raise HTTPException(status_code=400, detail="Provide both lat and lng, or neither")
    if has_address and has_coords:
        raise HTTPException(status_code=400, detail="Provide either address or lat/lng, not both")
    if not has_address and not has_coords:
        raise HTTPException(status_code=400, detail="Provide either address or lat+lng")

    if has_address:
        result = geocode(address, request.app.state.api_key)
        if result is None:
            raise HTTPException(status_code=400, detail=f"Could not geocode address: {address}")
        user_lat, user_lng = result
    else:
        user_lat, user_lng = lat, lng

    try:
        live_data = fetch_live_availability()
    except Exception as e:
        logger.warning("Live API unavailable (%s) — returning lots with unknown availability", e)
        live_data = []

    lots = find_nearest_lots(user_lat, user_lng, request.app.state.static_lots, live_data, top_n)
    return {
        "user_location": {"lat": user_lat, "lng": user_lng},
        "lots": lots,
    }


if __name__ == "__main__":
    args = parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    app.state.refresh_coords = args.refresh_coords
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
