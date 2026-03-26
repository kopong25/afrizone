import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException
import os
import io

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)
# ADD THIS LINE temporarily
print("CLOUDINARY CONFIG:", os.getenv("CLOUDINARY_CLOUD_NAME"), os.getenv("CLOUDINARY_API_KEY"), os.getenv("CLOUDINARY_API_SECRET", "")[:6])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

async def upload_image(file: UploadFile, folder: str = "afrizone") -> str:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="File must be JPEG, PNG, WebP or GIF")
    
    contents = await file.read()
    
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB.")
    
    result = cloudinary.uploader.upload(
        io.BytesIO(contents),
        folder=folder,
        resource_type="image",
    )
    return result["secure_url"]