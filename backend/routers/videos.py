import warnings; warnings.filterwarnings("ignore")
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from auth_utils import get_current_user
import models, os, uuid, threading, time, subprocess

router = APIRouter()


def _ffmpeg():
    try:
        from ffmpeg_setup import FFMPEG_PATH; return FFMPEG_PATH
    except Exception:
        return "ffmpeg"


def _run(cmd, timeout=300):
    kw = dict(capture_output=True, timeout=timeout)
    if os.name == "nt": kw["creationflags"] = 0x08000000
    return subprocess.run(cmd, **kw)


class GenerateRequest(BaseModel):
    document_id: int
    voice: str = "nova"
    speed: float = 1.0


def _generate_bg(video_id: int, db_url: str):
    import warnings; warnings.filterwarnings("ignore")
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    db = sessionmaker(bind=create_engine(db_url, connect_args={"check_same_thread": False} if "sqlite" in db_url else {}))()

    def upd(status, progress, note=""):
        try:
            v = db.query(models.Video).filter(models.Video.id == video_id).first()
            if v:
                v.status, v.progress = status, progress
                if note: v.error_message = note
                db.commit()
        except Exception: pass

    def fail(msg):
        try:
            v = db.query(models.Video).filter(models.Video.id == video_id).first()
            if v: v.status = "failed"; v.error_message = str(msg)[:500]; db.commit()
        except Exception: pass

    try:
        vid = db.query(models.Video).filter(models.Video.id == video_id).first()
        if not vid: return
        doc = db.query(models.Document).filter(models.Document.id == vid.document_id).first()
        text = (doc.extracted_text or "").strip() if doc else ""
        if not text: text = "This document has no readable text."

        ffmpeg = _ffmpeg()

        # Stage 1 — TTS
        upd("tts", 15)
        from tts_engine import generate_audio
        audio_path, duration, warn = generate_audio(text, vid.speed, ffmpeg, "videos")
        tts_ok = os.path.exists(audio_path) and os.path.getsize(audio_path) > 100
        upd("tts", 60, warn)
        time.sleep(0.2)

        # Stage 2 — Render
        upd("rendering", 65)
        video_path = os.path.join("videos", f"{uuid.uuid4().hex}.mp4")
        safe = (vid.title or "DocPod Video")
        for ch in "\\':%[];=": safe = safe.replace(ch, " ")
        safe = safe.strip()
        if len(safe) > 38:
            mid = len(safe) // 2
            sp = safe.rfind(" ", 0, mid)
            if sp > 0: safe = safe[:sp] + "\n" + safe[sp+1:]

        video_ok = False

        # Attempt 1 — branded bg + title
        try:
            vf = (f"color=c=0x0F6E56:size=1280x720:duration={duration:.3f}:rate=24[bg];"
                  f"[bg]drawtext=text='{safe}':fontcolor=white:fontsize=52:"
                  f"x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=14")
            cmd = [ffmpeg, "-y", "-filter_complex", vf]
            if tts_ok:
                cmd += ["-i", audio_path, "-map", "0:v", "-map", "1:a",
                        "-c:a", "aac", "-b:a", "128k", "-shortest"]
            cmd += ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
                    "-movflags", "+faststart", video_path]
            r = _run(cmd)
            video_ok = r.returncode == 0 and os.path.exists(video_path) and os.path.getsize(video_path) > 1000
        except Exception: video_ok = False

        # Attempt 2 — plain color fallback
        if not video_ok:
            try:
                if os.path.exists(video_path): os.remove(video_path)
                video_path = os.path.join("videos", f"{uuid.uuid4().hex}.mp4")
                cmd = [ffmpeg, "-y", "-f", "lavfi",
                       "-i", f"color=c=0x0F6E56:size=1280x720:duration={duration:.3f}:rate=24"]
                if tts_ok:
                    cmd += ["-i", audio_path, "-map", "0:v", "-map", "1:a",
                            "-c:a", "aac", "-b:a", "128k", "-shortest"]
                cmd += ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
                        "-movflags", "+faststart", video_path]
                r = _run(cmd)
                video_ok = r.returncode == 0 and os.path.exists(video_path) and os.path.getsize(video_path) > 1000
            except Exception as e:
                fail(f"Render failed: {e}"); return

        if not video_ok:
            fail("ffmpeg could not render video. Ensure ffmpeg is installed."); return

        upd("rendering", 92)
        time.sleep(0.2)

        # Finalize
        vid = db.query(models.Video).filter(models.Video.id == video_id).first()
        vid.audio_path = audio_path if tts_ok else ""
        vid.video_path = video_path
        vid.duration   = duration
        vid.status     = "ready"
        vid.progress   = 100
        if warn and not vid.error_message: vid.error_message = warn
        db.commit()

        # Delete source upload file
        try:
            d = db.query(models.Document).filter(models.Document.id == vid.document_id).first()
            if d and d.filename:
                p = os.path.join("uploads", d.filename)
                if os.path.exists(p): os.remove(p)
        except Exception: pass

    except Exception as e:
        fail(str(e))
    finally:
        db.close()


