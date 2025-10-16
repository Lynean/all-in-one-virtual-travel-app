# TravelMate AI Agent Backend (Gemini-Powered)

## Setup Instructions

### 1. Create .env file

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

### 2. Required API Keys

Add these keys to your `.env` file:

- **GEMINI_API_KEY**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **OPENWEATHER_API_KEY**: Get from [OpenWeatherMap](https://openweathermap.org/api)
- **EXCHANGERATE_API_KEY**: Get from [ExchangeRate-API](https://www.exchangerate-api.com/)
- **GOOGLE_TRANSLATE_API_KEY**: Get from [Google Cloud Console](https://console.cloud.google.com/)
- **GOOGLE_MAPS_API_KEY**: Get from [Google Cloud Console](https://console.cloud.google.com/)

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
# macOS: brew install redis && redis-server
# Ubuntu: sudo apt install redis-server && sudo systemctl start redis
```

### 5. Run the Backend

```bash
python main.py
```

The backend will start on `http://localhost:8000`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| GEMINI_API_KEY | Google Gemini API key | ✅ Yes |
| OPENWEATHER_API_KEY | OpenWeatherMap API key | ✅ Yes |
| EXCHANGERATE_API_KEY | ExchangeRate-API key | ✅ Yes |
| GOOGLE_TRANSLATE_API_KEY | Google Translate API key | ⚠️ Phase 2 |
| GOOGLE_MAPS_API_KEY | Google Maps API key | ⚠️ Phase 2 |
| REDIS_URL | Redis connection URL | ✅ Yes |
| REDIS_PASSWORD | Redis password (if required) | ❌ Optional |
| ENVIRONMENT | development/production | ✅ Yes |
| LOG_LEVEL | INFO/DEBUG/WARNING/ERROR | ✅ Yes |
| CORS_ORIGINS | Allowed frontend origins | ✅ Yes |

## API Endpoints

### REST Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /api/chat` - Send message to agent
- `POST /api/session/create` - Create new session
- `DELETE /api/session/{session_id}` - Delete session

### WebSocket

- `WS /ws/{user_id}/{session_id}` - Real-time chat

## Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test chat endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "session_id": "test-session",
    "message": "What is the weather in Paris?",
    "context": {}
  }'
```

## Docker Deployment

```bash
# Build image
docker build -t travelmate-backend .

# Run container
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  travelmate-backend
```

## Architecture

```
FastAPI Backend
├── main.py (API endpoints)
├── config.py (Settings management)
├── services/
│   ├── agent_service.py (LangChain + Gemini agent)
│   └── redis_service.py (Session management)
├── tools/
│   ├── weather_tool.py (OpenWeatherMap)
│   ├── currency_tool.py (ExchangeRate-API)
│   └── maps_tool.py (Map command generator)
└── models/
    ├── requests.py (API request models)
    └── responses.py (API response models)
```

## Troubleshooting

### Redis Connection Error
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

### Gemini API Error
- Verify your API key is correct in `.env`
- Check API quota at [Google AI Studio](https://makersuite.google.com/)
- Ensure `GEMINI_API_KEY` variable name is correct (not `OPENAI_API_KEY`)

### CORS Error
- Add your frontend URL to `CORS_ORIGINS` in `.env`
- Format: `http://localhost:5173,http://localhost:3000`
