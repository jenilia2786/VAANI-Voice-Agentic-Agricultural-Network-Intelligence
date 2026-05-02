# வாணி (VAANI) — Tamil Nadu Women Farmers AI Assistant

> **Voice-first, Tamil-language AI assistant for Tamil Nadu women farmers**

---

## 📖 About the Project & Problem it Solves

**The Problem:**
Women farmers in Tamil Nadu often face significant barriers to agricultural success. These include:
- **Language & Literacy Barriers:** Most digital agricultural platforms are text-heavy and in English, making them inaccessible to rural women with limited formal education.
- **Market Exploitation:** Lack of real-time market knowledge leads to exploitation by middlemen who offer sub-standard prices for their crops.
- **Technical Knowledge Gap:** Difficulties in identifying crop diseases early and lack of awareness about government subsidies and schemes tailored for them.

**The Solution — VAANI:**
VAANI (Voice Agentic Agricultural Network Intelligence) is an intuitive, Voice-first AI assistant built to empower these women. By utilizing voice commands and native Tamil responses, VAANI bridges the digital divide. It provides real-time market prices, diagnoses crop diseases via camera, reads and simplifies complex legal contracts, and connects farmers to Self Help Groups (SHGs) and government schemes—all accessible through a simple, mobile-first interface.

---

## 🌟 Key Features

VAANI includes over 25 AI-powered features, prominently featuring:
- **🗣️ Voice-First Tamil Interface:** Speak to the app in Tamil and get voice responses back.
- **🍃 Crop Disease Detector:** Take a picture of an affected leaf, and the Vision AI instantly identifies the disease and suggests remedies in Tamil.
- **⚖️ Market Truth Engine & Fraud Alerts:** Fetches real-time Mandi prices to prevent middleman exploitation.
- **📜 Contract Reader & Analyzer:** Upload farming agreements or contracts, and the AI will summarize the terms and warn about unfair clauses.
- **🏛️ Govt Scheme Finder:** Matches the farmer's profile with active state/central government agricultural schemes.
- **🤝 Collective Sale Organizer (SHG):** Helps Self Help Groups organize bulk sales for better negotiation power.
- **📻 Agri Radio:** Curated agricultural news and updates delivered in an audio format (TTS).
- **🌦️ Weather & Disaster Alerts:** Hyper-local weather forecasting and disaster preparedness.

---

## 🛠️ Tech Stack & Algorithms

We carefully selected technologies to ensure high performance, low latency (critical for voice), and offline reliability.

### **Frontend**
- **Vanilla HTML5, CSS3, JavaScript**
  - *Why:* To keep the application lightweight, fast-loading on rural 3G/4G networks, and completely independent of heavy frameworks. The UI is designed mobile-first for accessibility.
- **Web Speech API**
  - *Why:* Native browser integration for Speech-to-Text (capturing Tamil voice inputs) without requiring external heavy dependencies.

### **Backend**
- **Python & FastAPI**
  - *Why:* FastAPI provides exceptional performance, high concurrency for multiple API calls, and automatic interactive documentation (Swagger UI). Python gives access to the best AI and data ecosystems.
- **Uvicorn**
  - *Why:* A lightning-fast ASGI server implementation to serve the FastAPI application.

### **AI & Machine Learning**
- **Groq Cloud API (LLaMa 3.1 & LLaMa 3.2 Vision)**
  - *Why:* Groq's LPU provides blazing-fast inference speeds, reducing latency to milliseconds. This is critical for natural, real-time voice conversations. LLaMa provides strong multilingual capabilities for processing Tamil context, and LLaMa 3.2 Vision allows for accurate image-based crop disease diagnosis.
- **gTTS (Google Text-to-Speech)**
  - *Why:* Reliable and natural-sounding text-to-speech generation for delivering Tamil voice responses directly to the farmer.

### **Database & Storage**
- **Firebase Cloud Firestore**
  - *Why:* A NoSQL cloud database that provides real-time syncing across devices and easy scalability.
- **Local JSON DB Fallback (`local_db.json`)**
  - *Why:* Ensures the prototype/app remains fully functional offline or when cloud API limits are hit, which is crucial for demonstrations and low-connectivity environments.

### **External APIs & Integrations**
- **Open-Meteo API:** 
  - *Why:* Provides highly accurate, free, and hyper-local weather data without requiring API keys.
- **Agmarknet Data Integration:** 
  - *Why:* Used to fetch the official, real-time APMC mandi prices directly from government sources.
- **PyPDF2 & fpdf2:**
  - *Why:* For reading uploaded legal PDF contracts and generating printable AI reports.
- **Pillow (PIL):**
  - *Why:* For efficient image processing and resizing before sending crop images to the Vision AI model.

---

## 📋 Prerequisites

To run this project locally, you will need:
- **Python 3.9** or higher installed on your system.
- **Node.js & npm** (Optional, only if using a live server for the frontend).
- **Groq API Key** (Get one for free at [console.groq.com](https://console.groq.com/)).

---

## 🚀 How to Run

### 1. Automated Setup (Recommended)
We have provided an automated setup script that installs all backend dependencies and starts the environment.
```bash
# Clone the repository
git clone https://github.com/jenilia2786/VAANI-Voice-Agentic-Agricultural-Network-Intelligence.git
cd VAANI-Voice-Agentic-Agricultural-Network-Intelligence

# Run the automated setup script
python setup_project.py
```

### 2. Manual Setup
If you prefer to set it up manually:

**Backend Setup:**
```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup Environment Variables
cp .env.example .env
# Edit the .env file and add your GROQ_API_KEY
```

**Start the Backend Server:**
```bash
python main.py
```
*(The backend will start running at `http://localhost:8000`)*

**Start the Frontend:**
Since the frontend is Vanilla HTML/JS, simply use a local HTTP server:
- If using VS Code: Install the **Live Server** extension, right-click `frontend/index.html` and click "Open with Live Server".
- Using Python: Open a new terminal in the `frontend` folder and run `python -m http.server 5500`.

---

## 🔗 Links to Test

Once the servers are running, you can test the application using the following local links:

- **Frontend App (User Interface):** [http://localhost:5500/index.html](http://localhost:5500/index.html) *(or whichever port your local server used)*
- **Backend API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend API Alternate Docs (ReDoc):** [http://localhost:8000/redoc](http://localhost:8000/redoc)

> **Demo Note:** If Firebase credentials are not provided or internet is unstable, VAANI automatically falls back to `local_db.json` ensuring 100% of the app's features can be tested locally without setup!
