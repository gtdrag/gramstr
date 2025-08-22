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

def convert_json_to_netscape_cookies(json_path: str, netscape_path: str):
    """Convert JSON cookies to Netscape format for yt-dlp"""
    try:
        import json
        with open(json_path, 'r') as f:
            cookies = json.load(f)
        
        with open(netscape_path, 'w') as f:
            f.write('# Netscape HTTP Cookie File\n')
            f.write('# This is a generated file! Do not edit.\n\n')
            
            for cookie in cookies:
                domain = cookie.get('domain', '.instagram.com')
                flag = 'TRUE' if domain.startswith('.') else 'FALSE'
                path = cookie.get('path', '/')
                secure = 'TRUE' if cookie.get('secure', False) else 'FALSE'
                expiration = '0'  # Session cookie
                name = cookie.get('name', '')
                value = cookie.get('value', '')
                
                f.write(f"{domain}\t{flag}\t{path}\t{secure}\t{expiration}\t{name}\t{value}\n")
        
        print(f"Converted JSON cookies to Netscape format: {netscape_path}")
        return True
    except Exception as e:
        print(f"Failed to convert cookies: {e}")
        return False

def load_instagram_cookies():
    """Load Instagram cookies for yt-dlp if available"""
    # Check for Netscape format cookies first (preferred by yt-dlp)
    netscape_cookies_path = "backend/instagram_cookies.txt"
    if os.path.exists(netscape_cookies_path):
        try:
            print("Found Instagram cookies (Netscape format)")
            return netscape_cookies_path
        except Exception as e:
            print(f"Could not load Netscape cookies: {e}")
    
    # Check for JSON cookies and convert them to Netscape format
    session_cookies_path = "backend/session_cookies.json"
    if os.path.exists(session_cookies_path):
        try:
            # Validate that we have the essential sessionid cookie
            import json
            with open(session_cookies_path, 'r') as f:
                cookies = json.load(f)
            
            cookie_names = [cookie.get('name') for cookie in cookies]
            if 'sessionid' in cookie_names:
                print("Found Instagram session cookies (JSON format) with sessionid")
            else:
                print("Found Instagram cookies but missing sessionid - authentication may fail")
            
            # Convert to Netscape format
            if convert_json_to_netscape_cookies(session_cookies_path, netscape_cookies_path):
                return netscape_cookies_path
            else:
                return None
        except Exception as e:
            print(f"Could not load JSON cookies: {e}")
    
    print("No Instagram cookies found - Stories download will require authentication")
    return None

