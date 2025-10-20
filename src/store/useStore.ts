import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TravelStore {
  destination: string;
  setDestination: (dest: string) => void;
  checklist: ChecklistItem[];
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => void;
  toggleChecklistItem: (id: string) => void;
  removeChecklistItem: (id: string) => void;
  updateChecklistItem: (id: string, text: string) => void;
  chatHistory: ChatMessage[];
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearChat: () => void;
  currentLocation: { lat: number; lng: number } | null;
  setCurrentLocation: (location: { lat: number; lng: number } | null) => void;
  currentLocationName: string | null;
  setCurrentLocationName: (name: string | null) => void;
  userProvidedLocation: { lat: number; lng: number; name: string } | null;
  setUserProvidedLocation: (location: { lat: number; lng: number; name: string } | null) => void;
  mapInstance: google.maps.Map | null;
  setMapInstance: (map: google.maps.Map | null) => void;
  locationConfirmed: boolean;
  setLocationConfirmed: (confirmed: boolean) => void;
  pendingSearchQuery: string | null;
  setPendingSearchQuery: (query: string | null) => void;
  awaitingLandmarks: boolean;
  setAwaitingLandmarks: (awaiting: boolean) => void;
  pendingLocationVerification: { 
    userLocation: { lat: number; lng: number; name: string };
    mapLocation: { lat: number; lng: number; name: string };
    distance: number;
  } | null;
  setPendingLocationVerification: (verification: { 
    userLocation: { lat: number; lng: number; name: string };
    mapLocation: { lat: number; lng: number; name: string };
    distance: number;
  } | null) => void;
}

export const useStore = create<TravelStore>()(
  persist(
    (set) => ({
      destination: '',
      setDestination: (dest) => set({ destination: dest }),
      checklist: [],
      addChecklistItem: (item) =>
        set((state) => {
          const newItem = { ...item, id: `${Date.now()}-${Math.random()}` };
          console.log('🔄 Store: Adding checklist item:', newItem);
          console.log('🔄 Store: Current checklist length:', state.checklist.length);
          const newChecklist = [...state.checklist, newItem];
          console.log('🔄 Store: New checklist length:', newChecklist.length);
          return { checklist: newChecklist };
        }),
      toggleChecklistItem: (id) =>
        set((state) => {
          console.log('Toggling item with id:', id);
          console.log('Current checklist:', state.checklist);
          
          const updatedChecklist = state.checklist.map((item) => {
            if (item.id === id) {
              console.log('Found matching item:', item);
              return { ...item, completed: !item.completed };
            }
            return item;
          });
          
          console.log('Updated checklist:', updatedChecklist);
          return { checklist: updatedChecklist };
        }),
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
          chatHistory: [...state.chatHistory, { role, content, timestamp: new Date() }],
        })),
      clearChat: () => set({ chatHistory: [] }),
      currentLocation: null,
      setCurrentLocation: (location) => set({ currentLocation: location }),
      currentLocationName: null,
      setCurrentLocationName: (name) => set({ currentLocationName: name }),
      userProvidedLocation: null,
      setUserProvidedLocation: (location) => set({ userProvidedLocation: location }),
      mapInstance: null,
      setMapInstance: (map) => set({ mapInstance: map }),
      locationConfirmed: false,
      setLocationConfirmed: (confirmed) => set({ locationConfirmed: confirmed }),
      pendingSearchQuery: null,
      setPendingSearchQuery: (query) => set({ pendingSearchQuery: query }),
      awaitingLandmarks: false,
      setAwaitingLandmarks: (awaiting) => set({ awaitingLandmarks: awaiting }),
      pendingLocationVerification: null,
      setPendingLocationVerification: (verification) => set({ pendingLocationVerification: verification }),
    }),
    {
      name: 'travel-guide-storage',
      partialize: (state) => ({
        chatHistory: state.chatHistory,
        currentLocationName: state.currentLocationName,
        locationConfirmed: state.locationConfirmed,
        userProvidedLocation: state.userProvidedLocation,
        checklist: state.checklist,  // Persist checklist items
      }),
    }
  )
);