@router.post("/generate")
def generate(req: GenerateRequest, db: Session = Depends(get_db),
             user: models.User = Depends(get_current_user)):
    from config import MIN_TEXT_LENGTH
    doc = db.query(models.Document).filter(
        models.Document.id == req.document_id,
        models.Document.user_id == user.id
    ).first()
    if not doc: raise HTTPException(404, "Document not found")
    if doc.status == "failed":
        raise HTTPException(400, "Document extraction failed. Re-upload the file.")
    if doc.status not in ("extracted", "uploaded"):
        raise HTTPException(400, f"Document still processing ({doc.status}). Please wait.")
    if len((doc.extracted_text or "").strip()) < MIN_TEXT_LENGTH:
        raise HTTPException(400, "Document has too little text. May be a scanned/image PDF.")

    existing = db.query(models.Video).filter(
        models.Video.document_id == doc.id,
        models.Video.status.in_(["queued","extracting","tts","rendering","ready"])
    ).first()
    if existing: return {"video_id": existing.id, "status": existing.status}

    title = doc.original_filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()
    vid = models.Video(user_id=user.id, document_id=doc.id, title=title,
                       voice=req.voice, speed=req.speed, status="queued", progress=0, error_message="")
    db.add(vid); db.commit(); db.refresh(vid)

    from database import DATABASE_URL
    threading.Thread(target=_generate_bg, args=(vid.id, DATABASE_URL), daemon=True).start()
    return {"video_id": vid.id, "status": "queued"}


@router.post("/{video_id}/retry")
def retry(video_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    vid = db.query(models.Video).filter(models.Video.id == video_id, models.Video.user_id == user.id).first()
    if not vid: raise HTTPException(404, "Not found")
    if vid.status != "failed": raise HTTPException(400, "Only failed videos can be retried")
    for p in [vid.video_path, vid.audio_path]:
        if p and os.path.exists(p):
            try: os.remove(p)
            except: pass
    vid.status = "queued"; vid.progress = 0; vid.error_message = ""
    vid.video_path = ""; vid.audio_path = ""; vid.duration = 0.0
    db.commit()
    from database import DATABASE_URL
    threading.Thread(target=_generate_bg, args=(vid.id, DATABASE_URL), daemon=True).start()
    return {"video_id": vid.id, "status": "queued"}


@router.get("/")
def list_videos(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    vids = db.query(models.Video).filter(models.Video.user_id == user.id).order_by(models.Video.created_at.desc()).all()
    return [_out(v) for v in vids]


@router.get("/{video_id}")
def get_video(video_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    vid = db.query(models.Video).filter(models.Video.id == video_id, models.Video.user_id == user.id).first()
    if not vid: raise HTTPException(404, "Not found")
    return _out(vid)


@router.delete("/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    vid = db.query(models.Video).filter(models.Video.id == video_id, models.Video.user_id == user.id).first()
    if not vid: raise HTTPException(404, "Not found")
    for p in [vid.video_path, vid.audio_path]:
        if p and os.path.exists(p):
            try: os.remove(p)
            except: pass
    db.delete(vid); db.commit()
    return {"deleted": True}


def _out(v: models.Video) -> dict:
    from config import BACKEND_URL
    url = None
    if v.video_path and os.path.exists(v.video_path):
        url = f"{BACKEND_URL}/videos/{os.path.basename(v.video_path)}"
    dur = ""
    if v.duration:
        dur = f"{int(v.duration//60)}:{int(v.duration%60):02d}"
    return {"id": v.id, "title": v.title, "voice": v.voice, "speed": v.speed,
            "status": v.status, "progress": v.progress, "duration": dur,
            "duration_seconds": v.duration, "video_url": url,
            "document_id": v.document_id, "error_message": v.error_message,
            "created_at": v.created_at.isoformat()}
