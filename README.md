# DocPod

Turn any document into a narrated video podcast. Upload a PDF, DOCX, or PPTX and get back an MP4 with text-to-speech narration.

## Features

- User authentication (register, login)
- Upload PDF, DOC, DOCX, PPT, PPTX files (up to 50 MB)
- Automatic text extraction and TTS narration
- Adjustable playback speed (0.75× to 2.0×)
- In-browser video preview and MP4 download
- Per-user dashboard with all generated videos

## Tech Stack

- **Frontend:** React 18, Vite, Axios
- **Backend:** FastAPI, SQLAlchemy, SQLite
- **Auth:** JWT, bcrypt
- **Processing:** PyMuPDF, python-docx, python-pptx, gTTS, ffmpeg

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Internet connection (first run downloads ffmpeg)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
python uvicorn main:app --reload --port 8000
```

If uvicorn is not recognized:

python -m uvicorn main:app --reload --port 8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Usage

1. Register an account
2. Upload a document on the dashboard
3. Pick a voice and speed
4. Wait for the video to render (~1–3 minutes)
5. Preview or download the MP4

## Project Structure

```
docpod/
├── backend/        FastAPI server, models, routers
└── frontend/       React app
```

## License

MIT
