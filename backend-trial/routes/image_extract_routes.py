from fastapi import APIRouter, UploadFile, File, Depends
from auth import get_current_user
from models import User
from datetime import datetime
from typing import Optional
import io

router = APIRouter(prefix="/api/image-extract", tags=["Image Extract"])


def extract_exif_gps(image_bytes: bytes) -> dict:
    """Extract GPS coordinates and timestamp from image EXIF data."""
    result = {"latitude": None, "longitude": None, "capture_time": None}
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS

        img = Image.open(io.BytesIO(image_bytes))
        exif_data = img._getexif()
        if not exif_data:
            return result

        # Extract timestamp
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "DateTimeOriginal" or tag == "DateTime":
                try:
                    result["capture_time"] = datetime.strptime(
                        str(value), "%Y:%m:%d %H:%M:%S"
                    ).isoformat()
                except (ValueError, TypeError):
                    pass
                break

        # Extract GPS data
        gps_info = {}
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                for gps_tag_id, gps_value in value.items():
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_info[gps_tag] = gps_value

        if gps_info:
            def convert_to_degrees(value):
                d, m, s = value
                return float(d) + float(m) / 60.0 + float(s) / 3600.0

            if "GPSLatitude" in gps_info and "GPSLatitudeRef" in gps_info:
                lat = convert_to_degrees(gps_info["GPSLatitude"])
                if gps_info["GPSLatitudeRef"] == "S":
                    lat = -lat
                result["latitude"] = round(lat, 8)

            if "GPSLongitude" in gps_info and "GPSLongitudeRef" in gps_info:
                lng = convert_to_degrees(gps_info["GPSLongitude"])
                if gps_info["GPSLongitudeRef"] == "W":
                    lng = -lng
                result["longitude"] = round(lng, 8)

    except Exception:
        pass
    return result


async def reverse_geocode(lat: float, lng: float) -> dict:
    """Get address from GPS coordinates using OpenStreetMap Nominatim."""
    result = {"address": "", "zone": ""}
    try:
        import httpx

        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&addressdetails=1"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers={"User-Agent": "MCD-Monitor/1.0"})
            if resp.status_code == 200:
                data = resp.json()
                result["address"] = data.get("display_name", "")

                # Try to detect Delhi zone from address
                addr_parts = data.get("address", {})
                suburb = addr_parts.get("suburb", "").lower()
                neighbourhood = addr_parts.get("neighbourhood", "").lower()
                city_district = addr_parts.get("city_district", "").lower()
                full_addr_lower = result["address"].lower()

                zone_mapping = {
                    "north": "North Zone",
                    "south": "South Zone",
                    "east": "East Zone",
                    "west": "West Zone",
                    "central": "Central Zone",
                    "new delhi": "New Delhi Zone",
                    "shahdara": "Shahdara North Zone",
                    "narela": "Narela Zone",
                    "rohini": "Rohini Zone",
                    "civil lines": "Civil Lines Zone",
                    "karol bagh": "Karol Bagh Zone",
                }
                for keyword, zone_name in zone_mapping.items():
                    if keyword in suburb or keyword in neighbourhood or keyword in city_district:
                        result["zone"] = zone_name
                        break

    except Exception:
        pass
    return result


@router.post("/")
async def extract_image_data(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Extract GPS, timestamp from uploaded image and reverse geocode the address."""
    contents = await file.read()

    # Extract EXIF data
    exif = extract_exif_gps(contents)

    result = {
        "latitude": exif["latitude"],
        "longitude": exif["longitude"],
        "capture_time": exif["capture_time"],
        "address": "",
        "zone": "",
    }

    # Reverse geocode if we have GPS
    if exif["latitude"] and exif["longitude"]:
        geo = await reverse_geocode(exif["latitude"], exif["longitude"])
        result["address"] = geo["address"]
        result["zone"] = geo["zone"]

    return result


@router.post("/geocode")
async def geocode_coordinates(
    latitude: float,
    longitude: float,
    current_user: User = Depends(get_current_user),
):
    """Reverse geocode GPS coordinates to get address."""
    geo = await reverse_geocode(latitude, longitude)
    return {
        "address": geo["address"],
        "zone": geo["zone"],
        "latitude": latitude,
        "longitude": longitude,
    }
