import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Category, Expense, CategoryFormData } from '../types/budget';
import { migrateLegacyData, needsMigration } from '../utils/budgetMigration';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  category: 'before' | 'arrival' | 'during' | 'departure' | 'after';
}

export interface AiChecklistItem {
  text: string;
  checked: boolean;
}

export interface AiChecklistCategory {
  category: string;
  items: AiChecklistItem[];
}

export interface AiChecklistData {
  title: string;
  categories: AiChecklistCategory[];
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface Store {
  // Chat state
  messages: Message[];
  addMessage: (role: 'user' | 'assistant', content: string, suggestions?: string[]) => void;
  clearMessages: () => void;
  chatHistory: Message[];

  // Location state
  currentLocation: Location | null;
  setCurrentLocation: (location: Location | null) => void;
  currentLocationName: string | null;
  setCurrentLocationName: (name: string | null) => void;
  locationConfirmed: boolean;
  setLocationConfirmed: (confirmed: boolean) => void;

  // Origin state
  origin: Location | null;
  setOrigin: (location: Location | null) => void;
  originLocation: Location | null;
  setOriginLocation: (location: Location | null) => void;

  // Map state
  mapInstance: google.maps.Map | null;
  setMapInstance: (map: google.maps.Map | null) => void;

  // Manual Checklist state
  checklistItems: ChecklistItem[];
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => void;
  removeChecklistItem: (id: string) => void;
  toggleChecklistItem: (id: string) => void;
  updateChecklistItem: (id: string, text: string) => void;
  clearChecklist: () => void;

  // AI Checklist state
  aiChecklist: AiChecklistData | null;
  setAiChecklist: (data: AiChecklistData) => void;
  toggleAiChecklistItem: (categoryIndex: number, itemIndex: number) => void;
  clearAiChecklist: () => void;
  addManualChecklistItem: (categoryName: string, itemText: string) => void;
  addManualCategory: (categoryName: string, itemText: string) => void;

  // Budget state - REFACTORED
  startingBudget: number;
  setStartingBudget: (amount: number) => void;
  categories: Category[];
  addCategory: (categoryData: CategoryFormData) => Category;
  updateCategory: (categoryId: string, categoryData: Partial<CategoryFormData>) => void;
  deleteCategory: (categoryId: string) => void;
  getCategoryById: (categoryId: string) => Category | undefined;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (expenseId: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => void;
  deleteExpense: (expenseId: string) => void;
  reassignExpenses: (oldCategoryId: string, newCategoryId: string) => void;
  clearBudget: () => void;

  // Dashboard state
  checklist: ChecklistItem[];
  destination: string | null;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Chat state
      messages: [],
      addMessage: (role, content, suggestions) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: Date.now().toString(),
              role,
              content,
              timestamp: new Date(),
              suggestions,
            },
          ],
          chatHistory: [
            ...state.messages,
            {
              id: Date.now().toString(),
              role,
              content,
              timestamp: new Date(),
              suggestions,
            },
          ],
        })),
      clearMessages: () => set({ messages: [], chatHistory: [] }),
      chatHistory: [],

      // Location state
      currentLocation: null,
      setCurrentLocation: (location) => set({ currentLocation: location }),
      currentLocationName: null,
      setCurrentLocationName: (name) => set({ currentLocationName: name }),
      locationConfirmed: false,
      setLocationConfirmed: (confirmed) => set({ locationConfirmed: confirmed }),

      // Origin state
      origin: null,
      setOrigin: (location) => set({ origin: location, originLocation: location }),
      originLocation: null,
      setOriginLocation: (location) => set({ originLocation: location, origin: location }),

      // Map state
      mapInstance: null,
      setMapInstance: (map) => set({ mapInstance: map }),

      // Manual Checklist state
      checklistItems: [],
      addChecklistItem: (item) =>
        set((state) => ({
          checklistItems: [
            ...state.checklistItems,
            { ...item, id: Date.now().toString() },
          ],
          checklist: [
            ...state.checklistItems,
            { ...item, id: Date.now().toString() },
          ],
        })),
      removeChecklistItem: (id) =>
        set((state) => ({
          checklistItems: state.checklistItems.filter((item) => item.id !== id),
          checklist: state.checklistItems.filter((item) => item.id !== id),
        })),
      toggleChecklistItem: (id) =>
        set((state) => {
          const updated = state.checklistItems.map((item) =>
            item.id === id ? { ...item, completed: !item.completed } : item
          );
          return {
            checklistItems: updated,
            checklist: updated,
          };
        }),
      updateChecklistItem: (id, text) =>
        set((state) => {
          const updated = state.checklistItems.map((item) =>
            item.id === id ? { ...item, text } : item
          );
          return {
            checklistItems: updated,
            checklist: updated,
          };
        }),
      clearChecklist: () => set({ checklistItems: [], checklist: [] }),

      // AI Checklist state
      aiChecklist: null,
      setAiChecklist: (data) => set({ aiChecklist: data }),
      toggleAiChecklistItem: (categoryIndex, itemIndex) =>
        set((state) => {
          if (!state.aiChecklist) return state;
          
          const newCategories = [...state.aiChecklist.categories];
          const category = { ...newCategories[categoryIndex] };
          const items = [...category.items];
          items[itemIndex] = {
            ...items[itemIndex],
            checked: !items[itemIndex].checked,
          };
          category.items = items;
          newCategories[categoryIndex] = category;

          return {
            aiChecklist: {
              ...state.aiChecklist,
              categories: newCategories,
            },
          };
        }),
      clearAiChecklist: () => set({ aiChecklist: null }),
      
      addManualChecklistItem: (categoryName, itemText) =>
        set((state) => {
          if (!state.aiChecklist) {
            return {
              aiChecklist: {
                title: 'My Travel Checklist',
                categories: [
                  {
                    category: categoryName,
                    items: [{ text: itemText, checked: false }],
                  },
                ],
              },
            };
          }

          const categoryIndex = state.aiChecklist.categories.findIndex(
            (cat) => cat.category === categoryName
          );

          if (categoryIndex === -1) {
            return {
              aiChecklist: {
                ...state.aiChecklist,
                categories: [
                  ...state.aiChecklist.categories,
                  {
                    category: categoryName,
                    items: [{ text: itemText, checked: false }],
                  },
                ],
              },
            };
          }

          const newCategories = [...state.aiChecklist.categories];
          newCategories[categoryIndex] = {
            ...newCategories[categoryIndex],
            items: [
              ...newCategories[categoryIndex].items,
              { text: itemText, checked: false },
            ],
          };

          return {
            aiChecklist: {
              ...state.aiChecklist,
              categories: newCategories,
            },
          };
        }),

      addManualCategory: (categoryName, itemText) =>
        set((state) => {
          if (!state.aiChecklist) {
            return {
              aiChecklist: {
                title: 'My Travel Checklist',
                categories: [
                  {
                    category: categoryName,
                    items: [{ text: itemText, checked: false }],
                  },
                ],
              },
            };
          }

          return {
            aiChecklist: {
              ...state.aiChecklist,
              categories: [
                ...state.aiChecklist.categories,
                {
                  category: categoryName,
                  items: [{ text: itemText, checked: false }],
                },
              ],
            },
          };
        }),

      // Budget state - REFACTORED
      startingBudget: 0,
      setStartingBudget: (amount) => set({ startingBudget: amount }),
      
      categories: [],
      
      addCategory: (categoryData) => {
        const now = new Date().toISOString();
        const newCategory: Category = {
          id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: categoryData.name,
          description: categoryData.description,
          color: categoryData.color,
          icon: categoryData.icon,
          allocated: categoryData.allocated,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          categories: [...state.categories, newCategory],
        }));

        return newCategory;
      },

      updateCategory: (categoryId, categoryData) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === categoryId
              ? {
                  ...cat,
                  ...categoryData,
                  updatedAt: new Date().toISOString(),
                }
              : cat
          ),
        }));
      },

      deleteCategory: (categoryId) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== categoryId),
          // Also remove expenses associated with this category
          expenses: state.expenses.filter((exp) => exp.categoryId !== categoryId),
        }));
      },

      getCategoryById: (categoryId) => {
        return get().categories.find((cat) => cat.id === categoryId);
      },

      expenses: [],
      
      addExpense: (expense) => {
        const now = new Date().toISOString();
        const newExpense: Expense = {
          ...expense,
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
        };

        set((state) => ({
          expenses: [...state.expenses, newExpense],
        }));
      },

      updateExpense: (expenseId, updates) => {
        set((state) => ({
          expenses: state.expenses.map((exp) =>
            exp.id === expenseId ? { ...exp, ...updates } : exp
          ),
        }));
      },

      deleteExpense: (expenseId) => {
        set((state) => ({
          expenses: state.expenses.filter((exp) => exp.id !== expenseId),
        }));
      },

      reassignExpenses: (oldCategoryId, newCategoryId) => {
        set((state) => ({
          expenses: state.expenses.map((exp) =>
            exp.categoryId === oldCategoryId
              ? { ...exp, categoryId: newCategoryId }
              : exp
          ),
        }));
      },

      clearBudget: () =>
        set({
          expenses: [],
          categories: [],
        }),

      // Dashboard state
      checklist: [],
      destination: null,
    }),
    {
      name: 'travel-guide-storage',
      version: 2, // Increment version for migration
      migrate: (persistedState: any, version: number) => {
        // Handle migration from version 1 to version 2
        if (version === 1 && needsMigration(persistedState)) {
          const { categories, expenses } = migrateLegacyData(
            persistedState.expenses || [],
            persistedState.categoryAllocations || {}
          );

          return {
            ...persistedState,
            categories,
            expenses,
            // Remove legacy fields
            categoryAllocations: undefined,
          };
        }

        return persistedState;
      },
      partialize: (state) => ({
        origin: state.origin,
        originLocation: state.originLocation,
        checklistItems: state.checklistItems,
        checklist: state.checklist,
        aiChecklist: state.aiChecklist,
        startingBudget: state.startingBudget,
        categories: state.categories,
        expenses: state.expenses,
      }),
    }
  )
);
