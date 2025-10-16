import React, { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export const Checklist: React.FC = () => {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: '1', text: 'Pack passport and travel documents', completed: false },
    { id: '2', text: 'Book accommodation', completed: true },
    { id: '3', text: 'Arrange airport transportation', completed: false },
    { id: '4', text: 'Check visa requirements', completed: true },
    { id: '5', text: 'Get travel insurance', completed: false },
  ]);
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      setItems([
        ...items,
        { id: Date.now().toString(), text: newItem, completed: false },
      ]);
      setNewItem('');
    }
  };

  const toggleItem = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

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

        <div className="space-y-3">
          {items.map((item) => (
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
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-neuro-textLight">
            <p>No items yet. Add your first checklist item above!</p>
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
