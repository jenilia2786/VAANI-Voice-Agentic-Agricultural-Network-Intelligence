# வாணி (VAANI) — Tamil Nadu Women Farmers AI Assistant

> **Voice-first, Tamil-language AI assistant for Tamil Nadu women farmers**

## 🌱 Project Structure

```
vaani/
├── frontend/           # HTML/CSS/JS (Vanilla, no framework)
│   ├── index.html      # Landing + OTP Login + Onboarding
│   ├── dashboard.html  # Main dashboard with feature cards
│   ├── app.js          # Core: voice, modal, feature router
│   └── ...             # Feature JS modules
├── backend/            # Python FastAPI
│   ├── main.py         # App entry point (all routes mounted)
│   ├── routes/         # 25+ route modules
│   ├── services/       # AI, Firebase, Weather, Agmarknet
│   ├── models/         # Pydantic schemas
│   └── config.py       # Centralized configuration
└── setup_project.py    # Automated setup script
```

## 🚀 Quick Start

The easiest way to get started is using the automated setup script:

```bash
# 1. Install dependencies and setup environment
python setup_project.py

# 2. Run the backend
cd backend
source venv/Scripts/activate  # or venv\Scripts\activate on Windows
python main.py
```

### Manual Setup (Optional)

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your GROQ_API_KEY
python main.py
```

API docs: http://localhost:8000/docs

## 🔑 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
GROQ_API_KEY=gsk_...          # Required for AI features
FIREBASE_CREDENTIALS_PATH=./firebase_key.json  # Optional (local fallback)
USE_LOCAL_DB_ALWAYS=False     # Set to True to disable Cloud Firestore
```

**Demo mode:** If `FIREBASE_CREDENTIALS_PATH` is missing or the API is disabled, VAANI automatically uses `local_db.json` to store all data. No functionality is lost for the demo!

## 🌟 25+ Features

VAANI includes over 25 AI-powered features including:
- **Crop Disease Detector** (Vision AI)
- **Market Truth Engine** & Fraud Alerts
- **Govt Scheme Finder**
- **Collective Sale Organizer**
- **Farm Credit Score**
- **Contract Reader & Analyzer**
- **Agri Radio** (Tamil News TTS)

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JS (Dynamic, mobile-first)
- **Backend:** Python FastAPI
- **Database:** Firebase Firestore (Cloud) + **Local JSON Fallback**
- **AI:** Llama 3.1 & 3.2 via **Groq API**
- **Weather:** Open-Meteo
- **Voice:** Web Speech API + **gTTS** (for spoken responses)

Built for Tamil Nadu women farmers. வாணி — உங்கள் விவசாய உதவியாளர். 🌱

