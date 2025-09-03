from fastapi import FastAPI, HTTPException, Request
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
import shutil
import datetime
import time
import logging
from logging.handlers import RotatingFileHandler

# ABSOLUTE PATH CONFIGURATION - FIXES ALL PATH ISSUES
PROJECT_ROOT = Path(__file__).parent.parent.absolute()  # Goes up from backend/ to project root
DOWNLOADS_DIR = PROJECT_ROOT / "downloads"  # Always use absolute path to downloads
DOWNLOADS_DIR.mkdir(exist_ok=True)  # Ensure it exists

# Set up logging to file
LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "backend.log"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(LOG_FILE, maxBytes=10*1024*1024, backupCount=5),
        logging.StreamHandler()  # Also log to console
    ]
)

logger = logging.getLogger(__name__)

logger.info(f"🔧 Project root: {PROJECT_ROOT}")
logger.info(f"📁 Downloads directory: {DOWNLOADS_DIR}")
logger.info(f"📝 Log file: {LOG_FILE}")

app = FastAPI(title="Dumpstr API", version="1.0.0")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "https://instascrape.vercel.app",
        "https://instascrape-*.vercel.app",  # For preview deployments
        "https://instascrape-*-gtdrags-projects.vercel.app",  # Your preview pattern
        "https://*.vercel.app",  # Fallback for any Vercel domain
        "https://*-gtdrags-projects.vercel.app"  # Alternative pattern
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# yt-dlp configuration
def get_ytdlp_options(output_dir: str, download_id: str = None):
    """Get yt-dlp options for Instagram downloads with controlled naming"""
    # Use a unique ID for this download session to ensure we can find our files
    if not download_id:
        download_id = str(uuid.uuid4())[:8]
    
    return {
        # Use our download ID as prefix AND include unique identifiers to prevent overwrites
        # For stories/playlists, include playlist_index to ensure unique filenames
        'outtmpl': f'{output_dir}/{download_id}_%(title)s_%(playlist_index|)s%(playlist_index& |)s%(id)s.%(ext)s',
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
    # Use paths relative to backend directory when running in container
    backend_dir = Path(__file__).parent  # Gets the backend directory
    netscape_cookies_path = str(backend_dir / "instagram_cookies.txt")
    if os.path.exists(netscape_cookies_path):
        print("Found Instagram cookies (Netscape format)")
        return netscape_cookies_path
    
    # Only convert JSON if Netscape doesn't exist
    session_cookies_path = str(backend_dir / "session_cookies.json")
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
            
            # Convert to Netscape format (only if doesn't exist)
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

def extract_story_id(url: str) -> str:
    """Extract the specific story ID from a stories URL if present"""
    import re
    # Match patterns like /stories/username/1234567890/
    match = re.search(r'instagram\.com/stories/[A-Za-z0-9_.-]+/(\d+)', url)
    if match:
        return match.group(1)
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
    is_carousel: bool = False
    carousel_files: Optional[List[str]] = None

@app.get("/")
async def root():
    # Clear any invalid session status on startup/health check
    try:
        backend_dir = Path(__file__).parent
        status_file = backend_dir / "session_status.json"
        if status_file.exists():
            import json
            with open(status_file, 'r') as f:
                status_data = json.load(f)
            # Only clear if marked as invalid without actual cookies
            if status_data.get("is_valid") == False:
                cookies_exist = (backend_dir / "session_cookies.json").exists() or (backend_dir / "instagram_cookies.txt").exists()
                if not cookies_exist:
                    # Remove invalid status file when no cookies exist
                    status_file.unlink()
                    print("Cleared invalid session status file (no cookies present)")
    except Exception as e:
        print(f"Error checking session status: {e}")
    
    return {"message": "Dumpstr API is running"}

@app.post("/download")
async def download_content(request: DownloadRequest):
    """Download Instagram content using yt-dlp"""
    try:
        logger.info(f"Starting yt-dlp download for URL: {request.url}")
        
        # Validate Instagram URL
        if not is_valid_instagram_url(request.url):
            raise HTTPException(status_code=400, detail="Invalid Instagram URL")
        
        # Create user-specific download directory
        download_dir = DOWNLOADS_DIR / request.user_id
        download_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique download ID for this session
        download_id = str(uuid.uuid4())[:8]
        print(f"Using download ID: {download_id}")
        
        # Check if this is a Stories URL and enable cookies if available
        is_story = is_stories_url(request.url)
        story_id = extract_story_id(request.url) if is_story else None
        cookies_path = load_instagram_cookies()
        
        if story_id:
            print(f"Specific story requested: {story_id}")
            # For specific stories, we might need to handle differently
            # yt-dlp might download all stories even with a specific URL
        
        if is_story and not cookies_path:
            raise HTTPException(
                status_code=400, 
                detail="Instagram Stories require authentication. Please run the cookie extraction script first."
            )
        
        # Configure yt-dlp options with our controlled naming
        ydl_opts = get_ytdlp_options(str(download_dir), download_id)
        
        # Use cookies whenever available for better access (BEFORE any yt-dlp usage!)
        if cookies_path:
            ydl_opts['cookiefile'] = cookies_path
            print(f"Using Instagram cookies for {'Stories' if is_story else 'authenticated'} download - this enables caption extraction!")
        else:
            print("WARNING: No cookies available - captions may not be extracted!")
        
        # Try yt-dlp first (faster and reliable)
        carousel_caption = None  # Store caption in case we need it for gallery-dl fallback
        target_story_index = None
        info = None
        
        # First pass: Extract info to find the specific story if needed
        if is_story and story_id:
            logger.info(f"🔍 Looking for specific story ID: {story_id}")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(request.url, download=False)
                    logger.info(f"Successfully extracted info for: {info.get('title', 'Unknown')}")
                    logger.info(f"Info type: {info.get('_type')}")
                    
                    # For stories with specific ID, find which entry matches
                    if info.get('_type') == 'playlist' and 'entries' in info:
                        logger.info(f"Playlist with {len(info.get('entries', []))} stories")
                        logger.info(f"Looking for story with ID: {story_id}")
                        for idx, entry in enumerate(info.get('entries', [])):
                            # Check ALL possible ID fields
                            entry_id = str(entry.get('id', ''))
                            display_id = str(entry.get('display_id', ''))
                            url = entry.get('webpage_url', '')
                            webpage_url_basename = str(entry.get('webpage_url_basename', ''))
                            
                            logger.info(f"\nStory {idx+1} details:")
                            logger.info(f"  - id: {entry_id}")
                            logger.info(f"  - display_id: {display_id}")
                            logger.info(f"  - webpage_url: {url}")
                            logger.info(f"  - webpage_url_basename: {webpage_url_basename}")
                            logger.info(f"  - title: {entry.get('title', 'N/A')}")
                            
                            # Check if this is our requested story
                            # The problem: Instagram gives all stories in a session the same webpage_url_basename!
                            # We need to match on the actual story media ID instead
                            story_matched = False
                            
                            # First, check the obvious IDs
                            if story_id == entry_id or story_id == display_id:
                                story_matched = True
                                logger.info(f"  ✅ Matched on entry_id or display_id!")
                            
                            # Check if it's the exact URL we requested
                            elif url == request.url:
                                story_matched = True
                                logger.info(f"  ✅ Matched on exact URL!")
                                
                            # Last resort - check webpage_url_basename (but this might match all stories!)
                            elif story_id == webpage_url_basename:
                                # This is problematic - might match multiple stories
                                logger.warning(f"  ⚠️ Matched on webpage_url_basename - this might be wrong!")
                                # Don't match on this alone - continue looking
                                continue
                            
                            if story_matched:
                                target_story_index = idx
                                logger.info(f"✅ MATCH! Found target story at index {idx+1}")
                                logger.info(f"  Matched URL: {url}")
                                
                                # Try multiple approaches to get only this story
                                # Approach 1: Use playlist_items (1-indexed)
                                ydl_opts['playlist_items'] = str(idx + 1)
                                
                                # Approach 2: Also try playliststart/end
                                ydl_opts['playliststart'] = idx + 1
                                ydl_opts['playlistend'] = idx + 1
                                
                                # Approach 3: If we have the direct URL, we could try downloading that instead
                                if url and 'instagram.com' in url:
                                    logger.info(f"  Found direct story URL: {url}")
                                    # We'll use this URL for download instead of the playlist URL
                                    request.url = url
                                    logger.info(f"  Changed download URL to specific story: {url}")
                                
                                logger.info(f"Updated options: playlist_items='{idx + 1}', start={idx + 1}, end={idx + 1}")
                                break
                        
                        if target_story_index is None:
                            logger.warning(f"❌ WARNING: Could not find story with ID {story_id} in any of the {len(info.get('entries', []))} stories")
                            logger.warning("Will download all stories instead...")
                    else:
                        logger.info(f"Not a playlist or no entries found. Info keys: {list(info.keys())}")
                                    
                except Exception as e:
                    logger.error(f"Failed to extract info for story selection: {e}")
        
        # Now download with the updated options
        logger.info(f"\n📥 Starting download with options:")
        if 'playlist_items' in ydl_opts:
            logger.info(f"  - playlist_items: {ydl_opts['playlist_items']}")
        else:
            logger.info(f"  - playlist_items: NOT SET (will download all)")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                # Download using the URL (this also extracts info)
                download_info = ydl.extract_info(request.url, download=True)
                print("Download completed successfully")
                
                # Use download_info if we didn't get info earlier or to update caption
                if download_info:
                    info = download_info
                    carousel_caption = info.get('description', '') or info.get('title', '')
                    print(f"Got caption from download: {carousel_caption[:100]}..." if len(carousel_caption) > 100 else f"Got caption from download: {carousel_caption}")
                
                # Find the actual downloaded files using our download ID
                content_title = info.get('title', 'content') if info else 'content'
                user_download_dir = DOWNLOADS_DIR / request.user_id
                
                # Look for files with our download ID prefix
                downloaded_files = []
                
                print(f"Looking for files with download ID: {download_id}")
                
                # Collect files with our download ID
                for file_path in user_download_dir.glob(f"{download_id}_*"):
                    if file_path.is_file():
                        filename = file_path.name
                        print(f"Found file with our ID: {filename}")
                        downloaded_files.append(file_path)
                
                # Process downloaded files with our ID - no more guessing!
                if downloaded_files:
                    video_file = None
                    image_file = None
                    thumbnail_file = None
                    
                    # CRITICAL: Only look at files with OUR download ID to avoid mixing stories!
                    # Filter to ONLY files that start with our download ID
                    our_files = [f for f in downloaded_files 
                                if f.name.startswith(f"{download_id}_")]
                    
                    # Now filter to media files from our download
                    media_files = [f for f in our_files 
                                  if f.suffix.lower() in ['.mp4', '.webm', '.mkv', '.avi', '.mov', 
                                                         '.jpg', '.jpeg', '.png', '.webp']]
                    
                    files_to_check = media_files
                    
                    print(f"Found {len(downloaded_files)} total files, {len(our_files)} with our ID, {len(media_files)} media files")
                    
                    # Process files to find the correct video/image and its thumbnail
                    print(f"Processing {len(files_to_check)} files for matching...")
                    for f in files_to_check:
                        print(f"  - {f.name} (stem: '{f.stem}')")
                    
                    # If we limited to a specific story, we should only have one video
                    if story_id and is_story and target_story_index is not None:
                        print(f"Should have only the requested story (index {target_story_index + 1})")
                    
                    for file_path in files_to_check:
                        filename = file_path.name
                        
                        # Skip if we already found the specific story video we want
                        if video_file and story_id and is_story:
                            continue
                            
                        # Video files
                        if file_path.suffix.lower() in ['.mp4', '.webm', '.mkv', '.avi', '.mov']:
                            if video_file is None:  # Only select if we haven't found one yet
                                video_file = str(file_path)
                                print(f"Selected as VIDEO: {filename}")
                        
                        # Image files (only if no video found)
                        elif (video_file is None and 
                              file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']):
                            if image_file is None:
                                image_file = str(file_path)
                                print(f"Selected as IMAGE: {filename}")
                    
                    # Now find the thumbnail for the selected video
                    if video_file and not thumbnail_file:
                        video_path = Path(video_file)
                        base_name = video_path.stem
                        print(f"Looking for thumbnail for selected video: '{base_name}'")
                        
                        for thumb_candidate in files_to_check:
                            if (thumb_candidate.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp'] and
                                thumb_candidate.stem == base_name):
                                thumbnail_file = str(thumb_candidate)
                                print(f"Found matching thumbnail: {thumb_candidate.name}")
                                break
                
                # Determine if it's a video or image based on what we found
                is_video = video_file is not None
                main_file = video_file if is_video else image_file
                
                print(f"Final decision: is_video={is_video}, main_file={main_file}, thumbnail={thumbnail_file}")
                
                # Clean up filenames by removing our download ID prefix
                cleaned_files = {}
                for file_path in downloaded_files:
                    if file_path and Path(file_path).exists():
                        old_path = Path(file_path)
                        # Remove the download ID prefix from the filename
                        new_name = old_path.name.replace(f"{download_id}_", "", 1)
                        new_path = old_path.parent / new_name
                        
                        # Rename the file
                        if old_path != new_path:
                            old_path.rename(new_path)
                            cleaned_files[str(file_path)] = str(new_path)
                            print(f"Renamed: {old_path.name} -> {new_name}")
                
                # Update our file references with cleaned names
                if main_file and main_file in cleaned_files:
                    main_file = cleaned_files[main_file]
                if thumbnail_file and thumbnail_file in cleaned_files:
                    thumbnail_file = cleaned_files[thumbnail_file]
                
                # 🎠 Smart carousel detection: Check if we might have missed carousel content
                is_carousel = False
                carousel_files = None
                
                # Check if this might be a carousel that yt-dlp only partially downloaded
                if (not is_story and cookies_path and 
                    info.get('_type') == 'playlist' and 
                    info.get('playlist_count', 0) > 1):
                    
                    print(f"🎠 Detected potential carousel: playlist with {info.get('playlist_count')} items, but yt-dlp only got 1")
                    print("🎠 Trying gallery-dl to get all carousel content...")
                    
                    try:
                        # Try gallery-dl for this URL - use Python module approach
                        backend_dir = Path(__file__).parent
                        venv_python = backend_dir.parent / "venv" / "bin" / "python"
                        
                        # Use the venv's Python to run gallery-dl as a module
                        if venv_python.exists():
                            gallery_cmd = [str(venv_python), "-m", "gallery_dl"]
                        else:
                            gallery_cmd = ["python3", "-m", "gallery_dl"]
                        
                        gallery_result = subprocess.run(
                            gallery_cmd + ["-d", str(download_dir), request.url, "--cookies", cookies_path],
                            capture_output=True, text=True, timeout=90)
                        
                        if gallery_result.returncode == 0:
                            # Find gallery-dl files
                            gallery_files = []
                            for file_path in download_dir.rglob("*"):
                                if (file_path.is_file() and 
                                    file_path.stat().st_mtime > (time.time() - 120) and
                                    file_path.suffix.lower() in ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.jpg', '.jpeg', '.png', '.webp'] and
                                    file_path.name != Path(main_file).name):  # Don't include the file we already have
                                    gallery_files.append(file_path)
                            
                            if gallery_files:
                                print(f"✅ Gallery-dl found {len(gallery_files)} additional files!")
                                
                                # Move gallery-dl files to main directory
                                for file_path in gallery_files:
                                    if file_path.parent != download_dir:  # Only move if in subdirectory
                                        destination = download_dir / file_path.name
                                        shutil.move(str(file_path), str(destination))
                                        print(f"Moved {file_path.name} to main directory")
                                
                                # Clean up empty subdirectories
                                for subdir in download_dir.iterdir():
                                    if subdir.is_dir():
                                        try:
                                            shutil.rmtree(subdir)
                                        except:
                                            pass
                                
                                # Update carousel info
                                is_carousel = True
                                all_files = [Path(main_file).name] + [f.name for f in gallery_files]
                                carousel_files = all_files
                                print(f"🎠 Complete carousel: {carousel_files}")
                            else:
                                print("❌ Gallery-dl didn't find additional files")
                        else:
                            print(f"❌ Gallery-dl failed: {gallery_result.stderr}")
                    
                    except Exception as e:
                        print(f"❌ Gallery-dl error: {e}")
                
                # Extract metadata from info with proper file names
                # Handle case where info might be None (extraction failed)
                if info:
                    post_id = info.get('id', str(uuid.uuid4()))
                    # Always prefer actual caption from Instagram
                    caption = info.get('description', '') or info.get('title', '')
                    if not caption:
                        # Only use generic text as last resort
                        caption = f"Instagram post"
                    likes = info.get('like_count', 0) or 0
                else:
                    # Use minimal metadata when extraction completely failed
                    post_id = str(uuid.uuid4())
                    caption = ""  # Empty caption is better than generic text
                    likes = 0
                    print("No metadata available - using empty caption")
                
                metadata = ContentMetadata(
                    id=post_id,
                    url=request.url,
                    caption=caption,
                    date=datetime.datetime.now().isoformat(),
                    likes=likes,
                    is_video=is_video,
                    file_path=Path(main_file).name if main_file else None,  # Store just filename for frontend
                    thumbnail_path=Path(thumbnail_file).name if thumbnail_file else None,  # Store just filename
                    is_carousel=is_carousel,
                    carousel_files=carousel_files
                )
                
                return {
                    "success": True,
                    "metadata": metadata.model_dump(),
                    "message": f"Content downloaded successfully{' (carousel with ' + str(len(carousel_files)) + ' items)' if is_carousel else ''}"
                }
                
            except Exception as e:
                error_str = str(e)
                print(f"yt-dlp download failed: {error_str}")
                
                # Check for common authentication/cookie issues
                auth_error_patterns = [
                    "login required",
                    "requested content is not available",
                    "rate-limit reached",
                    "instagram api is not granting access",
                    "unable to extract shared data",
                    "main webpage is locked behind the login page",
                    "empty media response",
                    "instagram sent an empty",
                    "restricted post",  # This often appears when cookies are expired
                    "you must be 18 years old"  # Misleading error that appears with expired cookies
                ]
                
                is_auth_error = any(pattern in error_str.lower() for pattern in auth_error_patterns)
                
                if is_auth_error:
                    # Provide helpful error message about cookies
                    error_message = (
                        "Download failed - your Instagram cookies have expired. "
                        "Please refresh your Instagram authentication by uploading new cookies. "
                        "Instagram sessions typically expire after 2-3 days. "
                        "Note: Even if the error mentions age restriction, this is usually due to expired cookies."
                    )
                    print(f"🔐 Authentication/cookie issue detected: {error_message}")
                    raise HTTPException(status_code=401, detail=error_message)
                
                # Check if this might be a carousel/gallery that yt-dlp can't handle
                # These errors are common for gallery posts
                if (("No video formats found" in error_str or 
                     "empty media response" in error_str.lower()) 
                    and not is_story):
                    print("🎠 yt-dlp failed - might be a carousel or image post, trying gallery-dl...")
                    
                    # Always try to get metadata for gallery posts using yt-dlp
                    carousel_likes = 0
                    print("🔍 Attempting metadata extraction for gallery/carousel post...")
                    try:
                        # Create a new yt-dlp instance specifically for metadata
                        # Use different options that might work better for galleries
                        metadata_opts = {
                            'quiet': False,  # Show what's happening
                            'extract_flat': False,  # Full extraction
                            'skip_download': True,  # Only get metadata
                            'ignoreerrors': True,  # Continue even if download would fail
                            'no_warnings': False,
                        }
                        
                        # Add cookies if available
                        if cookies_path:
                            metadata_opts['cookiefile'] = cookies_path
                        
                        with yt_dlp.YoutubeDL(metadata_opts) as ydl_meta:
                            # Force metadata extraction even if download would fail
                            print(f"Extracting metadata from: {request.url}")
                            info = ydl_meta.extract_info(request.url, download=False)
                            
                            if info:
                                # Instagram stores caption in description field
                                carousel_caption = info.get('description', '') or info.get('title', '')
                                carousel_likes = info.get('like_count', 0) or 0
                                
                                # Also check for entries (carousel items)
                                if 'entries' in info and info['entries']:
                                    print(f"📸 Found carousel with {len(info['entries'])} items")
                                
                                print(f"✅ Metadata extracted! Caption: {carousel_caption[:100] if carousel_caption else 'Empty'}")
                                print(f"👍 Likes: {carousel_likes}")
                            else:
                                print("⚠️ No metadata returned from yt-dlp")
                                
                    except Exception as meta_err:
                        print(f"❌ Metadata extraction failed: {meta_err}")
                        # Even if metadata fails, we'll still try gallery-dl for the media
                    
                    print(f"🎠 Caption: {carousel_caption[:50] if carousel_caption else 'NO CAPTION'}, Likes: {carousel_likes}")
                    
                    if cookies_path:
                        try:
                            # Try gallery-dl as fallback for carousels - use Python module approach
                            backend_dir = Path(__file__).parent
                            venv_python = backend_dir.parent / "venv" / "bin" / "python"
                            
                            # Use the venv's Python to run gallery-dl as a module
                            if venv_python.exists():
                                gallery_cmd = [str(venv_python), "-m", "gallery_dl"]
                            else:
                                gallery_cmd = ["python3", "-m", "gallery_dl"]
                            
                            gallery_result = subprocess.run(
                                gallery_cmd + ["-d", str(download_dir), request.url, "--cookies", cookies_path],
                                capture_output=True, text=True, timeout=90)
                            
                            if gallery_result.returncode == 0:
                                print("✅ Gallery-dl succeeded!")
                                
                                # Find downloaded files (gallery-dl preserves original timestamps)
                                carousel_files = []
                                print(f"Searching for files in {download_dir}")
                                # Look specifically in gallery-dl subdirectories
                                for file_path in download_dir.rglob("*"):
                                    if (file_path.is_file() and 
                                        file_path.suffix.lower() in ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.jpg', '.jpeg', '.png', '.webp'] and
                                        'instagram' in str(file_path)):  # gallery-dl creates instagram subdirectory
                                        carousel_files.append(file_path)
                                        print(f"Found carousel file: {file_path.name}")
                                
                                if carousel_files:
                                    # Move files from subdirectories
                                    for file_path in carousel_files:
                                        if file_path.parent != download_dir:
                                            destination = download_dir / file_path.name
                                            shutil.move(str(file_path), str(destination))
                                    
                                    # Clean up subdirectories
                                    for subdir in download_dir.iterdir():
                                        if subdir.is_dir():
                                            try:
                                                shutil.rmtree(subdir)
                                            except:
                                                pass
                                    
                                    # Create metadata
                                    # Check if it's actually a carousel (multiple files) or single post
                                    actual_is_carousel = len(carousel_files) > 1
                                    
                                    # Always prefer real caption from Instagram
                                    if carousel_caption:
                                        actual_caption = carousel_caption
                                    else:
                                        # Empty caption is better than generic text
                                        actual_caption = ""
                                    
                                    metadata = ContentMetadata(
                                        id=str(uuid.uuid4()),
                                        url=request.url,
                                        caption=actual_caption,
                                        date=datetime.datetime.now().isoformat(),
                                        likes=carousel_likes,  # Use extracted likes from metadata
                                        is_video=False,  # Single images or mixed media
                                        file_path=carousel_files[0].name if carousel_files else None,
                                        thumbnail_path=None,
                                        is_carousel=actual_is_carousel,
                                        carousel_files=[f.name for f in carousel_files] if actual_is_carousel else None
                                    )
                                    
                                    print(f"🎠 Returning carousel with {len(carousel_files)} files: {[f.name for f in carousel_files]}")
                                    return {
                                        "success": True,
                                        "metadata": metadata.model_dump(),
                                        "message": f"Carousel downloaded successfully with {len(carousel_files)} items"
                                    }
                            else:
                                print(f"Gallery-dl also failed: {gallery_result.stderr}")
                        except Exception as gallery_error:
                            print(f"Gallery-dl fallback error: {gallery_error}")
                
                # Check if this might be a gallery/carousel post FIRST
                # Gallery posts often fail with "empty media response" but gallery-dl can still work
                is_potential_gallery = ("empty media response" in error_str.lower() or 
                                      "no video formats found" in error_str.lower() or
                                      "instagram api is not granting access" in error_str.lower())
                
                # Check for common session expiration errors
                # ONLY mark session invalid if we actually have cookies that failed AND it's not a gallery
                cookies_path = load_instagram_cookies()
                if not is_potential_gallery and cookies_path and any(phrase in error_str.lower() for phrase in [
                    "you need to log in",
                    "login required", 
                    "authentication required",
                    "session expired",
                    "invalid session",
                    "unauthorized access",
                    "this content is unreachable",
                    "content is not available",
                    "login to access",
                    "rate-limit reached"
                ]):
                    # Mark session as invalid in status file ONLY if we had cookies
                    try:
                        import json
                        backend_dir = Path(__file__).parent
                        status_file = str(backend_dir / "session_status.json")
                        status_data = {
                            "last_validation": datetime.datetime.now().isoformat(),
                            "is_valid": False,
                            "last_error": "Session expired or authentication invalid - please refresh Instagram cookies"
                        }
                        with open(status_file, 'w') as f:
                            json.dump(status_data, f)
                        print("Marked session as invalid in status file (had cookies that failed)")
                    except Exception as status_error:
                        print(f"Failed to update session status: {status_error}")
                    
                    raise HTTPException(
                        status_code=401,
                        detail="Session expired or authentication invalid. Please refresh your Instagram cookies."
                    )
                elif is_potential_gallery:
                    print("🎠 Detected potential gallery post error - will continue to try gallery-dl fallback")
                
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

@app.post("/download-carousel")
async def download_carousel_content(request: DownloadRequest):
    """Download Instagram carousel using gallery-dl"""
    try:
        print(f"🎠 Starting gallery-dl carousel download for URL: {request.url}")
        
        # Validate Instagram URL
        if not is_valid_instagram_url(request.url):
            raise HTTPException(status_code=400, detail="Invalid Instagram URL")
        
        # Create user-specific download directory
        download_dir = DOWNLOADS_DIR / request.user_id
        download_dir.mkdir(parents=True, exist_ok=True)
        
        # Check for cookies
        cookies_path = load_instagram_cookies()
        if not cookies_path:
            raise HTTPException(status_code=400, detail="Gallery-dl requires Instagram authentication. Please upload your cookies first.")
        
        # Use gallery-dl to download - use Python module approach
        backend_dir = Path(__file__).parent
        venv_python = backend_dir.parent / "venv" / "bin" / "python"
        
        # Use the venv's Python to run gallery-dl as a module
        if venv_python.exists():
            gallery_cmd = [str(venv_python), "-m", "gallery_dl"]
        else:
            gallery_cmd = ["python3", "-m", "gallery_dl"]
        
        cmd = gallery_cmd + ["-d", str(download_dir), request.url, "--cookies", cookies_path]
        print(f"Running gallery-dl: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Gallery-dl failed: {result.stderr}")
        
        # Find downloaded files (gallery-dl creates subdirectories)
        downloaded_files = []
        for file_path in download_dir.rglob("*"):
            if (file_path.is_file() and 
                file_path.stat().st_mtime > (time.time() - 120) and  # Files modified in last 2 minutes
                not file_path.name.endswith('.info.json') and
                file_path.suffix.lower() in ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.jpg', '.jpeg', '.png', '.webp']):
                downloaded_files.append(file_path)
                print(f"Found downloaded file: {file_path}")
        
        if not downloaded_files:
            raise HTTPException(status_code=500, detail="No files were downloaded by gallery-dl")
        
        # Move files to main directory for consistency with our system
        moved_files = []
        for file_path in downloaded_files:
            destination = download_dir / file_path.name
            shutil.move(str(file_path), str(destination))
            moved_files.append(destination)
            print(f"Moved {file_path.name} to main directory")
        
        # Clean up empty subdirectories
        for subdir in download_dir.iterdir():
            if subdir.is_dir():
                try:
                    shutil.rmtree(subdir)
                except:
                    pass
        
        # Sort files and determine main file
        moved_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        main_file = moved_files[0]
        
        # Determine if main file is video
        is_video = main_file.suffix.lower() in ['.mp4', '.webm', '.mkv', '.avi', '.mov']
        
        # Create metadata
        # Empty caption is better than generic text when we can't extract the real one
        metadata = ContentMetadata(
            id=str(uuid.uuid4()),
            url=request.url,
            caption="",  # Empty - frontend can handle this better
            date=datetime.datetime.now().isoformat(),
            likes=0,
            is_video=is_video,
            file_path=main_file.name,
            thumbnail_path=None,
            is_carousel=len(moved_files) > 1,
            carousel_files=[f.name for f in moved_files] if len(moved_files) > 1 else None
        )
        
        return {
            "success": True,
            "metadata": metadata.model_dump(),
            "message": f"Carousel downloaded successfully with gallery-dl ({len(moved_files)} files)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Carousel download error: {e}")
        raise HTTPException(status_code=500, detail=f"Carousel download failed: {str(e)}")

@app.get("/downloads/{user_id}")
async def list_downloads(user_id: str):
    """List all downloaded content for a user"""
    try:
        download_dir = DOWNLOADS_DIR / user_id
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
        # Use absolute path from DOWNLOADS_DIR
        file_path = DOWNLOADS_DIR / user_id / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="Not a file")
        
        # Security check - ensure file is within downloads directory
        downloads_dir = DOWNLOADS_DIR.resolve()
        if not file_path.resolve().is_relative_to(downloads_dir):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Determine media type based on file extension
        import mimetypes
        media_type, _ = mimetypes.guess_type(filename)
        if not media_type:
            media_type = "application/octet-stream"
        
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Cache-Control": "public, max-age=3600"
            }
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

@app.post("/restore-cookies")
async def restore_cookies_endpoint():
    """Endpoint to trigger cookie restoration from database"""
    try:
        # Check if we already have cookies
        existing_cookies = load_instagram_cookies()
        if existing_cookies:
            return {"message": "Cookies already present", "restored": False}
        
        # This endpoint would be called by a scheduled job or on-demand
        # The actual restoration happens via the frontend API
        return {
            "message": "Cookie restoration must be triggered from frontend",
            "restored": False,
            "info": "Use /api/auth/instagram/restore endpoint"
        }
    except Exception as e:
        return {"error": str(e), "restored": False}

@app.get("/auth/status")
async def get_auth_status():
    """Check authentication status"""
    try:
        backend_dir = Path(__file__).parent
        cookies_path = load_instagram_cookies()
        
        has_valid_auth = False
        session_age = None
        server_validation_failed = False
        
        if cookies_path:
            # Check if cookies file exists and has sessionid
            try:
                if cookies_path.endswith('.json'):
                    with open(cookies_path, 'r') as f:
                        cookie_data = json.load(f)
                        session_cookie = next((c for c in cookie_data if c.get('name') == 'sessionid'), None)
                        if session_cookie and session_cookie.get('value'):
                            has_valid_auth = True
                            # Get file modification time
                            stats = os.stat(cookies_path)
                            session_age = int((datetime.datetime.now().timestamp() - stats.st_mtime) / (60 * 60 * 24))
                else:
                    # Netscape format
                    with open(cookies_path, 'r') as f:
                        content = f.read()
                        if 'sessionid' in content:
                            has_valid_auth = True
                            stats = os.stat(cookies_path)
                            session_age = int((datetime.datetime.now().timestamp() - stats.st_mtime) / (60 * 60 * 24))
            except Exception as e:
                print(f"Error reading cookies: {e}")
        
        # Check session status file
        status_file = backend_dir / "session_status.json"
        if status_file.exists():
            try:
                with open(status_file, 'r') as f:
                    status_data = json.load(f)
                    if status_data.get('is_valid') == False:
                        server_validation_failed = True
                        has_valid_auth = False
            except:
                pass
        
        # Determine session status
        session_status = "unknown"
        warning_message = None
        
        if server_validation_failed:
            session_status = "expired"
            warning_message = "Session expired during use - please refresh your Instagram cookies"
        elif has_valid_auth and session_age is not None:
            if session_age < 14:
                session_status = "fresh"
            elif session_age < 21:
                session_status = "aging"
                warning_message = "Session is getting older - consider refreshing cookies soon"
            elif session_age < 30:
                session_status = "old"
                warning_message = "Session may expire soon - recommend refreshing cookies"
            else:
                session_status = "expired"
                warning_message = "Session is very old and likely expired - please refresh cookies"
        
        return {
            "authenticated": has_valid_auth,
            "storiesSupported": has_valid_auth,
            "sessionAge": session_age,
            "sessionStatus": session_status,
            "warningMessage": warning_message,
            "message": f"Instagram authentication available - Stories downloads enabled ({session_age} days old)" if has_valid_auth else "No Instagram authentication found - Stories require login"
        }
    except Exception as e:
        print(f"Auth status error: {e}")
        return {
            "authenticated": False,
            "storiesSupported": False,
            "sessionAge": None,
            "sessionStatus": "unknown",
            "warningMessage": None,
            "message": "Failed to check authentication status"
        }

@app.post("/upload-cookies")
async def upload_cookies(request: Request):
    """Receive cookies from frontend and save them"""
    try:
        backend_dir = Path(__file__).parent
        
        # Get the raw JSON content from the request
        body = await request.body()
        content = body.decode('utf-8')
        
        # Parse the JSON to validate it and get the data
        cookies_data = json.loads(content)
        
        # Save session cookies
        cookies_path = backend_dir / "session_cookies.json"
        with open(cookies_path, 'w', encoding='utf-8') as f:
            f.write(content)  # Write the original JSON string directly
        
        # Update session status
        status_path = backend_dir / "session_status.json"
        status_data = {
            "last_validation": datetime.datetime.now().isoformat(),
            "is_valid": True,
            "last_error": None
        }
        with open(status_path, 'w', encoding='utf-8') as f:
            json.dump(status_data, f, indent=2)
        
        # Convert to netscape format for yt-dlp
        try:
            cookies_netscape_path = str(backend_dir / "instagram_cookies.txt")
            convert_json_to_netscape_cookies(str(cookies_path), cookies_netscape_path)
            print(f"Converted cookies to Netscape format: {cookies_netscape_path}")
        except Exception as e:
            print(f"Warning: Could not convert cookies to Netscape format: {e}")
        
        # Check for sessionid for Stories support
        has_session_id = any(
            cookie.get('name') == 'sessionid' 
            for cookie in cookies_data if isinstance(cookie, dict)
        )
        
        return {
            "success": True,
            "message": "Cookies uploaded successfully to backend",
            "stories_supported": has_session_id,
            "cookies_count": len(cookies_data) if isinstance(cookies_data, list) else 0
        }
        
    except Exception as e:
        print(f"Cookie upload error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload cookies: {str(e)}"
        )

if __name__ == "__main__":
    print("=== yt-dlp Instagram Downloader Ready ===")
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)