import warnings; warnings.filterwarnings("ignore")
import ffmpeg_setup  # auto-download ffmpeg on first run

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
from routers import auth, documents, videos

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DocPod API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)

os.makedirs("uploads", exist_ok=True)
os.makedirs("videos",  exist_ok=True)

app.mount("/videos", StaticFiles(directory="videos"), name="videos")

app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(videos.router,    prefix="/api/videos",    tags=["videos"])

@app.get("/")
def root(): return {"message": "DocPod API running"}

@app.get("/health")
def health(): return {"status": "ok"}
