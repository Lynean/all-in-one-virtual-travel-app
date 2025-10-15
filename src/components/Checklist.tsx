import React, { useState } from 'react';
import { Check, Plus, Trash2, Edit2, X } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Checklist: React.FC = () => {
  const { checklist, addChecklistItem, toggleChecklistItem, removeChecklistItem, updateChecklistItem } = useStore();
  const [newItem, setNewItem] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'before' | 'arrival' | 'during' | 'departure'>('before');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      addChecklistItem({
        text: newItem,
        completed: false,
        category: selectedCategory,
      });
      setNewItem('');
    }
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      updateChecklistItem(id, editText);
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleToggle = (id: string) => {
    console.log('Checkbox clicked for item:', id);
    toggleChecklistItem(id);
  };

  const categories: Array<{ value: 'before' | 'arrival' | 'during' | 'departure'; label: string }> = [
    { value: 'before', label: 'Before Travel' },
    { value: 'arrival', label: 'On Arrival' },
    { value: 'during', label: 'During Stay' },
    { value: 'departure', label: 'Before Departure' },
  ];

  const categoryColors = {
    before: 'from-blue-400 to-blue-600',
    arrival: 'from-green-400 to-green-600',
    during: 'from-purple-400 to-purple-600',
    departure: 'from-orange-400 to-orange-600',
  };

  return (
    <div className="space-y-6">
      <div className="bg-neuro-checklist-card rounded-3xl p-6 shadow-neuro-checklist">
        <h2 className="text-2xl font-bold text-neuro-checklist-text mb-6">Emergency Checklist</h2>
        
        <div className="space-y-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat.value
                    ? 'shadow-neuro-active bg-gradient-to-br from-neuro-accent to-neuro-accentLight text-white'
                    : 'shadow-neuro-checklist-sm hover:shadow-neuro-hover text-neuro-checklist-text'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          <div className="flex gap-3">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
              placeholder="Add new item..."
              className="flex-1 px-4 py-3 rounded-2xl shadow-neuro-inset bg-neuro-checklist-bg text-neuro-checklist-text placeholder-neuro-checklist-textLight focus:outline-none"
              aria-label="New checklist item"
            />
            <button
              onClick={addItem}
              className="px-6 py-3 rounded-2xl shadow-neuro-checklist-sm hover:shadow-neuro-hover active:shadow-neuro-active text-neuro-checklist-text font-semibold flex items-center gap-2 transition-all"
              aria-label="Add item"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              Add
            </button>
          </div>
        </div>

        {checklist.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neuro-checklist-textLight mb-2">No checklist items yet</p>
            <p className="text-sm text-neuro-checklist-textLight">
              Add items manually or ask the AI Guide to create a checklist for you
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(category => {
              const categoryItems = checklist.filter(item => item.category === category.value);
              if (categoryItems.length === 0) return null;

              return (
                <div key={category.value} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${categoryColors[category.value]}`} />
                    <h3 className="text-sm font-bold text-neuro-checklist-textLight uppercase tracking-wide">
                      {category.label} ({categoryItems.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {categoryItems.map(item => (
                      <div
                        key={item.id}
                        className="bg-neuro-checklist-bg rounded-2xl shadow-neuro-checklist-sm p-4 flex items-center gap-4 group"
                      >
                        <button
                          onClick={() => handleToggle(item.id)}
                          className={`rounded-xl shadow-neuro-checklist-sm hover:shadow-neuro-hover active:shadow-neuro-active w-8 h-8 flex items-center justify-center flex-shrink-0 transition-all ${
                            item.completed ? `bg-gradient-to-br ${categoryColors[item.category]}` : ''
                          }`}
                          aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                          aria-pressed={item.completed}
                        >
                          {item.completed && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                        </button>
                        
                        {editingId === item.id ? (
                          <>
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && saveEdit(item.id)}
                              className="flex-1 px-3 py-2 rounded-xl shadow-neuro-inset bg-neuro-checklist-bg text-neuro-checklist-text focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="rounded-xl shadow-neuro-checklist-sm hover:shadow-neuro-hover active:shadow-neuro-active p-2 transition-all"
                              aria-label="Save edit"
                            >
                              <Check className="w-4 h-4 text-neuro-success" strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-xl shadow-neuro-checklist-sm hover:shadow-neuro-hover active:shadow-neuro-active p-2 transition-all"
                              aria-label="Cancel edit"
                            >
                              <X className="w-4 h-4 text-neuro-emergency" strokeWidth={2.5} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={`flex-1 text-neuro-checklist-text ${
                              item.completed ? 'line-through opacity-60' : ''
                            }`}>
                              {item.text}
                            </span>
                            
                            <button
                              onClick={() => startEdit(item.id, item.text)}
                              className="rounded-xl shadow-neuro-checklist-sm hover:shadow-neuro-hover active:shadow-neuro-active p-2 opacity-0 group-hover:opacity-100 transition-all"
                              aria-label="Edit item"
                            >
                              <Edit2 className="w-4 h-4 text-neuro-checklist-textLight" strokeWidth={2.5} />
                            </button>
                            
                            <button
                              onClick={() => removeChecklistItem(item.id)}
                              className="rounded-xl shadow-neuro-checklist-sm hover:shadow-neuro-hover active:shadow-neuro-active p-2 opacity-0 group-hover:opacity-100 transition-all"
                              aria-label="Delete item"
                            >
                              <Trash2 className="w-4 h-4 text-neuro-emergency" strokeWidth={2.5} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 rounded-2xl shadow-neuro-inset p-4">
          <div className="flex justify-between text-sm">
            <span className="text-neuro-checklist-textLight">Progress</span>
            <span className="text-neuro-checklist-text font-semibold">
              {checklist.filter(i => i.completed).length} / {checklist.length}
            </span>
          </div>
          <div className="mt-3 rounded-full h-3 overflow-hidden shadow-neuro-inset">
            <div 
              className="h-full bg-gradient-to-r from-neuro-accent to-neuro-accentLight rounded-full transition-all duration-500"
              style={{ width: checklist.length > 0 ? `${(checklist.filter(i => i.completed).length / checklist.length) * 100}%` : '0%' }}
              role="progressbar"
              aria-valuenow={checklist.length > 0 ? (checklist.filter(i => i.completed).length / checklist.length) * 100 : 0}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
