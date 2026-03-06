import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException
import os

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


async def upload_image(file: UploadFile, folder: str = "afrizone") -> str:
    """Upload an image file to Cloudinary and return the URL."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="File must be JPEG, PNG, WebP or GIF")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB.")

    result = cloudinary.uploader.upload(
        contents,
        folder=folder,
        resource_type="image",
        transformation=[
            {"width": 1200, "height": 1200, "crop": "limit"},  # Max dimensions
            {"quality": "auto:good"},                            # Auto compress
            {"fetch_format": "auto"},                            # Auto WebP/AVIF
        ],
    )
    return result["secure_url"]