def is_stories_url(url: str) -> bool:
    """Check if URL is an Instagram Stories URL"""
    import re
    return bool(re.search(r'instagram\.com/stories/[A-Za-z0-9_.-]+', url))

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
        
        # Check if this is a Stories URL and enable cookies if available
        is_story = is_stories_url(request.url)
        cookies_path = load_instagram_cookies()
        
        if is_story and not cookies_path:
            raise HTTPException(
                status_code=400, 
                detail="Instagram Stories require authentication. Please run the cookie extraction script first."
            )
        
        if cookies_path:
            ydl_opts['cookiefile'] = cookies_path
            print(f"Using Instagram cookies for {'Stories' if is_story else 'authenticated'} download")
        else:
            print("Using yt-dlp without cookies (public posts only)")
        
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
                downloaded_files = []
                
                content_title = info.get('title', 'content')
                print(f"Looking for files with title: {content_title}")
                
                # Collect all files first
                for file_path in user_download_dir.glob("*"):
                    if file_path.is_file():
                        filename = file_path.name
                        print(f"Found file: {filename}")
                        downloaded_files.append(file_path)
                
                # Find the most recent files (yt-dlp just downloaded them)
                if downloaded_files:
                    # Sort by modification time, newest first
                    downloaded_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                    
                    video_file = None
                    image_file = None
                    thumbnail_file = None
                    
                    # Process files to find the correct video/image and its thumbnail
                    for file_path in downloaded_files:
                        filename = file_path.name
                        
                        # Video files
                        if file_path.suffix.lower() in ['.mp4', '.webm', '.mkv', '.avi', '.mov']:
                            if video_file is None:  # Take the first (most recent) video
                                video_file = str(file_path)
                                print(f"Selected as VIDEO: {filename}")
                                
                                # Look for its corresponding thumbnail with similar name
                                base_name = file_path.stem
                                for thumb_candidate in downloaded_files:
                                    if (thumb_candidate.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp'] and
                                        base_name in thumb_candidate.stem):
                                        thumbnail_file = str(thumb_candidate)
                                        print(f"Found matching THUMBNAIL: {thumb_candidate.name}")
                                        break
                        
                        # Image files (only if no video found)
                        elif (video_file is None and 
                              file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']):
                            if image_file is None:
                                image_file = str(file_path)
                                print(f"Selected as IMAGE: {filename}")
                
                # Determine if it's a video or image based on what we found
                is_video = video_file is not None
                main_file = video_file if is_video else image_file
                
                print(f"Final decision: is_video={is_video}, main_file={main_file}, thumbnail={thumbnail_file}")
                
                # Extract metadata from info with proper file names
                metadata = ContentMetadata(
                    id=info.get('id', str(uuid.uuid4())),
                    url=request.url,
                    caption=info.get('description', '') or info.get('title', ''),
                    date=datetime.datetime.now().isoformat(),
                    likes=info.get('like_count', 0) or 0,
                    is_video=is_video,
                    file_path=Path(main_file).name if main_file else None,  # Store just filename for frontend
                    thumbnail_path=Path(thumbnail_file).name if thumbnail_file else None  # Store just filename
                )
                
                return {
                    "success": True,
                    "metadata": metadata.model_dump(),
                    "message": "Content downloaded successfully with yt-dlp"
                }
                
            except Exception as e:
                error_str = str(e)
                print(f"yt-dlp download failed: {error_str}")
                
                # Check for common session expiration errors
                if any(phrase in error_str.lower() for phrase in [
                    "you need to log in",
                    "login required", 
                    "authentication required",
                    "session expired",
                    "invalid session",
                    "unauthorized access",
                    "this content is unreachable",
                    "use --cookies-from-browser",
                    "cookies for the authentication",
                    "content is not available",
                    "login to access"
                ]):
                    # Mark session as invalid in status file
                    try:
                        import json
                        status_file = "backend/session_status.json"
                        status_data = {
                            "last_validation": datetime.datetime.now().isoformat(),
                            "is_valid": False,
                            "last_error": "Session expired or authentication invalid"
                        }
                        with open(status_file, 'w') as f:
                            json.dump(status_data, f)
                        print("Marked session as invalid in status file")
                    except Exception as status_error:
                        print(f"Failed to update session status: {status_error}")
                    
                    raise HTTPException(
                        status_code=401,
                        detail="Session expired or authentication invalid. Please refresh your Instagram cookies."
                    )
                
                raise HTTPException(
                    status_code=500, 
                    detail=f"Download failed: {error_str}"
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

def is_stories_url(url: str) -> bool:
    """Check if URL is an Instagram Stories URL"""
    return '/stories/' in url

@app.post("/validate-session")
async def validate_session(request: dict):
    """Validate if the current session is still active by testing a lightweight request"""
    try:
        test_url = request.get("test_url", "https://www.instagram.com/instagram/")
        
        # Load cookies for the test
        cookies_path = load_instagram_cookies()
        
        if not cookies_path:
            raise HTTPException(
                status_code=401,
                detail="No authentication cookies found"
            )
        
        # Configure minimal yt-dlp options for validation
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,  # Don't download, just extract basic info
            'cookiefile': cookies_path,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
        
        # Test the session with a minimal request
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                # Just extract basic info without downloading
                info = ydl.extract_info(test_url, download=False)
                
                # If we get here, the session is working
                return {
                    "valid": True,
                    "message": "Session is active and working",
                    "username": info.get('uploader', 'Unknown') if info else None
                }
                
            except Exception as e:
                error_str = str(e).lower()
                print(f"Session validation failed: {e}")
                
                # Check for authentication-related errors
                if any(phrase in error_str for phrase in [
                    "you need to log in",
                    "login required",
                    "authentication required", 
                    "session expired",
                    "unauthorized",
                    "forbidden"
                ]):
                    raise HTTPException(
                        status_code=401,
                        detail="Session expired or authentication invalid"
                    )
                else:
                    # Other error - might be network or Instagram being down
                    raise HTTPException(
                        status_code=500,
                        detail=f"Session validation error: {str(e)}"
                    )
                    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Validation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Session validation failed: {str(e)}"
        )

if __name__ == "__main__":
    print("=== yt-dlp Instagram Downloader Ready ===")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)