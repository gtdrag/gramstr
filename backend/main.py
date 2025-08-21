from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
import yt_dlp
import os
import tempfile
from pathlib import Path
import uuid
from typing import Optional, List
import json
import subprocess
import datetime

app = FastAPI(title="InstaScrape API", version="1.0.0")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# yt-dlp configuration
def get_ytdlp_options(output_dir: str):
    """Get yt-dlp options for Instagram downloads"""
    return {
        'outtmpl': f'{output_dir}/%(title)s.%(ext)s',
        'format': 'best/worst',  # Accept any available format
        'writeinfojson': True,  # Save metadata
        'writethumbnail': True,  # Save thumbnail
        'ignoreerrors': False,  # Don't ignore errors for debugging
        'no_warnings': False,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }

def load_instagram_cookies():
    """Load Instagram cookies for yt-dlp if available"""
    session_cookies_path = "session_cookies.json"
    if os.path.exists(session_cookies_path):
        try:
            print("Found Instagram session cookies for yt-dlp")
            return session_cookies_path
        except Exception as e:
            print(f"Could not load cookies: {e}")
            return None
    return None

print("=== yt-dlp Instagram Downloader Ready ===")

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
    """Download Instagram content using yt-dlp"""
    try:
        print(f"Starting yt-dlp download for URL: {request.url}")
        
        # Validate Instagram URL
        if not is_valid_instagram_url(request.url):
            raise HTTPException(status_code=400, detail="Invalid Instagram URL")
        
        # Create user-specific download directory
        download_dir = Path(f"downloads/{request.user_id}")
        download_dir.mkdir(parents=True, exist_ok=True)
        
        # Configure yt-dlp options
        ydl_opts = get_ytdlp_options(str(download_dir))
        
        # Try to use cookies if available (currently disabled for JSON format)
        # cookies_path = load_instagram_cookies()
        # if cookies_path:
        #     ydl_opts['cookiefile'] = cookies_path
        print("Using yt-dlp without cookies for now")
        
        # Download with yt-dlp
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                # First, extract info without downloading
                info = ydl.extract_info(request.url, download=False)
                print(f"Successfully extracted info for: {info.get('title', 'Unknown')}")
                
                # Now download
                ydl.download([request.url])
                print("Download completed successfully")
                
                # Find the actual downloaded files
                content_title = info.get('title', 'content')
                user_download_dir = Path(f"downloads/{request.user_id}")
                
                # Look for the actual downloaded files
                video_file = None
                image_file = None
                thumbnail_file = None
                
                for file_path in user_download_dir.glob("*"):
                    if file_path.is_file():
                        if file_path.suffix.lower() in ['.mp4', '.webm', '.mkv']:
                            video_file = str(file_path)
                        elif file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp'] and not file_path.name.endswith('.jpg'):
                            image_file = str(file_path)
                        elif file_path.name.endswith('.jpg'):
                            thumbnail_file = str(file_path)
                
                # Determine if it's a video or image
                is_video = video_file is not None
                main_file = video_file if is_video else image_file
                
                # Extract metadata from info
                metadata = ContentMetadata(
                    id=info.get('id', str(uuid.uuid4())),
                    url=request.url,
                    caption=info.get('description', '') or info.get('title', ''),
                    date=datetime.datetime.now().isoformat(),
                    likes=info.get('like_count', 0) or 0,
                    is_video=is_video,
                    file_path=main_file or f"downloads/{request.user_id}/{content_title}",
                    thumbnail_path=thumbnail_file
                )
                
                return {
                    "success": True,
                    "metadata": metadata.model_dump(),
                    "message": "Content downloaded successfully with yt-dlp"
                }
                
            except Exception as e:
                print(f"yt-dlp download failed: {e}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Download failed: {str(e)}"
                )
        
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

@app.get("/media/{user_id}/{filename}")
async def serve_media(user_id: str, filename: str):
    """Serve downloaded media files"""
    try:
        file_path = Path(f"downloads/{user_id}/{filename}")
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="Not a file")
        
        # Security check - ensure file is within downloads directory
        downloads_dir = Path("downloads").resolve()
        if not file_path.resolve().is_relative_to(downloads_dir):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/octet-stream"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve file: {str(e)}")

def is_valid_instagram_url(url: str) -> bool:
    """Validate Instagram URL for yt-dlp"""
    import re
    
    patterns = [
        r'instagram\.com/p/[A-Za-z0-9_-]+',
        r'instagram\.com/reel/[A-Za-z0-9_-]+',
        r'instagram\.com/reels/[A-Za-z0-9_-]+',
        r'instagram\.com/tv/[A-Za-z0-9_-]+',
        r'instagram\.com/stories/[A-Za-z0-9_.-]+',
    ]
    
    return any(re.search(pattern, url) for pattern in patterns)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)