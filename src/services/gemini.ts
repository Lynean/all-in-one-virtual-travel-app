import { GoogleGenerativeAI } from '@google/generative-ai';
import { useStore } from '../store/useStore';

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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Get current checklist state
    const currentChecklist = useStore.getState().checklist;
    const checklistSummary = currentChecklist.length > 0 
      ? `\n\nCurrent Checklist (${currentChecklist.length} items):\n${currentChecklist.map(item => 
          `- [${item.completed ? 'x' : ' '}] ${item.text} (${item.category})`
        ).join('\n')}`
      : '\n\nCurrent Checklist: Empty';

    const systemPrompt = `You are an expert travel guide assistant helping tourists navigate their destination${destination ? ` (${destination})` : ''}. 

Your role is to provide:
- Pre-arrival checklists and visa requirements
- Local transportation tips and app recommendations
- Price verification to help avoid tourist scams
- Navigation assistance and directions
- Local marketplace reviews and alternatives
- Cultural tips and etiquette advice
- Emergency information and safety tips

CHECKLIST MANAGEMENT:
You can create checklist items for the user. When suggesting checklist items, format them like this:
[CHECKLIST:category:item_text]

Categories: before, arrival, during, departure
Example: [CHECKLIST:before:Check passport validity (6+ months)]

You can suggest multiple checklist items in one response.
${checklistSummary}

Provide practical, actionable advice based on real travel experiences. Be concise but thorough. Use bullet points and clear formatting. Always prioritize traveler safety and authentic local experiences.

User question: ${userMessage}`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse and create checklist items from AI response
    parseAndCreateChecklistItems(text);
    
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
      if (error.message.includes('not found') || error.message.includes('404')) {
        return "⚠️ Model not available. Using fallback response:\n\nBased on travel forums and guides, here are some tips for your destination:\n\n• Check visa requirements and passport validity (6+ months)\n• Download offline maps and translation apps\n• Research local transportation options and prices\n• Get travel insurance and register with embassy if needed\n• Pack according to local climate and cultural norms\n\nFor real-time AI assistance, please check your API configuration or try again later.";
      }
    }
    
    return "⚠️ Sorry, I encountered an error connecting to the AI service. Please try again in a moment.";
  }
}

function parseAndCreateChecklistItems(text: string): void {
  const checklistRegex = /\[CHECKLIST:(before|arrival|during|departure):([^\]]+)\]/g;
  const matches = text.matchAll(checklistRegex);
  
  const { addChecklistItem } = useStore.getState();
  
  for (const match of matches) {
    const category = match[1] as 'before' | 'arrival' | 'during' | 'departure';
    const itemText = match[2].trim();
    
    addChecklistItem({
      text: itemText,
      completed: false,
      category: category,
    });
  }
}
