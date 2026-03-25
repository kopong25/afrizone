"""
Geocoding utility for Afrizone.
Uses OpenStreetMap Nominatim — free, no API key required.
Converts a street address into lat/lng coordinates.

Used when:
  - A seller registers or updates their store address
  - Coordinates are not manually provided
"""

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {
    # Nominatim requires a User-Agent identifying your app
    "User-Agent": "Afrizone/1.0 (afrizone-loqr.onrender.com)"
}


async def geocode_address(address: str, city: str = "", state: str = "", country: str = "US") -> tuple | None:
    """
    Convert a street address to (latitude, longitude).

    Args:
        address: Street address e.g. "1234 Main St"
        city:    City name e.g. "Houston"
        state:   State code e.g. "TX"
        country: Country code (default "US")

    Returns:
        (lat, lng) tuple if found, None if geocoding failed.

    Usage:
        coords = await geocode_address(store.address, store.city, store.state)
        if coords:
            store.latitude, store.longitude = coords
    """
    # Build the full query string
    parts = [p for p in [address, city, state, country] if p]
    query = ", ".join(parts)

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                NOMINATIM_URL,
                params={
                    "q": query,
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 0,
                },
                headers=NOMINATIM_HEADERS,
                timeout=10,
            )

        if r.status_code != 200:
            print(f"[Geocoding] Nominatim returned {r.status_code} for query: {query}")
            return None

        results = r.json()
        if not results:
            print(f"[Geocoding] No results for: {query}")
            return None

        lat = float(results[0]["lat"])
        lng = float(results[0]["lon"])
        print(f"[Geocoding] ✅ {query} → ({lat}, {lng})")
        return lat, lng

    except Exception as e:
        print(f"[Geocoding] Failed for '{query}': {e}")
        return None