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
  checklist: [],
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
