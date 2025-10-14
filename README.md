# TravelMate - AI-Powered Travel Guide

An all-in-one travel companion app with AI tour assistant, interactive maps, checklists, and emergency contacts.

## Features

- **Travel Checklist**: Organize tasks by travel phases (Before, Arrival, During, Departure)
- **Interactive Map**: Google Maps integration with search and location tracking
- **AI Tour Guide**: Powered by Google Gemini AI for personalized travel advice
- **Emergency Contacts**: Quick access to emergency numbers for 10+ countries

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

3. Get your API keys:

### Google Maps API Key
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing one
- Enable "Maps JavaScript API" and "Places API"
- Create credentials (API Key)
- Copy the API key to your `.env` file

### Gemini API Key
- Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- Click "Get API Key"
- Create a new API key
- Copy the API key to your `.env` file

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

- `VITE_GOOGLE_MAPS_API_KEY`: Required for map functionality
- `VITE_GEMINI_API_KEY`: Required for AI chatbot features

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Zustand (State Management)
- Google Maps API
- Google Gemini AI
- Neo-Brutalism Design Theme

## Design Philosophy

This app embraces Neo-Brutalism design with:
- Flat, saturated colors (#FF005C, #00F0FF, #FFD700)
- Thick black borders (3-4px)
- Hard shadows (6-8px offset)
- IBM Plex Mono font
- No gradients or rounded corners
- Intentionally rough, edgy aesthetic
