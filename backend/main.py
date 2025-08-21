from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import instaloader
import os
import tempfile
from pathlib import Path
import uuid
from typing import Optional, List
import json

app = FastAPI(title="InstaScrape API", version="1.0.0")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize instaloader with more permissive settings
L = instaloader.Instaloader(
    download_video_thumbnails=False,
    download_geotags=False,
    download_comments=False,
    save_metadata=True,
    compress_json=False,
    request_timeout=60,
    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
)

# Instagram login function
def login_to_instagram():
    """Login to Instagram if credentials are provided"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    username = os.getenv('INSTAGRAM_USERNAME')
    password = os.getenv('INSTAGRAM_PASSWORD')
    
    if username and password:
        try:
            print(f"Attempting to login to Instagram as {username}")
            L.login(username, password)
            print("Successfully logged in to Instagram")
            return True
        except Exception as e:
            print(f"Instagram login failed: {e}")
            return False
    else:
        print("No Instagram credentials provided - using anonymous access")
        return False

# Try to login on startup
login_success = login_to_instagram()

class DownloadRequest(BaseModel):
    url: str
    user_id: str

class ContentMetadata(BaseModel):
    id: str
    url: str
    caption: Optional[str]
    date: str
    likes: int
    is_video: bool
    file_path: str
    thumbnail_path: Optional[str]

@app.get("/")
async def root():
    return {"message": "InstaScrape API is running"}

@app.post("/download")
async def download_content(request: DownloadRequest):
    """Download Instagram content from URL"""
    try:
        # Extract shortcode from URL
        shortcode = extract_shortcode(request.url)
        if not shortcode:
            raise HTTPException(status_code=400, detail="Invalid Instagram URL")
        
        print(f"Attempting to download shortcode: {shortcode}")
        
        # Create user-specific download directory
        download_dir = Path(f"downloads/{request.user_id}")
        download_dir.mkdir(parents=True, exist_ok=True)
        
        # Try different approaches to access Instagram content
        post = None
        
        try:
            # Method 1: Direct shortcode access
            post = instaloader.Post.from_shortcode(L.context, shortcode)
            print("Successfully accessed post metadata")
        except Exception as e1:
            print(f"Method 1 failed: {e1}")
            
            try:
                # Method 2: Try with session and different approach
                L.context.request_timeout = 30
                post = instaloader.Post.from_shortcode(L.context, shortcode)
                print("Method 2 succeeded")
            except Exception as e2:
                print(f"Method 2 failed: {e2}")
                raise HTTPException(
                    status_code=403, 
                    detail="Instagram blocked the request. This content may require authentication or be private."
                )
        
        # Download the post
        L.download_post(post, target=str(download_dir))
        print(f"Downloaded to: {download_dir}")
        
        # Extract metadata
        metadata = ContentMetadata(
            id=shortcode,
            url=request.url,
            caption=post.caption if post.caption else "",
            date=post.date.isoformat(),
            likes=post.likes,
            is_video=post.is_video,
            file_path=f"downloads/{request.user_id}/{post.shortcode}",
            thumbnail_path=f"downloads/{request.user_id}/{post.shortcode}.jpg" if post.is_video else None
        )
        
        return {
            "success": True,
            "metadata": metadata.dict(),
            "message": "Content downloaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Download error: {error_details}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@app.get("/downloads/{user_id}")
async def list_downloads(user_id: str):
    """List all downloaded content for a user"""
    try:
        download_dir = Path(f"downloads/{user_id}")
        if not download_dir.exists():
            return {"downloads": []}
        
        downloads = []
        for item in download_dir.iterdir():
            if item.is_file() and item.suffix in ['.mp4', '.jpg', '.jpeg']:
                downloads.append({
                    "filename": item.name,
                    "path": str(item),
                    "size": item.stat().st_size,
                    "created": item.stat().st_ctime
                })
        
        return {"downloads": downloads}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list downloads: {str(e)}")

def extract_shortcode(url: str) -> Optional[str]:
    """Extract Instagram shortcode from URL"""
    import re
    
    patterns = [
        r'instagram\.com/p/([A-Za-z0-9_-]+)',
        r'instagram\.com/reel/([A-Za-z0-9_-]+)',
        r'instagram\.com/reels/([A-Za-z0-9_-]+)',
        r'instagram\.com/tv/([A-Za-z0-9_-]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)