import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, Check, X, Sparkles } from 'lucide-react';

export const Checklist: React.FC = () => {
  const { checklist, addChecklistItem, toggleChecklistItem, removeChecklistItem, updateChecklistItem } = useStore();
  const [newItem, setNewItem] = useState('');
  const [category, setCategory] = useState<'before' | 'arrival' | 'during' | 'departure'>('before');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      addChecklistItem({ text: newItem, completed: false, category });
      setNewItem('');
    }
  };

  const handleEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleSaveEdit = (id: string) => {
    if (editText.trim()) {
      updateChecklistItem(id, editText);
    }
    setEditingId(null);
    setEditText('');
  };

  const categories = [
    { id: 'before', label: 'Before Travel', color: '#FF005C' },
    { id: 'arrival', label: 'On Arrival', color: '#00F0FF' },
    { id: 'during', label: 'During Stay', color: '#FFD700' },
    { id: 'departure', label: 'Before Departure', color: '#00FF00' },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="bg-white neo-border neo-shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold uppercase">Travel Checklist</h2>
          <div className="bg-[#00F0FF] neo-border px-3 py-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4" strokeWidth={3} />
            <span className="text-xs font-bold uppercase">AI Powered</span>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add new item..."
              className="flex-1 px-4 py-3 neo-border bg-white text-black font-mono focus:outline-none focus:ring-0"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="px-4 py-3 neo-border bg-white text-black font-mono focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              className="bg-[#00F0FF] neo-border px-6 py-3 font-bold uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none neo-shadow transition-all"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </div>

        {checklist.length === 0 ? (
          <div className="bg-[#FFD700] neo-border p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4" strokeWidth={3} />
            <h3 className="font-bold uppercase text-lg mb-2">Your Checklist is Empty</h3>
            <p className="font-mono text-sm mb-4">
              Add items manually above or ask the AI Guide to create a personalized checklist for your trip!
            </p>
            <p className="font-mono text-xs">
              💡 Try asking: "Create a checklist for my trip to Japan"
            </p>
          </div>
        ) : (
          categories.map((cat) => {
            const items = checklist.filter((item) => item.category === cat.id);
            if (items.length === 0) return null;

            return (
              <div key={cat.id} className="mb-6">
                <div
                  className="neo-border px-4 py-2 mb-3 font-bold uppercase"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.label} ({items.filter((i) => i.completed).length}/{items.length})
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`neo-border p-4 flex items-center gap-3 ${
                        item.completed ? 'bg-gray-100' : 'bg-white'
                      }`}
                    >
                      <button
                        onClick={() => toggleChecklistItem(item.id)}
                        className={`w-6 h-6 neo-border flex-shrink-0 flex items-center justify-center ${
                          item.completed ? 'bg-[#00F0FF]' : 'bg-white'
                        }`}
                      >
                        {item.completed && <Check className="w-4 h-4" strokeWidth={4} />}
                      </button>
                      
                      {editingId === item.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 px-2 py-1 neo-border bg-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="bg-[#00FF00] neo-border px-2"
                          >
                            <Check className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-[#FF005C] neo-border px-2"
                          >
                            <X className="w-4 h-4" strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`flex-1 font-mono ${
                              item.completed ? 'line-through text-gray-500' : ''
                            }`}
                          >
                            {item.text}
                          </span>
                          <button
                            onClick={() => handleEdit(item.id, item.text)}
                            className="bg-[#FFD700] neo-border p-2 hover:translate-x-1 hover:translate-y-1 transition-transform"
                          >
                            <Edit2 className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => removeChecklistItem(item.id)}
                            className="bg-[#FF005C] neo-border p-2 hover:translate-x-1 hover:translate-y-1 transition-transform"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={3} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
