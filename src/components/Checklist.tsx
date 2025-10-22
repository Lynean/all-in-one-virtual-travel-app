import React, { useState } from 'react';
import { Plus, Trash2, Check, CheckSquare, ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Checklist: React.FC = () => {
  const aiChecklist = useStore((state) => state.aiChecklist);
  const toggleAiChecklistItem = useStore((state) => state.toggleAiChecklistItem);
  const clearAiChecklist = useStore((state) => state.clearAiChecklist);
  const addManualChecklistItem = useStore((state) => state.addManualChecklistItem);
  const addManualCategory = useStore((state) => state.addManualCategory);
  
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);

  const toggleCategory = (index: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (!aiChecklist) return;
    setExpandedCategories(new Set(aiChecklist.categories.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    if (isCreatingNewCategory) {
      if (!newCategoryName.trim()) return;
      addManualCategory(newCategoryName.trim(), newItemText.trim());
      setNewCategoryName('');
    } else {
      if (!selectedCategory) return;
      addManualChecklistItem(selectedCategory, newItemText.trim());
    }

    // Reset form
    setNewItemText('');
    setSelectedCategory('');
    setIsCreatingNewCategory(false);
    setShowAddItemModal(false);
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      setIsCreatingNewCategory(true);
      setSelectedCategory('');
    } else {
      setIsCreatingNewCategory(false);
      setSelectedCategory(value);
    }
  };

  const existingCategories = aiChecklist?.categories.map(cat => cat.category) || [];

  if (!aiChecklist) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Checklist Yet</h3>
          <p className="text-gray-600 mb-4">
            Ask the AI assistant to create a personalized travel checklist for your trip!
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Try: "Create a checklist for my 3-day trip to Singapore"
          </p>
          <button
            onClick={() => setShowAddItemModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Create Manual Checklist
          </button>
        </div>
      </div>
    );
  }

  // Calculate overall progress
  const totalItems = aiChecklist.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedItems = aiChecklist.categories.reduce(
    (sum, cat) => sum + cat.items.filter(item => item.checked).length,
    0
  );
  const overallProgress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                <CheckSquare className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{aiChecklist.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {checkedItems} of {totalItems} items completed
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddItemModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium transition-all hover:scale-105 shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
              <button
                onClick={clearAiChecklist}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all hover:scale-105 shadow-md"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Overall Progress</span>
              <span className="font-bold text-purple-600">{overallProgress}%</span>
            </div>
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Expand/Collapse Controls */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={expandAll}
              className="flex-1 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium transition-all text-sm"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex-1 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all text-sm"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {aiChecklist.categories.map((category, categoryIndex) => {
            const isExpanded = expandedCategories.has(categoryIndex);
            const categoryChecked = category.items.filter(item => item.checked).length;
            const categoryTotal = category.items.length;
            const categoryProgress = categoryTotal > 0 
              ? Math.round((categoryChecked / categoryTotal) * 100) 
              : 0;

            return (
              <div key={categoryIndex} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(categoryIndex)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-md">
                      <CheckSquare className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{category.category}</h3>
                      <p className="text-sm text-gray-500">
                        {categoryChecked} of {categoryTotal} completed
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">{categoryProgress}%</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" strokeWidth={2.5} />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" strokeWidth={2.5} />
                      )}
                    </div>
                  </div>
                </button>

                {/* Progress Bar */}
                <div className="px-6 pb-4">
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full transition-all duration-500"
                      style={{ width: `${categoryProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Category Items */}
                {isExpanded && (
                  <div className="px-6 pb-6 space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className={`bg-gray-50 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:scale-102 ${
                          item.checked ? 'opacity-60' : ''
                        }`}
                      >
                        <button
                          onClick={() => toggleAiChecklistItem(categoryIndex, itemIndex)}
                          className={`p-2 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 flex-shrink-0 ${
                            item.checked 
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                              : 'bg-white hover:bg-gray-100 border-2 border-gray-300'
                          }`}
                          aria-label={item.checked ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {item.checked && (
                            <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                          )}
                          {!item.checked && (
                            <div className="w-5 h-5" />
                          )}
                        </button>
                        
                        <span
                          className={`flex-1 text-gray-900 font-medium ${
                            item.checked ? 'line-through text-gray-500' : ''
                          }`}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Add Checklist Item</h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setNewItemText('');
                  setSelectedCategory('');
                  setNewCategoryName('');
                  setIsCreatingNewCategory(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Item Text Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Item Description
              </label>
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="e.g., Pack sunscreen"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={isCreatingNewCategory ? '__new__' : selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors bg-white"
              >
                <option value="">Select a category...</option>
                {existingCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__new__">+ Create New Category</option>
              </select>
            </div>

            {/* New Category Input */}
            {isCreatingNewCategory && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  New Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Beach Essentials"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setNewItemText('');
                  setSelectedCategory('');
                  setNewCategoryName('');
                  setIsCreatingNewCategory(false);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItemText.trim() || (!selectedCategory && !newCategoryName.trim())}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
