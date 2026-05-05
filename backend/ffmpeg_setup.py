import os, sys, shutil, zipfile, urllib.request, subprocess

FFMPEG_DIR  = os.path.join(os.path.dirname(__file__), "ffmpeg_bin")
FFMPEG_EXE  = os.path.join(FFMPEG_DIR, "ffmpeg.exe")
FFPROBE_EXE = os.path.join(FFMPEG_DIR, "ffprobe.exe")
FFMPEG_URL  = ("https://github.com/BtbN/FFmpeg-Builds/releases/download/"
               "latest/ffmpeg-master-latest-win64-gpl.zip")


def _in_path(cmd):
    return shutil.which(cmd) is not None


def _add_to_path():
    if FFMPEG_DIR not in os.environ.get("PATH", ""):
        os.environ["PATH"] = FFMPEG_DIR + os.pathsep + os.environ.get("PATH", "")


def ensure_ffmpeg():
    if _in_path("ffmpeg") and _in_path("ffprobe"):
        print("[ffmpeg] Found in system PATH ✓")
        return "ffmpeg", "ffprobe"
    if os.path.exists(FFMPEG_EXE) and os.path.exists(FFPROBE_EXE):
        print(f"[ffmpeg] Using cached binary ✓")
        _add_to_path(); return FFMPEG_EXE, FFPROBE_EXE
    print("[ffmpeg] Not found — downloading (~80MB, one time)...")
    os.makedirs(FFMPEG_DIR, exist_ok=True)
    try:
        zip_path = os.path.join(FFMPEG_DIR, "ffmpeg.zip")
        def progress(c, b, t):
            if t > 0:
                sys.stdout.write(f"\r[ffmpeg] {min(100, c*b*100//t)}%  ")
                sys.stdout.flush()
        urllib.request.urlretrieve(FFMPEG_URL, zip_path, reporthook=progress)
        print()
        with zipfile.ZipFile(zip_path, "r") as z:
            for m in z.namelist():
                if m.endswith("bin/ffmpeg.exe") or m.endswith("bin/ffprobe.exe"):
                    fname = os.path.basename(m)
                    with z.open(m) as src, open(os.path.join(FFMPEG_DIR, fname), "wb") as dst:
                        dst.write(src.read())
        os.remove(zip_path)
        if os.path.exists(FFMPEG_EXE):
            print(f"[ffmpeg] Ready ✓")
            _add_to_path(); return FFMPEG_EXE, FFPROBE_EXE
    except Exception as e:
        print(f"[ffmpeg] Download failed: {e}")
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        print(f"[ffmpeg] Using imageio-ffmpeg fallback ✓")
        return exe, exe
    except Exception:
        return "ffmpeg", "ffprobe"


FFMPEG_PATH, FFPROBE_PATH = ensure_ffmpeg()
