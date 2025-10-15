import { GoogleGenerativeAI } from '@google/generative-ai';
import { useStore } from '../store/useStore';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY || API_KEY === 'undefined') {
  console.warn('Gemini API key not found. Please add VITE_GEMINI_API_KEY to ChatAndBuild settings');
}

const genAI = API_KEY && API_KEY !== 'undefined' ? new GoogleGenerativeAI(API_KEY) : null;

export async function generateAIResponse(userMessage: string, destination?: string): Promise<string> {
  if (!genAI) {
    return "⚠️ AI service is not configured. Please add your Gemini API key to ChatAndBuild settings.\n\nYou can get a free API key from: https://makersuite.google.com/app/apikey";
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const currentChecklist = useStore.getState().checklist;
    const checklistSummary = currentChecklist.length > 0 
      ? `\n\nCurrent Checklist (${currentChecklist.length} items):\n${currentChecklist.map(item => 
          `- [${item.completed ? 'x' : ' '}] ${item.text} (${item.category})`
        ).join('\n')}`
      : '\n\nCurrent Checklist: Empty';

    const systemPrompt = `You are an expert emergency and disaster preparedness assistant${destination ? ` for ${destination}` : ''}. 

Your role is to provide:
- Emergency preparedness checklists and planning
- Disaster response guidance and safety protocols
- Local emergency services and contact information
- Evacuation routes and shelter locations
- First aid and survival tips
- Weather alerts and natural disaster preparation
- Emergency supply recommendations
- Communication strategies during emergencies

CHECKLIST MANAGEMENT:
You can create checklist items for the user. When suggesting checklist items, format them like this:
[CHECKLIST:category:item_text]

Categories: before, arrival, during, departure
Example: [CHECKLIST:before:Prepare emergency supply kit with water and food]

You can suggest multiple checklist items in one response.
${checklistSummary}

Provide practical, life-saving advice based on emergency management best practices. Be clear, direct, and prioritize safety. Use bullet points and clear formatting.

User question: ${userMessage}`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    parseAndCreateChecklistItems(text);
    
    return text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID')) {
        return "⚠️ Invalid API key. Please check your Gemini API key in ChatAndBuild settings.\n\nGet a free API key from: https://makersuite.google.com/app/apikey";
      }
      if (error.message.includes('quota')) {
        return "⚠️ API quota exceeded. Please check your Gemini API usage limits.";
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
