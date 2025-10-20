import React, { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Checklist: React.FC = () => {
  const items = useStore((state) => state.checklist);
  const addChecklistItem = useStore((state) => state.addChecklistItem);
  const toggleChecklistItem = useStore((state) => state.toggleChecklistItem);
  const removeChecklistItem = useStore((state) => state.removeChecklistItem);
  
  const [newItem, setNewItem] = useState('');

  // Debug: Log items whenever they change
  React.useEffect(() => {
    console.log('🔍 Checklist items updated:', items);
    console.log('🔍 Total items:', items.length);
  }, [items]);

  const addItem = () => {
    if (newItem.trim()) {
      addChecklistItem({
        text: newItem,
        completed: false,
        category: 'during', // Default category for manually added items
      });
      setNewItem('');
    }
  };

  const toggleItem = (id: string) => {
    toggleChecklistItem(id);
  };

  const deleteItem = (id: string) => {
    removeChecklistItem(id);
  };

  // Group items by category - support both old and new format
  const categoryLabels: Record<string, string> = {
    // Old format
    before: 'Before Travel',
    arrival: 'Upon Arrival', 
    during: 'During Trip',
    departure: 'Before Departure',
    // New comprehensive format
    pre_departure: '🛫 Pre-Departure Preparations',
    packing_essentials: '🎒 Packing - Essentials',
    packing_clothing: '👕 Packing - Clothing & Personal',
    arrival_procedures: '✈️ Arrival Procedures',
    activities_must_do: '⭐ Must-Do Activities',
    activities_optional: '🎯 Optional Activities',
    souvenir_packing: '🎁 Souvenirs & Shopping',
    post_trip: '🏠 Before Departure',
  };

  // Get unique categories from items
  const uniqueCategories = Array.from(new Set(items.map(item => item.category)));
  
  const categorizedItems: Record<string, typeof items> = {};
  uniqueCategories.forEach(category => {
    categorizedItems[category] = items.filter(item => item.category === category);
  });

  const renderItem = (item: typeof items[0]) => (
    <div
      key={item.id}
      className={`neuro-element-sm p-4 flex items-center gap-4 transition-all duration-300 ${
        item.completed ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={() => toggleItem(item.id)}
        className={`neuro-button p-2 transition-all duration-300 ${
          item.completed ? 'bg-gradient-to-br from-neuro-accent to-neuro-accentLight' : ''
        }`}
        aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {item.completed && (
          <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
        )}
        {!item.completed && (
          <div className="w-5 h-5" />
        )}
      </button>
      
      <span
        className={`flex-1 text-neuro-text ${
          item.completed ? 'line-through' : ''
        }`}
      >
        {item.text}
      </span>
      
      <button
        onClick={() => deleteItem(item.id)}
        className="neuro-button p-2 hover:bg-red-100 transition-colors"
        aria-label="Delete item"
      >
        <Trash2 className="w-5 h-5 text-red-500" strokeWidth={2.5} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="neuro-element p-6">
        <h2 className="text-2xl font-bold text-neuro-text mb-6">Travel Checklist</h2>
        
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            placeholder="Add new item..."
            className="flex-1 neuro-input px-4 py-3 text-neuro-text placeholder-neuro-textLight"
          />
          <button
            onClick={addItem}
            className="neuro-button px-6 py-3 bg-gradient-to-br from-neuro-accent to-neuro-accentLight"
            aria-label="Add item"
          >
            <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-neuro-textLight">
            <p>No items yet. Ask the AI guide to create a checklist for your trip!</p>
            <p className="text-sm mt-2">Or add items manually above.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(categorizedItems).map(([category, categoryItems]) => {
              if (categoryItems.length === 0) return null;
              
              const label = categoryLabels[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              
              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-neuro-accent mb-3 flex items-center gap-2">
                    {label}
                    <span className="text-xs text-neuro-textLight font-normal">
                      ({categoryItems.filter(i => i.completed).length}/{categoryItems.length})
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {categoryItems.map(renderItem)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="neuro-element p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neuro-textLight">Progress</p>
            <p className="text-2xl font-bold text-neuro-text">
              {items.filter(i => i.completed).length} / {items.length}
            </p>
          </div>
          <div className="neuro-element-sm p-4">
            <div className="text-3xl font-bold text-neuro-accent">
              {items.length > 0
                ? Math.round((items.filter(i => i.completed).length / items.length) * 100)
                : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
