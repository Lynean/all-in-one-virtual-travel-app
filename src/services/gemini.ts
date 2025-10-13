import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env file');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function generateAIResponse(userMessage: string, destination?: string): Promise<string> {
  if (!genAI) {
    return "⚠️ AI service is not configured. Please add your Gemini API key to the .env file:\n\nVITE_GEMINI_API_KEY=your_api_key_here\n\nYou can get a free API key from: https://makersuite.google.com/app/apikey";
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const systemPrompt = `You are an expert travel guide assistant helping tourists navigate their destination${destination ? ` (${destination})` : ''}. 

Your role is to provide:
- Pre-arrival checklists and visa requirements
- Local transportation tips and app recommendations
- Price verification to help avoid tourist scams
- Navigation assistance and directions
- Local marketplace reviews and alternatives
- Cultural tips and etiquette advice
- Emergency information and safety tips

Provide practical, actionable advice based on real travel experiences. Be concise but thorough. Use bullet points and clear formatting. Always prioritize traveler safety and authentic local experiences.

User question: ${userMessage}`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID')) {
        return "⚠️ Invalid API key. Please check your Gemini API key in the .env file.\n\nGet a free API key from: https://makersuite.google.com/app/apikey";
      }
      if (error.message.includes('quota')) {
        return "⚠️ API quota exceeded. Please check your Gemini API usage limits.";
      }
    }
    
    return "⚠️ Sorry, I encountered an error connecting to the AI service. Please try again in a moment.";
  }
}
