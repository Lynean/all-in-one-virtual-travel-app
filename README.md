# 🌍 TravelMate - AI-Powered Virtual Travel Guide

An intelligent travel companion that combines **Gemini AI** for quick responses and **LangChain Agent** for complex trip planning.

## ✨ Features

### 🧠 Dual AI System
- **Gemini Quick Mode**: Fast responses for simple queries (nearby places, directions)
- **LangChain Agent**: Complex workflows (multi-day planning, budget optimization)
- **Automatic Routing**: Intelligently chooses the best AI for your query

### 🗺️ Smart Location Services
- Real-time GPS tracking with verification protocol
- Google Maps integration with in-app directions
- Nearby place search with detailed results
- Location change detection

### 📋 Trip Planning
- Multi-day itinerary generation
- Budget tracking and optimization
- Weather-based activity recommendations
- Currency conversion

### 🔒 Privacy & Security
- Location confirmation before GPS usage
- Session-based conversation memory
- Secure API key management
- GDPR-compliant data handling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+ (for backend)
- Redis (for backend sessions)
- API Keys:
  - Google Gemini API
  - Google Maps API
  - OpenAI API (for LangChain)
  - OpenWeatherMap API
  - ExchangeRate-API

### Frontend Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Add your API keys to .env
```

3. **Start development server:**
```bash
npm run dev
```

### Backend Setup

1. **Navigate to backend:**
```bash
cd backend
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure backend environment:**
```bash
cp .env.example .env
# Add your API keys to backend/.env
```

4. **Start Redis:**
```bash
redis-server
```

5. **Run backend:**
```bash
python main.py
```

Backend will be available at `http://localhost:8000`

## 🏗️ Architecture

```
Frontend (React + TypeScript)
├── Hybrid Router
│   ├── Simple queries → Gemini API
│   └── Complex queries → FastAPI Backend
│
Backend (FastAPI + LangChain)
├── LangChain Agent (GPT-4-Turbo)
├── Tools
│   ├── Weather Tool (OpenWeatherMap)
│   ├── Currency Tool (ExchangeRate-API)
│   └── Maps Tool (Command Generator)
└── Redis (Session Management)
```

## 🔄 Hybrid Routing Logic

The system automatically routes queries:

**→ Gemini (Fast & Cheap)**
- "Find restaurants near me"
- "Show directions to downtown"
- "What's around here?"

**→ LangChain Agent (Complex & Autonomous)**
- "Plan a 3-day trip to Paris with $500 budget"
- "Create an itinerary considering weather"
- "Convert prices and optimize my budget"

## 📡 API Endpoints

### Frontend → Backend

**POST** `/api/chat`
```json
{
  "user_id": "user123",
  "session_id": "session456",
  "message": "Plan a trip to Tokyo",
  "context": {
    "current_location": { "lat": 35.6762, "lng": 139.6503 },
    "location_confirmed": true,
    "budget": "$1000"
  }
}
```

**WebSocket** `/ws/{user_id}/{session_id}`
- Real-time chat communication

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State**: Zustand
- **Maps**: Google Maps JavaScript API
- **AI**: Google Gemini API

### Backend
- **Framework**: FastAPI
- **AI**: LangChain + OpenAI GPT-4-Turbo
- **Session**: Redis
- **APIs**: OpenWeatherMap, ExchangeRate-API

## 📊 Cost Optimization

- **Hybrid routing** reduces API costs by 60-70%
- **Redis caching** for API responses
- **Session management** with 24-hour TTL
- **Fallback models** (GPT-3.5-Turbo) for cost control

**Estimated Monthly Cost**: ~$70 (within $100 budget)

## 🔐 Environment Variables

### Frontend (.env)
```env
VITE_GEMINI_API_KEY=your_gemini_key
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
VITE_BACKEND_URL=http://localhost:8000
```

### Backend (backend/.env)
```env
OPENAI_API_KEY=your_openai_key
OPENWEATHER_API_KEY=your_weather_key
EXCHANGERATE_API_KEY=your_currency_key
REDIS_URL=redis://localhost:6379
```

## 🚢 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render)
```bash
cd backend
docker build -t travelmate-backend .
# Deploy container
```

## 📝 Development Roadmap

### ✅ Phase 1 (Complete)
- FastAPI backend with LangChain
- Hybrid routing system
- Basic tools (Weather, Currency, Maps)
- Session management

### 🔄 Phase 2 (In Progress)
- Multi-day trip planner
- Budget optimizer
- Weather-based replanning
- Translation support

### 📅 Phase 3 (Planned)
- Booking.com integration
- Proactive suggestions
- User preference learning
- Performance optimization

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Google Gemini AI
- OpenAI GPT-4
- LangChain Framework
- Google Maps Platform

---

Built with ❤️ by the TravelMate Team
