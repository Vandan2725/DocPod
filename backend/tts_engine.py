"""
TTS Engine — full-document narration with sentence-aware chunking,
multi-chunk concatenation, and speed adjustment via ffmpeg atempo.
"""
import os, uuid, re, tempfile, shutil, subprocess
from config import TTS_CHUNK_SIZE


def _run(cmd, timeout=300):
    kw = dict(capture_output=True, timeout=timeout)
    if os.name == "nt":
        kw["creationflags"] = 0x08000000
    return subprocess.run(cmd, **kw)


def _split_text(text: str) -> list:
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) <= TTS_CHUNK_SIZE:
        return [text]
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks, cur = [], ""
    for s in sentences:
        if len(s) > TTS_CHUNK_SIZE:
            for part in re.split(r'(?<=[,;:])\s+', s):
                if len(cur) + len(part) + 1 <= TTS_CHUNK_SIZE:
                    cur = (cur + " " + part).strip()
                else:
                    if cur: chunks.append(cur)
                    cur = part[:TTS_CHUNK_SIZE]
        else:
            if len(cur) + len(s) + 1 <= TTS_CHUNK_SIZE:
                cur = (cur + " " + s).strip()
            else:
                if cur: chunks.append(cur)
                cur = s
    if cur: chunks.append(cur)
    return [c for c in chunks if c.strip()]


def _concat(mp3s: list, out: str, ffmpeg: str) -> bool:
    if len(mp3s) == 1:
        shutil.copy2(mp3s[0], out); return True
    lst = out + ".txt"
    try:
        with open(lst, "w", encoding="utf-8") as f:
            for p in mp3s:
                f.write(f"file '{p.replace(chr(92), '/')}'\n")
        r = _run([ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out])
        return r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 100
    finally:
        if os.path.exists(lst): os.remove(lst)


def _apply_speed(inp: str, out: str, speed: float, ffmpeg: str) -> bool:
    if abs(speed - 1.0) < 0.05:
        shutil.copy2(inp, out); return True
    speed = max(0.5, min(2.0, speed))
    r = _run([ffmpeg, "-y", "-i", inp, "-filter:a", f"atempo={speed:.2f}",
              "-c:a", "libmp3lame", "-q:a", "4", out])
    return r.returncode == 0 and os.path.exists(out)


def _silent(out: str, duration: float, ffmpeg: str) -> bool:
    r = _run([ffmpeg, "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
              "-t", str(duration), "-q:a", "9", "-acodec", "libmp3lame", out])
    return r.returncode == 0


def generate_audio(text: str, speed: float, ffmpeg: str, out_dir: str):
    """Returns (audio_path, duration_seconds, warning_str)."""
    import warnings; warnings.filterwarnings("ignore")
    final = os.path.join(out_dir, f"{uuid.uuid4().hex}.mp3")
    text = text.strip()

    if not text or len(text) < 10:
        _silent(final, 5.0, ffmpeg)
        return final, 5.0, "Text too short — silent audio used."

    chunks = _split_text(text)
    tmp = tempfile.mkdtemp()
    chunk_paths, warning = [], ""

    try:
        try:
            from gtts import gTTS
            for i, chunk in enumerate(chunks):
                cp = os.path.join(tmp, f"c{i:04d}.mp3")
                try:
                    gTTS(text=chunk, lang="en").save(cp)
                    if os.path.exists(cp) and os.path.getsize(cp) > 50:
                        chunk_paths.append(cp)
                except Exception as e:
                    warning = f"TTS chunk {i+1} failed: {e}"; break
        except ImportError:
            warning = "gTTS not installed."

        if not chunk_paths:
            warning = warning or "TTS unavailable."
            est = max(10.0, len(text) / 15)
            _silent(final, est, ffmpeg)
            return final, est, warning

        concat = os.path.join(tmp, "concat.mp3")
        if not _concat(chunk_paths, concat, ffmpeg):
            concat = chunk_paths[0]; warning = "Concat failed, using partial audio."

        if abs(speed - 1.0) > 0.05:
            sp = os.path.join(tmp, "speed.mp3")
            if _apply_speed(concat, sp, speed, ffmpeg):
                concat = sp
            else:
                warning = (warning + " Speed adjust failed.").strip()

        shutil.copy2(concat, final)

    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # Get duration via ffprobe
    duration = len(text) / 15
    try:
        from ffmpeg_setup import FFPROBE_PATH as ffprobe
    except Exception:
        ffprobe = "ffprobe"
    try:
        r = _run([ffprobe, "-v", "error", "-show_entries", "format=duration",
                  "-of", "default=noprint_wrappers=1:nokey=1", final])
        if r.returncode == 0 and r.stdout.strip():
            duration = float(r.stdout.strip())
    except Exception:
        pass

    return final, duration, warning
