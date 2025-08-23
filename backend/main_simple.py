from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from pathlib import Path
import uuid
from typing import Optional
import json
import datetime

# Basic configuration
PROJECT_ROOT = Path(__file__).parent.parent.absolute()
DOWNLOADS_DIR = PROJECT_ROOT / "downloads"
DOWNLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Dumpstr API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str
    user_id: str

@app.get("/")
async def root():
    return {"message": "Dumpstr API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.now().isoformat()}

@app.post("/download")
async def download_content(request: DownloadRequest):
    """Placeholder download endpoint - will be enhanced once deployment works"""
    return {
        "success": False,
        "message": "Download functionality temporarily disabled during deployment setup. Core API is working!"
    }

@app.get("/downloads/{user_id}")
async def list_downloads(user_id: str):
    """List downloads for a user"""
    download_dir = DOWNLOADS_DIR / user_id
    if not download_dir.exists():
        return {"downloads": []}
    
    downloads = []
    for item in download_dir.iterdir():
        if item.is_file():
            downloads.append({
                "filename": item.name,
                "path": str(item),
                "size": item.stat().st_size,
                "created": item.stat().st_ctime
            })
    
    return {"downloads": downloads}

if __name__ == "__main__":
    print("🚀 Dumpstr Simple API Starting...")
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)