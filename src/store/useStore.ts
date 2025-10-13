import { create } from 'zustand';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  category: 'before' | 'arrival' | 'during' | 'departure';
}

export interface EmergencyContact {
  country: string;
  police: string;
  ambulance: string;
  fire: string;
  touristHotline?: string;
}

interface TravelStore {
  destination: string;
  setDestination: (dest: string) => void;
  checklist: ChecklistItem[];
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => void;
  toggleChecklistItem: (id: string) => void;
  removeChecklistItem: (id: string) => void;
  updateChecklistItem: (id: string, text: string) => void;
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearChat: () => void;
  currentLocation: { lat: number; lng: number } | null;
  setCurrentLocation: (location: { lat: number; lng: number } | null) => void;
}

export const useStore = create<TravelStore>((set) => ({
  destination: '',
  setDestination: (dest) => set({ destination: dest }),
  checklist: [
    { id: '1', text: 'Check passport validity (6+ months)', completed: false, category: 'before' },
    { id: '2', text: 'Apply for visa if required', completed: false, category: 'before' },
    { id: '3', text: 'Book accommodation', completed: false, category: 'before' },
    { id: '4', text: 'Purchase travel insurance', completed: false, category: 'before' },
    { id: '5', text: 'Notify bank of travel plans', completed: false, category: 'before' },
    { id: '6', text: 'Get local SIM card or data plan', completed: false, category: 'arrival' },
    { id: '7', text: 'Exchange currency', completed: false, category: 'arrival' },
    { id: '8', text: 'Download offline maps', completed: false, category: 'before' },
  ],
  addChecklistItem: (item) =>
    set((state) => ({
      checklist: [...state.checklist, { ...item, id: Date.now().toString() }],
    })),
  toggleChecklistItem: (id) =>
    set((state) => ({
      checklist: state.checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    })),
  removeChecklistItem: (id) =>
    set((state) => ({
      checklist: state.checklist.filter((item) => item.id !== id),
    })),
  updateChecklistItem: (id, text) =>
    set((state) => ({
      checklist: state.checklist.map((item) =>
        item.id === id ? { ...item, text } : item
      ),
    })),
  chatHistory: [],
  addMessage: (role, content) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, { role, content }],
    })),
  clearChat: () => set({ chatHistory: [] }),
  currentLocation: null,
  setCurrentLocation: (location) => set({ currentLocation: location }),
}));
